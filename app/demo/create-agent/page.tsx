export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 space-y-24">

      {/* HERO */}
      <section className="space-y-6">
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          Live Infrastructure Demo
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          This is not a chatbot demo.
          <br />
          It’s interview infrastructure — observed in real time.
        </h1>
        <p className="max-w-3xl text-lg text-neutral-600">
          Connexions runs interviews and surveys as an observable system.
          This demo shows how a single interview behaves once real participants
          interact with it — where intent holds, where it drifts, and where
          signal quality degrades.
        </p>
      </section>

      {/* WHAT YOU'RE SEEING */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          {
            title: "Declared structure",
            body: "The questions, objectives, roles, and assumptions defined when the interview was designed."
          },
          {
            title: "Observed behaviour",
            body: "How participants actually respond — including misinterpretation, hesitation, fatigue, and deviation."
          },
          {
            title: "Derived insight",
            body: "System-level signals such as drift, bias, consistency loss, and emergent patterns across interviews."
          }
        ].map((item) => (
          <div key={item.title} className="rounded-xl border p-6 space-y-3">
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-sm text-neutral-600">{item.body}</p>
          </div>
        ))}
      </section>

      {/* OBSERVED VS ASSUMED */}
      <section className="space-y-10">
        <h2 className="text-2xl font-semibold">
          Observed vs Assumed
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl border p-6 space-y-4">
            <h3 className="font-medium text-neutral-800">Assumed (Design-Time)</h3>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc list-inside">
              <li>Interview goal: Validate problem understanding</li>
              <li>Role definition: Neutral discovery interviewer</li>
              <li>Question intent: Open-ended and unbiased</li>
              <li>Expected output: Comparable qualitative responses</li>
              <li>Confidence level: High</li>
            </ul>
          </div>

          <div className="rounded-xl border p-6 space-y-4">
            <h3 className="font-medium text-neutral-800">Observed (Run-Time)</h3>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc list-inside">
              <li>Goal drift toward solution validation</li>
              <li>Role shifted into implicit advisor</li>
              <li>Leading interpretations emerged</li>
              <li>Responses clustered after interview #9</li>
              <li>Confidence declined with participant fatigue</li>
            </ul>
          </div>
        </div>

        <p className="max-w-3xl text-sm text-neutral-600">
          These deviations rarely stop interviews from “working”.
          They simply make the output less reliable — without anyone noticing.
        </p>
      </section>

      {/* METRIC EXAMPLE */}
      <section className="rounded-2xl bg-neutral-50 border p-8 space-y-4">
        <h2 className="text-xl font-semibold">
          Example system metric
        </h2>

        <div className="space-y-2">
          <p className="font-medium">
            Role drift detected
          </p>
          <p className="text-neutral-700">
            After 14 interviews, the interviewer’s role shifted from
            <span className="font-medium"> neutral discovery </span>
            to
            <span className="font-medium"> solution-affirming</span>,
            increasing agreement bias by an estimated 22%.
          </p>
        </div>

        <p className="text-sm text-neutral-600 max-w-3xl">
          The interview was still running smoothly.
          The answers still sounded reasonable.
          The signal, however, was quietly degrading.
        </p>
      </section>

      {/* WHY THIS BREAKS TRADITIONAL RESEARCH */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          Why this breaks traditional research
        </h2>

        <div className="space-y-4 max-w-4xl text-neutral-700">
          <p>
            Traditional interviews and surveys assume that if questions are asked
            correctly, the data is trustworthy. In reality, most research failure
            doesn’t come from bad intent — it comes from invisible drift.
          </p>
          <p>
            As interviews scale, small shifts in role, tone, interpretation, or
            participant behaviour compound. By the time results are reviewed,
            decisions are already being made on compromised signal.
          </p>
          <p>
            Connexions treats interviews as a system, not a conversation.
            It measures what changes, when it changes, and how that affects
            confidence — making research observable instead of assumptive.
          </p>
        </div>
      </section>

      {/* PRICING LANGUAGE */}
      <section className="space-y-4 border-t pt-10">
        <h2 className="text-xl font-semibold">
          Usage-based pricing
        </h2>
        <p className="max-w-3xl text-neutral-600">
          Connexions is priced per completed interview or survey response.
          You pay for interviews run, signal processed, and observability generated —
          not seats, licences, or chatbots.
        </p>
      </section>

      {/* INVESTOR SIDEBAR */}
      <section className="text-sm text-neutral-500 max-w-4xl">
        <p>
          <span className="font-medium text-neutral-700">Investor note:</span>{" "}
          Connexions is building interview and survey infrastructure — not a
          research tool. As organisations move toward continuous insight programs,
          signal reliability becomes the bottleneck. Connexions addresses that gap
          with observability, not more conversations.
        </p>
      </section>

    </main>
  );
}
