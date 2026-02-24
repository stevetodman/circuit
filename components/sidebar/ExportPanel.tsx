'use client';

import { useMemo, useRef, type ChangeEvent } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { exportSPICE } from '@/features/export/exportNetlist';
import { exportBreadboardSVG } from '@/features/export/exportBreadboardSVG';
import { buildBOM, exportBOMAsCSV } from '@/features/export/exportBOM';
import { useToastStore } from '@/store/toastStore';
import { CIRCUIT_NAME_PARAM, CIRCUIT_URL_PARAM, compressCircuit } from '@/features/sharing/circuitUrl';

type ExportPanelProps = {
  showNetlist: boolean;
  onToggleNetlist: () => void;
};

function safeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'circuit';
  return trimmed.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '-').slice(0, 64) || 'circuit';
}

export default function ExportPanel({ showNetlist, onToggleNetlist }: ExportPanelProps) {
  const nodes = useCircuitStore((state) => state.nodes);
  const components = useCircuitStore((state) => state.components);
  const wires = useCircuitStore((state) => state.wires);
  const circuitName = useCircuitStore((state) => state.circuitName);
  const getDesignator = useCircuitStore((state) => state.getDesignator);
  const saveToJSON = useCircuitStore((state) => state.saveToJSON);
  const loadFromJSON = useCircuitStore((state) => state.loadFromJSON);
  const addToast = useToastStore((state) => state.addToast);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bomRows = buildBOM(components, getDesignator);
  const totalComponents = Object.keys(components).length;

  const spiceText = useMemo(() => {
    return exportSPICE(nodes, components, wires, 'circuit');
  }, [nodes, components, wires]);

  const onExport = () => {
    const blob = new Blob([spiceText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${safeFilename(circuitName)}.cir`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const onExportSVG = () => {
    const svg = exportBreadboardSVG(nodes, components, wires, circuitName);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${safeFilename(circuitName)}-layout.svg`;
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
    anchor.download = `${safeFilename(circuitName)}.json`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const onLoadJSONClick = () => {
    fileInputRef.current?.click();
  };

  const onCopyLink = async () => {
    const json = saveToJSON();
    try {
      const encoded = await compressCircuit(json);
      const name = circuitName.trim();
      const nameParam = name ? `&${CIRCUIT_NAME_PARAM}=${encodeURIComponent(name)}` : '';
      const url = `${window.location.origin}${window.location.pathname}?${CIRCUIT_URL_PARAM}=${encoded}${nameParam}`;
      await navigator.clipboard.writeText(url);
      addToast('Circuit link copied to clipboard!', 'info');
    } catch {
      addToast('Failed to copy link', 'error');
    }
  };

  const onLoadJSONFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        addToast('Not a JSON file', 'error');
        return;
      }
      const text = await file.text();
      const before = Object.keys(useCircuitStore.getState().components).length;
      loadFromJSON(text);
      const after = Object.keys(useCircuitStore.getState().components).length;
      if (before === after && text.length > 10) {
        addToast('Invalid circuit JSON — check the file format', 'error');
      }
    } catch (error) {
      console.error('[ExportPanel] Failed to load JSON circuit', error);
      addToast('Failed to read file', 'error');
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
        onClick={onExportSVG}
        className="w-full text-[10px] py-1.5 rounded bg-[#ff6b6b]/15 text-[#ffaaaa] hover:bg-[#ff6b6b]/25 transition-colors"
      >
        Download SVG layout
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
      <button
        onClick={onCopyLink}
        className="w-full text-[10px] py-1.5 rounded bg-[#ff9500]/15 text-[#ffb84d] hover:bg-[#ff9500]/25 transition-colors"
      >
        🔗 Copy link
      </button>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Bill of Materials</p>
          {bomRows.length > 0 && (
            <button
              className="text-[10px] text-[#7c6fff] hover:text-[#a89fff]"
              onClick={() => exportBOMAsCSV(bomRows, circuitName)}
            >
              Download CSV
            </button>
          )}
        </div>
        {bomRows.length === 0 ? (
          <p className="text-[11px] text-white/20">No components</p>
        ) : (
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-white/25">
                <th className="text-left py-0.5 pr-2">Ref</th>
                <th className="text-left py-0.5 pr-2">Type</th>
                <th className="text-left py-0.5 pr-2">Value</th>
                <th className="text-right py-0.5">Qty</th>
              </tr>
            </thead>
            <tbody>
              {bomRows.map((row) => (
                <tr key={`${row.type}-${row.value}`} className="border-t border-white/5 text-white/50">
                  <td className="py-0.5 pr-2 text-white/30 text-[9px]">{row.designators.slice(0, 3).join(', ')}{row.designators.length > 3 ? '…' : ''}</td>
                  <td className="py-0.5 pr-2">{row.type}</td>
                  <td className="py-0.5 pr-2 font-mono">{row.value}</td>
                  <td className="py-0.5 text-right">{row.count}</td>
                </tr>
              ))}
              <tr className="border-t border-white/10 text-white/30 text-[9px]">
                <td colSpan={3} className="pt-1">Total</td>
                <td className="pt-1 text-right">{totalComponents}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleNetlist}
        className="text-left text-[10px] px-1.5 text-white/45 hover:text-white/75 underline underline-offset-2"
      >
        {showNetlist ? 'Hide netlist' : 'Show netlist'}
      </button>

      <input
        type="file"
        accept=".json"
        className="hidden"
        ref={fileInputRef}
        onChange={onLoadJSONFile}
      />

      {showNetlist && (
        <textarea
          value={spiceText}
          readOnly
          rows={6}
          className="w-full rounded bg-black/30 border border-white/[0.08] px-2 py-1.5 text-[10px] leading-5 text-[#9fe7a3] font-mono resize-none overflow-y-auto h-[8.25rem]"
        />
      )}
    </div>
  );
}
