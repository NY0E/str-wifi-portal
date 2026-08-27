import { supabaseAdmin } from "@/lib/supabase";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_WINDOW = 10;

/**
 * A last-4-digits phone match is still guessable (10,000 combinations) once
 * an attacker knows the reservation's last name. This throttles repeated
 * guesses per (IP, MAC) pair using a small attempt-log table — intentionally
 * minimal, not a full fraud-prevention system.
 */
export async function checkRateLimit({
  ip,
  mac,
}: {
  ip: string | null;
  mac: string | null;
}): Promise<{ allowed: boolean }> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count, error } = await db
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .or(
      [ip ? `ip.eq.${ip}` : null, mac ? `mac.eq.${mac}` : null]
        .filter(Boolean)
        .join(",")
    );

  if (error) {
    // Fail open on rate-limit infra errors — don't block real guests
    // because the attempt log had a transient issue.
    return { allowed: true };
  }

  return { allowed: (count ?? 0) < MAX_ATTEMPTS_PER_WINDOW };
}

export async function recordAttempt({
  ip,
  mac,
  ssid,
  succeeded,
}: {
  ip: string | null;
  mac: string | null;
  ssid: string | null;
  succeeded: boolean;
}): Promise<void> {
  const db = supabaseAdmin();
  await db.from("auth_attempts").insert({
    ip,
    mac,
    ssid,
    succeeded,
  });
}
