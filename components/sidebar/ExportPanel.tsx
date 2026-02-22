'use client';

import { useMemo } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { exportSPICE } from '@/features/export/exportNetlist';

export default function ExportPanel() {
  const nodes = useCircuitStore((state) => state.nodes);
  const components = useCircuitStore((state) => state.components);
  const wires = useCircuitStore((state) => state.wires);

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

  return (
    <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
      <p className="text-[11px] font-semibold text-white/60">Export .cir</p>

      <button
        onClick={onExport}
        className="w-full text-[10px] py-1.5 rounded bg-[#22cc66]/20 text-[#22cc66] hover:bg-[#22cc66]/30 transition-colors"
      >
        Export .cir
      </button>

      <textarea
        value={spiceText}
        readOnly
        rows={6}
        className="w-full rounded bg-black/30 border border-white/[0.08] px-2 py-1.5 text-[10px] leading-5 text-[#9fe7a3] font-mono resize-none overflow-y-auto h-[8.25rem]"
      />
    </div>
  );
}

