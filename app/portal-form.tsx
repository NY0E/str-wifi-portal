"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const AUTO_REDIRECT_DELAY_MS = 3000;

const inputClass =
  "mt-1 w-full rounded-lg border border-transparent bg-canvas px-3 py-2 text-night placeholder:text-night/40 outline-none focus:border-seafoam focus:ring-2 focus:ring-seafoam/40";

export function PortalForm({
  mac,
  apMac,
  ssid,
  originalUrl,
  guideVideoUrl,
  houseRules,
  houseRulesFootnote,
}: {
  mac: string;
  apMac: string | null;
  ssid: string;
  originalUrl: string | null;
  guideVideoUrl: string | null;
  houseRules: string[];
  houseRulesFootnote: string;
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
      <div className="rounded-xl border border-seafoam/30 bg-seafoam/10 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-seafoam text-night">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display mt-4 text-lg font-semibold text-foreground">
          You&apos;re connected! 🎉
        </h2>
        {guideVideoUrl && (
          <p className="mt-2 text-sm text-foreground/70">
            New here? Quick how-tos for the locks, appliances, and everything else{" "}
            <a
              href={guideVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-seafoam underline underline-offset-4"
            >
              on the BaseKC YouTube
            </a>
            .
          </p>
        )}
        {redirectUrl && (
          <>
            <p className="mt-4 text-xs text-foreground/50">Redirecting you now…</p>
            <a
              href={redirectUrl}
              className="mt-1 inline-block text-sm font-medium text-seafoam underline underline-offset-4"
            >
              Continue browsing
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-seafoam uppercase">
          Verify your reservation
        </legend>

        <div>
          <label htmlFor="reservationLastName" className="block text-sm font-medium text-foreground/80">
            Last name on the reservation
          </label>
          <input
            id="reservationLastName"
            name="reservationLastName"
            required
            value={reservationLastName}
            onChange={(e) => setReservationLastName(e.target.value)}
            className={inputClass}
            placeholder="Smith"
          />
        </div>

        <div>
          <label htmlFor="reservationPhoneLast4" className="block text-sm font-medium text-foreground/80">
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
            className={`${inputClass} w-28 text-center text-lg tracking-widest`}
            placeholder="0000"
          />
        </div>
      </fieldset>

      <section
        aria-label="House rules"
        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
      >
        <ol className="flex flex-col gap-3">
          {houseRules.map((rule, i) => (
            <li key={i} className="flex gap-3 text-sm leading-6 text-foreground/80">
              <span className="font-display shrink-0 text-base font-bold text-seafoam">
                {i + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-foreground/50">
          {houseRulesFootnote}
        </p>
      </section>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-seafoam uppercase">
          Your signature
        </legend>

        <div>
          <label htmlFor="signerName" className="block text-sm font-medium text-foreground/80">
            Your name
          </label>
          <input
            id="signerName"
            name="signerName"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className={inputClass}
            placeholder="Jamie Smith"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground/80">
            Your email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-2.5 text-sm text-foreground/80">
        <input
          type="checkbox"
          required
          checked={agreedToRules}
          onChange={(e) => setAgreedToRules(e.target.checked)}
          className="mt-1 h-4 w-4 accent-seafoam"
        />
        I have read and agree to the house rules.
      </label>

      <label className="flex items-start gap-2.5 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-1 h-4 w-4 accent-seafoam"
        />
        Send me discounts and promos for future stays.
      </label>

      {status === "error" && errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="font-display rounded-lg bg-gradient-to-b from-seafoam to-seafoam-dark px-4 py-2.5 text-sm font-bold tracking-wide text-night uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "Connecting…" : "Connect to WiFi"}
      </button>
    </form>
  );
}
