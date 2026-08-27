# str-wifi-portal

A custom guest WiFi captive portal for short-term rentals on a UniFi network, built to replace UniFi's stock guest login. It:

- Verifies a guest's identity (last name + last 4 digits of the phone number on the reservation) against an active reservation in [Hospitable](https://hospitable.com) before granting network access. This is deliberately *not* a door/smart-lock code check — Hospitable's public API doesn't expose the generated smart-lock code at all (verified live against a real account; see `lib/hospitable.ts`).
- Records house-rules acceptance (signer name, email, timestamp, exact rules text shown) for Airbnb/VRBO dispute documentation. Each device/adult in a party can sign separately — it's an append-only log, not one row per reservation.
- Grants the guest's device network access via UniFi's guest-authorization API.
- Supports properties with multiple units on separate SSIDs, where a whole-property booking can validate on any unit's network — see `config/property.json`.

Built with Next.js (App Router) on Vercel, and Supabase for storage.

## Using this for your own property

1. Fork/clone this repo.
2. Edit `config/property.json` with your own unit IDs, SSID names, and Hospitable listing IDs. If your property is a single unit, keep just one entry in `units` and drop `wholePropertyListingIds`.
3. Edit `content/house-rules.ts` with your real house rules text, and bump `rulesVersion` whenever the text changes.
4. Copy `.env.example` to `.env.local` and fill in your Supabase, Hospitable, and UniFi credentials (see below). Never commit `.env.local` or any real secret.
5. Apply the migrations in `supabase/migrations/` (or recreate their end state — `house_rules_acceptances` and `auth_attempts`) to your own Supabase project.
6. Deploy to Vercel, set the same env vars there, and point your UDR7's external-portal setting at the deployed URL for each unit's SSID (see below).
7. Confirm the deployed domain is reachable from the UniFi captive-portal "walled garden" (the small unauthenticated-reachable allowlist) — this may need extra UniFi config beyond the app itself.

## UniFi setup notes

- Configure the external captive portal on **every** guest SSID, not just one.
- The redirect URL UniFi sends guests to includes `id` (guest MAC), `ap` (AP MAC), `ssid`, `t` (timestamp), and `url` (original destination) as query params — this app reads all of them.
- Guest network authorization has no SSID/network parameter in UniFi's API — it's MAC-address based only. Per-unit enforcement is done entirely in this app's own validation logic (see `app/api/authenticate/route.ts` and `lib/config.ts`), not by UniFi.
- `lib/unifi.ts` is flagged with a `VERIFICATION NEEDED` comment for the exact REST action name, which couldn't be confirmed from public docs (JS-rendered reference site). Verify against your own real API credentials and adjust — it's isolated to one function.
- `lib/hospitable.ts` matches guests by last name + last 4 digits of phone rather than a door code, and its comment documents why (verified live: no code field anywhere in the API, and Airbnb reservations have `guest.email = null`). If Hospitable adds code exposure to the public API later, `scripts/verify-hospitable.mjs` is a reusable script for re-checking the API shape.

## Environment variables

See `.env.example`. Required at runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HOSPITABLE_API_KEY`, `UNIFI_API_KEY`, `UNIFI_SITE_ID`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.

## Admin lookup

`/admin` (HTTP Basic Auth via `ADMIN_USERNAME`/`ADMIN_PASSWORD`) lets you search acceptance records by reservation code, name, or email — for dispute documentation.

## Development

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```
