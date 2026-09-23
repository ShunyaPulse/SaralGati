'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, Smartphone, PhoneCall, Clock, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ElderProfile } from '@/types';
import Link from 'next/link';
import { PairingModal } from './pairing-modal';

interface ElderCardProps {
  elder: ElderProfile;
}

export function ElderCard({ elder }: ElderCardProps) {
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const isLowBattery = elder.battery_status !== null && elder.battery_status <= 20;
  
  // Calculate if active based on last heartbeat within 5 minutes
  const isOnline = elder.last_heartbeat ? new Date(elder.last_heartbeat).getTime() > Date.now() - 5 * 60 * 1000 : false;
  // Fallback to is_active flag if no heartbeat logic applies perfectly
  const activeStatus = isOnline || elder.is_active;

  return (
    <Card hover className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <span className="text-xl font-bold">{elder.elder_name.charAt(0)}</span>
              </div>
              <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${activeStatus ? 'bg-[#22c55e]' : 'bg-gray-400'}`} title={activeStatus ? 'Active' : 'Offline'}></span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{elder.elder_name}</h3>
              <p className="text-sm text-gray-500">
                {elder.preferred_lang === 'hi' ? 'Hindi' : elder.preferred_lang === 'en' ? 'English' : 'Hinglish'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-2 flex-1">
          <div className="flex items-center text-sm text-gray-600">
            <Smartphone className="h-4 w-4 mr-2 text-gray-400" />
            <span className="truncate">
              {elder.phone_model ? (
                `${elder.phone_model} ${elder.os_version ? `(${elder.os_version})` : ''}`
              ) : (
                <span className="text-gray-400 italic">Waiting for device pairing...</span>
              )}
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Battery className={`h-4 w-4 mr-2 ${isLowBattery ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={isLowBattery ? 'text-red-600 font-medium' : ''}>
              {elder.battery_status !== null ? `${elder.battery_status}%` : 'Unknown battery'}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <PhoneCall className="h-4 w-4 mr-2 text-gray-400" />
            <span className="truncate">{elder.emergency_contact || 'No emergency contact'}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            <span>
              {elder.last_heartbeat 
                ? `Last seen ${formatDistanceToNow(new Date(elder.last_heartbeat), { addSuffix: true })}` 
                : 'Never seen'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 justify-center gap-1.5 text-teal-700 hover:text-teal-800 hover:bg-teal-50 border-teal-200"
            onClick={() => setIsPairingOpen(true)}
          >
            <QrCode className="h-4 w-4 text-teal-600" />
            Pair QR
          </Button>
          <Link href={`/elders/${elder.id}`} className="flex-1">
            <Button variant="outline" className="w-full justify-center">View Details</Button>
          </Link>
        </div>

        <PairingModal
          elderId={elder.id}
          elderName={elder.elder_name}
          isOpen={isPairingOpen}
          onClose={() => setIsPairingOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
