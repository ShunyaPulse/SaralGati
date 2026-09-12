'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PlusCircle, BellRing } from 'lucide-react';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentAlerts } from '@/components/dashboard/recent-alerts';
import { ElderStatusList } from '@/components/dashboard/elder-status-list';
import { useElderStore } from '@/stores/elder-store';
import { useAlertStore } from '@/stores/alert-store';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { fetchElders, elders, loading: eldersLoading } = useElderStore();
  const { fetchAlerts, alerts, loading: alertsLoading } = useAlertStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchElders();
    fetchAlerts();
  }, [fetchElders, fetchAlerts]);

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user?.name || 'Caregiver'}
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your loved ones today.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/alerts"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            <BellRing className="h-4 w-4 text-amber-500" />
            View Alerts
          </Link>
          <Link
            href="/elders?action=new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Add Elder
          </Link>
        </div>
      </div>

      <StatsCards elders={elders} alerts={alerts} loading={eldersLoading || alertsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Recent Alerts</h2>
              <Link href="/alerts" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                View All &rarr;
              </Link>
            </div>
            <div className="p-6">
              <RecentAlerts alerts={alerts.slice(0, 5)} loading={alertsLoading} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Elder Status</h2>
            </div>
            <div className="p-6 h-full">
              <ElderStatusList elders={elders} loading={eldersLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
