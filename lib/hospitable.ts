/**
 * Hospitable Public API v2 client.
 *
 * Guests are verified by identity (last name + last 4 digits of the phone
 * number on the reservation), not by a door/smart-lock code — Hospitable's
 * public API doesn't expose the generated smart-lock code at all (checked
 * against a live account: not on the reservation object, not on the
 * property object, no working `include=` variant, not in message content).
 * See scripts/verify-hospitable.mjs.
 *
 * Also confirmed live: `guest.email` is null for Airbnb reservations
 * (Airbnb doesn't share it with hosts via the API) — only present for
 * direct/VRBO bookings. Don't rely on it for matching. `guest.last_name`
 * and `guest.phone_numbers` are reliably present across platforms on
 * active (status "accepted") reservations.
 */

export type HospitableReservation = {
  id: string;
  code?: string;
  platform?: string;
  status?: string;
  check_in?: string;
  check_out?: string;
  guest?: {
    last_name?: string;
    phone_numbers?: string[];
    email?: string | null;
  };
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

// A single-day `start_date=end_date` query against this endpoint was found
// to be unreliable live: for a real 5-night stay, querying the check-in day
// and a later mid-stay day both correctly returned the reservation, but a
// day in between returned zero results, with no other explanation found.
// Rather than trust exact-day filtering, we query a window wide enough to
// contain any realistic stay's check-in and filter for "active on `date`"
// ourselves from the results.
const LOOKBACK_DAYS_FOR_STAY_LENGTH = 60;

/**
 * Lists reservations for the given listing IDs that are active (status
 * "accepted", covering `date`, an ISO yyyy-mm-dd string).
 */
export async function listActiveReservations({
  listingIds,
  date,
}: {
  listingIds: string[];
  date: string;
}): Promise<HospitableReservation[]> {
  const windowStart = new Date(date);
  windowStart.setDate(windowStart.getDate() - LOOKBACK_DAYS_FOR_STAY_LENGTH);
  const windowEnd = new Date(date);
  windowEnd.setDate(windowEnd.getDate() + 1);

  const params = new URLSearchParams();
  for (const id of listingIds) params.append("properties[]", id);
  params.set("start_date", windowStart.toISOString().slice(0, 10));
  params.set("end_date", windowEnd.toISOString().slice(0, 10));
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
    if (r.status !== "accepted") return false;
    if (!r.check_in || !r.check_out) return false;
    // check_in/check_out are full ISO datetimes (e.g. "2026-10-21T15:00:00-05:00");
    // comparing them directly against a plain "YYYY-MM-DD" string breaks on the
    // exact check-in day, since the trailing time-of-day makes the datetime
    // string lexicographically greater than the date-only string for the same
    // calendar day. Compare on the date portion only.
    const checkInDate = r.check_in.slice(0, 10);
    const checkOutDate = r.check_out.slice(0, 10);
    return checkInDate <= date && date <= checkOutDate;
  });
}

function normalizeLastName(value: string): string {
  return value.trim().toLowerCase();
}

function last4Digits(value: string): string {
  return value.replace(/\D/g, "").slice(-4);
}

export async function findActiveReservationByGuest({
  listingIds,
  lastName,
  phoneLast4,
  date,
}: {
  listingIds: string[];
  lastName: string;
  phoneLast4: string;
  date: string;
}): Promise<HospitableReservation | null> {
  const reservations = await listActiveReservations({ listingIds, date });
  const wantLastName = normalizeLastName(lastName);

  return (
    reservations.find((r) => {
      const guest = r.guest;
      if (!guest?.last_name) return false;
      if (normalizeLastName(guest.last_name) !== wantLastName) return false;

      const phones = guest.phone_numbers ?? [];
      return phones.some((p) => last4Digits(p) === phoneLast4);
    }) ?? null
  );
}
