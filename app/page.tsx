// app/page.tsx
import Link from 'next/link';
import {
  Mic, BarChart3, Shield, Clock, Users, Zap,
  Phone, Mail, MessageCircle, ArrowRight, CheckCircle,
  Building2, Briefcase, Heart, Rocket, FileText, Target
} from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* NAVIGATION */}
      <nav className="border-b border-neutral-800 sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-purple-500" />
            <span className="font-bold text-xl">Connexions</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#use-cases" className="hover:text-white transition">Use Cases</a>
            <a href="#portfolio" className="hover:text-white transition">Portfolio</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
          </div>
          <a
            href="https://universal-interviews.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Try Free Demo
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-sm text-purple-400 mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Voice Interviews at Scale
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Build interview agents that actually behave like your organisation.
          </h1>

          <p className="mt-6 text-xl text-neutral-300 leading-relaxed">
            Create AI voice interviewers for customer research, user feedback, exit interviews,
            compliance audits, and surveys with observable quality and measurable performance.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="https://universal-interviews.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-lg font-semibold hover:bg-neutral-200 transition"
            >
              <Mic className="w-5 h-5" />
              Try Free Demo
            </a>
            <Link
              href="/buyer"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-6 py-3.5 rounded-lg font-semibold transition"
            >
              <Rocket className="w-5 h-5" />
              Create Your Platform
            </Link>
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            No credit card required for demo â€¢ Platform subscription $150/month
          </p>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-red-400">The Problem</h2>
              <p className="text-neutral-300 mb-4">
                Traditional interviews do not scale. Most AI interview tools lose tone over time,
                ask inconsistent questions, drift away from their intended role, and give you
                no way to measure quality.
              </p>
              <p className="text-neutral-400">
                Once deployed, you are blind. No visibility into performance, no alerts when
                things go wrong, no way to prove compliance.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 text-green-400">Our Solution</h2>
              <p className="text-neutral-300 mb-4">
                Connexions does not just run interviews - we evaluate them continuously.
                Every conversation is assessed for role adherence, goal achievement,
                and conversation quality.
              </p>
              <p className="text-neutral-400">
                You do not hope it works. You see exactly how it is performing, with alerts
                when agents drift from their intended behavior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Production</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Everything you need to run AI interviews at scale with confidence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <Mic className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Natural Voice Conversations</h3>
              <p className="text-neutral-400 text-sm">ElevenLabs-powered voice AI that sounds human and keeps conversations flowing.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <BarChart3 className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Continuous Evaluation</h3>
              <p className="text-neutral-400 text-sm">Every completed interview is automatically evaluated for goal achievement and quality.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <Shield className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drift Detection</h3>
              <p className="text-neutral-400 text-sm">Real-time alerts when your agent starts behaving differently than intended.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <Clock className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Instant Deployment</h3>
              <p className="text-neutral-400 text-sm">Go from concept to live interview panels in minutes with automated provisioning.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <Users className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unlimited Interview Panels</h3>
              <p className="text-neutral-400 text-sm">Create as many interview panels as you need - only completed interviews count toward usage.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <FileText className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Rich Exports</h3>
              <p className="text-neutral-400 text-sm">Full transcripts, structured data extraction, and CSV exports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Who Uses Connexions</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Designed for teams who need structured conversations at scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Target className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold mb-2">Market Research</h3>
              <p className="text-sm text-neutral-400">Run hundreds of customer interviews with consistent methodology.</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Users className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-semibold mb-2">User Research</h3>
              <p className="text-sm text-neutral-400">Gather product feedback at scale without scheduling bottlenecks.</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Briefcase className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-semibold mb-2">Exit Interviews</h3>
              <p className="text-sm text-neutral-400">Capture honest feedback from departing employees consistently.</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Shield className="w-8 h-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold mb-2">Compliance Audits</h3>
              <p className="text-sm text-neutral-400">Structured interviews with full audit trails and scoring.</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Heart className="w-8 h-8 text-red-400 mb-3" />
              <h3 className="font-semibold mb-2">Patient Check-ins</h3>
              <p className="text-sm text-neutral-400">Healthcare follow-ups with empathetic, consistent interactions.</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Building2 className="w-8 h-8 text-indigo-400 mb-3" />
              <h3 className="font-semibold mb-2">Investor Due Diligence</h3>
              <p className="text-sm text-neutral-400">Standardized founder interviews for VC portfolio screening.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section id="portfolio" className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Platform Portfolio</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Tools we have built for the startup and investment ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="https://investor-connect.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition group">
              <Users className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">Investor Connect</h3>
              <p className="text-sm text-neutral-400">AI-powered VC research interviews.</p>
            </a>
            <a href="https://grants-2025.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition group">
              <FileText className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">Grants Directory</h3>
              <p className="text-sm text-neutral-400">Searchable directory of Australian grants.</p>
            </a>
            <a href="https://f2k-checkpoint-new.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition group">
              <Briefcase className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">F2K Checkpoint</h3>
              <p className="text-sm text-neutral-400">Founder validation and progress tracking.</p>
            </a>
            <a href="https://universal-interviews.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition group">
              <Mic className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">Universal Interviews</h3>
              <p className="text-sm text-neutral-400">Try our AI interview demo live.</p>
            </a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-neutral-400 mb-8">
            No hidden fees. No per-seat charges. Pay only for completed interviews.
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
            <div className="text-4xl font-bold mb-2">$150<span className="text-lg text-neutral-400">/month</span></div>
            <p className="text-neutral-400 mb-6">Your own AI interview platform</p>

            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center gap-3 text-neutral-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span><strong>Unlimited interview panels</strong> - create as many as you need</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span><strong>100 completed interviews</strong> included per month</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                Full analytics dashboard
              </li>
              <li className="flex items-center gap-3 text-neutral-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                Drift detection and alerts
              </li>
              <li className="flex items-center gap-3 text-neutral-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                CSV exports
              </li>
              <li className="flex items-center gap-3 text-neutral-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                Priority support
              </li>
            </ul>

            <div className="bg-neutral-800/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-neutral-400">
                <strong className="text-neutral-300">How it works:</strong> A completed interview is counted when an interviewee finishes a conversation on any of your interview panels.
                For example, you could run 20 different panels with 5 interviewees each to use your 100 included interviews.
              </p>
              <p className="text-sm text-neutral-400 mt-2">
                <strong className="text-neutral-300">Overage:</strong> $5 per completed interview above 100, billed in arrears with your next monthly payment.
              </p>
            </div>

            <Link
              href="/buyer"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-lg font-semibold transition"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Let us Talk</h2>
              <p className="text-neutral-400 mb-8">
                Have questions about Connexions or need a custom solution?
                We build platform solutions for organizations across sectors.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Email</div>
                    <a href="mailto:dennis@corporateaisolutions.com" className="hover:text-purple-400 transition">dennis@corporateaisolutions.com</a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Phone / WhatsApp</div>
                    <a href="tel:+61402612471" className="hover:text-green-400 transition">+61 402 612 471</a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">WhatsApp Direct</div>
                    <a href="https://wa.me/61402612471" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">Chat on WhatsApp</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4">About Corporate AI Solutions</h3>
              <p className="text-neutral-400 text-sm mb-4">
                We are a boutique AI consultancy specializing in platform solutions
                for venture capital, impact investing, disability services, and
                founder support organizations.
              </p>

              <div className="flex items-center gap-4 mt-6">
                <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center text-xl font-bold">DM</div>
                <div>
                  <div className="font-semibold">Dennis McMahon</div>
                  <div className="text-sm text-neutral-500">Founder, Corporate AI Solutions</div>
                </div>
              </div>

              <a href="https://corporateaisolutions.com" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition">
                Visit corporateaisolutions.com
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-800 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-500" />
              <span className="font-bold">Connexions</span>
              <span className="text-neutral-600">by Corporate AI Solutions</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <a href="mailto:dennis@corporateaisolutions.com" className="hover:text-white transition">Contact</a>
              <a href="https://corporateaisolutions.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Corporate AI Solutions</a>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-600 mt-6">
            Â© 2024 Corporate AI Solutions. Built for production use.
          </p>
        </div>
      </footer>
    </main>
  );
}
