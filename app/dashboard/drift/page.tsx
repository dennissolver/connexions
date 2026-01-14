import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DriftDashboard() {
  const { data } = await supabase
    .from("agent_drift_daily")
    .select("*")
    .order("snapshot_date", { ascending: true });

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">
        Agent Role Drift Over Time
      </h1>

      <table className="w-full border border-neutral-800">
        <thead className="bg-neutral-900">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2">Avg Drift</th>
            <th className="p-2">Flagged</th>
            <th className="p-2">Total</th>
            <th className="p-2">Severity</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row) => (
            <tr key={`${row.agent_id}-${row.snapshot_date}`} className="border-t">
              <td className="p-2">{row.snapshot_date}</td>
              <td className="p-2 text-center">{row.avg_role_drift_score.toFixed(1)}</td>
              <td className="p-2 text-center">{row.drift_flagged_interviews}</td>
              <td className="p-2 text-center">{row.total_interviews}</td>
              <td className="p-2 text-center font-medium">
                {row.drift_severity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

