// One-time: seed showcase tenants with real dummy content + fal-generated images.
// Run: node --env-file=.env.local scripts/seed-showcase.mjs
import pg from "pg";

const FAL = process.env.FAL_KEY;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function commonsImage(term) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap%20${encodeURIComponent(term)}&gsrlimit=3&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json`;
  const d = await (await fetch(api, { headers: { "User-Agent": "JhalakSeed/1.0" } })).json();
  const pages = Object.values(d?.query?.pages || {});
  for (const pg of pages) {
    const url = pg?.imageinfo?.[0]?.thumburl;
    if (!url) continue;
    const img = await fetch(url);
    if (!img.ok) continue;
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 20000) continue; // skip tiny thumbs
    const mime = img.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const r = await db.query("insert into jhalak.media (mime, bytes) values ($1,$2) returning id", [mime, buf]);
    return `/api/media/${r.rows[0].id}`;
  }
  throw new Error("no commons image for: " + term);
}

const SITES = [
  {
    slug: "dr-mehta-clinic", name: "Dr. Mehta Family Clinic", category: "clinic", city: "Mumbai",
    phone: "9820011223", template: "professional", accent: "blue", font: "sans",
    content: {
      headline: "Care That Treats You Like Family",
      tagline: "Trusted general practice in Andheri — same-day appointments, honest advice, 25 years of experience.",
      about: "Dr. Anil Mehta has served Andheri families for over two decades. From routine check-ups to chronic care management, our clinic combines experienced diagnosis with genuine attention — you are never just a token number here.",
      services: [
        { title: "General Consultation", desc: "Thorough check-ups with time to actually talk — mornings and evenings, six days a week." },
        { title: "Diabetes & BP Care", desc: "Structured chronic-care plans with regular monitoring and diet guidance." },
        { title: "Child Health", desc: "Vaccinations, growth tracking and gentle paediatric care parents trust." },
      ],
      cta_label: "Book an Appointment",
      pages: { pricing: "Consultation — ₹500\n\nFollow-up visit (within 7 days) — ₹300\n\nHome visit (Andheri) — ₹1,200\n\nVaccination charges as per vaccine — ask on WhatsApp." },
    },
    products: [
      { title: "Consultation Room", category: "Facilities", desc: "Private, calm consultation room designed for unhurried conversations.", search: "doctor consultation room clinic", img: "Clean modern doctor consultation room in an Indian family clinic, warm daylight, tidy desk with stethoscope, examination bed, plants, professional interior photography" },
      { title: "Reception & Waiting", category: "Facilities", desc: "Comfortable waiting area with quick token flow — average wait under 15 minutes.", search: "clinic reception waiting room", img: "Bright welcoming small clinic reception and waiting area in India, comfortable chairs, front desk, soft blue accents, professional interior photography" },
      { title: "Vaccination Corner", category: "Services", desc: "Child-friendly vaccination corner with full cold-chain storage.", search: "vaccination clinic", img: "Cheerful paediatric vaccination corner in a small Indian clinic, colorful child-friendly decor, medical refrigerator, clean bright professional photo" },
    ],
  },
  {
    slug: "kora-cafe", name: "Kora Café", category: "restaurant", city: "Bengaluru",
    phone: "9845098450", template: "minimal", accent: "stone", font: "sans",
    content: {
      headline: "Slow Coffee. Quiet Corners.",
      tagline: "Specialty coffee, fresh bakes and unhurried mornings in Indiranagar.",
      about: "Kora is a small café with a simple idea — good coffee takes time, and so do good conversations. We roast in small batches, bake every morning, and keep the music low enough to think.",
      services: [
        { title: "Specialty Coffee", desc: "Single-origin pour-overs, classic espresso and our house cold brew." },
        { title: "Fresh Bakes", desc: "Croissants, banana bread and seasonal tarts — baked in-house every morning." },
        { title: "Workspace Friendly", desc: "Fast Wi-Fi, plug points at every table, and bottomless filter coffee on weekdays." },
      ],
      cta_label: "Find Us",
      pages: { pricing: "Espresso — ₹160\n\nPour-over (single origin) — ₹280\n\nCold brew — ₹220\n\nCroissant — ₹180 · Banana bread — ₹150\n\nWeekday workspace bundle (coffee + bake) — ₹300" },
    },
    products: [
      { title: "House Pour-Over", category: "Coffee", desc: "Single-origin Chikmagalur beans, brewed to order.", search: "coffee cup cafe", img: "Beautiful pour-over coffee being brewed in a minimal aesthetic cafe, ceramic dripper, soft morning light, shallow depth of field, specialty coffee photography" },
      { title: "Morning Bakes", category: "Bakery", desc: "Croissants and banana bread, fresh from the oven at 8am.", search: "croissant", img: "Fresh croissants and banana bread on a wooden board in a minimal cafe, morning light, artisan bakery photography, warm neutral tones" },
      { title: "The Quiet Corner", category: "Space", desc: "Our favourite window table — plug points, plants and peace.", search: "coffee shop interior", img: "Cozy minimal cafe corner with window seat, plants, laptop-friendly wooden table, soft natural light, calm neutral interior photography" },
    ],
  },
];

async function main() {
  await db.connect();
  for (const site of SITES) {
    const exists = await db.query("select id from jhalak.businesses where slug=$1", [site.slug]);
    let bizId;
    if (exists.rows.length) {
      bizId = exists.rows[0].id;
      console.log(site.slug, "exists — refreshing content");
    } else {
      const r = await db.query(
        `insert into jhalak.businesses (slug,name,category,city,phone,whatsapp,language,template,status)
         values ($1,$2,$3,$4,$5,$5,'english',$6,'published') returning id`,
        [site.slug, site.name, site.category, site.city, site.phone, site.template]
      );
      bizId = r.rows[0].id;
      await db.query("insert into jhalak.quotas (business_id) values ($1) on conflict do nothing", [bizId]);
    }
    const content = {
      ...site.content,
      accent: site.accent, font: site.font,
      tabs_config: [
        { key: "products", label: site.category === "restaurant" ? "Menu Highlights" : "Our Facilities", enabled: true, builtin: true, text: false },
        { key: "about", label: "About Us", enabled: true, builtin: true, text: false },
        { key: "gallery", label: "Gallery", enabled: true, builtin: true, text: false },
        { key: "contact", label: "Contact", enabled: true, builtin: true, text: false },
        { key: "pricing", label: site.category === "restaurant" ? "Menu & Prices" : "Fees", enabled: true, builtin: true, text: true },
      ],
    };
    await db.query(
      `insert into jhalak.site_content (business_id, content) values ($1,$2)
       on conflict (business_id) do update set content=$2, updated_at=now()`,
      [bizId, JSON.stringify(content)]
    );
    const prodCount = await db.query("select count(*)::int as n from jhalak.products where business_id=$1", [bizId]);
    if (prodCount.rows[0].n === 0) {
      for (const p of site.products) {
        process.stdout.write(`  generating: ${p.title}… `);
        const url = await commonsImage(p.search);
        await db.query(
          `insert into jhalak.products (business_id, title, description, category, original_url, processed_url, status, visible)
           values ($1,$2,$3,$4,$5,$5,'ready',true)`,
          [bizId, p.title, p.desc, p.category, url]
        );
        console.log("ok");
      }
    }
    console.log("✓", site.slug);
  }
  await db.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
