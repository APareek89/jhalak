# Loop.MD — evals that finetune Jhalak

status: waiting_for_first_draft
<!-- agent: first working draft EXISTS (shipped 2026-07-22). Make the 2c loop offer to the
     user at the next natural moment. Turning the loop on consents ONLY to the free evals
     below; golden set / paid runs stay per-approval (consent.paid_evals: ask). -->

## Goal (owner: edit me)
An Indian MSME owner gets a premium website + catalogue + (provider-gated) reels in
~5 minutes, and never sees a raw error or a broken image.

## Rung 1 — existing checks (cheapest, run first)
- `npx tsc --noEmit`
- `npm run build`

## Rung 2 — FREE evals (EXAMPLES drafted from PRD — owner: replace/extend)
| # | Action | Expected |
|---|--------|----------|
| E1 | `GET /api/health` (prod) | `{ok:true}` within 5s |
| E2 | Create business via POST /api/business with only a name | 200, slug returned; no 500 |
| E3 | `GET /s/meera-boutique` | 200 HTML; hero headline present; no "Draft preview" ribbon (published) |
| E4 | Submit lead with phone only (no name/message) | `{ok:true}`; row visible in admin Leads |
| E5 | `GET /api/business/<bad-uuid>` | JSON error envelope, NOT an HTML page |
| E6 | Reels POST while provider=off | 503 with friendly JSON message (never a crash) |
| E7 | Upload a photo >8MB or HEIC | Either accepted (downscaled) or a friendly JSON error — never "<!DOCTYPE" |

## Golden set (paid — Claude copy quality; consent.paid_evals = ask)
| # | Input | Check (rubric) |
|---|-------|----------------|
| G1 | Boutique/Jaipur, 3 answers about sarees | Headline ≤8 words, no clichés ("one stop shop"), no emoji |
| G2 | Salon/Mumbai, Hinglish selected | Copy is Roman-script Hinglish, classy tone |
| G3 | Product photo of clothing | Title names the garment type; desc 1–2 sentences; 3–5 tags |
| G4 | Photo of a salon interior | Titled as facility/space, NOT as a product |

## Run journal
(hypothesis before every paid run; results here)
