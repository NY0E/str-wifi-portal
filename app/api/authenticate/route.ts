import { NextRequest, NextResponse } from "next/server";
import { allowedListingIdsForUnit, resolveUnitBySsid } from "@/lib/config";
import { findActiveReservationByGuest } from "@/lib/hospitable";
import { authorizeGuest } from "@/lib/unifi";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit";
import { houseRulesText, rulesVersion } from "@/content/house-rules";

export const runtime = "nodejs";

type AuthenticateBody = {
  reservationLastName: string;
  reservationPhoneLast4: string;
  signerName: string;
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

  const reservationLastName = (body.reservationLastName ?? "").trim();
  const reservationPhoneLast4 = (body.reservationPhoneLast4 ?? "").trim();
  const signerName = (body.signerName ?? "").trim();
  const email = (body.email ?? "").trim();
  const mac = (body.mac ?? "").trim();
  const ssid = (body.ssid ?? "").trim();

  if (!reservationLastName) {
    return NextResponse.json(
      { error: "Enter the last name on the reservation." },
      { status: 400 }
    );
  }
  if (!/^\d{4}$/.test(reservationPhoneLast4)) {
    return NextResponse.json(
      { error: "Enter the last 4 digits of the phone number used to book." },
      { status: 400 }
    );
  }
  if (!signerName) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
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

  const unit = resolveUnitBySsid(ssid);
  if (!unit) {
    return NextResponse.json(
      { error: "This network isn't configured for guest access. Please contact your host." },
      { status: 400 }
    );
  }

  try {
    const rateLimit = await checkRateLimit({ ip, mac });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const reservation = await findActiveReservationByGuest({
      listingIds: allowedListingIdsForUnit(unit),
      lastName: reservationLastName,
      phoneLast4: reservationPhoneLast4,
      date: todayIso(),
    });

    if (!reservation) {
      await recordAttempt({ ip, mac, ssid, succeeded: false });
      return NextResponse.json(
        { error: "That doesn't match an active reservation for this unit." },
        { status: 401 }
      );
    }

    const db = supabaseAdmin();
    const { error: insertError } = await db.from("house_rules_acceptances").insert({
      reservation_code: reservation.code ?? reservation.id,
      reservation_last_name: reservationLastName,
      reservation_phone_last4: reservationPhoneLast4,
      signer_name: signerName,
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
  } catch (err) {
    console.error("authenticate route failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
