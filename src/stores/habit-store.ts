import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HabitRule } from '@/types';

export interface CreateHabitInput {
  elder_id: string;
  rule_type: HabitRule['rule_type'];
  rule_payload: Record<string, any>;
  confidence?: number;
  is_active?: boolean;
}

interface HabitState {
  rules: HabitRule[];
  loading: boolean;
  error: string | null;
  fetchRules: (elderId?: string) => Promise<void>;
  addRule: (input: CreateHabitInput) => Promise<HabitRule | null>;
  toggleRule: (id: string) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      rules: [],
      loading: false,
      error: null,

      fetchRules: async (elderId) => {
        set({ loading: true, error: null });
        try {
          const url = elderId ? `/api/habits?elder_id=${encodeURIComponent(elderId)}` : '/api/habits';
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch habit rules');
          const { data } = await res.json();
          const fetched: HabitRule[] = Array.isArray(data) ? data : [];
          set((state) => ({
            rules: elderId
              ? [...state.rules.filter((r) => r.elder_id !== elderId), ...fetched]
              : fetched,
            loading: false,
          }));
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      addRule: async (input) => {
        set({ error: null });
        try {
          const res = await fetch('/api/habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              elder_id: input.elder_id,
              rule_type: input.rule_type,
              rule_payload: input.rule_payload,
              confidence: input.confidence ?? 1,
              is_active: input.is_active ?? true,
            }),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok || !body?.data) {
            throw new Error(body?.error || 'Failed to create habit rule');
          }
          const created: HabitRule = body.data;
          set((state) => ({
            rules: [created, ...state.rules.filter((r) => r.id !== created.id)],
          }));
          return created;
        } catch (err: any) {
          set({ error: err.message || 'Failed to create habit rule' });
          return null;
        }
      },

      toggleRule: async (id) => {
        const previous = get().rules;
        const rule = previous.find((r) => r.id === id);
        if (!rule) return;

        // Optimistic
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r)),
        }));

        try {
          const res = await fetch(`/api/habits/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !rule.is_active }),
          });
          if (!res.ok) throw new Error('Failed to toggle rule');
        } catch (err: any) {
          // Revert
          set({ rules: previous, error: err.message });
        }
      },

      deleteRule: async (id) => {
        const previous = get().rules;
        set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }));

        try {
          const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete rule');
        } catch (err: any) {
          set({ rules: previous, error: err.message });
        }
      },
    }),
    {
      name: 'habit-storage',
    }
  )
);
