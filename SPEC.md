# SPEC: P0.4 Persistent Error Badge + F6.4 Worker Crash Toasts

## Context
Circuit Sandbox — React/Next.js/Tailwind. Run `pnpm build` to verify.

Key files:
- `store/uiStore.ts` — holds `simStatus`, `simError`, `setSimError`
- `store/toastStore.ts` — `addToast(message, severity)` where severity = 'error' | 'warn' | 'info'
- `components/SimController.tsx` — listens to worker messages, calls setSimStatus/setSimError
- `simulation/workers/analog.worker.ts` — posts SIM_WARN messages
- `components/sidebar/StatusBar.tsx` — displays sim status

## Problems to Fix

### P0.4 — Persistent Error Badge
Currently, simulation errors only show in the StatusBar at the bottom of the
sidebar if `simStatus === 'error'`, and toasts auto-dismiss. If a user isn't
looking at the sidebar, they miss the error entirely.

Fix: Add a dismissible error banner/badge that stays until explicitly dismissed.

### F6.4 — Worker Crash Toasts
When the analog or arduino worker crashes (throws unhandled error), nothing
is shown to the user. Workers may fail silently.

## Changes

### `store/uiStore.ts`
Read this file first. Add a `simErrorDismissed: boolean` field (default: false)
and a `dismissSimError()` action that sets it to true.
Also ensure `setSimError(error)` resets `simErrorDismissed` to false when a
new non-null error is set.

### `components/sidebar/StatusBar.tsx`
Read this file. After the existing `simStatus === 'error'` block:
- Import `dismissSimError` from uiStore
- Show the error badge only when `simStatus === 'error' && !simErrorDismissed`
- Replace the existing error span with a styled dismissible banner:
```tsx
{simStatus === 'error' && !simErrorDismissed && (
  <div className="flex items-start gap-2 mt-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5">
    <span className="text-[10px] text-red-400 flex-1 leading-tight" title={simError ?? ''}>
      {simError ?? 'Simulation error'}
    </span>
    <button
      onClick={dismissSimError}
      className="text-red-400/50 hover:text-red-300 text-[12px] leading-none flex-shrink-0 mt-0.5"
      title="Dismiss"
    >
      ✕
    </button>
  </div>
)}
```
- Also show a small persistent red dot in the mode row when `simStatus === 'error'` even after dismissal:
  In the sim status indicator, when error: add `animate-pulse` to the dot.

### `components/SimController.tsx`
Read this file. Find where worker `onerror` or `messageerror` is handled (or where it's NOT handled).
Add error handlers for both `analogWorker` and `arduinoWorker` (if they exist):
```tsx
analogWorker.onerror = (e) => {
  setSimStatus('error');
  setSimError(`Simulation worker crashed: ${e.message}`);
};
```
Also in the worker `onmessage` handler, if a message type `SIM_WARN` is received,
call `addToast(payload.message, 'warn')` — check if this already happens and add it if not.

## Rules
- Only modify the files listed above
- Do NOT change simulation logic
- Run `pnpm build` at the end and fix any TypeScript errors
