# SPEC: Net Glow on Hover

## Goal
When a pin/node is hovered, highlight ALL pins sharing the same net with a
distinct colored ring. Makes breadboard connectivity visible without documentation.

Run `pnpm build` — must pass with zero errors.

---

## Current state
- `uiStore.hoveredNodeId` — the nodeId of the hovered pin
- `circuitStore.nodes` — Record<nodeId, { netId: number | null, ... }>
- `components/canvas/Pin.tsx` — InstancedMesh, sets per-instance colors

## Implementation

### `components/canvas/Pin.tsx`

Read this file fully first to understand the InstancedMesh pattern.

The existing code already:
1. Colors hovered pin (bright)
2. Colors selected/wiring-mode pins
3. Colors net-highlighted pins differently

**Add net-glow behavior:**

When `hoveredNodeId` changes, find all nodes that share the same `netId`,
then highlight them all with a distinct color (e.g. `#22ddff` — cyan/teal).

```typescript
// In the color update loop (where setColorAt is called):
const hoveredNetId = nodes[hoveredNodeId]?.netId ?? null;

for each pin instance i:
  const nodeId = nodeIdForInstance[i];  // the mapping from instance index to nodeId
  const node = nodes[nodeId];
  const netId = node?.netId;
  
  if (hoveredNetId != null && netId === hoveredNetId && nodeId !== hoveredNodeId) {
    // Same net as hovered pin — show net glow color
    color.set('#22ddff');  // or '#4af' or similar teal
    alpha = 0.6;  // slightly dimmer than the actual hovered pin
  }
```

The net glow color should be distinct from:
- Hovered pin color (bright white/yellow)
- Selected pin color
- Wire preview color
- Default pin color

Use `#22ccee` (cyan) for net glow — readable on the dark breadboard.

### Pulse animation (optional but nice)
If the existing code uses `useFrame` for any animation:
- Net-glow pins can pulse at 0.5 Hz (sin wave on emissive intensity)
- Keep it subtle — don't make it distracting

### Wire drawing mode
During wiring mode (selectedNodeId is set):
- Highlight all pins that share the source net in a different color (e.g. amber `#ffaa00`)
  so the user can see what's already connected to the source pin

---

## Implementation Notes
- Read Pin.tsx completely before modifying
- The InstancedMesh instance-to-node mapping already exists — find and use it
- `instanceColor.needsUpdate = true` must be called after any color change
- Do NOT create new meshes — only color existing instances
- Run `pnpm build` — fix all TypeScript errors
