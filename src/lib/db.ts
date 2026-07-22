import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _jhalakPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _jhalakSchemaReady: Promise<void> | undefined;
}

export function getPool(): Pool {
  if (!global._jhalakPool) {
    global._jhalakPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global._jhalakPool;
}

const BOOTSTRAP_SQL = `
create schema if not exists jhalak;

create table if not exists jhalak.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'boutique',
  city text default '',
  phone text default '',
  whatsapp text default '',
  language text not null default 'english',
  template text not null default 'elegant',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists jhalak.site_content (
  business_id uuid primary key references jhalak.businesses(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists jhalak.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references jhalak.businesses(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  tags text[] not null default '{}',
  price_text text not null default '',
  original_url text not null default '',
  processed_url text not null default '',
  status text not null default 'processing',
  error text not null default '',
  visible boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists jhalak.reels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references jhalak.businesses(id) on delete cascade,
  product_id uuid references jhalak.products(id) on delete set null,
  variant text not null default 'showcase',
  prompt text not null default '',
  video_url text not null default '',
  status text not null default 'generating',
  error text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists jhalak.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references jhalak.businesses(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  message text not null default '',
  source text not null default 'website',
  created_at timestamptz not null default now()
);

create table if not exists jhalak.quotas (
  business_id uuid primary key references jhalak.businesses(id) on delete cascade,
  reel_packs_used int not null default 0,
  photos_used int not null default 0
);

create table if not exists jhalak.media (
  id uuid primary key default gen_random_uuid(),
  mime text not null default 'image/jpeg',
  bytes bytea not null,
  created_at timestamptz not null default now()
);
`;

export function ensureSchema(): Promise<void> {
  if (!global._jhalakSchemaReady) {
    global._jhalakSchemaReady = getPool()
      .query(BOOTSTRAP_SQL)
      .then(() => {})
      .catch((e) => {
        global._jhalakSchemaReady = undefined;
        throw e;
      });
  }
  return global._jhalakSchemaReady;
}

export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const r = await getPool().query(text, params as never[]);
  return r.rows as T[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "business";
}
