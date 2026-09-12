import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssistanceLog } from '@/types';

interface AlertItemProps {
  alert: AssistanceLog;
  onResolve: (id: string, notes?: string) => void;
  showElderName?: boolean;
}

export function AlertItem({ alert, onResolve, showElderName }: AlertItemProps) {
  const [expanded, setExpanded] = useState(false);

  const severity = alert.metadata?.severity || 'MEDIUM';

  const getSeverityVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <Card className={alert.resolved ? 'opacity-70 bg-gray-50' : 'border-l-4 border-l-red-500'}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <Badge variant={getSeverityVariant(severity)}>
                {severity.toUpperCase()}
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
            
            <h4 className="text-md font-medium text-gray-800 flex items-center capitalize">
              <AlertTriangle className="w-4 h-4 mr-2 text-gray-500" />
              {alert.event_type.replace(/_/g, ' ')}
            </h4>
            
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
              {expanded ? <><ChevronUp className="w-4 h-4 mr-1" /> Less details</> : <><ChevronDown className="w-4 h-4 mr-1" /> More details</>}
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
