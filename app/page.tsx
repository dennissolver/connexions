// app/page.tsx
export default function HomePage() {
  return (
    <main className="bg-neutral-950 text-neutral-100">

      {/* HERO */}
      <section className="px-6 pt-32 pb-24">
        <div className="max-w-6xl mx-auto text-center space-y-10">

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
            Automated Interviews.
            <br />
            Designed by Conversation.
          </h1>

          <p className="text-xl text-neutral-300 max-w-3xl mx-auto">
            Connexions is infrastructure for running AI-led interviews and surveys —
            from one-off conversations to continuous, large-scale programs.
          </p>

          {/* ✅ RESTORED WORKING FORM */}
          <form
            method="POST"
            action="/api/leads/create"
            className="mt-10 max-w-xl mx-auto space-y-4"
          >
            <input
              name="name"
              required
              placeholder="Your name"
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-4 py-3"
            />

            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-4 py-3"
            />

            <input
              name="company"
              placeholder="Company / Organisation"
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-4 py-3"
            />

            <textarea
              name="use_case"
              required
              placeholder="What do you want to interview people about?"
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-4 py-3 min-h-[120px]"
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-white text-neutral-900 font-medium py-4 hover:bg-neutral-200 transition"
            >
              Start live demo
            </button>
          </form>

          <p className="text-xs text-neutral-500">
            No credit card required. Demo interviews are deleted after completion.
          </p>

        </div>
      </section>

      {/* BENEFITS / STORY SECTIONS STAY AS-IS */}
    </main>
  );
}
