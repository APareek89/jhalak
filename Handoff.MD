# Jhalak — Handoff (session continuity)

> Magic phrase for a fresh session: **"Refer to Handoff.MD in /Users/anandpareek/Documents/Projects/jhalak and begin"**
> Session rules: update this file before every checkpoint commit & at phase end (snapshot,
> not journal); re-stamp `last-synced`; over ~40 lines → collapse ✅ into one "Shipped:" line.

last-synced: c599267

## Current state
- ✅ Shipped v1–v5 (2026-07-22): live at https://jhalak-p178.onrender.com — signup/login +
  ownership gates, 5-step wizard (voice input), AI site copy + vision catalogue copy (Claude
  sonnet-4-6), multi-tenant `/s/{slug}` (4 templates), catalogue tabs + Our Products/Gallery,
  reference URL/PDF ingest, Studio chat editor, leads, admin, dark AppShell + showcase carousel,
  provider-gated reels. (see git log & Learning.MD.)
- ✅ Shipped v6 (2026-07-23) — the "build a real website" round:
  1. **Import-and-enhance** (star): `/start` entry fork (Start fresh | I already have a website)
     → paste URL → guarded fetch/web-research → Claude structured extraction (facts, product
     LIST, tabs, sections, copy) → **editable review screen** → creates business+content+products
     → **sequential, budget-capped fal imagery** → lands in Studio. Verified E2E on
     preformconveyor.com: 5 real product lines + generated hero & product images in <1 min.
  2. **Generated imagery everywhere** (mediaai.generateImage t2i flux/schnell; imagery.ts; budget
     `gens_used` cap 8/create via quota.reserve/releaseGeneration; strictly sequential = OOM-safe).
  3. **Rich sections[]** typed blocks (stats/industries/testimonials/certifications/cta_banner) —
     tenant.ts + s/[slug]/Sections.tsx, across all templates, toggleable/ordered.
  4. **Studio visual editing**: `?edit=1` inline text (EditBridge + /field merge endpoint) +
     section-scoped chat (chip) + assistant tools update_section/toggle_section/regenerate_image.
  5. **FMEA pass** (13 adversarially-verified findings fixed): P0 SSRF guard + P0 streamed
     byte-cap (reference.ts), P0 gallery broken-img, P1 inline-edit-loss/budget-refund/apply-txn/
     building-hang, P2 postMessage-origin/placeholder-scrub/discount-badge; mobile studio header.
- **Demo data (PROD DB):** `/s/preform-conveyor-445` = full v6 demo (owner: v6test+import@jhalak.test /
  test1234). `/s/preform-conveyor-systems` = original dry-run (I added sections+hero to it). One
  orphan-ish test biz b0be32bf. The acceptance demo should be a FRESH import from the phone.
- **FAL_KEY**: fresh full-access, verified live (t2i/edit/i2v) — local `.env.local` + Render.

## Pending
1. Known remaining P2s (non-blocking): a benign hydration warning on client pages; map raw
   Anthropic/fal provider errors → friendly owner copy; tighten fal per-image 6-min poll deadline
   for the import burst.
2. Phase 2 — real social posting APIs (IG Graph/FB/X); dedicated STT model.
3. Media at scale: move bytea → object storage/CDN before real launch (512MB starter).
4. Email verification + password reset (MVP has none). Demo tenants remain ownerless where noted.
5. Loop.MD status still `waiting_for_first_draft` — offer the loop (2c) when appropriate.

## Decisions
- 2026-07-23 — v6 content model is additive JSON: `content.sections[]` + `hero_image_url` +
  `business_type` on the existing site_content jsonb (no migration). Budget via new
  `quotas.gens_used` column — agent.
- 2026-07-23 — Import generates imagery (t2i) rather than scraping the old site's images; owner
  reviews the whole draft before any spend — agent (per v6 brief).
- 2026-07-23 — Server-side fetch of owner-supplied URLs is SSRF-guarded (DNS/IP private-range
  block + streamed byte cap + per-redirect revalidation); never reflect raw internal bodies — agent.
- 2026-07-22 — enquiry-first (no checkout) v1; media as Postgres bytea (revisit at scale);
  provider abstraction fal→pixelbin→off — owner/agent.

## Environment
- Node 22 via nvm: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"`
- Local dev: `.claude/launch.json` runs `next dev` on :3000 (harness cwd is a DIFFERENT project, so
  preview_start binds the wrong app — run jhalak dev via Bash on :3444 with the corp CA-bundle env:
  `NODE_EXTRA_CA_CERTS=/Users/anandpareek/Documents/SEO content Skill/scripts/system-ca-bundle.pem`).
  After adding a DB column, RESTART the dev server (ensureSchema memoizes per process — see Learning.MD).
- Deploy: push to main → Render auto-deploys (~2–4 min). Smoke: /api/health, /start (fork present).
- Session efficiency: 🎯 ~78% feature · 🔧 ~14% support (stale dev-server + cwd/preview mismatch) · 🔁 ~8% rework (placeholder-scrub missed services; mobile header).
