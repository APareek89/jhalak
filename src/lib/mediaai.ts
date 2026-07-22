/**
 * AI media provider abstraction.
 * Provider auto-detect: FAL_KEY → fal · PIXELBIN_API_TOKEN → pixelbin · neither → off.
 * "off" degrades gracefully: photos keep their original look (Claude still writes copy),
 * and the reel studio reports that no video provider is connected.
 */
import { persistRemote } from "./media";

export type Provider = "fal" | "pixelbin" | "off";

export function provider(): Provider {
  if (process.env.FAL_KEY) return "fal";
  if (process.env.PIXELBIN_API_TOKEN) return "pixelbin";
  return "off";
}

const LOOKPRO_PROMPTS: Record<string, string> = {
  retail:
    "Professional e-commerce catalogue photograph of this exact product. Keep the product identical. Clean, softly lit studio background (white or very light neutral), gentle natural shadow, crisp focus, premium product photography, high resolution.",
  services:
    "Enhance this exact photo into a professional business photograph: same scene, people and contents, brighter inviting lighting, improved clarity and vibrance, no noise, professional photographer quality, high resolution.",
};

export function lookProPrompt(category: string): string {
  return ["boutique", "retail", "store", "shop"].includes(category)
    ? LOOKPRO_PROMPTS.retail
    : LOOKPRO_PROMPTS.services;
}

// ---------- fal.ai ----------

const FAL_IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || "fal-ai/nano-banana/edit";
const FAL_VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || "fal-ai/ltx-video-13b-distilled/image-to-video";

async function falRun(model: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  const job = (await submit.json()) as { status_url: string; response_url: string };
  const deadline = Date.now() + 6 * 60 * 1000;
  for (;;) {
    if (Date.now() > deadline) throw new Error("fal timeout");
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(job.status_url, {
      headers: { Authorization: `Key ${process.env.FAL_KEY}` },
    });
    const sd = (await st.json()) as { status: string };
    if (sd.status === "COMPLETED") break;
    if (sd.status === "FAILED" || sd.status === "ERROR") throw new Error("fal job failed");
  }
  const res = await fetch(job.response_url, {
    headers: { Authorization: `Key ${process.env.FAL_KEY}` },
  });
  if (!res.ok) throw new Error(`fal result ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function firstUrl(out: Record<string, unknown>): string {
  // fal responses: {images:[{url}]} or {image:{url}} or {video:{url}}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = out as any;
  const u = o.images?.[0]?.url || o.image?.url || o.video?.url || o.output?.[0];
  if (!u) throw new Error("no output url in provider response");
  return u as string;
}

// ---------- PixelBin ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _px: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function px(): any {
  if (!_px) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");
    _px = new PixelbinClient(
      new PixelbinConfig({ domain: "https://api.pixelbin.io", apiSecret: process.env.PIXELBIN_API_TOKEN })
    );
  }
  return _px;
}

function pxSanitize(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "boolean" ? String(v) : v;
  }
  return out;
}

async function pxPredict(name: string, input: Record<string, unknown>): Promise<string> {
  const r = await px().predictions.createAndWait({ name, input: pxSanitize(input) });
  if (r.status !== "SUCCESS" || !r.output?.[0]) throw new Error(r.error || "no output");
  return r.output[0] as string;
}

// ---------- Public API ----------

/**
 * Polish a photo. `imageDataUri` (base64 data URI) is used for fal (host-independent);
 * `imagePublicUrl` for PixelBin. Returns a persisted /api/media URL, or null when
 * unavailable/failed — caller falls back to the original.
 */
export async function polishImage(
  imageDataUri: string,
  imagePublicUrl: string,
  category: string
): Promise<string | null> {
  const p = provider();
  try {
    if (p === "fal") {
      const out = await falRun(FAL_IMAGE_MODEL, {
        prompt: lookProPrompt(category),
        image_urls: [imageDataUri],
      });
      return await persistRemote(firstUrl(out), "image/jpeg");
    }
    if (p === "pixelbin") {
      const out = await pxPredict(process.env.PIXELBIN_IMAGE_MODEL || "nanoBanana2_generate", {
        prompt: lookProPrompt(category),
        images: [imagePublicUrl],
        aspect_ratio: "1:1",
        output_resolution: "1K",
      });
      return await persistRemote(out, "image/jpeg");
    }
    return null;
  } catch (e) {
    const cause = (e as { cause?: { message?: string; code?: string } })?.cause;
    console.error(
      "[mediaai] polish failed:",
      e instanceof Error ? e.message : e,
      cause ? `| cause: ${cause.message || cause.code}` : ""
    );
    return null;
  }
}

/** Generate a 9:16 reel from an image. Throws on failure (caller records status). */
export async function generateReel(
  imageDataUri: string,
  imagePublicUrl: string,
  prompt: string
): Promise<string> {
  const p = provider();
  if (p === "fal") {
    const out = await falRun(FAL_VIDEO_MODEL, {
      prompt,
      image_url: imageDataUri,
      aspect_ratio: "9:16",
    });
    return persistRemote(firstUrl(out), "video/mp4");
  }
  if (p === "pixelbin") {
    const out = await pxPredict(process.env.PIXELBIN_VIDEO_MODEL || "veo31Fast_generate", {
      prompt,
      images: [imagePublicUrl],
      aspect_ratio: "9:16",
      duration: 6,
    });
    return persistRemote(out, "video/mp4");
  }
  throw new Error("no video provider connected");
}

/** Generate a 9:16 image post from a product image + prompt. Returns /api/media URL. */
export async function generateImagePost(
  imageDataUri: string,
  imagePublicUrl: string,
  prompt: string
): Promise<string> {
  const p = provider();
  if (p === "fal") {
    const out = await falRun(FAL_IMAGE_MODEL, {
      prompt: prompt + " Vertical 9:16 composition.",
      image_urls: [imageDataUri],
      aspect_ratio: "9:16",
    });
    return persistRemote(firstUrl(out), "image/jpeg");
  }
  if (p === "pixelbin") {
    const out = await pxPredict(process.env.PIXELBIN_IMAGE_MODEL || "nanoBanana2_generate", {
      prompt, images: [imagePublicUrl], aspect_ratio: "9:16", output_resolution: "1K",
    });
    return persistRemote(out, "image/jpeg");
  }
  throw new Error("no image provider connected");
}
