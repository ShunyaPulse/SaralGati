import React from 'react';
import { AssistanceLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export function AssistanceLogsTimeline({ logs, loading }: { logs: AssistanceLog[], loading: boolean }) {
  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  if (!logs || logs.length === 0) return <p className="text-gray-500">No recent activity.</p>;

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${log.resolved ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="w-px h-full bg-gray-200 my-1"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{log.event_type}</p>
            <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
