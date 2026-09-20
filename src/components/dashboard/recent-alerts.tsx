'use client';
import React from 'react';
import { AssistanceLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function RecentAlerts({ alerts, loading }: { alerts: AssistanceLog[], loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex p-4 border border-slate-100 rounded-lg">
            <div className="w-10 h-10 bg-slate-200 rounded-full mr-4"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
        <p className="text-sm font-medium text-slate-900">All clear!</p>
        <p className="text-xs text-slate-500 mt-1">No recent alerts to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        let Icon = Info;
        let colorClass = 'text-blue-500 bg-blue-50';
        let severity = alert.metadata?.severity || 'LOW';

        if (alert.resolved) {
          Icon = CheckCircle2;
          colorClass = 'text-emerald-500 bg-emerald-50';
        } else if (severity === 'HIGH') {
          Icon = ShieldAlert;
          colorClass = 'text-rose-500 bg-rose-50';
        } else if (severity === 'MEDIUM') {
          Icon = AlertTriangle;
          colorClass = 'text-amber-500 bg-amber-50';
        }

        return (
          <div key={alert.id} className={`flex items-start p-3 rounded-lg border ${alert.resolved ? 'border-slate-100 bg-white opacity-60' : 'border-slate-200 bg-white shadow-sm'}`}>
            <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {alert.elder_name || 'Unknown Elder'}
                </p>
                <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5 capitalize">
                {alert.event_type.replace(/_/g, ' ')}
              </p>
              {alert.screen_name && (
                <p className="text-xs text-slate-500 mt-1 truncate">
                  Screen: {alert.screen_name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
