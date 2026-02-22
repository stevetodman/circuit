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
const SAB_DIGITAL_OFFSET = MAX_NETS * 4; // skip voltages (Float32[256])

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

// ── Worker state ───────────────────────────────────────────────────────────────
let cpu:       CPU     | null = null;
let portB:     AVRIOPort | null = null;
let portC:     AVRIOPort | null = null;
let portD:     AVRIOPort | null = null;
let digitalView: Uint8Array   | null = null;
let running     = false;
let rafHandle:  ReturnType<typeof setInterval> | null = null;

// Map: Arduino pin number → SAB digitalStates index (set by UPDATE_PIN_MAP)
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
  if (!digitalView) return;
  for (const [pinStr, netIdx] of Object.entries(pinToNetIdx)) {
    const pin  = Number(pinStr);
    const map  = UNO_PIN_MAP[pin];
    if (!map) continue;
    const port = map.port === 'B' ? portB : map.port === 'C' ? portC : portD;
    if (!port) continue;
    const state = port.pinState(map.bit);
    digitalView[netIdx] = state === PinState.High ? 1 : 0;
  }
}

// ── CPU tick loop — run ~16 MHz in bursts ─────────────────────────────────────
const CYCLES_PER_MS = 16_000; // 16 MHz → 16000 cycles/ms

function runBurst() {
  if (!cpu || !running) return;
  const target = cpu.cycles + CYCLES_PER_MS;
  while (cpu.cycles < target) {
    cpu.tick();
  }
  syncGPIO();
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
      running = false;
      cpu = null;

      // Attach SAB view
      digitalView = new Uint8Array(msg.sab, SAB_DIGITAL_OFFSET, MAX_NETS);

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
        self.postMessage({ type: 'SERIAL_OUTPUT', data: String.fromCharCode(byte) });
      };

      // Start run loop
      running = true;
      rafHandle = setInterval(runBurst, 1);
      self.postMessage({ type: 'READY' });
      break;
    }

    case 'UPDATE_PIN_MAP': {
      if (!msg.pinMap) break;
      Object.assign(pinToNetIdx, msg.pinMap);
      if (msg.sab && !digitalView) {
        digitalView = new Uint8Array(msg.sab, SAB_DIGITAL_OFFSET, MAX_NETS);
      }
      break;
    }

    case 'PAUSE':
      running = false;
      break;

    case 'RESUME':
      if (cpu) running = true;
      break;

    case 'STOP':
      if (rafHandle != null) clearInterval(rafHandle);
      running = false;
      cpu = null;
      break;
  }
};
