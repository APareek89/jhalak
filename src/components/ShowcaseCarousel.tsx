"use client";

import { Check } from "lucide-react";
import { useState } from "react";

type Sample = {
  id: string;
  name: string;
  vibe: string;
  template: string;
  accent: string;
  c: { head: string; headText: string; hero: string; ink: string; accent: string; card: string; page: string };
};

const SAMPLES: Sample[] = [
  { id: "elegant-amber", name: "Meera Boutique", vibe: "Elegant · warm classic", template: "elegant", accent: "amber",
    c: { page: "#faf7f2", head: "#faf7f2", headText: "#1c1917", hero: "#f4efe7", ink: "#292524", accent: "#92400e", card: "#ffffff" } },
  { id: "bold-violet", name: "Iron Temple Gym", vibe: "Bold · dark energy", template: "bold", accent: "violet",
    c: { page: "#ffffff", head: "#0c0a09", headText: "#ffffff", hero: "#0c0a09", ink: "#ffffff", accent: "#7c3aed", card: "#f5f5f4" } },
  { id: "professional-blue", name: "Dr. Mehta Clinic", vibe: "Professional · trusted", template: "professional", accent: "blue",
    c: { page: "#f8fafc", head: "#ffffff", headText: "#0f172a", hero: "#ffffff", ink: "#0f172a", accent: "#2563eb", card: "#ffffff" } },
  { id: "minimal-stone", name: "Kora Café", vibe: "Minimal · airy", template: "minimal", accent: "stone",
    c: { page: "#ffffff", head: "#ffffff", headText: "#171717", hero: "#ffffff", ink: "#171717", accent: "#44403c", card: "#fafafa" } },
  { id: "elegant-rose", name: "Gulaab Studio", vibe: "Elegant · rose accent", template: "elegant", accent: "rose",
    c: { page: "#faf7f2", head: "#faf7f2", headText: "#1c1917", hero: "#f7eeee", ink: "#292524", accent: "#be123c", card: "#ffffff" } },
  { id: "professional-emerald", name: "GreenLeaf Ayurveda", vibe: "Professional · fresh", template: "professional", accent: "emerald",
    c: { page: "#f8fafc", head: "#ffffff", headText: "#0f172a", hero: "#ffffff", ink: "#0f172a", accent: "#047857", card: "#ffffff" } },
];

function Mini({ s }: { s: Sample }) {
  const { c } = s;
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ background: c.page }}>
      {/* header */}
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: c.head }}>
        <span className="text-[8px] font-bold" style={{ color: c.headText }}>{s.name}</span>
        <span className="rounded-full px-1.5 py-0.5 text-[6px] font-bold text-white" style={{ background: c.accent }}>WhatsApp</span>
      </div>
      {/* hero */}
      <div className="px-2.5 py-2 flex gap-2 items-center" style={{ background: c.hero }}>
        <div className="flex-1">
          <div className="h-1.5 rounded mb-1 w-11/12" style={{ background: c.ink }} />
          <div className="h-1.5 rounded mb-1 w-2/3" style={{ background: c.ink }} />
          <div className="h-1 rounded mb-1.5 w-1/2 opacity-40" style={{ background: c.ink }} />
          <div className="h-2.5 rounded-full w-10" style={{ background: c.accent }} />
        </div>
        <div className="w-10 h-10 rounded-md" style={{ background: `linear-gradient(135deg, ${c.accent}55, ${c.accent})` }} />
      </div>
      {/* products */}
      <div className="grid grid-cols-3 gap-1 px-2.5 pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded" style={{ background: c.card, border: "1px solid #e7e5e4" }}>
            <div className="h-5 rounded-t" style={{ background: `${c.accent}22` }} />
            <div className="p-1"><div className="h-1 rounded mb-0.5 opacity-70" style={{ background: c.ink }} /><div className="h-1 rounded w-1/2" style={{ background: c.accent }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Continuously scrolling website showcase; each sample has a "Use this style" button. */
export default function ShowcaseCarousel({
  onPick, current,
}: {
  onPick: (template: string, accent: string) => void;
  current?: string; // `${template}-${accent}`
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked || current;
  const list = [...SAMPLES, ...SAMPLES]; // duplicated for seamless loop

  return (
    <div className="card p-4 overflow-hidden flex flex-col h-full">
      <p className="field-label !mb-0.5">Style inspiration</p>
      <p className="text-xs text-slate-400 mb-3">Real Jhalak looks — pick one anytime, change it later.</p>
      <div className="relative flex-1 min-h-0 overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)" }}>
        <div className="carousel-track space-y-3 pr-1">
          {list.map((s, i) => {
            const isOn = active === s.id;
            return (
              <div key={s.id + i} className={`rounded-xl p-2 transition ${isOn ? "ring-2 ring-blue-600 bg-blue-50/50" : "bg-white"}`}>
                <Mini s={s} />
                <div className="flex items-center justify-between mt-1.5 px-0.5">
                  <div>
                    <p className="text-[11px] font-semibold leading-tight">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.vibe}</p>
                  </div>
                  <button
                    onClick={() => { setPicked(s.id); onPick(s.template, s.accent); }}
                    className={`text-[10px] font-bold rounded-full px-2.5 py-1 cursor-pointer transition ${
                      isOn ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600"
                    }`}>
                    {isOn ? <span className="inline-flex items-center gap-0.5"><Check size={9} /> Chosen</span> : "Use this style"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
