// app/factory/provision/page.tsx
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2, User, Mic, CheckCircle, ArrowRight, ArrowLeft,
  Rocket, Loader2, Globe, Database, Phone, Mail, ExternalLink,
  XCircle, RotateCcw, Trash2, MinusCircle, AlertCircle, ShieldCheck,
  Github, Clock, RefreshCw, Sparkles
} from 'lucide-react';

// =============================================================================
// FETCH WITH TIMEOUT HELPER
// =============================================================================

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 90000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out - the server is still processing. Check your Vercel dashboard for deployment status.');
    }
    throw error;
  }
}

// =============================================================================
// TYPES
// =============================================================================

type Step = 'company' | 'admin' | 'voice' | 'review' | 'creating';
type CleanupStatus = 'pending' | 'deleting' | 'testing' | 'verified' | 'not_found' | 'error';
type CreateStatus = 'pending' | 'creating' | 'verifying' | 'ready' | 'warning' | 'error' | 'skipped';

interface FormData {
  platformName: string;
  companyName: string;
  companyWebsite: string;
  companyEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  agentName: string;
  voiceGender: 'female' | 'male';
  extractedColors?: {
    primary?: string;
    accent?: string;
    background?: string;
  };
}

interface CleanupComponent {
  id: string;
  name: string;
  icon: any;
  status: CleanupStatus;
  message?: string;
  attempts?: number;
}

interface CreateStep {
  id: string;
  name: string;
  icon: any;
  status: CreateStatus;
  message?: string;
  duration?: number;
}

interface CreatedResources {
  supabaseUrl: string;
  supabaseProjectId: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  elevenlabsAgentId: string;
  githubRepoUrl: string;
  githubRepoName: string;
  vercelUrl: string;
  vercelProjectId: string;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const getInitialCleanupComponents = (): CleanupComponent[] => [
  { id: 'supabase', name: 'Supabase Database', icon: Database, status: 'pending' },
  { id: 'github', name: 'GitHub Repository', icon: Github, status: 'pending' },
  { id: 'vercel', name: 'Vercel Project', icon: Globe, status: 'pending' },
  { id: 'elevenlabs', name: 'ElevenLabs Agent', icon: Mic, status: 'pending' },
];

const getInitialCreateSteps = (): CreateStep[] => [
  { id: 'supabase', name: 'Create Supabase Database', icon: Database, status: 'pending' },
  { id: 'elevenlabs', name: 'Create Voice Agent', icon: Mic, status: 'pending' },
  { id: 'github', name: 'Create GitHub Repository', icon: Github, status: 'pending' },
  { id: 'vercel', name: 'Deploy to Vercel', icon: Globe, status: 'pending' },
  { id: 'deployment', name: 'Trigger Deployment', icon: Rocket, status: 'pending' },
  { id: 'email', name: 'Send Welcome Email', icon: Mail, status: 'pending' },
];

// =============================================================================
// STATUS COMPONENTS
// =============================================================================

function CleanupStatusIcon({ status }: { status: CleanupStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-gray-500" />;
    case 'deleting':
      return <Trash2 className="w-5 h-5 text-orange-500 animate-pulse" />;
    case 'testing':
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'verified':
    case 'not_found':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
  }
}

function CreateStatusIcon({ status }: { status: CreateStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-gray-500" />;
    case 'creating':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'verifying':
      return <RefreshCw className="w-5 h-5 text-purple-500 animate-spin" />;
    case 'ready':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'skipped':
      return <MinusCircle className="w-5 h-5 text-gray-500" />;
  }
}

function getCleanupStatusText(status: CleanupStatus): string {
  switch (status) {
    case 'pending': return 'Waiting...';
    case 'deleting': return 'Deleting...';
    case 'testing': return 'Verifying deletion...';
    case 'verified': return 'Verified deleted';
    case 'not_found': return 'Not found (clean)';
    case 'error': return 'Error';
  }
}

function getCreateStatusText(status: CreateStatus): string {
  switch (status) {
    case 'pending': return 'Waiting...';
    case 'creating': return 'Creating...';
    case 'verifying': return 'Verifying...';
    case 'ready': return 'Ready';
    case 'warning': return 'Warning';
    case 'error': return 'Error';
    case 'skipped': return 'Skipped';
  }
}

function getCleanupStatusColor(status: CleanupStatus): string {
  switch (status) {
    case 'pending': return 'border-gray-700 bg-gray-900/50';
    case 'deleting': return 'border-orange-500/50 bg-orange-500/10';
    case 'testing': return 'border-blue-500/50 bg-blue-500/10';
    case 'verified':
    case 'not_found': return 'border-green-500/50 bg-green-500/10';
    case 'error': return 'border-red-500/50 bg-red-500/10';
  }
}

function getCreateStatusColor(status: CreateStatus): string {
  switch (status) {
    case 'pending': return 'border-gray-700 bg-gray-900/50';
    case 'creating': return 'border-blue-500/50 bg-blue-500/10';
    case 'verifying': return 'border-purple-500/50 bg-purple-500/10';
    case 'ready': return 'border-green-500/50 bg-green-500/10';
    case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
    case 'error': return 'border-red-500/50 bg-red-500/10';
    case 'skipped': return 'border-gray-700 bg-gray-900/50';
  }
}

// =============================================================================
// COMPONENT ROWS
// =============================================================================

function CleanupComponentRow({ component }: { component: CleanupComponent }) {
  const Icon = component.icon;
  const statusColor = getCleanupStatusColor(component.status);
  const statusText = getCleanupStatusText(component.status);
  const isActive = ['deleting', 'testing'].includes(component.status);
  const isDone = ['verified', 'not_found'].includes(component.status);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${statusColor}`}>
      <div className={`p-2 rounded-lg ${isDone ? 'bg-green-500/20' : isActive ? 'bg-orange-500/20' : 'bg-gray-800'}`}>
        <Icon className={`w-5 h-5 ${isDone ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1">
        <div className="font-medium text-white">{component.name}</div>
        <div className={`text-sm ${isDone ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-gray-500'}`}>
          {component.message || statusText}
          {component.attempts && component.attempts > 1 && ` (${component.attempts} attempts)`}
        </div>
      </div>
      <CleanupStatusIcon status={component.status} />
    </div>
  );
}

function CreateStepRow({ step, disabled }: { step: CreateStep; disabled: boolean }) {
  const Icon = step.icon;
  const statusColor = disabled ? 'border-gray-800 bg-gray-900/30 opacity-50' : getCreateStatusColor(step.status);
  const statusText = getCreateStatusText(step.status);
  const isActive = ['creating', 'verifying'].includes(step.status);
  const isDone = step.status === 'ready';
  const isWarning = step.status === 'warning';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${statusColor}`}>
      <div className={`p-2 rounded-lg ${isDone ? 'bg-green-500/20' : isWarning ? 'bg-yellow-500/20' : isActive ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
        <Icon className={`w-5 h-5 ${isDone ? 'text-green-400' : isWarning ? 'text-yellow-400' : isActive ? 'text-blue-400' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1">
        <div className={`font-medium ${disabled ? 'text-gray-600' : 'text-white'}`}>{step.name}</div>
        <div className={`text-sm ${isDone ? 'text-green-400' : isWarning ? 'text-yellow-400' : isActive ? 'text-blue-400' : 'text-gray-500'}`}>
          {disabled ? 'Waiting for cleanup...' : (step.message || statusText)}
          {step.duration && ` (${(step.duration / 1000).toFixed(1)}s)`}
        </div>
      </div>
      {disabled ? <Clock className="w-5 h-5 text-gray-600" /> : <CreateStatusIcon status={step.status} />}
    </div>
  );
}

function PhaseHeader({
  phase, title, subtitle, icon: Icon, isActive, isComplete, count
}: {
  phase: number; title: string; subtitle: string; icon: any; isActive: boolean; isComplete: boolean; count?: string;
}) {
  return (
    <div className={`flex items-center gap-4 mb-4 p-4 rounded-lg border ${
      isComplete ? 'border-green-500/50 bg-green-500/10' :
      isActive ? 'border-purple-500/50 bg-purple-500/10' :
      'border-gray-700 bg-gray-900/50'
    }`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
        isComplete ? 'bg-green-500 text-white' :
        isActive ? 'bg-purple-500 text-white' :
        'bg-gray-700 text-gray-400'
      }`}>
        {isComplete ? <CheckCircle className="w-5 h-5" /> : phase}
      </div>
      <div className="flex-1">
        <div className={`font-semibold ${isComplete ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-gray-400'}`}>
          {title}
        </div>
        <div className="text-sm text-gray-500">{subtitle}</div>
      </div>
      {count && <div className={`text-sm font-medium ${isComplete ? 'text-green-400' : 'text-gray-500'}`}>{count}</div>}
      <Icon className={`w-6 h-6 ${isComplete ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-gray-600'}`} />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT WRAPPER
// =============================================================================

export default function ProvisionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <SetupWizard />
    </Suspense>
  );
}

// =============================================================================
// SETUP WIZARD COMPONENT
// =============================================================================

function SetupWizard() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');

  const [step, setStep] = useState<Step>('company');
  const [error, setError] = useState('');
  const [loadingLead, setLoadingLead] = useState(!!leadId);
  const [elapsedTime, setElapsedTime] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState<FormData>({
    platformName: '',
    companyName: '',
    companyWebsite: '',
    companyEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    agentName: 'Setup Agent',
    voiceGender: 'female',
  });

  // Cleanup State
  const [cleanupComponents, setCleanupComponents] = useState<CleanupComponent[]>(getInitialCleanupComponents());
  const [cleanupComplete, setCleanupComplete] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'cleanup' | 'create'>('idle');

  // Create State
  const [createSteps, setCreateSteps] = useState<CreateStep[]>(getInitialCreateSteps());

  const [createdResources, setCreatedResources] = useState<CreatedResources>({
    supabaseUrl: '',
    supabaseProjectId: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    elevenlabsAgentId: '',
    githubRepoUrl: '',
    githubRepoName: '',
    vercelUrl: '',
    vercelProjectId: '',
  });

  // ---------------------------------------------------------------------------
  // ELAPSED TIME COUNTER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === 'creating') {
      setElapsedTime(0);
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Helper functions
  const updateCleanupComponent = (id: string, updates: Partial<CleanupComponent>) => {
    setCleanupComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const updateCreateStep = (id: string, updates: Partial<CreateStep>) => {
    setCreateSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const cleanupVerifiedCount = cleanupComponents.filter(c => c.status === 'verified' || c.status === 'not_found').length;
  const createReadyCount = createSteps.filter(s => s.status === 'ready' || s.status === 'warning').length;

  // ---------------------------------------------------------------------------
  // LOAD LEAD DATA
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (leadId) {
      fetch(`/api/demo/status/${leadId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setFormData(prev => ({
              ...prev,
              platformName: data.company ? `${data.company} Interviews` : prev.platformName,
              companyName: data.company || prev.companyName,
              companyEmail: data.email || prev.companyEmail,
              adminFirstName: data.first_name || data.firstName || prev.adminFirstName,
              adminLastName: data.last_name || data.lastName || prev.adminLastName,
              adminEmail: data.email || prev.adminEmail,
              adminPhone: data.phone || prev.adminPhone,
            }));
          }
          setLoadingLead(false);
        })
        .catch(() => setLoadingLead(false));
    }
  }, [leadId]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const updateForm = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'company':
        return !!(formData.platformName && formData.companyName && formData.companyEmail);
      case 'admin':
        return !!(formData.adminFirstName && formData.adminLastName && formData.adminEmail);
      case 'voice':
        return !!formData.agentName;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    const steps: Step[] = ['company', 'admin', 'voice', 'review', 'creating'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = ['company', 'admin', 'voice', 'review', 'creating'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const handleRetry = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep('review');
    setCurrentPhase('idle');
    setCleanupComponents(getInitialCleanupComponents());
    setCreateSteps(getInitialCreateSteps());
    setCleanupComplete(false);
    setError('');
    setElapsedTime(0);
  };

  // ---------------------------------------------------------------------------
  // CREATION FLOW WITH CLEANUP
  // ---------------------------------------------------------------------------

  const startCreation = async () => {
    setStep('creating');
    setError('');
    setCurrentPhase('cleanup');
    setCleanupComplete(false);
    setCleanupComponents(getInitialCleanupComponents());
    setCreateSteps(getInitialCreateSteps());

    const projectSlug = formData.platformName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    let supabaseUrl = '';
    let supabaseProjectId = '';
    let supabaseAnonKey = '';
    let supabaseServiceKey = '';
    let elevenlabsAgentId = '';
    let githubRepoUrl = '';
    let githubRepoName = '';
    let vercelUrl = '';
    let vercelProjectId = '';

    try {
      // ========================================================================
      // PHASE 1: CLEANUP
      // ========================================================================
      console.log('[Provision] Starting cleanup phase...');
      setCleanupComponents(prev => prev.map(c => ({ ...c, status: 'deleting' as CleanupStatus })));

      const cleanupResponse = await fetchWithTimeout('/api/setup/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug,
          companyName: formData.companyName,
        }),
      }, 60000);

      const cleanupData = await cleanupResponse.json();
      console.log('[Provision] Cleanup response:', cleanupData);

      if (cleanupData.results) {
        for (const res of cleanupData.results) {
          const componentId = res.component.toLowerCase();
          if (res.verified) {
            updateCleanupComponent(componentId, {
              status: res.found ? 'verified' : 'not_found',
              message: res.found ? 'Deleted and verified' : 'Not found (clean)',
              attempts: res.attempts,
            });
          } else {
            updateCleanupComponent(componentId, {
              status: 'error',
              message: res.error || 'Failed to delete',
              attempts: res.attempts,
            });
          }
        }
      }

      // Even if cleanup has some failures, continue if mostly successful
      const cleanupFailures = cleanupData.results?.filter((r: any) => !r.verified) || [];
      if (cleanupFailures.length > 2) {
        throw new Error(`Cleanup failed for: ${cleanupFailures.map((r: any) => r.component).join(', ')}`);
      }

      setCleanupComplete(true);
      console.log('[Provision] Cleanup complete, starting creation...');

      // ========================================================================
      // PHASE 2: CREATE
      // ========================================================================
      setCurrentPhase('create');

      // ========== Step 1: Create Supabase Project ==========
      updateCreateStep('supabase', { status: 'creating', message: 'Creating database...' });
      console.log('[Provision] Creating Supabase project...');

      const supabaseRes = await fetchWithTimeout('/api/setup/create-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: projectSlug }),
      }, 120000);

      if (!supabaseRes.ok) {
        const err = await supabaseRes.json();
        throw new Error(`Supabase: ${err.error || 'Failed to create project'}`);
      }

      const supabaseData = await supabaseRes.json();
      supabaseUrl = supabaseData.url;
      supabaseProjectId = supabaseData.projectId;
      supabaseAnonKey = supabaseData.anonKey;
      supabaseServiceKey = supabaseData.serviceRoleKey;

      updateCreateStep('supabase', { status: 'ready', message: 'Database created' });
      console.log('[Provision] Supabase created:', supabaseUrl);

      // ========== Step 2: Create ElevenLabs Agent ==========
      // Note: We use predictable Vercel URL pattern for webhook
      const predictedVercelUrl = `https://${projectSlug}.vercel.app`;

      updateCreateStep('elevenlabs', { status: 'creating', message: 'Creating voice agent...' });
      console.log('[Provision] Creating ElevenLabs agent...');

      const elevenRes = await fetchWithTimeout('/api/setup/create-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: `${formData.platformName} Setup`,
          platformName: formData.platformName,
          companyName: formData.companyName,
          voiceGender: formData.voiceGender,
          webhookUrl: `${predictedVercelUrl}/api/webhooks/elevenlabs`,
        }),
      }, 60000);

      if (!elevenRes.ok) {
        const err = await elevenRes.json();
        throw new Error(`ElevenLabs: ${err.error || 'Failed to create agent'}`);
      }

      const elevenData = await elevenRes.json();
      elevenlabsAgentId = elevenData.agentId;

      updateCreateStep('elevenlabs', { status: 'ready', message: 'Voice agent created' });
      console.log('[Provision] ElevenLabs created:', elevenlabsAgentId);

      // ========== Step 3: Create GitHub Repository ==========
      updateCreateStep('github', { status: 'creating', message: 'Creating repository...' });
      console.log('[Provision] Creating GitHub repository...');

      const githubRes = await fetchWithTimeout('/api/setup/create-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: projectSlug,
          platformName: formData.platformName,
          companyName: formData.companyName,
          formData: {
            platformName: formData.platformName,
            companyName: formData.companyName,
            extractedColors: formData.extractedColors,
          },
          createdResources: { supabaseUrl, supabaseAnonKey },
        }),
      }, 60000);

      if (!githubRes.ok) {
        const err = await githubRes.json();
        throw new Error(`GitHub: ${err.error || 'Failed to create repository'}`);
      }

      const githubData = await githubRes.json();
      githubRepoUrl = githubData.repoUrl;
      githubRepoName = githubData.repoName;

      updateCreateStep('github', { status: 'ready', message: 'Repository created' });
      console.log('[Provision] GitHub created:', githubRepoUrl);

      // ========== Step 4: Create Vercel Project ==========
      // Now includes ElevenLabs agent ID in env vars
      updateCreateStep('vercel', { status: 'creating', message: 'Creating deployment...' });
      console.log('[Provision] Creating Vercel project...');

      const vercelRes = await fetchWithTimeout('/api/setup/create-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectSlug,
          repoName: githubRepoName,
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
            NEXT_PUBLIC_PLATFORM_NAME: formData.platformName,
            NEXT_PUBLIC_COMPANY_NAME: formData.companyName,
            NEXT_PUBLIC_ELEVENLABS_SETUP_AGENT_ID: elevenlabsAgentId,
          },
        }),
      }, 60000);

      if (!vercelRes.ok) {
        const err = await vercelRes.json();
        throw new Error(`Vercel: ${err.error || 'Failed to create project'}`);
      }

      const vercelData = await vercelRes.json();
      vercelUrl = vercelData.url || predictedVercelUrl;
      vercelProjectId = vercelData.projectId;

      updateCreateStep('vercel', { status: 'ready', message: 'Project created' });
      console.log('[Provision] Vercel created:', vercelUrl);

      // ========== Step 5: Trigger Deployment ==========
      updateCreateStep('deployment', { status: 'creating', message: 'Triggering deployment...' });
      console.log('[Provision] Triggering Vercel deployment...');

      const triggerRes = await fetchWithTimeout('/api/setup/trigger-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: githubRepoName,
          projectName: projectSlug,
        }),
      }, 60000);

      if (!triggerRes.ok) {
        console.warn('[Provision] Deployment trigger warning:', await triggerRes.text());
        updateCreateStep('deployment', { status: 'warning', message: 'Manual deployment may be needed' });
      } else {
        const triggerData = await triggerRes.json();
        updateCreateStep('deployment', { status: 'ready', message: 'Deployment triggered' });
        console.log('[Provision] Deployment triggered:', triggerData);
      }

      // ========== Step 6: Send Welcome Email ==========
      updateCreateStep('email', { status: 'creating', message: 'Sending welcome email...' });
      console.log('[Provision] Sending welcome email...');

      const emailRes = await fetch('/api/setup/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.adminEmail,
          platformName: formData.platformName,
          platformUrl: vercelUrl,
          adminName: `${formData.adminFirstName} ${formData.adminLastName}`,
        }),
      });

      if (!emailRes.ok) {
        console.warn('[Provision] Email warning:', await emailRes.text());
        updateCreateStep('email', { status: 'warning', message: 'Email may not have sent' });
      } else {
        updateCreateStep('email', { status: 'ready', message: 'Welcome email sent' });
      }

      // ========== SUCCESS ==========
      setCreatedResources({
        supabaseUrl,
        supabaseProjectId,
        supabaseAnonKey,
        supabaseServiceKey,
        elevenlabsAgentId,
        githubRepoUrl,
        githubRepoName,
        vercelUrl,
        vercelProjectId,
      });

      console.log('[Provision] All steps complete!');

    } catch (err: any) {
      console.error('[Provision] Error:', err);
      setError(err.message || 'An unexpected error occurred');

      // Mark current step as error
      setCreateSteps(prev => prev.map(s =>
        s.status === 'creating' ? { ...s, status: 'error', message: err.message } : s
      ));
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'done': return 'bg-slate-800 border-green-500/50';
      case 'creating': return 'bg-slate-800 border-blue-500/50';
      case 'error': return 'bg-slate-800 border-red-500/50';
      default: return 'bg-slate-900 border-slate-700';
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'creating': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-slate-600" />;
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER STEPS
  // ---------------------------------------------------------------------------

  const renderCompanyStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-purple-400" />
        Platform Details
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Platform Name *</label>
          <input
            type="text"
            value={formData.platformName}
            onChange={(e) => updateForm('platformName', e.target.value)}
            placeholder="e.g., Acme Interviews"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Company Name *</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => updateForm('companyName', e.target.value)}
            placeholder="e.g., Acme Corp"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Company Website</label>
          <input
            type="url"
            value={formData.companyWebsite}
            onChange={(e) => updateForm('companyWebsite', e.target.value)}
            placeholder="https://acme.com"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Company Email *</label>
          <input
            type="email"
            value={formData.companyEmail}
            onChange={(e) => updateForm('companyEmail', e.target.value)}
            placeholder="contact@acme.com"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderAdminStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <User className="w-6 h-6 text-green-400" />
        Admin Contact
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.adminFirstName}
              onChange={(e) => updateForm('adminFirstName', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.adminLastName}
              onChange={(e) => updateForm('adminLastName', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => updateForm('adminEmail', e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.adminPhone}
            onChange={(e) => updateForm('adminPhone', e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderVoiceStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Mic className="w-6 h-6 text-orange-400" />
        Voice Agent Settings
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Agent Name *</label>
          <input
            type="text"
            value={formData.agentName}
            onChange={(e) => updateForm('agentName', e.target.value)}
            placeholder="e.g., Sarah"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Voice Gender</label>
          <select
            value={formData.voiceGender}
            onChange={(e) => updateForm('voiceGender', e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="female">Female (Sarah)</option>
            <option value="male">Male (Adam)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <CheckCircle className="w-6 h-6 text-blue-400" />
        Review & Create
      </h2>
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Platform</h3>
            <p className="text-white font-medium">{formData.platformName}</p>
            <p className="text-slate-400 text-sm">{formData.companyName}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Admin</h3>
            <p className="text-white font-medium">{formData.adminFirstName} {formData.adminLastName}</p>
            <p className="text-slate-400 text-sm">{formData.adminEmail}</p>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">What will be created:</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-400" />
              Supabase database with schema & storage
            </li>
            <li className="flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-400" />
              GitHub repository from template
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Vercel deployment with env vars
            </li>
            <li className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              ElevenLabs voice agent with webhook
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" />
              Welcome email with platform URL
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderCreatingStep = () => {
    const allDone = createSteps.every(s => s.status === 'ready' || s.status === 'warning');
    const hasError = createSteps.some(s => s.status === 'error') || error;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {hasError ? 'Setup Failed' : allDone ? 'Platform Created!' : 'Creating Your Platform'}
          </h1>
          <p className="text-gray-400">
            {hasError ? 'An error occurred during setup' :
             allDone ? 'All components verified and ready' :
             `Elapsed: ${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
          </p>
        </div>

        {/* PHASE 1: CLEANUP */}
        <div className="bg-slate-900 rounded-xl p-6">
          <PhaseHeader
            phase={1}
            title="Cleanup - Verify Deletion"
            subtitle="Delete any existing components and verify they're gone"
            icon={Trash2}
            isActive={currentPhase === 'cleanup'}
            isComplete={cleanupComplete}
            count={`${cleanupVerifiedCount}/4 verified`}
          />
          <div className="space-y-3">
            {cleanupComponents.map(component => (
              <CleanupComponentRow key={component.id} component={component} />
            ))}
          </div>
          {currentPhase === 'cleanup' && !cleanupComplete && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting and verifying each component...
              </p>
            </div>
          )}
          {cleanupComplete && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                All components verified deleted. Proceeding to creation...
              </p>
            </div>
          )}
        </div>

        {/* PHASE 2: CREATE */}
        <div className={`bg-slate-900 rounded-xl p-6 transition-opacity duration-300 ${cleanupComplete ? 'opacity-100' : 'opacity-50'}`}>
          <PhaseHeader
            phase={2}
            title="Create - Build Components"
            subtitle="Create and verify each component is ready"
            icon={Sparkles}
            isActive={currentPhase === 'create'}
            isComplete={allDone && !hasError}
            count={`${createReadyCount}/6 ready`}
          />
          <div className="space-y-3">
            {createSteps.map(step => (
              <CreateStepRow key={step.id} step={step} disabled={!cleanupComplete} />
            ))}
          </div>
          {!cleanupComplete && (
            <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Waiting for cleanup to complete...
              </p>
            </div>
          )}
        </div>

        {/* SUCCESS */}
        {allDone && !hasError && createdResources.vercelUrl && (
          <div className="bg-slate-900 rounded-xl p-6 space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Your platform is live!
              </h3>
              <a
                href={createdResources.vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-300 hover:text-green-200 transition-colors text-lg font-medium"
              >
                {createdResources.vercelUrl}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a
                href={createdResources.vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <Globe className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="font-medium text-purple-300">Open Platform</div>
                  <div className="text-sm text-gray-500">View your new platform</div>
                </div>
              </a>
              {createdResources.githubRepoUrl && (
                <a
                  href={createdResources.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Github className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">GitHub Repository</div>
                    <div className="text-sm text-gray-500">{createdResources.githubRepoName}</div>
                  </div>
                </a>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              A welcome email has been sent to {formData.adminEmail}
            </p>
          </div>
        )}

        {/* ERROR */}
        {hasError && (
          <div className="bg-slate-900 rounded-xl p-6 space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Error
              </h3>
              <p className="text-red-300">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  const stepsList = [
    { key: 'company', label: 'Platform', icon: Building2 },
    { key: 'admin', label: 'Admin', icon: User },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'review', label: 'Review', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Platform</h1>
          <p className="text-slate-400">Your AI interview platform, ready in minutes</p>
        </div>

        {/* Progress Steps */}
        {step !== 'creating' && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {stepsList.map((s, i) => {
                const steps: Step[] = ['company', 'admin', 'voice', 'review'];
                const isActive = step === s.key;
                const isPast = steps.indexOf(step) > steps.indexOf(s.key as Step);
                const Icon = s.icon;

                return (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isActive
                          ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                          : isPast
                          ? 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-slate-700 text-slate-500'
                      }`}
                    >
                      {isPast ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    {i < stepsList.length - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${isPast ? 'bg-green-500' : 'bg-slate-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error (for non-creating steps) */}
        {error && step !== 'creating' && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        {step === 'company' && renderCompanyStep()}
        {step === 'admin' && renderAdminStep()}
        {step === 'voice' && renderVoiceStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'creating' && renderCreatingStep()}

        {/* Navigation */}
        {step !== 'creating' && (
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={step === 'company'}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step === 'review' ? (
              <button
                onClick={startCreation}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition"
              >
                <Rocket className="w-4 h-4" />
                Create Platform
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}