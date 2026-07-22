import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const leads = await q(
      `select * from jhalak.leads where business_id=$1 order by created_at desc limit 200`, [id]
    );
    return NextResponse.json({ leads });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
