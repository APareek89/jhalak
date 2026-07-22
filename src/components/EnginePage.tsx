import Link from "next/link";
import SiteNav from "./SiteNav";

export function EngineHero({
  kicker, title, lede, ctaLabel,
}: {
  kicker: string; title: string; lede: string; ctaLabel: string;
}) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-14 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-700 mb-5">{kicker}</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.12] tracking-tight max-w-3xl mx-auto">
        {title}
      </h1>
      <p className="mt-5 text-lg text-stone-600 max-w-2xl mx-auto">{lede}</p>
      <div className="mt-9">
        <Link
          href="/start"
          className="rounded-full bg-amber-700 text-white px-8 py-4 text-base font-semibold hover:bg-amber-800 transition shadow-lg shadow-amber-700/20"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export function StepStrip({ steps }: { steps: { n: string; t: string; d: string }[] }) {
  return (
    <section className="bg-white border-y border-stone-200">
      <div className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-8">
        {steps.map((s) => (
          <div key={s.n}>
            <div className="w-9 h-9 rounded-full bg-amber-700 text-white flex items-center justify-center font-semibold mb-4">
              {s.n}
            </div>
            <h3 className="font-semibold mb-1.5">{s.t}</h3>
            <p className="text-sm text-stone-600 leading-6">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeatureGrid({ items }: { items: { icon: string; t: string; d: string }[] }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-6">
      {items.map((f) => (
        <div key={f.t} className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="text-2xl mb-3">{f.icon}</div>
          <h3 className="font-semibold mb-1.5">{f.t}</h3>
          <p className="text-sm text-stone-600 leading-6">{f.d}</p>
        </div>
      ))}
    </section>
  );
}

export function DemoStrip() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-16 text-center">
      <p className="text-sm text-stone-500 mb-4">See it live — two demo businesses built with Jhalak:</p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href="/s/meera-boutique" target="_blank"
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium hover:border-amber-700 hover:text-amber-800 transition">
          Meera Boutique (Elegant) ↗
        </a>
        <a href="/s/glow-grace-salon" target="_blank"
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium hover:border-amber-700 hover:text-amber-800 transition">
          Glow &amp; Grace Salon (Bold) ↗
        </a>
      </div>
    </section>
  );
}

export function EngineShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>{children}</main>
      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-400">
        Jhalak — first cut preview
      </footer>
    </div>
  );
}
