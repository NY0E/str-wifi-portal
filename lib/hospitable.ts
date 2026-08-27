/**
 * Hospitable Public API v2 client.
 *
 * VERIFICATION NEEDED: the exact reservation JSON field that holds the
 * guest's smart-lock/door code could not be confirmed from public docs
 * (the docs site is JS-rendered). `extractDoorCode` below tries the most
 * plausible field names defensively. Once a real API key is available,
 * fetch one live reservation, inspect the payload, and trim this down to
 * the single correct field.
 */

export type HospitableReservation = {
  id: string;
  confirmation_code?: string;
  reservation_code?: string;
  listing_id?: string;
  property_id?: string;
  check_in?: string;
  check_out?: string;
  status?: string;
  [key: string]: unknown;
};

const API_BASE_URL =
  process.env.HOSPITABLE_API_BASE_URL ?? "https://public.api.hospitable.com/v2";

function apiKey(): string {
  const key = process.env.HOSPITABLE_API_KEY;
  if (!key) {
    throw new Error("HOSPITABLE_API_KEY must be set.");
  }
  return key;
}

/**
 * Lists reservations for the given listing IDs that are active (cover
 * `date`, an ISO yyyy-mm-dd string). Filters client-side on check_in/out
 * since the exact query-param names for "active on date" aren't confirmed.
 */
export async function listActiveReservations({
  listingIds,
  date,
}: {
  listingIds: string[];
  date: string;
}): Promise<HospitableReservation[]> {
  const params = new URLSearchParams();
  for (const id of listingIds) params.append("properties[]", id);
  params.set("start_date", date);
  params.set("end_date", date);
  params.set("include", "guest");

  const res = await fetch(`${API_BASE_URL}/reservations?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Hospitable reservations request failed: ${res.status}`);
  }

  const body = (await res.json()) as { data?: HospitableReservation[] };
  const reservations = body.data ?? [];

  return reservations.filter((r) => {
    if (!r.check_in || !r.check_out) return true; // can't filter, keep for code matching
    return r.check_in <= date && date <= r.check_out;
  });
}

/** See the VERIFICATION NEEDED note above. */
function extractDoorCode(reservation: HospitableReservation): string | null {
  const candidates = [
    "door_code",
    "access_code",
    "smart_lock_code",
    "smartlock_code",
  ];
  for (const key of candidates) {
    const value = reservation[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  const guest = reservation["guest"] as Record<string, unknown> | undefined;
  if (guest) {
    for (const key of candidates) {
      const value = guest[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  return null;
}

export async function findActiveReservationByCode({
  listingIds,
  doorCode,
  date,
}: {
  listingIds: string[];
  doorCode: string;
  date: string;
}): Promise<HospitableReservation | null> {
  const reservations = await listActiveReservations({ listingIds, date });
  return (
    reservations.find((r) => extractDoorCode(r) === doorCode) ?? null
  );
}
