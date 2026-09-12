import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AssistanceLog } from '@/types';

export interface AlertFilters {
  elder_id?: string;
  event_types?: string[];
  from_date?: string;
  to_date?: string;
  limit?: number;
}

interface AlertState {
  alerts: AssistanceLog[];
  loading: boolean;
  error: string | null;
  filters: AlertFilters;
  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;
  dismissAlert: (id: string) => void;
  setFilters: (filters: AlertFilters) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      loading: false,
      error: null,
      filters: {},

      fetchAlerts: async (customFilters) => {
        set({ loading: true, error: null });
        const appliedFilters = customFilters || get().filters;
        
        try {
          const query = new URLSearchParams();
          if (appliedFilters.elder_id) query.append('elder_id', appliedFilters.elder_id);
          if (appliedFilters.event_types?.length) query.append('event_types', appliedFilters.event_types.join(','));
          if (appliedFilters.from_date) query.append('from_date', appliedFilters.from_date);
          if (appliedFilters.to_date) query.append('to_date', appliedFilters.to_date);
          if (appliedFilters.limit) query.append('limit', appliedFilters.limit.toString());
          
          const res = await fetch(`/api/alerts?${query.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch alerts');
          
          const { data } = await res.json();
          set({ alerts: data || [], loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      resolveAlert: async (id) => {
        const previous = get().alerts;
        // Optimistic update
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
        }));

        try {
          const res = await fetch(`/api/alerts/${id}/resolve`, {
            method: 'PATCH',
          });
          if (!res.ok) throw new Error('Failed to resolve alert');
        } catch (err: any) {
          // Revert on error
          set({ alerts: previous, error: err.message });
        }
      },

      dismissAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
      },

      setFilters: (filters) => {
        set({ filters });
        get().fetchAlerts(filters);
      },
    }),
    {
      name: 'alert-storage',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);
