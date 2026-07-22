import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TenantHeader from "../TenantHeader";
import { loadTenant, theme, waLink, siteTabs } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadTenant(slug);
  if (!data) return {};
  return { title: `Gallery · ${data.biz.name}` };
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadTenant(slug);
  if (!data) notFound();
  const { biz, content, products } = data;
  const t = theme(biz.template, content.accent);
  const tabs = siteTabs(content);
  const wa = waLink(biz);

  return (
    <div className={`min-h-screen ${t.page}`}>
      <TenantHeader
        slug={slug} name={biz.name} displayClass={t.display} headerClass={t.header}
        accentBg={t.accentBg} wa={wa}
        tabs={{ products: tabs.products && products.length > 0, gallery: true, contact: tabs.contact }}
      />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className={`${t.display} text-3xl mb-8`}>Gallery</h1>
        <div className="columns-2 sm:columns-3 gap-4 [&>img]:mb-4">
          {products.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.processed_url || p.original_url} alt={p.title}
              className="w-full rounded-2xl break-inside-avoid" />
          ))}
        </div>
        {!products.length && <p className="text-center opacity-50 py-16">No photos yet.</p>}
      </main>
      <footer className={`${t.footer} text-center text-xs py-6`}>
        {biz.name} · Made with Jhalak
      </footer>
    </div>
  );
}
