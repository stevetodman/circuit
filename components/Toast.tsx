'use client';

import { useToastStore } from '@/store/toastStore';
import type { Toast as ToastItem } from '@/store/toastStore';

const levelStyles: Record<ToastItem['level'], string> = {
  error: 'bg-red-500/95 border-red-300 text-white',
  warn: 'bg-amber-500/95 border-amber-300 text-white',
  info: 'bg-blue-500/95 border-blue-300 text-white',
};

export default function Toast() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-30 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto inline-flex max-w-[32rem] items-start gap-3 rounded-full border px-4 py-2 text-sm shadow-lg ${levelStyles[toast.level]}`}
        >
          <span className="min-w-0 flex-1 text-left">{toast.message}</span>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-sm font-bold leading-none transition hover:bg-black/30"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss toast"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
