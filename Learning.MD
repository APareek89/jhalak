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
