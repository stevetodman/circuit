'use client';

import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { voltageView } from '@/simulation/SimBridge';

function formatVoltage(v: number): string {
  const abs = Math.abs(v);
  if (abs < 0.001) return '0 V';
  if (abs < 1) return `${(v * 1000).toFixed(0)} mV`;
  return `${v.toFixed(2)} V`;
}

export default function PinTooltip() {
  const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
  const mouseX = useUIStore((s) => s.mouseX);
  const mouseY = useUIStore((s) => s.mouseY);
  const nodes = useCircuitStore((s) => s.nodes);

  if (!hoveredNodeId) return null;

  const node = nodes[hoveredNodeId];
  if (!node) return null;

  const connected = node.netId != null;
  const voltage = connected ? (voltageView[node.netId!] ?? 0) : null;

  return (
    <div
      style={{ left: mouseX + 14, top: mouseY - 32 }}
      className="fixed z-50 pointer-events-none animate-in fade-in duration-100
                 bg-[#1a1a2e]/95 border border-white/15 rounded-md px-2.5 py-1.5
                 text-xs shadow-xl backdrop-blur-sm"
    >
      <span className="font-mono text-white/50">{hoveredNodeId}</span>
      {connected ? (
        <>
          <span className="text-white/25 mx-1.5">·</span>
          <span className="text-white/40">Net {node.netId}</span>
          <span className="text-white/25 mx-1.5">·</span>
          <span className="text-[#7dffb3] font-semibold">{formatVoltage(voltage!)}</span>
        </>
      ) : (
        <>
          <span className="text-white/25 mx-1.5">·</span>
          <span className="text-white/30 italic">unconnected</span>
        </>
      )}
    </div>
  );
}
