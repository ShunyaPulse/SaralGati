'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useElderStore } from '@/stores/elder-store';
import { Smartphone, Copy, Check, ShieldAlert, Key, User } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { elders, fetchElders } = useElderStore();
  
  const [selectedElderId, setSelectedElderId] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchElders();
  }, [fetchElders]);

  const handleGenerateToken = async () => {
    if (!selectedElderId) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/device-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elderId: selectedElderId })
      });
      
      const data = await res.json();
      if (data.success && data.token) {
        setDeviceToken(data.token);
        setCopied(false);
        toast.success('Device token generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(deviceToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and device connections.</p>
      </div>

      <div className="grid gap-8">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-teal-600" />
              Profile Information
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <div className="mt-1 text-slate-900 font-medium">{session?.user?.name || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <div className="mt-1 text-slate-900 font-medium">{session?.user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 capitalize">
                {session?.user?.role || 'Caregiver'}
              </div>
            </div>
          </div>
        </div>

        {/* Device Linking Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-teal-600" />
              Device Linking
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-6">
              Generate a secure token to link the SaralGati Android Companion App to an elder's profile.
              Tokens are only shown once. Keep them secure.
            </p>

            <div className="space-y-4 max-w-md">
              <div>
                <label htmlFor="elder-select" className="block text-sm font-medium text-slate-700 mb-1">
                  Select Elder Profile
                </label>
                <select
                  id="elder-select"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                  value={selectedElderId}
                  onChange={(e) => {
                    setSelectedElderId(e.target.value);
                    setDeviceToken(''); // Clear token when elder changes
                  }}
                >
                  <option value="">-- Choose an elder --</option>
                  {elders.map((elder) => (
                    <option key={elder.id} value={elder.id}>
                      {elder.elder_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateToken}
                disabled={!selectedElderId || isGenerating}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate New Token'}
              </button>

              {deviceToken && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Your Device Token
                  </label>
                  <div className="flex items-center">
                    <code className="flex-1 block break-all text-sm font-mono text-slate-900 bg-white p-3 rounded border border-slate-200">
                      {deviceToken}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="ml-3 inline-flex items-center p-3 border border-transparent rounded shadow-sm text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-amber-600 flex items-center">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Please copy this token now. You won't be able to see it again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
