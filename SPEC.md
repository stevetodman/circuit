# SPEC: P0.1 Typography/Contrast + P0.5 Focus Indicators

## Context
Circuit Sandbox is a React/Next.js app. The sidebar uses Tailwind CSS.
Run `pnpm build` to verify, no test suite.

## Problems to Fix

### P0.1 — Typography & Contrast
Many UI labels use `text-[10px]` and `text-white/25` or `text-white/20`,
which renders as ~7px effective size after AA and fails WCAG AA contrast.

### P0.5 — Focus Indicators
Tab-navigating reveals no visible focus ring on any button or input.
Keyboard-only users cannot see where focus is.

## Files to Change

### `components/sidebar/Sidebar.tsx`
- Section label "Insert Part": change `text-[10px]` → `text-[11px]`, `text-white/25` → `text-white/40`
- Header span "Circuit Sandbox": keep size but bump to `text-white/90`
- Add `focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none` to the `?` help button and schematic toggle button

### `components/sidebar/StatusBar.tsx`
- Net count span: `text-white/40` → `text-white/50`
- Power line: `text-white/60` → `text-white/70`
- Hovered pin text: `text-white/40` → `text-white/50`

### `components/sidebar/PropertiesInspector.tsx`
- `Label` component: `text-[10px] text-white/40` → `text-[11px] text-white/55`
- Pin name/nodeId in pin list: bump from `text-white/30` and `text-white/20` to `text-white/45` and `text-white/35`
- "No configurable properties": `text-white/20` → `text-white/40`
- Add `focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none` to Delete and ✕ buttons
- Add `focus-visible:ring-1 focus-visible:ring-[#7c6fff] focus-visible:outline-none` to number/color inputs
- Add `focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:outline-none` to toggle button

### `components/sidebar/ExampleLoader.tsx`
- "Load Example" label: `text-white/25` → `text-white/40`
- Description text: `text-white/55` → `text-white/65`
- Select element: add `focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none focus-visible:border-[#7c6fff]/60`

### `components/sidebar/ComponentTile.tsx`
- Read this file first. Find any dim text classes and bump contrast.
- Add `focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none` to the tile button.

### `components/sidebar/ArduinoPanel.tsx` (if it exists)
- Check for dim text and add focus rings to any buttons.

### `components/sidebar/ScopeButton.tsx`
- Add `focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none` to button.

### `app/page.tsx` (or wherever Toast/HelpOverlay buttons are)
- Check for dim text on any overlay close buttons and add focus rings.

## Rules
- Do NOT change layout, spacing, or component structure
- Do NOT add new components or files
- Only change text size classes (10px→11px for labels) and opacity classes (/20→/40, /25→/40, /40→/55)
- Only add `focus-visible:ring-*` and `focus-visible:outline-none` for focus indicators
- Run `pnpm build` at the end and fix any TypeScript errors
