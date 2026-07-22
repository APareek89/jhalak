import { q } from "./db";

export type Biz = {
  id: string; slug: string; name: string; category: string; city: string;
  phone: string; whatsapp: string; language: string; template: string; status: string;
};
export type SiteTabs = { products: boolean; about: boolean; gallery: boolean; contact: boolean };
export type Content = {
  headline?: string; tagline?: string; about?: string;
  services?: { title: string; desc: string }[]; cta_label?: string;
  tabs?: Partial<SiteTabs>; accent?: string;
  reference_text?: string; reference_source?: string;
};
export type Product = {
  id: string; title: string; description: string; price_text: string; category: string;
  discount_pct: number; processed_url: string; original_url: string; status: string; visible: boolean;
};

export const DEFAULT_TABS: SiteTabs = { products: true, about: true, gallery: false, contact: true };

export function siteTabs(content: Content): SiteTabs {
  return { ...DEFAULT_TABS, ...(content.tabs || {}) };
}

// Accent palette — literal Tailwind classes so the compiler sees them.
export const ACCENTS: Record<string, { text: string; bg: string; chip: string }> = {
  amber:   { text: "text-amber-800",   bg: "bg-amber-800 hover:bg-amber-900",     chip: "bg-amber-100 text-amber-900" },
  violet:  { text: "text-violet-600",  bg: "bg-violet-600 hover:bg-violet-700",   chip: "bg-violet-100 text-violet-900" },
  emerald: { text: "text-emerald-700", bg: "bg-emerald-700 hover:bg-emerald-800", chip: "bg-emerald-100 text-emerald-900" },
  rose:    { text: "text-rose-700",    bg: "bg-rose-700 hover:bg-rose-800",       chip: "bg-rose-100 text-rose-900" },
  sky:     { text: "text-sky-700",     bg: "bg-sky-700 hover:bg-sky-800",         chip: "bg-sky-100 text-sky-900" },
  stone:   { text: "text-stone-700",   bg: "bg-stone-800 hover:bg-stone-900",     chip: "bg-stone-200 text-stone-800" },
};

export function theme(template: string, accent?: string) {
  const isBold = template === "bold";
  const a = ACCENTS[accent || (isBold ? "violet" : "amber")] || ACCENTS[isBold ? "violet" : "amber"];
  return {
    page: isBold ? "bg-white text-stone-900" : "bg-[#faf7f2] text-stone-900",
    header: isBold
      ? "bg-stone-950/95 border-b border-stone-800 text-white"
      : "bg-[#faf7f2]/90 border-b border-stone-200",
    hero: isBold ? "bg-stone-950 text-white" : "bg-[#f4efe7]",
    accentText: a.text,
    accentBg: a.bg,
    chip: a.chip,
    card: isBold ? "bg-white border border-stone-200 shadow-sm" : "bg-white border border-stone-200",
    display: isBold ? "font-sans font-extrabold tracking-tight" : "font-display",
    sectionAlt: isBold ? "bg-stone-50" : "bg-white",
    footer: isBold ? "bg-stone-950 text-stone-400" : "bg-[#f4efe7] text-stone-500",
  };
}

export function waLink(biz: Biz): string {
  const wa = (biz.whatsapp || biz.phone || "").replace(/\D/g, "");
  if (!wa) return "";
  return `https://wa.me/${wa.length === 10 ? "91" + wa : wa}`;
}

/** "₹1,499" + 20% off → { original: "₹1,499", final: "₹1,199" }. Null final if unparseable. */
export function discounted(priceText: string, discountPct: number): { original: string; final: string | null } {
  if (!discountPct || discountPct <= 0) return { original: priceText, final: null };
  const digits = priceText.replace(/[^0-9.]/g, "");
  const n = parseFloat(digits);
  if (!isFinite(n) || n <= 0) return { original: priceText, final: null };
  const final = Math.round(n * (1 - discountPct / 100));
  const currency = priceText.trim().startsWith("₹") || !/[A-Za-z$€£]/.test(priceText) ? "₹" : priceText.trim()[0];
  return { original: priceText, final: `${currency}${final.toLocaleString("en-IN")}` };
}

export async function loadTenant(slug: string) {
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
