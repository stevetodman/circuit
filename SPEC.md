# SPEC: P5.c — UI/UX Quick Polish

Five focused improvements. Run `npx tsc --noEmit` and confirm exit 0.

---

## 1 — HelpOverlay: add missing shortcuts

**File:** `components/HelpOverlay.tsx`

Update the `SECTIONS` constant. **Do not change the structure**, just add/fix rows:

In the **View** section, add these missing rows (insert in logical order among existing rows):
```
['T', 'Toggle wire thickness by current'],
['H', 'Toggle voltage heatmap on breadboard'],
['D', 'Toggle Bode plot (AC frequency sweep)'],
```

In the **Navigation** section, add:
```
['Scroll on potentiometer', 'Adjust wiper position'],
['Right-click wire', 'Wire colour + net label'],
```

The `~` / `Width` toolbar button actually maps to `T` (already confirmed in KeyboardShortcuts). No other changes.

---

## 2 — Toast: fade-in animation

**Files:** `components/Toast.tsx`, `app/globals.css`

### globals.css

Append to `app/globals.css`:
```css
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.toast-enter {
  animation: toastIn 0.15s ease-out both;
}
```

### Toast.tsx

Add `toast-enter` class to the per-toast `<div>`:
```tsx
<div
  key={toast.id}
  className={`toast-enter pointer-events-auto inline-flex max-w-[32rem] items-start gap-3 rounded-full border px-4 py-2 text-sm shadow-lg ${levelStyles[toast.level]}`}
>
```

That's the only change to Toast.tsx — add `toast-enter ` at the start of the className string.

---

## 3 — Context menus: visual polish

**File:** `components/ContextMenu.tsx`

### ContextMenu (component right-click)

Current outer div:
```tsx
<div
  ref={menuRef}
  className="fixed z-40 min-w-[160px] rounded border border-white/15 bg-[#161616] shadow-2xl overflow-hidden"
  style={{ left: `${cx}px`, top: `${cy}px` }}
```

Replace with:
```tsx
<div
  ref={menuRef}
  className="fixed z-40 min-w-[160px] rounded-lg border border-white/[0.12] bg-[#18181c] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
  style={{
    left: `${cx}px`,
    top: `${cy}px`,
    animation: 'toastIn 0.12s ease-out both',
  }}
```

Changes: `rounded` → `rounded-lg`, border opacity/color to match WireContextMenu, `bg-[#161616]` → `bg-[#18181c]`, enhance shadow, add entrance animation.

### ContextMenu button items

Current button className:
```
"w-full px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
```
Replace with:
```
"w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.08] hover:text-white/90 transition-colors"
```

Apply to BOTH the Lock/Unlock button and the `.map` buttons.

### WireContextMenu

Current outer div:
```tsx
<div
  className="fixed z-50 bg-[#18181c] border border-white/[0.12] rounded-lg shadow-2xl py-1.5 min-w-[160px]"
  style={{ left: wireMenu.x, top: wireMenu.y }}
```

Add entrance animation:
```tsx
<div
  className="fixed z-50 bg-[#18181c] border border-white/[0.12] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1.5 min-w-[160px]"
  style={{
    left: wireMenu.x,
    top: wireMenu.y,
    animation: 'toastIn 0.12s ease-out both',
  }}
```

---

## 4 — Toolbar: horizontal scroll on overflow

**File:** `components/Toolbar.tsx`

Current outer div className:
```
"absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-b border-white/[0.07] h-[36px]"
```

Replace with:
```
"absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-b border-white/[0.07] h-[36px] overflow-x-auto"
```

Also add inline style to hide scrollbar cross-browser:
```tsx
<div
  className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-b border-white/[0.07] h-[36px] overflow-x-auto"
  style={{ scrollbarWidth: 'none' } as React.CSSProperties}
>
```

---

## Type-check

```bash
npx tsc --noEmit
```
Exit 0 required. No console.log, no TODOs.

## Files modified

- `components/HelpOverlay.tsx`
- `components/Toast.tsx`
- `app/globals.css`
- `components/ContextMenu.tsx`
- `components/Toolbar.tsx`
