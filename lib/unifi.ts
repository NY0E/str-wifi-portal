/**
 * Guest network authorization, via a Home Assistant webhook.
 *
 * A direct cloud path was tried and ruled out live: a UniFi Site Manager
 * API key can read the console's local Network Application API through the
 * `unifi.ui.com` proxy (confirmed working), but every write request
 * (POST/PUT — including the `authorize-guest` action itself) gets an
 * identical CloudFront 403 ("supports only cachable requests"). That's a
 * CDN-level GET/HEAD-only restriction on the whole proxy route, not an
 * endpoint-naming problem — checked several path variants, all blocked the
 * same way. The native Site Manager product (api.ui.com) has no guest/
 * client write endpoint of its own either. Guest authorization is only
 * reachable from *inside* the LAN.
 *
 * The plan: once Home Assistant is running on the same network as the
 * UDR7, install the `ha-unifi-insights` HACS integration with a local
 * console user (Ubiquiti cloud SSO users don't work for this), which
 * exposes a `unifi_insights.authorize_guest` service (site_id, client_id,
 * duration_minutes). Wire a webhook-triggered HA automation to call that
 * service, expose the webhook via Nabu Casa or a self-hosted tunnel
 * (Cloudflare Tunnel, Tailscale Funnel, etc.), and point
 * HOME_ASSISTANT_WEBHOOK_URL at it. This function is the one place that
 * needs to change once that exists.
 *
 * Also confirmed from docs: UniFi's authorize action takes no SSID/network
 * parameter. Per-unit SSID enforcement is NOT done here — it must already
 * have happened before this is called (see lib/config.ts + the
 * authenticate route), since UniFi has no way to scope the grant to one
 * SSID.
 */

function webhookUrl(): string {
  const url = process.env.HOME_ASSISTANT_WEBHOOK_URL;
  if (!url) {
    throw new Error(
      "HOME_ASSISTANT_WEBHOOK_URL must be set — guest authorization has no working path until the Home Assistant relay is set up. See lib/unifi.ts."
    );
  }
  return url;
}

export async function authorizeGuest({
  mac,
  apMac,
  minutes,
}: {
  mac: string;
  apMac?: string | null;
  /** Session length in minutes; omit for the automation's default. */
  minutes?: number;
}): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.HOME_ASSISTANT_WEBHOOK_SECRET) {
    headers["X-Webhook-Secret"] = process.env.HOME_ASSISTANT_WEBHOOK_SECRET;
  }

  const res = await fetch(webhookUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      mac: mac.toLowerCase(),
      ap_mac: apMac ? apMac.toLowerCase() : null,
      minutes: minutes ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Guest authorization webhook failed: ${res.status} ${text}`);
  }
}
