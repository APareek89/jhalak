import { q } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LeadForm from "./LeadForm";

export const dynamic = "force-dynamic";

type Biz = {
  id: string; slug: string; name: string; category: string; city: string;
  phone: string; whatsapp: string; language: string; template: string; status: string;
};
type Content = {
  headline?: string; tagline?: string; about?: string;
  services?: { title: string; desc: string }[]; cta_label?: string;
};
type Product = {
  id: string; title: string; description: string; price_text: string;
  processed_url: string; original_url: string; status: string; visible: boolean;
};

async function load(slug: string) {
  const biz = await q<Biz>(`select * from jhalak.businesses where slug=$1`, [slug]);
  if (!biz.length) return null;
  const [content, products] = await Promise.all([
    q<{ content: Content }>(`select content from jhalak.site_content where business_id=$1`, [biz[0].id]),
    q<Product>(
      `select * from jhalak.products where business_id=$1 and visible=true and status='ready' order by sort, created_at`,
      [biz[0].id]
    ),
  ]);
  return { biz: biz[0], content: content[0]?.content || {}, products };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  return {
    title: `${data.biz.name}${data.biz.city ? " · " + data.biz.city : ""}`,
    description: data.content.tagline || data.content.about || "",
  };
}

const THEMES = {
  elegant: {
    page: "bg-[#faf7f2] text-stone-900",
    header: "bg-[#faf7f2]/90 border-b border-stone-200",
    hero: "bg-[#f4efe7]",
    accentText: "text-amber-800",
    accentBg: "bg-amber-800 hover:bg-amber-900",
    card: "bg-white border border-stone-200",
    display: "font-display",
    sectionAlt: "bg-white",
    footer: "bg-[#f4efe7] text-stone-500",
  },
  bold: {
    page: "bg-white text-stone-900",
    header: "bg-stone-950/95 border-b border-stone-800 text-white",
    hero: "bg-stone-950 text-white",
    accentText: "text-violet-600",
    accentBg: "bg-violet-600 hover:bg-violet-700",
    card: "bg-white border border-stone-200 shadow-sm",
    display: "font-sans font-extrabold tracking-tight",
    sectionAlt: "bg-stone-50",
    footer: "bg-stone-950 text-stone-400",
  },
} as const;

export default async function Site(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { biz, content, products } = data;
  const t = THEMES[(biz.template as keyof typeof THEMES)] || THEMES.elegant;
  const wa = (biz.whatsapp || biz.phone || "").replace(/\D/g, "");
  const waLink = wa ? `https://wa.me/${wa.length === 10 ? "91" + wa : wa}` : "";
  const heroImg = products[0]?.processed_url || products[0]?.original_url || "";
  const isService = biz.category !== "boutique";

  return (
    <div className={`min-h-screen ${t.page}`}>
      {biz.status !== "published" && (
        <div className="bg-amber-100 text-amber-900 text-center text-xs py-1.5">
          Draft preview — not published yet
        </div>
      )}

      <header className={`sticky top-0 z-20 backdrop-blur ${t.header}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className={`${t.display} text-xl`}>{biz.name}</span>
          {waLink && (
            <a
              href={waLink}
              className={`rounded-full ${t.accentBg} text-white px-4 py-2 text-sm font-medium transition`}
            >
              WhatsApp us
            </a>
          )}
        </div>
      </header>

      <section className={`${t.hero}`}>
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 grid sm:grid-cols-2 gap-10 items-center">
          <div>
            <p className={`text-xs uppercase tracking-[0.25em] mb-4 ${t.accentText}`}>
              {biz.city ? `${biz.city} ·` : ""} {biz.category}
            </p>
            <h1 className={`${t.display} text-4xl sm:text-5xl leading-tight`}>
              {content.headline || biz.name}
            </h1>
            {content.tagline && (
              <p className="mt-4 text-lg opacity-80">{content.tagline}</p>
            )}
            <div className="mt-8 flex gap-3">
              <a
                href="#contact"
                className={`rounded-full ${t.accentBg} text-white px-7 py-3.5 font-semibold transition`}
              >
                {content.cta_label || "Get in touch"}
              </a>
              {biz.phone && (
                <a
                  href={`tel:${biz.phone}`}
                  className="rounded-full border border-current/30 px-7 py-3.5 font-semibold opacity-80 hover:opacity-100 transition"
                >
                  Call
                </a>
              )}
            </div>
          </div>
          {heroImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImg}
              alt={biz.name}
              className="rounded-3xl aspect-square object-cover w-full shadow-2xl"
            />
          )}
        </div>
      </section>

      {content.about && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className={`${t.display} text-2xl mb-4`}>About us</h2>
          <p className="max-w-2xl text-lg leading-8 opacity-80">{content.about}</p>
        </section>
      )}

      {!!content.services?.length && (
        <section className={t.sectionAlt}>
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className={`${t.display} text-2xl mb-8`}>What we do</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {content.services.map((s, i) => (
                <div key={i} className={`rounded-2xl p-6 ${t.card}`}>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm opacity-70 leading-6">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!!products.length && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className={`${t.display} text-2xl mb-8`}>
            {isService ? "Our work & space" : "Our collection"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p.id} className={`rounded-2xl overflow-hidden ${t.card}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.processed_url || p.original_url}
                  alt={p.title}
                  className="aspect-square object-cover w-full"
                />
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-medium text-sm">{p.title}</h3>
                    {p.price_text && (
                      <span className={`text-sm font-semibold ${t.accentText}`}>{p.price_text}</span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs opacity-60 mt-1 line-clamp-2">{p.description}</p>
                  )}
                  {waLink && (
                    <a
                      href={`${waLink}?text=${encodeURIComponent(`Hi! I'm interested in ${p.title}`)}`}
                      className={`mt-3 inline-block text-xs font-semibold ${t.accentText}`}
                    >
                      Enquire on WhatsApp →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="contact" className={t.sectionAlt}>
        <div className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-2 gap-10">
          <div>
            <h2 className={`${t.display} text-2xl mb-4`}>Visit or message us</h2>
            <p className="opacity-70 mb-6">
              {biz.city && <>📍 {biz.city}<br /></>}
              {biz.phone && <>📞 {biz.phone}</>}
            </p>
            {waLink && (
              <a
                href={waLink}
                className={`inline-block rounded-full ${t.accentBg} text-white px-6 py-3 font-semibold transition`}
              >
                Chat on WhatsApp
              </a>
            )}
          </div>
          <LeadForm slug={biz.slug} accentBg={t.accentBg} />
        </div>
      </section>

      <footer className={`${t.footer} text-center text-xs py-6`}>
        {biz.name} · Made with Jhalak
      </footer>

      {waLink && (
        <a
          href={waLink}
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-[#25D366] shadow-xl flex items-center justify-center text-2xl hover:scale-105 transition"
        >
          💬
        </a>
      )}
    </div>
  );
}
