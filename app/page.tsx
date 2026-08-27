import { resolveUnitBySsid, propertyName } from "@/lib/config";
import { houseRulesText } from "@/content/house-rules";
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">{propertyName()} Guest WiFi</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Enter your door code to accept the house rules and connect to WiFi.
        </p>
      </header>

      <section
        aria-label="House rules"
        className="max-h-96 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 whitespace-pre-wrap"
      >
        {houseRulesText}
      </section>

      <PortalForm mac={mac} apMac={apMac} ssid={ssid} originalUrl={originalUrl} />
    </main>
  );
}

function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">Unable to connect</h1>
      <p className="mt-2 text-sm text-zinc-600">{message}</p>
    </main>
  );
}
