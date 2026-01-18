// app/page.tsx
import Link from 'next/link';
import {
  Mic, BarChart3, Shield, Clock, Users, Zap,
  Phone, Mail, MessageCircle, ArrowRight, CheckCircle,
  Building2, Briefcase, Heart, Rocket, FileText, Target,
  Brain, Search, Sparkles, TrendingUp, MessageSquare, Layers,
  PieChart, Database, LineChart
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
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#insights" className="hover:text-white transition">Insights</a>
            <a href="#use-cases" className="hover:text-white transition">Use Cases</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
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
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-sm text-purple-400 mb-6">
            <Sparkles className="w-4 h-4" />
            AI Research Platform for Market Intelligence
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Run thousands of interviews.<br />
            <span className="text-purple-400">Get insights in minutes.</span>
          </h1>

          <p className="mt-6 text-xl text-neutral-300 leading-relaxed">
            Connexions combines AI voice interviews with intelligent analysis.
            Conduct research at scale, then ask questions across your entire dataset
            and get synthesized insights instantly.
          </p>

          <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-neutral-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>~$3.50 per interview vs $150+ traditional</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>24/7 availability, no scheduling</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Instant cross-interview analysis</span>
            </div>
          </div>

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
            No credit card required for demo • Platform subscription $150/month
          </p>
        </div>
      </section>

      {/* SOCIAL PROOF / STATS */}
      <section className="border-t border-b border-neutral-800 py-12 bg-neutral-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-400">97%</div>
              <div className="text-sm text-neutral-400 mt-1">Cost reduction vs traditional</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-sm text-neutral-400 mt-1">Always available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">&lt;5min</div>
              <div className="text-sm text-neutral-400 mt-1">Insight generation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">100%</div>
              <div className="text-sm text-neutral-400 mt-1">Consistent methodology</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - THE PIPELINE */}
      <section id="how-it-works" className="border-b border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">From Interviews to Intelligence</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              A complete research pipeline that handles collection, analysis, and synthesis
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-full">
                <Mic className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Collect</h3>
                <p className="text-neutral-400 text-sm mb-4">
                  AI voice agents conduct natural conversations 24/7. Share a link with participants
                  and interviews happen on their schedule.
                </p>
                <ul className="text-sm text-neutral-500 space-y-1">
                  <li>• Natural voice conversations</li>
                  <li>• Consistent methodology</li>
                  <li>• Automatic transcription</li>
                </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-full">
                <BarChart3 className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Evaluate</h3>
                <p className="text-neutral-400 text-sm mb-4">
                  Every interview is automatically assessed for quality, goal achievement,
                  and agent performance. Catch drift before it affects your data.
                </p>
                <ul className="text-sm text-neutral-500 space-y-1">
                  <li>• Quality scoring</li>
                  <li>• Drift detection alerts</li>
                  <li>• Structured data extraction</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-full border-purple-500/50">
                <Brain className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analyze with Kira</h3>
                <p className="text-neutral-400 text-sm mb-4">
                  Ask questions across your entire interview dataset. Get synthesized themes,
                  patterns, and insights backed by specific quotes.
                </p>
                <ul className="text-sm text-neutral-500 space-y-1">
                  <li>• Semantic search across all interviews</li>
                  <li>• Cross-interview synthesis</li>
                  <li>• Citation-backed insights</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KIRA - THE INSIGHTS ENGINE */}
      <section id="insights" className="py-20 bg-gradient-to-b from-purple-950/20 to-neutral-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1 text-sm text-purple-400 mb-4">
                <Sparkles className="w-4 h-4" />
                Introducing Kira
              </div>
              <h2 className="text-3xl font-bold mb-4">Your AI Research Analyst</h2>
              <p className="text-neutral-300 mb-6">
                Kira transforms raw interview transcripts into actionable intelligence.
                Instead of reading hundreds of transcripts manually, ask questions in
                natural language and get synthesized answers in seconds.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Search className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Semantic Search</h4>
                    <p className="text-sm text-neutral-400">Find relevant insights across all interviews using natural language queries, not just keyword matching.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Theme Synthesis</h4>
                    <p className="text-sm text-neutral-400">Automatically identify recurring patterns and themes across your entire dataset.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Cited Responses</h4>
                    <p className="text-sm text-neutral-400">Every insight links back to specific quotes and interviews for verification.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Trend Analysis</h4>
                    <p className="text-sm text-neutral-400">Track how sentiment and themes evolve over time across interview waves.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Kira Demo/Visualization */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">Kira</div>
                  <div className="text-xs text-neutral-500">AI Research Analyst</div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Example Query */}
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 mb-1">Your question</div>
                  <p className="text-sm">"What are the main frustrations users mention about the current onboarding process?"</p>
                </div>

                {/* Example Response */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="text-xs text-purple-400 mb-2">Analysis from 47 interviews</div>
                  <p className="text-sm text-neutral-300 mb-3">
                    Three primary frustrations emerged across interviews:
                  </p>
                  <ol className="text-sm text-neutral-400 space-y-2 ml-4">
                    <li><strong className="text-neutral-300">1. Too many steps</strong> - 23 participants mentioned feeling overwhelmed by the number of screens (cited in INT-012, INT-034, INT-041...)</li>
                    <li><strong className="text-neutral-300">2. Unclear progress</strong> - 18 participants didn't know how far along they were in the process</li>
                    <li><strong className="text-neutral-300">3. Mobile issues</strong> - 12 participants had specific complaints about the mobile experience</li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Clock className="w-3 h-3" />
                  <span>Generated in 4.2 seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON - WHY THIS MATTERS */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Traditional Research vs Connexions</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              See how AI-powered research transforms your workflow and budget
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-2 text-red-400 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-semibold">Traditional Research</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-neutral-400">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>$150-300 per interview (recruiter + moderator + facility)</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-400">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>2-4 weeks to schedule and conduct 50 interviews</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-400">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>Manual transcript analysis taking days or weeks</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-400">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>Interviewer bias and inconsistent questioning</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-400">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>Limited to business hours in specific time zones</span>
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-neutral-800">
                <div className="text-neutral-500 text-sm">100 interviews</div>
                <div className="text-2xl font-bold text-red-400">$15,000 - $30,000</div>
              </div>
            </div>

            {/* Connexions */}
            <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold">With Connexions</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-neutral-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>~$3.50 per interview, all-inclusive</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Interviews happen 24/7 as participants are available</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Instant analysis with Kira - ask questions, get answers</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>100% consistent methodology across all interviews</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Global reach - any time zone, any language</span>
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-purple-500/30">
                <div className="text-neutral-500 text-sm">100 interviews (included in plan)</div>
                <div className="text-2xl font-bold text-green-400">$150/month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Research at Scale</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Organizations using Connexions for high-volume structured conversations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Target className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold mb-2">Market Research Firms</h3>
              <p className="text-sm text-neutral-400 mb-3">Run hundreds of customer interviews with consistent methodology, then use Kira to synthesize findings for client reports.</p>
              <div className="text-xs text-purple-400">Example: 500 interviews → Executive summary in hours</div>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Users className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-semibold mb-2">UX Research Teams</h3>
              <p className="text-sm text-neutral-400 mb-3">Gather continuous product feedback without scheduling bottlenecks. Track sentiment shifts across releases.</p>
              <div className="text-xs text-green-400">Example: Ongoing user interviews → Weekly trend reports</div>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Briefcase className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-semibold mb-2">HR & People Teams</h3>
              <p className="text-sm text-neutral-400 mb-3">Capture honest feedback from exit interviews. Identify patterns in employee experience across departments.</p>
              <div className="text-xs text-blue-400">Example: Exit interviews → Retention insights</div>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Shield className="w-8 h-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold mb-2">Compliance & Audit</h3>
              <p className="text-sm text-neutral-400 mb-3">Structured interviews with full audit trails. Consistent questioning and automatic scoring for regulatory requirements.</p>
              <div className="text-xs text-yellow-400">Example: Compliance checks → Audit-ready documentation</div>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Heart className="w-8 h-8 text-red-400 mb-3" />
              <h3 className="font-semibold mb-2">Healthcare Research</h3>
              <p className="text-sm text-neutral-400 mb-3">Patient check-ins and clinical trial feedback with empathetic, consistent interactions and structured data capture.</p>
              <div className="text-xs text-red-400">Example: Patient follow-ups → Care pathway insights</div>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
              <Building2 className="w-8 h-8 text-indigo-400 mb-3" />
              <h3 className="font-semibold mb-2">Investment Due Diligence</h3>
              <p className="text-sm text-neutral-400 mb-3">Standardized founder interviews for portfolio screening. Compare responses across deals with semantic search.</p>
              <div className="text-xs text-indigo-400">Example: Founder interviews → Investment memo inputs</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              A complete platform for AI-powered research, not just an interview tool
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <Mic className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Voice AI</h3>
              <p className="text-neutral-400 text-sm">Natural ElevenLabs-powered conversations</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <Brain className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Kira Insights</h3>
              <p className="text-neutral-400 text-sm">AI analyst for cross-interview synthesis</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <Search className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Semantic Search</h3>
              <p className="text-neutral-400 text-sm">Find insights with natural language</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <BarChart3 className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Auto-Evaluation</h3>
              <p className="text-neutral-400 text-sm">Quality scoring for every interview</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <Shield className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Drift Detection</h3>
              <p className="text-neutral-400 text-sm">Alerts when agents deviate</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <Database className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Structured Data</h3>
              <p className="text-neutral-400 text-sm">Auto-extract fields from conversations</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <FileText className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Full Transcripts</h3>
              <p className="text-neutral-400 text-sm">Complete conversation records</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <LineChart className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Trend Tracking</h3>
              <p className="text-neutral-400 text-sm">Monitor changes over time</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-neutral-400">
              No hidden fees. No per-seat charges. Everything included.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-4xl font-bold mb-2">$150<span className="text-lg text-neutral-400">/month</span></div>
                <p className="text-neutral-400 mb-6">Your complete AI research platform</p>

                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span><strong>100 completed interviews</strong> included</span>
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span><strong>Unlimited interview panels</strong></span>
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span><strong>Kira AI analyst</strong> - unlimited queries</span>
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Semantic search across all data</span>
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Auto-evaluation and drift detection</span>
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Full transcripts and CSV exports</span>
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>

              <div className="bg-neutral-800/50 rounded-lg p-6">
                <h4 className="font-semibold mb-4">How it works</h4>
                <p className="text-sm text-neutral-400 mb-4">
                  A completed interview is counted when a participant finishes a conversation.
                  You could run 20 different research panels with 5 participants each, or
                  one panel with 100 participants.
                </p>

                <div className="border-t border-neutral-700 pt-4 mt-4">
                  <h4 className="font-semibold mb-2">Need more volume?</h4>
                  <p className="text-sm text-neutral-400 mb-2">
                    Additional interviews are <strong className="text-neutral-300">$5 each</strong>, billed in arrears.
                  </p>
                  <p className="text-sm text-neutral-500">
                    High-volume plans available for 500+ interviews/month.
                  </p>
                </div>

                <Link
                  href="/buyer"
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg font-semibold transition"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section className="border-t border-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">See It In Action</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Live platforms built on Connexions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="https://universal-interviews.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-purple-500/50 transition group">
              <Mic className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">Universal Interviews</h3>
              <p className="text-sm text-neutral-400">Try the AI interview experience yourself.</p>
            </a>
            <a href="https://investor-connect.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-purple-500/50 transition group">
              <Users className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">Investor Connect</h3>
              <p className="text-sm text-neutral-400">AI-powered VC research interviews.</p>
            </a>
            <a href="https://grants-2025.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-purple-500/50 transition group">
              <FileText className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">Grants Directory</h3>
              <p className="text-sm text-neutral-400">Searchable directory of Australian grants.</p>
            </a>
            <a href="https://f2k-checkpoint-new.vercel.app/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-purple-500/50 transition group">
              <Briefcase className="w-8 h-8 text-yellow-400 mb-4" />
              <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition">F2K Checkpoint</h3>
              <p className="text-sm text-neutral-400">Founder validation and tracking.</p>
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-neutral-800 py-20 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Let's Talk</h2>
              <p className="text-neutral-400 mb-8">
                Questions about Connexions? Need a custom solution for high-volume research?
                We work with organizations across market research, UX, HR, and healthcare.
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
                We're a boutique AI consultancy specializing in research and interview
                automation. We help organizations move from manual research processes
                to AI-powered intelligence gathering.
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
            © 2025 Corporate AI Solutions. AI-powered research at scale.
          </p>
        </div>
      </footer>
    </main>
  );
}