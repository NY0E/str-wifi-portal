// One-off verification script — NOT part of the app. Confirms the real
// Hospitable API shape (endpoint path, listing IDs, door-code field name)
// against a live account, without printing secrets or guest PII values.
// Run with: node --env-file=.env.local scripts/verify-hospitable.mjs

const apiKey = process.env.HOSPITABLE_API_KEY;
if (!apiKey) {
  console.error("HOSPITABLE_API_KEY not set.");
  process.exit(1);
}

const baseUrl = process.env.HOSPITABLE_API_BASE_URL ?? "https://public.api.hospitable.com/v2";

async function tryGet(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, json };
}

function redactKeys(obj, path = "") {
  if (obj === null || obj === undefined) return typeof obj;
  if (Array.isArray(obj)) {
    return obj.length ? [redactKeys(obj[0], path)] : [];
  }
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = redactKeys(v, `${path}.${k}`);
    }
    return out;
  }
  // primitive: report type + rough shape, never the actual value
  if (typeof obj === "string") {
    return `string(len=${obj.length}${/^\d+$/.test(obj) ? ", numeric" : ""})`;
  }
  return typeof obj;
}

console.log("Base URL:", baseUrl);
console.log();

for (const path of ["/properties", "/listings", "/me", "/user"]) {
  const res = await tryGet(path);
  console.log(`GET ${path} -> ${res.status}`);
}

console.log();
console.log("--- Listing properties/listing IDs (id + name only) ---");
for (const path of ["/properties", "/listings"]) {
  const res = await tryGet(path);
  if (res.ok && res.json) {
    const items = res.json.data ?? res.json.properties ?? res.json.listings ?? [];
    if (Array.isArray(items) && items.length) {
      console.log(`From ${path}:`);
      for (const item of items.slice(0, 10)) {
        console.log(`  id=${item.id ?? item.listing_id} name=${item.name ?? item.title ?? "(no name field)"}`);
      }
    }
  }
}

console.log();
console.log("--- Reservation shape (field names/types only, no PII values) ---");
const today = new Date().toISOString().slice(0, 10);
for (const path of [
  `/reservations?start_date=${today}&end_date=${today}&include=guest`,
  `/reservations?checkin_before=${today}&checkout_after=${today}`,
]) {
  const res = await tryGet(path);
  console.log(`GET ${path} -> ${res.status}`);
  if (res.ok && res.json) {
    const items = res.json.data ?? [];
    console.log(`  ${Array.isArray(items) ? items.length : 0} reservation(s) returned`);
    if (Array.isArray(items) && items.length) {
      console.log("  Field shape of first reservation:");
      console.log(JSON.stringify(redactKeys(items[0]), null, 2));
    }
  } else if (res.json) {
    console.log("  Body:", JSON.stringify(res.json));
  }
}
