'use client';

import { useMemo, useRef, type ChangeEvent } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { exportSPICE } from '@/features/export/exportNetlist';

export default function ExportPanel() {
  const nodes = useCircuitStore((state) => state.nodes);
  const components = useCircuitStore((state) => state.components);
  const wires = useCircuitStore((state) => state.wires);
  const saveToJSON = useCircuitStore((state) => state.saveToJSON);
  const loadFromJSON = useCircuitStore((state) => state.loadFromJSON);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const spiceText = useMemo(() => {
    return exportSPICE(nodes, components, wires, 'circuit');
  }, [nodes, components, wires]);

  const onExport = () => {
    const blob = new Blob([spiceText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'circuit.cir';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const onSaveJSON = () => {
    const json = saveToJSON();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'circuit.json';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const onLoadJSONClick = () => {
    fileInputRef.current?.click();
  };

  const onLoadJSONFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      loadFromJSON(text);
    } catch (error) {
      console.error('[ExportPanel] Failed to load JSON circuit', error);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
      <p className="text-[11px] font-semibold text-white/60">Export .cir</p>

      <button
        onClick={onExport}
        className="w-full text-[10px] py-1.5 rounded bg-[#22cc66]/20 text-[#22cc66] hover:bg-[#22cc66]/30 transition-colors"
      >
        Export .cir
      </button>
      <button
        onClick={onSaveJSON}
        className="w-full text-[10px] py-1.5 rounded bg-[#1a7cff]/20 text-[#7bb9ff] hover:bg-[#1a7cff]/30 transition-colors"
      >
        Save JSON
      </button>
      <button
        onClick={onLoadJSONClick}
        className="w-full text-[10px] py-1.5 rounded bg-[#a05eff]/20 text-[#d2abff] hover:bg-[#a05eff]/30 transition-colors"
      >
        Load JSON
      </button>

      <input
        type="file"
        accept=".json"
        className="hidden"
        ref={fileInputRef}
        onChange={onLoadJSONFile}
      />

      <textarea
        value={spiceText}
        readOnly
        rows={6}
        className="w-full rounded bg-black/30 border border-white/[0.08] px-2 py-1.5 text-[10px] leading-5 text-[#9fe7a3] font-mono resize-none overflow-y-auto h-[8.25rem]"
      />
    </div>
  );
}
