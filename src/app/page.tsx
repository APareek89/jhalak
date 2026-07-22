import Link from "next/link";

const STEPS = [
  { n: "1", t: "Tell us about your business", d: "Name, city, and three simple questions. Hindi-English bhi chalega." },
  { n: "2", t: "Upload photos from your phone", d: "Our AI polishes them into professional catalogue shots — no photographer." },
  { n: "3", t: "Your website is live", d: "Premium website + WhatsApp enquiries + Instagram reels, ready in minutes." },
];

const ENGINES = [
  {
    t: "Premium website",
    d: "Elegant templates written for your business by AI — your statement that you are modern and serious. Enquiries come to WhatsApp.",
    icon: "🏛️",
  },
  {
    t: "Look Pro catalogue",
    d: "Phone photos go in, professional catalogue shots come out. Titles and descriptions written automatically.",
    icon: "✨",
  },
  {
    t: "Reel studio",
    d: "Pick any item from your catalogue and get Instagram-ready reels generated for you. Download and post.",
    icon: "🎬",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-display text-2xl font-semibold tracking-tight">Jhalak</span>
        <Link
          href="/start"
          className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-stone-700 transition"
        >
          Create your website
        </Link>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700 mb-6">
            For Indian small businesses
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.1] tracking-tight max-w-3xl mx-auto">
            Your business, beautifully online — in 5 minutes.
          </h1>
          <p className="mt-6 text-lg text-stone-600 max-w-2xl mx-auto">
            A premium website, a professional catalogue from your phone photos, and
            Instagram reels — made by AI, owned by you. No designer. No photographer.
            No agency.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/start"
              className="rounded-full bg-amber-700 text-white px-8 py-4 text-base font-semibold hover:bg-amber-800 transition shadow-lg shadow-amber-700/20"
            >
              Start free — 5 minute mein
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-400">No sign-up needed in this preview.</p>
        </section>

        <section className="bg-white border-y border-stone-200">
          <div className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-10">
            {ENGINES.map((e) => (
              <div key={e.t} className="text-center sm:text-left">
                <div className="text-3xl mb-4">{e.icon}</div>
                <h3 className="font-display text-xl font-semibold mb-2">{e.t}</h3>
                <p className="text-stone-600 text-sm leading-6">{e.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-display text-3xl font-semibold text-center mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white border border-stone-200 p-6">
                <div className="w-9 h-9 rounded-full bg-amber-700 text-white flex items-center justify-center font-semibold mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1.5">{s.t}</h3>
                <p className="text-sm text-stone-600 leading-6">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/start"
              className="rounded-full bg-stone-900 text-white px-8 py-4 text-base font-semibold hover:bg-stone-700 transition"
            >
              Create your website now
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-400">
        Jhalak — first cut preview
      </footer>
    </div>
  );
}
