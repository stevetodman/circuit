'use client';

import { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import { useUIStore } from '@/store/uiStore';
import { voltages, branchCurrents } from '@/simulation/SimBridge';
import { buildNetlist } from '@/simulation/mna/NetlistBuilder';
import type { PlacedComponent } from '@/types/circuit';

type ComponentValue = Record<string, unknown>;

function formatVal(type: string, props: ComponentValue): string {
  switch (type) {
    case 'resistor': {
      const r = Number(props.resistance ?? 220);
      if (r >= 1e6) return `${(r / 1e6).toFixed(1)}MΩ`;
      if (r >= 1e3) return `${(r / 1e3).toFixed(r % 1000 === 0 ? 0 : 1)}kΩ`;
      return `${r}Ω`;
    }
    case 'capacitor': {
      const c = Number(props.capacitance ?? 1e-4);
      if (c >= 1e-3) return `${(c * 1e3).toFixed(0)}mF`;
      if (c >= 1e-6) return `${(c * 1e6).toFixed(0)}µF`;
      return `${(c * 1e9).toFixed(0)}nF`;
    }
    case 'battery': return `${Number(props.voltage ?? 9)}V`;
    case 'voltageRegulator': return `${Number(props.voltage ?? 5)}V`;
    case 'led': return (props.color as string) ?? '#ff0000';
    case 'inductor': {
      const l = Number(props.inductance ?? 0.001);
      if (l >= 1) return `${l.toFixed(1)}H`;
      if (l >= 0.001) return `${(l * 1000).toFixed(0)}mH`;
      return `${(l * 1e6).toFixed(0)}µH`;
    }
    default: return type;
  }
}

function formatVoltage(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1) return `${v.toFixed(2)}V`;
  if (abs >= 0.001) return `${(v * 1000).toFixed(0)}mV`;
  return `${(v * 1_000_000).toFixed(0)}µV`;
}

function formatCurrent(a: number): string {
  const abs = Math.abs(a);
  if (abs >= 1) return `${a.toFixed(2)} A`;
  if (abs >= 0.001) return `${(a * 1000).toFixed(1)} mA`;
  if (abs >= 0.000001) return `${(a * 1_000_000).toFixed(0)} µA`;
  return `${(a * 1_000_000_000).toFixed(1)} nA`;
}

function formatPower(p: number): string {
  const abs = Math.abs(p);
  if (abs >= 1) return `${p.toFixed(2)} W`;
  if (abs >= 0.001) return `${(p * 1000).toFixed(2)} mW`;
  return `${(p * 1_000_000).toFixed(0)} µW`;
}

const TYPE_LABEL: Record<string, string> = {
  resistor: 'Resistor',
  capacitor: 'Capacitor',
  inductor: 'Inductor',
  battery: 'Battery',
  led: 'LED',
  diode: 'Diode',
  zener: 'Zener',
  schottky: 'Schottky',
  bjt: 'NPN BJT',
  pnp: 'PNP BJT',
  mosfet: 'MOSFET',
  potentiometer: 'Pot',
  timer555: '555 Timer',
  arduino: 'Arduino',
  opamp: 'Op-Amp',
  motor: 'Motor',
  tactileSwitch: 'Switch',
  voltageRegulator: 'Volt Reg',
};

function buildBranchIndexForComponent(
  componentId: string,
  nodes: ReturnType<typeof useCircuitStore.getState>['nodes'],
  components: ReturnType<typeof useCircuitStore.getState>['components'],
  wires: ReturnType<typeof useCircuitStore.getState>['wires'],
): number | null {
  let netlist;
  try {
    netlist = buildNetlist(nodes, components, wires);
  } catch {
    return null;
  }

  const branchKinds = new Set(['resistor', 'motor', 'vsource', 'opamp', 'inductor', 'diode']);
  let index = 0;

  for (const element of netlist.elements) {
    if (!branchKinds.has(element.kind)) continue;
    if (
      element.id === componentId ||
      element.id === `${componentId}-a` ||
      element.id === `${componentId}-b`
    ) {
      const current = branchCurrents[index];
      return Number.isFinite(current) ? current : null;
    }
    index += 1;
  }

  return null;
}

export default function ComponentTooltip() {
  const hoveredComponentId = useUIStore((s) => s.hoveredComponentId);
  const hoveredComponentPos = useUIStore((s) => s.hoveredComponentPos);
  const components = useCircuitStore((s) => s.components);
  const nodes = useCircuitStore((s) => s.nodes);
  const wires = useCircuitStore((s) => s.wires);
  const getDesignator = useCircuitStore((s) => s.getDesignator);
  const simStatus = useUIStore((s) => s.simStatus);
  const dragging = useDragStore((s) => s.dragging);
  const wiringMode = useCircuitStore((s) => s.wiringMode);
  const [, forceRefresh] = useState(0);

  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hoveredComponentId && !dragging && !wiringMode) {
      timerRef.current = setTimeout(() => setVisible(true), 300);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hoveredComponentId, dragging, wiringMode]);

  useEffect(() => {
    if (!visible || !hoveredComponentId || dragging || wiringMode || simStatus === 'idle' || simStatus === 'error') {
      return;
    }

    const id = setInterval(() => forceRefresh((value) => value + 1), 100);
    return () => clearInterval(id);
  }, [visible, hoveredComponentId, dragging, wiringMode, simStatus]);

  if (!visible || !hoveredComponentId || !hoveredComponentPos || dragging || wiringMode) return null;

  const comp = components[hoveredComponentId] as PlacedComponent | undefined;
  if (!comp) return null;

  const designator = getDesignator(hoveredComponentId);
  const label = TYPE_LABEL[comp.type] ?? comp.type;
  const val = formatVal(comp.type, comp.props as ComponentValue);

  let liveV: string | null = null;
  let liveI: string | null = null;
  let liveP: string | null = null;

  if (simStatus !== 'idle' && comp.pins.length >= 2) {
    const netA = nodes[comp.pins[0]?.nodeId]?.netId;
    const netB = nodes[comp.pins[1]?.nodeId]?.netId;
    if (netA != null && netB != null) {
      const va = voltages[netA] ?? 0;
      const vb = voltages[netB] ?? 0;
      const vDiff = va - vb;
      liveV = formatVoltage(vDiff);

      const iA = buildBranchIndexForComponent(hoveredComponentId, nodes, components, wires);
      if (iA != null) {
        liveI = formatCurrent(iA);
        liveP = formatPower(vDiff * iA);
      }
    }
  }

  const { x, y } = hoveredComponentPos;
  const left = Math.max(8, Math.min(x + 12, window.innerWidth - 220));
  const top = Math.max(8, y - 14);

  return (
    <div
      className="fixed z-50 pointer-events-none bg-[#18181c]/95 border border-white/15 rounded-lg px-3 py-2 shadow-lg"
      style={{ left, top }}
    >
      <p className="text-[11px] font-semibold text-white">{designator}</p>
      <p className="text-[10px] text-white/50">{label} · {val}</p>
      {liveV && (
        <p className="text-[10px] text-[#7c6fff] mt-0.5">V: {liveV}</p>
      )}
      {liveI && (
        <p className="text-[10px] text-[#6ec4ff] mt-0.5">I: {liveI}</p>
      )}
      {liveP && (
        <p className="text-[10px] text-[#7c6fff] mt-0.5">P: {liveP}</p>
      )}
    </div>
  );
}
