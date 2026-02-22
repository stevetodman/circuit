import {
  hasComponent,
  areConnected,
  hasCurrentFlow,
  isLEDLit,
  hasCurrentLimitingResistor,
  hasNComponents,
  scopeIsOpen,
  potIsAdjusted,
  switchIsClosed,
  bjtSwitchWorks,
} from './validators';
import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'hello-electricity',
    title: '1. Hello, Electricity',
    subtitle: 'What voltage and current actually are',
    concept:
      'Electricity is the flow of electrons through a conductor. Voltage is the pressure that pushes them. Current is how many flow per second. In this module you\'ll see both — measured in real time.',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Drag a Battery onto the breadboard.',
        hint: 'Find the Battery in the Parts panel on the left. Drag it onto any row of the breadboard.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'battery',
        validate: (s) => hasComponent(s, 'battery'),
      },
      {
        id: 'observe-voltage',
        instruction: 'Click the battery to select it. Notice the voltage in the inspector.',
        hint: 'The default battery is 9V. The simulation is already running — nothing to connect yet.',
        spotlightTarget: 'properties',
        validate: (s) => hasComponent(s, 'battery'),
      },
    ],
  },
  {
    id: 'complete-circle',
    title: '2. The Complete Circle',
    subtitle: 'Why circuits need a loop',
    concept:
      'Electricity can only flow in a closed loop. A battery with nothing connected to it does nothing — even with voltage at its terminals. You need a path from + back to −.',
    prerequisiteId: 'hello-electricity',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Place a Battery on the breadboard.',
        highlightComponent: 'battery',
        validate: (s) => hasComponent(s, 'battery'),
      },
      {
        id: 'place-resistor',
        instruction: 'Place a Resistor on the breadboard.',
        hint: 'Any row works. We\'ll connect it in the next step.',
        highlightComponent: 'resistor',
        validate: (s) => hasComponent(s, 'resistor'),
      },
      {
        id: 'connect-them',
        instruction: 'Connect the battery and resistor with wires to form a complete loop.',
        hint: 'Click a pin on the battery, then click a pin on the resistor. Do the same for the return path.',
        spotlightTarget: 'breadboard',
        validate: (s) => areConnected(s, 'battery', 'resistor') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'first-led',
    title: '3. Your First LED',
    subtitle: 'Polarity and forward voltage',
    concept:
      'An LED (Light-Emitting Diode) only conducts in one direction. Connect it backwards and nothing happens. Connect it right, and it glows. This module shows why polarity matters.',
    prerequisiteId: 'complete-circle',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Place a Battery on the breadboard.',
        highlightComponent: 'battery',
        validate: (s) => hasComponent(s, 'battery'),
      },
      {
        id: 'place-led',
        instruction: 'Place an LED on the breadboard.',
        hint: 'The longer leg is the anode (+). Notice the + and − labels on the 3D model.',
        highlightComponent: 'led',
        validate: (s) => hasComponent(s, 'led'),
      },
      {
        id: 'connect-and-light',
        instruction: 'Wire the battery + to the LED anode, and LED cathode back to battery −.',
        hint: 'If the LED doesn\'t glow, try rotating it with R. The anode must connect to the higher voltage.',
        spotlightTarget: 'breadboard',
        validate: (s) => isLEDLit(s),
      },
    ],
  },
  {
    id: 'bodyguard',
    title: '4. The Bodyguard',
    subtitle: 'Ohm\'s law, current limiting',
    concept:
      'An LED without a resistor draws too much current and burns out in real life. A resistor acts as a bodyguard — it limits how much current flows. Ohm\'s Law: I = V ÷ R.',
    prerequisiteId: 'first-led',
    autoLoadId: 'led-resistor',
    steps: [
      {
        id: 'observe-bare-led',
        instruction: 'Look at the bare LED + battery circuit. Notice the current in the inspector — it\'s too high!',
        hint: 'Select the LED to see live current readings. In real life this would destroy the LED.',
        spotlightTarget: 'properties',
        validate: (s) => isLEDLit(s) && !hasCurrentLimitingResistor(s),
      },
      {
        id: 'add-resistor',
        instruction: 'Add a 470Ω resistor in series between the battery and the LED.',
        hint: 'Resistors go in series — one leg connects to battery+, the other connects to the LED anode.',
        highlightComponent: 'resistor',
        validate: (s) => hasCurrentLimitingResistor(s) && isLEDLit(s),
      },
      {
        id: 'read-ohms-law',
        instruction: 'Select the resistor. Read the Ohm\'s Law calculation in the inspector.',
        hint: 'I = V ÷ R. Change the resistance value to see the current change in real time.',
        spotlightTarget: 'properties',
        validate: (s) => hasCurrentLimitingResistor(s) && isLEDLit(s),
      },
    ],
  },
  {
    id: 'dimmer',
    title: '5. Dimmer',
    subtitle: 'Resistance changes brightness',
    concept:
      'More resistance → less current → dimmer LED. Less resistance → more current → brighter LED. But there\'s a minimum resistance needed to protect the LED. You\'ll find it.',
    prerequisiteId: 'bodyguard',
    steps: [
      {
        id: 'place-pot',
        instruction: 'Place a Potentiometer on the board and wire it as a variable resistor.',
        hint: 'Connect terminal A to battery+, terminal B to battery−, and the wiper to the LED anode.',
        highlightComponent: 'potentiometer',
        validate: (s) => hasComponent(s, 'potentiometer') && hasComponent(s, 'led'),
      },
      {
        id: 'adjust-pot',
        instruction: 'Click the potentiometer to select it, then drag the Wiper slider.',
        hint: 'Watch the LED brightness change in real time as you adjust resistance.',
        spotlightTarget: 'properties',
        validate: (s) => potIsAdjusted(s) && isLEDLit(s),
      },
    ],
  },
  {
    id: 'take-control',
    title: '6. Take Control',
    subtitle: 'Switches and digital on/off',
    concept:
      'A switch interrupts current flow. When open, no current flows. When closed, the circuit completes. This is the basis of all digital electronics — 0 and 1, off and on.',
    prerequisiteId: 'dimmer',
    steps: [
      {
        id: 'build-switch-circuit',
        instruction: 'Build: Battery → Switch → Resistor (470Ω) → LED → Battery−',
        hint: 'Place all four components and wire them in series.',
        validate: (s) => hasComponent(s, 'tactileSwitch') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'toggle-switch',
        instruction: 'Click the tactile switch to toggle it open/closed.',
        hint: 'The LED should light when the switch is closed and go dark when open.',
        validate: (s) => switchIsClosed(s) && isLEDLit(s),
      },
    ],
  },
  {
    id: 'voltage-sharing',
    title: '7. Voltage Sharing',
    subtitle: 'Voltage dividers and the potentiometer',
    concept:
      'Two resistors in series share the voltage proportionally. If R1 = R2, each gets half. The potentiometer is a voltage divider with a movable tap point.',
    prerequisiteId: 'take-control',
    steps: [
      {
        id: 'build-divider',
        instruction: 'Place two resistors in series between battery+ and battery−.',
        hint: 'The junction between them is the midpoint — it\'ll be at half the battery voltage.',
        validate: (s) => hasNComponents(s, 'resistor', 2) && hasCurrentFlow(s),
      },
      {
        id: 'observe-midpoint',
        instruction: 'Hover over the junction node between the two resistors.',
        hint: 'The voltage tooltip shows the midpoint voltage. Change one resistor value to shift it.',
        validate: (s) => hasNComponents(s, 'resistor', 2) && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'memory-cell',
    title: '8. The Memory Cell',
    subtitle: 'Capacitors, RC timing, the oscilloscope',
    concept:
      'A capacitor stores charge like a tiny battery. When power is applied, it charges slowly through a resistor. The time constant τ = R × C determines how fast.',
    prerequisiteId: 'voltage-sharing',
    steps: [
      {
        id: 'build-rc',
        instruction: 'Place Battery + Resistor (10kΩ) + Capacitor (100µF) in series.',
        hint: 'Wire battery+ → resistor → capacitor+ → battery−.',
        validate: (s) =>
          hasComponent(s, 'capacitor') && hasComponent(s, 'resistor') && hasCurrentFlow(s),
      },
      {
        id: 'open-scope',
        instruction: 'Press O to open the oscilloscope. Click + and select the capacitor\'s net.',
        hint: 'The scope will show the RC charging curve — voltage rising exponentially toward supply.',
        spotlightTarget: 'oscilloscope',
        validate: (s) => scopeIsOpen(s),
      },
    ],
  },
  {
    id: 'electronic-switch',
    title: '9. The Electronic Switch',
    subtitle: 'NPN transistor as a digital switch',
    concept:
      'A transistor is an electronic switch. A small base current controls a much larger collector current. This is how computers amplify and switch signals billions of times per second.',
    prerequisiteId: 'memory-cell',
    steps: [
      {
        id: 'build-bjt',
        instruction: 'Build: Battery → Collector resistor (1kΩ) → LED → Collector; Base resistor (10kΩ) → Base; Emitter → GND.',
        hint: 'The NPN BJT has three pins: base (B), collector (C), emitter (E).',
        highlightComponent: 'bjt',
        validate: (s) => hasComponent(s, 'bjt') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'observe-switching',
        instruction: 'Add a switch in series with the base resistor. Toggle it to control the LED.',
        hint: 'Base current ON → transistor conducts → LED lights. This is a transistor switch.',
        validate: (s) => bjtSwitchWorks(s),
      },
    ],
  },
  {
    id: 'blinker',
    title: '10. The Blinker',
    subtitle: '555 timer, frequency, oscillation',
    concept:
      'The 555 timer is one of the most useful chips ever made. In astable mode it oscillates — automatically switching output between high and low at a frequency you control with R and C.',
    prerequisiteId: 'electronic-switch',
    steps: [
      {
        id: 'place-555',
        instruction: 'Place a 555 Timer chip on the board.',
        highlightComponent: 'timer555',
        validate: (s) => hasComponent(s, 'timer555'),
      },
      {
        id: 'wire-555',
        instruction:
          'Wire: VCC(8) → 9V, GND(1) → 0V, TRIG+THRESH tied together through a capacitor to GND, R1+R2 between VCC and DISCH.',
        hint: 'This is astable mode. The LED on the OUT pin should blink at 1.44 / ((R1+2×R2)×C) Hz.',
        validate: (s) => hasComponent(s, 'timer555') && hasComponent(s, 'led') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'arduino-hello',
    title: '11. Arduino Says Hello',
    subtitle: 'Microcontrollers, digital I/O, code',
    concept:
      'A microcontroller is a tiny computer on a chip. It runs code you write, reads sensors, and controls outputs. In this module you\'ll upload a sketch and watch it blink an LED.',
    prerequisiteId: 'blinker',
    steps: [
      {
        id: 'place-arduino',
        instruction: 'Place an Arduino Uno on the breadboard.',
        highlightComponent: 'arduino',
        validate: (s) => hasComponent(s, 'arduino'),
      },
      {
        id: 'wire-led',
        instruction: 'Wire: Pin 13 → 220Ω resistor → LED → GND.',
        validate: (s) => hasComponent(s, 'arduino') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'upload-blink',
        instruction: 'Open the Arduino panel (click ▶ in the sidebar) and upload the Blink sketch.',
        hint: 'The built-in Blink example is available. Pin 13 will toggle every 500ms.',
        spotlightTarget: 'sidebar-parts',
        validate: (s) => hasComponent(s, 'arduino') && isLEDLit(s),
      },
    ],
  },
];

export const getModuleById = (id: string): Module | undefined => MODULES.find((m) => m.id === id);

export const isModuleUnlocked = (moduleId: string, completedIds: string[]): boolean => {
  const mod = getModuleById(moduleId);
  if (!mod?.prerequisiteId) return true;
  return completedIds.includes(mod.prerequisiteId);
};
