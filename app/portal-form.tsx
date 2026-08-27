"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const AUTO_REDIRECT_DELAY_MS = 3000;

export function PortalForm({
  mac,
  apMac,
  ssid,
  originalUrl,
}: {
  mac: string;
  apMac: string | null;
  ssid: string;
  originalUrl: string | null;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reservationLastName, setReservationLastName] = useState("");
  const [reservationPhoneLast4, setReservationPhoneLast4] = useState("");
  const [signerName, setSignerName] = useState("");
  const [email, setEmail] = useState("");
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "success" || !redirectUrl) return;
    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, AUTO_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, redirectUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationLastName,
          reservationPhoneLast4,
          signerName,
          email,
          agreedToRules,
          marketingOptIn,
          mac,
          apMac,
          ssid,
          originalUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setRedirectUrl(data.redirectUrl ?? null);
      setStatus("success");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-green-900">You&apos;re connected</h2>
        <p className="mt-2 text-sm text-green-800">
          Enjoy your stay! {redirectUrl ? "Redirecting you now…" : ""}
        </p>
        {redirectUrl && (
          <a
            href={redirectUrl}
            className="mt-4 inline-block text-sm font-medium text-green-900 underline"
          >
            Continue browsing
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">
          Verify your reservation
        </legend>

        <div>
          <label htmlFor="reservationLastName" className="block text-sm font-medium">
            Last name on the reservation
          </label>
          <input
            id="reservationLastName"
            name="reservationLastName"
            required
            value={reservationLastName}
            onChange={(e) => setReservationLastName(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Smith"
          />
        </div>

        <div>
          <label htmlFor="reservationPhoneLast4" className="block text-sm font-medium">
            Last 4 digits of the phone number used to book
          </label>
          <input
            id="reservationPhoneLast4"
            name="reservationPhoneLast4"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            value={reservationPhoneLast4}
            onChange={(e) => setReservationPhoneLast4(e.target.value.replace(/\D/g, ""))}
            className="mt-1 w-32 rounded-md border border-zinc-300 px-3 py-2 text-lg tracking-widest"
            placeholder="0000"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">Your signature</legend>

        <div>
          <label htmlFor="signerName" className="block text-sm font-medium">
            Your name
          </label>
          <input
            id="signerName"
            name="signerName"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Jamie Smith"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Your email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            placeholder="you@example.com"
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={agreedToRules}
          onChange={(e) => setAgreedToRules(e.target.checked)}
          className="mt-1"
        />
        I have read and agree to the house rules.
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-1"
        />
        Send me discounts and promos for future stays.
      </label>

      {status === "error" && errorMessage && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "submitting" ? "Connecting…" : "Connect to WiFi"}
      </button>
    </form>
  );
}
