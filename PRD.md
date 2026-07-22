# Jhalak — Product Brief (v1 first cut)

> ⚠️ Drafted by the agent from the 2026-07-22 design conversation; review and edit.

## What we're building
A "Shopify super-light" for Indian MSMEs: a business owner gets a **premium website,
an AI-polished catalogue, and Instagram reels** in ~5 minutes from phone photos and
three plain-language questions. Outputs, not tools — the owner never designs anything.

## Who uses it
Relationship-led Indian small businesses (boutiques, salons, clinics, gyms, restaurants).
The website is their *statement of being modern* plus a lead channel. Customers reach
them via **WhatsApp/call/enquiry** — no cart, no checkout in v1 (D2C is Phase 2).
Non-technical, mobile-first users; Hinglish matters.

## The three engines
1. **Website** — 2 templates (Elegant/Bold), AI-written copy from 3 questions,
   multi-tenant at `/s/{slug}`, lead form + WhatsApp CTAs everywhere.
2. **Catalogue Manager (Look Pro)** — phone photos in → (provider-gated) AI-polished
   shots + Claude-vision titles/descriptions out; feeds the website.
3. **Social Media Marketing (Reel studio)** — pick a catalogue item → 2 Instagram-ready
   9:16 reels (provider-gated: fal.ai or PixelBin; OFF until a key is added).

## Must NEVER break (money / data / trust)
- A published site must never show broken images or raw errors to a *visitor*.
- Leads must never be lost once submitted (that's the owner's money).
- Media generation must never run unbounded (cost caps: 12 photos, 2 reel packs per business).
- The owner's phone number routes to WhatsApp correctly (91 prefix).

## Done for v1 (first cut — shipped 2026-07-22)
Wizard → live site → catalogue with AI copy → leads inbox → admin panel, deployed on
Render (https://jhalak-p178.onrender.com), demo tenants meera-boutique & glow-grace-salon.

## Known accepted risks (owner-approved for preview)
- No auth on /admin (explicitly deferred by owner for first review).
- AI polish + reels ship provider-OFF (all PixelBin tokens revoked; no fal key yet).

## Scale assumption (preview)
Tens of businesses, small traffic. Postgres-served media is fine at this scale;
revisit (CDN/object storage) before real launch.
