'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PairingModalProps {
  elderId: string;
  elderName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PairingModal({ elderId, elderName, isOpen, onClose }: PairingModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchTokenAndGenerateQr = async () => {
    if (!elderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/device-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate device token');
      }

      const rawToken = data.data.token;
      setToken(rawToken);

      const pairingPayload = JSON.stringify({
        app: 'SaralGati',
        version: '1.0',
        elder_id: elderId,
        elder_name: elderName,
        device_token: rawToken,
        api_url: data.data.apiUrl || window.location.origin,
      });

      const qrUrl = await QRCode.toDataURL(pairingPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(qrUrl);
    } catch (err: any) {
      console.error('Pairing QR Error:', err);
      setError(err.message || 'Could not generate pairing QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTokenAndGenerateQr();
    } else {
      setQrDataUrl('');
      setToken('');
      setCopied(false);
    }
  }, [isOpen, elderId]);

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Token copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'Pair Device: ' + elderName}
    >
      <div className="space-y-6 pt-2">
        {/* Instruction Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Instant Android Companion Pairing</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Open the SaralGati companion app on your parent&apos;s phone and scan this QR code to instantly link this device.
            </p>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Generating secure pairing key...</p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center px-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchTokenAndGenerateQr}>
                Try Again
              </Button>
            </div>
          ) : qrDataUrl ? (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={'Pairing QR for ' + elderName}
                  className="w-56 h-56 rounded-lg"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready to Scan
              </span>
            </div>
          ) : null}
        </div>

        {/* Fallback Token Section */}
        {token && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Manual Pairing Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={token}
                className="font-mono text-xs bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 flex-1 select-all focus:outline-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Use this token if the device camera is unavailable.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <a
            href="/api/download"
            className="w-full sm:flex-1"
          >
            <Button variant="outline" className="w-full gap-2 justify-center text-slate-700">
              <Download className="w-4 h-4 text-blue-600" />
              Download APK
            </Button>
          </a>
          <Button
            className="w-full sm:flex-1 bg-teal-600 hover:bg-teal-700 text-white justify-center"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
