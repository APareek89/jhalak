"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson, downscaleImage } from "@/lib/client";

type SiteCopy = {
  headline: string;
  tagline: string;
  about: string;
  services: { title: string; desc: string }[];
  cta_label: string;
};

type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_text: string;
  discount_pct: number;
  status: string;
  original_url: string;
  processed_url: string;
};

const CATEGORIES = [
  { id: "boutique", label: "Boutique / Store" },
  { id: "salon", label: "Salon / Spa" },
  { id: "clinic", label: "Clinic" },
  { id: "gym", label: "Gym / Fitness" },
  { id: "restaurant", label: "Restaurant / Café" },
  { id: "other", label: "Other" },
];

const STANDARD_TABS = [
  { id: "products", label: "Our Products", desc: "Catalogue with categories, prices & discounts", locked: false },
  { id: "about", label: "About Us", desc: "Your story and what you do", locked: false },
  { id: "gallery", label: "Gallery", desc: "A photo wall of your work & space", locked: false },
  { id: "contact", label: "Contact", desc: "Enquiry form + WhatsApp & call buttons", locked: false },
];

export default function StartWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // step 1 — basics
  const [name, setName] = useState("");
  const [category, setCategory] = useState("boutique");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("english");
  const [bizId, setBizId] = useState("");
  const [slug, setSlug] = useState("");
  // step 2 — style
  const [template, setTemplate] = useState("elegant");
  // step 3 — structure
  const [tabs, setTabs] = useState<Record<string, boolean>>({
    products: true, about: true, gallery: false, contact: true,
  });
  const [refUrl, setRefUrl] = useState("");
  const [refStatus, setRefStatus] = useState("");
  const docRef = useRef<HTMLInputElement>(null);
  // step 4 — story
  const [offering, setOffering] = useState("");
  const [special, setSpecial] = useState("");
  const [action, setAction] = useState("");
  const [copy, setCopy] = useState<SiteCopy | null>(null);
  // step 5 — photos
  const [products, setProducts] = useState<Product[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const createBusiness = async () => {
    if (!name.trim()) return setError("Please enter your business name");
    setBusy(true);
    setError("");
    const r = await fetchJson<{ id: string; slug: string }>("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, city, phone, whatsapp: phone, language, template }),
    });
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error);
    setBizId(r.data.id);
    setSlug(r.data.slug);
    setStep(2);
  };

  const saveTemplate = async (t: string) => {
    setTemplate(t);
    await fetchJson(`/api/business/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: t }),
    });
  };

  const saveStructure = async () => {
    setBusy(true);
    setError("");
    await fetchJson(`/api/business/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { tabs } }),
    });
    setBusy(false);
    setStep(4);
  };

  const submitRefUrl = async () => {
    if (!refUrl.trim()) return;
    setRefStatus("Reading your website…");
    const r = await fetchJson<{ chars: number }>(`/api/business/${bizId}/reference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: refUrl.trim() }),
    });
    setRefStatus(r.ok ? `✓ Got it — I'll use your website as reference (${r.data?.chars} characters read)` : `✗ ${r.error}`);
  };

  const submitRefDoc = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setRefStatus("Reading your document…");
    const fd = new FormData();
    fd.append("file", files[0]);
    const r = await fetchJson<{ chars: number }>(`/api/business/${bizId}/reference`, {
      method: "POST",
      body: fd,
    });
    setRefStatus(r.ok ? `✓ Got it — I'll use "${files[0].name}" as reference` : `✗ ${r.error}`);
    if (docRef.current) docRef.current.value = "";
  };

  const generateCopy = async () => {
    if (!offering.trim()) return setError("Tell us what you offer — one line is enough");
    setBusy(true);
    setError("");
    const r = await fetchJson<{ content: SiteCopy }>(`/api/business/${bizId}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offering, special, action }),
    });
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error);
    setCopy(r.data.content);
  };

  const saveCopy = async () => {
    if (!copy) return;
    await fetchJson(`/api/business/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: copy }),
    });
    setStep(5);
  };

  const refreshProducts = useCallback(async () => {
    if (!bizId) return;
    const r = await fetchJson<{ products: Product[] }>(`/api/business/${bizId}/photos`);
    if (r.ok && r.data?.products) setProducts(r.data.products);
  }, [bizId]);

  useEffect(() => {
    if (step !== 5) return;
    refreshProducts();
    const t = setInterval(() => {
      setProducts((prev) => {
        if (prev.some((p) => p.status === "processing")) refreshProducts();
        return prev;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [step, refreshProducts]);

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    let skipped = 0;
    for (const f of Array.from(files)) {
      const small = await downscaleImage(f);
      if (small) fd.append("files", small);
      else skipped++;
    }
    if (!fd.getAll("files").length) {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      return setError("Couldn't read those photos — please upload JPG or PNG images.");
    }
    const r = await fetchJson(`/api/business/${bizId}/photos`, { method: "POST", body: fd });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) return setError(r.error);
    if (skipped) setError(`${skipped} photo(s) couldn't be read and were skipped (use JPG/PNG).`);
    await refreshProducts();
  };

  const patchProduct = async (pid: string, body: Record<string, unknown>) => {
    await fetchJson(`/api/products/${pid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const stepTitle = [
    "",
    "Tell us about your business",
    "Pick your style",
    "Choose your pages",
    "Your story — 3 quick questions",
    "Add your products & photos",
  ][step];

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-10">
        <Link href="/" className="font-display text-xl font-semibold">Jhalak</Link>
        <span className="text-sm text-stone-400">Step {step} of 5</span>
      </header>

      <div className="h-1.5 bg-stone-200 rounded-full mb-10">
        <div className="h-1.5 bg-amber-700 rounded-full transition-all duration-500"
          style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      <h1 className="font-display text-3xl font-semibold mb-8">{stepTitle}</h1>
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="step-enter space-y-6">
          <Field label="Business name *">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meera Boutique" className="inp" />
          </Field>
          <Field label="What kind of business?">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={c.label} />
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Jaipur" className="inp" />
            </Field>
            <Field label="WhatsApp number">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" className="inp" />
            </Field>
          </div>
          <Field label="Website language">
            <div className="flex gap-2">
              <Chip active={language === "english"} onClick={() => setLanguage("english")} label="English" />
              <Chip active={language === "hinglish"} onClick={() => setLanguage("hinglish")} label="Hinglish" />
            </div>
          </Field>
          <NextBtn onClick={createBusiness} busy={busy} label="Continue" />
        </div>
      )}

      {step === 2 && (
        <div className="step-enter space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <TemplateCard id="elegant" selected={template === "elegant"} onSelect={saveTemplate}
              title="Elegant" desc="Warm, premium, classic. For boutiques, salons, designers."
              preview={
                <div className="h-40 rounded-lg bg-[#f8f5f0] border border-stone-200 p-4 flex flex-col justify-center items-center">
                  <div className="font-display text-stone-800 text-lg">Aa</div>
                  <div className="w-16 h-1 bg-amber-700 rounded my-2" />
                  <div className="w-24 h-2 bg-stone-300 rounded" />
                </div>
              } />
            <TemplateCard id="bold" selected={template === "bold"} onSelect={saveTemplate}
              title="Bold" desc="Modern, confident, high-contrast. For gyms, clinics, studios."
              preview={
                <div className="h-40 rounded-lg bg-stone-900 p-4 flex flex-col justify-center items-center">
                  <div className="text-white font-bold text-lg">Aa</div>
                  <div className="w-16 h-1 bg-violet-500 rounded my-2" />
                  <div className="w-24 h-2 bg-stone-600 rounded" />
                </div>
              } />
          </div>
          <NextBtn onClick={() => setStep(3)} busy={false} label="Continue" />
        </div>
      )}

      {step === 3 && (
        <div className="step-enter space-y-8">
          <div>
            <p className="text-sm text-stone-500 mb-4">
              Tick the pages you want on your website — you can change this anytime.
            </p>
            <div className="space-y-3">
              {STANDARD_TABS.map((t) => (
                <button key={t.id} onClick={() => setTabs({ ...tabs, [t.id]: !tabs[t.id] })}
                  className={`w-full flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
                    tabs[t.id] ? "border-amber-700 bg-amber-50/40" : "border-stone-200 bg-white hover:border-stone-400"
                  }`}>
                  <span className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold shrink-0 ${
                    tabs[t.id] ? "bg-amber-700 text-white" : "border-2 border-stone-300 text-transparent"
                  }`}>✓</span>
                  <span>
                    <span className="font-semibold block">{t.label}</span>
                    <span className="text-sm text-stone-500">{t.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-stone-200 p-5 space-y-4">
            <p className="font-semibold text-sm">
              Already have a website, brochure or Instagram? <span className="font-normal text-stone-500">(optional — AI will use it while writing your site)</span>
            </p>
            <div className="flex gap-2">
              <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)}
                placeholder="https://your-old-website.com" className="inp flex-1" />
              <button onClick={submitRefUrl}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:border-stone-500 transition shrink-0">
                Read it
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input ref={docRef} type="file" accept=".pdf,.txt,.md,text/plain,application/pdf"
                className="hidden" onChange={(e) => submitRefDoc(e.target.files)} />
              <button onClick={() => docRef.current?.click()}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:border-stone-500 transition">
                📄 Upload a document (PDF / text)
              </button>
            </div>
            {refStatus && <p className="text-sm text-stone-600">{refStatus}</p>}
          </div>

          <div className="flex gap-3">
            <BackBtn onClick={() => setStep(2)} />
            <NextBtn onClick={saveStructure} busy={busy} label="Continue" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="step-enter space-y-6">
          {!copy ? (
            <>
              <Field label="1. What do you offer?">
                <textarea value={offering} onChange={(e) => setOffering(e.target.value)} rows={2}
                  placeholder="e.g. Designer sarees and lehengas, custom stitching" className="inp" />
              </Field>
              <Field label="2. What makes you special?">
                <textarea value={special} onChange={(e) => setSpecial(e.target.value)} rows={2}
                  placeholder="e.g. 20 years of experience, everything handmade" className="inp" />
              </Field>
              <Field label="3. What should visitors do?">
                <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={2}
                  placeholder="e.g. Message us on WhatsApp to book a visit" className="inp" />
              </Field>
              <div className="flex gap-3">
                <BackBtn onClick={() => setStep(3)} />
                <NextBtn onClick={generateCopy} busy={busy} label={busy ? "Writing your website…" : "✨ Write my website"} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 -mt-2">Here is what we wrote. Tap any text to edit — you can also refine it by chat in the next step.</p>
              <Field label="Headline">
                <input value={copy.headline} onChange={(e) => setCopy({ ...copy, headline: e.target.value })} className="inp font-display text-lg" />
              </Field>
              <Field label="Tagline">
                <input value={copy.tagline} onChange={(e) => setCopy({ ...copy, tagline: e.target.value })} className="inp" />
              </Field>
              <Field label="About">
                <textarea value={copy.about} onChange={(e) => setCopy({ ...copy, about: e.target.value })} rows={3} className="inp" />
              </Field>
              <div className="flex gap-3">
                <button onClick={() => setCopy(null)} className="rounded-full border border-stone-300 px-6 py-3 text-sm hover:border-stone-500 transition">
                  ↻ Rewrite
                </button>
                <NextBtn onClick={saveCopy} busy={busy} label="Looks good — continue" />
              </div>
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="step-enter space-y-6">
          <p className="text-sm text-stone-500 -mt-4">
            Upload photos — AI writes each item&apos;s name, description and category.
            Then add price and discount yourself. Everything is editable.
          </p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => uploadPhotos(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-8 text-stone-500 hover:border-amber-700 hover:text-amber-700 transition disabled:opacity-50">
            {busy ? "Uploading…" : "＋ Tap to add photos"}
          </button>

          {products.length > 0 && (
            <div className="space-y-4">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden flex">
                  {p.status === "processing" ? (
                    <div className="w-28 h-28 shrink-0 shimmer" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.processed_url || p.original_url} alt={p.title}
                      className="w-28 h-28 shrink-0 object-cover" />
                  )}
                  <div className="p-3 flex-1 min-w-0">
                    {p.status === "processing" ? (
                      <p className="text-xs text-stone-400 mt-2">✨ Writing this item&apos;s details…</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input defaultValue={p.title} placeholder="Product name"
                          onBlur={(e) => patchProduct(p.id, { title: e.target.value })}
                          className="text-sm font-medium outline-none border-b border-transparent focus:border-stone-300 col-span-1" />
                        <input defaultValue={p.category} placeholder="Category"
                          onBlur={(e) => patchProduct(p.id, { category: e.target.value })}
                          className="text-sm outline-none border-b border-transparent focus:border-stone-300 col-span-1" />
                        <input defaultValue={p.price_text} placeholder="Price (₹1,499)"
                          onBlur={(e) => patchProduct(p.id, { price_text: e.target.value })}
                          className="text-sm outline-none border-b border-transparent focus:border-stone-300 col-span-1" />
                        <input type="number" min={0} max={90} defaultValue={p.discount_pct || ""} placeholder="Discount %"
                          onBlur={(e) => patchProduct(p.id, { discount_pct: Number(e.target.value) || 0 })}
                          className="text-sm outline-none border-b border-transparent focus:border-stone-300 col-span-1" />
                        <textarea defaultValue={p.description} placeholder="Description" rows={1}
                          onBlur={(e) => patchProduct(p.id, { description: e.target.value })}
                          className="text-xs text-stone-500 outline-none resize-none border-b border-transparent focus:border-stone-300 col-span-2" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <BackBtn onClick={() => setStep(4)} />
            <NextBtn onClick={() => router.push(`/studio/${bizId}`)} busy={false}
              label={products.length ? "Continue → Preview & edit by chat" : "Skip → Preview & edit by chat"} />
          </div>
          <p className="text-xs text-stone-400">
            Next: see your website live, refine it by chatting with AI, then publish.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-stone-700 mb-2">{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm border transition ${
        active ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-300 hover:border-stone-500"
      }`}>
      {label}
    </button>
  );
}

function NextBtn({ onClick, busy, label }: { onClick: () => void; busy: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="rounded-full bg-amber-700 text-white px-8 py-3.5 font-semibold hover:bg-amber-800 transition disabled:opacity-60 shadow-lg shadow-amber-700/20">
      {label}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-full border border-stone-300 px-6 py-3 text-sm hover:border-stone-500 transition">
      Back
    </button>
  );
}

function TemplateCard({
  id, selected, onSelect, title, desc, preview,
}: {
  id: string; selected: boolean; onSelect: (id: string) => void;
  title: string; desc: string; preview: React.ReactNode;
}) {
  return (
    <button onClick={() => onSelect(id)}
      className={`text-left rounded-2xl border-2 p-4 transition ${
        selected ? "border-amber-700 bg-amber-50/40" : "border-stone-200 bg-white hover:border-stone-400"
      }`}>
      {preview}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        {selected && <span className="text-amber-700 text-sm font-medium">✓ Selected</span>}
      </div>
      <p className="text-sm text-stone-500 mt-1">{desc}</p>
    </button>
  );
}
