// app/page.tsx
import Link from 'next/link';
import DemoForm from '@/components/DemoForm';
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
          <a href="#demo" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium transition">
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
            compliance audits, and surveys — with observable quality, role adherence, 
            and measurable performance.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#demo" className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-lg font-semibold hover:bg-neutral-200 transition">
              <Mic className="w-5 h-5" />
              Try Free Demo
            </a>
            <Link href="/factory/provision" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-6 py-3.5 rounded-lg font-semibold transition">
              <Rocket className="w-5 h-5" />
              Create Your Platform
            </Link>
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            No credit card required · Experience a live AI interview in 3 minutes
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
                Traditional interviews don't scale. Most AI interview tools lose tone over time, 
                ask inconsistent questions, drift away from their intended role, and give you 
                no way to measure quality.
              </p>
              <p className="text-neutral-400">
                Once deployed, you're blind. No visibility into performance, no alerts when 
                things go wrong, no way to prove compliance.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 text-green-400">Our Solution</h2>
              <p className="text-neutral-300 mb-4">
                Connexions doesn't just run interviews — we evaluate them continuously. 
                Every conversation is assessed for role adherence, goal achievement, 
                and conversation quality.
              </p>
              <p className="text-neutral-400">
                You don't hope it works. You see exactly how it's performing, with alerts 
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
            {[
              { icon: Mic, title: 'Natural Voice Conversations', description: 'ElevenLabs-powered voice AI that sounds human, responds naturally, and keeps conversations flowing.' },
              { icon: BarChart3, title: 'Continuous Evaluation', description: 'Every interview is automatically evaluated for goal achievement, quality, and role adherence.' },
              { icon: Shield, title: 'Drift Detection', description: 'Real-time alerts when your agent starts behaving differently than intended. Catch issues before they become problems.' },
              { icon: Clock, title: 'Instant Deployment', description: 'Go from concept to live interviews in minutes. Our factory provisions your complete platform automatically.' },
              { icon: Users, title: 'Multi-Tenant Ready', description: 'Run different interview types for different audiences. Each agent has its own configuration and analytics.' },
              { icon: FileText, title: 'Rich Transcripts & Exports', description: 'Full conversation transcripts, structured data extraction, and CSV exports for your analysis.' },
            ].map((feature, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <feature.icon className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-400 text-sm">{feature.description}</p>
              </div>
            ))}
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
            {[
              { title: 'Customer Discovery', desc: 'Founders running hundreds of customer interviews to validate product-market fit' },
              { title: 'User Research', desc: 'Product teams gathering qualitative feedback from users at scale' },
              { title: 'Exit Interviews', desc: 'HR teams understanding why employees leave without the awkwardness' },
              { title: 'Compliance Audits', desc: 'Legal teams conducting structured interviews with consistent questioning' },
              { title: 'Grant Applications', desc: 'Researchers gathering standardized data for funding submissions' },
              { title: 'Impact Assessment', desc: 'Nonprofits measuring program outcomes through beneficiary interviews' },
            ].map((useCase, i) => (
              <div key={i} className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
                <h3 className="font-semibold mb-2">{useCase.title}</h3>
                <p className="text-sm text-neutral-400">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-neutral-400">From concept to live interviews in minutes</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Define Your Interview', desc: 'Tell our Setup Agent what you want to learn. Voice or form — your choice.' },
              { step: '2', title: 'We Build Your Agent', desc: 'We create a custom AI interviewer trained on your requirements.' },
              { step: '3', title: 'Share The Link', desc: 'Send your interview link to participants. They talk, AI listens.' },
              { step: '4', title: 'Review Insights', desc: 'Get transcripts, analytics, and quality scores for every conversation.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-400 font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO SECTION */}
      <section id="demo" className="border-t border-neutral-800 py-24 bg-gradient-to-b from-purple-900/20 to-neutral-950">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic className="w-10 h-10 text-purple-400" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Try It Free</h2>
          <p className="text-neutral-300 mb-8">
            Experience an AI interview yourself. Create a custom interviewer, 
            have a live conversation, and see the evaluation in action.
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-left">
            <DemoForm />
            <p className="text-xs text-neutral-500 text-center mt-4">
              Takes ~3 minutes · No credit card · Demo data only
            </p>
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section id="portfolio" className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Platform Solutions Portfolio</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Connexions is built by Corporate AI Solutions. Here's what else we've built 
              for clients across various sectors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'RaiseReady for VCs', desc: 'Pre-filter founders automatically. Save time and effort with AI-powered screening before you take meetings.', url: 'https://corporateaisolutions.com/raiseready-white-label/', color: 'text-blue-400' },
              { icon: Rocket, title: 'RaiseReady for Impact', desc: 'Platform connecting impact founders with aligned investors. Streamlined due diligence and matching.', url: 'https://raiseready-six.vercel.app/', color: 'text-green-400' },
              { icon: FileText, title: 'CleanClose', desc: 'Help founders cleanly close down their venture. Compliance, notifications, and wind-down in one platform.', url: 'https://corporateaisolutions.com/cleanclose/', color: 'text-orange-400' },
              { icon: Heart, title: 'Disability Connect', desc: 'NDIS service matching platform connecting participants with providers based on needs and availability.', url: 'https://disabilityconnect.netlify.app/', color: 'text-pink-400' },
              { icon: Building2, title: 'Grants Directory', desc: 'Comprehensive searchable directory of grants for Australian businesses and projects.', url: 'https://whats-your-project.com/grants-directory/', color: 'text-yellow-400' },
              { icon: Briefcase, title: 'F2K Checkpoint', desc: 'Founder-to-market checkpoint tool for startup validation and progress tracking.', url: 'https://f2k-checkpoint-new.vercel.app/', color: 'text-purple-400' },
            ].map((project, i) => (
              <a key={i} href={project.url} target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition group">
                <project.icon className={`w-8 h-8 ${project.color} mb-4`} />
                <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">{project.title}</h3>
                <p className="text-sm text-neutral-400">{project.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-neutral-400 mb-8">
            No hidden fees. No per-seat charges. Just usage-based pricing that scales with you.
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
            <div className="text-4xl font-bold mb-2">$150<span className="text-lg text-neutral-400">/month</span></div>
            <p className="text-neutral-400 mb-6">Your own AI interview platform</p>
            
            <ul className="text-left space-y-3 mb-8">
              {['Unlimited interview agents', '100 interviews included', 'Full analytics dashboard', 'Drift detection & alerts', 'CSV exports', 'Priority support'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-neutral-300">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-sm text-neutral-500 mb-6">+ $4 per interview above 100</p>

            <Link href="/factory/provision" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-lg font-semibold transition">
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
              <h2 className="text-3xl font-bold mb-4">Let's Talk</h2>
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
                We're a boutique AI consultancy specializing in platform solutions 
                for venture capital, impact investing, disability services, and 
                founder support organizations.
              </p>
              <p className="text-neutral-400 text-sm mb-6">
                From white-label SaaS platforms to custom AI agents, we build 
                technology that solves real business problems.
              </p>
              
              <div className="flex items-center gap-4">
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
            © 2024 Corporate AI Solutions. Built for production use. Designed for observability.
          </p>
        </div>
      </footer>
    </main>
  );
}