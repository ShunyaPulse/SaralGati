'use client';
import React from 'react';
import { Battery } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ElderProfile } from '@/types';
import { getDeviceStatus } from '@/lib/utils';
import Link from 'next/link';

const DEVICE_DOT_CLASS = { online: 'bg-green-500', offline: 'bg-amber-400', unpaired: 'bg-slate-300' } as const;
const DEVICE_LABEL = { online: 'Online', offline: 'Offline', unpaired: 'Not paired yet' } as const;

interface ElderStatusListProps {
  elders: ElderProfile[];
  loading: boolean;
}

export function ElderStatusList({ elders, loading }: ElderStatusListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center p-3 border border-slate-100 rounded-lg">
            <div className="w-10 h-10 bg-slate-200 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (elders.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No elders added yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {elders.map((elder) => {
        const deviceStatus = getDeviceStatus(elder);
        const isLowBattery = elder.battery_status !== null && elder.battery_status <= 20;

        return (
          <Link key={elder.id} href={`/elders/${elder.id}`} className="block">
            <div className="flex items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="relative mr-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
                  {elder.elder_name.charAt(0)}
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${DEVICE_DOT_CLASS[deviceStatus]}`}
                  title={DEVICE_LABEL[deviceStatus]}
                  aria-label={DEVICE_LABEL[deviceStatus]}
                ></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{elder.elder_name}</h3>
                <div className="flex items-center text-xs text-slate-500 mt-0.5">
                  <span className="truncate">
                    {elder.phone_model ? elder.phone_model : <span className="text-slate-400 italic">Waiting for pairing...</span>}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end justify-center ml-2 space-y-1">
                {elder.battery_status !== null && (
                  <div className={`flex items-center text-xs font-medium ${isLowBattery ? 'text-red-600' : 'text-slate-600'}`}>
                    {elder.battery_status}%
                    <Battery className={`w-3 h-3 ml-1 ${isLowBattery ? 'text-red-500' : 'text-slate-400'}`} />
                  </div>
                )}
                {elder.last_heartbeat && (
                  <div className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(elder.last_heartbeat), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
