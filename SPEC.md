# SPEC: P4.a — Sidebar UX (Recent Parts + Resize + Kbd Tooltips)

Three sidebar/toolbar improvements. Run `npx tsc --noEmit` and confirm exit 0.

---

## P4.1 — Recently Used Parts

uiStore already has `recentlyUsedTypes: string[]` (persisted) and `addRecentlyUsedType(type)`.

### Changes to `components/sidebar/Sidebar.tsx`

1. **Add "recent" to the category type:**
   Change `type Category = 'all' | 'passive' | 'active' | 'power' | 'ic'`
   to `type Category = 'all' | 'recent' | 'passive' | 'active' | 'power' | 'ic'`

2. **Read recentlyUsedTypes from uiStore:**
   ```ts
   const recentlyUsedTypes = useUIStore((s) => s.recentlyUsedTypes);
   const addRecentlyUsedType = useUIStore((s) => s.addRecentlyUsedType);
   ```

3. **Add "Recent" chip to the category filter row:**
   Add before the "All" chip (or right after "All"):
   ```tsx
   {recentlyUsedTypes.length > 0 && (
     <button
       key="recent"
       onClick={() => setCategory('recent')}
       className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
         category === 'recent'
           ? 'bg-amber-500/25 border-amber-500/50 text-amber-200'
           : 'border-white/[0.1] text-white/35 hover:text-white/60 hover:border-white/20'
       }`}
     >
       Recent
     </button>
   )}
   ```

4. **Filter logic for "recent" category:**
   Update `filteredParts`:
   ```ts
   const filteredParts = PARTS.filter((p) => {
     const matchesQuery = !query || p.label.toLowerCase().includes(query.toLowerCase());
     if (category === 'recent') {
       return matchesQuery && recentlyUsedTypes.includes(p.type as string);
     }
     const matchesCategory = category === 'all' || PART_CATEGORIES[p.type] === category;
     return matchesQuery && matchesCategory;
   });
   ```
   Also sort `filteredParts` by recency when category === 'recent':
   When category is 'recent', return parts sorted so most recently used appears first:
   ```ts
   if (category === 'recent') {
     return filteredParts.sort((a, b) =>
       recentlyUsedTypes.indexOf(a.type as string) - recentlyUsedTypes.indexOf(b.type as string)
     );
   }
   ```

5. **Call addRecentlyUsedType when dragging a component:**
   In the onAdd handler for non-wire parts:
   ```ts
   onAdd={() => {
     addRecentlyUsedType(p.type as string);
     startDrag(p.type as ComponentType);
   }}
   ```

---

## P4.3 — Sidebar Resizable

### Goal
Drag handle on the sidebar's right edge. Width clamped 200–400px, persisted to localStorage.

### Implementation in `components/sidebar/Sidebar.tsx`

**Add state:**
```ts
const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
  if (typeof window === 'undefined') return 260;
  const saved = window.localStorage.getItem('circuit-sidebar-width');
  return saved ? Math.max(200, Math.min(400, Number(saved))) : 260;
});
```

**Persist width changes:**
```ts
useEffect(() => {
  window.localStorage.setItem('circuit-sidebar-width', String(sidebarWidth));
}, [sidebarWidth]);
```

**Add drag handle:**
```tsx
{/* Resize handle on right edge */}
<div
  style={{
    position: 'absolute',
    top: 0,
    right: -3,
    width: 6,
    height: '100%',
    cursor: 'col-resize',
    zIndex: 10,
  }}
  onMouseDown={(e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(200, Math.min(400, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }}
/>
```

**Apply width to the `<aside>` element:**
Change the aside's style to use `sidebarWidth` instead of the CSS variable:
```tsx
<aside
  className="flex flex-col h-full select-none relative"
  style={{
    width: sidebarWidth,
    background: 'var(--sidebar-bg, #111113)',
    borderRight: '1px solid var(--sidebar-border, #252528)',
    flexShrink: 0,
  }}
>
```
Note: add `relative` to className so the absolute-positioned handle works.

---

## P4.6 — Keyboard Shortcut Badges on Toolbar

### Goal
Add a `kbd` prop to `ToolbarBtn`. When provided, renders a small styled `<kbd>` badge inside the button after the label text.

### Changes to `components/Toolbar.tsx`

**Update ToolbarBtn interface and component:**
```tsx
function ToolbarBtn({
  onClick, title, disabled, active, children, kbd,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  kbd?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/[0.1] cursor-pointer'}
        ${active ? 'bg-white/[0.1] text-white/90' : 'text-white/55 hover:text-white/80'}
        focus-visible:ring-1 focus-visible:ring-[#7c6fff] focus-visible:outline-none`}
    >
      {children}
      {kbd && (
        <kbd className="ml-0.5 px-0.5 py-px rounded text-[8px] font-mono bg-white/[0.08] border border-white/[0.15] text-white/40 leading-none">
          {kbd}
        </kbd>
      )}
    </button>
  );
}
```

**Add kbd props to existing buttons:**
- Undo: `kbd="⌘Z"`
- Redo: `kbd="⌘⇧Z"`
- Delete: `kbd="Del"`
- Copy: `kbd="⌘C"`
- Paste: `kbd="⌘V"`
- Labels (L): `kbd="L"`
- Current (I): `kbd="I"`
- Polarity (P): `kbd="P"`
- Voltage (V): `kbd="V"`
- Width (~): `kbd="T"`
- Heatmap (H): `kbd="H"`
- Values (Ω): `kbd="W"`
- Schematic (S): `kbd="S"`

---

## Files to Modify
- `components/sidebar/Sidebar.tsx` — P4.1 + P4.3
- `components/Toolbar.tsx` — P4.6

## Type-check
```bash
npx tsc --noEmit
```
Exit 0 required. No console.log, no TODOs.
