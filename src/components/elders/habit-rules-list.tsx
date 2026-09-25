'use client';
import React, { useEffect } from 'react';
import { useHabitStore } from '@/stores/habit-store';
import { HabitRule } from '@/types';

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

export function HabitRulesList({ elderId }: { elderId: string }) {
  const { rules, loading, fetchRules, toggleRule } = useHabitStore();

  useEffect(() => {
    fetchRules(elderId);
  }, [elderId, fetchRules]);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  if (!rules || rules.length === 0) return <p className="text-gray-500">No habit rules found.</p>;

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div key={rule.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-900">{ruleTypeLabel(rule.rule_type)}</p>
            <p className="text-xs text-gray-500">Confidence: {Math.round(rule.confidence * 100)}%</p>
          </div>
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
        </div>
      ))}
    </div>
  );
}
