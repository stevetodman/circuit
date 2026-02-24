# P1.10 — Batch property edit

## Overview
When multiple components of the **same type** are selected (`selectedComponentIds.length > 1`), the Properties Inspector shows shared editable fields in "batch mode": fields show "—" if values differ between components, or the shared value if they're all the same. Entering a value sets it on all selected components at once.

## Architecture context
- `components/sidebar/PropertiesInspector.tsx` — exports `PropertiesInspector` default; has an `Inspector` sub-component used for single component; also exports to Sidebar
- `store/circuitStore.ts` — has `setProperty(componentId, key, value)` for single component

## Files to modify
1. `components/sidebar/PropertiesInspector.tsx`

---

## Implementation

### In `PropertiesInspector.tsx`

The file exports a default `PropertiesInspector` component. It currently checks for a single `selectedComponentId` and renders the `Inspector` sub-component.

**Add batch mode detection at the top level:**

```tsx
export default function PropertiesInspector() {
  const selectedComponentId  = useCircuitStore((s) => s.selectedComponentId);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const components = useCircuitStore((s) => s.components);

  // Batch mode: 2+ components all of same type
  if (selectedComponentIds.length >= 2) {
    const types = selectedComponentIds.map((id) => components[id]?.type).filter(Boolean);
    const allSameType = types.length > 0 && types.every((t) => t === types[0]);
    if (allSameType) {
      const comps = selectedComponentIds.map((id) => components[id]).filter(Boolean);
      return <BatchInspector components={comps as PlacedComponent[]} />;
    }
  }

  // Single select (existing logic)
  const component = selectedComponentId ? components[selectedComponentId] : null;
  if (!component) return null;
  return <Inspector component={component} />;
}
```

### Add `BatchInspector` component

**Place above the existing `Inspector` component:**

```tsx
function BatchInspector({ components }: { components: PlacedComponent[] }) {
  const setProperty = useCircuitStore((s) => s.setProperty);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const setSelectedComponentIds = useCircuitStore((s) => s.setSelectedComponentIds);

  const type = components[0].type;
  const typeLabel = TYPE_LABELS[type] ?? type;
  const fields = PROP_DEFS[type] ?? [];

  function getBatchValue(field: PropOrLogField): string | number | '—' {
    const values = components.map((c) => {
      const stored = c.props[field.key];
      return stored !== undefined ? stored : field.default;
    });
    const first = values[0];
    return values.every((v) => v === first) ? first : '—';
  }

  function setBatchValue(key: string, value: string | number) {
    for (const comp of components) {
      setProperty(comp.id, key, value);
    }
  }

  return (
    <div className="border-t border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-white/60 tracking-wide">
          {typeLabel} ×{components.length}
        </span>
        <button
          onClick={() => { selectComponent(null); setSelectedComponentIds([]); }}
          className="text-white/25 hover:text-white/60 text-[14px] leading-none transition-colors"
          title="Deselect all"
        >✕</button>
      </div>

      {/* Batch fields */}
      {fields.filter((f): f is NumericField | LogNumberField => f.kind === 'number' || f.kind === 'log-number').map((field) => {
        const batchVal = getBatchValue(field);
        const displayVal = batchVal === '—' ? '' : String(batchVal);
        return (
          <div key={field.key} className="px-4 pb-2">
            <label className="text-[10px] text-white/40 block mb-1">
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </label>
            <input
              type="number"
              placeholder={batchVal === '—' ? '— (mixed)' : undefined}
              defaultValue={displayVal}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded px-2 py-1 text-[11px] text-white font-mono"
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setBatchValue(field.key, v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = parseFloat((e.target as HTMLInputElement).value);
                  if (!isNaN(v)) setBatchValue(field.key, v);
                }
              }}
            />
          </div>
        );
      })}

      <div className="px-4 pb-3">
        <p className="text-[10px] text-white/30">
          {components.length} {typeLabel}s selected — editing applies to all
        </p>
      </div>
    </div>
  );
}
```

**Notes:**
- `PROP_DEFS`, `TYPE_LABELS`, `NumericField`, `LogNumberField`, `PropOrLogField` are already defined in the file — reuse them
- `setSelectedComponentIds` is already exported from circuitStore — check the actual function name in the file (it may be `setSelectedComponentIds` or similar)
- Read the full file first to see all imports and ensure you don't duplicate existing ones
- Keep the existing `Inspector` component fully intact

---

## Build validation
Run `pnpm build` to verify no type errors.
