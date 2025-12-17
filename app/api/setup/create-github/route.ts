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
ELEVENLABS_SETUP_AGENT_ID=your-setup-agent-id

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

  // ============================================================================
  // MAIN PAGE - AI Setup Agent
  // ============================================================================
  'app/page.tsx': `// app/page.tsx
import { Suspense } from 'react';
import SetupClient from './SetupClient';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <SetupClient />
    </Suspense>
  );
}`,

  // ============================================================================
  // SETUP CLIENT - Main AI Agent Setup Flow
  // ============================================================================
  'app/SetupClient.tsx': `// app/SetupClient.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, Loader2, CheckCircle, Plus,
  ArrowRight, MessageSquare, Bot, Users
} from 'lucide-react';
import VoiceAvatar from './components/VoiceAvatar';
import { clientConfig } from '@/config/client';
import { createClient } from '@/lib/supabase';

type SetupState =
  | 'loading'
  | 'dashboard'
  | 'ready_for_setup'
  | 'setup_in_progress'
  | 'processing'
  | 'panel_ready'
  | 'error';

interface Panel {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function SetupClient() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetMountedRef = useRef(false);

  const [state, setState] = useState<SetupState>('loading');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [currentPanelId, setCurrentPanelId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showWidget, setShowWidget] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const SETUP_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_SETUP_AGENT_ID || '';

  useEffect(() => {
    const existingScript = document.querySelector('script[src*="elevenlabs.io/convai-widget"]');
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!showWidget || !SETUP_AGENT_ID || !scriptLoaded || !widgetContainerRef.current) return;
    if (widgetMountedRef.current) return;

    const timeoutId = setTimeout(() => {
      if (widgetContainerRef.current && !widgetMountedRef.current) {
        widgetMountedRef.current = true;
        widgetContainerRef.current.innerHTML = \`<elevenlabs-convai agent-id="\${SETUP_AGENT_ID}"></elevenlabs-convai>\`;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showWidget, SETUP_AGENT_ID, scriptLoaded]);

  useEffect(() => {
    loadPanels();
  }, []);

  async function loadPanels() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('agents')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: false });
      
      setPanels(data || []);
      setState(data && data.length > 0 ? 'dashboard' : 'ready_for_setup');
    } catch (err) {
      console.error('Failed to load panels:', err);
      setState('ready_for_setup');
    }
  }

  const startSetupCall = async () => {
    widgetMountedRef.current = false;
    setState('setup_in_progress');
    setShowWidget(true);
  };

  const endCall = async () => {
    setShowWidget(false);
    widgetMountedRef.current = false;
    if (widgetContainerRef.current) widgetContainerRef.current.innerHTML = '';
    setState('processing');
    
    const checkForNewPanel = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('agents')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const latestPanel = data[0];
        if (!panels.find(p => p.id === latestPanel.id)) {
          setCurrentPanelId(latestPanel.id);
          setState('panel_ready');
          return;
        }
      }
      setTimeout(checkForNewPanel, 2000);
    };
    
    setTimeout(checkForNewPanel, 3000);
  };

  const WidgetContainer = () => (
    <div ref={widgetContainerRef} className={\`mb-6 min-h-[80px] \${showWidget ? 'block' : 'hidden'}\`} />
  );

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading...</p>
          </div>
        );

      case 'dashboard':
        return (
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">{clientConfig.platform.name}</h1>
                <p className="text-slate-400">{clientConfig.company.name}</p>
              </div>
              <button
                onClick={() => setState('ready_for_setup')}
                className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                New Panel
              </button>
            </div>

            <div className="grid gap-4">
              {panels.map((panel) => (
                <div key={panel.id} className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">{panel.name}</h3>
                      <p className="text-sm text-slate-400">{panel.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={\`/i/\${panel.id}\`} target="_blank" className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition">
                      <MessageSquare className="w-4 h-4" />
                      Test
                    </a>
                    <a href={\`/panel/\${panel.id}/invite\`} className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition">
                      <Users className="w-4 h-4" />
                      Invite
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ready_for_setup':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar size="lg" label="AI Setup Assistant" />
            <h1 className="text-3xl font-bold mb-4">{panels.length > 0 ? 'Create New Panel' : 'Welcome!'}</h1>
            <p className="text-slate-300 mb-2">{panels.length > 0 ? "Let's set up another interview panel." : "Let's create your first AI interview panel."}</p>
            <p className="text-slate-400 mb-8">Tell the assistant what kind of interviews or surveys you want to run.</p>
            <button
              onClick={startSetupCall}
              disabled={!SETUP_AGENT_ID || !scriptLoaded}
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25 disabled:opacity-50"
            >
              <Phone className="w-6 h-6" />
              {scriptLoaded ? 'Start Setup Call' : 'Loading...'}
            </button>
            {panels.length > 0 && (
              <button onClick={() => setState('dashboard')} className="block mx-auto mt-4 text-slate-400 hover:text-white transition">
                Back to Dashboard
              </button>
            )}
            <WidgetContainer />
          </div>
        );

      case 'setup_in_progress':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar isActive isSpeaking size="lg" label="Speaking..." />
            <h2 className="text-2xl font-bold text-green-400 mb-4">Call in Progress</h2>
            <p className="text-slate-400 mb-6">Describe your interview panel. When finished, click End Call.</p>
            <WidgetContainer />
            <button onClick={endCall} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-medium transition">
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar isActive size="lg" label="Creating panel..." />
            <h2 className="text-2xl font-bold mb-4">Creating Your Panel</h2>
            <p className="text-slate-400 mb-8">Processing your requirements...</p>
            <div className="space-y-3 text-left bg-slate-900 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-slate-300">Setup conversation captured</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <span className="text-purple-400">Building interview agent...</span>
              </div>
            </div>
          </div>
        );

      case 'panel_ready':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar size="lg" label="Panel ready!" />
            <h2 className="text-3xl font-bold text-green-400 mb-4">Panel Created!</h2>
            <p className="text-slate-400 mb-8">Your interview panel is ready. You can now invite interviewees.</p>
            <div className="flex flex-col gap-3">
              <a href={\`/panel/\${currentPanelId}/complete\`} className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg font-semibold transition">
                View Panel & Invite
                <ArrowRight className="w-5 h-5" />
              </a>
              <button onClick={() => { loadPanels(); setState('dashboard'); }} className="text-slate-400 hover:text-white transition">
                Go to Dashboard
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something Went Wrong</h2>
            <p className="text-slate-400 mb-8">{error}</p>
            <button onClick={() => setState('ready_for_setup')} className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg">
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      {renderContent()}
    </div>
  );
}`,

  // ============================================================================
  // VOICE AVATAR COMPONENT
  // ============================================================================
  'app/components/VoiceAvatar.tsx': `// app/components/VoiceAvatar.tsx
'use client';

import { Bot } from 'lucide-react';

interface VoiceAvatarProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function VoiceAvatar({ isActive = false, isSpeaking = false, size = 'md', label }: VoiceAvatarProps) {
  const sizeClasses = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
  const iconSizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative">
        {isActive && (
          <>
            <div className={\`absolute inset-0 \${sizeClasses[size]} rounded-full bg-purple-500/20 animate-ping\`} />
            <div className={\`absolute inset-0 \${sizeClasses[size]} rounded-full bg-purple-500/10 animate-pulse\`} />
          </>
        )}
        {isSpeaking && <div className={\`absolute inset-0 \${sizeClasses[size]} rounded-full border-4 border-green-400 animate-pulse\`} />}
        <div className={\`relative \${sizeClasses[size]} rounded-full flex items-center justify-center \${isActive ? 'bg-gradient-to-br from-purple-600 to-purple-800' : 'bg-slate-800'} shadow-xl\`}>
          <Bot className={\`\${iconSizes[size]} \${isActive ? 'text-white' : 'text-purple-400'}\`} />
        </div>
      </div>
      {label && <p className={\`mt-3 text-sm \${isActive ? 'text-green-400' : 'text-slate-400'}\`}>{label}</p>}
    </div>
  );
}`,

  // ============================================================================
  // PANEL COMPLETE PAGE
  // ============================================================================
  'app/panel/[panelId]/complete/page.tsx': `// app/panel/[panelId]/complete/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, Users, Phone, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Panel { id: string; name: string; description: string; }

export default function PanelCompletePage() {
  const params = useParams();
  const panelId = params.panelId as string;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [interviewUrl, setInterviewUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setInterviewUrl(\`\${window.location.origin}/i/\${panelId}\`);
    loadPanel();
  }, [panelId]);

  async function loadPanel() {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('agents').select('*').eq('id', panelId).single();
      setPanel(data);
    } catch (err) {
      console.error('Failed to load panel:', err);
    } finally {
      setLoading(false);
    }
  }

  const copyLink = () => { navigator.clipboard.writeText(interviewUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;
  if (!panel) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="text-center"><h1 className="text-2xl font-bold mb-4">Panel Not Found</h1><Link href="/" className="text-purple-400">Go to Dashboard</Link></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-green-400" /></div>
          <h1 className="text-3xl font-bold mb-2">Great Work!</h1>
          <p className="text-xl text-slate-300">Your <span className="text-purple-400">{panel.name}</span> panel is ready</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-6 mb-6">
          <label className="block text-sm text-slate-400 mb-2">Interview Link</label>
          <div className="flex gap-2">
            <input type="text" value={interviewUrl} readOnly className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm" />
            <button onClick={copyLink} className={\`px-4 py-2 rounded-lg flex items-center gap-2 transition \${copied ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-500'}\`}>
              <Copy className="w-4 h-4" />{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link href={\`/i/\${panelId}\`} className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 px-6 py-4 rounded-xl font-semibold transition"><Phone className="w-5 h-5" />Test Interview</Link>
          <Link href={\`/panel/\${panelId}/invite\`} className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 px-6 py-4 rounded-xl font-semibold transition"><Users className="w-5 h-5" />Invite Interviewees</Link>
        </div>
        <div className="text-center mt-8"><Link href="/" className="text-slate-400 hover:text-white transition">← Back to Dashboard</Link></div>
      </div>
    </div>
  );
}`,

  // ============================================================================
  // INVITE PAGE - Single & Bulk Invites
  // ============================================================================
  'app/panel/[panelId]/invite/page.tsx': `// app/panel/[panelId]/invite/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Upload, Send, Loader2, CheckCircle, AlertCircle, Download, ArrowLeft, FileSpreadsheet, X, User } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Panel { id: string; name: string; }
interface Interviewee { name: string; email: string; custom_field?: string; }
interface InviteResult { email: string; success: boolean; error?: string; }

export default function InvitePage() {
  const params = useParams();
  const panelId = params.panelId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [sendingSingle, setSendingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<InviteResult | null>(null);
  const [bulkInterviewees, setBulkInterviewees] = useState<Interviewee[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<InviteResult[]>([]);
  const [parseError, setParseError] = useState('');

  useEffect(() => { loadPanel(); }, [panelId]);

  async function loadPanel() {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('agents').select('id, name').eq('id', panelId).single();
      setPanel(data);
    } catch (err) { console.error('Failed to load panel:', err); }
    finally { setLoading(false); }
  }

  async function handleSingleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSendingSingle(true);
    setSingleResult(null);
    try {
      const res = await fetch('/api/invites/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ panelId, interviewees: [{ name: singleName, email: singleEmail }] }) });
      const data = await res.json();
      if (res.ok && data.results?.[0]) { setSingleResult(data.results[0]); if (data.results[0].success) { setSingleName(''); setSingleEmail(''); } }
      else { setSingleResult({ email: singleEmail, success: false, error: data.error || 'Failed to send' }); }
    } catch (err) { setSingleResult({ email: singleEmail, success: false, error: 'Network error' }); }
    finally { setSendingSingle(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setBulkInterviewees([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/invites/parse-excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.interviewees) setBulkInterviewees(data.interviewees);
      else setParseError(data.error || 'Failed to parse file');
    } catch (err) { setParseError('Failed to upload file'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleBulkInvite() {
    if (bulkInterviewees.length === 0) return;
    setSendingBulk(true);
    setBulkResults([]);
    try {
      const res = await fetch('/api/invites/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ panelId, interviewees: bulkInterviewees }) });
      const data = await res.json();
      if (res.ok && data.results) { setBulkResults(data.results); const failedEmails = data.results.filter((r: InviteResult) => !r.success).map((r: InviteResult) => r.email); setBulkInterviewees(bulkInterviewees.filter(i => failedEmails.includes(i.email))); }
    } catch (err) { console.error('Bulk invite error:', err); }
    finally { setSendingBulk(false); }
  }

  function downloadTemplate() {
    const csv = 'name,email,custom_field\\nJohn Doe,john@example.com,Sales Team\\nJane Smith,jane@example.com,Marketing';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'interviewees_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href={\`/panel/\${panelId}/complete\`} className="text-slate-400 hover:text-white flex items-center gap-2 mb-4"><ArrowLeft className="w-4 h-4" />Back to Panel</Link>
          <h1 className="text-2xl font-bold">Invite Interviewees</h1>
          <p className="text-slate-400">{panel?.name}</p>
        </div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('single')} className={\`px-4 py-2 rounded-lg flex items-center gap-2 transition \${activeTab === 'single' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}\`}><User className="w-4 h-4" />Single Invite</button>
          <button onClick={() => setActiveTab('bulk')} className={\`px-4 py-2 rounded-lg flex items-center gap-2 transition \${activeTab === 'bulk' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}\`}><FileSpreadsheet className="w-4 h-4" />Bulk Upload</button>
        </div>
        {activeTab === 'single' && (
          <div className="bg-slate-900 rounded-2xl p-6">
            <form onSubmit={handleSingleInvite} className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">Name</label><input type="text" value={singleName} onChange={(e) => setSingleName(e.target.value)} placeholder="John Doe" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" required /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Email</label><input type="email" value={singleEmail} onChange={(e) => setSingleEmail(e.target.value)} placeholder="john@example.com" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" required /></div>
              {singleResult && <div className={\`p-3 rounded-lg flex items-center gap-2 \${singleResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}\`}>{singleResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{singleResult.success ? 'Invite sent successfully!' : singleResult.error}</div>}
              <button type="submit" disabled={sendingSingle} className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50">{sendingSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Invite</button>
            </form>
          </div>
        )}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4"><h3 className="font-medium">Upload Excel or CSV</h3><button onClick={downloadTemplate} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"><Download className="w-4 h-4" />Download Template</button></div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl p-8 flex flex-col items-center gap-2 transition"><Upload className="w-8 h-8 text-slate-400" /><span className="text-slate-400">Click to upload .xlsx, .xls, or .csv</span><span className="text-xs text-slate-500">Required columns: name, email</span></button>
              {parseError && <div className="mt-4 p-3 bg-red-500/20 text-red-400 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" />{parseError}</div>}
            </div>
            {bulkInterviewees.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4"><h3 className="font-medium">{bulkInterviewees.length} interviewees ready</h3><button onClick={() => setBulkInterviewees([])} className="text-sm text-slate-400 hover:text-red-400">Clear All</button></div>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">{bulkInterviewees.map((person, i) => (<div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2"><div><span className="font-medium">{person.name}</span><span className="text-slate-400 ml-2">{person.email}</span></div><button onClick={() => setBulkInterviewees(bulkInterviewees.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button></div>))}</div>
                <button onClick={handleBulkInvite} disabled={sendingBulk} className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50">{sendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send All Invites</button>
              </div>
            )}
            {bulkResults.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-6"><h3 className="font-medium mb-4">Results</h3><div className="space-y-2">{bulkResults.map((result, i) => (<div key={i} className={\`flex items-center gap-2 p-2 rounded-lg \${result.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}\`}>{result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span>{result.email}</span>{!result.success && <span className="text-xs">- {result.error}</span>}</div>))}</div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}`,

  // ============================================================================
  // API: SEND INVITES
  // ============================================================================
  'app/api/invites/send/route.ts': `// app/api/invites/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clientConfig } from '@/config/client';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface Interviewee { name: string; email: string; custom_field?: string; }

export async function POST(request: NextRequest) {
  try {
    const { panelId, interviewees } = await request.json();
    if (!panelId || !interviewees || !Array.isArray(interviewees)) return NextResponse.json({ error: 'Panel ID and interviewees array required' }, { status: 400 });

    const { data: panel } = await supabase.from('agents').select('name').eq('id', panelId).single();
    if (!panel) return NextResponse.json({ error: 'Panel not found' }, { status: 404 });

    const results = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    for (const person of interviewees as Interviewee[]) {
      try {
        const token = crypto.randomUUID();
        const { error: dbError } = await supabase.from('interviewees').insert({ agent_id: panelId, name: person.name, email: person.email, custom_field: person.custom_field, invite_token: token, status: 'invited' }).select().single();
        if (dbError) throw dbError;

        const magicLink = \`\${baseUrl}/i/\${panelId}?token=\${token}\`;

        if (process.env.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${process.env.RESEND_API_KEY}\`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: \`\${clientConfig.platform.name} <noreply@\${process.env.RESEND_DOMAIN || 'resend.dev'}>\`,
              to: person.email,
              subject: \`You're invited: \${panel.name}\`,
              html: \`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2>Hi \${person.name},</h2><p>You've been invited to participate in: <strong>\${panel.name}</strong></p><a href="\${magicLink}" style="display:inline-block;background:#8B5CF6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Start Interview</a><p style="color:#666;font-size:14px;">Or copy: \${magicLink}</p></div>\`
            })
          });
        }
        results.push({ email: person.email, success: true, link: magicLink });
      } catch (err: any) { results.push({ email: person.email, success: false, error: err.message }); }
    }
    return NextResponse.json({ results });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}`,

  // ============================================================================
  // API: PARSE EXCEL
  // ============================================================================
  'app/api/invites/parse-excel/route.ts': `// app/api/invites/parse-excel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    if (!data || data.length === 0) return NextResponse.json({ error: 'No data found in file' }, { status: 400 });

    const interviewees = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const name = row.name || row.Name || row.NAME || row['Full Name'] || '';
      const email = row.email || row.Email || row.EMAIL || row['Email Address'] || '';
      const customField = row.custom_field || row.customField || row.department || row.team || '';

      if (!email) { errors.push(\`Row \${i + 2}: Missing email\`); continue; }
      if (!email.includes('@')) { errors.push(\`Row \${i + 2}: Invalid email\`); continue; }

      interviewees.push({ name: name || email.split('@')[0], email: email.toLowerCase().trim(), custom_field: customField });
    }

    if (interviewees.length === 0) return NextResponse.json({ error: 'No valid interviewees found. ' + errors.join('; ') }, { status: 400 });
    return NextResponse.json({ interviewees, total: interviewees.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) { return NextResponse.json({ error: 'Failed to parse file: ' + error.message }, { status: 500 }); }
}`,

  // ============================================================================
  // API: VALIDATE INVITE TOKEN
  // ============================================================================
  'app/api/invites/validate/route.ts': `// app/api/invites/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const { data, error } = await supabase.from('interviewees').select('id, name, email, status').eq('invite_token', token).single();
  if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  return NextResponse.json({ intervieweeId: data.id, name: data.name, status: data.status });
}`,

  // ============================================================================
  // API: UPDATE INTERVIEWEE STATUS
  // ============================================================================
  'app/api/invites/update-status/route.ts': `// app/api/invites/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { intervieweeId, status } = await request.json();
    if (!intervieweeId || !status) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const updates: any = { status };
    if (status === 'started') updates.started_at = new Date().toISOString();
    else if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from('interviewees').update(updates).eq('id', intervieweeId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}`,

  // ============================================================================
  // INTERVIEW PAGE
  // ============================================================================
  'app/i/[agentId]/page.tsx': `// app/i/[agentId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Phone, PhoneOff, Loader2, Bot, CheckCircle } from 'lucide-react';

interface Agent { id: string; name: string; company_name: string; primary_color: string; elevenlabs_agent_id?: string; }

export default function InterviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params.agentId as string;
  const inviteToken = searchParams.get('token');

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'ready' | 'connecting' | 'active' | 'complete'>('ready');
  const [intervieweeId, setIntervieweeId] = useState<string | null>(null);

  useEffect(() => { loadAgent(); if (inviteToken) validateToken(); }, [agentId, inviteToken]);

  async function loadAgent() {
    try {
      const res = await fetch(\`/api/agents/\${agentId}\`);
      if (!res.ok) throw new Error('Agent not found');
      setAgent(await res.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function validateToken() {
    if (!inviteToken) return;
    try {
      const res = await fetch(\`/api/invites/validate?token=\${inviteToken}\`);
      if (res.ok) { const data = await res.json(); setIntervieweeId(data.intervieweeId); }
    } catch (err) { console.error('Token validation failed:', err); }
  }

  async function startInterview() {
    setStatus('connecting');
    if (intervieweeId) await fetch('/api/invites/update-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intervieweeId, status: 'started' }) });

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => {
      const container = document.getElementById('widget-container');
      if (container && agent?.elevenlabs_agent_id) { container.innerHTML = \`<elevenlabs-convai agent-id="\${agent.elevenlabs_agent_id}"></elevenlabs-convai>\`; setStatus('active'); }
    };
    document.body.appendChild(script);
  }

  async function endInterview() {
    const container = document.getElementById('widget-container');
    if (container) container.innerHTML = '';
    if (intervieweeId) await fetch('/api/invites/update-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intervieweeId, status: 'completed' }) });
    setStatus('complete');
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;
  if (error || !agent) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="text-center"><h1 className="text-2xl font-bold mb-4">Interview Not Found</h1><p className="text-slate-400">{error || 'Invalid link.'}</p></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: agent.primary_color + '20' }}><Bot className="w-10 h-10" style={{ color: agent.primary_color }} /></div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-slate-400">{agent.company_name}</p>
        </div>
        {status === 'ready' && (<><p className="text-slate-300 mb-8">Click below to start. Make sure your microphone is enabled.</p><button onClick={startInterview} className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25"><Phone className="w-6 h-6" />Start Interview</button></>)}
        {status === 'connecting' && <div className="flex items-center justify-center gap-3"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /><span>Connecting...</span></div>}
        {status === 'active' && (<><div id="widget-container" className="mb-6" /><button onClick={endInterview} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-medium transition"><PhoneOff className="w-5 h-5" />End Interview</button></>)}
        {status === 'complete' && <div className="text-center"><CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" /><h2 className="text-2xl font-bold text-green-400 mb-2">Interview Complete</h2><p className="text-slate-400">Thank you for your time!</p></div>}
      </div>
    </div>
  );
}`,

  // ============================================================================
  // API: GET AGENT
  // ============================================================================
  'app/api/agents/[agentId]/route.ts': `// app/api/agents/[agentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { data, error } = await supabase.from('agents').select('*').eq('id', params.agentId).single();
  if (error || !data) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  return NextResponse.json(data);
}`,

  // ============================================================================
  // SUPABASE CLIENT
  // ============================================================================
  'lib/supabase.ts': `// lib/supabase.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Singleton pattern - prevents multiple GoTrueClient instances
let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (client) return client;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase environment variables');
  
  client = createSupabaseClient(supabaseUrl, supabaseKey);
  return client;
}`,

// ============================================================================
// DYNAMIC CONFIG FILE - Generated per client
// ============================================================================

function generateClientConfig(platformName: string, companyName: string, colors: { primary: string; accent: string; background: string }, parentApiUrl?: string) {
  return `// config/client.ts
export const clientConfig = {
  platform: {
    name: "${platformName}",
    tagline: "AI-Powered Interview Platform",
    description: "Conduct structured interviews with AI assistance.",
    version: "1.0.0",
  },
  company: {
    name: "${companyName}",
    website: "",
    supportEmail: "support@example.com",
  },
  theme: {
    mode: "dark" as "dark" | "light",
    colors: {
      primary: "${colors.primary}",
      accent: "${colors.accent}",
      background: "${colors.background}",
    },
  },
  features: {
    enableAnalytics: true,
    enableExport: true,
  },
  parent: {
    apiUrl: "${parentApiUrl || 'https://connexions.vercel.app'}",
  },
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
- **Progress Tracking**: Monitor invite → started → completed status

## Getting Started

1. Install dependencies: \`npm install\`
2. Set up environment variables (see .env.example)
3. Run development server: \`npm run dev\`

## Environment Variables

See \`.env.example\` for required configuration.
`;
}

// ============================================================================
// GITHUB HELPERS
// ============================================================================

async function pushFileToRepo(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  headers: HeadersInit
): Promise<boolean> {
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
  formData?: {
    platformName?: string;
    companyName?: string;
    extractedColors?: { primary?: string; accent?: string; background?: string; };
  };
  companyName?: string;
  createdResources?: { supabaseUrl?: string; supabaseAnonKey?: string; childPlatformId?: string; };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGithubRequest = await request.json();
    const { formData, createdResources } = body;

    // Accept either repoName or platformName
    const repoName = body.repoName || body.platformName;
    const platformName = body.platformName || formData?.platformName || 'AI Interview Platform';
    const companyName = body.companyName || formData?.companyName || 'Your Company';
    const supabaseUrl = createdResources?.supabaseUrl;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const safeName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    // Check if repo exists
    console.log('Checking for existing repo:', safeName);
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${safeName}`, { headers });

    if (checkRes.ok) {
      console.log('Repo already exists:', safeName);
      return NextResponse.json({
        success: true,
        repoUrl: `https://github.com/${owner}/${safeName}`,
        repoName: safeName,
        alreadyExists: true,
      });
    }

    // Create empty repo
    console.log('Creating repo:', safeName);
    const createRes = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: safeName,
        description: `AI Interview Platform for ${companyName}`,
        private: false,
        auto_init: true,
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('Failed to create repo:', error);
      return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 400 });
    }

    console.log('Repo created, waiting for it to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Push all template files
    console.log('Pushing template files...');

    const colors = {
      primary: formData?.extractedColors?.primary || '#8B5CF6',
      accent: formData?.extractedColors?.accent || '#10B981',
      background: formData?.extractedColors?.background || '#0F172A',
    };

    for (const [path, content] of Object.entries(TEMPLATE_FILES)) {
      console.log(`Pushing ${path}...`);
      await pushFileToRepo(owner, safeName, path, content, `Add ${path}`, headers);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Push dynamic config file
    const parentApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connexions.vercel.app';
    const clientConfigContent = generateClientConfig(platformName, companyName, colors, parentApiUrl);
    await pushFileToRepo(owner, safeName, 'config/client.ts', clientConfigContent, 'Add client config', headers);

    // Update README
    const readmeContent = generateReadme(platformName, companyName, supabaseUrl);
    await pushFileToRepo(owner, safeName, 'README.md', readmeContent, 'Update README', headers);

    console.log('All files pushed successfully!');

    return NextResponse.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${safeName}`,
      repoName: safeName,
    });

  } catch (error: any) {
    console.error('Create GitHub error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 500 });
  }
}