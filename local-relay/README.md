# Local relay (Home Assistant + hotspot redirector)

Two problems, one box:

1. **UniFi guest network authorization only works from inside the LAN** (verified live — see `../lib/unifi.ts`). Home Assistant running locally, with the `ha-unifi-insights` HACS integration, is the fix.
2. **The UDR7's hotspot config only accepts an IPv4 address** for the external portal server, not a domain. A tiny plain-HTTP redirector on the same local box, at a static local IP, solves this — it just bounces guests to the real `https://wifi.basekc.com` URL.

Both run here as two Docker containers on whatever always-on device you use (Raspberry Pi, mini PC, old laptop — anything that can stay on and run Docker).

## What's ready now

- `docker-compose.yml` — runs Home Assistant (Container install) and the redirector together.
- `Caddyfile` — the redirector's entire config (3 lines: redirect everything to `wifi.basekc.com`, preserving path and query string).
- `homeassistant-automation-example.yaml` — the automation that turns an incoming webhook into a UniFi guest-authorization call.

## What you'll still need to do once you have the device

1. Install Docker (e.g. `curl -fsSL https://get.docker.com | sh` on Raspberry Pi OS/Debian).
2. Copy this `local-relay/` folder onto the device.
3. `docker compose up -d`
4. In the UniFi controller: give the device a **DHCP reservation** (a fixed local IP) — e.g. via Settings > Networks > your LAN > DHCP reservations, keyed to the device's MAC.
5. Add that same local IP to the UDR7's **pre-authorization allowlist** ("walled garden") so unauthenticated guest devices can actually reach it — same requirement as for `wifi.basekc.com` itself.
6. In the UDR7's Hotspot config, set the external server host to that local IP (port 80, not HTTPS — the redirector only speaks plain HTTP on purpose).
7. Open `http://<device-ip>:8123` and finish Home Assistant's first-run setup.
8. Install [HACS](https://hacs.xyz/) in Home Assistant, then install `ha-unifi-insights` through it.
9. Create a **local** user on the UDR7 console for Home Assistant to authenticate with (cloud/SSO users don't work for this integration) and configure the integration with it.
10. Create the automation from `homeassistant-automation-example.yaml` (Settings > Automations > Edit in YAML), filling in a real random `webhook_id` and your UniFi `site_id`.
11. Expose that webhook to the internet — either turn on Nabu Casa (paid, simplest), or self-host a tunnel (Cloudflare Tunnel, Tailscale Funnel) pointed at Home Assistant.
12. Set `HOME_ASSISTANT_WEBHOOK_URL` (and optionally `HOME_ASSISTANT_WEBHOOK_SECRET`) in the main app's Vercel environment variables, pointed at that public webhook URL, then redeploy (see the main README — env var changes need a new deployment).

Steps 4–11 are UniFi/Home Assistant UI actions that can't be pre-scripted from outside — happy to walk through any of them live once the device exists.
