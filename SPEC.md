# Circuit Sandbox — Feature Wave Log

Tracks completed feature waves. Each wave was implemented via parallel Codex agents in git worktrees.

---

## Wave 4 (merged)

| Branch | Feature |
|---|---|
| `module-link` | `autoLoadId` on all 11 module steps → auto-loads starter circuit when entering a module |
| `polarity` | +/− polarity labels on LED, Battery, Capacitor; `P` key toggle |
| `module-spotlight` | `spotlightTarget` directional hint pill in StepCard; `highlightComponent` pulse ring on ComponentTile; sidebar glow |
| `wire-autocolor` | Wire voltage colouring (red >2.5V, dark <0.3V); `V` key toggle |

---

## Wave 5 (merged)

| Branch | Feature |
|---|---|
| `diode-pol` | +/− polarity labels on Diode; missing − label added to Capacitor |
| `part-descriptions` | Short description text under each sidebar tile (`PART_DESCRIPTIONS` constant) |
| `circuit-name` | Editable circuit name input in sidebar; syncs `document.title`; persisted in JSON |
| `scope-ux` | 📊 "Add to Scope" button per pin in PropertiesInspector; live voltage in scope channel labels via RAF; "✕ all" clear-all button |

---

## Wave 6 (merged)

| Branch | Feature |
|---|---|
| _(inline)_ | HelpOverlay updated with P/V shortcuts |
| `breadboard-labels` | Floating 3D Text: a–j row letters left of board + column numbers (1,5,10…60) below board |
| `learn-polish` | Progress bar (X/11) at top of Learn tab; ✓ completion badges on module cards; violet left-border on active module; "Reset progress" button |
| `new-circuit` | "＋ New Circuit" dashed button in sidebar with inline Confirm/Cancel; `circuitStore.newCircuit()` clears board + undo history |
| `canvas-toolbar` | `CanvasOverlay.tsx`: floating zoom +/−/fit buttons (bottom-right); component count badge; `zoomInRequested`/`zoomOutRequested` wired to Scene.tsx |

---

## Known agent pitfalls

- `resetModules()` → actual method is `resetProgress()` in moduleStore
- `wires` field in circuitStore is `Record<string, Wire>` not an array
- Zustand inline object selectors crash React 18 — always use individual selectors or `useShallow`
- SPEC.md always conflicts during merge — resolve with `git checkout --ours SPEC.md`
- When two branches both add to uiStore/Toolbar/KeyboardShortcuts — manually merge to keep BOTH
