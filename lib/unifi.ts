/**
 * UniFi guest-authorization client.
 *
 * VERIFICATION NEEDED: the exact REST path for this action, reached through
 * the Site Manager (unifi.ui.com) proxy to the console's own Network
 * Application API, could not be confirmed from public docs (the reference
 * site is JS-rendered, and Ubiquiti has both a legacy API and a newer
 * official one). This implementation targets the well-documented legacy
 * shape (`cmd/stamgr`, action `authorize-guest`, keyed by MAC + optional AP
 * MAC) via the proxy base URL below. Confirm against a real API key and
 * adjust `AUTHORIZE_PATH`/body shape if the newer API differs — this is the
 * one function to change.
 *
 * Also confirmed from docs: this action takes no SSID/network parameter.
 * Per-unit SSID enforcement is NOT done here — it must already have
 * happened before this is called (see lib/config.ts + the authenticate
 * route), since UniFi has no way to scope the grant to one SSID.
 */

const PROXY_BASE_URL =
  process.env.UNIFI_API_BASE_URL ?? "https://unifi.ui.com/proxy/network";

function apiKey(): string {
  const key = process.env.UNIFI_API_KEY;
  if (!key) {
    throw new Error("UNIFI_API_KEY must be set.");
  }
  return key;
}

function siteId(): string {
  const site = process.env.UNIFI_SITE_ID;
  if (!site) {
    throw new Error("UNIFI_SITE_ID must be set.");
  }
  return site;
}

export async function authorizeGuest({
  mac,
  apMac,
  minutes,
}: {
  mac: string;
  apMac?: string | null;
  /** Session length in minutes; omit for the site's default guest policy. */
  minutes?: number;
}): Promise<void> {
  const url = `${PROXY_BASE_URL}/api/s/${siteId()}/cmd/stamgr`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      cmd: "authorize-guest",
      mac: mac.toLowerCase(),
      ...(apMac ? { ap_mac: apMac.toLowerCase() } : {}),
      ...(minutes ? { minutes } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`UniFi authorize-guest failed: ${res.status} ${text}`);
  }
}
