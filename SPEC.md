# SPEC: P2.6 Status Bar Redesign

## Context
Circuit Sandbox — React/Next.js/Tailwind. Run `pnpm build` to verify.
File to change: `components/sidebar/StatusBar.tsx`

## Problem
The current StatusBar is a stack of rows that gets cramped and hard to read.
It mixes mode, sim status, power, error, net count, and hovered pin into
a small vertical space with poor visual hierarchy.

## New Design

Redesign the StatusBar into two clearly segmented rows:

**Row 1** — Simulation status (always visible):
```
[●] Running      ⚡ 12.3mW
```
- Left: sim dot + label
- Right: power display

**Row 2** — Context info (changes based on mode/state):
```
[PLACE]   Esc to cancel
  or
[SELECT]  R1 selected
  or
[WIRE]    Click to connect
  or just: 3 nets
```

**Row 3 (conditional)** — Error banner (only on error):
```
[!] Sim error message     [×]
```

### Segment styles

All rows live in a `border-t border-white/[0.06]` container.

Row 1: `flex items-center justify-between px-3 pt-2 pb-1`
Row 2: `flex items-center gap-2 px-3 pb-2 min-h-[20px]`

**Sim status dot with glow animation:**
```tsx
<span
  className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${simStatus === 'running' ? 'animate-pulse' : ''}`}
  style={{ background: dot.color, boxShadow: simStatus === 'running' ? `0 0 6px ${dot.color}` : 'none' }}
/>
```

**Mode chip** — keep `ModeChip` component but with slightly larger text `text-[10px]` → `text-[11px]`

**Context line** — show the most relevant info:
- `dragging` → `text-[10px] text-white/35 font-mono` "Esc to cancel"
- `wiringMode || selectedNodeId` → "Click to connect"
- `selectedComponentIds.length > 1` → `{n} selected`
- `hoveredNodeId` → hovered pin ID
- Otherwise → `{netCount} net{s}`

**Power** — right-aligned in row 1, `text-[10px] font-mono text-white/50`
Format: use the existing `formatPower()` function unchanged.

**Error banner** — only shown when `simStatus === 'error'` AND `!simErrorDismissed`:

```tsx
<div className="mx-3 mb-2 flex items-start gap-2 rounded border border-red-500/25 bg-red-950/40 px-2 py-1.5">
  <span className="text-[9px] text-red-400 flex-1 leading-tight font-mono">{simError ?? 'Sim error'}</span>
  <button onClick={dismissSimError} className="text-red-400/40 hover:text-red-300 text-[11px] leading-none flex-shrink-0" title="Dismiss">✕</button>
</div>
```

Note: `simErrorDismissed` and `dismissSimError` come from uiStore — import them.
If uiStore doesn't have `simErrorDismissed` yet, add it (boolean, default false)
and `dismissSimError` action (sets it true). Also: `setSimError` should reset it to false.

## Implementation Notes

Rewrite `StatusBar.tsx` entirely from scratch using the design above.
Keep all the same store imports and logic, just restructure the JSX.
Remove the old nested `space-y-1.5` structure.

## Rules
- Only change `components/sidebar/StatusBar.tsx` and `store/uiStore.ts` (if needed)
- Run `pnpm build` and fix all TypeScript errors
