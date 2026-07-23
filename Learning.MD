# Learning.MD — bugs, root causes, prevention

## 2026-07-22 — "Unexpected token '<', <!DOCTYPE ... is not valid JSON" (prod, user-reported)
- **Symptom:** Wizard/admin surfaces a raw JSON parse error instead of a friendly message.
- **Why 1:** A client `fetch(...).json()` received an HTML page, not JSON.
- **Why 2:** Some API route returned Next's HTML error page (500/404) — the GET handlers
  for photos/reels/leads and DELETE product had **no try/catch**, so any thrown error
  became HTML instead of a JSON `{error}`.
- **Why 3:** The most likely thrower: pg Pool over the **Supabase transaction pooler** —
  pgbouncer kills idle connections; pg hands out a dead client → query throws
  ("Connection terminated unexpectedly") on the next poll cycle.
- **Why 4 (deepest, type = process):** The build shipped without an FMEA pass —
  `unhandled_error_paths` + `external_dependency_failures` were never walked, and the
  client had no defensive JSON parsing because polling was assumed happy-path.
- **Action:** (a) all route handlers wrapped to always return JSON; (b) shared
  `fetchJson` client helper that never throws raw parse errors and retries politely;
  (c) pg pool hardened for pgbouncer (keepAlive, shorter idle timeout, one retry on
  connection errors); targets Why 2/3.
- **Preventive (class-level):** power-coding installed 2026-07-22 — pre-commit light FMEA
  + secret scan now run on every checkpoint; `unhandled_error_paths` is a mandatory
  category, so any new route without a JSON error envelope gets flagged before commit.

## 2026-07-22 — All local PixelBin tokens revoked (build-time discovery)
- **Symptom:** 401 on assets AND predictions with previously-verified scripts/tokens.
- **Deepest why (knowledge-gap):** external credentials rot; memory said "verified
  May–June" but tokens were rotated upstream.
- **Preventive:** provider abstraction with graceful OFF mode; never hard-depend on a
  single media provider; verify credentials at session start before promising features.

## 2026-07-22 — fal polish "fetch failed" only inside the dev server (local)
- **Symptom:** fal.ai calls worked in plain shell node but failed with "fetch failed" inside the Next dev server; polish silently fell back to originals.
- **Why (deepest, knowledge-gap):** corp MITM proxy — "unable to get local issuer certificate". The interactive shell inherits the CA-bundle env from the user's zsh profile; the preview-server process does not.
- **Action:** added `NODE_EXTRA_CA_CERTS` + `SSL_CERT_FILE` (system-ca-bundle.pem) to the jhalak-dev entry in the global launch.json; improved mediaai error logging to print `e.cause`.
- **Preventive:** any NEW local process that makes TLS calls (dev servers, workers, cron) must carry the CA-bundle env vars — this is a machine-wide constraint (see corp-proxy-tls-fix memory). Render/prod is unaffected (no MITM proxy).

## 2026-07-23 — FAL_KEY went invalid mid-session
- **Symptom:** nano-banana/edit + all fal endpoints → 401 "invalid key credentials"; same key worked 2h earlier (reels generated on prod).
- **Deepest why (knowledge-gap):** external credential rotated/expired outside our control; second occurrence of credential rot this project (PixelBin earlier).
- **Action:** showcase seeding switched to Wikimedia Commons images; polish/reels degrade gracefully until a fresh FAL_KEY is set in .env.local AND Render env.
- **Preventive:** provider() could be extended with a startup key-validity probe + admin banner ("AI provider key invalid") instead of silent per-job failures.

## 2026-07-23 — prod 502 after showcase-carousel deploy (server_failed)
- **Symptom:** deploy succeeded then instance restarted and crash-looped; site 502 ~15 min.
- **Why-chain:** carousel duplicated its list for the scroll loop → 8 live iframes on /start → 8 simultaneous SSR tenant-page loads + ~30 bytea media queries → memory spike on the 512MB starter instance → restart → restarted instance failed port scan.
- **Action:** live iframes only in the first carousel copy; loop copy renders placeholders. Recovered on redeploy.
- **Preventive (class):** any N× duplication of components that trigger server work must budget the server cost, not just the DOM cost; before real launch either move media to CDN/object storage or bump the plan to 2GB (both already in Pending).

## 2026-07-23 — new DB column (gens_used) missing at runtime despite being in bootstrap SQL
- **Symptom:** import imagery silently produced no images; `reserveGeneration` threw "column gens_used does not exist" even though the `alter table … add column if not exists gens_used` was in db.ts's BOOTSTRAP_SQL.
- **Why 1:** `ensureSchema()` memoizes its promise on `global._jhalakSchemaReady` and runs BOOTSTRAP_SQL exactly once per process.
- **Why 2:** the long-running dev server (pid from a PRIOR session, still bound to :3444) had cached a RESOLVED ensureSchema from before gens_used was added; my new `next dev` hit EADDRINUSE and I unknowingly tested against the stale server.
- **Why 3 (deepest, type = process):** schema evolution assumed "edit BOOTSTRAP_SQL → new column appears", but a memoized bootstrap only re-runs on a fresh process. Prod is safe (deploy = restart), local dev is not.
- **Action:** killed the stale server, restarted → ensureSchema re-ran → column created. Verified via information_schema.
- **Preventive (class):** after adding any `alter table … add column`, RESTART the dev server (don't trust HMR) and verify the column via information_schema before testing the feature. When a local test behaves as if code changes didn't apply, check for a stale server on the port (lsof -iTCP:PORT) FIRST.

## 2026-07-23 — flux/schnell bakes garbled text into product images
- **Symptom:** a generated "Spare Parts & Consumables" catalogue image rendered gibberish text ("Sparle Parts & Consumhitts") baked into the picture.
- **Deepest why (knowledge-gap):** flux/schnell is a distilled model with weak negative-prompt handling; a plain "no text" is often ignored, especially when the title implies labels/packaging.
- **Action:** strengthened the NO_TEXT constraint to be blunt and repetitive (no letters/words/numbers/labels/signage). Owners can also regenerate any image from Studio (F4 regenerate_image).
- **Preventive:** for t2i product/hero images, always frame as an unbranded photograph; if text artifacts persist on a model, fall back to nano-banana (better text suppression) via FAL_T2I_MODEL.

## 2026-07-23 — v6 FMEA batch: SSRF, OOM, and budget-leak in the new import flow (pre-deploy)
- **Symptom:** an adversarial FMEA of the v6 diff confirmed 13 findings, incl. 2 P0s introduced by the URL-import feature.
- **Why 1 (SSRF, deepest = design):** a NEW route (/api/import) let any self-serve user make the server fetch an arbitrary URL and reflected the body back — moving a fetch that was previously owner-gated (in the reference route) into an any-user route dropped the trust barrier, and no SSRF guard existed. → fetch of user-supplied URLs on cloud infra reaches the metadata IP / internal services.
- **Why 2 (OOM, deepest = process):** the URL fetch used `await r.text()` with no byte cap while the SIBLING upload paths in the same feature already cap bytes (MAX_DOC_BYTES/MAX_FILE_BYTES) — the new ingest path wasn't held to the existing invariant.
- **Why 3 (budget leak, code):** reserve-before-call incremented gens_used but never released on provider failure, so a fal outage could burn the whole allowance for zero images.
- **Action:** DNS/IP allow-guard + streamed byte cap + per-redirect-hop revalidation in reference.ts; releaseGeneration() refund on failed gen; /apply wrapped in a transaction; gallery/inline-edit/discount-badge visitor-facing fixes.
- **Preventive (class):** (a) ANY server-side fetch of a user-supplied URL MUST pass an IP/DNS private-range guard and must not reflect the raw body; (b) EVERY new ingest path (url/upload/paste) inherits the same byte cap as existing ones — grep the sibling paths for the invariant before shipping a new one; (c) reserve-before-spend always needs a release-on-failure. Run the FMEA on new external-fetch/ingest features BEFORE deploy, not after.
