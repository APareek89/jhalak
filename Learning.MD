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
