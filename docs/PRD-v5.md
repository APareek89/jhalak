# Jhalak v5 — PRD (planned 2026-07-23 via product-planner skill; build target: next round)

## 1. Problem & JTBD
**Job story:** *When a customer asks "aapki website hai?", I want a premium online presence with my real products on it — without designing, typing much, or hiring anyone — so my business looks as serious as it is and enquiries come to my WhatsApp.*
**Outcome moved:** time-to-credible-presence (target: <10 min from signup to shareable link, catalogue included). **Success in their words:** "maine link bheja aur customer ne kaha 'wah, professional hai'."

## 2. Personas
- **P1 "Meera" (fresh):** boutique owner, 38, Jaipur. Android phone only. Never designed anything; won't read docs; types slowly (prefers speaking, Hinglish). Photos live in her camera roll and WhatsApp.
- **P2 "Rajesh" (has a website):** clinic owner, 45. Has an outdated 2019 site a nephew built. Wants it *replaced/enhanced*, not rebuilt from scratch — his info already exists, don't make him retype it. Desktop at reception + phone.
- **Secondary "the visitor":** Meera's customer on Instagram/WhatsApp. Mobile. Wants: see products, price, and one-tap enquiry. Highest stakes, zero patience.

## 3. Journeys (numbered; pains ⇒ opportunities)
**J1 Fresh build (Meera):** 1 land → 2 signup → 3 basics (voice) → 4 style+logo → 5 pages → 6 story → 7 **catalogue** → 8 studio preview/refine → 9 publish → 10 share on WhatsApp.
Pains: shell feels unbranded/empty (⇒ **O1: real app shell + nav**, the UI options); can't see what she's building until step 8 (⇒ **O2: live preview during wizard** — option C); photos step feels like a form, not a catalogue (⇒ **O3: catalogue parity in wizard**).
**J2 Has-a-website (Rajesh):** 1 land → 2 "**I already have a website**" → 3 paste URL → 4 AI imports (structure, copy facts, contact, images list) → 5 shows side-by-side "your old site → your new site" draft → 6 he corrects in Studio → 7 publish (old→new).
Pains: today the URL is buried as "reference" in step 3 and only tones the copy (⇒ **O4: first-class replicate/enhance fork at entry**, import drafts the whole site + seeds catalogue candidates from his images).
**J3 Catalogue-first:** owner just wants a WhatsApp-shareable catalogue, website later (⇒ **O5: catalogue usable standalone**; site is one toggle away).
**J4 Return visit:** update price, add product, post a reel — in <2 min from phone (⇒ **O6: dashboard land = quick actions**, not stats).
**J5 Visitor:** IG bio link → products → filter category → item detail → WhatsApp enquire. Pains: no search/sort/filter as catalogue grows; modal detail not shareable (⇒ **O7: full catalogue table-stakes**, below).

## 4. Features (v1 next round / ~should / deferred) — appetite: ~2 build days
- **F1 (O1) App shell** — chosen from ui-options.html (A–E). Navbar/sidebar on every authed page incl. wizard. **v1**
- **F2 (O2) Live preview in wizard** — phone-frame preview updating per step (option C pattern), collapsible on mobile. **v1 if shell C/B chosen; else ~**
- **F3 (O4) Entry fork** — /start step 0: "Start fresh" | "I already have a website" (URL → import: structure, copy, contact, image candidates → pre-filled wizard + diff-style Studio). **v1** (import of images ~; text+structure v1)
- **F4 (O3/O5/O7) Catalogue v3 — full table-stakes** (category-library check): own tab everywhere ✅have · category chips ✅have · image+title+price ✅have · discount ✅have · **search ❌build** · **sort (newest/price) ❌build** · **filter=every shown attribute ❌build** · **per-item detail ROUTE /s/slug/p/[id] (shareable, replaces modal-only) ❌build** · **multi-image per product ❌build** · **stock/availability toggle ❌build** · empty state ✅have · description ✅have. Same component in wizard step & dashboard (one code path). Bulk: multi-upload ✅have + **~CSV/paste import**. *(Skill rule: these are all-or-nothing — no cherry-picking.)*
- **F5 (O6) Dashboard land** — quick-action tiles (Add product · New reel · Edit site · Share link) above stats. **~**
- **Deferred:** variations (size/colour) — commerce-heavy, Phase 2 with payments; ratings/reviews — needs real traffic; social API posting — already Phase 2; multi-business switcher — until >1 real user asks.

## 5. IA / entity→surface
| Entity | # | Action | Surface |
|---|---|---|---|
| Product | many | browse/manage/share | Catalogue tab (admin) + /products + **/p/[id] detail route** (new) |
| Product image | several per product | add/reorder | gallery strip on product card (new) |
| Imported site | 1 | review/correct | import-review screen → Studio (new) |
| Reel/post | many | generate/share | Reels tab ✅ |
| Lead | many | reply | Leads tab ✅ |
| Site config | 1 | edit | Website tab + Studio ✅ |

## 6. Key flow breadboards
**Entry fork:** [Landing] —Create→ [Start step 0] {btn Start fresh → wizard-1; btn I have a website → field URL, btn Import} → [Import review: cards Business info / Pages found / Copy draft / Image candidates(select)] —Looks right→ [wizard-2 style, prefilled] … → [Studio].
**Catalogue manager (shared wizard+dashboard):** [Catalogue] {search field · sort dd · category chips · btn Add photos · btn ~CSV} → per card {img gallery(+add) · name · category · price · disc% · stock sw · visible sw · btn Save · btn Reel} → [Detail route preview].

## 7. Interaction/revision
Import: entry(URL)→processing("reading your site…", ~20s, streamed findings)→output=**review screen with per-section accept/edit** (never silently overwrite)→lands in Studio (persistent revision, existing). All dynamic surfaces keep empty/loading/error states; search/filter get "no matches — clear filters".

## 8. Acceptance (samples)
- Given URL import fails/blocked ⇒ friendly error + "start fresh instead" path (never dead-end).
- Given >8 products ⇒ search+sort visible; filtering by any displayed attribute possible.
- Given product detail link shared to WhatsApp ⇒ opens standalone page with image gallery, price+discount, enquire CTA.
- Given wizard on 375px ⇒ preview collapses; all steps completable.

## 9. Must-never-break
Visitor never sees broken image/raw error (existing envelopes) · leads never lost · import never publishes without owner review · media caps hold (12 photos/2 packs) · owner-gating on all manage APIs.

## 10. Accepted risks
Import quality varies by source site (review screen is the guardrail) · Web Speech unsupported on some browsers (button hides) · demo tenants stay open until feedback round ends.

## 11. Scale assumptions
Tens of businesses, ≤50 products each (client-side search/filter OK; revisit server-side at 200+) · bytea media until real launch.

## 12. Open questions (for Anand tomorrow)
1. **Which UI direction** (A–E or mix) from /ui-options.html?
2. Import scope v1: text+structure only, or also pull images from the old site?
3. Catalogue standalone mode (J3) in this round or next?
