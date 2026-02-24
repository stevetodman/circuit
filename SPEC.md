# SPEC: P5.e — Context Menu kbd Hints + Live Pin Voltages

Two focused improvements. Run `npx tsc --noEmit` and confirm exit 0.

---

## 1 — Context Menu Keyboard Shortcut Hints

**File:** `components/ContextMenu.tsx`

Show a right-aligned `<kbd>` badge beside each menu item that has a keyboard shortcut. Items without shortcuts (Properties, Add note, Lock) show nothing extra.

### Update MENU_ITEMS

Replace the existing `MENU_ITEMS` constant:
```ts
const MENU_ITEMS = [
  { key: 'delete',     label: 'Delete',     kbd: 'Del'  },
  { key: 'rotate',     label: 'Rotate 90°', kbd: 'R'    },
  { key: 'duplicate',  label: 'Duplicate',  kbd: '⌘D'   },
  { key: 'properties', label: 'Properties', kbd: null   },
  { key: 'addNote',    label: 'Add note',   kbd: null   },
] as const;
```

### Update button render in the `.map`

Currently:
```tsx
<button
  key={item.key}
  type="button"
  className="w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.08] hover:text-white/90 transition-colors"
  onClick={() => itemLabelToAction(item.key)}
>
  {item.label}
</button>
```

Replace with (adds `flex items-center justify-between` and the kbd badge):
```tsx
<button
  key={item.key}
  type="button"
  className="w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.08] hover:text-white/90 transition-colors flex items-center justify-between gap-3"
  onClick={() => itemLabelToAction(item.key)}
>
  <span>{item.label}</span>
  {item.kbd && (
    <kbd className="text-[9px] font-mono px-1 py-px rounded bg-white/[0.06] border border-white/[0.1] text-white/25 leading-none flex-shrink-0">
      {item.kbd}
    </kbd>
  )}
</button>
```

The Lock/Unlock button has no shortcut so leave it unchanged (no kbd badge).

---

## 2 — Live Per-Pin Voltages in Properties Inspector

**File:** `components/sidebar/PropertiesInspector.tsx`

The Pins section in `Inspector` currently shows `pin.nodeId` (e.g. `bb-e12`) plus a 📊 scope button. Replace the node ID text with a live voltage readout that polls SimBridge at 100ms.

### Add LivePinVoltage component

Add this small component **after** the `LiveReadings` function (around line 306), before the `Label` function:

```tsx
function LivePinVoltage({ netId }: { netId: number | null }) {
  const [v, setV] = useState<number>(0);
  useEffect(() => {
    if (netId == null) return;
    const id = setInterval(() => {
      setV(voltageView[netId] ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, [netId]);

  if (netId == null) {
    return <span className="text-white/15 font-mono text-[10px]">—</span>;
  }
  return <span className="text-white/60 font-mono text-[10px]">{fmtV(v)}</span>;
}
```

### Update the Pins section in Inspector

Find the pins table in the `Inspector` function (around line 726–762). The inner span currently is:
```tsx
<span className="text-white/20 inline-flex items-center">
  <span>{pin.nodeId}</span>
  {netId != null && (
    <button ...>📊</button>
  )}
</span>
```

Replace with (shows live voltage instead of raw node ID):
```tsx
<span className="text-white/20 inline-flex items-center gap-1.5">
  <LivePinVoltage netId={netId} />
  {netId != null && (
    <button ...>📊</button>
  )}
</span>
```

The `netId` variable is already computed just above: `const netId = nodes[pin.nodeId]?.netId ?? null;`

No other changes to the file.

---

## Type-check

```bash
npx tsc --noEmit
```
Exit 0 required. No console.log, no TODOs.

## Files modified

- `components/ContextMenu.tsx`
- `components/sidebar/PropertiesInspector.tsx`
