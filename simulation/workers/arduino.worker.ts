/**
 * Arduino emulation worker — powered by avr8js.
 *
 * Runs an AVR8 CPU at ~16 MHz, maps digital GPIO pins to SAB digital states
 * so the main thread can read them in useFrame.
 *
 * Message protocol (main → worker):
 *   { type: 'UPLOAD_HEX', hex: string, sab: SharedArrayBuffer }
 *   { type: 'UPDATE_PIN_MAP', pinMap: PinMap, sab: SharedArrayBuffer }
 *   { type: 'PAUSE' }
 *   { type: 'RESUME' }
 *   { type: 'STOP' }
 *
 * Message protocol (worker → main):
 *   { type: 'READY' }
 *   { type: 'RUNTIME_ERROR', message: string }
 *   { type: 'SERIAL_OUTPUT', data: string }
 *   { type: 'CYCLE_COUNT', cycles: number }
 */
import {
  CPU,
  AVRTimer,
  AVRIOPort,
  AVRUSART,
  portDConfig,
  portBConfig,
  portCConfig,
  timer0Config,
  usart0Config,
  PinState,
} from 'avr8js';

// ── SAB layout (must match types/circuit.ts) ───────────────────────────────────
const MAX_NETS           = 256;
const SAB_VOLTAGE_OFFSET = 0;              // Float32[256] — net voltages
const SAB_DIGITAL_OFFSET = MAX_NETS * 4;  // Uint8[256]   — digital HIGH/LOW

// ── Arduino Uno pin → AVR port/bit mapping ────────────────────────────────────
// Digital pins 0-13, analog pins A0-A5 mapped as digital 14-19
const UNO_PIN_MAP: Record<number, { port: 'B' | 'C' | 'D'; bit: number }> = {
  0:  { port: 'D', bit: 0 }, 1:  { port: 'D', bit: 1 },
  2:  { port: 'D', bit: 2 }, 3:  { port: 'D', bit: 3 },
  4:  { port: 'D', bit: 4 }, 5:  { port: 'D', bit: 5 },
  6:  { port: 'D', bit: 6 }, 7:  { port: 'D', bit: 7 },
  8:  { port: 'B', bit: 0 }, 9:  { port: 'B', bit: 1 },
  10: { port: 'B', bit: 2 }, 11: { port: 'B', bit: 3 },
  12: { port: 'B', bit: 4 }, 13: { port: 'B', bit: 5 },
  14: { port: 'C', bit: 0 }, 15: { port: 'C', bit: 1 },
  16: { port: 'C', bit: 2 }, 17: { port: 'C', bit: 3 },
  18: { port: 'C', bit: 4 }, 19: { port: 'C', bit: 5 },
};

// Logic HIGH threshold — 5V Arduino logic: anything above 2.5V is HIGH
const LOGIC_THRESHOLD = 2.5;

// ── Worker state ───────────────────────────────────────────────────────────────
let cpu:             CPU        | null = null;
let portB:           AVRIOPort  | null = null;
let portC:           AVRIOPort  | null = null;
let portD:           AVRIOPort  | null = null;
let voltageView:     Float32Array | null = null; // SAB net voltages (read for inputs)
let digitalStateView: Uint8Array  | null = null; // SAB digital states (write for outputs)
let running     = false;
let paused      = false;
let rafHandle:  ReturnType<typeof setInterval> | null = null;
let cycleHandle: ReturnType<typeof setInterval> | null = null;
// P1-16: batch serial bytes per burst instead of one postMessage per byte
let serialBuffer = '';

// Map: Arduino pin number → SAB net index (set by UPDATE_PIN_MAP)
const pinToNetIdx: Record<number, number> = {};

// ── IHex parser (minimal) ──────────────────────────────────────────────────────
function parseHex(hexString: string): Uint8Array {
  const prog = new Uint8Array(32 * 1024); // 32 KB flash
  for (const line of hexString.split('\n')) {
    const s = line.trim();
    if (!s.startsWith(':')) continue;
    const len  = parseInt(s.slice(1,  3), 16);
    const addr = parseInt(s.slice(3,  7), 16);
    const type = parseInt(s.slice(7,  9), 16);
    if (type !== 0) continue; // data record only
    for (let i = 0; i < len; i++) {
      prog[addr + i] = parseInt(s.slice(9 + i * 2, 11 + i * 2), 16);
    }
  }
  return prog;
}

// ── GPIO → SAB bridge ──────────────────────────────────────────────────────────
function syncGPIO() {
  if (!digitalStateView || !voltageView) return;

  // Write AVR output pin states to shared memory (digital HIGH/LOW)
  for (const [pinStr, netIdx] of Object.entries(pinToNetIdx)) {
    if (netIdx < 0 || netIdx >= MAX_NETS) continue;
    const pin  = Number(pinStr);
    const map  = UNO_PIN_MAP[pin];
    if (!map) continue;
    const port = map.port === 'B' ? portB : map.port === 'C' ? portC : portD;
    if (!port) continue;
    const state = port.pinState(map.bit);
    digitalStateView[netIdx] = state === PinState.High ? 1 : 0;
  }

  // Read net voltages from SAB and feed as AVR digital input pin state.
  // Uses actual analog voltage (Float32 SAB view) — not the digital state written above.
  // This correctly handles circuit outputs (e.g. 3.3V → HIGH, 0.5V → LOW).
  for (const [arduinoPin, netIdx] of Object.entries(pinToNetIdx)) {
    if (netIdx < 0 || netIdx >= MAX_NETS) continue;
    const voltage = voltageView[netIdx]; // actual net voltage in volts
    const mapping = UNO_PIN_MAP[Number(arduinoPin)];
    if (!mapping) continue;
    const port = mapping.port === 'B' ? portB : mapping.port === 'C' ? portC : portD;
    if (!port) continue;
    port.setPin(mapping.bit, voltage > LOGIC_THRESHOLD);
  }
}

// ── CPU tick loop — run ~16 MHz in bursts ─────────────────────────────────────
const CYCLES_PER_MS = 16_000; // 16 MHz → 16000 cycles/ms

function runBurst() {
  if (!cpu || !running || paused) return;
  const target = cpu.cycles + CYCLES_PER_MS;
  while (cpu.cycles < target) {
    cpu.tick();
  }
  syncGPIO();
  // P1-16: flush batched serial bytes once per 1ms burst
  if (serialBuffer) {
    self.postMessage({ type: 'SERIAL_OUTPUT', data: serialBuffer });
    serialBuffer = '';
  }
}

// ── Message handler ────────────────────────────────────────────────────────────
interface WorkerMsg {
  type:       string;
  hex?:       string;
  sab?:       SharedArrayBuffer;
  pinMap?:    Record<number, number>; // Arduino pin → SAB index
}

self.onmessage = (e: MessageEvent<WorkerMsg>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'UPLOAD_HEX': {
      if (!msg.hex || !msg.sab) break;

      // Stop existing CPU
      if (rafHandle != null) clearInterval(rafHandle);
      if (cycleHandle != null) clearInterval(cycleHandle);
      running = false;
      paused = false;
      cpu = null;
      serialBuffer = ''; // P1-16: clear stale serial data

      // Attach SAB views — voltage for reading inputs, digital for writing outputs
      voltageView      = new Float32Array(msg.sab, SAB_VOLTAGE_OFFSET, MAX_NETS);
      digitalStateView = new Uint8Array(msg.sab, SAB_DIGITAL_OFFSET, MAX_NETS);

      // Parse and load program
      const prog = parseHex(msg.hex);
      cpu = new CPU(new Uint16Array(prog.buffer));

      // Attach peripheral ports
      portB = new AVRIOPort(cpu, portBConfig);
      portC = new AVRIOPort(cpu, portCConfig);
      portD = new AVRIOPort(cpu, portDConfig);

      // Attach timer + USART (needed for most sketches)
      new AVRTimer(cpu, timer0Config);
      const usart = new AVRUSART(cpu, usart0Config, 16e6);
      usart.onByteTransmit = (byte: number) => {
        serialBuffer += String.fromCharCode(byte); // P1-16: buffer; flushed in runBurst
      };

      // Start run loop
      running = true;
      paused = false;
      rafHandle = setInterval(runBurst, 1);
      cycleHandle = setInterval(() => {
        if (cpu) self.postMessage({ type: 'CYCLE_COUNT', cycles: cpu.cycles });
      }, 1000);
      self.postMessage({ type: 'READY' });
      break;
    }

    case 'UPDATE_PIN_MAP': {
      if (!msg.pinMap) break;
      // Replace pinToNetIdx entirely (don't accumulate stale mappings)
      for (const key of Object.keys(pinToNetIdx)) delete pinToNetIdx[Number(key)];
      Object.assign(pinToNetIdx, msg.pinMap);
      if (msg.sab && !digitalStateView) {
        voltageView      = new Float32Array(msg.sab, SAB_VOLTAGE_OFFSET, MAX_NETS);
        digitalStateView = new Uint8Array(msg.sab, SAB_DIGITAL_OFFSET, MAX_NETS);
      }
      break;
    }

    case 'PAUSE':
      paused = true;
      break;

    case 'RESUME':
      paused = false; // always allow resume, even if cpu not yet initialized
      break;

    case 'STOP':
      if (rafHandle != null) {
        clearInterval(rafHandle);
        rafHandle = null;
      }
      if (cycleHandle != null) {
        clearInterval(cycleHandle);
        cycleHandle = null;
      }
      running = false;
      paused = false;
      cpu = null;
      break;
  }
};
