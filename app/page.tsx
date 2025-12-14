// app/page.tsx
import Link from "next/link";
import { Phone, Bot, Zap, ArrowRight, Mic, Users, Clock, BarChart3, Building2, GraduationCap, Briefcase, Heart, Scale, FlaskConical } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">AI Interview Agents</h1>
            <p className="text-xs text-slate-500">by Corporate AI Solutions</p>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="https://calendly.com/mcmdennis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition text-sm"
            >
              Book a Demo
            </a>
            <Link
              href="/create"
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Create Agent
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero - No CTA button here, just headline */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full text-sm mb-8">
          <Mic className="w-4 h-4" />
          Voice-First AI Interviews
        </div>

        <h2 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl leading-tight">
          Create AI Voice Agents That Conduct Interviews For You
        </h2>

        <p className="text-xl text-slate-400 max-w-2xl">
          Design your custom AI interviewer through a simple voice conversation.
          No coding, no forms — just tell us what you need.
        </p>
      </section>

      {/* How can AI Interview Agents work for you? */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <h3 className="text-3xl font-bold text-center mb-4">How Can AI Interview Agents Work For You?</h3>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            We help you create custom AI voice agents that conduct interviews on your behalf —
            at scale, 24/7, with consistent quality.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-slate-800/50 rounded-xl p-6">
              <Bot className="w-10 h-10 text-purple-400 mb-4" />
              <h4 className="font-semibold mb-2">AI Interviewers</h4>
              <p className="text-sm text-slate-400">
                Custom voice agents trained to ask the right questions for your specific use case
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6">
              <Mic className="w-10 h-10 text-purple-400 mb-4" />
              <h4 className="font-semibold mb-2">Voice-First Design</h4>
              <p className="text-sm text-slate-400">
                Natural voice conversations, not boring forms. Better engagement, richer responses
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6">
              <Zap className="w-10 h-10 text-purple-400 mb-4" />
              <h4 className="font-semibold mb-2">Conversation Setup</h4>
              <p className="text-sm text-slate-400">
                Create your agent by talking to us. No configuration screens or complex forms
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6">
              <Users className="w-10 h-10 text-purple-400 mb-4" />
              <h4 className="font-semibold mb-2">Unlimited Scale</h4>
              <p className="text-sm text-slate-400">
                Interview hundreds of people simultaneously without hiring more staff
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Why Use AI Interviewers?</h3>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="font-semibold text-xl mb-2">Save 100+ Hours</h4>
            <p className="text-slate-400">
              Stop spending days on repetitive interviews. Let AI handle the volume while you focus on insights.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="font-semibold text-xl mb-2">Consistent Quality</h4>
            <p className="text-slate-400">
              Every interview follows your methodology. No interviewer fatigue, no missed questions.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="font-semibold text-xl mb-2">Deeper Insights</h4>
            <p className="text-slate-400">
              Voice conversations capture nuance and emotion that text forms miss entirely.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <h3 className="text-3xl font-bold text-center mb-4">Use Cases</h3>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            AI Interview Agents work for any scenario where you need to gather information through conversation.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <FlaskConical className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Customer Discovery</h4>
                <p className="text-sm text-slate-400">Validate ideas and understand customer needs</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <Briefcase className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Lead Qualification</h4>
                <p className="text-sm text-slate-400">Screen inbound leads before sales calls</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <Users className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">User Research</h4>
                <p className="text-sm text-slate-400">Gather product feedback at scale</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <Building2 className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Founder Screening</h4>
                <p className="text-sm text-slate-400">Pre-qualify startup applicants</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <GraduationCap className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">HR Screening</h4>
                <p className="text-sm text-slate-400">First-round candidate interviews</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <Heart className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Exit Interviews</h4>
                <p className="text-sm text-slate-400">Understand why employees leave</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <BarChart3 className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Market Research</h4>
                <p className="text-sm text-slate-400">Survey target demographics</p>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 flex items-start gap-4">
              <Scale className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Compliance Intake</h4>
                <p className="text-sm text-slate-400">Structured data collection</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-400">1</span>
            </div>
            <h4 className="font-semibold text-xl mb-2">Start a Call</h4>
            <p className="text-slate-400">
              Click "Create Your Agent" and have a 3-5 minute voice conversation with our Setup Agent.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-400">2</span>
            </div>
            <h4 className="font-semibold text-xl mb-2">Describe Your Needs</h4>
            <p className="text-slate-400">
              Tell us who you want to interview, what questions matter, and the tone you prefer.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-400">3</span>
            </div>
            <h4 className="font-semibold text-xl mb-2">Share & Interview</h4>
            <p className="text-slate-400">
              Get your unique interview link. Share it with anyone you want your AI to interview.
            </p>
          </div>
        </div>

        {/* Primary CTA - After all the explanation */}
        <div className="text-center mt-16">
          <Link
            href="/create"
            className="group inline-flex items-center gap-4 bg-green-600 hover:bg-green-500 text-white px-8 py-5 rounded-2xl font-semibold text-xl transition-all hover:scale-105 shadow-lg shadow-green-500/25"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6" />
            </div>
            <span>Create Your Agent Now</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="text-sm text-slate-500 mt-4">
            3-5 minute setup call • No signup required • Free to try
          </p>
        </div>
      </section>

      {/* Portfolio */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <h3 className="text-3xl font-bold text-center mb-4">Our Portfolio</h3>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            AI Interview Agents is part of the Corporate AI Solutions family of products.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <a href="https://raiseready-six.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800 transition">
              <h4 className="font-semibold text-lg mb-2">RaiseReady</h4>
              <p className="text-sm text-slate-400">AI pitch deck coaching for founders</p>
            </a>
            <a href="https://f2k-checkpoint.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800 transition">
              <h4 className="font-semibold text-lg mb-2">Checkpoint</h4>
              <p className="text-sm text-slate-400">Automated founder screening for accelerators</p>
            </a>
            <a href="https://disabilityconnect.netlify.app/" target="_blank" rel="noopener noreferrer" className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800 transition">
              <h4 className="font-semibold text-lg mb-2">DisabilityConnect</h4>
              <p className="text-sm text-slate-400">AI assistants for NDIS providers</p>
            </a>
            <a href="https://whats-your-project.com/grants-directory/" target="_blank" rel="noopener noreferrer" className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800 transition">
              <h4 className="font-semibold text-lg mb-2">GrantBridge</h4>
              <p className="text-sm text-slate-400">AI-powered grant discovery and matching</p>
            </a>
            <a href="http://www.corporateaisolutions.com/cleanclosewaitlist" target="_blank" rel="noopener noreferrer" className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800 transition">
              <h4 className="font-semibold text-lg mb-2">CleanClose</h4>
              <p className="text-sm text-slate-400">AI due diligence for M&A</p>
            </a>
            <a href="https://corporateaisolutions.com/raiseready-white-label/" target="_blank" rel="noopener noreferrer" className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800 transition">
              <h4 className="font-semibold text-lg mb-2">White Label</h4>
              <p className="text-sm text-slate-400">Custom AI solutions for your brand</p>
            </a>
          </div>
        </div>
      </section>

      {/* Contact / Footer */}
      <footer className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-bold mb-4">AI Interview Agents</h3>
              <p className="text-slate-400 mb-6">
                Create custom AI voice interviewers through conversation.
                A product by Corporate AI Solutions.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                <Phone className="w-4 h-4" />
                Create Your Agent
              </Link>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-3 text-slate-400">
                <p><span className="text-slate-500">Founder:</span> Dennis McMahon</p>
                <p>
                  <span className="text-slate-500">Email:</span>{' '}
                  <a href="mailto:dennis@corporateaisolutions.com" className="hover:text-white transition">
                    dennis@corporateaisolutions.com
                  </a>
                </p>
                <p>
                  <span className="text-slate-500">Phone:</span>{' '}
                  <a href="tel:+61402612471" className="hover:text-white transition">
                    +61 402 612 471
                  </a>
                </p>
                <p>
                  <span className="text-slate-500">Website:</span>{' '}
                  <a href="https://www.corporateaisolutions.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    corporateaisolutions.com
                  </a>
                </p>
                <p className="pt-2">
                  <a
                    href="https://calendly.com/mcmdennis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition"
                  >
                    Book a Demo
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-500">
            © 2024 Corporate AI Solutions. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}