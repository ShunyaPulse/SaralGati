import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssistanceLog } from '@/types';
import { alertDescription, alertMapUrl, alertTitle } from '@/lib/alerts';
import { normalizeSeverity } from '@/lib/utils';

const SEVERITY_VARIANT = { high: 'danger', medium: 'warning', low: 'info' } as const;
const SEVERITY_LABEL = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' } as const;

interface AlertItemProps {
  alert: AssistanceLog;
  onResolve: (id: string, notes?: string) => void;
  showElderName?: boolean;
}

export function AlertItem({ alert, onResolve, showElderName }: AlertItemProps) {
  const [expanded, setExpanded] = useState(false);

  const severity = normalizeSeverity(alert.metadata?.severity);
  const title = alertTitle(alert);
  const description = alertDescription(alert);
  const mapUrl = alertMapUrl(alert);

  return (
    <Card className={alert.resolved ? 'opacity-70 bg-gray-50' : 'border-l-4 border-l-red-500'}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <Badge variant={SEVERITY_VARIANT[severity]}>
                {SEVERITY_LABEL[severity]}
              </Badge>
              {showElderName && (
                <span className="font-semibold text-gray-900 text-lg">
                  {alert.elder_name || 'Unknown Elder'}
                </span>
              )}
              {alert.resolved && (
                <Badge variant="success" className="ml-2">
                  <CheckCircle className="w-3 h-3 mr-1" /> Resolved
                </Badge>
              )}
            </div>
            
            <h4 className="text-md font-medium text-gray-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-gray-500" aria-hidden="true" />
              {title}
            </h4>

            {description && (
              <p className="text-sm text-gray-700 mt-1">{description}</p>
            )}

            {/* A wander is only actionable if the caregiver can see where it
                happened; the position is stored on the alert, so link it out. */}
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8] rounded"
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Where this happened
              </a>
            )}

            <p className="text-sm text-gray-600 mt-1">
              Occurred at {format(new Date(alert.created_at), 'PPpp')} 
              ({formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })})
            </p>
          </div>
          
          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
            {!alert.resolved && (
              <Button size="sm" onClick={() => onResolve(alert.id)}>
                Resolve Alert
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500"
            >
              {expanded ? (
                <><ChevronUp className="w-4 h-4 mr-1" aria-hidden="true" /> Less details</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-1" aria-hidden="true" /> More details</>
              )}
            </Button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">App Package:</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">{alert.app_package || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Screen Name:</span>
              <span className="font-medium text-gray-900">{alert.screen_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Event Type:</span>
              <span className="font-medium text-gray-900">{alert.event_type}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Duration:</span>
              <span className="font-medium text-gray-900">{alert.duration_ms ? `${Math.round(alert.duration_ms / 1000)} seconds` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Metadata:</span>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(alert.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
