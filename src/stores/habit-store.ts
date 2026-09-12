import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HabitRule } from '@/types';

interface HabitState {
  rules: HabitRule[];
  loading: boolean;
  error: string | null;
  fetchRules: (elderId?: string) => Promise<void>;
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
          const url = elderId ? `/api/habits?elder_id=${elderId}` : '/api/habits';
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch habit rules');
          const { data } = await res.json();
          set({ rules: data || [], loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
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
          // Assuming there's a patch endpoint or we reuse update
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
