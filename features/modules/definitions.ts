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
  isDiodeForwardBiased,
  isDiodeBlocking,
  hasMosfet,
  hasZener,
} from './validators';
import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'hello-electricity',
    title: '1. Hello, Electricity',
    subtitle: 'What voltage and current actually are',
    concept:
      'Electricity is the flow of electrons through a conductor. Voltage is the pressure that pushes them. Current is how many flow per second. In this module you\'ll see both — measured in real time.',
    autoLoadId: 'battery-only',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Drag a Battery onto the breadboard.',
        hint: 'Find the Battery in the Parts panel on the left. Drag it onto any row of the breadboard.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'battery',
        failHint: 'Drag a Battery from the Parts panel (left sidebar) and drop it onto any hole on the breadboard.',
        validate: (s) => hasComponent(s, 'battery'),
      },
      {
        id: 'observe-voltage',
        instruction: 'Click the battery to select it. Notice the voltage in the inspector.',
        hint: 'The default battery is 9V. The simulation is already running — nothing to connect yet.',
        spotlightTarget: 'properties',
        highlightComponent: 'battery',
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
    autoLoadId: 'battery-resistor',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Place a Battery on the breadboard.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'battery',
        failHint: 'Drag a Battery from the Parts panel and drop it onto the breadboard.',
        validate: (s) => hasComponent(s, 'battery'),
      },
      {
        id: 'place-resistor',
        instruction: 'Place a Resistor on the breadboard.',
        hint: 'Any row works. We\'ll connect it in the next step.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'resistor',
        failHint: 'Drag a Resistor from the Parts panel and drop it anywhere on the breadboard.',
        validate: (s) => hasComponent(s, 'resistor'),
      },
      {
        id: 'connect-them',
        instruction: 'Connect the battery and resistor with wires to form a complete loop.',
        hint: 'Click a pin on the battery, then click a pin on the resistor. Do the same for the return path.',
        failHint:
          'Click a pin on the battery, then click a pin on the resistor to draw a wire. You need two wires — one for + and one for −.',
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
    autoLoadId: 'battery-led-resistor',
    steps: [
      {
        id: 'place-battery',
        instruction: 'Place a Battery on the breadboard.',
        highlightComponent: 'battery',
        failHint: 'Drag a Battery from the Parts panel onto the breadboard.',
        validate: (s) => hasComponent(s, 'battery'),
      },
      {
        id: 'place-led',
        instruction: 'Place an LED on the breadboard.',
        hint: 'The longer leg is the anode (+). Notice the + and − labels on the 3D model.',
        highlightComponent: 'led',
        failHint:
          'Find the LED in the Parts panel and drag it onto the breadboard. The longer leg is the anode (+).',
        validate: (s) => hasComponent(s, 'led'),
      },
      {
        id: 'connect-and-light',
        instruction: 'Wire the battery + to the LED anode, and LED cathode back to battery −.',
        hint: 'If the LED doesn\'t glow, try rotating it with R. The anode must connect to the higher voltage.',
        failHint:
          'The LED anode (+) must connect toward battery positive. If not glowing, select the LED and press R to rotate it 180°.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'led',
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
        failHint:
          'Select the LED and look at the current shown in the Properties panel. Without a resistor, the current is dangerously high.',
        spotlightTarget: 'properties',
        validate: (s) => isLEDLit(s) && !hasCurrentLimitingResistor(s),
      },
      {
        id: 'add-resistor',
        instruction: 'Add a 470Ω resistor in series between the battery and the LED.',
        hint: 'Resistors go in series — one leg connects to battery+, the other connects to the LED anode.',
        failHint:
          'Place a 470Ω resistor and wire it in series: battery+ → resistor → LED anode. The LED must still be lit.',
        highlightComponent: 'resistor',
        validate: (s) => hasCurrentLimitingResistor(s) && isLEDLit(s),
      },
      {
        id: 'read-ohms-law',
        instruction: 'Select the resistor. Read the Ohm\'s Law calculation in the inspector.',
        hint: 'I = V ÷ R. Change the resistance value to see the current change in real time.',
        failHint: 'Click the resistor to select it. The Properties panel shows Ohm\'s Law: I = V ÷ R.',
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
    autoLoadId: 'pot-dimmer',
    steps: [
      {
        id: 'place-pot',
        instruction: 'Place a Potentiometer on the board and wire it as a variable resistor.',
        hint: 'Connect terminal A to battery+, terminal B to battery−, and the wiper to the LED anode.',
        failHint:
          'Wire terminal A to battery+, the wiper to the LED anode, and terminal B to battery−. The LED must be lit.',
        highlightComponent: 'potentiometer',
        validate: (s) => hasComponent(s, 'potentiometer') && hasComponent(s, 'led'),
      },
      {
        id: 'adjust-pot',
        instruction: 'Click the potentiometer to select it, then drag the Wiper slider.',
        hint: 'Watch the LED brightness change in real time as you adjust resistance.',
        failHint: 'Select the potentiometer and drag the Wiper slider in the Properties panel away from 50%.',
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
    autoLoadId: 'switch-led',
    steps: [
      {
        id: 'build-switch-circuit',
        instruction: 'Build: Battery → Switch → Resistor (470Ω) → LED → Battery−',
        hint: 'Place all four components and wire them in series.',
        failHint:
          'Place a Battery, Tactile Switch, 470Ω Resistor, and LED. Wire in series: Battery+ → Switch → Resistor → LED → Battery−.',
        validate: (s) => hasComponent(s, 'tactileSwitch') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'toggle-switch',
        instruction: 'Click the tactile switch to toggle it open/closed.',
        hint: 'The LED should light when the switch is closed and go dark when open.',
        failHint: 'Click directly on the tactile switch body on the breadboard to toggle it closed. The LED should light up.',
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
    autoLoadId: 'voltage-divider-demo',
    steps: [
      {
        id: 'build-divider',
        instruction: 'Place two resistors in series between battery+ and battery−.',
        hint: 'The junction between them is the midpoint — it\'ll be at half the battery voltage.',
        failHint: 'Place two resistors and wire in series: Battery+ → Resistor1 → Resistor2 → Battery−. Current must flow through both.',
        validate: (s) => hasNComponents(s, 'resistor', 2) && hasCurrentFlow(s),
      },
      {
        id: 'observe-midpoint',
        instruction: 'Hover over the junction node between the two resistors.',
        hint: 'The voltage tooltip shows the midpoint voltage. Change one resistor value to shift it.',
        failHint: 'Hover your mouse over the junction node between the two resistors. A voltage tooltip will appear.',
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
    autoLoadId: 'rc-timing',
    steps: [
      {
        id: 'build-rc',
        instruction: 'Place Battery + Resistor (10kΩ) + Capacitor (100µF) in series.',
        hint: 'Wire battery+ → resistor → capacitor+ → battery−.',
        failHint:
          'Wire: Battery+ → 10kΩ Resistor → Capacitor+ → Battery−. All three components must be in series.',
        validate: (s) =>
          hasComponent(s, 'capacitor') && hasComponent(s, 'resistor') && hasCurrentFlow(s),
      },
      {
        id: 'open-scope',
        instruction: 'Press O to open the oscilloscope. Click + and select the capacitor\'s net.',
        hint: 'The scope will show the RC charging curve — voltage rising exponentially toward supply.',
        failHint:
          'Press the O key to open the oscilloscope, then click + and select the capacitor\'s positive pin node.',
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
    autoLoadId: 'bjt-switch-demo',
    steps: [
      {
        id: 'build-bjt',
        instruction: 'Build: Battery → Collector resistor (1kΩ) → LED → Collector; Base resistor (10kΩ) → Base; Emitter → GND.',
        hint: 'The NPN BJT has three pins: base (B), collector (C), emitter (E).',
        failHint:
          'Connect: Battery+ → 1kΩ collector resistor → LED → Collector; Battery+ → 10kΩ base resistor → Base; Emitter → Battery−.',
        highlightComponent: 'bjt',
        validate: (s) => hasComponent(s, 'bjt') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'observe-switching',
        instruction: 'Add a switch in series with the base resistor. Toggle it to control the LED.',
        hint: 'Base current ON → transistor conducts → LED lights. This is a transistor switch.',
        failHint:
          'Place a tactile switch in series with the base resistor. When closed, base current flows and the LED lights.',
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
    autoLoadId: 'blinker-555-demo',
    steps: [
      {
        id: 'place-555',
        instruction: 'Place a 555 Timer chip on the board.',
        highlightComponent: 'timer555',
        failHint:
          'Find the 555 Timer in the IC section of the Parts panel and drag it onto the breadboard.',
        validate: (s) => hasComponent(s, 'timer555'),
      },
      {
        id: 'wire-555',
        instruction:
          'Wire: VCC(8) → 9V, GND(1) → 0V, TRIG+THRESH tied together through a capacitor to GND, R1+R2 between VCC and DISCH.',
        hint: 'This is astable mode. The LED on the OUT pin should blink at 1.44 / ((R1+2×R2)×C) Hz.',
        failHint:
          'Connect VCC(8)→9V, GND(1)→0V. Tie TRIG and THRESH together, capacitor from that node to GND, R1+R2 between VCC and DISCH. LED on OUT(3) blinks.',
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
    autoLoadId: 'arduino-blink',
    steps: [
      {
        id: 'place-arduino',
        instruction: 'Place an Arduino Uno on the breadboard.',
        highlightComponent: 'arduino',
        failHint:
          'Find the Arduino Uno in the IC section of the Parts panel and drag it onto the breadboard.',
        validate: (s) => hasComponent(s, 'arduino'),
      },
      {
        id: 'wire-led',
        instruction: 'Wire: Pin 13 → 220Ω resistor → LED → GND.',
        failHint: 'Connect D13 → 220Ω resistor → LED anode. LED cathode → GND pin on the Arduino.',
        validate: (s) => hasComponent(s, 'arduino') && hasCurrentLimitingResistor(s),
      },
      {
        id: 'upload-blink',
        instruction: 'Open the Arduino panel (click ▶ in the sidebar) and upload the Blink sketch.',
        hint: 'The built-in Blink example is available. Pin 13 will toggle every 500ms.',
        failHint:
          'Open the Arduino panel (press A). Find the Blink example and click Upload. Pin 13 will toggle every 500ms.',
        spotlightTarget: 'sidebar-parts',
        validate: (s) => hasComponent(s, 'arduino') && isLEDLit(s),
      },
    ],
  },
  {
    id: 'diode-one-way',
    title: '12. One-Way Street',
    subtitle: 'Diodes, forward voltage, polarity',
    concept:
      'A diode is a one-way valve for electricity. Current flows freely from anode (+) to cathode (−) but is blocked in reverse. The ~0.7V forward voltage drop is a diode fingerprint — measurable on every silicon diode.',
    prerequisiteId: 'arduino-hello',
    autoLoadId: 'diode-forward-bias',
    steps: [
      {
        id: 'place-diode',
        instruction: 'Place a Diode on the breadboard.',
        highlightComponent: 'diode',
        failHint: 'Find the Diode in the Active section of the Parts panel and drag it onto the breadboard.',
        validate: (s) => hasComponent(s, 'diode'),
      },
      {
        id: 'wire-forward',
        instruction: 'Wire: Battery+ → 1kΩ Resistor → Diode anode → Diode cathode → Battery−.',
        hint: 'Current should flow. Notice the ~0.7V drop across the diode in the Properties inspector.',
        spotlightTarget: 'breadboard',
        failHint:
          'The anode (+) must face toward the higher voltage. If no current, select the diode and press R to rotate.',
        validate: (s) => isDiodeForwardBiased(s) && hasCurrentFlow(s),
      },
      {
        id: 'reverse-it',
        instruction: 'Select the diode and press R to flip it 180°. Current should stop.',
        hint: 'When reversed, the diode blocks all current — the circuit is open.',
        spotlightTarget: 'properties',
        failHint:
          'Select the diode and press R to rotate it. Once reversed, the current should drop to near zero.',
        validate: (s) => isDiodeBlocking(s),
      },
    ],
  },
  {
    id: 'rc-filter-module',
    title: '13. The Smoother',
    subtitle: 'RC low-pass filter, τ = RC',
    concept:
      'A resistor and capacitor together form a low-pass filter. Rapid voltage changes are smoothed out; slow changes pass through. The time constant τ = R×C (in seconds) controls the response speed — larger τ means slower response.',
    prerequisiteId: 'diode-one-way',
    autoLoadId: 'rc-filter-starter',
    steps: [
      {
        id: 'build-rc-filter',
        instruction: 'Wire: Battery+ → 10kΩ Resistor → Capacitor+ → Battery−.',
        highlightComponent: 'capacitor',
        failHint: 'Place a 10kΩ resistor and a 100µF capacitor in series with the battery.',
        validate: (s) => hasComponent(s, 'capacitor') && hasComponent(s, 'resistor') && hasCurrentFlow(s),
      },
      {
        id: 'observe-charging',
        instruction: 'Open the oscilloscope (O). Add the capacitor positive pin. Watch the charge curve.',
        hint: 'The capacitor reaches 63% of supply voltage in τ = 10kΩ × 100µF = 1 second.',
        spotlightTarget: 'oscilloscope',
        failHint:
          'Press O to open the oscilloscope, click +, and pick the capacitor\'s positive pin node.',
        validate: (s) => scopeIsOpen(s),
      },
      {
        id: 'change-rc',
        instruction: 'Change the resistor to 1kΩ. The capacitor charges 10× faster.',
        hint: 'Select the resistor and set resistance to 1000 in the Properties panel.',
        spotlightTarget: 'properties',
        failHint:
          'Click the resistor, then change its resistance value to 1000 (1kΩ) in the Properties inspector.',
        validate: (s) => hasComponent(s, 'resistor') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'mosfet-switch',
    title: '14. The Voltage Valve',
    subtitle: 'MOSFET — voltage-controlled switch',
    concept:
      'A MOSFET is a switch controlled by voltage, not current. Apply enough voltage to the Gate and current flows from Drain to Source. Remove it and it turns off instantly. MOSFETs are in every power converter, motor driver, and CPU on earth.',
    prerequisiteId: 'rc-filter-module',
    autoLoadId: 'mosfet-starter',
    steps: [
      {
        id: 'place-mosfet',
        instruction: 'Place an N-channel MOSFET on the breadboard.',
        highlightComponent: 'mosfet',
        failHint:
          'Find the MOSFET in the Active section of the Parts panel and drag it onto the breadboard.',
        validate: (s) => hasMosfet(s),
      },
      {
        id: 'wire-mosfet-on',
        instruction: 'Wire: Battery+ → 220Ω → LED → Drain. Source → Battery−. Gate → Battery+ through 10kΩ.',
        hint: 'With Gate held high by the resistor, the MOSFET conducts and the LED lights.',
        spotlightTarget: 'breadboard',
        failHint:
          'Connect Gate to battery+ through a 10kΩ resistor. Drain through 220Ω and LED anode to battery+. Source to battery−.',
        validate: (s) => hasMosfet(s) && isLEDLit(s),
      },
      {
        id: 'gate-off',
        instruction: 'Add a wire from Gate to Battery−. The LED should turn off.',
        hint: 'Gate at 0V = MOSFET off = no current = LED dark. This is digital logic at its simplest.',
        spotlightTarget: 'breadboard',
        failHint:
          'Draw a wire from the MOSFET Gate pin directly to Battery− (ground). Gate at 0V turns it off.',
        validate: (s) => hasMosfet(s) && !isLEDLit(s),
      },
    ],
  },
  {
    id: 'zener-regulator-module',
    title: '15. Holding the Line',
    subtitle: 'Zener diode, voltage regulation',
    concept:
      'A Zener diode conducts in reverse once voltage reaches its breakdown voltage Vz. This clamps the output — no matter how the input varies, the Zener holds it steady at Vz. It\'s the simplest voltage regulator and the foundation of all power supply design.',
    prerequisiteId: 'mosfet-switch',
    autoLoadId: 'zener-regulator-starter',
    steps: [
      {
        id: 'place-zener',
        instruction: 'Place a Zener diode on the breadboard.',
        highlightComponent: 'zener',
        failHint:
          'Find the Zener diode in the Active section of the Parts panel and drag it onto the breadboard.',
        validate: (s) => hasZener(s),
      },
      {
        id: 'wire-regulator',
        instruction: 'Wire: 12V Battery+ → 1kΩ Resistor → output node. Zener cathode to output, Zener anode to Battery−.',
        hint: 'The Zener clamps the output to 5.1V. Hover over the output node to see the voltage.',
        spotlightTarget: 'breadboard',
        failHint:
          'Battery+ through 1kΩ to the output node. Zener cathode to that node, Zener anode to battery−.',
        validate: (s) => hasZener(s) && hasComponent(s, 'resistor') && hasCurrentFlow(s),
      },
      {
        id: 'test-regulation',
        instruction: 'Change the battery voltage to 15V. The output should still read ~5.1V.',
        hint: 'Select the battery and change its voltage. The regulated output stays constant — that\'s regulation.',
        spotlightTarget: 'properties',
        failHint:
          'Select the battery and set voltage to 15V in the Properties panel. The output node should still show ~5.1V.',
        validate: (s) => hasZener(s) && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'm16-hbridge',
    title: '16. H-Bridge Motor Control',
    subtitle: 'H-bridge control and polarity reversal',
    concept:
      'An H-bridge lets you control a DC motor\'s direction and speed using transistors. Four switches form a bridge that reverses polarity to the motor.',
    prerequisiteId: 'zener-regulator-module',
    autoLoadId: 'm16-hbridge',
    steps: [
      {
        id: 'place-hbridge-parts',
        instruction: 'Place a motor, 4 resistors, and 2 batteries.',
        hint: 'Each resistor will act as a bridge leg for the first wiring pass.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'motor',
        failHint: 'Drop a motor, two batteries, and four resistors only. No switches or diodes needed for this step.',
        validate: (s) =>
          hasComponent(s, 'motor') && hasNComponents(s, 'resistor', 4) && hasNComponents(s, 'battery', 2),
      },
      {
        id: 'connect-hbridge-topology',
        instruction: 'Build the H-bridge topology with the motor between opposing legs.',
        hint: 'Connect opposite motor terminals to the opposite supply rails through resistor pairs.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'resistor',
        failHint:
          'Use both battery pairs and all four resistors to form two cross-connect paths to the motor terminals.',
        validate: (s) => hasCurrentFlow(s) && hasNComponents(s, 'resistor', 4),
      },
      {
        id: 'observe-motor-direction',
        instruction: 'Power the bridge and watch the motor direction change when inputs are toggled.',
        hint: 'Use switches/transistor controls in the next step to reverse polarity and spin direction.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'motor',
        failHint: 'Power the completed bridge. The motor should run when one polarity path is complete.',
        validate: (s) => hasComponent(s, 'motor') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'm17-arduino-blink',
    title: '17. Arduino Blink',
    subtitle: 'Digital output code control',
    concept:
      'Microcontrollers run programs that can toggle digital outputs. The classic \'Blink\' sketch turns an LED on and off repeatedly.',
    prerequisiteId: 'm16-hbridge',
    autoLoadId: 'm17-arduino-blink',
    steps: [
      {
        id: 'place-arduino-led-resistor',
        instruction: 'Place an Arduino Uno, one LED, and a resistor.',
        hint: 'Use a digital output pin-capable Arduino and a current-limiting resistor on the LED anode.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'arduino',
        failHint: 'Drag an Arduino Uno, an LED, and a resistor onto the breadboard.',
        validate: (s) =>
          hasComponent(s, 'arduino') && hasComponent(s, 'led') && hasNComponents(s, 'resistor', 1),
      },
      {
        id: 'wire-led-to-pin13',
        instruction: 'Wire LED anode to Arduino pin 13 through the resistor.',
        hint: 'Pin 13 is already configured for built-in onboard behavior in many boards.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'resistor',
        failHint: 'Connect D13 → resistor → LED anode, with LED cathode returned to Arduino GND.',
        validate: (s) => hasComponent(s, 'arduino') && hasCurrentLimitingResistor(s) && areConnected(s, 'arduino', 'led'),
      },
      {
        id: 'upload-blink',
        instruction: 'Open the Arduino panel and upload the Blink sketch.',
        hint: 'Use the built-in Blink example so pin 13 toggles every 500 ms.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'arduino',
        failHint: 'Open the Arduino panel, select the Blink sketch, and click Upload.',
        validate: (s) => hasComponent(s, 'arduino') && isLEDLit(s),
      },
    ],
  },
  {
    id: 'm18-arduino-pot',
    title: '18. Arduino + Potentiometer (analogRead)',
    subtitle: 'Voltage from a variable resistor',
    concept:
      'Analog sensors output variable voltages. analogRead() converts 0–5V to 0–1023. A potentiometer is a simple variable resistor you can dial.',
    prerequisiteId: 'm17-arduino-blink',
    autoLoadId: 'm18-arduino-pot',
    steps: [
      {
        id: 'place-arduino-pot',
        instruction: 'Place an Arduino Uno and a potentiometer.',
        hint: 'The potentiometer terminals will be your divider endpoints; use the wiper for signal output.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'arduino',
        failHint: 'Drop both the Arduino Uno and a potentiometer onto the board.',
        validate: (s) => hasComponent(s, 'arduino') && hasComponent(s, 'potentiometer'),
      },
      {
        id: 'wire-wiper-to-a0',
        instruction: 'Wire the potentiometer wiper to A0 and complete the divider to VCC/GND.',
        hint: 'A0 expects a mid-point analog voltage around 0–5V.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'potentiometer',
        failHint:
          'Connect terminal A to 5V and terminal B to GND, then connect the wiper node to A0.',
        validate: (s) => hasComponent(s, 'arduino') && hasComponent(s, 'potentiometer') && areConnected(s, 'arduino', 'potentiometer'),
      },
      {
        id: 'observe-serial-monitor',
        instruction: 'Upload a sketch with analogRead() and open Serial Monitor.',
        hint: 'Rotate the potentiometer and watch values move between 0 and 1023.',
        spotlightTarget: 'properties',
        highlightComponent: 'potentiometer',
        failHint: 'Open the Serial Monitor and run a sketch that prints analogRead(A0). Move the knob.',
        validate: (s) => hasComponent(s, 'arduino') && hasComponent(s, 'potentiometer') && potIsAdjusted(s),
      },
    ],
  },
  {
    id: 'm19-pwm-led',
    title: '19. PWM LED Brightness',
    subtitle: 'Duty cycle and perceived brightness',
    concept:
      'Pulse-Width Modulation switches a signal on/off very fast. The ratio of on-time to off-time (duty cycle) controls perceived brightness.',
    prerequisiteId: 'm18-arduino-pot',
    autoLoadId: 'm19-pwm-led',
    steps: [
      {
        id: 'place-arduino-pwm-led',
        instruction: 'Place an Arduino Uno, LED, and resistor.',
        hint: 'Use pin 9 so the board can output PWM.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'arduino',
        failHint:
          'Place an Arduino Uno, a single LED, and a resistor in the workspace.',
        validate: (s) =>
          hasComponent(s, 'arduino') && hasComponent(s, 'led') && hasNComponents(s, 'resistor', 1),
      },
      {
        id: 'wire-led-to-pwm-pin',
        instruction: 'Wire LED anode to Arduino pin 9 through a resistor.',
        hint: 'The resistor should remain in series; cathode should return to GND.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'resistor',
        failHint: 'Connect D9 → resistor → LED anode, and LED cathode to ground.',
        validate: (s) => hasComponent(s, 'arduino') && hasCurrentLimitingResistor(s) && areConnected(s, 'arduino', 'led'),
      },
      {
        id: 'upload-analogwrite',
        instruction: 'Upload an analogWrite() sketch to change duty cycle at pin 9.',
        hint: 'Use a loop that writes values from 0 to 255.',
        spotlightTarget: 'sidebar-parts',
        failHint:
          'Open Arduino IDE panel, select analogWrite on pin 9, and upload the PWM example.',
        validate: (s) => hasComponent(s, 'arduino') && hasCurrentFlow(s),
      },
      {
        id: 'adjust-duty-cycle',
        instruction: 'Adjust the duty cycle and observe LED brightness transitions.',
        hint: 'Try values near 0, 64, 128, and 255.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'led',
        failHint:
          'The LED should visibly dim/brighten smoothly as duty cycle changes, not jump in binary on/off steps.',
        validate: (s) => hasComponent(s, 'arduino') && hasComponent(s, 'led') && hasCurrentFlow(s),
      },
    ],
  },
  {
    id: 'm20-logic-gates',
    title: '20. Digital Logic Gates (BJT inverter)',
    subtitle: 'Transistors as logic primitives',
    concept:
      'Logic gates are the building blocks of digital circuits. An NPN transistor with appropriate biasing acts as a NOT gate (inverter).',
    prerequisiteId: 'm19-pwm-led',
    autoLoadId: 'm20-logic-gates',
    steps: [
      {
        id: 'place-inverter-components',
        instruction: 'Place an NPN transistor, 2 resistors, a battery, switch, and LED.',
        hint: 'One resistor is a pull-up/load, and the other drives the base.',
        spotlightTarget: 'sidebar-parts',
        highlightComponent: 'bjt',
        failHint:
          'Use one NPN transistor (BJT), two resistors, a battery, a switch, and an LED.',
        validate: (s) =>
          hasComponent(s, 'bjt') &&
          hasNComponents(s, 'resistor', 2) &&
          hasComponent(s, 'battery') &&
          hasComponent(s, 'tactileSwitch') &&
          hasComponent(s, 'led'),
      },
      {
        id: 'connect-base-inverter',
        instruction: 'Wire the base resistor to battery through the switch.',
        hint: 'When the switch is closed the transistor base is driven, turning it on.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'tactileSwitch',
        failHint:
          'Connect: Battery+ → switch → base resistor → transistor base; transistor collector via resistor to Battery+, emitter to Battery−, LED on collector path.',
        validate: (s) =>
          hasComponent(s, 'tactileSwitch') &&
          hasNComponents(s, 'resistor', 2) &&
          hasComponent(s, 'bjt') &&
          hasComponent(s, 'battery') &&
          areConnected(s, 'battery', 'tactileSwitch') &&
          areConnected(s, 'battery', 'bjt'),
      },
      {
        id: 'observe-inversion',
        instruction: 'Toggle the switch and observe that LED state inverts.',
        hint: 'Input high should drive the transistor on, which pulls the LED output low (off). Input low should let LED turn on.',
        spotlightTarget: 'breadboard',
        highlightComponent: 'led',
        failHint:
          'With this topology, the LED should be opposite the switch state: ON when switch is open, OFF when closed.',
        validate: (s) =>
          hasComponent(s, 'bjt') &&
          hasComponent(s, 'tactileSwitch') &&
          hasComponent(s, 'led') &&
          (switchIsClosed(s) ? !isLEDLit(s) : isLEDLit(s)),
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
