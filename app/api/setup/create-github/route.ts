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
    "@elevenlabs/react": "^0.0.2",
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
import { Plus, Users, BarChart3, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Panel { id: string; name: string; description: string; status: string; total_interviews: number; completed_interviews: number; slug: string; }

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('agents').select('*').order('created_at', { ascending: false }).then(({ data }) => { setPanels(data || []); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Interview Panels</h1>
          <a href="/create" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"><Plus className="w-5 h-5" /> Create Panel</a>
        </div>
        {panels.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">No panels yet</h2>
            <p className="text-slate-400 mb-6">Create your first interview panel to get started.</p>
            <a href="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"><Plus className="w-5 h-5" /> Create Panel</a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {panels.map(panel => (
              <div key={panel.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
                <h3 className="text-lg font-semibold text-white mb-2">{panel.name}</h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{panel.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> {panel.completed_interviews || 0} completed</span>
                </div>
                <a href={\`/panel/\${panel.slug}\`} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium">View Panel <ExternalLink className="w-4 h-4" /></a>
              </div>
            ))}
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

interface ParsedPanel { name: string; description: string; tone: string; duration_minutes: number; target_audience: string; interview_type: string; greeting: string; questions: string[]; closing_message: string; }

async function parseTranscriptWithLLM(transcript: string): Promise<ParsedPanel> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: \`Parse this setup transcript and return ONLY JSON: {"name":"panel name","description":"1-2 sentences","tone":"professional/friendly","duration_minutes":15,"target_audience":"who","interview_type":"type","greeting":"opening message","questions":["q1","q2","q3"],"closing_message":"thank you"}

Transcript:
\${transcript}\` }] }),
  });
  if (!response.ok) throw new Error('Claude API error');
  const data = await response.json();
  return JSON.parse(data.content[0].text);
}

async function createElevenLabsAgent(panel: ParsedPanel): Promise<string> {
  const prompt = \`You are an AI interviewer for "\${panel.name}". Context: \${panel.description}. Tone: \${panel.tone}. Questions: \${panel.questions.map((q,i)=>\`\${i+1}. \${q}\`).join('; ')}. Opening: "\${panel.greeting}" Closing: "\${panel.closing_message}"\`;
  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: panel.name, conversation_config: { agent: { prompt: { prompt }, first_message: panel.greeting, language: 'en' }, asr: { quality: 'high', provider: 'elevenlabs' }, turn: { turn_timeout: 10, mode: 'turn_based' }, tts: { voice_id: 'JBFqnCBsd6RMkjVDRZzb' } }, platform_settings: { auth: { enable_auth: false } } }),
  });
  if (!response.ok) throw new Error('ElevenLabs error');
  return (await response.json()).agent_id;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    let transcript = '';
    if (payload.type === 'post_call_transcription' && payload.data?.transcript) {
      transcript = payload.data.transcript.map((t: any) => \`\${t.role}: \${t.message}\`).join('\\n');
    }
    if (!transcript) return NextResponse.json({ success: true, message: 'No transcript' });
    const config = await parseTranscriptWithLLM(transcript);
    const agentId = await createElevenLabsAgent(config);
    const slug = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    const { data: agent, error } = await supabase.from('agents').insert({ name: config.name, slug, description: config.description, elevenlabs_agent_id: agentId, greeting: config.greeting, questions: config.questions, settings: { tone: config.tone, duration_minutes: config.duration_minutes, target_audience: config.target_audience, interview_type: config.interview_type, closing_message: config.closing_message }, status: 'active' }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, agentId: agent.id });
  } catch (error: any) { console.error('Webhook error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function GET() { return NextResponse.json({ status: 'active' }); }`,
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