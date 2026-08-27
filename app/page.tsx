import Image from "next/image";
import { resolveUnitBySsid, propertyName, propertyTagline, guideVideoUrl } from "@/lib/config";
import { houseRules, houseRulesFootnote } from "@/content/house-rules";
import { PortalForm } from "@/app/portal-form";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstValue(params: SearchParams, key: string): string | null {
  const value = params[key];
  return typeof value === "string" ? value : null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const mac = firstValue(params, "id");
  const apMac = firstValue(params, "ap");
  const ssid = firstValue(params, "ssid");
  const originalUrl = firstValue(params, "url");

  const unit = resolveUnitBySsid(ssid);

  if (!ssid || !unit) {
    return (
      <ConfigError message="This WiFi network isn't configured for guest access yet. Please contact your host." />
    );
  }

  if (!mac) {
    return (
      <ConfigError message="We couldn't read your device information. Please reconnect to WiFi and try again." />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center px-5 py-10 sm:py-14">
      <Header />

      <div className="mt-8 w-full rounded-2xl border border-seafoam/15 bg-deep-night p-5 shadow-[0_0_40px_-15px_rgba(23,212,192,0.35)] sm:p-7">
        <h1 className="font-display text-xl font-semibold tracking-wide text-foreground sm:text-2xl">
          Connect to Guest WiFi
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-foreground/60">
          Verify your reservation and accept the house rules to get online.
        </p>

        <div className="mt-6">
          <PortalForm
            mac={mac}
            apMac={apMac}
            ssid={ssid}
            originalUrl={originalUrl}
            guideVideoUrl={guideVideoUrl()}
            houseRules={houseRules}
            houseRulesFootnote={houseRulesFootnote}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Header() {
  const tagline = propertyTagline();
  return (
    <header className="flex flex-col items-center text-center">
      <Image
        src="/brand/basekc-logo-dark.svg"
        alt={propertyName()}
        width={310}
        height={78}
        priority
        className="h-auto w-48 sm:w-56"
      />
      {tagline && (
        <p className="mt-2 text-xs font-medium tracking-[0.2em] text-seafoam uppercase">
          {tagline}
        </p>
      )}
    </header>
  );
}

function Footer() {
  return (
    <p className="mt-8 text-center text-xs text-foreground/35">
      Having trouble? Contact your host.
    </p>
  );
}

function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <Image
        src="/brand/basekc-logo-dark.svg"
        alt="BaseKC"
        width={310}
        height={78}
        className="h-auto w-44"
      />
      <h1 className="font-display mt-8 text-xl font-semibold text-foreground">
        Unable to connect
      </h1>
      <p className="mt-2 text-sm text-foreground/60">{message}</p>
    </main>
  );
}
