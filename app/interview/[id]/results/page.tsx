import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function InterviewResults({
  params,
}: {
  params: { id: string };
}) {
  const { data: evaluation } = await supabaseAdmin
    .from("interview_evaluations")
    .select("*")
    .eq("interview_id", params.id)
    .single();

  if (!evaluation) return null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-20 space-y-8">
      <h1 className="text-3xl font-semibold">Interview Results</h1>

      <section className="rounded-xl border p-6">
        <h2 className="font-medium mb-2">Summary</h2>
        <p>{evaluation.summary}</p>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="font-medium mb-2">Extracted Insights</h2>
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(evaluation.extracted_data, null, 2)}
        </pre>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="font-medium mb-2">Confidence Score</h2>
        <p>{evaluation.confidence_score} / 100</p>
      </section>
    </main>
  );
}
