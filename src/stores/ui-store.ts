import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: 'light',
      notificationsEnabled: true,
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
    }),
    {
      name: 'saralgati-ui-storage',
    }
  )
);
