import Anthropic from "@anthropic-ai/sdk";

/** Strip tags/entities from raw HTML down to readable text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** JS-rendered sites (Wix, Hostinger Horizons, etc.) ship empty HTML shells —
 *  reconstruct their content from the search index via Claude's web_search tool. */
export async function researchSiteViaWeb(url: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const host = new URL(url).hostname.replace(/^www\./, "");
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1800,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 } as unknown as Anthropic.Tool],
    messages: [{
      role: "user",
      content: `Research the business behind the website ${url} (search "site:${host}" and the business name). Write a factual reference document covering: business name, what they offer (products/services with specifics), who they serve, unique strengths, locations/contact details, and their tone of voice. Plain text only, facts only — this will seed a new website for the same business.`,
    }],
  });
  return res.content.filter((c) => c.type === "text").map((c) => (c as Anthropic.TextBlock).text).join("\n");
}

/**
 * Read a URL down to a plain-text reference. Tries a direct fetch first; if the
 * page is a JS-rendered shell (or the fetch is blocked), reconstructs the content
 * from the web index. Returns the text and which path produced it.
 */
export async function readReferenceFromUrl(
  url: string
): Promise<{ text: string; source: "url" | "web-research" }> {
  let text = "";
  let via: "url" | "web-research" = "url";
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JhalakBot/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (r.ok) text = stripHtml(await r.text());
  } catch {
    // network/timeout/blocked — fall through to web research
  }
  if (text.replace(/\s+/g, " ").trim().length < 200) {
    text = await researchSiteViaWeb(url);
    via = "web-research";
  }
  return { text, source: via };
}
