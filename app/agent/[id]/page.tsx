'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, ExternalLink, Phone, Mail, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  interview_purpose: string;
  target_interviewees: string;
  interviewer_tone: string;
  estimated_duration_mins: number;
  elevenlabs_agent_id: string;
}

type DeploymentStatus = 'verifying' | 'ready' | 'failed';

export default function AgentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params.id as string;
  const isNewlyCreated = searchParams.get('created') === 'true';

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>('verifying');
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || '';
  
  const interviewUrl = agent ? `${baseUrl}/i/${agent.slug}` : '';

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  // Start verification after agent loads
  useEffect(() => {
    if (agent && isNewlyCreated) {
      verifyDeployment();
    } else if (agent && !isNewlyCreated) {
      // Not newly created, assume it's working
      setDeploymentStatus('ready');
    }
  }, [agent, isNewlyCreated]);

  // Send email only after deployment is verified
  useEffect(() => {
    if (deploymentStatus === 'ready' && agent && !emailSent) {
      const storedConfig = sessionStorage.getItem('agentConfig');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        if (config.clientEmail) {
          sendWelcomeEmail(config.clientEmail);
        }
      }
    }
  }, [deploymentStatus, agent, emailSent]);

  const loadAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const data = await response.json();
      
      if (response.ok && data.agent) {
        setAgent(data.agent);
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyDeployment = async () => {
    setDeploymentStatus('verifying');
    setVerificationProgress(0);

    // Simulate progress while we verify
    const progressInterval = setInterval(() => {
      setVerificationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Step 1: Check agent exists in database (already done by loadAgent)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVerificationProgress(30);

      // Step 2: Verify ElevenLabs agent is accessible
      if (agent?.elevenlabs_agent_id) {
        const verifyResponse = await fetch('/api/verify-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            agentId: agent.id,
            elevenLabsAgentId: agent.elevenlabs_agent_id 
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('ElevenLabs agent not ready');
        }
      }
      
      setVerificationProgress(70);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Test that interview page loads
      const pageResponse = await fetch(`/api/agents/${agent?.slug || agentId}`);
      if (!pageResponse.ok) {
        throw new Error('Interview page not accessible');
      }

      setVerificationProgress(100);
      clearInterval(progressInterval);
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setDeploymentStatus('ready');

    } catch (error) {
      console.error('Verification failed:', error);
      clearInterval(progressInterval);
      
      if (retryCount < 3) {
        // Auto-retry up to 3 times
        setRetryCount(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 2000));
        verifyDeployment();
      } else {
        setDeploymentStatus('failed');
      }
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(interviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendWelcomeEmail = async (email: string) => {
    if (sendingEmail || emailSent) return;
    
    setSendingEmail(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Your AI Interviewer is Ready - ${agent?.name}`,
          agentName: agent?.name,
          interviewUrl,
          companyName: agent?.company_name,
        }),
      });

      if (response.ok) {
        setEmailSent(true);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    verifyDeployment();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent not found</h1>
          <Link href="/create" className="text-purple-400 hover:underline">
            Create a new agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold">AI Interview Agents</h1>
            <p className="text-sm text-slate-400">by Corporate AI Solutions</p>
          </div>
          <Link
            href="/create"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Create Another
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        
        {/* VERIFYING STATE */}
        {deploymentStatus === 'verifying' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Setting Up Your AI Interviewer</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Please wait while we deploy your custom interviewer. This usually takes less than a minute.
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-sm mx-auto">
              <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {verificationProgress < 30 && 'Creating your agent...'}
                {verificationProgress >= 30 && verificationProgress < 70 && 'Configuring voice settings...'}
                {verificationProgress >= 70 && verificationProgress < 100 && 'Verifying deployment...'}
                {verificationProgress >= 100 && 'Almost ready...'}
              </p>
            </div>

            {retryCount > 0 && (
              <p className="text-sm text-yellow-400 mt-4">
                Taking longer than usual... Retry attempt {retryCount}/3
              </p>
            )}
          </div>
        )}

        {/* FAILED STATE */}
        {deploymentStatus === 'failed' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Setup Taking Longer Than Expected</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Your AI interviewer is being created but verification timed out. 
              This can happen during high traffic. You can try again or contact support.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRetry}
                className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <a
                href="mailto:dennis@corporateaisolutions.com"
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </a>
            </div>

            <p className="text-sm text-slate-500 mt-6">
              Your agent ID: {agent.id}
            </p>
          </div>
        )}

        {/* READY STATE */}
        {deploymentStatus === 'ready' && (
          <>
            {/* Success Banner */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-8 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">
                Your AI Interviewer is Ready!
              </h2>
              <p className="text-slate-300">
                {agent.name} is live and ready to conduct interviews
              </p>
              {emailSent && (
                <p className="text-sm text-green-400 mt-2 flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  Confirmation email sent!
                </p>
              )}
            </div>

            {/* Agent Info Card */}
            <div className="bg-slate-900 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">{agent.name}</h3>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-400">Company</p>
                  <p className="text-white">{agent.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Purpose</p>
                  <p className="text-white">{agent.interview_purpose || 'General interviews'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Target Audience</p>
                  <p className="text-white">{agent.target_interviewees || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Duration</p>
                  <p className="text-white">{agent.estimated_duration_mins} minutes</p>
                </div>
              </div>
            </div>

            {/* Shareable Link */}
            <div className="bg-slate-900 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold mb-2">Your Interview Link</h3>
              <p className="text-sm text-slate-400 mb-4">
                Share this link with people you want to interview
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interviewUrl}
                  readOnly
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm"
                />
                <button
                  onClick={copyLink}
                  className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <Link
                href={`/i/${agent.slug}`}
                className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white px-6 py-4 rounded-xl font-semibold transition"
              >
                <Phone className="w-5 h-5" />
                Test Your Interviewer
              </Link>
              <a
                href={`mailto:?subject=Interview Request&body=Please complete this quick interview: ${interviewUrl}`}
                className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-xl font-semibold transition"
              >
                <Mail className="w-5 h-5" />
                Share via Email
              </a>
            </div>

            {/* Next Steps */}
            <div className="bg-slate-900/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">What's Next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-purple-400">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Test your interviewer</p>
                    <p className="text-sm text-slate-400">
                      Click the button above to experience what your interviewees will see
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-purple-400">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Share the link</p>
                    <p className="text-sm text-slate-400">
                      Send the interview link to your target participants via email, SMS, or any channel
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-purple-400">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Collect insights</p>
                    <p className="text-sm text-slate-400">
                      Your AI interviewer will handle the conversations — you'll receive transcripts and analysis
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="text-center mt-12 pt-8 border-t border-slate-800">
              <p className="text-slate-400 mb-4">Need help or want to customize further?</p>
              <a
                href="https://calendly.com/mcmdennis"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition"
              >
                Book a call with Dennis
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
