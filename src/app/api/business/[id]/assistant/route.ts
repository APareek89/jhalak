import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { q } from "@/lib/db";
import { canManageBusiness } from "@/lib/auth";
import { ACCENTS } from "@/lib/tenant";

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
    const { messages } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
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
- Publish ONLY when explicitly asked.
- After making changes, reply in 1-3 short sentences describing what changed. No markdown headers, no lists unless asked.
- If a request is impossible with your tools (e.g. new page types, fonts, videos), say so honestly and suggest the closest thing you CAN do.`;

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
