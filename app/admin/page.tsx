import { supabaseAdmin } from "@/lib/supabase";

type SearchParams = { [key: string]: string | string[] | undefined };

type AcceptanceRow = {
  id: string;
  accepted_at: string;
  reservation_code: string;
  unit_id: string;
  ssid: string;
  signer_name: string;
  email: string;
  reservation_last_name: string;
  reservation_phone_last4: string;
  client_mac: string | null;
  rules_version: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  let rows: AcceptanceRow[] = [];
  let error: string | null = null;

  if (q) {
    const db = supabaseAdmin();
    const { data, error: dbError } = await db
      .from("house_rules_acceptances")
      .select(
        "id, accepted_at, reservation_code, unit_id, ssid, signer_name, email, reservation_last_name, reservation_phone_last4, client_mac, rules_version"
      )
      .or(
        `reservation_code.ilike.%${q}%,email.ilike.%${q}%,signer_name.ilike.%${q}%,reservation_last_name.ilike.%${q}%`
      )
      .order("accepted_at", { ascending: false })
      .limit(50);

    if (dbError) error = dbError.message;
    else rows = data ?? [];
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold">House Rules Acceptance Lookup</h1>
      <p className="mt-1 text-sm text-zinc-600">
        For dispute documentation with Airbnb/VRBO. Search by reservation code, name, or email.
      </p>

      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Reservation code, name, or email"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {q && !error && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-2 pr-4">Accepted at</th>
                <th className="py-2 pr-4">Reservation</th>
                <th className="py-2 pr-4">Unit / SSID</th>
                <th className="py-2 pr-4">Signer</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Reservation name / phone</th>
                <th className="py-2 pr-4">MAC</th>
                <th className="py-2 pr-4">Rules version</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-4">{new Date(row.accepted_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{row.reservation_code}</td>
                  <td className="py-2 pr-4">
                    {row.unit_id} / {row.ssid}
                  </td>
                  <td className="py-2 pr-4">{row.signer_name}</td>
                  <td className="py-2 pr-4">{row.email}</td>
                  <td className="py-2 pr-4">
                    {row.reservation_last_name} / ***{row.reservation_phone_last4}
                  </td>
                  <td className="py-2 pr-4">{row.client_mac}</td>
                  <td className="py-2 pr-4">{row.rules_version}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-zinc-500">
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
