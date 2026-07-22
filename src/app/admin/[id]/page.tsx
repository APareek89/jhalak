"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchJson, downscaleImage } from "@/lib/client";

type Biz = {
  id: string; slug: string; name: string; category: string; city: string;
  phone: string; whatsapp: string; language: string; template: string; status: string;
};
type Content = {
  headline?: string; tagline?: string; about?: string;
  services?: { title: string; desc: string }[]; cta_label?: string;
  tabs?: { products?: boolean; about?: boolean; gallery?: boolean; contact?: boolean };
  accent?: string;
};
type Product = {
  id: string; title: string; description: string; price_text: string; tags: string[];
  category: string; discount_pct: number;
  processed_url: string; original_url: string; status: string; visible: boolean; error: string;
};
type Reel = {
  id: string; product_id: string; variant: string; video_url: string; status: string; error: string;
};
type Lead = { id: string; name: string; phone: string; message: string; created_at: string };

const TABS = ["Overview", "Catalogue", "Website", "Reels", "Leads"] as const;

export default function Admin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [biz, setBiz] = useState<Biz | null>(null);
  const [content, setContent] = useState<Content>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quota, setQuota] = useState({ reel_packs_used: 0, photos_used: 0 });
  const [leadsCount, setLeadsCount] = useState(0);
  const [mediaProvider, setMediaProvider] = useState("off");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetchJson<{
      business: Biz; content: Content; products: Product[]; reels: Reel[];
      quota: { reel_packs_used: number; photos_used: number };
      leads_count: number; media_provider: string;
    }>(`/api/business/${id}`);
    if (!r.ok || !r.data) return; // transient failure — next poll retries
    const d = r.data;
    setBiz(d.business);
    setContent(d.content || {});
    setProducts(d.products || []);
    setReels(d.reels || []);
    setQuota(d.quota);
    setLeadsCount(d.leads_count);
    setMediaProvider(d.media_provider || "off");
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // poll while anything is generating
  useEffect(() => {
    const anyWorking =
      products.some((p) => p.status === "processing") ||
      reels.some((r) => r.status === "generating");
    if (!anyWorking) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [products, reels, refresh]);

  useEffect(() => {
    if (tab === "Leads") {
      fetchJson<{ leads: Lead[] }>(`/api/business/${id}/leads`).then((r) => {
        if (r.ok && r.data) setLeads(r.data.leads || []);
      });
    }
  }, [tab, id]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const patchBiz = async (body: Record<string, unknown>, msg = "Saved") => {
    await fetch(`/api/business/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await refresh();
    flash(msg);
  };

  const patchProduct = async (pid: string, body: Record<string, unknown>) => {
    await fetch(`/api/products/${pid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const deleteProduct = async (pid: string) => {
    await fetch(`/api/products/${pid}`, { method: "DELETE" });
    await refresh();
    flash("Removed");
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const fd = new FormData();
    for (const f of Array.from(files)) {
      const small = await downscaleImage(f);
      if (small) fd.append("files", small);
    }
    if (!fd.getAll("files").length) {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      return flash("Couldn't read those photos — use JPG or PNG.");
    }
    const r = await fetchJson(`/api/business/${id}/photos`, { method: "POST", body: fd });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) flash(r.error);
    await refresh();
  };

  const makeReels = async (productId: string) => {
    setBusy(true);
    const r = await fetchJson(`/api/business/${id}/reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    setBusy(false);
    flash(r.ok ? "Generating 2 reels — takes a few minutes" : r.error);
    await refresh();
  };

  if (!biz) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Loading…
      </div>
    );
  }

  const siteUrl = `/s/${biz.slug}`;
  const readyProducts = products.filter((p) => p.status === "ready");

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-semibold">Jhalak</Link>
            <span className="text-stone-300">/</span>
            <span className="font-medium">{biz.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                biz.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {biz.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/studio/${id}`}
              className="rounded-full bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800 transition"
            >
              ✨ Edit in Studio
            </Link>
            <a
              href={siteUrl}
              target="_blank"
              className="rounded-full bg-stone-900 text-white px-4 py-2 text-sm font-medium hover:bg-stone-700 transition"
            >
              View site ↗
            </a>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t
                  ? "border-amber-700 text-amber-800"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {t}
              {t === "Leads" && leadsCount > 0 && (
                <span className="ml-1.5 text-xs bg-amber-700 text-white rounded-full px-1.5 py-0.5">
                  {leadsCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "Overview" && (
          <div className="grid sm:grid-cols-3 gap-5">
            <Stat label="Catalogue items" value={String(readyProducts.length)} />
            <Stat label="Enquiries" value={String(leadsCount)} />
            <Stat label="Reels created" value={String(reels.filter((r) => r.status === "ready").length)} />
            <div className="sm:col-span-3 rounded-2xl bg-white border border-stone-200 p-6">
              <p className="font-semibold mb-2">Your website</p>
              <a href={siteUrl} target="_blank" className="text-amber-700 underline underline-offset-4 text-sm">
                {typeof window !== "undefined" ? window.location.host : ""}{siteUrl} ↗
              </a>
              <div className="mt-4 flex gap-3">
                {biz.status !== "published" ? (
                  <button
                    onClick={() => patchBiz({ status: "published" }, "Published!")}
                    className="rounded-full bg-amber-700 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-800 transition"
                  >
                    🚀 Publish
                  </button>
                ) : (
                  <button
                    onClick={() => patchBiz({ status: "draft" }, "Unpublished")}
                    className="rounded-full border border-stone-300 px-5 py-2.5 text-sm hover:border-stone-500 transition"
                  >
                    Unpublish
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + siteUrl);
                    flash("Link copied");
                  }}
                  className="rounded-full border border-stone-300 px-5 py-2.5 text-sm hover:border-stone-500 transition"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "Catalogue" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-500">
                {quota.photos_used}/12 photos used · AI polishes each photo and writes its copy
              </p>
              <input
                ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => uploadPhotos(e.target.files)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-full bg-amber-700 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-800 transition disabled:opacity-60"
              >
                {busy ? "Uploading…" : "＋ Add photos"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
                  {p.status === "processing" ? (
                    <div className="aspect-square shimmer" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.processed_url || p.original_url} alt={p.title} className="aspect-square object-cover w-full" />
                  )}
                  <div className="p-4 space-y-2">
                    {p.status === "processing" ? (
                      <p className="text-xs text-stone-400">✨ Polishing & writing…</p>
                    ) : (
                      <>
                        <input
                          defaultValue={p.title}
                          onBlur={(e) => patchProduct(p.id, { title: e.target.value })}
                          className="w-full text-sm font-medium outline-none border-b border-transparent focus:border-stone-300"
                        />
                        <textarea
                          defaultValue={p.description}
                          rows={2}
                          onBlur={(e) => patchProduct(p.id, { description: e.target.value })}
                          className="w-full text-xs text-stone-500 outline-none resize-none border-b border-transparent focus:border-stone-300"
                        />
                        <input
                          defaultValue={p.category}
                          placeholder="Category (e.g. Sarees)"
                          onBlur={(e) => patchProduct(p.id, { category: e.target.value })}
                          className="w-full text-xs outline-none border-b border-transparent focus:border-stone-300"
                        />
                        <div className="flex gap-2">
                          <input
                            defaultValue={p.price_text}
                            placeholder="Price (₹1,499)"
                            onBlur={(e) => patchProduct(p.id, { price_text: e.target.value })}
                            className="flex-1 min-w-0 text-xs outline-none border-b border-transparent focus:border-stone-300"
                          />
                          <input
                            type="number" min={0} max={90}
                            defaultValue={p.discount_pct || ""}
                            placeholder="Disc %"
                            onBlur={(e) => patchProduct(p.id, { discount_pct: Number(e.target.value) || 0 })}
                            className="w-16 text-xs outline-none border-b border-transparent focus:border-stone-300"
                          />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <button
                            onClick={() => {
                              patchProduct(p.id, { visible: !p.visible }).then(refresh);
                            }}
                            className={`text-xs ${p.visible ? "text-green-700" : "text-stone-400"}`}
                          >
                            {p.visible ? "● Visible" : "○ Hidden"}
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="text-xs text-red-500">
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!products.length && (
                <p className="col-span-full text-center text-stone-400 py-16">
                  No photos yet — add your first ones.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "Website" && (
          <div className="max-w-2xl space-y-5">
            <Field label="Headline">
              <input
                value={content.headline || ""}
                onChange={(e) => setContent({ ...content, headline: e.target.value })}
                className="adm-inp font-display text-lg"
              />
            </Field>
            <Field label="Tagline">
              <input
                value={content.tagline || ""}
                onChange={(e) => setContent({ ...content, tagline: e.target.value })}
                className="adm-inp"
              />
            </Field>
            <Field label="About">
              <textarea
                value={content.about || ""}
                onChange={(e) => setContent({ ...content, about: e.target.value })}
                rows={3}
                className="adm-inp"
              />
            </Field>
            {(content.services || []).map((s, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <input
                  value={s.title}
                  onChange={(e) => {
                    const services = [...(content.services || [])];
                    services[i] = { ...s, title: e.target.value };
                    setContent({ ...content, services });
                  }}
                  className="adm-inp col-span-1"
                />
                <input
                  value={s.desc}
                  onChange={(e) => {
                    const services = [...(content.services || [])];
                    services[i] = { ...s, desc: e.target.value };
                    setContent({ ...content, services });
                  }}
                  className="adm-inp col-span-2"
                />
              </div>
            ))}
            <Field label="Template">
              <div className="flex gap-2">
                {["elegant", "bold"].map((tp) => (
                  <button
                    key={tp}
                    onClick={() => patchBiz({ template: tp }, "Template changed")}
                    className={`px-4 py-2 rounded-full text-sm border capitalize transition ${
                      biz.template === tp
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white border-stone-300 hover:border-stone-500"
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Accent color">
              <div className="flex gap-2">
                {[
                  ["amber", "bg-amber-700"], ["violet", "bg-violet-600"], ["emerald", "bg-emerald-700"],
                  ["rose", "bg-rose-700"], ["sky", "bg-sky-700"], ["stone", "bg-stone-800"],
                ].map(([c, cls]) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => patchBiz({ content: { ...content, accent: c } }, `Accent → ${c}`)}
                    className={`w-9 h-9 rounded-full ${cls} transition ring-offset-2 ${
                      content.accent === c ? "ring-2 ring-stone-900" : "hover:scale-110"
                    }`}
                  />
                ))}
              </div>
            </Field>
            <Field label="Website pages">
              <div className="flex flex-wrap gap-2">
                {[
                  ["products", "Our Products"], ["about", "About"], ["gallery", "Gallery"], ["contact", "Contact"],
                ].map(([k, label]) => {
                  const on = { products: true, about: true, gallery: false, contact: true, ...(content.tabs || {}) }[k as "products"];
                  return (
                    <button
                      key={k}
                      onClick={() =>
                        patchBiz(
                          { content: { ...content, tabs: { ...(content.tabs || {}), [k]: !on } } },
                          `${label} ${on ? "hidden" : "shown"}`
                        )
                      }
                      className={`px-4 py-2 rounded-full text-sm border transition ${
                        on ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-300 hover:border-stone-500"
                      }`}
                    >
                      {on ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <button
              onClick={() => patchBiz({ content }, "Website updated")}
              className="rounded-full bg-amber-700 text-white px-6 py-3 text-sm font-semibold hover:bg-amber-800 transition"
            >
              Save changes
            </button>
          </div>
        )}

        {tab === "Reels" && (
          <div className="space-y-8">
            {mediaProvider === "off" && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 text-sm">
                🎬 The reel studio&apos;s AI video provider is not connected in this preview.
                Everything else works — reels switch on the moment a provider key is added.
              </div>
            )}
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <p className="font-semibold mb-1">Create a reel pack</p>
              <p className="text-sm text-stone-500 mb-4">
                Pick a catalogue item — we generate 2 Instagram-ready reels (9:16).
                {" "}{2 - quota.reel_packs_used} pack{2 - quota.reel_packs_used === 1 ? "" : "s"} left in this preview.
              </p>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {readyProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => makeReels(p.id)}
                    disabled={busy || quota.reel_packs_used >= 2 || mediaProvider === "off"}
                    className="shrink-0 w-28 group disabled:opacity-40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.processed_url || p.original_url}
                      alt={p.title}
                      className="w-28 h-28 object-cover rounded-xl border-2 border-transparent group-hover:border-amber-700 transition"
                    />
                    <p className="text-xs mt-1.5 truncate">{p.title}</p>
                    <p className="text-[11px] text-amber-700 font-medium">🎬 Make reels</p>
                  </button>
                ))}
                {!readyProducts.length && (
                  <p className="text-sm text-stone-400 py-6">Add catalogue photos first.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {reels.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
                  {r.status === "ready" ? (
                    <video src={r.video_url} controls playsInline className="aspect-[9/16] w-full object-cover bg-black" />
                  ) : r.status === "failed" ? (
                    <div className="aspect-[9/16] flex items-center justify-center text-xs text-red-500 p-4 text-center">
                      Failed: {r.error?.slice(0, 80)}
                    </div>
                  ) : (
                    <div className="aspect-[9/16] shimmer flex items-end justify-center pb-6">
                      <p className="text-xs text-stone-500">🎬 Generating…</p>
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs capitalize text-stone-500">{r.variant}</span>
                    {r.status === "ready" && (
                      <a href={r.video_url} download className="text-xs font-semibold text-amber-700">
                        Download ↓
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Leads" && (
          <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
            {leads.length ? (
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Message</th>
                    <th className="px-5 py-3 font-medium">When</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-stone-100">
                      <td className="px-5 py-3">{l.name || "—"}</td>
                      <td className="px-5 py-3">{l.phone}</td>
                      <td className="px-5 py-3 max-w-xs truncate">{l.message}</td>
                      <td className="px-5 py-3 text-stone-400">
                        {new Date(l.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={`https://wa.me/${l.phone.replace(/\D/g, "").length === 10 ? "91" : ""}${l.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          className="text-xs font-semibold text-green-700"
                        >
                          Reply on WhatsApp →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-stone-400 py-16">
                No enquiries yet — share your website link on WhatsApp Status and Instagram.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-sm text-stone-500 mt-1">{label}</p>
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
