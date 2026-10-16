'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useHabitStore } from '@/stores/habit-store';
import { parseGeofence } from '@/lib/geo/geo';
import { HabitRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** The stored enum values are not meant to be read by a caregiver. */
const RULE_TYPE_LABEL: Record<string, string> = {
  frequent_contact: 'Frequent contact',
  app_trigger: 'App trigger',
  time_routine: 'Time routine',
  location_trigger: 'Location trigger',
};

const ruleTypeLabel = (ruleType: HabitRule['rule_type'] | string) =>
  RULE_TYPE_LABEL[ruleType] ||
  String(ruleType).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function summarizeRulePayload(rule: HabitRule): string | null {
  const payload = rule.rule_payload;
  if (!payload || typeof payload !== 'object') return null;

  const entries = Object.entries(payload).filter(
    ([, val]) => val !== null && val !== undefined && String(val).trim() !== ''
  );
  if (entries.length === 0) return null;

  return entries
    .slice(0, 3)
    .map(([key, val]) => {
      const cleanKey = key.replace(/_/g, ' ');
      const cleanVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `${cleanKey}: ${cleanVal}`;
    })
    .join(' · ');
}

export function HabitRulesList({ elderId }: { elderId: string }) {
  const { rules, loading, fetchRules, addRule, toggleRule, deleteRule } = useHabitStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [ruleType, setRuleType] = useState<'frequent_contact' | 'app_trigger' | 'time_routine'>('frequent_contact');
  const [primaryField, setPrimaryField] = useState('');
  const [secondaryField, setSecondaryField] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules(elderId);
  }, [elderId, fetchRules]);

  const elderRules = (rules || []).filter((rule) => rule.elder_id === elderId);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const p1 = primaryField.trim();
    const p2 = secondaryField.trim();
    if (!p1 || !p2) {
      setFormError('Please fill in both fields.');
      return;
    }

    const payload =
      ruleType === 'frequent_contact'
        ? { alias: p1, contact_name: p2, action: 'call_or_whatsapp' }
        : ruleType === 'app_trigger'
          ? { app_name: p1, trigger_phrase: p2 }
          : { routine_name: p1, time_window: p2 };

    setIsSubmitting(true);
    const created = await addRule({
      elder_id: elderId,
      rule_type: ruleType,
      rule_payload: payload,
      confidence: 1,
      is_active: true,
    });
    setIsSubmitting(false);

    if (created) {
      setPrimaryField('');
      setSecondaryField('');
      setShowAddForm(false);
    } else {
      setFormError('Could not save shortcut. Check if a duplicate already exists.');
    }
  };

  if (loading && elderRules.length === 0) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">
          Learned habits &amp; caregiver shortcuts synced to the phone
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setFormError(null);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          {showAddForm ? 'Cancel' : 'Add Shortcut'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateRule} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
          <div>
            <label htmlFor={`rule-type-${elderId}`} className="block text-xs font-medium text-slate-700 mb-1">
              Shortcut Type
            </label>
            <select
              id={`rule-type-${elderId}`}
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0074c8] focus:outline-none focus:ring-2 focus:ring-[#0074c8]"
            >
              <option value="frequent_contact">Frequent Contact Alias (e.g. &quot;Beta&quot; &rarr; &quot;Rahul Sharma&quot;)</option>
              <option value="app_trigger">App Trigger Shortcut (e.g. &quot;YouTube&quot; &rarr; &quot;Subah ke bhajan&quot;)</option>
              <option value="time_routine">Time Routine (e.g. &quot;Dawai reminder&quot; &rarr; &quot;09:00 AM&quot;)</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={
                ruleType === 'frequent_contact'
                  ? 'Spoken Nickname / Alias'
                  : ruleType === 'app_trigger'
                    ? 'App Name'
                    : 'Routine Name'
              }
              value={primaryField}
              onChange={(e) => setPrimaryField(e.target.value)}
              placeholder={
                ruleType === 'frequent_contact'
                  ? 'Beta / Doctor'
                  : ruleType === 'app_trigger'
                    ? 'WhatsApp / YouTube'
                    : 'BP Medicine'
              }
            />
            <Input
              label={
                ruleType === 'frequent_contact'
                  ? 'Saved Contact Name on Phone'
                  : ruleType === 'app_trigger'
                    ? 'Spoken Phrase / Intent'
                    : 'Time Window'
              }
              value={secondaryField}
              onChange={(e) => setSecondaryField(e.target.value)}
              placeholder={
                ruleType === 'frequent_contact'
                  ? 'Rahul Sharma'
                  : ruleType === 'app_trigger'
                    ? 'Bhajan chala do'
                    : '08:30 AM'
              }
            />
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Shortcut
            </Button>
          </div>
        </form>
      )}

      {elderRules.length === 0 ? (
        <p className="text-gray-500 text-sm">No habit rules found for this elder yet.</p>
      ) : (
        <div className="space-y-3">
          {elderRules.map((rule) => {
            // A safe zone is also a habit rule, but "Location trigger / Confidence
            // 100%" tells the caregiver nothing about the zone they are relying on.
            const zone = rule.rule_type === 'location_trigger' ? parseGeofence(rule.rule_payload) : null;
            const payloadSummary = !zone ? summarizeRulePayload(rule) : null;

            return (
              <div key={rule.id} className="flex justify-between items-center gap-3 p-3 border rounded-lg bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {zone ? `Safe zone: ${zone.label}` : ruleTypeLabel(rule.rule_type)}
                  </p>
                  {payloadSummary && (
                    <p className="text-xs text-gray-700 mt-0.5 truncate">{payloadSummary}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {zone ? `${zone.radius_m} m radius` : `Confidence: ${Math.round(rule.confidence * 100)}%`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    // Conveys the on/off state to assistive tech; the colour and the word
                    // alone do not tell a screen reader this is a toggle.
                    aria-pressed={rule.is_active}
                    className={`px-3 py-1 text-xs rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8] ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this habit rule?')) {
                        deleteRule(rule.id);
                      }
                    }}
                    aria-label="Delete habit rule"
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
