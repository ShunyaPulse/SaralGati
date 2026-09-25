'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Navigation, ShieldCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ElderProfile } from '@/types';
import { useHabitStore } from '@/stores/habit-store';
import {
  DEFAULT_GEOFENCE_RADIUS_M,
  MAX_GEOFENCE_RADIUS_M,
  MIN_GEOFENCE_RADIUS_M,
  isLocationFresh,
  mapsUrl,
  parseGeofence,
  toGeoPoint,
} from '@/lib/geo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Live location for one elder, plus the safe-zone (geofence) editor.
 *
 * There is no embedded map on purpose: an embed needs a third-party key in the
 * bundle and would stream the elder's coordinates to that vendor on every page
 * view. The caregiver clicks through to Maps only when they actually need it.
 */
export function LiveLocationCard({ elder }: { elder: ElderProfile }) {
  const { rules, fetchRules, deleteRule } = useHabitStore();

  const [label, setLabel] = useState('Safe zone');
  const [radius, setRadius] = useState(String(DEFAULT_GEOFENCE_RADIUS_M));
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchRules(elder.id);
  }, [elder.id, fetchRules]);

  const point = toGeoPoint(elder.last_lat, elder.last_lng);
  const isLive = isLocationFresh(elder.location_updated_at);

  const locationRules = rules.filter((rule) => rule.rule_type === 'location_trigger');
  const fenceRule = locationRules.find((rule) => rule.is_active) ?? locationRules[0];
  const fenceRuleId = fenceRule?.id ?? null;
  const fence = fenceRule ? parseGeofence(fenceRule.rule_payload) : null;

  // Prefill the editor with the fence the elder is already protected by, so
  // "change the radius" does not mean retyping the coordinates.
  useEffect(() => {
    if (!fenceRuleId || !fence) return;
    setLabel(fence.label);
    setRadius(String(fence.radius_m));
    setLatitude(String(fence.latitude));
    setLongitude(String(fence.longitude));
  }, [fenceRuleId, fence?.label, fence?.radius_m, fence?.latitude, fence?.longitude]);

  const useCurrentPosition = () => {
    if (!point) return;
    setLatitude(point.latitude.toFixed(6));
    setLongitude(point.longitude.toFixed(6));
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    setNotice(null);

    const trimmedLabel = label.trim();
    const radiusM = Number(radius);
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!trimmedLabel) {
      setFormError('Give the safe zone a name, for example "Ghar".');
      return;
    }
    if (!Number.isFinite(radiusM) || radiusM < MIN_GEOFENCE_RADIUS_M || radiusM > MAX_GEOFENCE_RADIUS_M) {
      setFormError(`Radius must be between ${MIN_GEOFENCE_RADIUS_M} and ${MAX_GEOFENCE_RADIUS_M} metres.`);
      return;
    }
    if (!toGeoPoint(lat, lng)) {
      setFormError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180), or use the phone\'s current position.');
      return;
    }

    const payload = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      radius_m: Math.round(radiusM),
      label: trimmedLabel,
    };

    setIsSaving(true);
    try {
      const response = await fetch(fenceRule ? `/api/habits/${fenceRule.id}` : '/api/habits', {
        method: fenceRule ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          fenceRule
            ? { rule_payload: payload, is_active: true }
            : {
                elder_id: elder.id,
                rule_type: 'location_trigger',
                rule_payload: payload,
                confidence: 1,
                is_active: true,
              }
        ),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Could not save the safe zone');
      }

      await fetchRules(elder.id);
      setNotice(fenceRule ? 'Safe zone updated.' : 'Safe zone saved. You will be alerted if the elder leaves it.');
    } catch (error: any) {
      setFormError(error.message || 'Could not save the safe zone');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!fenceRule) return;
    if (!confirm('Delete this safe zone? The elder will no longer be watched against it.')) return;
    setNotice(null);
    await deleteRule(fenceRule.id);
    await fetchRules(elder.id);
    setLabel('Safe zone');
    setRadius(String(DEFAULT_GEOFENCE_RADIUS_M));
    setLatitude('');
    setLongitude('');
    setNotice('Safe zone deleted.');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-slate-400" aria-hidden="true" /> Live Location
          </h2>
          {point && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isLive ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isLive ? 'Live' : 'Stale'}
            </span>
          )}
        </div>

        {point ? (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-slate-500">Last known position</span>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 flex items-center">
                <Navigation className="h-4 w-4 mr-2 text-slate-400" aria-hidden="true" /> Accuracy
              </span>
              <span className="text-sm font-medium text-slate-900">
                {typeof elder.location_accuracy_m === 'number' ? `± ${Math.round(elder.location_accuracy_m)} m` : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Updated</span>
              <span className="text-sm font-medium text-slate-900">
                {elder.location_updated_at
                  ? formatDistanceToNow(new Date(elder.location_updated_at), { addSuffix: true })
                  : 'Unknown'}
              </span>
            </div>
            <a
              href={mapsUrl(point)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8] rounded"
            >
              Open in Maps <ExternalLink className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
            </a>
            {!isLive && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">
                This position is old. The phone is not reporting a fresh fix — check that location access is allowed in the
                SaralGati app.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No location reported yet. Location sharing starts once the phone runs the latest companion app and allows
            location access.
          </p>
        )}
      </div>

      <div className="bg-slate-50 border-t border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-1 flex items-center">
          <ShieldCheck className="h-4 w-4 mr-2 text-slate-400" aria-hidden="true" /> Safe zone
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          You get an alert as soon as the elder walks out of this circle.
        </p>

        {fence && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-900">{fence.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {fence.radius_m} m radius · {fence.latitude.toFixed(5)}, {fence.longitude.toFixed(5)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {fenceRule?.is_active ? 'Watching this zone' : 'Paused'} ·{' '}
                  <a
                    href={mapsUrl(fence)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-600"
                  >
                    view on map
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                aria-label={`Delete safe zone ${fence.label}`}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Input
            label="Zone name"
            value={label}
            maxLength={60}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ghar"
          />
          <Input
            label="Radius (metres)"
            type="number"
            inputMode="numeric"
            min={MIN_GEOFENCE_RADIUS_M}
            max={MAX_GEOFENCE_RADIUS_M}
            step={10}
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
            helperText={`Between ${MIN_GEOFENCE_RADIUS_M} and ${MAX_GEOFENCE_RADIUS_M} metres.`}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="28.613900"
            />
            <Input
              label="Longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="77.209000"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={useCurrentPosition} disabled={!point}>
              <Navigation className="h-4 w-4 mr-1.5" aria-hidden="true" /> Use phone's position
            </Button>
            <Button type="button" size="sm" onClick={handleSave} isLoading={isSaving}>
              {fenceRule ? 'Update safe zone' : 'Save safe zone'}
            </Button>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {notice && !formError && <p className="text-sm text-emerald-700">{notice}</p>}
        </div>
      </div>
    </div>
  );
}
