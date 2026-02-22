'use client';

/**
 * ArduinoPanel — shown in the sidebar when an Arduino component is selected.
 *
 * Lets the user upload a pre-compiled .hex file.  The Arduino worker is
 * started/stopped here.  GPIO pin→net mapping is derived automatically from
 * the placed Arduino component's PinConnections.
 *
 * Rules-of-Hooks note: ALL hooks are declared before any conditional return.
 * The `isArduino` flag gates side effects and the rendered output.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { useToastStore } from '@/store/toastStore';

// Blink sketch compiled for ATmega328P (pin 13, 1 Hz)
const BLINK_HEX = `
:100000000C9434000C943E000C943E000C943E0082
:100010000C943E000C943E000C943E000C943E0068
:100020000C943E000C943E000C943E000C943E0058
:100030000C943E000C943E000C943E000C943E0048
:100040000C943E000C943E000C943E000C943E0038
:100050000C943E000C943E000C943E000C943E0028
:100060000C943E000C943E000C943E000C943E0018
:100070000C943E000C943E000C943E000C943E0008
:1000800011241FBECFEFD8E0DEBFCDBF0E9440005E
:1000900000C00000F894FFCF8091050085FF0DC062
:1000A00014BE8091050085FF06C08091050085FF01
:1000B00007C01092050082E090E02197F1F70895B0
:1000C00085E091E00197F1F782E090E001970F2710
:1000D00001F0A9F50197B9F40895B8 9F5089585B
:0400E000F89485951E
:00000001FF
`.trim();

// Arduino Uno digital pin name → pin number
const PIN_NAME_TO_NUM: Record<string, number> = {
  d0: 0, d1: 1, d2: 2, d3: 3, d4: 4, d5: 5, d6: 6, d7: 7,
  d8: 8, d9: 9, d10: 10, d11: 11, d12: 12, d13: 13,
  a0: 14, a1: 15, a2: 16, a3: 17, a4: 18, a5: 19,
};

function formatCycles(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ArduinoPanel() {
  // ── All hooks declared unconditionally (Rules of Hooks) ───────────────────
  const selectedId  = useCircuitStore((s) => s.selectedComponentId);
  const components  = useCircuitStore((s) => s.components);
  const nodes       = useCircuitStore((s) => s.nodes);
  const sab         = useUIStore((s) => s.sab);
  const addToast    = useToastStore((s) => s.addToast);

  const workerRef   = useRef<Worker | null>(null);
  const [running,   setRunning]   = useState(false);
  const [paused,    setPaused]    = useState(false);
  const [hexText,   setHexText]   = useState('');
  const [hexName,   setHexName]   = useState<string | null>(null);
  const [cycleCount,setCycleCount]= useState(0);
  const [userScrolled, setUserScrolled] = useState(false);
  const serialOutput = useUIStore((s) => s.serialOutput);
  const clearSerialOutput = useUIStore((s) => s.clearSerialOutput);
  const serialRef = useRef<HTMLPreElement | null>(null);

  // Derive whether we are looking at an Arduino component
  const component = selectedId ? components[selectedId] : null;
  const isArduino = component?.type === 'arduino';

  // Build pin → SAB net-index map from the component's pin connections
  const buildPinMap = useCallback((): Record<number, number> => {
    if (!component) return {};
    const map: Record<number, number> = {};
    for (const pin of component.pins) {
      const pinNum = PIN_NAME_TO_NUM[pin.name];
      if (pinNum == null) continue;
      const node = nodes[pin.nodeId];
      if (node?.netId != null) map[pinNum] = node.netId;
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component?.pins, nodes]);

  // Stop and clean up the worker
  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      workerRef.current.terminate();
      (window as { arduinoWorker?: Worker }).arduinoWorker = undefined;
      workerRef.current = null;
    }
    setRunning(false);
    setPaused(false);
  }, []);

  // Terminate worker when this Arduino is deselected (not just on unmount)
  useEffect(() => {
    if (!isArduino && workerRef.current) {
      stopWorker();
    }
  }, [isArduino, stopWorker]);

  // Terminate worker on component unmount
  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      workerRef.current.terminate();
      (window as { arduinoWorker?: Worker }).arduinoWorker = undefined;
      workerRef.current = null;
    }
  }, []);

  // Re-send pin map whenever topology changes while a sketch is running
  useEffect(() => {
    if (!workerRef.current || !running || !sab || !isArduino) return;
    workerRef.current.postMessage({ type: 'UPDATE_PIN_MAP', pinMap: buildPinMap(), sab });
  // buildPinMap already tracks component.pins + nodes; no need to duplicate them here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPinMap, running, sab, isArduino]);

  const uploadAndRun = useCallback((hex: string, fileName: string) => {
    if (!sab) {
      addToast('Simulator not ready — wait a moment and try again', 'error');
      return;
    }

    if (workerRef.current) workerRef.current.terminate();

    const worker = new Worker(
      new URL('../../simulation/workers/arduino.worker.ts', import.meta.url),
    );
    workerRef.current = worker;
    setPaused(false);
    setCycleCount(0);
    clearSerialOutput();
    setHexName(fileName);
    (window as { arduinoWorker?: Worker }).arduinoWorker = worker;

    worker.onmessage = (e) => {
      const { type, cycles, message } = e.data as {
        type: string;
        cycles?: number;
        message?: string;
      };
      if (type === 'READY')         setRunning(true);
      if (type === 'RUNTIME_ERROR') {
        console.error('[Arduino]', message);
        addToast(`Arduino runtime error: ${message ?? 'unknown'}`, 'error');
      }
      if (type === 'CYCLE_COUNT' && cycles != null) setCycleCount(cycles);
    };

    worker.postMessage({ type: 'UPLOAD_HEX', hex, sab });
    worker.postMessage({ type: 'UPDATE_PIN_MAP', pinMap: buildPinMap(), sab });
  }, [sab, addToast, buildPinMap]);

  useEffect(() => {
    if (!userScrolled && serialRef.current) {
      serialRef.current.scrollTop = serialRef.current.scrollHeight;
    }
  }, [serialOutput, userScrolled]);

  const handleScroll = () => {
    const el = serialRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    setUserScrolled(!isAtBottom);
  };

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'PAUSE' });
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESUME' });
    setPaused(false);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate file size (ATmega328P has 32 KB flash; .hex overhead makes 256 KB a safe ceiling)
    const MAX_HEX_SIZE = 256 * 1024;
    if (file.size > MAX_HEX_SIZE) {
      addToast('File too large — ATmega328P supports max 32 KB flash', 'error');
      return;
    }
    file.text().then((text) => {
      if (!text.includes(':') || !text.trim().endsWith(':00000001FF')) {
        addToast('Invalid Intel HEX format — compile with avr-gcc for ATmega328P', 'error');
        return;
      }
      setHexText(text);
      setHexName(file.name);
    });
  };

  // ── Conditional render (all hooks already called above) ───────────────────
  if (!isArduino) return null;

  return (
    <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
      <p className="text-[11px] font-semibold text-white/60">Arduino Uno</p>

      {/* Upload hex */}
      <div className="space-y-1.5">
        <p className="text-[9px] text-white/30 uppercase tracking-widest">Upload .hex sketch</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-[10px] px-2 py-1 rounded bg-white/[0.07] text-white/50 hover:bg-white/[0.12] transition-colors">
            Choose file…
          </span>
          <input type="file" accept=".hex" className="hidden" onChange={onFileChange} />
          {hexName && <span className="text-[9px] text-white/30">{hexName}</span>}
        </label>
      </div>

      {/* Quick blink button */}
      <button
        onClick={() => uploadAndRun(BLINK_HEX, 'blink.hex')}
        className="w-full text-[10px] py-1.5 rounded bg-[#22cc66]/20 text-[#22cc66] hover:bg-[#22cc66]/30 transition-colors focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
      >
        Run Blink (pin 13)
      </button>

      {/* Run / Stop */}
      {hexText && (
        <div className="flex gap-2">
          {running && hexName && (
            <span className="text-[9px] text-white/35 self-center">Running: {hexName}</span>
          )}
          <button
            onClick={() => uploadAndRun(hexText, hexName ?? 'sketch.hex')}
            disabled={running}
            className="flex-1 text-[10px] py-1.5 rounded bg-[#2299cc]/20 text-[#2299cc] hover:bg-[#2299cc]/30 disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
          >
            {running ? 'Running…' : 'Upload & Run'}
          </button>
          <button
            onClick={paused ? resume : pause}
            disabled={!running}
            className="text-[10px] px-2 py-1.5 rounded bg-[#ffcc33]/20 text-[#ffcc33] hover:bg-[#ffcc33]/30 disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={stopWorker}
            disabled={!running}
            className="flex-1 text-[10px] py-1.5 rounded bg-white/[0.06] text-white/40 hover:bg-white/[0.10] disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
          >
            Stop
          </button>
        </div>
      )}

      {running && (
        <p className="text-[9px] text-white/50">
          Cycles: {formatCycles(cycleCount)}
        </p>
      )}

      {/* Serial monitor */}
      <div className="space-y-1.5 relative">
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-white/25 uppercase tracking-widest">Serial Monitor</p>
          <button
            onClick={clearSerialOutput}
            className="text-[9px] px-2 py-1 rounded bg-white/[0.07] text-white/40 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
          >
            Clear
          </button>
        </div>
        <pre
          ref={serialRef}
          className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 h-40 overflow-y-auto font-mono text-xs text-green-400 whitespace-pre-wrap"
          onScroll={handleScroll}
        >
          {serialOutput.length > 0
            ? serialOutput
            : 'No serial output yet. Upload a sketch with Serial.print().'}
        </pre>
        {userScrolled && (
          <button
            type="button"
            onClick={() => {
              setUserScrolled(false);
              if (serialRef.current) serialRef.current.scrollTop = serialRef.current.scrollHeight;
            }}
            className="absolute bottom-2 right-2 bg-white/10 hover:bg-white/20 text-white/60 text-[10px] px-1.5 py-0.5 rounded"
          >
            ↓ latest
          </button>
        )}
      </div>
    </div>
  );
}
