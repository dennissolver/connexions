// app/factory/provision/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2, User, Mic, CheckCircle, ArrowRight, ArrowLeft,
  Rocket, Loader2, Globe, Database, Phone, Mail, ExternalLink, Layout
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type Step = 'company' | 'admin' | 'voice' | 'review' | 'creating';

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
}

interface CreationStatus {
  supabase: 'pending' | 'creating' | 'done' | 'error';
  github: 'pending' | 'creating' | 'done' | 'error';
  vercel: 'pending' | 'creating' | 'done' | 'error';
  elevenlabs: 'pending' | 'creating' | 'done' | 'error';
  deployment: 'pending' | 'creating' | 'done' | 'error';
}

interface CreatedResources {
  supabaseUrl: string;
  supabaseProjectId: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  elevenlabsAgentId: string;
  githubRepoUrl: string;
  vercelUrl: string;
  vercelProjectId: string;
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

  const [creationStatus, setCreationStatus] = useState<CreationStatus>({
    supabase: 'pending',
    github: 'pending',
    vercel: 'pending',
    elevenlabs: 'pending',
    deployment: 'pending',
  });

  const [createdResources, setCreatedResources] = useState<CreatedResources>({
    supabaseUrl: '',
    supabaseProjectId: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    elevenlabsAgentId: '',
    githubRepoUrl: '',
    vercelUrl: '',
    vercelProjectId: '',
  });

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

  // ---------------------------------------------------------------------------
  // CREATION FLOW (Correct order: Supabase → GitHub → Vercel → ElevenLabs)
  // ---------------------------------------------------------------------------

  const startCreation = async () => {
    setStep('creating');
    setError('');

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
      // ========== Step 1: Create Supabase Project ==========
      setCreationStatus(prev => ({ ...prev, supabase: 'creating' }));
      console.log('Creating Supabase project...');

      const supabaseRes = await fetch('/api/setup/create-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: projectSlug }),
      });

      if (!supabaseRes.ok) {
        const err = await supabaseRes.json();
        throw new Error(`Supabase: ${err.error || 'Failed to create project'}`);
      }

      const supabaseData = await supabaseRes.json();
      supabaseUrl = supabaseData.url;
      supabaseProjectId = supabaseData.projectId;
      supabaseAnonKey = supabaseData.anonKey;
      supabaseServiceKey = supabaseData.serviceKey;

      setCreatedResources(prev => ({
        ...prev,
        supabaseUrl,
        supabaseProjectId,
        supabaseAnonKey,
        supabaseServiceKey,
      }));
      console.log('✓ Supabase created:', supabaseProjectId);

      setCreationStatus(prev => ({ ...prev, supabase: 'done', github: 'creating' }));

      // ========== Step 2: Create GitHub Repository ==========
      console.log('Creating GitHub repository...');

      const githubRes = await fetch('/api/setup/create-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: projectSlug,
          formData: {
            platformName: formData.platformName,
            companyName: formData.companyName,
            companyWebsite: formData.companyWebsite,
            companyEmail: formData.companyEmail,
            adminFirstName: formData.adminFirstName,
            adminLastName: formData.adminLastName,
            adminEmail: formData.adminEmail,
            agentName: formData.agentName,
          },
          createdResources: {
            supabaseUrl,
            supabaseAnonKey,
          },
        }),
      });

      if (!githubRes.ok) {
        const err = await githubRes.json();
        throw new Error(`GitHub: ${err.error || 'Failed to create repository'}`);
      }

      const githubData = await githubRes.json();
      githubRepoUrl = githubData.repoUrl;
      githubRepoName = githubData.repoName || projectSlug;

      setCreatedResources(prev => ({ ...prev, githubRepoUrl }));
      console.log('✓ GitHub repo created:', githubRepoUrl);

      setCreationStatus(prev => ({ ...prev, github: 'done', vercel: 'creating' }));

      // ========== Step 3: Create Vercel Project ==========
      console.log('Creating Vercel project...');

      const vercelRes = await fetch('/api/setup/create-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectSlug,
          githubRepo: githubRepoName,
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
            NEXT_PUBLIC_PLATFORM_NAME: formData.platformName,
            NEXT_PUBLIC_COMPANY_NAME: formData.companyName,
          },
        }),
      });

      if (!vercelRes.ok) {
        const err = await vercelRes.json();
        throw new Error(`Vercel: ${err.error || 'Failed to create project'}`);
      }

      const vercelData = await vercelRes.json();
      vercelUrl = vercelData.url || `https://${projectSlug}.vercel.app`;
      vercelProjectId = vercelData.projectId;

      setCreatedResources(prev => ({ ...prev, vercelUrl, vercelProjectId }));
      console.log('✓ Vercel project created:', vercelUrl);

      setCreationStatus(prev => ({ ...prev, vercel: 'done', elevenlabs: 'creating' }));

      // ========== Step 3b: Trigger Vercel Deployment ==========
      console.log('Triggering Vercel deployment...');

      const triggerRes = await fetch('/api/setup/trigger-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: githubRepoName,
          projectName: projectSlug,
        }),
      });

      if (!triggerRes.ok) {
        console.warn('Initial deployment trigger failed, continuing...');
      } else {
        const triggerData = await triggerRes.json();
        console.log('✓ Deployment triggered:', triggerData.deploymentId || triggerData.commitSha);
      }

      // ========== Step 4: Create ElevenLabs Agent (AFTER Vercel so webhook URL is valid) ==========
      console.log('Creating ElevenLabs agent...');

      const elevenlabsRes = await fetch('/api/setup/create-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: formData.agentName,
          voiceGender: formData.voiceGender,
          companyName: formData.companyName,
          platformName: formData.platformName,
          webhookUrl: `${vercelUrl}/api/webhooks/elevenlabs`,
        }),
      });

      if (elevenlabsRes.ok) {
        const elevenlabsData = await elevenlabsRes.json();
        elevenlabsAgentId = elevenlabsData.agentId;
        setCreatedResources(prev => ({ ...prev, elevenlabsAgentId }));
        console.log('✓ ElevenLabs agent created:', elevenlabsAgentId);

        // Update Vercel with ElevenLabs agent ID
        await fetch('/api/setup/create-vercel', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: vercelProjectId,
            envVars: {
              ELEVENLABS_SETUP_AGENT_ID: elevenlabsAgentId,
            },
          }),
        });
      } else {
        console.warn('ElevenLabs creation failed, continuing...');
      }

      setCreationStatus(prev => ({ ...prev, elevenlabs: 'done', deployment: 'creating' }));

      // ========== Step 5: Configure Auth & Finalize ==========
      console.log('Configuring Supabase auth...');

      await fetch('/api/setup/configure-supabase-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef: supabaseProjectId,
          siteUrl: vercelUrl,
        }),
      });

      console.log('Saving platform setup...');

      await fetch('/api/setup/save-platform-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          leadId,
          supabaseProjectId,
          supabaseUrl,
          elevenlabsAgentId,
          githubRepoUrl,
          vercelProjectId,
          vercelUrl,
          status: 'completed',
        }),
      });

      console.log('Sending welcome email...');

      await fetch('/api/setup/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.adminEmail,
          firstName: formData.adminFirstName,
          companyName: formData.companyName,
          platformName: formData.platformName,
          platformUrl: vercelUrl,
        }),
      });

      setCreationStatus(prev => ({ ...prev, deployment: 'done' }));
      console.log('✓ Platform creation complete!');

    } catch (error: any) {
      console.error('Creation failed:', error);
      setError(error.message || 'Failed to create platform');

      setCreationStatus(prev => {
        const newStatus = { ...prev };
        const steps: (keyof CreationStatus)[] = ['supabase', 'github', 'vercel', 'elevenlabs', 'deployment'];
        for (const s of steps) {
          if (newStatus[s] === 'creating') {
            newStatus[s] = 'error';
            break;
          }
        }
        return newStatus;
      });

      await fetch('/api/setup/save-platform-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          leadId,
          status: 'failed',
          error_message: error.message,
        }),
      });
    }
  };

  // ---------------------------------------------------------------------------
  // UI HELPERS
  // ---------------------------------------------------------------------------

  const getStatusClass = (status: string) => {
    if (status === 'creating') return 'bg-blue-500/10 border-blue-500/30';
    if (status === 'done') return 'bg-green-500/10 border-green-500/30';
    if (status === 'error') return 'bg-red-500/10 border-red-500/30';
    return 'bg-slate-800 border-slate-700';
  };

  const renderStatusIcon = (status: 'pending' | 'creating' | 'done' | 'error') => {
    if (status === 'pending') return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
    if (status === 'creating') return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
    if (status === 'done') return <CheckCircle className="w-5 h-5 text-green-400" />;
    return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">!</div>;
  };

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------

  if (loadingLead) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your information...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER STEPS
  // ---------------------------------------------------------------------------

  const renderCompanyStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Platform & Company</h2>
          <p className="text-sm text-slate-400">Name your platform and tell us about your organization</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Platform Name *</label>
          <input
            type="text"
            value={formData.platformName}
            onChange={(e) => updateForm('platformName', e.target.value)}
            placeholder="Acme Talent Interviews"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
          <p className="text-xs text-slate-500 mt-1">This will be the name of your interview platform</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => updateForm('companyName', e.target.value)}
            placeholder="Acme Inc"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
          <input
            type="url"
            value={formData.companyWebsite}
            onChange={(e) => updateForm('companyWebsite', e.target.value)}
            placeholder="https://acme.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company Email *</label>
          <input
            type="email"
            value={formData.companyEmail}
            onChange={(e) => updateForm('companyEmail', e.target.value)}
            placeholder="contact@acme.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>
      </div>
    </div>
  );

  const renderAdminStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Admin Contact</h2>
          <p className="text-sm text-slate-400">Who should we send the platform details to?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">First Name *</label>
            <input
              type="text"
              value={formData.adminFirstName}
              onChange={(e) => updateForm('adminFirstName', e.target.value)}
              placeholder="John"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Last Name *</label>
            <input
              type="text"
              value={formData.adminLastName}
              onChange={(e) => updateForm('adminLastName', e.target.value)}
              placeholder="Smith"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => updateForm('adminEmail', e.target.value)}
            placeholder="john@acme.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.adminPhone}
            onChange={(e) => updateForm('adminPhone', e.target.value)}
            placeholder="+1 555 123 4567"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>
    </div>
  );

  const renderVoiceStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
          <Mic className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Voice Agent</h2>
          <p className="text-sm text-slate-400">Configure your AI setup assistant</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Agent Name *</label>
          <input
            type="text"
            value={formData.agentName}
            onChange={(e) => updateForm('agentName', e.target.value)}
            placeholder="Setup Agent"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
          />
          <p className="text-xs text-slate-500 mt-2">This is the AI that will help users create their interview agents</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Voice</label>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'female', label: 'Female', desc: 'Sarah - Warm & Professional' },
              { value: 'male', label: 'Male', desc: 'Adam - Deep & Confident' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateForm('voiceGender', option.value as 'female' | 'male')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.voiceGender === option.value
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-slate-400 mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Review & Create</h2>
          <p className="text-sm text-slate-400">Confirm your configuration</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Layout className="w-4 h-4" />
            Platform
          </div>
          <div className="text-white font-medium text-lg">{formData.platformName}</div>
        </div>

        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Building2 className="w-4 h-4" />
            Company
          </div>
          <div className="text-white font-medium">{formData.companyName}</div>
          <div className="text-sm text-slate-400">{formData.companyEmail}</div>
          {formData.companyWebsite && (
            <div className="text-sm text-slate-500">{formData.companyWebsite}</div>
          )}
        </div>

        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <User className="w-4 h-4" />
            Admin
          </div>
          <div className="text-white font-medium">
            {formData.adminFirstName} {formData.adminLastName}
          </div>
          <div className="text-sm text-slate-400">{formData.adminEmail}</div>
        </div>

        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Mic className="w-4 h-4" />
            Voice Agent
          </div>
          <div className="text-white font-medium">{formData.agentName}</div>
          <div className="text-sm text-slate-400 capitalize">{formData.voiceGender} voice</div>
        </div>

        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="font-medium text-purple-400 mb-3">Will Be Created:</div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-400" />
              Supabase database with schema & storage buckets
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              GitHub repository from template
            </li>
            <li className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-blue-400" />
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

  const renderCreatingStep = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Creating {formData.platformName}</h2>
        <p className="text-slate-400 text-sm">This may take 2-3 minutes...</p>
      </div>

      <div className="space-y-3">
        {[
          { key: 'supabase', label: 'Creating Supabase database & storage', icon: Database },
          { key: 'github', label: 'Setting up GitHub repository', icon: Globe },
          { key: 'vercel', label: 'Creating Vercel deployment', icon: Rocket },
          { key: 'elevenlabs', label: 'Creating ElevenLabs voice agent', icon: Mic },
          { key: 'deployment', label: 'Configuring auth & sending email', icon: CheckCircle },
        ].map((item) => {
          const status = creationStatus[item.key as keyof CreationStatus];
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${getStatusClass(status)}`}
            >
              {renderStatusIcon(status)}
              <Icon className="w-5 h-5 text-slate-400" />
              <span className={status === 'done' ? 'text-green-400' : 'text-slate-300'}>
                {item.label}
              </span>
              {status === 'done' && item.key === 'vercel' && createdResources.vercelUrl && (
                <a
                  href={createdResources.vercelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-blue-400 hover:underline text-sm flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Preview
                </a>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {creationStatus.deployment === 'done' && (
        <div className="mt-8 p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>

          <h3 className="text-2xl font-bold text-green-400 mb-2">Platform Created!</h3>
          <p className="text-slate-300 mb-6">
            {formData.platformName} is now live.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href={createdResources.vercelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <Phone className="w-5 h-5" />
              Visit Platform
            </a>
            {createdResources.githubRepoUrl && (
              <a
                href={createdResources.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                <Globe className="w-5 h-5" />
                View Code
              </a>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-6">
            A welcome email has been sent to {formData.adminEmail}
          </p>
        </div>
      )}
    </div>
  );

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