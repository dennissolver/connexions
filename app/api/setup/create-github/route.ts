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
    "@elevenlabs/client": "^0.12.2",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "lucide-react": "^0.460.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
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
  plugins: [],
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

# Platform Configuration
NEXT_PUBLIC_PLATFORM_NAME=Your Platform Name
NEXT_PUBLIC_COMPANY_NAME=Your Company Name

# Parent Platform (Connexions) - for centralized evaluation
PARENT_API_URL=https://connexions.vercel.app
PARENT_API_KEY=your-parent-api-key
CHILD_PLATFORM_ID=your-platform-id`,

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
import { clientConfig } from '@/config/client';
import { Bot, Phone, Clock, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{clientConfig.platform.name}</h1>
            <p className="text-sm text-slate-400">{clientConfig.company.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-4xl font-bold mb-4">{clientConfig.platform.tagline}</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {clientConfig.platform.description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-slate-900 rounded-2xl p-6 text-center">
            <Phone className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Voice-First</h3>
            <p className="text-slate-400 text-sm">Natural conversation powered by advanced AI voice technology</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-6 text-center">
            <Clock className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Quick Setup</h3>
            <p className="text-slate-400 text-sm">Deploy your AI interviewer in minutes, not weeks</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Consistent Quality</h3>
            <p className="text-slate-400 text-sm">Every interview follows your script with professional delivery</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-400 mb-4">Questions? Get in touch</p>
          <a
            href={\`mailto:\${clientConfig.company.supportEmail}\`}
            className="text-purple-400 hover:text-purple-300 transition"
          >
            {clientConfig.company.supportEmail}
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-4 py-6 mt-16">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {clientConfig.company.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}`,

  'app/i/[agentId]/page.tsx': `// app/i/[agentId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Bot, CheckCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  company_name: string;
  logo_url?: string;
  primary_color: string;
  background_color: string;
  welcome_message?: string;
  closing_message?: string;
  estimated_duration_mins: number;
  elevenlabs_agent_id: string;
}

type Stage = 'loading' | 'welcome' | 'call' | 'complete' | 'error';

export default function VoiceInterviewPage() {
  const params = useParams();
  const rawAgentId = params.agentId as string;
  const agentId = rawAgentId.replace(/^demo-/, '');

  const [stage, setStage] = useState<Stage>('loading');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState('');
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      const res = await fetch(\`/api/agents/\${agentId}\`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Interview not found');
      setAgent(json.agent ?? json);
      setStage('welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interview');
      setStage('error');
    }
  };

  const startCall = async () => {
    if (!agent) return;
    setStage('call');
    setCallStatus('connecting');

    try {
      const res = await fetch('/api/interview/voice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, elevenLabsAgentId: agent.elevenlabs_agent_id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start call');

      setInterviewId(json.interviewId);
      const { Conversation } = await import('@elevenlabs/client');

      const conv = await Conversation.startSession({
        agentId: json.elevenLabsAgentId || agent.elevenlabs_agent_id,
        signedUrl: json.signedUrl,
        onConnect: () => setCallStatus('connected'),
        onDisconnect: () => { setStage('complete'); saveInterview('completed'); },
        onError: (err: any) => { console.error('Voice error:', err); setError('Call disconnected unexpectedly'); setStage('error'); }
      });
      setConversation(conv);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setStage('error');
    }
  };

  const endCall = async () => {
    if (conversation) { await conversation.endSession(); setConversation(null); }
    setStage('complete');
    saveInterview('completed');
  };

  const toggleMute = () => {
    if (!conversation) return;
    isMuted ? conversation.unmute() : conversation.mute();
    setIsMuted(!isMuted);
  };

  const saveInterview = async (status: string) => {
    if (!interviewId) return;
    try {
      await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, status })
      });
    } catch (err) { console.error('Failed to save interview', err); }
  };

  const primaryColor = agent?.primary_color || '#8B5CF6';
  const backgroundColor = agent?.background_color || '#0F172A';

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ backgroundColor }}>
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {agent?.logo_url && <img src={agent.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain" />}
          <div>
            <h1 className="font-semibold">{agent?.name || 'Interview'}</h1>
            <p className="text-sm text-white/60">{agent?.company_name}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">
          {stage === 'loading' && <Loader2 className="w-12 h-12 animate-spin mx-auto text-white/50" />}

          {stage === 'error' && (
            <>
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-4xl">😕</span></div>
              <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
              <p className="text-white/60">{error}</p>
            </>
          )}

          {stage === 'welcome' && agent && (
            <>
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: \`\${primaryColor}20\` }}>
                <Bot className="w-10 h-10" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-4">{agent.welcome_message || \`Welcome to your interview with \${agent.company_name}\`}</h2>
              <p className="text-white/60 mb-8">This will take about {agent.estimated_duration_mins} minutes.</p>
              <button onClick={startCall} className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transition" style={{ backgroundColor: primaryColor, boxShadow: \`0 10px 40px \${primaryColor}40\` }}>
                <Phone className="w-6 h-6" /> Start Interview
              </button>
            </>
          )}

          {stage === 'call' && (
            <>
              <div className={\`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 \${callStatus === 'connected' ? 'animate-pulse' : ''}\`} style={{ backgroundColor: callStatus === 'connected' ? '#22c55e20' : \`\${primaryColor}20\` }}>
                {callStatus === 'connecting' ? <Loader2 className="w-12 h-12 animate-spin" /> : <Mic className="w-12 h-12 text-green-400" />}
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={toggleMute} className={\`p-4 rounded-full \${isMuted ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10'}\`}>
                  {isMuted ? <MicOff /> : <Mic />}
                </button>
                <button onClick={endCall} className="p-4 bg-red-600 rounded-full"><PhoneOff /></button>
              </div>
            </>
          )}

          {stage === 'complete' && (
            <>
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-green-400" /></div>
              <h2 className="text-2xl font-bold mb-4">Interview complete</h2>
              <p className="text-white/60">{agent?.closing_message || 'Thank you for your time.'}</p>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">Powered by AI Agent Interviews</footer>
    </div>
  );
}`,

  'app/api/agents/[agentId]/route.ts': `// app/api/agents/[agentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.agentId;

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .or(\`id.eq.\${agentId},slug.eq.\${agentId}\`)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`,

  'app/api/interview/voice/start/route.ts': `// app/api/interview/voice/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, elevenLabsAgentId } = body;

    if (!agentId || !elevenLabsAgentId) {
      return NextResponse.json({ error: 'Agent ID and ElevenLabs Agent ID required' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({ agent_id: agentId, status: 'in_progress', started_at: new Date().toISOString() })
      .select()
      .single();

    if (interviewError) {
      console.error('Failed to create interview:', interviewError);
      return NextResponse.json({ error: 'Failed to create interview record' }, { status: 500 });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const signedUrlResponse = await fetch(
      \`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=\${elevenLabsAgentId}\`,
      { method: 'GET', headers: { 'xi-api-key': elevenLabsApiKey } }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error('ElevenLabs signed URL error:', errorText);
      return NextResponse.json({ error: 'Failed to get conversation URL' }, { status: 500 });
    }

    const { signed_url: signedUrl } = await signedUrlResponse.json();

    return NextResponse.json({ success: true, interviewId: interview.id, elevenLabsAgentId, signedUrl });
  } catch (error) {
    console.error('Voice start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`,

  'app/api/interview/complete/route.ts': `// app/api/interview/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId, status } = body;

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID required' }, { status: 400 });
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('interviews')
      .update({ status: status || 'completed', completed_at: new Date().toISOString() })
      .eq('id', interviewId);

    if (error) {
      console.error('Failed to update interview:', error);
      return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Interview complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`,

  // NEW: ElevenLabs webhook to capture transcripts
  'app/api/webhooks/elevenlabs/route.ts': `// app/api/webhooks/elevenlabs/route.ts
// Receives transcript data from ElevenLabs when conversations end
// Stores locally and forwards to parent Connexions for centralized evaluation
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('ElevenLabs webhook received:', JSON.stringify(body, null, 2));

    const {
      conversation_id,
      agent_id,
      status,
      transcript,
      metadata,
      analysis,
    } = body;

    if (!conversation_id) {
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    const supabase = createClient();

    // Find the interview by elevenlabs conversation ID or agent
    const { data: interview, error: findError } = await supabase
      .from('interviews')
      .select('*, agents(*)')
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !interview) {
      console.warn('Could not find matching interview for conversation:', conversation_id);
      // Still process and store the transcript
    }

    // Store transcript in local database
    const { data: stored, error: storeError } = await supabase
      .from('interview_transcripts')
      .upsert({
        interview_id: interview?.id,
        elevenlabs_conversation_id: conversation_id,
        elevenlabs_agent_id: agent_id,
        transcript: transcript,
        analysis: analysis,
        metadata: metadata,
        status: status,
        received_at: new Date().toISOString(),
      }, {
        onConflict: 'elevenlabs_conversation_id'
      })
      .select()
      .single();

    if (storeError) {
      console.error('Failed to store transcript:', storeError);
    }

    // Update interview status
    if (interview?.id) {
      await supabase
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          transcript_received: true,
        })
        .eq('id', interview.id);
    }

    // Forward to parent Connexions for centralized evaluation
    const parentApiUrl = process.env.PARENT_API_URL;
    const parentApiKey = process.env.PARENT_API_KEY;
    const childPlatformId = process.env.CHILD_PLATFORM_ID;

    if (parentApiUrl && parentApiKey) {
      try {
        const parentResponse = await fetch(\`\${parentApiUrl}/api/child/transcript\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${parentApiKey}\`,
          },
          body: JSON.stringify({
            childPlatformId,
            interviewId: interview?.id,
            agentId: interview?.agent_id,
            agentName: interview?.agents?.name,
            conversationId: conversation_id,
            transcript,
            analysis,
            metadata,
            status,
            completedAt: new Date().toISOString(),
          }),
        });

        if (!parentResponse.ok) {
          console.error('Failed to forward to parent:', await parentResponse.text());
        } else {
          console.log('Successfully forwarded transcript to parent for evaluation');
        }
      } catch (parentError) {
        console.error('Error forwarding to parent:', parentError);
        // Don't fail the webhook - parent forwarding is secondary
      }
    }

    return NextResponse.json({ 
      success: true, 
      stored: !!stored,
      interviewId: interview?.id 
    });

  } catch (error) {
    console.error('ElevenLabs webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Handle webhook verification (GET requests)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ElevenLabs webhook endpoint active' });
}`,

  'lib/supabase/client.ts': `// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}`,

  'lib/supabase/server.ts': `// lib/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}`,
};

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

## Configuration

- **Supabase URL**: ${supabaseUrl || 'Configure in Vercel'}
- **Platform**: ${platformName}
- **Company**: ${companyName}

## Getting Started

1. Clone this repository
2. Install dependencies: \`npm install\`
3. Set up environment variables
4. Run development server: \`npm run dev\`

## Environment Variables

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl || 'your-supabase-url'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_PLATFORM_NAME=${platformName}
NEXT_PUBLIC_COMPANY_NAME=${companyName}
PARENT_API_URL=https://connexions.vercel.app
PARENT_API_KEY=your-parent-api-key
CHILD_PLATFORM_ID=your-platform-id
\`\`\`

## Webhook Configuration

Configure ElevenLabs to send webhooks to:
\`https://your-domain.vercel.app/api/webhooks/elevenlabs\`

This enables automatic transcript capture and forwarding to the parent platform for evaluation.
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
    // Check if file exists
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
    let sha: string | undefined;

    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    const body: any = {
      message,
      content: Buffer.from(content).toString('base64'),
    };

    if (sha) {
      body.sha = sha;
    }

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`Failed to push ${path}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error pushing ${path}:`, error);
    return false;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

interface CreateGithubRequest {
  repoName: string;
  formData?: {
    platformName?: string;
    companyName?: string;
    extractedColors?: {
      primary?: string;
      accent?: string;
      background?: string;
    };
  };
  platformName?: string;
  companyName?: string;
  createdResources?: {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    childPlatformId?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGithubRequest = await request.json();
    const { repoName, formData, createdResources } = body;

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

    // Push static template files
    for (const [path, content] of Object.entries(TEMPLATE_FILES)) {
      console.log(`Pushing ${path}...`);
      await pushFileToRepo(owner, safeName, path, content, `Add ${path}`, headers);
      // Small delay to avoid rate limiting
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