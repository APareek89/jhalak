import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { q } from "@/lib/db";
import { canManageBusiness } from "@/lib/auth";
import { ACCENTS } from "@/lib/tenant";
import { generateImage } from "@/lib/mediaai";
import { heroImagePrompt, productImagePrompt } from "@/lib/imagery";
import { reserveGeneration, releaseGeneration } from "@/lib/quota";
import { normalizeSectionsForStore } from "@/lib/import";

const MODEL = "claude-sonnet-4-6";
const MAX_ROUNDS = 6;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = any;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_site_copy",
    description: "Update website text. Only pass the fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        headline: { type: "string" },
        tagline: { type: "string" },
        about: { type: "string" },
        cta_label: { type: "string" },
        services: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, desc: { type: "string" } },
            required: ["title", "desc"],
          },
        },
      },
    },
  },
  {
    name: "set_template",
    description: "Switch the visual template.",
    input_schema: {
      type: "object",
      properties: { template: { type: "string", enum: ["elegant", "bold", "professional", "minimal"] } },
      required: ["template"],
    },
  },
  {
    name: "set_accent",
    description: "Change the site's accent color.",
    input_schema: {
      type: "object",
      properties: { accent: { type: "string", enum: Object.keys(ACCENTS) } },
      required: ["accent"],
    },
  },
  {
    name: "set_tabs",
    description: "Turn website sections/tabs on or off. Only pass the ones to change.",
    input_schema: {
      type: "object",
      properties: {
        products: { type: "boolean" }, about: { type: "boolean" },
        gallery: { type: "boolean" }, contact: { type: "boolean" },
      },
    },
  },
  {
    name: "update_business",
    description: "Update business info shown on the site. Only pass fields to change.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" }, city: { type: "string" },
        phone: { type: "string" }, whatsapp: { type: "string" },
      },
    },
  },
  {
    name: "update_product",
    description: "Update one catalogue product. Only pass fields to change.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        title: { type: "string" }, description: { type: "string" },
        category: { type: "string" }, price_text: { type: "string" },
        discount_pct: { type: "integer", minimum: 0, maximum: 90 },
        visible: { type: "boolean" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "update_section",
    description: "Update one rich content block (stats/industries/testimonials/certifications/cta_banner) by its id. Only pass fields to change; pass 'items' to replace that block's entries.",
    input_schema: {
      type: "object",
      properties: {
        section_id: { type: "string", description: "Block id: stats | industries | testimonials | certifications | cta_banner" },
        title: { type: "string", description: "Section heading (industries/testimonials/certifications)" },
        heading: { type: "string", description: "cta_banner big heading" },
        subtext: { type: "string", description: "cta_banner subtext" },
        button_label: { type: "string", description: "cta_banner button label" },
        items: {
          type: "array",
          description: "Replace items. stats:{value,label}; industries/certifications:{name}; testimonials:{quote,author,role}",
          items: {
            type: "object",
            properties: {
              value: { type: "string" }, label: { type: "string" }, name: { type: "string" },
              quote: { type: "string" }, author: { type: "string" }, role: { type: "string" },
            },
          },
        },
      },
      required: ["section_id"],
    },
  },
  {
    name: "toggle_section",
    description: "Show or hide a rich content block by id (e.g. hide testimonials).",
    input_schema: {
      type: "object",
      properties: { section_id: { type: "string" }, enabled: { type: "boolean" } },
      required: ["section_id", "enabled"],
    },
  },
  {
    name: "regenerate_image",
    description: "Regenerate an AI image. target='hero' for the hero image, or a product's exact title for its catalogue photo. Put the owner's art direction in 'instruction' (e.g. 'more industrial, blue tones').",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "'hero' or a product title" },
        instruction: { type: "string", description: "art direction to apply" },
      },
      required: ["target"],
    },
  },
  {
    name: "publish_site",
    description: "Publish the website (make it live). Use ONLY when the user explicitly asks to publish / go live.",
    input_schema: { type: "object", properties: {} },
  },
];

async function getState(bizId: string) {
  const [biz, content, products] = await Promise.all([
    q(`select id, slug, name, category, city, phone, whatsapp, language, template, status from jhalak.businesses where id=$1`, [bizId]),
    q<{ content: Record<string, unknown> }>(`select content from jhalak.site_content where business_id=$1`, [bizId]),
    q(`select id, title, category, price_text, discount_pct, visible, status from jhalak.products where business_id=$1 order by created_at`, [bizId]),
  ]);
  const c = { ...(content[0]?.content || {}) };
  delete c.reference_text; // keep the prompt lean
  return { business: biz[0], site_content: c, products };
}

async function runTool(bizId: string, name: string, input: ToolInput): Promise<string> {
  if (name === "update_site_copy") {
    const fields: Record<string, unknown> = {};
    for (const k of ["headline", "tagline", "about", "cta_label", "services"]) {
      if (input[k] !== undefined) fields[k] = input[k];
    }
    if (!Object.keys(fields).length) return "nothing to change";
    await q(
      `insert into jhalak.site_content (business_id, content) values ($1,$2)
       on conflict (business_id) do update set content = jhalak.site_content.content || $2::jsonb, updated_at=now()`,
      [bizId, JSON.stringify(fields)]
    );
    return `updated: ${Object.keys(fields).join(", ")}`;
  }
  if (name === "set_template") {
    await q(`update jhalak.businesses set template=$1 where id=$2`, [input.template, bizId]);
    return `template → ${input.template}`;
  }
  if (name === "set_accent") {
    await q(
      `insert into jhalak.site_content (business_id, content) values ($1, jsonb_build_object('accent', $2::text))
       on conflict (business_id) do update set content = jhalak.site_content.content || jsonb_build_object('accent', $2::text), updated_at=now()`,
      [bizId, input.accent]
    );
    return `accent → ${input.accent}`;
  }
  if (name === "set_tabs") {
    const tabs: Record<string, boolean> = {};
    for (const k of ["products", "about", "gallery", "contact"]) {
      if (typeof input[k] === "boolean") tabs[k] = input[k];
    }
    await q(
      `insert into jhalak.site_content (business_id, content) values ($1, jsonb_build_object('tabs', $2::jsonb))
       on conflict (business_id) do update
       set content = jsonb_set(jhalak.site_content.content, '{tabs}',
         coalesce(jhalak.site_content.content->'tabs','{}'::jsonb) || $2::jsonb), updated_at=now()`,
      [bizId, JSON.stringify(tabs)]
    );
    return `tabs updated: ${JSON.stringify(tabs)}`;
  }
  if (name === "update_business") {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of ["name", "city", "phone", "whatsapp"]) {
      if (input[k] !== undefined) { vals.push(input[k]); sets.push(`${k}=$${vals.length}`); }
    }
    if (!sets.length) return "nothing to change";
    vals.push(bizId);
    await q(`update jhalak.businesses set ${sets.join(", ")} where id=$${vals.length}`, vals);
    return `business updated: ${sets.length} field(s)`;
  }
  if (name === "update_product") {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of ["title", "description", "category", "price_text", "discount_pct", "visible"]) {
      if (input[k] !== undefined) { vals.push(input[k]); sets.push(`${k}=$${vals.length}`); }
    }
    if (!sets.length) return "nothing to change";
    vals.push(input.product_id, bizId);
    await q(
      `update jhalak.products set ${sets.join(", ")} where id=$${vals.length - 1} and business_id=$${vals.length}`,
      vals
    );
    return `product ${String(input.product_id).slice(0, 8)} updated`;
  }
  if (name === "update_section") {
    const rows = await q<{ sections: unknown }>(`select content->'sections' as sections from jhalak.site_content where business_id=$1`, [bizId]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: any[] = Array.isArray(rows[0]?.sections) ? (rows[0].sections as any[]) : [];
    const idx = sections.findIndex((s) => s?.id === input.section_id || s?.type === input.section_id);
    if (idx < 0) return `no section '${input.section_id}' on this site`;
    const s = { ...sections[idx] };
    for (const k of ["title", "heading", "subtext", "button_label"]) if (input[k] !== undefined) s[k] = input[k];
    if (Array.isArray(input.items)) s.items = input.items;
    sections[idx] = s;
    const clean = normalizeSectionsForStore(sections);
    await q(`update jhalak.site_content set content = jsonb_set(content, '{sections}', $2::jsonb), updated_at=now() where business_id=$1`, [bizId, JSON.stringify(clean)]);
    return `updated the ${input.section_id} section`;
  }
  if (name === "toggle_section") {
    const rows = await q<{ sections: unknown }>(`select content->'sections' as sections from jhalak.site_content where business_id=$1`, [bizId]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: any[] = Array.isArray(rows[0]?.sections) ? (rows[0].sections as any[]) : [];
    const idx = sections.findIndex((s) => s?.id === input.section_id || s?.type === input.section_id);
    if (idx < 0) return `no section '${input.section_id}' on this site`;
    sections[idx] = { ...sections[idx], enabled: !!input.enabled };
    await q(`update jhalak.site_content set content = jsonb_set(content, '{sections}', $2::jsonb), updated_at=now() where business_id=$1`, [bizId, JSON.stringify(sections)]);
    return `${input.enabled ? "showing" : "hiding"} the ${input.section_id} section`;
  }
  if (name === "regenerate_image") {
    const target = String(input.target || "hero");
    const instruction = String(input.instruction || "").slice(0, 300);
    if (!(await reserveGeneration(bizId))) return "You've reached the image-generation limit for this site.";
    const bizRows = await q<{ name: string; category: string; city: string }>(
      `select name, category, city from jhalak.businesses where id=$1`, [bizId]
    );
    const b = bizRows[0];
    const dir = instruction ? ` Art direction: ${instruction}.` : "";
    if (target.toLowerCase() === "hero") {
      const cRows = await q<{ content: { headline?: string; tagline?: string; about?: string; business_type?: string } }>(
        `select content from jhalak.site_content where business_id=$1`, [bizId]
      );
      const content = cRows[0]?.content || {};
      const url = await generateImage(heroImagePrompt(b, content, content.business_type) + dir, "hero");
      if (!url) { await releaseGeneration(bizId); return "image generation failed — please try again in a moment"; }
      await q(
        `insert into jhalak.site_content (business_id, content) values ($1, jsonb_build_object('hero_image_url', $2::text))
         on conflict (business_id) do update set content = jhalak.site_content.content || jsonb_build_object('hero_image_url', $2::text), updated_at=now()`,
        [bizId, url]
      );
      return "regenerated the hero image 🎨";
    }
    const prod = await q<{ id: string; title: string; description: string; category: string }>(
      `select id, title, description, category from jhalak.products where business_id=$1 and lower(title)=lower($2) limit 1`,
      [bizId, target]
    );
    if (!prod.length) { await releaseGeneration(bizId); return `no product named '${target}' — try its exact title`; }
    const p = prod[0];
    const url = await generateImage(productImagePrompt({ title: p.title, description: p.description, category: p.category }, b) + dir, "square");
    if (!url) { await releaseGeneration(bizId); return "image generation failed — please try again in a moment"; }
    await q(`update jhalak.products set processed_url=$1, status='ready' where id=$2`, [url, p.id]);
    return `regenerated the image for ${p.title} 🎨`;
  }
  if (name === "publish_site") {
    await q(`update jhalak.businesses set status='published' where id=$1`, [bizId]);
    return "site published 🎉";
  }
  return "unknown tool";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!(await canManageBusiness(id))) {
      return NextResponse.json({ error: "Please log in as the owner of this business.", auth: true }, { status: 403 });
    }
    const { messages, scope } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
      scope?: { section?: string; sectionType?: string };
    };
    if (!messages?.length) return NextResponse.json({ error: "no messages" }, { status: 400 });

    const state = await getState(id);
    if (!state.business) return NextResponse.json({ error: "not found" }, { status: 404 });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const system = `You are Jhalak's website editor, helping an Indian small business owner improve their website by chatting. You have tools that ACTUALLY change the live site — use them whenever the user asks for a change; never claim a change without calling a tool.

CURRENT SITE STATE:
${JSON.stringify(state, null, 1).slice(0, 6000)}

Rules:
- Keep copy premium and warm; match the owner's language (English or Hinglish — mirror how they write to you).
- Small, precise edits — only change what was asked.
- Accent colors available: ${Object.keys(ACCENTS).join(", ")}. Templates: elegant, bold, professional, minimal.
- You can regenerate the hero image or any product photo with regenerate_image (pass the owner's art direction). You can edit/toggle the stats, industries, testimonials, certifications and CTA-banner blocks.
- Publish ONLY when explicitly asked.
- After making changes, reply in 1-3 short sentences describing what changed. No markdown headers, no lists unless asked.
- If a request is impossible with your tools (e.g. brand-new page types, custom fonts, videos), say so honestly and suggest the closest thing you CAN do.${
      scope?.section
        ? `\n\nThe owner has SELECTED the "${scope.section}"${scope.sectionType ? ` (${scope.sectionType})` : ""} block in the live preview. Apply their request ONLY to that block. "hero" = the headline/tagline and hero image; a rich block → update_section/toggle_section; to change an image → regenerate_image with target set to the selection.`
        : ""
    }`;

    const convo: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const applied: string[] = [];

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system,
        tools: TOOLS,
        messages: convo,
      });

      const toolUses = res.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
      const text = res.content.filter((c) => c.type === "text").map((c) => (c as Anthropic.TextBlock).text).join("\n");

      if (!toolUses.length) {
        return NextResponse.json({ reply: text || "Done.", applied });
      }

      convo.push({ role: "assistant", content: res.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let out: string;
        try {
          out = await runTool(id, tu.name, tu.input);
          applied.push(out);
        } catch (e) {
          out = `error: ${e instanceof Error ? e.message : "failed"}`;
        }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
      }
      convo.push({ role: "user", content: results });
    }

    return NextResponse.json({ reply: "Made the changes — take a look at the preview.", applied });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
