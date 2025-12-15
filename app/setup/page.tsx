import { redirect } from "next/navigation";

export default function LandingPage() {
  async function startDemo(formData: FormData) {
    "use server";

    const payload = {
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      website: formData.get("website"),
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/demo/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to start demo");
    }

    const { demoClientId } = await res.json();
    redirect(`/demo?c=${demoClientId}`);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Build interview agents that actually behave like your organisation.
        </h1>

        <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
          Create AI interviewers for research, discovery, exit interviews, audits,
          compliance, or surveys — with observable quality, role adherence,
          and measurable performance.
        </p>

        <div className="mt-10">
          <a
            href="#demo"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3
                       text-neutral-900 font-medium hover:bg-neutral-200 transition"
          >
            Try a live demo
          </a>
          <p className="mt-2 text-sm text-neutral-400">
            No credit card · Takes ~3 minutes
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold">
            Interviews don’t scale. AI interviews drift.
          </h2>

          <p className="mt-6 text-neutral-300 max-w-3xl">
            Most AI interview tools lose tone over time, ask inconsistent questions,
            drift away from their intended role, and give you no way to measure quality.
          </p>

          <p className="mt-4 text-neutral-300 max-w-3xl">
            Once deployed, you’re blind.
          </p>
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold">
            We don’t just run interviews — we evaluate them continuously.
          </h2>

          <ul className="mt-8 space-y-4 text-neutral-300">
            <li>• Explicit interviewer role definition</li>
            <li>• Evaluation after every interview</li>
            <li>• Role adherence scoring</li>
            <li>• Quality and goal-achievement metrics</li>
            <li>• Drift detection and alerts over time</li>
          </ul>

          <p className="mt-6 text-neutral-300 max-w-3xl">
            You don’t hope it works. You see how it’s performing.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold">How it works</h2>

          <ol className="mt-8 space-y-3 text-neutral-300">
            <li>1. Define the interview purpose</li>
            <li>2. Define how the interviewer should behave</li>
            <li>3. Let the agent conduct interviews</li>
            <li>4. Review performance, issues, and drift</li>
          </ol>

          <p className="mt-6 text-neutral-400">
            No prompt babysitting. No silent failures.
          </p>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold">Who this is for</h2>

          <ul className="mt-6 space-y-2 text-neutral-300">
            <li>• Founders running customer discovery</li>
            <li>• HR teams doing exit or engagement interviews</li>
            <li>• Legal and compliance teams gathering testimony</li>
            <li>• Researchers running qualitative studies at scale</li>
            <li>• Consultants interviewing repeatedly</li>
          </ul>
        </div>
      </section>

      {/* DEMO FORM */}
      <section
        id="demo"
        className="border-t border-neutral-800 py-24 bg-neutral-900"
      >
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-2xl font-semibold">
            Try the live demo
          </h2>

          <p className="mt-4 text-neutral-300">
            Create a real interview agent, interview yourself,
            and see how it evaluates behaviour and quality.
          </p>

          <form action={startDemo} className="mt-10 space-y-4">
            <input
              name="name"
              placeholder="Your name"
              required
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-neutral-100"
            />

            <input
              name="company"
              placeholder="Company"
              required
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-neutral-100"
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-neutral-100"
            />

            <input
              name="website"
              placeholder="Website (optional)"
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-neutral-100"
            />

            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-white px-6 py-3
                         text-neutral-900 font-medium hover:bg-neutral-200 transition"
            >
              Start demo interview
            </button>

            <p className="text-sm text-neutral-400 text-center">
              Demo data only · No commitment
            </p>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-800 py-10">
        <div className="max-w-5xl mx-auto px-6 text-sm text-neutral-500">
          Built for production use · Designed for observability · No gimmicks
        </div>
      </footer>
    </main>
  );
}
