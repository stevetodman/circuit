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
  const { hoveredNodeId, mouseX, mouseY } = useUIStore((s) => ({
    hoveredNodeId: s.hoveredNodeId,
    mouseX: s.mouseX,
    mouseY: s.mouseY,
  }));
  const nodes = useCircuitStore((s) => s.nodes);

  if (!hoveredNodeId) return null;

  const node = nodes[hoveredNodeId];
  if (!node || node.netId == null) return null;

  const voltage = voltageView[node.netId] ?? 0;
  const label = formatVoltage(voltage);

  return (
    <div
      style={{ left: mouseX + 12, top: mouseY - 28 }}
      className="fixed z-50 pointer-events-none
                 bg-[#1a1a2e] border border-white/20 rounded px-2 py-1
                 text-xs text-white/90 font-mono shadow-lg"
    >
      {label}
      <span className="text-white/40 ml-1.5">{hoveredNodeId}</span>
    </div>
  );
}

