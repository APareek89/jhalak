import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { saveMedia, mediaUrl } from "@/lib/media";
import { processProductPhoto } from "@/lib/jobs";

const MAX_PHOTOS = 12;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const biz = await q<{
      id: string; slug: string; name: string; category: string; city: string; language: string;
    }>(`select id, slug, name, category, city, language from jhalak.businesses where id=$1`, [id]);
    if (!biz.length) return NextResponse.json({ error: "not found" }, { status: 404 });

    const quota = await q<{ photos_used: number }>(
      `select photos_used from jhalak.quotas where business_id=$1`, [id]
    );
    const used = quota[0]?.photos_used || 0;

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: "no files" }, { status: 400 });
    if (used + files.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Photo limit reached (${MAX_PHOTOS} per business in this preview).` },
        { status: 429 }
      );
    }

    const created: string[] = [];
    for (const file of files) {
      const rows = await q<{ id: string }>(
        `insert into jhalak.products (business_id, status) values ($1,'processing') returning id`,
        [id]
      );
      const productId = rows[0].id;
      const buf = Buffer.from(await file.arrayBuffer());
      const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
      const mediaId = await saveMedia(buf, mime);
      await q(`update jhalak.products set original_url=$1 where id=$2`, [mediaUrl(mediaId), productId]);
      processProductPhoto(productId, mediaId, biz[0]);
      created.push(productId);
    }
    await q(
      `update jhalak.quotas set photos_used = photos_used + $1 where business_id=$2`,
      [files.length, id]
    );
    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const products = await q(
    `select * from jhalak.products where business_id=$1 order by sort, created_at`, [id]
  );
  return NextResponse.json({ products });
}
