'use client';

/**
 * ArduinoPanel — shown in the sidebar when an Arduino component is selected.
 *
 * Lets the user upload a pre-compiled .hex file.  The Arduino worker is
 * started/stopped here.  GPIO pin→net mapping is derived automatically from
 * the placed Arduino component's PinConnections.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { SAB_TOTAL_BYTES } from '@/types/circuit';
import { init as initSimBridge } from '@/simulation/SimBridge';

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

export default function ArduinoPanel() {
  const selectedId  = useCircuitStore((s) => s.selectedComponentId);
  const components  = useCircuitStore((s) => s.components);
  const nodes       = useCircuitStore((s) => s.nodes);

  const workerRef   = useRef<Worker | null>(null);
  const sabRef      = useRef<SharedArrayBuffer | null>(null);
  const [running,   setRunning]   = useState(false);
  const [hexText,   setHexText]   = useState('');
  const [serialLog, setSerialLog] = useState<string[]>([]);

  // Only show for the placed Arduino component
  const component = selectedId ? components[selectedId] : null;
  if (!component || component.type !== 'arduino') return null;

  // Build pin → SAB index map from component's PinConnections
  const buildPinMap = useCallback((): Record<number, number> => {
    const map: Record<number, number> = {};
    for (const pin of component.pins) {
      const pinNum = PIN_NAME_TO_NUM[pin.name];
      if (pinNum == null) continue;
      const node = nodes[pin.nodeId];
      if (node?.netId != null) map[pinNum] = node.netId;
    }
    return map;
  }, [component.pins, nodes]);

  // Ensure SAB exists
  const ensureSAB = useCallback((): SharedArrayBuffer => {
    if (!sabRef.current) {
      const sab = new SharedArrayBuffer(SAB_TOTAL_BYTES);
      sabRef.current = sab;
      initSimBridge(sab);
    }
    return sabRef.current;
  }, []);

  const uploadAndRun = useCallback((hex: string) => {
    if (workerRef.current) workerRef.current.terminate();

    const sab    = ensureSAB();
    const worker = new Worker(
      new URL('../../simulation/workers/arduino.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, data } = e.data as { type: string; data?: string };
      if (type === 'READY')         setRunning(true);
      if (type === 'SERIAL_OUTPUT') setSerialLog(prev => [...prev.slice(-99), data ?? '']);
      if (type === 'RUNTIME_ERROR') console.error('[Arduino]', data);
    };

    worker.postMessage({ type: 'UPLOAD_HEX', hex, sab });
    worker.postMessage({ type: 'UPDATE_PIN_MAP', pinMap: buildPinMap(), sab });
  }, [buildPinMap, ensureSAB]);

  const stopWorker = useCallback(() => {
    workerRef.current?.postMessage({ type: 'STOP' });
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  }, []);

  // Stop worker on unmount
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => { setHexText(text); });
  };

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
          {hexText && <span className="text-[9px] text-white/30">loaded</span>}
        </label>
      </div>

      {/* Quick blink button */}
      <button
        onClick={() => uploadAndRun(BLINK_HEX)}
        className="w-full text-[10px] py-1.5 rounded bg-[#22cc66]/20 text-[#22cc66] hover:bg-[#22cc66]/30 transition-colors"
      >
        Run Blink (pin 13)
      </button>

      {/* Run / Stop */}
      {hexText && (
        <div className="flex gap-2">
          <button
            onClick={() => uploadAndRun(hexText)}
            disabled={running}
            className="flex-1 text-[10px] py-1.5 rounded bg-[#2299cc]/20 text-[#2299cc] hover:bg-[#2299cc]/30 disabled:opacity-40 transition-colors"
          >
            {running ? 'Running…' : 'Upload & Run'}
          </button>
          <button
            onClick={stopWorker}
            disabled={!running}
            className="flex-1 text-[10px] py-1.5 rounded bg-white/[0.06] text-white/40 hover:bg-white/[0.10] disabled:opacity-40 transition-colors"
          >
            Stop
          </button>
        </div>
      )}

      {/* Serial monitor */}
      {serialLog.length > 0 && (
        <div className="mt-1">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Serial</p>
          <div className="bg-black/40 rounded p-2 h-16 overflow-y-auto font-mono text-[9px] text-[#22cc66]">
            {serialLog.join('')}
          </div>
        </div>
      )}
    </div>
  );
}
