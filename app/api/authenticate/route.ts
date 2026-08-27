import { NextRequest, NextResponse } from "next/server";
import { allowedListingIdsForUnit, resolveUnitBySsid } from "@/lib/config";
import { findActiveReservationByCode } from "@/lib/hospitable";
import { authorizeGuest } from "@/lib/unifi";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit";
import { houseRulesText, rulesVersion } from "@/content/house-rules";

export const runtime = "nodejs";

type AuthenticateBody = {
  doorCode: string;
  email: string;
  agreedToRules: boolean;
  marketingOptIn: boolean;
  mac: string;
  apMac?: string | null;
  ssid: string;
  originalUrl?: string | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  let body: AuthenticateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const doorCode = (body.doorCode ?? "").trim();
  const email = (body.email ?? "").trim();
  const mac = (body.mac ?? "").trim();
  const ssid = (body.ssid ?? "").trim();

  if (!/^\d{4}$/.test(doorCode)) {
    return NextResponse.json({ error: "Enter your 4-digit door code." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (body.agreedToRules !== true) {
    return NextResponse.json(
      { error: "You must agree to the house rules." },
      { status: 400 }
    );
  }
  if (!mac) {
    return NextResponse.json(
      { error: "Missing device information — please reconnect to WiFi and try again." },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  const rateLimit = await checkRateLimit({ ip, mac });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const unit = resolveUnitBySsid(ssid);
  if (!unit) {
    return NextResponse.json(
      { error: "This network isn't configured for guest access. Please contact your host." },
      { status: 400 }
    );
  }

  const reservation = await findActiveReservationByCode({
    listingIds: allowedListingIdsForUnit(unit),
    doorCode,
    date: todayIso(),
  });

  if (!reservation) {
    await recordAttempt({ ip, mac, ssid, succeeded: false });
    return NextResponse.json(
      { error: "That code doesn't match an active reservation for this unit." },
      { status: 401 }
    );
  }

  const db = supabaseAdmin();
  const { error: insertError } = await db.from("house_rules_acceptances").insert({
    reservation_code:
      reservation.confirmation_code ?? reservation.reservation_code ?? reservation.id,
    door_code_used: doorCode,
    email,
    marketing_opted_in: body.marketingOptIn === true,
    guest_ip: ip,
    user_agent: userAgent,
    client_mac: mac,
    ssid,
    unit_id: unit.id,
    rules_text_snapshot: houseRulesText,
    rules_version: rulesVersion,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Something went wrong recording your acceptance. Please try again." },
      { status: 500 }
    );
  }

  try {
    await authorizeGuest({ mac, apMac: body.apMac });
  } catch {
    return NextResponse.json(
      {
        error:
          "Your acceptance was recorded, but we couldn't grant network access automatically. Please contact your host.",
      },
      { status: 502 }
    );
  }

  await recordAttempt({ ip, mac, ssid, succeeded: true });

  return NextResponse.json({ ok: true, redirectUrl: body.originalUrl ?? null });
}
