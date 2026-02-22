# SPEC: Module System — Core (Store + Definitions + Validators)

## Goal
Build the data layer for a 11-module interactive curriculum. This is the foundation
that the UI layer will build on top of. No UI components — just:
1. TypeScript types
2. Zustand store (moduleStore.ts)
3. 11 module definitions (features/modules/definitions.ts)
4. Step validator functions (features/modules/validators.ts)

Run `pnpm build` — must pass with zero errors.

---

## 1. Types (`features/modules/types.ts`)

```typescript
export type ComponentKind =
  | 'battery' | 'resistor' | 'led' | 'capacitor' | 'diode'
  | 'bjt' | 'mosfet' | 'switch' | 'potentiometer' | 'motor'
  | 'timer555' | 'inductor' | 'arduino' | 'schottky' | 'zener';

export interface ModuleStep {
  id: string;
  instruction: string;         // short imperative: "Drag a Resistor onto the board"
  hint?: string;               // optional explanation: "Resistors are direction-independent"
  // What area to spotlight (used by UI layer)
  spotlightTarget?: 'sidebar-parts' | 'breadboard' | 'oscilloscope' | 'properties';
  // What component type to highlight in the sidebar (if any)
  highlightComponent?: ComponentKind;
  // Validator: returns true when this step is complete
  // Receives current circuit state snapshot
  validate: (state: ValidatorState) => boolean;
  // Optional: pre-load this circuit when the step begins (overrides current circuit)
  autoLoadId?: string;  // id from EXAMPLE_CIRCUITS
}

export interface Module {
  id: string;
  title: string;
  subtitle: string;            // one-line summary: "What voltage and current actually are"
  concept: string;             // 30-second intro paragraph shown before steps
  prerequisiteId?: string;     // module that must be completed first
  steps: ModuleStep[];
}

export interface ValidatorState {
  components: Record<string, { type: ComponentKind; props: Record<string, unknown>; pins: Array<{ name: string; nodeId: string }> }>;
  nodes: Record<string, { netId: number | null }>;
  wires: Record<string, { from: string; to: string }>;
  // net voltages from SAB (read at validation time)
  voltages: Float32Array;
  // scope channels open
  scopeChannels: Array<{ netId: number }>;
}
```

---

## 2. Zustand Store (`store/moduleStore.ts`)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Module } from '@/features/modules/types';
import { MODULES } from '@/features/modules/definitions';

interface ModuleStore {
  // State
  activeModuleId: string | null;
  activeStepIndex: number;
  completedModuleIds: string[];

  // Derived
  activeModule: Module | null;
  activeStep: Module['steps'][number] | null;
  isModuleActive: boolean;

  // Actions
  startModule(id: string): void;
  advanceStep(): void;          // call when validator returns true
  exitModule(): void;
  resetProgress(): void;        // dev helper
}

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set, get) => ({
      activeModuleId: null,
      activeStepIndex: 0,
      completedModuleIds: [],

      get activeModule() {
        return MODULES.find(m => m.id === get().activeModuleId) ?? null;
      },
      get activeStep() {
        const mod = get().activeModule;
        return mod?.steps[get().activeStepIndex] ?? null;
      },
      get isModuleActive() {
        return get().activeModuleId !== null;
      },

      startModule(id) {
        set({ activeModuleId: id, activeStepIndex: 0 });
      },
      advanceStep() {
        const mod = get().activeModule;
        if (!mod) return;
        const nextIdx = get().activeStepIndex + 1;
        if (nextIdx >= mod.steps.length) {
          // Module complete
          set(s => ({
            activeModuleId: null,
            activeStepIndex: 0,
            completedModuleIds: s.completedModuleIds.includes(mod.id)
              ? s.completedModuleIds
              : [...s.completedModuleIds, mod.id],
          }));
        } else {
          set({ activeStepIndex: nextIdx });
        }
      },
      exitModule() {
        set({ activeModuleId: null, activeStepIndex: 0 });
      },
      resetProgress() {
        set({ activeModuleId: null, activeStepIndex: 0, completedModuleIds: [] });
      },
    }),
    { name: 'circuit-modules' }
  )
);
```

---

## 3. Validators (`features/modules/validators.ts`)

These are pure functions that take a ValidatorState and return boolean.
They are called by the UI layer at regular intervals to check if the user
has completed the current step.

```typescript
import type { ValidatorState, ComponentKind } from './types';

/** True if at least one component of the given kind exists */
export function hasComponent(state: ValidatorState, kind: ComponentKind): boolean {
  return Object.values(state.components).some(c => c.type === kind);
}

/** True if at least N components of the given kind exist */
export function hasNComponents(state: ValidatorState, kind: ComponentKind, n: number): boolean {
  return Object.values(state.components).filter(c => c.type === kind).length >= n;
}

/** True if two components are connected (share a net via wires or breadboard) */
export function areConnected(state: ValidatorState, kindA: ComponentKind, kindB: ComponentKind): boolean {
  const compsA = Object.values(state.components).filter(c => c.type === kindA);
  const compsB = Object.values(state.components).filter(c => c.type === kindB);
  if (!compsA.length || !compsB.length) return false;

  // Get all netIds for compsA
  const netIdsA = new Set<number>();
  for (const comp of compsA) {
    for (const pin of comp.pins) {
      const netId = state.nodes[pin.nodeId]?.netId;
      if (netId != null) netIdsA.add(netId);
    }
  }
  // Check if any pin of compsB shares a netId with compsA
  for (const comp of compsB) {
    for (const pin of comp.pins) {
      const netId = state.nodes[pin.nodeId]?.netId;
      if (netId != null && netIdsA.has(netId)) return true;
    }
  }
  return false;
}

/** True if the circuit has a complete path (at least one net has non-zero voltage) */
export function hasCurrentFlow(state: ValidatorState): boolean {
  return Array.from(state.voltages).some(v => Math.abs(v) > 0.1);
}

/** True if an LED is forward biased (positive voltage across it) */
export function isLEDLit(state: ValidatorState): boolean {
  for (const comp of Object.values(state.components)) {
    if (comp.type !== 'led') continue;
    const anodePin = comp.pins.find(p => p.name === 'anode');
    const cathodePin = comp.pins.find(p => p.name === 'cathode');
    if (!anodePin || !cathodePin) continue;
    const va = state.nodes[anodePin.nodeId]?.netId;
    const vc = state.nodes[cathodePin.nodeId]?.netId;
    if (va == null || vc == null) continue;
    const vdrop = (state.voltages[va] ?? 0) - (state.voltages[vc] ?? 0);
    if (vdrop > 0.5) return true;
  }
  return false;
}

/** True if a resistor is in series with an LED (they share exactly one net) */
export function hasCurrentLimitingResistor(state: ValidatorState): boolean {
  return areConnected(state, 'resistor', 'led');
}

/** True if the oscilloscope has at least one channel */
export function scopeIsOpen(state: ValidatorState): boolean {
  return state.scopeChannels.length > 0;
}

/** True if the potentiometer wiper is at a non-default position */
export function potIsAdjusted(state: ValidatorState): boolean {
  return Object.values(state.components).some(
    c => c.type === 'potentiometer' && typeof c.props.wiper === 'number' && c.props.wiper !== 0.5
  );
}

/** True if switch is toggled (closed) */
export function switchIsClosed(state: ValidatorState): boolean {
  return Object.values(state.components).some(c => c.type === 'switch' && c.props.closed);
}

/** True if BJT is in circuit with LED (NPN switch demo) */
export function bjtSwitchWorks(state: ValidatorState): boolean {
  return hasComponent(state, 'bjt') && isLEDLit(state);
}
```

---

## 4. Module Definitions (`features/modules/definitions.ts`)

Define all 11 modules. Each module must have at least 2 steps with real validators.
Keep steps simple — the circuit topology checks are the main validation mechanism.

```typescript
import { hasComponent, areConnected, hasCurrentFlow, isLEDLit,
         hasCurrentLimitingResistor, hasNComponents, scopeIsOpen,
         potIsAdjusted, switchIsClosed, bjtSwitchWorks } from './validators';
import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'hello-electricity',
    title: '1. Hello, Electricity',
    subtitle: 'What voltage and current actually are',
    concept: 'Electricity is the flow of electrons through a conductor. Voltage is the pressure that pushes them. Current is how many flow per second. In this module you\'ll see both — measured in real time.',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Drag a Battery onto the breadboard.',
        hint: 'Find the Battery in the Parts panel on the left. Drag it onto any row of the breadboard.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'battery',
        validate: s => hasComponent(s, 'battery'),
      },
      {
        id: 'observe-voltage',
        instruction: 'Click the battery to select it. Notice the voltage in the inspector.',
        hint: 'The default battery is 9V. The simulation is already running — nothing to connect yet.',
        spotlightTarget: 'properties',
        validate: s => hasComponent(s, 'battery'),
      },
    ],
  },
  {
    id: 'complete-circle',
    title: '2. The Complete Circle',
    subtitle: 'Why circuits need a loop',
    concept: 'Electricity can only flow in a closed loop. A battery with nothing connected to it does nothing — even with voltage at its terminals. You need a path from + back to −.',
    prerequisiteId: 'hello-electricity',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Place a Battery on the breadboard.',
        highlightComponent: 'battery',
        validate: s => hasComponent(s, 'battery'),
      },
      {
        id: 'place-resistor',
        instruction: 'Place a Resistor on the breadboard.',
        hint: 'Any row works. We\'ll connect it in the next step.',
        highlightComponent: 'resistor',
        validate: s => hasComponent(s, 'resistor'),
      },
      {
        id: 'connect-them',
        instruction: 'Connect the battery and resistor with wires to form a complete loop.',
        hint: 'Click a pin on the battery, then click a pin on the resistor. Do the same for the return path.',
        spotlightTarget: 'breadboard',
        validate: s => areConnected(s, 'battery', 'resistor') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'first-led',
    title: '3. Your First LED',
    subtitle: 'Polarity and forward voltage',
    concept: 'An LED (Light-Emitting Diode) only conducts in one direction. Connect it backwards and nothing happens. Connect it right, and it glows. This module shows why polarity matters.',
    prerequisiteId: 'complete-circle',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Place a Battery on the breadboard.',
        highlightComponent: 'battery',
        validate: s => hasComponent(s, 'battery'),
      },
      {
        id: 'place-led',
        instruction: 'Place an LED on the breadboard.',
        hint: 'The longer leg is the anode (+). Notice the + and − labels on the 3D model.',
        highlightComponent: 'led',
        validate: s => hasComponent(s, 'led'),
      },
      {
        id: 'connect-and-light',
        instruction: 'Wire the battery + to the LED anode, and LED cathode back to battery −.',
        hint: 'If the LED doesn\'t glow, try rotating it with R. The anode must connect to the higher voltage.',
        spotlightTarget: 'breadboard',
        validate: s => isLEDLit(s),
      },
    ],
  },
  {
    id: 'bodyguard',
    title: '4. The Bodyguard',
    subtitle: 'Ohm\'s law, current limiting',
    concept: 'An LED without a resistor draws too much current and burns out in real life. A resistor acts as a bodyguard — it limits how much current flows. Ohm\'s Law: I = V ÷ R.',
    prerequisiteId: 'first-led',
    autoLoadId: 'led-resistor',
    steps: [
      {
        id: 'observe-bare-led',
        instruction: 'Look at the bare LED + battery circuit. Notice the current in the inspector — it\'s too high!',
        hint: 'Select the LED to see live current readings. In real life this would destroy the LED.',
        spotlightTarget: 'properties',
        validate: s => isLEDLit(s) && !hasCurrentLimitingResistor(s),
      },
      {
        id: 'add-resistor',
        instruction: 'Add a 470Ω resistor in series between the battery and the LED.',
        hint: 'Resistors go in series — one leg connects to battery+, the other connects to the LED anode.',
        highlightComponent: 'resistor',
        validate: s => hasCurrentLimitingResistor(s) && isLEDLit(s),
      },
      {
        id: 'read-ohms-law',
        instruction: 'Select the resistor. Read the Ohm\'s Law calculation in the inspector.',
        hint: 'I = V ÷ R. Change the resistance value to see the current change in real time.',
        spotlightTarget: 'properties',
        validate: s => hasCurrentLimitingResistor(s) && isLEDLit(s),
      },
    ],
  },
  {
    id: 'dimmer',
    title: '5. Dimmer',
    subtitle: 'Resistance changes brightness',
    concept: 'More resistance → less current → dimmer LED. Less resistance → more current → brighter LED. But there\'s a minimum resistance needed to protect the LED. You\'ll find it.',
    prerequisiteId: 'bodyguard',
    steps: [
      {
        id: 'place-pot',
        instruction: 'Place a Potentiometer on the board and wire it as a variable resistor.',
        hint: 'Connect terminal A to battery+, terminal B to battery−, and the wiper to the LED anode.',
        highlightComponent: 'potentiometer',
        validate: s => hasComponent(s, 'potentiometer') && hasComponent(s, 'led'),
      },
      {
        id: 'adjust-pot',
        instruction: 'Click the potentiometer to select it, then drag the Wiper slider.',
        hint: 'Watch the LED brightness change in real time as you adjust resistance.',
        spotlightTarget: 'properties',
        validate: s => potIsAdjusted(s) && isLEDLit(s),
      },
    ],
  },
  {
    id: 'take-control',
    title: '6. Take Control',
    subtitle: 'Switches and digital on/off',
    concept: 'A switch interrupts current flow. When open, no current flows. When closed, the circuit completes. This is the basis of all digital electronics — 0 and 1, off and on.',
    prerequisiteId: 'dimmer',
    steps: [
      {
        id: 'build-switch-circuit',
        instruction: 'Build: Battery → Switch → Resistor (470Ω) → LED → Battery−',
        hint: 'Place all four components and wire them in series.',
        validate: s => hasComponent(s, 'switch') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'toggle-switch',
        instruction: 'Click the tactile switch to toggle it open/closed.',
        hint: 'The LED should light when the switch is closed and go dark when open.',
        validate: s => switchIsClosed(s) && isLEDLit(s),
      },
    ],
  },
  {
    id: 'voltage-sharing',
    title: '7. Voltage Sharing',
    subtitle: 'Voltage dividers and the potentiometer',
    concept: 'Two resistors in series share the voltage proportionally. If R1 = R2, each gets half. The potentiometer is a voltage divider with a movable tap point.',
    prerequisiteId: 'take-control',
    steps: [
      {
        id: 'build-divider',
        instruction: 'Place two resistors in series between battery+ and battery−.',
        hint: 'The junction between them is the midpoint — it\'ll be at half the battery voltage.',
        validate: s => hasNComponents(s, 'resistor', 2) && hasCurrentFlow(s),
      },
      {
        id: 'observe-midpoint',
        instruction: 'Hover over the junction node between the two resistors.',
        hint: 'The voltage tooltip shows the midpoint voltage. Change one resistor value to shift it.',
        validate: s => hasNComponents(s, 'resistor', 2) && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'memory-cell',
    title: '8. The Memory Cell',
    subtitle: 'Capacitors, RC timing, the oscilloscope',
    concept: 'A capacitor stores charge like a tiny battery. When power is applied, it charges slowly through a resistor. The time constant τ = R × C determines how fast.',
    prerequisiteId: 'voltage-sharing',
    steps: [
      {
        id: 'build-rc',
        instruction: 'Place Battery + Resistor (10kΩ) + Capacitor (100µF) in series.',
        hint: 'Wire battery+ → resistor → capacitor+ → battery−.',
        validate: s => hasComponent(s, 'capacitor') && hasComponent(s, 'resistor') && hasCurrentFlow(s),
      },
      {
        id: 'open-scope',
        instruction: 'Press O to open the oscilloscope. Click + and select the capacitor\'s net.',
        hint: 'The scope will show the RC charging curve — voltage rising exponentially toward supply.',
        spotlightTarget: 'oscilloscope',
        validate: s => scopeIsOpen(s),
      },
    ],
  },
  {
    id: 'electronic-switch',
    title: '9. The Electronic Switch',
    subtitle: 'NPN transistor as a digital switch',
    concept: 'A transistor is an electronic switch. A small base current controls a much larger collector current. This is how computers amplify and switch signals billions of times per second.',
    prerequisiteId: 'memory-cell',
    steps: [
      {
        id: 'build-bjt',
        instruction: 'Build: Battery → Collector resistor (1kΩ) → LED → Collector; Base resistor (10kΩ) → Base; Emitter → GND.',
        hint: 'The NPN BJT has three pins: base (B), collector (C), emitter (E).',
        highlightComponent: 'bjt',
        validate: s => hasComponent(s, 'bjt') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'observe-switching',
        instruction: 'Add a switch in series with the base resistor. Toggle it to control the LED.',
        hint: 'Base current ON → transistor conducts → LED lights. This is a transistor switch.',
        validate: s => bjtSwitchWorks(s),
      },
    ],
  },
  {
    id: 'blinker',
    title: '10. The Blinker',
    subtitle: '555 timer, frequency, oscillation',
    concept: 'The 555 timer is one of the most useful chips ever made. In astable mode it oscillates — automatically switching output between high and low at a frequency you control with R and C.',
    prerequisiteId: 'electronic-switch',
    steps: [
      {
        id: 'place-555',
        instruction: 'Place a 555 Timer chip on the board.',
        highlightComponent: 'timer555',
        validate: s => hasComponent(s, 'timer555'),
      },
      {
        id: 'wire-555',
        instruction: 'Wire: VCC(8) → 9V, GND(1) → 0V, TRIG+THRESH tied together through a capacitor to GND, R1+R2 between VCC and DISCH.',
        hint: 'This is astable mode. The LED on the OUT pin should blink at 1.44 / ((R1+2×R2)×C) Hz.',
        validate: s => hasComponent(s, 'timer555') && hasComponent(s, 'led') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'arduino-hello',
    title: '11. Arduino Says Hello',
    subtitle: 'Microcontrollers, digital I/O, code',
    concept: 'A microcontroller is a tiny computer on a chip. It runs code you write, reads sensors, and controls outputs. In this module you\'ll upload a sketch and watch it blink an LED.',
    prerequisiteId: 'blinker',
    steps: [
      {
        id: 'place-arduino',
        instruction: 'Place an Arduino Uno on the breadboard.',
        highlightComponent: 'arduino',
        validate: s => hasComponent(s, 'arduino'),
      },
      {
        id: 'wire-led',
        instruction: 'Wire: Pin 13 → 220Ω resistor → LED → GND.',
        validate: s => hasComponent(s, 'arduino') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'upload-blink',
        instruction: 'Open the Arduino panel (click ▶ in the sidebar) and upload the Blink sketch.',
        hint: 'The built-in Blink example is available. Pin 13 will toggle every 500ms.',
        spotlightTarget: 'sidebar-parts',
        validate: s => hasComponent(s, 'arduino') && isLEDLit(s),
      },
    ],
  },
];

export const getModuleById = (id: string) => MODULES.find(m => m.id === id);
export const isModuleUnlocked = (moduleId: string, completedIds: string[]): boolean => {
  const mod = getModuleById(moduleId);
  if (!mod?.prerequisiteId) return true;
  return completedIds.includes(mod.prerequisiteId);
};
```

---

## What to build

1. Create `features/modules/types.ts` with the TypeScript interfaces
2. Create `features/modules/validators.ts` with all validator functions
3. Create `features/modules/definitions.ts` with all 11 MODULES
4. Create `store/moduleStore.ts` with the Zustand store

Read existing store files (store/circuitStore.ts, store/uiStore.ts) to understand
the pattern before writing. Use the same `create` from `zustand` pattern.

**Do NOT build any UI components** — that is in a separate spec.
**Do NOT import from Three.js or R3F** — this is pure data/logic.

Run `pnpm build` and fix all TypeScript errors before finishing.
