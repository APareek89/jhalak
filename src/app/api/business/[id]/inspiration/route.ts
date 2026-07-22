import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { q } from "@/lib/db";

const MODEL = "claude-sonnet-4-6";

export interface ReelIdea {
  title: string;
  hook: string;
  description: string;
  source: string;
}

/** Web-search-grounded reel ideas for this business. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const biz = await q<{ name: string; category: string; city: string }>(
      `select name, category, city from jhalak.businesses where id=$1`, [id]
    );
    if (!biz.length) return NextResponse.json({ error: "not found" }, { status: 404 });
    const b = biz[0];

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Round 1: research current trends with web search
    const research = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 } as unknown as Anthropic.Tool],
      messages: [
        {
          role: "user",
          content: `Search the web for CURRENT trending Instagram reel formats and content ideas for a ${b.category} small business in India (${b.city || "any city"}). Look for what's working right now — trending hooks, formats (before/after, POV, transformation, behind-the-scenes), audio trends, and India-specific angles. Summarize the most promising findings with where you saw them.`,
        },
      ],
    });
    const summary = research.content
      .filter((c) => c.type === "text")
      .map((c) => (c as Anthropic.TextBlock).text)
      .join("\n");

    // Round 2: structure into selectable ideas (tool-forced JSON)
    const structured = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: [
        {
          name: "save_ideas",
          description: "Save the reel ideas",
          input_schema: {
            type: "object" as const,
            properties: {
              ideas: {
                type: "array",
                description: "5-6 concrete reel ideas",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short idea name, 3-6 words" },
                    hook: { type: "string", description: "The first-1.5-second hook line" },
                    description: { type: "string", description: "2-3 sentences: what the reel shows, style, mood — usable directly as a video-generation brief" },
                    source: { type: "string", description: "Where this trend was seen (site/format name), or 'evergreen'" },
                  },
                  required: ["title", "hook", "description", "source"],
                },
              },
            },
            required: ["ideas"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "save_ideas" },
      messages: [
        {
          role: "user",
          content: `Based on this trend research, produce 5-6 concrete Instagram reel ideas for ${b.name}, a ${b.category} in ${b.city || "India"}. Each must work as a SHORT AI-generated product/space reel (no talking heads, no text-heavy edits). Research:\n\n${summary.slice(0, 5000)}`,
        },
      ],
    });
    const tool = structured.content.find((c) => c.type === "tool_use");
    if (!tool || tool.type !== "tool_use") throw new Error("no ideas generated");
    const { ideas } = tool.input as { ideas: ReelIdea[] };
    return NextResponse.json({ ideas });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
