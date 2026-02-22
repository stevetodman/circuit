'use client';

import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  level: 'error' | 'warn' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, level: 'error' | 'warn' | 'info') => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 5;

const AUTO_DISMISS_MS: Record<Toast['level'], number> = {
  error: 10_000,
  warn: 5_000,
  info: 5_000,
};

export const useToastStore = create<ToastState>((set) => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const clearTimer = (id: string) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  };

  const trimToasts = (toasts: Toast[]) => {
    if (toasts.length <= MAX_TOASTS) {
      return toasts;
    }

    const overflow = toasts.slice(0, toasts.length - MAX_TOASTS);
    for (const toast of overflow) {
      clearTimer(toast.id);
    }

    return toasts.slice(-MAX_TOASTS);
  };

  return {
    toasts: [],

    addToast: (message, level) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
      const toast: Toast = { id, message, level };

      const timeoutMs = AUTO_DISMISS_MS[level];
      const timeoutId = setTimeout(() => {
        useToastStore.getState().removeToast(id);
      }, timeoutMs);
      timers.set(id, timeoutId);

      set((state) => ({ toasts: trimToasts([...state.toasts, toast]) }));
    },

    removeToast: (id) => {
      clearTimer(id);
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    },
  };
});
