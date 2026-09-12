'use client';
import React from 'react';
import { Users, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { ElderProfile, AssistanceLog } from '@/types';

interface StatsCardsProps {
  elders: ElderProfile[];
  alerts: AssistanceLog[];
  loading: boolean;
}

export function StatsCards({ elders, alerts, loading }: StatsCardsProps) {
  // Calculate stats
  const activeEldersCount = elders.filter(e => {
    const isOnline = e.last_heartbeat ? new Date(e.last_heartbeat).getTime() > Date.now() - 5 * 60 * 1000 : false;
    return isOnline || e.is_active;
  }).length;
  
  const unresolvedAlertsCount = alerts.filter(a => !a.resolved).length;
  const highSeverityAlertsCount = alerts.filter(a => !a.resolved && a.metadata?.severity === 'HIGH').length;
  
  const stats = [
    {
      name: 'Active Elders',
      value: loading ? '-' : activeEldersCount.toString(),
      total: loading ? '-' : `out of ${elders.length}`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Open Alerts',
      value: loading ? '-' : unresolvedAlertsCount.toString(),
      total: 'Needs attention',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      name: 'High Priority',
      value: loading ? '-' : highSeverityAlertsCount.toString(),
      total: 'Critical events',
      icon: Activity,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
    },
    {
      name: 'Resolved Today',
      value: loading ? '-' : alerts.filter(a => a.resolved && new Date(a.created_at).toDateString() === new Date().toDateString()).length.toString(),
      total: 'Great job!',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm border border-slate-200"
        >
          <dt>
            <div className={`absolute rounded-md p-3 ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-slate-500">{stat.name}</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            <p className="ml-2 truncate text-xs text-slate-500">{stat.total}</p>
          </dd>
        </div>
      ))}
    </div>
  );
}
