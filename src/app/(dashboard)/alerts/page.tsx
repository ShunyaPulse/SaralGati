'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertFilters } from '@/components/alerts/alert-filters';
import { AlertItem } from '@/components/alerts/alert-item';
import { useAlertStore } from '@/stores/alert-store';
import { useElderStore } from '@/stores/elder-store';
import { Bell, RefreshCw } from 'lucide-react';
import { AssistanceLog } from '@/types';

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const { alerts, loading: isLoading, fetchAlerts, resolveAlert } = useAlertStore();
  const { elders, fetchElders } = useElderStore();
  
  const [filters, setFilters] = useState<{ elder_id?: string; status: 'active' | 'resolved' | 'all' }>(() => {
    const statusParam = searchParams.get('status');
    return {
      elder_id: searchParams.get('elder_id') || undefined,
      status: statusParam === 'resolved' || statusParam === 'all' ? statusParam : 'active',
    };
  });
  
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchElders();
  }, [fetchElders]);

  useEffect(() => {
    const appliedFilters = { ...filters, page, limit };
    fetchAlerts(appliedFilters);
    
    // Polling every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts(appliedFilters); 
    }, 30000);
    
    return () => clearInterval(interval);
  }, [filters, page, fetchAlerts, limit]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset page on filter change
  };

  const handleResolve = async (id: string, resolution_notes?: string) => {
    await resolveAlert(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts & Logs</h1>
          <p className="text-slate-500 mt-1">Monitor assistance requests and system events.</p>
        </div>
        <button 
          onClick={() => fetchAlerts({ ...filters, limit })}
          className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <AlertFilters elders={elders} filters={filters} onFilterChange={handleFilterChange} />
        </div>
        
        <div className="divide-y divide-slate-100">
          {isLoading && alerts.length === 0 ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
            </div>
          ) : alerts.length > 0 ? (
            alerts.map((alert: AssistanceLog) => (
              <AlertItem 
                key={alert.id} 
                alert={alert} 
                onResolve={handleResolve}
                showElderName={!filters.elder_id}
              />
            ))
          ) : (
            <div className="text-center py-16 px-6">
              <div className="mx-auto h-12 w-12 text-slate-400 flex items-center justify-center rounded-full bg-slate-100 mb-4">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No alerts found</h3>
              <p className="mt-1 text-sm text-slate-500">
                You're all caught up! No recent logs match your filters.
              </p>
            </div>
          )}
        </div>
        
        {/* Simple Pagination */}
        {(page > 1 || alerts.length >= limit) && (
          <div className="border-t border-slate-200 p-4 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
