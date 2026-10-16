import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AssistanceLog } from '@/types';
import {
  alertDescription,
  alertMapUrl,
  alertTitle,
  isFraudInterceptAlert,
  isGeofenceExitAlert,
} from '@/lib/notify/alerts';
import { formatDistanceToNow } from 'date-fns';

export function AssistanceLogsTimeline({ logs, loading }: { logs: AssistanceLog[], loading: boolean }) {
  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  if (!logs || logs.length === 0) return <p className="text-gray-500">No recent activity.</p>;

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const description = alertDescription(log);
        const mapLink = alertMapUrl(log);
        const isFraud = isFraudInterceptAlert(log);
        const isGeofence = isGeofenceExitAlert(log);

        return (
          <div key={log.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1 ${log.resolved ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div className="w-px h-full bg-gray-200 my-1"></div>
            </div>
            <div className="min-w-0 flex-1 pb-2">
              {/* The raw enum read as "emergency" here too, so a safe-zone exit
                  or scam intercept looked identical to an SOS in the elder's activity list. */}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{alertTitle(log)}</p>
                {isFraud && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                    Scam shield blocked threat
                  </span>
                )}
                {isGeofence && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Location alert
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-gray-600 mt-1 break-words">{description}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </p>
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-medium text-teal-700 hover:text-teal-800 underline"
                  >
                    View on map <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
