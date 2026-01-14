// app/admin/page.tsx
// SUPERADMIN: Platform operations dashboard
// Access: Only platform operator (you)

'use client';

import { useState, useEffect } from 'react';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';
import { AgentDrilldown } from '@/components/dashboard/AgentDrilldown';
import { Lock, LogIn } from 'lucide-react';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>('');
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  // Check for stored admin key on mount
  useEffect(() => {
    const stored = localStorage.getItem('admin_key');
    if (stored) {
      setAdminKey(stored);
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    // Verify the key by making a test request
    try {
      const res = await fetch('/api/admin/performance?days=1', {
        headers: { 'x-admin-key': inputKey },
      });
      
      if (res.ok) {
        localStorage.setItem('admin_key', inputKey);
        setAdminKey(inputKey);
        setAuthenticated(true);
        setError('');
      } else {
        setError('Invalid admin key');
      }
    } catch {
      setError('Connection failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_key');
    setAdminKey('');
    setAuthenticated(false);
    setSelectedAgent(null);
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-purple-600/20 rounded-full">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Platform Admin
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Enter your admin key to access the operations dashboard
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin Key"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-purple-500"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Access Dashboard
          </button>

          <p className="text-gray-500 text-xs text-center mt-6">
            Set ADMIN_SECRET_KEY in your environment variables
          </p>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Admin Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-600/20 rounded">
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-white font-medium">AI Interview Agents â€¢ Platform Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {selectedAgent ? (
          <AgentDrilldown
            agentId={selectedAgent}
            onBack={() => setSelectedAgent(null)}
          />
        ) : (
          <SuperAdminDashboard
            adminKey={adminKey}
            onAgentSelect={(id) => setSelectedAgent(id)}
          />
        )}
      </div>
    </div>
  );
}

