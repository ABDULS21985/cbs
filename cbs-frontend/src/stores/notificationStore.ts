import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

/** Toast-only store — transient in-session notifications. Backend-synced data uses React Query. */
interface ToastState {
  activeToasts: AppNotification[];
  addToast: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;
}

export const useNotificationStore = create<ToastState>((set) => ({
  activeToasts: [],

  addToast: (n) => {
    const id = crypto.randomUUID();
    const toast: AppNotification = { ...n, id, read: false, createdAt: new Date().toISOString() };
    set((s) => ({ activeToasts: [...s.activeToasts, toast].slice(-5) }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((s) => ({ activeToasts: s.activeToasts.filter((t) => t.id !== id) }));
    }, 5000);
  },

  dismissToast: (id) => set((s) => ({
    activeToasts: s.activeToasts.filter((t) => t.id !== id),
  })),
}));
