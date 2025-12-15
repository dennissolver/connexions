import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-neutral-950 text-neutral-100">
      {/* HERO */}
      <section className="px-6 py-28 border-b border-neutral-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-semibold leading-tight mb-6">
              Interviews, surveys, and focus groups —
              <br />
              <span className="text-neutral-400">
                without the operational chaos
              </span>
            </h1>

            <p className="text-neutral-300 text-lg mb-8 max-w-xl">
              Connexions lets you design, run, and evaluate interviews and surveys
              using AI interview agents — so you can stop coordinating people,
              calendars, and spreadsheets, and start collecting real insight.
            </p>

            <div className="flex gap-4 flex-wrap">
              <Link
                href="#demo"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-4
                           text-neutral-900 font-medium hover:bg-neutral-200 transition"
              >
                Try a live demo
              </Link>

              <a
                href="https://connexions.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-neutral-700
                           px-6 py-4 text-neutral-200 hover:bg-neutral-900 transition"
              >
                See the platform
              </a>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <p className="text-neutral-400 text-sm mb-3">
              The reality for most teams today:
            </p>
            <ul className="space-y-3 text-neutral-300">
              <li>• Weeks organising interviews and focus groups</li>
              <li>• Dozens of emails and calendar changes</li>
              <li>• Low attendance and no-shows</li>
              <li>• Inconsistent questioning and bias</li>
              <li>• Hours spent summarising notes after</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section className="px-6 py-24 border-b border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-semibold mb-8">
            The cost of manual interviews is far higher than it looks
          </h2>

          <div className="grid md:grid-cols-2 gap-10 text-neutral-300">
            <p>
              Governments, companies, researchers, and institutions run
              billions of interviews and surveys every year.
              Most of them are still organised manually —
              consuming enormous time and budget before a single insight is produced.
            </p>

            <p>
              Connexions replaces coordination with infrastructure.
              AI interview agents conduct consistent, on-demand conversations,
              automatically summarise outcomes, and make results immediately usable.
            </p>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="px-6 py-24 border-b border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold mb-12">
            Built for interview-heavy work
          </h2>

          <div className="grid md:grid-cols-3 gap-8 text-neutral-300">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h3 className="font-medium mb-3">Research & Policy</h3>
              <p>
                Run structured or exploratory interviews at scale —
                without booking rooms, managing facilitators, or losing consistency.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h3 className="font-medium mb-3">Recruitment & Screening</h3>
              <p>
                Let candidates interview on their schedule,
                with automatic scoring, summaries, and bias reduction.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h3 className="font-medium mb-3">Customer & Stakeholder Insight</h3>
              <p>
                Replace one-off surveys and low-attendance focus groups
                with ongoing, conversational insight capture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITY PROOF */}
      <section className="px-6 py-24 border-b border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold mb-10">
            Proven capability, not a prototype
          </h2>

          <p className="text-neutral-300 mb-10 max-w-3xl">
            Connexions is built by the same team behind multiple
            production AI platforms already used by founders,
            service providers, and institutions.
          </p>

          <div className="grid md:grid-cols-2 gap-6 text-neutral-300">
            {[
              {
                name: "RaiseReady (White-label)",
                url: "https://corporateaisolutions.com/raiseready-white-label/",
                desc: "AI coaching and readiness infrastructure for founders and investors",
              },
              {
                name: "RaiseReady Platform",
                url: "https://raiseready-six.vercel.app/",
                desc: "Live AI pitch coaching and assessment platform",
              },
              {
                name: "Disability Connect",
                url: "https://disabilityconnect.netlify.app/",
                desc: "Interview-driven service matching and eligibility assessment",
              },
              {
                name: "Checkpoint",
                url: "https://f2k-checkpoint-new.vercel.app/",
                desc: "Multi-agent infrastructure for complex regulatory and procurement workflows",
              },
            ].map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition"
              >
                <div className="font-medium mb-2">{p.name}</div>
                <div className="text-sm text-neutral-400">{p.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO LEAD CAPTURE */}
      <section id="demo" className="px-6 py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-semibold mb-6">
            Try a live Connexions demo
          </h2>

          <p className="text-neutral-300 mb-10">
            Speak with a demo interview agent and design a real interview or survey.
            No setup. No commitment.
          </p>

          <form
            action="/api/demo/start"
            method="POST"
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5"
          >
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Name</label>
              <input
                name="name"
                required
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-1">Company (optional)</label>
              <input
                name="company"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                What do you want to interview or survey for?
              </label>
              <textarea
                name="use_case"
                rows={3}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-white px-6 py-4
                         text-neutral-900 font-medium hover:bg-neutral-200 transition"
            >
              Start demo
            </button>

            <p className="text-xs text-neutral-500 text-center mt-3">
              Demo interviews run on Connexions infrastructure and are deleted after the session.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
