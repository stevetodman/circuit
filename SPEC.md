# SPEC: Schematic View — Manual Component Drag

## Goal
Allow users to drag components in the schematic SVG overlay to reposition them.
ELK auto-layout runs first; manual overrides persist until the circuit changes.
Run `pnpm build` to verify — must pass with zero errors.

---

## Architecture

### State: schematicStore.ts
In `store/schematicStore.ts`, add:
```typescript
manualPositions: Record<string, { x: number; y: number }>;  // componentId → {x,y}
setManualPosition(id: string, x: number, y: number): void;
clearManualPositions(): void;
```
`clearManualPositions()` is called when a new circuit is loaded (topology changes).

### SchematicLayout.ts
In `features/schematic/SchematicLayout.ts`:
- After ELK layout, merge manual positions: for each component, if `manualPositions[id]` exists,
  override the ELK-computed x/y with the manual position.
- Clear manual positions when the netlist hash changes (topology changed).

### SchematicView.tsx
In `features/schematic/SchematicView.tsx`:

Each component group `<g>` is currently rendered at the ELK-computed position.
Add drag event handlers to each component group:

```tsx
const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; startSVGX: number; startSVGY: number } | null>(null);

// On component <g>:
onMouseDown={(e) => {
  e.stopPropagation();
  // Get SVG coordinates
  const svgRect = svgRef.current!.getBoundingClientRect();
  const svgX = (e.clientX - svgRect.left) * (SVG_WIDTH / svgRect.width);
  const svgY = (e.clientY - svgRect.top) * (SVG_HEIGHT / svgRect.height);
  setDragging({ id: comp.id, startX: pos.x, startY: pos.y, startSVGX: svgX, startSVGY: svgY });
}}
```

On SVG `onMouseMove` (capture at SVG level):
```tsx
if (dragging) {
  const svgX = /* compute svg coords from e.clientX */;
  const svgY = /* compute svg coords from e.clientY */;
  const dx = svgX - dragging.startSVGX;
  const dy = svgY - dragging.startSVGY;
  setManualPosition(dragging.id, dragging.startX + dx, dragging.startY + dy);
}
```

On SVG `onMouseUp`:
```tsx
setDragging(null);
```

### Visual affordances
- When hovering a component group, change cursor to `grab`
- While dragging, change cursor to `grabbing`
- Add a subtle drag handle icon (⠿) in the top-left corner of each component bounding box
  (small, only visible on hover)
- The dragged component should render on top (use SVG rendering order — render dragging component last)

### Wire routing
Wires in the schematic connect component terminals. After a drag, the wire routes should
update to follow the component's new position. Since wires are rendered based on terminal
positions (computed from component x/y + SYMBOL_TERMINALS offsets), they will automatically
update when the component position changes.

---

## Reset
- Add a "Reset Layout" button in the schematic overlay toolbar
- Clicking it calls `clearManualPositions()` and re-runs ELK layout
- Place it near the existing close button (top-right of schematic overlay)

---

## Implementation Notes

- Do NOT add new npm dependencies
- Touch only `features/schematic/`, `store/schematicStore.ts`
- Manual positions should survive component property changes but clear on add/remove component
- Do not add undo/redo for drag — too complex
- Run `pnpm build` — fix all TypeScript errors
