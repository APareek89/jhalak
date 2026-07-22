# Jhalak — Handoff (session continuity)

> Magic phrase for a fresh session: **"Refer to Handoff.MD in /Users/anandpareek/Documents/Projects/jhalak and begin"**
> Session rules: update this file before every checkpoint commit & at phase end (snapshot,
> not journal); re-stamp `last-synced`; over ~40 lines → collapse ✅ into one "Shipped:" line.

last-synced: f667339

## Current state
- ✅ Shipped (2026-07-22): first cut live at https://jhalak-p178.onrender.com — wizard,
  AI site copy + vision catalogue copy (Claude sonnet-4-6), multi-tenant sites
  (elegant/bold), admin panel, leads, Postgres-served media, provider-gated reels (OFF).
  Repo APareek89/jhalak (private) · Render srv-d9g8bsernols73a9m9s0 (Singapore, starter,
  auto-deploy on push) · Supabase Mumbai schema `jhalak` (creds from blindspot .env).
- Demo tenants: /s/meera-boutique (elegant) · /s/glow-grace-salon (bold).
- ✅ v2 (2026-07-22 pm): catalogue commerce fields · tenant tabs + Our Products (category chips, discount badges, detail modal) + gallery · reference URL/PDF ingestion · Studio chat editor (/studio/[id], Claude tool-loop). 4-tab landing (Home/Website/Catalogue Manager/Social Media Marketing).
  (Home / Website / Catalogue Manager / Social Media Marketing).

## Pending
1. **Phase 2 — real social posting APIs** (Instagram Graph, Facebook Pages, X API): today the reel share row uses share-links/deep-links only (WhatsApp/FB/X share URLs, IG opens app — user downloads then uploads). Owner decided integration is Phase 2.
2. Phase 2 — dedicated STT model for voice input (today: browser Web Speech API, en-IN/hi-IN).
3. Offer the Loop (Loop.MD status: waiting_for_first_draft; make the 2c offer).
4. Media at scale: move bytea → object storage/CDN before real launch.
5. Email verification + password reset for auth (MVP has none).
6. Demo tenants remain ownerless (open admin) for the feedback link — claim/lock before real launch.

## Decisions
- 2026-07-22 — No checkout/payments in v1; enquiry-first (WhatsApp/call/lead form) — owner.
- 2026-07-22 — Verticals: retail + local services; D2C deferred to Phase 2 — owner.
- 2026-07-22 — No /admin auth in first cut — owner ("except for sign up or sign in feature build everything").
- 2026-07-22 — Media stored as bytea in Postgres served via /api/media (PixelBin storage dead; zero extra creds) — agent, ⚠️ revisit at scale.
- 2026-07-22 — Provider abstraction fal→pixelbin→off for AI media; ships OFF — agent.
- 2026-07-22 — power-coding installed; git checkpoints = auto ⚠️ unconfirmed; FMEA = pre-commit + smart-suggest ⚠️ unconfirmed.

## Environment
- Node 22 via nvm: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"`
- Local dev: preview server "jhalak-dev" on :3444 (global launch.json) · `.env.local` (gitignored)
- Deploy: push to main → Render auto-deploys (~2 min). Smoke: /api/health.
