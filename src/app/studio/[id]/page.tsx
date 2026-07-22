"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/client";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Make the headline shorter and punchier",
  "Change the accent color to emerald",
  "Switch to the bold template",
  "Turn off the gallery tab",
  "Rewrite the about section in Hinglish",
];

export default function Studio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [name, setName] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(1);
  const [published, setPublished] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetchJson<{ business: { slug: string; status: string; name: string } }>(`/api/business/${id}`);
    if (r.ok && r.data?.business) {
      setSlug(r.data.business.slug);
      setStatus(r.data.business.status);
      setName(r.data.business.name);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const r = await fetchJson<{ reply: string; applied: string[] }>(`/api/business/${id}/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next.slice(-12) }),
    });
    setBusy(false);
    if (!r.ok || !r.data) {
      setMessages([...next, { role: "assistant", content: `Sorry — ${r.error}` }]);
      return;
    }
    setMessages([...next, { role: "assistant", content: r.data.reply }]);
    if (r.data.applied?.length) {
      setVersion((v) => v + 1); // reload the preview
      if (r.data.applied.some((a) => a.includes("published"))) setPublished(true);
      load();
    }
  };

  const publish = async () => {
    setBusy(true);
    await fetchJson(`/api/business/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    setBusy(false);
    setPublished(true);
    setStatus("published");
    setVersion((v) => v + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="font-display text-lg font-semibold shrink-0">Jhalak</Link>
          <span className="text-stone-300">/</span>
          <span className="font-medium truncate">{name || "Studio"}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
            status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/admin/${id}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:border-slate-500 transition">
            Dashboard
          </Link>
          {slug && (
            <a href={`/s/${slug}`} target="_blank" className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:border-slate-500 transition">
              Open site ↗
            </a>
          )}
          <button onClick={publish} disabled={busy || status === "published"}
            className="rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {status === "published" ? "✓ Live" : "🚀 Publish"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* chat panel */}
        <div className="w-full sm:w-[420px] shrink-0 flex flex-col border-r border-slate-200 bg-white">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!messages.length && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-6">
                  👋 This is your <b>website editor</b>. Tell me what to change — copy,
                  colors, template, tabs, product prices — and you&apos;ll see it update
                  in the preview instantly.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="block w-full text-left text-sm rounded-xl border border-slate-200 px-4 py-2.5 hover:border-blue-500 hover:text-blue-700 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap ${
                  m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-sm bg-slate-100 text-slate-400">
                  Making changes…
                </div>
              </div>
            )}
            {published && (
              <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
                🎉 Your site is live! Share it:{" "}
                <a href={`/s/${slug}`} target="_blank" className="underline font-medium">
                  {typeof window !== "undefined" ? window.location.host : ""}/s/{slug}
                </a>
              </div>
            )}
            <div ref={chatEnd} />
          </div>
          <div className="p-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="e.g. Make the headline about bridal wear…"
                disabled={busy}
                className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 text-sm outline-none focus:border-blue-600 disabled:opacity-50"
              />
              <button onClick={() => send()} disabled={busy || !input.trim()}
                className="rounded-full bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                Send
              </button>
            </div>
          </div>
        </div>

        {/* live preview */}
        <div className="hidden sm:flex flex-1 flex-col bg-slate-200 p-4">
          <div className="flex-1 rounded-2xl overflow-hidden bg-white shadow-xl">
            {slug ? (
              <iframe key={version} src={`/s/${slug}`} className="w-full h-full" title="Website preview" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">Loading preview…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
