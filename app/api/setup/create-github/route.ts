// app/api/setup/create-github/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

// ============================================================================
// TEMPLATE FILES - These get pushed to every child repo
// ============================================================================

const TEMPLATE_FILES: Record<string, string> = {
    'package.json': `{
  "name": "connexions-interview-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@elevenlabs/client": "^0.12.2",
    "@elevenlabs/react": "^0.13.0",
    "@google/generative-ai": "^0.24.1",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "@tailwindcss/typography": "^0.5.19",
    "clsx": "^2.1.1",
    "lucide-react": "^0.460.0",
    "next": "14.2.15",
    "openai": "^6.14.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/node": "^20.17.6",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  }
}`,

    'next.config.js': `// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;`,

    'tsconfig.json': `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,

    'tailwind.config.js': `// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        background: 'var(--color-background)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};`,

    'postcss.config.js': `// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,

    '.gitignore': `# Dependencies
/node_modules
/.pnp
.pnp.js

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts`,

    '.env.example': `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ElevenLabs Configuration  
ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_SETUP_AGENT_ID=your-setup-agent-id

# Anthropic (for transcript parsing)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Platform Configuration
NEXT_PUBLIC_PLATFORM_NAME=Your Platform Name
NEXT_PUBLIC_COMPANY_NAME=Your Company Name

# Parent Platform (Connexions) - for centralized evaluation
PARENT_API_URL=https://connexions.vercel.app
PARENT_API_KEY=your-parent-api-key
CHILD_PLATFORM_ID=your-platform-id

# Email (optional - for sending invites)
RESEND_API_KEY=your-resend-api-key`,

    'app/globals.css': `/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #8B5CF6;
  --color-accent: #10B981;
  --color-background: #0F172A;
}

body {
  background-color: var(--color-background);
  color: #F8FAFC;
}`,

    'app/layout.tsx': `// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { clientConfig } from '@/config/client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: clientConfig.platform.name,
  description: clientConfig.platform.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`,

    'app/page.tsx': `// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Mic, FileSpreadsheet, ChevronRight, Users, BarChart3, Clock } from 'lucide-react';
import { clientConfig } from '@/config/client';

export default function HomePage() {
  const [stats, setStats] = useState({ totalPanels: 0, totalInterviews: 0, avgDuration: 0 });

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{clientConfig.platform.name}</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">{clientConfig.platform.description}</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Users, label: 'Interview Panels', value: stats.totalPanels },
            { icon: BarChart3, label: 'Total Interviews', value: stats.totalInterviews },
            { icon: Clock, label: 'Avg Duration (min)', value: stats.avgDuration },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <stat.icon className="w-8 h-8 text-purple-400 mb-3" />
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <a href="/create" className="group bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-8 hover:scale-[1.02] transition-transform">
            <Mic className="w-12 h-12 text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Create Your Agent</h2>
            <p className="text-purple-200 mb-4">Talk to our AI setup assistant to create a custom interview panel in minutes.</p>
            <div className="flex items-center text-white font-medium">Start Now <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></div>
          </a>

          <a href="/panels" className="group bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-slate-700 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-green-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">View Panels</h2>
            <p className="text-slate-400 mb-4">Manage your interview panels, invite participants, and view responses.</p>
            <div className="flex items-center text-green-400 font-medium">View All <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></div>
          </a>
        </div>
      </div>
    </div>
  );
}`,

    'app/create/page.tsx': `// app/create/page.tsx
'use client';
import { useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { clientConfig } from '@/config/client';

export default function CreatePage() {
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_SETUP_AGENT_ID;
      if (!agentId) { alert('Setup agent not configured'); return; }
      await conversation.startSession({ agentId });
    } catch (error) { console.error('Failed to start:', error); alert('Could not access microphone'); }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const { status, isSpeaking } = conversation;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Create Interview Panel</h1>
        <p className="text-slate-400 mb-8">Talk to our AI assistant to set up your custom interview panel.</p>
        
        <div className="relative mb-8">
          <div className={\`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all \${status === 'connected' ? (isSpeaking ? 'bg-green-500/20 ring-4 ring-green-500/50' : 'bg-purple-500/20 ring-4 ring-purple-500/50') : 'bg-slate-800'}\`}>
            {status === 'connecting' ? <Loader2 className="w-12 h-12 text-purple-400 animate-spin" /> : status === 'connected' ? <Mic className="w-12 h-12 text-white" /> : <MicOff className="w-12 h-12 text-slate-500" />}
          </div>
          {status === 'connected' && <p className="mt-4 text-sm text-slate-400">{isSpeaking ? 'AI is speaking...' : 'Listening...'}</p>}
        </div>

        {status !== 'connected' ? (
          <button onClick={startConversation} disabled={status === 'connecting'} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50 transition-colors">
            {status === 'connecting' ? 'Connecting...' : 'Start Setup'}
          </button>
        ) : (
          <button onClick={stopConversation} className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors">End Session</button>
        )}
      </div>
    </div>
  );
}`,

    'app/panels/page.tsx': `// app/panels/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, Users, BarChart3, ExternalLink, Mail, Phone, Building, MapPin, Clock, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Panel { 
  id: string; 
  name: string; 
  description: string; 
  status: string; 
  total_interviews: number; 
  completed_interviews: number; 
  slug: string; 
  created_at: string;
}

interface Interview {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  company_name: string;
  city: string;
  state: string;
  completed_at: string;
  duration_seconds: number;
  summary: string;
  agent_id: string;
}

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'panels' | 'responses'>('panels');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('agents').select('*').order('created_at', { ascending: false }),
      supabase.from('interviews').select('*').eq('status', 'completed').order('completed_at', { ascending: false }).limit(50)
    ]).then(([panelsRes, interviewsRes]) => {
      setPanels(panelsRes.data || []);
      setRecentInterviews(interviewsRes.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>;

  const totalResponses = recentInterviews.length;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">{panels.length} panels · {totalResponses} responses</p>
          </div>
          <a href="/create" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">
            <Plus className="w-5 h-5" /> Create Panel
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-white">{panels.length}</div>
            <div className="text-slate-400 text-sm">Interview Panels</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400">{totalResponses}</div>
            <div className="text-slate-400 text-sm">Total Responses</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400">{panels.filter(p => p.status === 'active').length}</div>
            <div className="text-slate-400 text-sm">Active Panels</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-800">
          <button onClick={() => setActiveTab('panels')} className={\`pb-3 px-1 font-medium transition-colors \${activeTab === 'panels' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}\`}>
            Panels ({panels.length})
          </button>
          <button onClick={() => setActiveTab('responses')} className={\`pb-3 px-1 font-medium transition-colors \${activeTab === 'responses' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}\`}>
            All Responses ({totalResponses})
          </button>
        </div>

        {activeTab === 'panels' ? (
          /* Panels Grid */
          panels.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">No panels yet</h2>
              <p className="text-slate-400 mb-6">Create your first interview panel to get started.</p>
              <a href="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">
                <Plus className="w-5 h-5" /> Create Panel
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {panels.map(panel => (
                <a key={panel.id} href={\`/panel/\${panel.slug}\`} className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">{panel.name}</h3>
                    <span className={\`px-2 py-1 rounded text-xs \${panel.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}\`}>
                      {panel.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{panel.description || 'No description'}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Users className="w-4 h-4" /> {panel.completed_interviews || 0} responses
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          )
        ) : (
          /* All Responses Table */
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {recentInterviews.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No responses yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Participant</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Company</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Location</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Completed</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentInterviews.map(interview => (
                      <tr key={interview.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{interview.first_name} {interview.last_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {interview.email && <div className="flex items-center gap-1 text-slate-300"><Mail className="w-3 h-3" /> {interview.email}</div>}
                            {interview.mobile && <div className="flex items-center gap-1 text-slate-400 mt-1"><Phone className="w-3 h-3" /> {interview.mobile}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {interview.company_name && <div className="flex items-center gap-1 text-slate-300"><Building className="w-3 h-3" /> {interview.company_name}</div>}
                        </td>
                        <td className="px-6 py-4">
                          {(interview.city || interview.state) && (
                            <div className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" /> {[interview.city, interview.state].filter(Boolean).join(', ')}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {interview.duration_seconds ? \`\${Math.round(interview.duration_seconds / 60)}m\` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}`,

    'app/panel/[slug]/page.tsx': `// app/panel/[slug]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Mail, Phone, Building, MapPin, Clock, FileText, Copy, ExternalLink, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

interface Panel {
  id: string;
  name: string;
  description: string;
  slug: string;
  elevenlabs_agent_id: string;
  greeting: string;
  questions: string[];
  settings: any;
  completed_interviews: number;
}

interface Interview {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  company_name: string;
  city: string;
  state: string;
  completed_at: string;
  duration_seconds: number;
  summary: string;
  transcript: string;
  extracted_answers: { question: string; answer: string }[];
}

export default function PanelDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('agents').select('*').eq('slug', slug).single().then(async ({ data: panelData }) => {
      if (panelData) {
        setPanel(panelData);
        const { data: interviewData } = await supabase
          .from('interviews')
          .select('*')
          .eq('agent_id', panelData.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });
        setInterviews(interviewData || []);
      }
      setLoading(false);
    });
  }, [slug]);

  const copyInterviewLink = () => {
    const link = \`\${window.location.origin}/interview/\${panel?.elevenlabs_agent_id}\`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>;
  if (!panel) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-red-400">Panel not found</div></div>;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <a href="/panels" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Panels
          </a>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white">{panel.name}</h1>
              <p className="text-slate-400 mt-1">{panel.description}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={copyInterviewLink} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                {copied ? 'Copied!' : <><Copy className="w-4 h-4" /> Copy Interview Link</>}
              </button>
              <a href={\`/interview/\${panel.elevenlabs_agent_id}\`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">
                <Play className="w-4 h-4" /> Start Interview
              </a>
            </div>
          </div>
          <div className="flex gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4" />
              <span className="text-white font-medium">{interviews.length}</span> responses
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-white font-medium">{panel.settings?.duration_minutes || 10}</span> min avg
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Responses List */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-white mb-4">Responses ({interviews.length})</h2>
            {interviews.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No responses yet</p>
                <p className="text-slate-500 text-sm mt-1">Share the interview link to collect responses</p>
              </div>
            ) : (
              <div className="space-y-2">
                {interviews.map(interview => (
                  <button
                    key={interview.id}
                    onClick={() => setSelectedInterview(interview)}
                    className={\`w-full text-left p-4 rounded-xl border transition-colors \${
                      selectedInterview?.id === interview.id 
                        ? 'bg-purple-600/20 border-purple-500' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }\`}
                  >
                    <div className="font-medium text-white">{interview.first_name} {interview.last_name}</div>
                    <div className="text-sm text-slate-400 mt-1">{interview.company_name || 'No company'}</div>
                    <div className="text-xs text-slate-500 mt-2">
                      {interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Response Detail */}
          <div className="lg:col-span-2">
            {selectedInterview ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Participant Info */}
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {selectedInterview.first_name} {selectedInterview.last_name}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {selectedInterview.email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500" /> {selectedInterview.email}
                      </div>
                    )}
                    {selectedInterview.mobile && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500" /> {selectedInterview.mobile}
                      </div>
                    )}
                    {selectedInterview.company_name && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building className="w-4 h-4 text-slate-500" /> {selectedInterview.company_name}
                      </div>
                    )}
                    {(selectedInterview.city || selectedInterview.state) && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-500" /> {[selectedInterview.city, selectedInterview.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {selectedInterview.summary && (
                  <div className="p-6 border-b border-slate-800">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Summary</h4>
                    <p className="text-white leading-relaxed">{selectedInterview.summary}</p>
                  </div>
                )}

                {/* Q&A */}
                <div className="p-6 border-b border-slate-800">
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Responses</h4>
                  {selectedInterview.extracted_answers?.length > 0 ? (
                    <div className="space-y-4">
                      {selectedInterview.extracted_answers.map((qa, i) => (
                        <div key={i} className="border-l-2 border-purple-500 pl-4">
                          <p className="text-purple-400 text-sm font-medium mb-1">{qa.question}</p>
                          <p className="text-white">{qa.answer}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No extracted answers available</p>
                  )}
                </div>

                {/* Transcript */}
                {selectedInterview.transcript && (
                  <div className="p-6">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Full Transcript</h4>
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded-lg max-h-96 overflow-y-auto">
                      {selectedInterview.transcript}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">Select a response to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`,

    'app/interview/[slug]/page.tsx': `// app/interview/[slug]/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { createClient } from '@/lib/supabase/client';

interface Panel {
  id: string;
  name: string;
  description: string;
  elevenlabs_agent_id: string;
  greeting: string;
  primary_color: string;
}

export default function InterviewPage() {
  const params = useParams();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(false);

  const conversation = useConversation({
    onConnect: () => console.log('Connected to interview'),
    onDisconnect: () => { console.log('Interview ended'); setCallEnded(true); },
    onError: (err) => { console.error('Interview error:', err); setError(err.message); },
  });

  useEffect(() => {
    const supabase = createClient();
    const slug = params.slug as string;
    
    supabase.from('agents').select('*').eq('slug', slug).single().then(({ data, error: err }) => {
      if (err || !data) {
        setError('Interview panel not found');
      } else if (!data.elevenlabs_agent_id) {
        setError('Interview not configured');
      } else {
        setPanel(data);
      }
      setLoading(false);
    });
  }, [params.slug]);

  const startInterview = useCallback(async () => {
    if (!panel?.elevenlabs_agent_id) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: panel.elevenlabs_agent_id });
    } catch (err: any) {
      setError(err.message || 'Failed to start interview');
    }
  }, [panel, conversation]);

  const endInterview = useCallback(async () => {
    await conversation.endSession();
    setCallEnded(true);
  }, [conversation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading interview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <a href="/" className="text-purple-400 hover:text-purple-300">Return Home</a>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Thank You!</h1>
          <p className="text-slate-400">Your interview has been completed and recorded. We appreciate your time and feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-4">{panel?.name}</h1>
        <p className="text-slate-400 mb-8">{panel?.description}</p>

        {conversation.status === 'connected' ? (
          <div className="space-y-8">
            <div className="relative">
              <div className="w-32 h-32 mx-auto bg-purple-600/20 rounded-full flex items-center justify-center animate-pulse">
                <Mic className="w-12 h-12 text-purple-400" />
              </div>
              {conversation.isSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 bg-purple-500/10 rounded-full animate-ping" />
                </div>
              )}
            </div>
            <div className="text-slate-300">
              {conversation.isSpeaking ? 'AI is speaking...' : 'Listening...'}
            </div>
            <button
              onClick={endInterview}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
            >
              <PhoneOff className="w-5 h-5" /> End Interview
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-2">Before you begin</h3>
              <ul className="text-slate-400 text-sm text-left space-y-2">
                <li>• Find a quiet place with minimal background noise</li>
                <li>• The interview takes about 10-15 minutes</li>
                <li>• Speak clearly and naturally</li>
                <li>• Your responses will be recorded</li>
              </ul>
            </div>
            <button
              onClick={startInterview}
              disabled={conversation.status === 'connecting'}
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-full text-lg font-medium transition-colors"
            >
              {conversation.status === 'connecting' ? (
                <>Connecting...</>
              ) : (
                <><Phone className="w-5 h-5" /> Start Interview</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}`,

    'app/api/stats/route.ts': `// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const [{ count: totalPanels }, { count: totalInterviews }, { data: durations }] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('duration_seconds').not('duration_seconds', 'is', null),
    ]);
    const avgDuration = durations?.length ? Math.round(durations.reduce((a, b) => a + (b.duration_seconds || 0), 0) / durations.length / 60) : 0;
    return NextResponse.json({ totalPanels: totalPanels || 0, totalInterviews: totalInterviews || 0, avgDuration });
  } catch { return NextResponse.json({ totalPanels: 0, totalInterviews: 0, avgDuration: 0 }); }
}`,

    'lib/supabase/client.ts': `// lib/supabase/client.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase environment variables');
  client = createSupabaseClient(supabaseUrl, supabaseKey);
  return client;
}`,

    'app/api/webhooks/elevenlabs/route.ts': `// app/api/webhooks/elevenlabs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ============================================================================
// TYPES
// ============================================================================

interface ParsedPanel { 
  name: string; 
  description: string; 
  tone: string; 
  duration_minutes: number; 
  target_audience: string; 
  interview_type: string; 
  greeting: string; 
  questions: string[]; 
  closing_message: string; 
}

interface ParsedInterview {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  company_name: string;
  city: string;
  state: string;
  answers: { question: string; answer: string }[];
  summary: string;
}

// ============================================================================
// LLM PARSING
// ============================================================================

async function parseSetupTranscript(transcript: string): Promise<ParsedPanel> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 
      'x-api-key': process.env.ANTHROPIC_API_KEY!, 
      'content-type': 'application/json', 
      'anthropic-version': '2023-06-01' 
    },
    body: JSON.stringify({ 
      model: 'claude-sonnet-4-20250514', 
      max_tokens: 2000, 
      messages: [{ 
        role: 'user', 
        content: \`Parse this setup transcript and return ONLY valid JSON (no markdown):
{"name":"panel name","description":"1-2 sentences","tone":"professional/friendly/casual","duration_minutes":15,"target_audience":"who will be interviewed","interview_type":"survey/job interview/feedback/research","greeting":"opening message","questions":["q1","q2","q3","q4","q5"],"closing_message":"thank you message"}

Transcript:
\${transcript}\` 
      }] 
    }),
  });
  if (!response.ok) throw new Error('Claude API error');
  const data = await response.json();
  const text = data.content[0].text.replace(/\\\`\\\`\\\`json?|\\n|\\\`\\\`\\\`/g, '').trim();
  return JSON.parse(text);
}

async function parseInterviewTranscript(transcript: string): Promise<ParsedInterview> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 
      'x-api-key': process.env.ANTHROPIC_API_KEY!, 
      'content-type': 'application/json', 
      'anthropic-version': '2023-06-01' 
    },
    body: JSON.stringify({ 
      model: 'claude-sonnet-4-20250514', 
      max_tokens: 3000, 
      messages: [{ 
        role: 'user', 
        content: \`Extract participant info and Q&A from this interview transcript. Return ONLY valid JSON (no markdown):
{
  "first_name": "extracted first name or empty string",
  "last_name": "extracted last name or empty string", 
  "email": "extracted email or empty string",
  "mobile": "extracted phone/mobile or empty string",
  "company_name": "extracted company or empty string",
  "city": "extracted city or empty string",
  "state": "extracted state or empty string",
  "answers": [{"question": "q1", "answer": "a1"}, {"question": "q2", "answer": "a2"}],
  "summary": "2-3 sentence summary of key insights from this interview"
}

Transcript:
\${transcript}\` 
      }] 
    }),
  });
  if (!response.ok) throw new Error('Claude API error');
  const data = await response.json();
  const text = data.content[0].text.replace(/\\\`\\\`\\\`json?|\\n|\\\`\\\`\\\`/g, '').trim();
  return JSON.parse(text);
}

// ============================================================================
// ELEVENLABS AGENT CREATION
// ============================================================================

async function createInterviewAgent(panel: ParsedPanel, webhookUrl: string): Promise<string> {
  const prompt = \`You are an AI interviewer conducting "\${panel.name}".

## Your Role
\${panel.description}. Your tone should be \${panel.tone}.

## IMPORTANT: Collect Participant Info First
Before starting the interview questions, you MUST collect:
1. First name
2. Last name  
3. Email address
4. Mobile/phone number
5. Company name
6. Location (city and state)

Say something like: "Before we begin, I just need to collect a few details. Could you tell me your first name?"
Then continue collecting each piece of info naturally.

## Interview Questions
Once you have their info, proceed with these questions:
\${panel.questions.map((q,i)=>\`\${i+1}. \${q}\`).join('\\n')}

## Guidelines
- Ask ONE question at a time
- Listen actively and ask brief follow-ups if needed
- Keep the conversation natural and \${panel.tone}
- Target duration: \${panel.duration_minutes} minutes

## Closing
When finished: "\${panel.closing_message}"\`;

  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: { 
      'xi-api-key': process.env.ELEVENLABS_API_KEY!, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      name: panel.name, 
      conversation_config: { 
        agent: { 
          prompt: { prompt }, 
          first_message: panel.greeting, 
          language: 'en' 
        }, 
        asr: { quality: 'high', provider: 'elevenlabs' }, 
        turn: { turn_timeout: 15, mode: 'turn_based' }, 
        tts: { voice_id: 'JBFqnCBsd6RMkjVDRZzb' },
        webhooks: {
          post_call: { url: webhookUrl }
        }
      }, 
      platform_settings: { auth: { enable_auth: false } } 
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(\`ElevenLabs error: \${err}\`);
  }
  return (await response.json()).agent_id;
}

// ============================================================================
// EMAIL NOTIFICATION
// ============================================================================

async function sendInterviewNotification(interview: any, agent: any, parsed: ParsedInterview) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[Webhook] No RESEND_API_KEY, skipping notification');
    return;
  }

  // Get platform owner email from clients table or use fallback
  const { data: client } = await supabase.from('clients').select('email, name').limit(1).single();
  const ownerEmail = client?.email || process.env.ADMIN_EMAIL;
  
  if (!ownerEmail) {
    console.log('[Webhook] No owner email configured');
    return;
  }

  const platformUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  
  const emailHtml = \`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1e293b;border-radius:16px;padding:32px;">
      <h1 style="color:#a78bfa;font-size:24px;margin:0 0 24px;">New Interview Completed! 🎉</h1>
      
      <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#fff;margin:0 0 16px;">Panel: \${agent.name}</h3>
        <table style="width:100%;color:#94a3b8;font-size:14px;">
          <tr><td style="padding:4px 0;">Name:</td><td style="color:#fff;">\${parsed.first_name} \${parsed.last_name}</td></tr>
          <tr><td style="padding:4px 0;">Email:</td><td style="color:#fff;">\${parsed.email || 'Not provided'}</td></tr>
          <tr><td style="padding:4px 0;">Mobile:</td><td style="color:#fff;">\${parsed.mobile || 'Not provided'}</td></tr>
          <tr><td style="padding:4px 0;">Company:</td><td style="color:#fff;">\${parsed.company_name || 'Not provided'}</td></tr>
          <tr><td style="padding:4px 0;">Location:</td><td style="color:#fff;">\${parsed.city ? \`\${parsed.city}, \${parsed.state}\` : 'Not provided'}</td></tr>
        </table>
      </div>

      <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#fff;margin:0 0 12px;">Summary</h3>
        <p style="color:#94a3b8;margin:0;line-height:1.6;">\${parsed.summary}</p>
      </div>

      <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#fff;margin:0 0 12px;">Responses</h3>
        \${parsed.answers.map(a => \`
          <div style="margin-bottom:16px;border-left:2px solid #8b5cf6;padding-left:12px;">
            <p style="color:#a78bfa;margin:0 0 4px;font-size:13px;">\${a.question}</p>
            <p style="color:#fff;margin:0;">\${a.answer}</p>
          </div>
        \`).join('')}
      </div>

      <a href="https://\${platformUrl}/panels" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
        View All Responses →
      </a>
    </div>
  </div>
</body>
</html>\`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${resendKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Interview Platform <noreply@updates.corporateaisolutions.com>',
        to: ownerEmail,
        subject: \`New Interview: \${parsed.first_name} \${parsed.last_name} - \${agent.name}\`,
        html: emailHtml,
      }),
    });
    console.log('[Webhook] Notification sent to:', ownerEmail);
  } catch (err) {
    console.error('[Webhook] Failed to send notification:', err);
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('[Webhook] Received:', payload.type);
    
    // Extract transcript
    let transcript = '';
    let conversationId = '';
    
    if (payload.type === 'post_call_transcription' && payload.data?.transcript) {
      transcript = payload.data.transcript.map((t: any) => \`\${t.role}: \${t.message}\`).join('\\n');
      conversationId = payload.data.conversation_id || payload.conversation_id || '';
    } else if (payload.transcript) {
      transcript = Array.isArray(payload.transcript) 
        ? payload.transcript.map((t: any) => \`\${t.role}: \${t.message}\`).join('\\n')
        : payload.transcript;
      conversationId = payload.conversation_id || '';
    }
    
    if (!transcript) {
      return NextResponse.json({ success: true, message: 'No transcript to process' });
    }

    // Determine if this is a SETUP call or an INTERVIEW call
    const agentId = payload.agent_id || payload.data?.agent_id;
    const isSetupAgent = agentId === process.env.NEXT_PUBLIC_ELEVENLABS_SETUP_AGENT_ID;

    if (isSetupAgent) {
      // ========== SETUP CALL: Create new interview panel ==========
      console.log('[Webhook] Processing SETUP call');
      const config = await parseSetupTranscript(transcript);
      
      // Create interview agent with webhook pointing back here
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || \`https://\${process.env.VERCEL_URL}\`;
      const interviewAgentId = await createInterviewAgent(config, \`\${baseUrl}/api/webhooks/elevenlabs\`);
      
      const slug = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      
      const { data: agent, error } = await supabase.from('agents').insert({ 
        name: config.name, 
        slug, 
        description: config.description, 
        elevenlabs_agent_id: interviewAgentId, 
        greeting: config.greeting, 
        questions: config.questions, 
        settings: { 
          tone: config.tone, 
          duration_minutes: config.duration_minutes, 
          target_audience: config.target_audience, 
          interview_type: config.interview_type, 
          closing_message: config.closing_message 
        }, 
        status: 'active' 
      }).select().single();
      
      if (error) throw error;
      console.log('[Webhook] Created panel:', agent.name, '| Agent:', interviewAgentId);
      
      return NextResponse.json({ success: true, panelId: agent.id, agentId: interviewAgentId });
      
    } else {
      // ========== INTERVIEW CALL: Store responses ==========
      console.log('[Webhook] Processing INTERVIEW call');
      
      // Find the agent/panel
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('elevenlabs_agent_id', agentId)
        .single();
      
      if (!agent) {
        console.log('[Webhook] Agent not found for:', agentId);
        return NextResponse.json({ success: true, message: 'Agent not found' });
      }
      
      // Parse interview for participant data and answers
      const parsed = await parseInterviewTranscript(transcript);
      
      // Store interview
      const { data: interview, error } = await supabase.from('interviews').insert({
        agent_id: agent.id,
        elevenlabs_conversation_id: conversationId,
        status: 'completed',
        first_name: parsed.first_name,
        last_name: parsed.last_name,
        email: parsed.email,
        mobile: parsed.mobile,
        company_name: parsed.company_name,
        city: parsed.city,
        state: parsed.state,
        interviewee_name: \`\${parsed.first_name} \${parsed.last_name}\`.trim(),
        interviewee_email: parsed.email,
        transcript,
        summary: parsed.summary,
        extracted_answers: parsed.answers,
        extracted_data: parsed,
        transcript_received: true,
        completed_at: new Date().toISOString(),
        duration_seconds: payload.data?.call_duration_secs || payload.call_duration_secs || 0,
      }).select().single();
      
      if (error) throw error;
      
      // Update agent stats
      await supabase.from('agents').update({
        completed_interviews: agent.completed_interviews + 1,
        total_interviews: agent.total_interviews + 1,
      }).eq('id', agent.id);
      
      // Send notification email
      await sendInterviewNotification(interview, agent, parsed);
      
      console.log('[Webhook] Stored interview:', interview.id);
      return NextResponse.json({ success: true, interviewId: interview.id });
    }
    
  } catch (error: any) { 
    console.error('[Webhook] Error:', error); 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

export async function GET() { 
  return NextResponse.json({ status: 'active', timestamp: new Date().toISOString() }); 
}`,
};

// ============================================================================
// DYNAMIC CONFIG FILE
// ============================================================================

function generateClientConfig(platformName: string, companyName: string, colors: { primary: string; accent: string; background: string }, parentApiUrl?: string) {
  return `// config/client.ts
export const clientConfig = {
  platform: { name: "${platformName}", tagline: "AI-Powered Interview Platform", description: "Conduct structured interviews with AI assistance.", version: "1.0.0" },
  company: { name: "${companyName}", website: "", supportEmail: "support@example.com" },
  theme: { mode: "dark" as "dark" | "light", colors: { primary: "${colors.primary}", accent: "${colors.accent}", background: "${colors.background}" } },
  features: { enableAnalytics: true, enableExport: true },
  parent: { apiUrl: "${parentApiUrl || 'https://connexions.vercel.app'}" },
} as const;

export const getPlatformInfo = () => clientConfig.platform;
export const getCompanyInfo = () => clientConfig.company;
export type ClientConfig = typeof clientConfig;`;
}

function generateReadme(platformName: string, companyName: string, supabaseUrl?: string) {
  return `# ${platformName}

AI Interview Platform for ${companyName}

## Features
- **AI Setup Assistant**: Voice-guided panel creation
- **Interview Panels**: Create multiple interview/survey agents
- **Single Invites**: Send individual interview invitations
- **Bulk Invites**: Upload Excel/CSV to invite multiple participants
- **Magic Links**: Secure, unique links for each interviewee

## Getting Started
1. Install dependencies: \`npm install\`
2. Set up environment variables (see .env.example)
3. Run development server: \`npm run dev\`
`;
}

// ============================================================================
// GITHUB HELPERS
// ============================================================================

async function pushFileToRepo(owner: string, repo: string, path: string, content: string, message: string, headers: HeadersInit): Promise<boolean> {
  try {
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
    let sha: string | undefined;
    if (checkRes.ok) { const existing = await checkRes.json(); sha = existing.sha; }
    const body: any = { message, content: Buffer.from(content).toString('base64') };
    if (sha) body.sha = sha;
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!res.ok) { console.error(`Failed to push ${path}:`, await res.text()); return false; }
    return true;
  } catch (error) { console.error(`Error pushing ${path}:`, error); return false; }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

interface CreateGithubRequest {
  repoName?: string;
  platformName?: string;
  formData?: { platformName?: string; companyName?: string; extractedColors?: { primary?: string; accent?: string; background?: string; }; };
  companyName?: string;
  createdResources?: { supabaseUrl?: string; supabaseAnonKey?: string; childPlatformId?: string; };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGithubRequest = await request.json();
    const { formData, createdResources } = body;
    const repoName = body.repoName || body.platformName;
    const platformName = body.platformName || formData?.platformName || 'AI Interview Platform';
    const companyName = body.companyName || formData?.companyName || 'Your Company';
    const supabaseUrl = createdResources?.supabaseUrl;

    if (!repoName) return NextResponse.json({ error: 'Repository name required' }, { status: 400 });

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';
    if (!token) return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });

    const safeName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };

    console.log('Checking for existing repo:', safeName);
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${safeName}`, { headers });

    if (checkRes.ok) {
      console.log('Repo already exists:', safeName);
      return NextResponse.json({ success: true, repoUrl: `https://github.com/${owner}/${safeName}`, repoName: safeName, alreadyExists: true });
    }

    console.log('Creating repo:', safeName);
    const createRes = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: safeName, description: `AI Interview Platform for ${companyName}`, private: false, auto_init: true }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('Failed to create repo:', error);
      return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 400 });
    }

    console.log('Repo created, waiting for it to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Pushing template files...');
    const colors = { primary: formData?.extractedColors?.primary || '#8B5CF6', accent: formData?.extractedColors?.accent || '#10B981', background: formData?.extractedColors?.background || '#0F172A' };

    for (const [path, content] of Object.entries(TEMPLATE_FILES)) {
      console.log(`Pushing ${path}...`);
      await pushFileToRepo(owner, safeName, path, content, `Add ${path}`, headers);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const parentApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connexions.vercel.app';
    const clientConfigContent = generateClientConfig(platformName, companyName, colors, parentApiUrl);
    await pushFileToRepo(owner, safeName, 'config/client.ts', clientConfigContent, 'Add client config', headers);

    const readmeContent = generateReadme(platformName, companyName, supabaseUrl);
    await pushFileToRepo(owner, safeName, 'README.md', readmeContent, 'Update README', headers);

    console.log('All files pushed successfully!');
    return NextResponse.json({ success: true, repoUrl: `https://github.com/${owner}/${safeName}`, repoName: safeName });

  } catch (error: any) {
    console.error('Create GitHub error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Remove GitHub repository
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { repoName } = await request.json();

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!token) {
      return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });
    }

    const safeName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    };

    console.log('[Cleanup] Deleting GitHub repo:', safeName);

    // Check if repo exists
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${safeName}`, { headers });

    if (!checkRes.ok) {
      console.log('[Cleanup] GitHub repo not found:', safeName);
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // Delete the repository
    const deleteRes = await fetch(`${GITHUB_API}/repos/${owner}/${safeName}`, {
      method: 'DELETE',
      headers,
    });

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const error = await deleteRes.json().catch(() => ({}));
      console.error('[Cleanup] Failed to delete GitHub repo:', error);
      return NextResponse.json({ error: 'Failed to delete repository' }, { status: 400 });
    }

    console.log('[Cleanup] GitHub repo deleted:', safeName);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Cleanup] GitHub delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}