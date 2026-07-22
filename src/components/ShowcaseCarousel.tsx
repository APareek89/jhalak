"use client";

import { Check, ExternalLink } from "lucide-react";
import { useState } from "react";

type Sample = { slug: string; name: string; vibe: string; template: string; accent: string };

const SAMPLES: Sample[] = [
  { slug: "meera-boutique", name: "Meera Boutique", vibe: "Elegant · boutiques & designers", template: "elegant", accent: "emerald" },
  { slug: "dr-mehta-clinic", name: "Dr. Mehta Family Clinic", vibe: "Professional · clinics & services", template: "professional", accent: "blue" },
  { slug: "kora-cafe", name: "Kora Café", vibe: "Minimal · cafés & studios", template: "minimal", accent: "stone" },
  { slug: "glow-grace-salon", name: "Glow & Grace Salon", vibe: "Bold · salons & gyms", template: "bold", accent: "violet" },
];

/** Live mini preview of a real published Jhalak site (scaled iframe). */
function SiteMini({ slug }: { slug: string }) {
  return (
    <div className="relative w-full h-44 rounded-lg overflow-hidden border border-slate-200 bg-white">
      <iframe
        src={`/s/${slug}`}
        title={slug}
        loading="lazy"
        tabIndex={-1}
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{ width: "1100px", height: "760px", transform: "scale(0.253)" }}
      />
    </div>
  );
}

/** Auto-scrolling showcase of real pre-built sites; pick a style or open the full site. */
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
      <p className="field-label !mb-0.5">Sample websites</p>
      <p className="text-xs text-slate-400 mb-3">Real sites built with Jhalak — open one, or use its style.</p>
      <div className="relative flex-1 min-h-0 overflow-hidden"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 7%, black 93%, transparent)" }}>
        <div className="carousel-track space-y-4 pr-1">
          {list.map((s, i) => {
            const key = `${s.template}-${s.accent}`;
            const isOn = active === key;
            return (
              <div key={s.slug + i} className={`rounded-xl p-2 transition ${isOn ? "ring-2 ring-blue-600 bg-blue-50/50" : "bg-white"}`}>
                <SiteMini slug={s.slug} />
                <div className="flex items-center justify-between mt-2 px-0.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold leading-tight truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.vibe}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={`/s/${s.slug}`} target="_blank" title="Open the full website"
                      className="w-6 h-6 rounded-full border border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center transition">
                      <ExternalLink size={11} />
                    </a>
                    <button
                      onClick={() => { setPicked(key); onPick(s.template, s.accent); }}
                      className={`text-[10px] font-bold rounded-full px-2.5 py-1 cursor-pointer transition ${
                        isOn ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600"
                      }`}>
                      {isOn ? <span className="inline-flex items-center gap-0.5"><Check size={9} /> Chosen</span> : "Use this style"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
