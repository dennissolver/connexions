// app/page.tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-4xl">
          Connexions — Automated Interview & Survey Infrastructure
        </h1>

        <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
          Interviews and surveys underpin trillions of dollars in decisions every year.
          Connexions provides a unified, observable system for running automated interviews
          and surveys — from one-off studies to continuous, large-scale programs.
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

      {/* WHO IT’S FOR */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-6">
            Who Connexions is for
          </h2>

          <p className="text-neutral-300 max-w-3xl mb-8">
            Connexions is built for people whose work depends on running interviews
            and surveys reliably, repeatedly, and at scale.
          </p>

          <ul className="grid md:grid-cols-2 gap-4 text-neutral-300">
            <li>• Product Managers & UX Researchers</li>
            <li>• Founders & Strategy Teams</li>
            <li>• HR & People Operations</li>
            <li>• Market & Social Researchers</li>
            <li>• Consultants & Advisors</li>
            <li>• Policy, Government & Public Sector Teams</li>
            <li>• Compliance, Risk & Audit Teams</li>
          </ul>
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-6">
            Built for observability, not guesswork
          </h2>

          <ul className="space-y-3 text-neutral-300 max-w-3xl">
            <li>• Explicit interviewer role definition</li>
            <li>• Evaluation after every interview</li>
            <li>• Drift detection and alerts</li>
            <li>• Performance scoring and trend analysis</li>
            <li>• Voice-first or text-first interviews</li>
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-6">How it works</h2>

          <ol className="space-y-3 text-neutral-300 max-w-3xl">
            <li>1. Define the interview purpose</li>
            <li>2. Define interviewer behaviour</li>
            <li>3. Run interviews continuously</li>
            <li>4. Review performance, drift, and insights</li>
          </ol>
        </div>
      </section>

      {/* DEMO */}
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
            and see how Connexions evaluates behaviour and quality.
          </p>

          <Link
            href="/demo"
            className="mt-8 inline-block w-full text-center rounded-lg bg-white px-6 py-3
                       text-neutral-900 font-medium hover:bg-neutral-200 transition"
          >
            Start demo
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-800 py-10">
        <div className="max-w-6xl mx-auto px-6 text-sm text-neutral-500">
          Connexions · Automated Interview & Survey Infrastructure
        </div>
      </footer>
    </main>
  );
}
