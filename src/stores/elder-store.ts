import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ElderProfile } from '@/types';

export interface ElderInput {
  elder_name: string;
  phone_model?: string | null;
  os_version?: string | null;
  emergency_contact?: string | null;
  preferred_lang?: string;
}

interface ElderState {
  elders: ElderProfile[];
  loading: boolean;
  error: string | null;
  fetchElders: () => Promise<void>;
  addElder: (data: ElderInput) => Promise<void>;
  updateElder: (id: string, data: Partial<ElderProfile>) => Promise<void>;
  removeElder: (id: string) => Promise<void>;
}

export const useElderStore = create<ElderState>()(
  persist(
    (set, get) => ({
      elders: [],
      loading: false,
      error: null,

      fetchElders: async () => {
        set({ loading: true, error: null });
        try {
          const res = await fetch('/api/elders');
          if (!res.ok) throw new Error('Failed to fetch elders');
          const { data } = await res.json();
          set({ elders: data || [], loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      addElder: async (data) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch('/api/elders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error('Failed to add elder');
          const { data: newElder } = await res.json();
          set((state) => ({ elders: [newElder, ...state.elders], loading: false }));
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      updateElder: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`/api/elders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error('Failed to update elder');
          const { data: updatedElder } = await res.json();
          set((state) => ({
            elders: state.elders.map((e) => (e.id === id ? updatedElder : e)),
            loading: false,
          }));
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      removeElder: async (id) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`/api/elders/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete elder');
          set((state) => ({
            elders: state.elders.filter((e) => e.id !== id),
            loading: false,
          }));
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },
    }),
    {
      name: 'elder-storage',
    }
  )
);
