import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface BuyPageProps {
  searchParams: {
    demoAgentId?: string;
  };
}

export default async function BuyPage({ searchParams }: BuyPageProps) {
  const demoAgentId = searchParams.demoAgentId;
  if (!demoAgentId) notFound();

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("name, estimated_duration_mins")
    .eq("id", demoAgentId)
    .eq("is_demo", true)
    .single();

  if (!agent) notFound();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-24">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-4xl font-semibold mb-6">
          Turn your demo into a real interview platform
        </h1>

        <p className="text-neutral-300 mb-10">
          You just experienced your own AI interview agent in action.
          Hereâ€™s what happens when you make it permanent.
        </p>

        {/* VALUE RECAP */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 mb-10">
          <ul className="space-y-3 text-neutral-300">
            <li>âœ” Agent: <strong>{agent.name}</strong></li>
            <li>âœ” Avg interview length: {agent.estimated_duration_mins} mins</li>
            <li>âœ” Automatic evaluation after every interview</li>
            <li>âœ” Role adherence & quality tracking</li>
          </ul>
        </div>

        {/* PRICING */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 mb-10">
          <h2 className="text-2xl font-semibold mb-4">Pricing</h2>

          <p className="text-neutral-300 mb-4">
            Transparent. Usage-based. No surprises.
          </p>

          <ul className="space-y-2 text-neutral-300">
            <li><strong>$150 / month</strong> â€” private interview factory</li>
            <li>Includes <strong>200 interviewees</strong></li>
            <li><strong>$1.25</strong> per interviewee above that</li>
          </ul>
        </div>

        {/* CTA */}
        <form action="/api/factory/create" method="POST">
          <input type="hidden" name="demoAgentId" value={demoAgentId} />

          <button
            type="submit"
            className="w-full rounded-lg bg-white px-6 py-4
                       text-neutral-900 font-medium hover:bg-neutral-200 transition"
          >
            Create My Interview Platform
          </button>
        </form>

        <p className="text-sm text-neutral-400 text-center mt-4">
          Your demo agent becomes your first real agent
        </p>
      </div>
    </main>
  );
}

