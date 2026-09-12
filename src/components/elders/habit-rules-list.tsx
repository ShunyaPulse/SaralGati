'use client';
import React, { useEffect } from 'react';
import { useHabitStore } from '@/stores/habit-store';

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
            <p className="text-sm font-medium text-gray-900">{rule.rule_type}</p>
            <p className="text-xs text-gray-500">Confidence: {Math.round(rule.confidence * 100)}%</p>
          </div>
          <button 
            onClick={() => toggleRule(rule.id)}
            className={`px-3 py-1 text-xs rounded-full ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
          >
            {rule.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>
      ))}
    </div>
  );
}
