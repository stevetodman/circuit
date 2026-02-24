export interface ComponentInfoEntry {
  summary: string;
  howTo: string[];
  mistake: string;
}

export const COMPONENT_INFO: Partial<Record<string, ComponentInfoEntry>> = {
  battery: {
    summary: 'Provides the DC voltage that powers the entire circuit.',
    howTo: [
      "Connect + (positive) to your circuit's power rail",
      'Connect − (negative) to the ground rail',
      'Set voltage in the properties panel (default 9V)',
    ],
    mistake: 'Leaving + or − disconnected — both terminals must be wired for current to flow.',
  },
  resistor: {
    summary: 'Limits current and drops voltage — essential for protecting LEDs and other components.',
    howTo: [
      'Place in series with the component you want to protect',
      'Use 220–470Ω to limit LED current to a safe level',
      'Higher resistance = less current = dimmer LED',
    ],
    mistake: 'Bypassing the resistor — connecting an LED directly to power without a resistor will burn it out.',
  },
  led: {
    summary: 'Lights up when current flows through it in the correct direction (anode → cathode).',
    howTo: [
      'Connect the anode (+, longer leg) toward the positive supply',
      'Connect the cathode (−, shorter leg, flat side) toward ground',
      'Always add a 220–470Ω resistor in series to limit current',
    ],
    mistake: 'Connecting it backwards — the LED will not light and may get warm. Swap the legs if it doesn\'t glow.',
  },
  capacitor: {
    summary: 'Stores electrical charge and releases it. Smooths out voltage spikes and stores energy briefly.',
    howTo: [
      'For electrolytic caps, connect + pin to the higher voltage side',
      'Use in parallel with power supply to filter noise',
      'Larger capacitance = stores more charge = slower charge/discharge',
    ],
    mistake: 'Reversing polarity on electrolytic capacitors — always connect + to the higher voltage.',
  },
  diode: {
    summary: 'A one-way valve for current — only allows current to flow from anode to cathode.',
    howTo: [
      'Anode (+) faces the positive/higher voltage side',
      'Cathode (−) faces the negative/lower voltage side',
      'The stripe on a real diode marks the cathode end',
    ],
    mistake: 'Installing it backwards — it will block current completely. Look for the cathode stripe.',
  },
  bjt: {
    summary: 'An NPN transistor: a switch or amplifier controlled by a small base current.',
    howTo: [
      'Apply 0.6–0.7V to the base (via a resistor from the signal) to turn it ON',
      'Current flows from collector to emitter when ON',
      'Use a 10kΩ base resistor for a logic-level switch',
    ],
    mistake: 'Omitting the base resistor — drives excess base current and can damage the transistor.',
  },
  pnp: {
    summary: 'A PNP transistor: conducts when the base is pulled LOW (toward ground).',
    howTo: [
      'Emitter connects to the positive supply',
      'Pull base LOW through a resistor to turn it ON',
      'Load connects between collector and ground',
    ],
    mistake: 'Confusing it with NPN — PNP turns ON when base goes LOW, the opposite of NPN.',
  },
  mosfet: {
    summary: 'A voltage-controlled switch. Gate voltage controls whether drain-to-source conducts.',
    howTo: [
      'Apply >2–3V to the gate to turn the N-channel MOSFET on',
      'Drain connects to the load; source connects to ground',
      'Gate draws almost no current — no gate resistor needed for DC',
    ],
    mistake: 'Floating the gate — always tie it to a defined voltage (never leave it unconnected).',
  },
  opamp: {
    summary: 'Amplifies the voltage difference between two inputs. Needs a power supply and feedback resistors.',
    howTo: [
      'Connect V+ and V− to your power supply rails',
      'Use negative feedback (output to − input via resistor) to set gain',
      'Gain = 1 + (Rf / R1) for non-inverting configuration',
    ],
    mistake: 'Omitting the power supply connections — op-amps need both V+ and V− to work.',
  },
  timer555: {
    summary: 'Generates square-wave oscillations at a frequency set by R1, R2, and C.',
    howTo: [
      'Set R1, R2, and C in the properties panel to control frequency',
      'Output pin swings between 0V and Vcc',
      'Frequency ≈ 1.44 / ((R1 + 2×R2) × C)',
    ],
    mistake: 'Leaving the Control Voltage pin (CV) unconnected — add a 0.01µF cap from CV to GND for stability.',
  },
  zener: {
    summary: 'Conducts in reverse at a precise breakdown voltage — used to regulate or clamp voltage.',
    howTo: [
      'Connect cathode to the higher voltage rail',
      'Anode connects toward ground',
      'Always use a series resistor to limit current',
    ],
    mistake: 'Forgetting the series resistor — without it, the Zener draws unlimited current and burns out.',
  },
  schottky: {
    summary: 'A fast diode with a low forward voltage (~0.3V). Great for power protection and high-speed circuits.',
    howTo: [
      'Same orientation as a regular diode (anode to +, cathode to −)',
      'Lower forward drop means less wasted power than a standard diode',
      'Used in rectifiers and reverse-polarity protection',
    ],
    mistake: 'Confusing it with a Zener — a Schottky is a forward-conducting diode, not a voltage reference.',
  },
  inductor: {
    summary: 'Stores energy in a magnetic field. Opposes rapid changes in current.',
    howTo: [
      'Place in series to block high-frequency signals (low-pass filter)',
      'Combine with a capacitor for an LC resonant circuit',
      'Inductance in mH or µH — larger value = more opposition to current change',
    ],
    mistake: 'Using an inductor in DC circuits expecting it to block DC — inductors pass DC freely in steady state.',
  },
  potentiometer: {
    summary: 'A variable resistor. The wiper outputs a voltage between 0V and the supply voltage.',
    howTo: [
      'Connect the two end terminals across the voltage range you want to divide',
      'Read the wiper output as an adjustable voltage',
      'Scroll on the knob in the 3D view to adjust wiper position',
    ],
    mistake: 'Leaving one end terminal disconnected — both ends must be wired for the voltage divider to work.',
  },
  motor: {
    summary: 'A DC hobby motor. Spins when voltage is applied; direction depends on polarity.',
    howTo: [
      'Apply >3V across the terminals to spin',
      'Reverse the connections to reverse spin direction',
      'Add a transistor to switch a motor with a microcontroller signal',
    ],
    mistake: 'Connecting directly to an Arduino pin — motors need much more current than a logic pin can supply. Use a transistor.',
  },
  tactileSwitch: {
    summary: 'A momentary push-button switch. Click it in the 3D view to toggle open/closed.',
    howTo: [
      'Wire both pins into the circuit path you want to switch',
      'Click the switch in the 3D view to toggle it ON/OFF',
      'Combine with a pull-down resistor for digital input to a microcontroller',
    ],
    mistake: 'Forgetting a pull-down resistor when reading with a microcontroller — the input will float randomly when the button is open.',
  },
  arduino: {
    summary: 'ATmega328P microcontroller. Upload a sketch to control digital/analog I/O pins.',
    howTo: [
      'Click "Arduino" tab in the sidebar to open the code editor',
      'Digital pins 0–13 can be OUTPUT (write) or INPUT (read)',
      'Analog pins A0–A5 read 0–1023 corresponding to 0–5V',
    ],
    mistake: 'Driving a motor or LED directly from a GPIO pin — use a transistor or the LED\'s built-in current limit.',
  },
  voltageRegulator: {
    summary: 'A 78xx linear regulator. Outputs a fixed voltage (5V, 9V, 12V) from a higher input.',
    howTo: [
      'Input (IN) must be at least 2V above the output voltage',
      'Output (OUT) provides the regulated fixed voltage',
      'Connect GND to your circuit\'s common ground',
    ],
    mistake: 'Supplying input voltage that\'s too close to the output — the regulator needs a dropout headroom of ~2V.',
  },
};
