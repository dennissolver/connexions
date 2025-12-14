import Link from "next/link";
import { Phone, Bot, Zap, ArrowRight, Mic, CheckCircle, Users, Clock, BarChart3, Mail, Calendar, Globe, ExternalLink } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">AI Interview Agents</h1>
            <p className="text-xs text-slate-400">by Corporate AI Solutions</p>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="https://calendly.com/mcmdennis"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 text-slate-400 hover:text-white transition"
            >
              <Calendar className="w-4 h-4" />
              Book a Demo
            </a>
            <Link
              href="/create"
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
            >
              Create Agent
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full text-sm mb-8">
            <Mic className="w-4 h-4" />
            Voice-First AI Technology
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Create AI Voice Agents That Conduct Interviews For You
          </h2>

          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Design custom AI interviewers through a simple conversation.
            No coding. No complex setup. Just tell us what you need —
            and start interviewing at scale within minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25"
            >
              <Phone className="w-6 h-6" />
              Create Your Agent Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://calendly.com/mcmdennis"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition"
            >
              <Calendar className="w-6 h-6" />
              Book a Demo
            </a>
          </div>

          <p className="text-sm text-slate-500">
            Free to get started • No credit card required • Live in 5 minutes
          </p>
        </div>
      </section>

      {/* What Is It */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-4">What Is AI Interview Agents?</h3>
            <p className="text-slate-400 text-center mb-12 text-lg max-w-2xl mx-auto">
              A platform that lets anyone create custom AI-powered voice interviewers —
              without writing a single line of code.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <Bot className="w-10 h-10 text-purple-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">AI That Interviews For You</h4>
                <p className="text-slate-400">
                  Your AI agent conducts natural voice conversations with customers,
                  candidates, or research participants — 24/7, without you lifting a finger.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <Mic className="w-10 h-10 text-purple-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Voice-First Design</h4>
                <p className="text-slate-400">
                  Real conversations, not chatbots. Your interviewees speak naturally
                  with an AI that listens, understands, and asks thoughtful follow-ups.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <Zap className="w-10 h-10 text-purple-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Setup Through Conversation</h4>
                <p className="text-slate-400">
                  No forms or configuration. Just have a voice call with our Setup Agent —
                  describe what you need, and we build your custom interviewer.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <Users className="w-10 h-10 text-purple-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Scale Unlimited</h4>
                <p className="text-slate-400">
                  Interview 10 people or 10,000. Your AI agent handles them all
                  with the same quality, consistency, and attention to detail.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-4">Why Use AI Interview Agents?</h3>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Save time, reduce costs, and get better insights from every conversation.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Save 100+ Hours</h4>
            <p className="text-sm text-slate-400">
              Stop spending hours on repetitive interviews.
              Your AI handles the conversations while you focus on insights.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Consistent Quality</h4>
            <p className="text-sm text-slate-400">
              Every interview follows your methodology perfectly.
              No interviewer fatigue, no missed questions, no bias.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Deeper Insights</h4>
            <p className="text-sm text-slate-400">
              AI captures everything and identifies patterns
              you might miss. Get transcripts, summaries, and analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <h3 className="text-3xl font-bold text-center mb-4">Perfect For Any Interview Type</h3>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Whatever conversations you need to scale, we've got you covered.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { title: 'Customer Discovery', desc: 'Validate problems and solutions with target customers' },
              { title: 'Lead Qualification', desc: 'Screen and qualify leads before sales calls' },
              { title: 'User Research', desc: 'Gather product feedback and usability insights' },
              { title: 'Founder Screening', desc: 'Evaluate startup founders for investment' },
              { title: 'HR Interviews', desc: 'Initial candidate screening at scale' },
              { title: 'Exit Interviews', desc: 'Understand why employees or customers leave' },
              { title: 'Market Research', desc: 'Test concepts and messaging with your audience' },
              { title: 'Compliance Intake', desc: 'Structured data collection for regulated industries' },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-4">Create Your AI Interviewer in 3 Steps</h3>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          No technical skills required. Just have a conversation.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-purple-400">1</span>
            </div>
            <h4 className="font-semibold text-lg mb-2">Start a Call</h4>
            <p className="text-sm text-slate-400">
              Click "Create Your Agent" and start a voice conversation with our Setup Agent.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-purple-400">2</span>
            </div>
            <h4 className="font-semibold text-lg mb-2">Describe Your Needs</h4>
            <p className="text-sm text-slate-400">
              Tell us who you want to interview, what you want to learn, and your preferred style.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-purple-400">3</span>
            </div>
            <h4 className="font-semibold text-lg mb-2">Share & Interview</h4>
            <p className="text-sm text-slate-400">
              Get your unique interview link. Share it with participants. Start collecting insights.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/create"
            className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25"
          >
            <Phone className="w-6 h-6" />
            Create Your Agent Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Other Products - Portfolio */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <h3 className="text-2xl font-bold text-center mb-2">Built by Corporate AI Solutions</h3>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            AI Interview Agents is part of our suite of AI-powered business tools.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <a
              href="https://raiseready-six.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl p-5 hover:bg-slate-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">RaiseReady</h4>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="text-sm text-slate-400">AI pitch coach for founders preparing to raise capital</p>
            </a>
            <a
              href="https://f2k-checkpoint.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl p-5 hover:bg-slate-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">Checkpoint</h4>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="text-sm text-slate-400">AI-powered startup validation and progress tracking</p>
            </a>
            <a
              href="https://disabilityconnect.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl p-5 hover:bg-slate-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">DisabilityConnect</h4>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="text-sm text-slate-400">Connecting disability support services with those who need them</p>
            </a>
            <a
              href="https://whats-your-project.com/grants-directory/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl p-5 hover:bg-slate-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">GrantBridge</h4>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="text-sm text-slate-400">AI-powered grant discovery and application assistance</p>
            </a>
            <a
              href="http://www.corporateaisolutions.com/cleanclosewaitlist"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl p-5 hover:bg-slate-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">CleanClose</h4>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="text-sm text-slate-400">Streamlined property settlement and conveyancing</p>
            </a>
            <a
              href="https://corporateaisolutions.com/raiseready-white-label/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl p-5 hover:bg-slate-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">White Label Solutions</h4>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="text-sm text-slate-400">Custom AI voice agents for your business</p>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-purple-500/20 to-slate-800/50 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-4">Let's Talk</h3>
                <p className="text-slate-300 mb-6">
                  Have questions? Want a custom solution for your business?
                  Get in touch with Dennis McMahon, founder of Corporate AI Solutions.
                </p>

                <div className="space-y-4">
                  <a
                    href="mailto:dennis@corporateaisolutions.com"
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition"
                  >
                    <Mail className="w-5 h-5 text-purple-400" />
                    dennis@corporateaisolutions.com
                  </a>
                  <a
                    href="tel:+61402612471"
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition"
                  >
                    <Phone className="w-5 h-5 text-purple-400" />
                    +61 402 612 471
                  </a>
                  <a
                    href="https://www.corporateaisolutions.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition"
                  >
                    <Globe className="w-5 h-5 text-purple-400" />
                    www.corporateaisolutions.com
                  </a>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-400 mb-4">Ready to see it in action?</p>
                <a
                  href="https://calendly.com/mcmdennis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                >
                  <Calendar className="w-6 h-6" />
                  Book a Meeting
                </a>
                <p className="text-sm text-slate-500 mt-3">
                  Free 30-minute consultation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-800 bg-slate-900">
        <div className="container mx-auto px-4 py-16 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Create Your AI Interviewer?</h3>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Start a voice conversation with our Setup Agent.
            Describe what you need. Get your custom AI interviewer in minutes.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25"
          >
            <Phone className="w-6 h-6" />
            Start Creating Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold">AI Interview Agents</p>
              <p className="text-sm text-slate-500">
                A product of Corporate AI Solutions
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="mailto:dennis@corporateaisolutions.com" className="hover:text-white transition">
                Contact
              </a>
              <a href="https://www.corporateaisolutions.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                Corporate AI Solutions
              </a>
              <a href="https://calendly.com/mcmdennis" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                Book Demo
              </a>
            </div>
          </div>
          <div className="text-center mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Corporate AI Solutions. Built with ❤️ by Dennis McMahon.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}