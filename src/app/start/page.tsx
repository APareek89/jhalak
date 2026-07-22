"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

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

export default function StartWizard() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // step 1
  const [name, setName] = useState("");
  const [category, setCategory] = useState("boutique");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("english");
  // created business
  const [bizId, setBizId] = useState("");
  const [slug, setSlug] = useState("");
  // step 2
  const [template, setTemplate] = useState("elegant");
  // step 3
  const [offering, setOffering] = useState("");
  const [special, setSpecial] = useState("");
  const [action, setAction] = useState("");
  const [copy, setCopy] = useState<SiteCopy | null>(null);
  // step 4
  const [products, setProducts] = useState<Product[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // step 5
  const [published, setPublished] = useState(false);
  const [qr, setQr] = useState("");

  const siteUrl = slug ? `/s/${slug}` : "";

  const createBusiness = async () => {
    if (!name.trim()) return setError("Please enter your business name");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, city, phone, whatsapp: phone, language, template }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBizId(d.id);
      setSlug(d.slug);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async (t: string) => {
    setTemplate(t);
    await fetch(`/api/business/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: t }),
    });
  };

  const generateCopy = async () => {
    if (!offering.trim()) return setError("Tell us what you offer — one line is enough");
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/business/${bizId}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offering, special, action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCopy(d.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write copy, try again");
    } finally {
      setBusy(false);
    }
  };

  const saveCopy = async () => {
    if (!copy) return;
    await fetch(`/api/business/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: copy }),
    });
    setStep(4);
  };

  const refreshProducts = useCallback(async () => {
    if (!bizId) return;
    const r = await fetch(`/api/business/${bizId}/photos`);
    const d = await r.json();
    if (d.products) setProducts(d.products);
  }, [bizId]);

  useEffect(() => {
    if (step !== 4) return;
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
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const r = await fetch(`/api/business/${bizId}/photos`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await refreshProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await fetch(`/api/business/${bizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const full = `${window.location.origin}/s/${slug}`;
      setQr(await QRCode.toDataURL(full, { width: 220, margin: 1 }));
      setPublished(true);
    } finally {
      setBusy(false);
    }
  };

  const stepTitle = [
    "",
    "Tell us about your business",
    "Pick your style",
    "Your story — 3 quick questions",
    "Add your photos",
    "Preview & go live",
  ][step];

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-10">
        <Link href="/" className="font-display text-xl font-semibold">Jhalak</Link>
        <span className="text-sm text-stone-400">Step {step} of 5</span>
      </header>

      <div className="h-1.5 bg-stone-200 rounded-full mb-10">
        <div
          className="h-1.5 bg-amber-700 rounded-full transition-all duration-500"
          style={{ width: `${(step / 5) * 100}%` }}
        />
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
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-4 py-2 rounded-full text-sm border transition ${
                    category === c.id
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white border-stone-300 hover:border-stone-500"
                  }`}
                >
                  {c.label}
                </button>
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
              {[
                { id: "english", label: "English" },
                { id: "hinglish", label: "Hinglish" },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`px-4 py-2 rounded-full text-sm border transition ${
                    language === l.id
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white border-stone-300 hover:border-stone-500"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Field>
          <NextBtn onClick={createBusiness} busy={busy} label="Continue" />
        </div>
      )}

      {step === 2 && (
        <div className="step-enter space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <TemplateCard
              id="elegant"
              selected={template === "elegant"}
              onSelect={saveTemplate}
              title="Elegant"
              desc="Warm, premium, classic. For boutiques, salons, designers."
              preview={
                <div className="h-40 rounded-lg bg-[#f8f5f0] border border-stone-200 p-4 flex flex-col justify-center items-center">
                  <div className="font-display text-stone-800 text-lg">Aa</div>
                  <div className="w-16 h-1 bg-amber-700 rounded my-2" />
                  <div className="w-24 h-2 bg-stone-300 rounded" />
                </div>
              }
            />
            <TemplateCard
              id="bold"
              selected={template === "bold"}
              onSelect={saveTemplate}
              title="Bold"
              desc="Modern, confident, high-contrast. For gyms, clinics, studios."
              preview={
                <div className="h-40 rounded-lg bg-stone-900 p-4 flex flex-col justify-center items-center">
                  <div className="text-white font-bold text-lg">Aa</div>
                  <div className="w-16 h-1 bg-violet-500 rounded my-2" />
                  <div className="w-24 h-2 bg-stone-600 rounded" />
                </div>
              }
            />
          </div>
          <NextBtn onClick={() => setStep(3)} busy={false} label="Continue" />
        </div>
      )}

      {step === 3 && (
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
              <NextBtn onClick={generateCopy} busy={busy} label={busy ? "Writing your website…" : "✨ Write my website"} />
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 -mt-2">
                Here is what we wrote. Tap any text to edit it.
              </p>
              <Field label="Headline">
                <input value={copy.headline} onChange={(e) => setCopy({ ...copy, headline: e.target.value })} className="inp font-display text-lg" />
              </Field>
              <Field label="Tagline">
                <input value={copy.tagline} onChange={(e) => setCopy({ ...copy, tagline: e.target.value })} className="inp" />
              </Field>
              <Field label="About">
                <textarea value={copy.about} onChange={(e) => setCopy({ ...copy, about: e.target.value })} rows={3} className="inp" />
              </Field>
              {copy.services.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-3">
                  <input
                    value={s.title}
                    onChange={(e) => {
                      const services = [...copy.services];
                      services[i] = { ...s, title: e.target.value };
                      setCopy({ ...copy, services });
                    }}
                    className="inp col-span-1"
                  />
                  <input
                    value={s.desc}
                    onChange={(e) => {
                      const services = [...copy.services];
                      services[i] = { ...s, desc: e.target.value };
                      setCopy({ ...copy, services });
                    }}
                    className="inp col-span-2"
                  />
                </div>
              ))}
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

      {step === 4 && (
        <div className="step-enter space-y-6">
          <p className="text-sm text-stone-500 -mt-4">
            Upload photos of your {category === "boutique" ? "products" : "space and work"} straight
            from your phone. Our AI turns each one into a professional catalogue shot with a title
            and description.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => uploadPhotos(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-10 text-stone-500 hover:border-amber-700 hover:text-amber-700 transition disabled:opacity-50"
          >
            {busy ? "Uploading…" : "＋ Tap to add photos"}
          </button>

          {products.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {products.map((p) => (
                <div key={p.id} className="rounded-xl bg-white border border-stone-200 overflow-hidden">
                  {p.status === "processing" ? (
                    <div className="aspect-square shimmer" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.processed_url || p.original_url} alt={p.title} className="aspect-square object-cover w-full" />
                  )}
                  <div className="p-3">
                    {p.status === "processing" ? (
                      <p className="text-xs text-stone-400">✨ Polishing photo & writing copy…</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{p.title || "Untitled"}</p>
                        <p className="text-xs text-stone-500 line-clamp-2">{p.description}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="rounded-full border border-stone-300 px-6 py-3 text-sm hover:border-stone-500 transition">
              Back
            </button>
            <NextBtn
              onClick={() => setStep(5)}
              busy={false}
              label={products.length ? "Continue" : "Skip for now"}
            />
          </div>
        </div>
      )}

      {step === 5 && !published && (
        <div className="step-enter space-y-6">
          <p className="text-stone-600">
            Your website is ready. Have a look, then take it live.
          </p>
          <a
            href={siteUrl}
            target="_blank"
            className="block rounded-2xl bg-white border border-stone-200 p-6 hover:border-amber-700 transition group"
          >
            <p className="text-sm text-stone-400 mb-1">Preview</p>
            <p className="font-medium group-hover:text-amber-700 transition">
              {typeof window !== "undefined" ? window.location.host : ""}/s/{slug} ↗
            </p>
          </a>
          <NextBtn onClick={publish} busy={busy} label={busy ? "Publishing…" : "🚀 Publish my website"} />
        </div>
      )}

      {step === 5 && published && (
        <div className="step-enter text-center space-y-6 py-6">
          <div className="text-5xl">🎉</div>
          <h2 className="font-display text-2xl font-semibold">Your business is live!</h2>
          <a href={siteUrl} target="_blank" className="block text-amber-700 font-medium underline underline-offset-4">
            {typeof window !== "undefined" ? window.location.host : ""}/s/{slug}
          </a>
          {qr && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code to your website" className="rounded-xl border border-stone-200" />
            </div>
          )}
          <p className="text-sm text-stone-500">
            Scan to open on your phone · share the link on WhatsApp
          </p>
          <Link
            href={`/admin/${bizId}`}
            className="inline-block rounded-full bg-stone-900 text-white px-8 py-4 font-semibold hover:bg-stone-700 transition"
          >
            Open my dashboard →
          </Link>
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

function NextBtn({ onClick, busy, label }: { onClick: () => void; busy: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-full bg-amber-700 text-white px-8 py-3.5 font-semibold hover:bg-amber-800 transition disabled:opacity-60 shadow-lg shadow-amber-700/20"
    >
      {label}
    </button>
  );
}

function TemplateCard({
  id, selected, onSelect, title, desc, preview,
}: {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  title: string;
  desc: string;
  preview: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`text-left rounded-2xl border-2 p-4 transition ${
        selected ? "border-amber-700 bg-amber-50/40" : "border-stone-200 bg-white hover:border-stone-400"
      }`}
    >
      {preview}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        {selected && <span className="text-amber-700 text-sm font-medium">✓ Selected</span>}
      </div>
      <p className="text-sm text-stone-500 mt-1">{desc}</p>
    </button>
  );
}
