'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Battery, Smartphone, Activity, QrCode } from 'lucide-react';
import { useElderStore } from '@/stores/elder-store';
import { useAlertStore } from '@/stores/alert-store';
import { ElderForm } from '@/components/elders/elder-form';
import { HabitRulesList } from '@/components/elders/habit-rules-list';
import { AssistanceLogsTimeline } from '@/components/elders/assistance-logs-timeline';
import { Modal } from '@/components/ui/modal';
import { PairingModal } from '@/components/elders/pairing-modal';
import { ElderProfile } from '@/types';
import { getDeviceStatus } from '@/lib/utils';

const CONNECTION_BADGE_CLASS = {
  online: 'bg-green-100 text-green-800',
  offline: 'bg-amber-100 text-amber-800',
  unpaired: 'bg-slate-200 text-slate-700',
} as const;
const CONNECTION_LABEL = { online: 'Online', offline: 'Offline', unpaired: 'Not paired' } as const;

export default function ElderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const elderId = params.id as string;
  
  const { elders, fetchElders, removeElder, updateElder, loading: eldersLoading } = useElderStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useAlertStore();
  
  const [elder, setElder] = useState<ElderProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (elders.length === 0) {
      fetchElders();
    }
  }, [elders.length, fetchElders]);

  useEffect(() => {
    if (elders.length > 0) {
      const found = elders.find(e => e.id === elderId);
      if (found) setElder(found);
    }
  }, [elders, elderId]);

  useEffect(() => {
    if (elderId) {
      fetchAlerts({ elder_id: elderId, limit: 10 });
    }
  }, [elderId, fetchAlerts]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this elder profile? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await removeElder(elderId);
        router.push('/elders');
      } catch (error) {
        console.error('Failed to delete elder:', error);
        alert('Failed to delete elder profile');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (eldersLoading && !elder) {
    return <div className="animate-pulse h-96 bg-white rounded-xl border border-slate-200"></div>;
  }

  if (!elder && !eldersLoading) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-slate-900">Elder Not Found</h2>
        <p className="text-slate-500 mt-2">The profile you are looking for does not exist or you don't have access.</p>
        <Link href="/elders" className="mt-6 inline-flex items-center text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Elders
        </Link>
      </div>
    );
  }

  if (!elder) return null;

  const deviceStatus = getDeviceStatus(elder);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Link
            href="/elders"
            aria-label="Back to elders"
            className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{elder.elder_name}</h1>
        </div>
        <button
          onClick={() => setIsPairingModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
        >
          <QrCode className="h-4 w-4" />
          Pair Device (QR Code)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    aria-label="Edit profile"
                    className="p-1.5 text-slate-400 hover:text-teal-600 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
                  >
                    <Edit2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    aria-label="Delete profile"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-slate-500">Preferred Language</span>
                  <p className="mt-1 text-slate-900">{elder.preferred_lang === 'hi' ? 'Hindi' : elder.preferred_lang === 'en' ? 'English' : 'Hinglish'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">Emergency Contact</span>
                  <p className="mt-1 text-slate-900">{elder.emergency_contact || 'None set'}</p>
                </div>
              </div>
            </div>
            
            {/* Device Status */}
            <div className="bg-slate-50 border-t border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center">
                <Smartphone className="h-4 w-4 mr-2" /> Device Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-slate-400" /> Connection
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CONNECTION_BADGE_CLASS[deviceStatus]}`}>
                    {CONNECTION_LABEL[deviceStatus]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 flex items-center">
                    <Battery className="h-4 w-4 mr-2 text-slate-400" /> Battery
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {elder.battery_status !== null ? `${elder.battery_status}%` : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Habits and Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">Habit Rules</h2>
            </div>
            <div className="p-6">
              <HabitRulesList elderId={elder.id} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
              <Link href={`/alerts?elder_id=${elder.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
                View All &rarr;
              </Link>
            </div>
            <div className="p-6">
              <AssistanceLogsTimeline logs={alerts} loading={alertsLoading} />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Elder Profile">
        <ElderForm 
          initialData={elder} 
          onSubmit={async (data) => {
            await updateElder(elder.id, data);
            setIsEditModalOpen(false);
          }} 
          onCancel={() => setIsEditModalOpen(false)} 
        />
      </Modal>

      <PairingModal
        elderId={elder.id}
        elderName={elder.elder_name}
        isPaired={deviceStatus !== 'unpaired'}
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
      />
    </div>
  );
}
