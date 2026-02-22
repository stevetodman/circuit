'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, WheelEvent } from 'react';
import type { CircuitNode, PlacedComponent } from '@/types/circuit';
import { useCircuitStore } from '@/store/circuitStore';
import { useSchematicStore } from '@/store/schematicStore';
import { layoutSchematic, type SchematicPos } from '@/features/schematic/SchematicLayout';
import {
  BJTSymbol,
  PNPSymbol,
  BatterySymbol,
  CapacitorSymbol,
  MotorSymbol,
  GenericSymbol,
  LEDSymbol,
  ResistorSymbol,
  DiodeSymbol,
  ZenerDiodeSymbol,
  SchottkyDiodeSymbol,
  MOSFETSymbol,
  OpAmpSymbol,
  InductorSymbol,
  PotentiometerSymbol,
  getSymbolSize,
  getSymbolTerminalOffset,
  hasSymbolTerminalOffset,
  TactileSwitchSymbol,
  Timer555Symbol,
  ArduinoSymbol,
  symbolForTypeName,
} from './symbols';

interface SchematicViewProps {
  visible: boolean;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  startSVGX: number;
  startSVGY: number;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TerminalPoint {
  componentId: string;
  pinName: string;
  nodeId: string;
  netId: number | null;
  x: number;
  y: number;
}

interface WireSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const BASE_VIEW: ViewBox = { x: -260, y: -200, w: 520, h: 420 };

function engVal(v: number, unit: string): string {
  const a = Math.abs(v);
  if (unit === 'Ω') {
    if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}MΩ`;
    if (a >= 1_000) return `${(v / 1_000).toFixed(1)}kΩ`;
    return `${v.toFixed(0)}Ω`;
  }
  if (unit === 'F') {
    if (a >= 1e-3) return `${(v * 1_000).toFixed(1)}mF`;
    if (a >= 1e-6) return `${(v * 1_000_000).toFixed(0)}µF`;
    if (a >= 1e-9) return `${(v * 1e9).toFixed(0)}nF`;
    return `${(v * 1e12).toFixed(0)}pF`;
  }
  if (unit === 'H') {
    if (a >= 1) return `${v.toFixed(1)}H`;
    if (a >= 1e-3) return `${(v * 1_000).toFixed(1)}mH`;
    return `${(v * 1e6).toFixed(0)}µH`;
  }
  return `${v}${unit}`;
}

function componentValueLabel(component: PlacedComponent): string {
  const p = component.props as Record<string, number | string>;
  switch (component.type) {
    case 'resistor':
      return engVal(typeof p.resistance === 'number' ? p.resistance : 1000, 'Ω');
    case 'battery':
      return `${typeof p.voltage === 'number' ? p.voltage : 9}V`;
    case 'capacitor': {
      // PropertiesInspector stores capacitance in µF (default 1 = 1 µF)
      const cUF = typeof p.capacitance === 'number' ? p.capacitance : 1;
      if (cUF < 0.001) return `${(cUF * 1000).toFixed(1)}nF`;
      if (cUF < 1) return `${(cUF * 1000).toFixed(0)}nF`;
      return `${cUF % 1 === 0 ? cUF.toFixed(0) : cUF.toFixed(1)}µF`;
    }
    case 'inductor':
      return engVal(typeof p.inductance === 'number' ? p.inductance : 1e-3, 'H');
    case 'potentiometer': {
      const r = engVal(typeof p.resistance === 'number' ? p.resistance : 10_000, 'Ω');
      const w = typeof p.wiper === 'number' ? Math.round(p.wiper * 100) : 50;
      return `${r} ${w}%`;
    }
    case 'led':
      return `Vf=${typeof p.forwardVoltage === 'number' ? p.forwardVoltage.toFixed(1) : '2.0'}V`;
    case 'diode':
      return `Vf=${typeof p.forwardVoltage === 'number' ? p.forwardVoltage.toFixed(2) : '0.7'}V`;
    case 'schottky':
      return `Vf=${typeof p.forwardVoltage === 'number' ? p.forwardVoltage.toFixed(2) : '0.30'}V`;
    case 'zener':
      return `Vz=${typeof p.breakdownVoltage === 'number' ? p.breakdownVoltage.toFixed(1) : '5.1'}V`;
    case 'bjt':
    case 'pnp':
      return `β=${typeof p.hFE === 'number' ? p.hFE : 100}`;
    case 'mosfet':
      return `Rds=${typeof p.rdsOn === 'number' ? `${p.rdsOn.toFixed(2)}Ω` : '0.1Ω'}`;
    case 'timer555': {
      const r1 = typeof p.r1 === 'number' ? p.r1 : 1000;
      const r2 = typeof p.r2 === 'number' ? p.r2 : 1000;
      const c = typeof p.capacitance === 'number' ? p.capacitance * 1e-6 : 1e-6;
      const freq = 1.44 / ((r1 + 2 * r2) * c);
      return freq >= 1000 ? `${(freq / 1000).toFixed(1)}kHz` : `${freq.toFixed(1)}Hz`;
    }
    case 'motor':
      return `Ra=${engVal(typeof p.resistance === 'number' ? p.resistance : 10, 'Ω')}`;
    case 'tactileSwitch':
      return p.closed ? 'ON' : 'OFF';
    default:
      return '';
  }
}

function colorForKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 42%, 50%)`;
}

function fallbackPinOffset(
  index: number,
  total: number,
  size: { width: number; height: number },
): [number, number] {
  if (total <= 1) return [size.width / 2 + 2, 0];
  const leftCount = Math.floor(total / 2);
  const leftSide = index < leftCount;
  const sideTotal = leftSide ? leftCount : total - leftCount;
  const localIndex = leftSide ? index : index - leftCount;
  const x = leftSide ? -(size.width / 2 + 2) : size.width / 2 + 2;
  const y = sideTotal <= 1 ? 0 : -size.height * 0.34 + (localIndex * (size.height * 0.68)) / (sideTotal - 1);
  return [x, y];
}

function symbolNode(
  type: PlacedComponent['type'],
  x: number,
  y: number,
  selected: boolean,
  props?: Record<string, number | string>,
) {
  const size = getSymbolSize(type);
  switch (type) {
    case 'resistor':
      return <ResistorSymbol x={x} y={y} selected={selected} />;
    case 'led':
      return <LEDSymbol x={x} y={y} selected={selected} />;
    case 'battery':
      return <BatterySymbol x={x} y={y} selected={selected} />;
    case 'capacitor':
      return <CapacitorSymbol x={x} y={y} selected={selected} />;
    case 'diode':
      return <DiodeSymbol x={x} y={y} selected={selected} />;
    case 'zener':
      return <ZenerDiodeSymbol x={x} y={y} selected={selected} />;
    case 'schottky':
      return <SchottkyDiodeSymbol x={x} y={y} selected={selected} />;
    case 'bjt':
      return <BJTSymbol x={x} y={y} selected={selected} />;
    case 'pnp':
      return <PNPSymbol x={x} y={y} selected={selected} />;
    case 'mosfet':
      return <MOSFETSymbol x={x} y={y} selected={selected} />;
    case 'opamp':
      return <OpAmpSymbol x={x} y={y} selected={selected} />;
    case 'inductor':
      return <InductorSymbol x={x} y={y} selected={selected} />;
    case 'potentiometer':
      return <PotentiometerSymbol x={x} y={y} selected={selected} />;
    case 'timer555':
      return (
        <Timer555Symbol
          x={x - size.width / 2}
          y={y - size.height / 2}
          w={size.width}
          h={size.height}
          selected={selected}
        />
      );
    case 'motor':
      return (
        <MotorSymbol
          x={x - size.width / 2}
          y={y - size.height / 2}
          w={size.width}
          h={size.height}
          selected={selected}
          valueLabel={engVal(typeof props?.resistance === 'number' ? props.resistance : 10, 'Ω')}
        />
      );
    case 'arduino':
      return (
        <ArduinoSymbol
          x={x - size.width / 2}
          y={y - size.height / 2}
          w={size.width}
          h={size.height}
          selected={selected}
        />
      );
    case 'tactileSwitch':
      return (
        <TactileSwitchSymbol
          x={x - size.width / 2}
          y={y - size.height / 2}
          w={size.width}
          h={size.height}
          selected={selected}
          closed={props?.closed === 1}
        />
      );
    default:
      return <GenericSymbol x={x} y={y} selected={selected} label={symbolForTypeName(type)} />;
  }
}

export default function SchematicView({ visible }: SchematicViewProps) {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const nodes = useCircuitStore((s) => s.nodes);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const getDesignator = useCircuitStore((s) => s.getDesignator);
  const open = useSchematicStore((s) => s.open);
  const closeSchematic = useSchematicStore((s) => s.toggle);
  const manualPositions = useSchematicStore((s) => s.manualPositions);
  const setManualPosition = useSchematicStore((s) => s.setManualPosition);
  const clearManualPositions = useSchematicStore((s) => s.clearManualPositions);
  const [layout, setLayout] = useState<Map<string, SchematicPos>>(new Map());
  const [computing, setComputing] = useState(false);
  const [viewBox, setViewBox] = useState<ViewBox>(BASE_VIEW);
  const [panning, setPanning] = useState<{ x: number; y: number; box: ViewBox } | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const manualPositionsRef = useRef(manualPositions);

  manualPositionsRef.current = manualPositions;

  const isVisible = visible && open;

  const fitViewBox = useCallback((next: Map<string, SchematicPos>): ViewBox => {
    if (!next.size) return BASE_VIEW;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const item of next.values()) {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.w);
      maxY = Math.max(maxY, item.y + item.h);
    }

    const padding = 70;
    return {
      x: minX - padding,
      y: minY - padding,
      w: Math.max(120, maxX - minX + padding * 2),
      h: Math.max(120, maxY - minY + padding * 2),
    };
  }, []);

  const getSvgCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * viewBox.w + viewBox.x,
        y: ((clientY - rect.top) / rect.height) * viewBox.h + viewBox.y,
      };
    },
    [viewBox],
  );

  const rerunLayout = useCallback(
    async (positions: Record<string, { x: number; y: number }> = manualPositionsRef.current) => {
      setComputing(true);
      const next = await layoutSchematic(components, wires, nodes, positions, () => clearManualPositions());
      setLayout(next);
      setViewBox(fitViewBox(next));
      setComputing(false);
    },
    [components, wires, nodes, fitViewBox, clearManualPositions],
  );

  const onResetLayout = useCallback(() => {
    clearManualPositions();
    void rerunLayout({});
  }, [clearManualPositions, rerunLayout]);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      void rerunLayout(manualPositionsRef.current);
    }, 200);

    return () => clearTimeout(timer);
  }, [components, wires, nodes, isVisible, rerunLayout]);

  const componentList = useMemo(() => Object.values(components), [components]);

  const renderedLayout = useMemo(() => {
    const next = new Map(layout);
    for (const [id, position] of Object.entries(manualPositions)) {
      const base = next.get(id);
      if (!base) continue;
      next.set(id, { ...base, x: position.x, y: position.y });
    }
    return next;
  }, [layout, manualPositions]);

  const orderedComponents = useMemo(() => {
    if (!dragging) return componentList;
    const list = [...componentList];
    const draggedIdx = list.findIndex((component) => component.id === dragging.id);
    if (draggedIdx === -1) return list;
    const [active] = list.splice(draggedIdx, 1);
    list.push(active);
    return list;
  }, [componentList, dragging?.id]);

  const terminals = useMemo(() => {
    const points: TerminalPoint[] = [];

    for (const component of componentList) {
      const pos = renderedLayout.get(component.id);
      if (!pos) continue;
      const centerX = pos.x + pos.w / 2;
      const centerY = pos.y + pos.h / 2;
      const size = getSymbolSize(component.type);
      const terminalOffsets = component.pins.map((pin, index) => {
        const hasNamed = hasSymbolTerminalOffset(component.type, pin.name);
        const rawOffset = hasNamed
          ? getSymbolTerminalOffset(component.type, pin.name)
          : fallbackPinOffset(index, component.pins.length, size);
        return rawOffset;
      });

      component.pins.forEach((pin, index) => {
        const node = nodes[pin.nodeId] as CircuitNode | undefined;
        const [dx, dy] = terminalOffsets[index] ?? [0, 0];
        points.push({
          componentId: component.id,
          pinName: pin.name,
          nodeId: pin.nodeId,
          netId: node?.netId ?? null,
          x: centerX + dx,
          y: centerY + dy,
        });
      });
    }

    return points;
  }, [componentList, layout, nodes]);

  const wireSegments = useMemo(() => {
    const byNet = new Map<string, TerminalPoint[]>();

    for (const point of terminals) {
      const key = point.netId == null ? `n:${point.nodeId}` : `net:${point.netId}`;
      const group = byNet.get(key) ?? [];
      group.push(point);
      byNet.set(key, group);
    }

    const segments: WireSegment[] = [];

    for (const [key, group] of byNet.entries()) {
      if (group.length < 2) continue;

      const unique: TerminalPoint[] = [];
      const seen = new Set<string>();
      for (const item of group) {
        const id = `${item.componentId}::${item.pinName}`;
        if (seen.has(id)) continue;
        seen.add(id);
        unique.push(item);
      }

      for (let i = 1; i < unique.length; i++) {
        const a = unique[i - 1];
        const b = unique[i];
        if (a.componentId === b.componentId && a.pinName === b.pinName) continue;
        segments.push({
          id: `${key}-${a.componentId}-${b.componentId}-${a.pinName}-${b.pinName}`,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          color: colorForKey(key),
        });
      }
    }

    return segments;
  }, [terminals]);

  const onWheel = useCallback(
    (event: WheelEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      event.preventDefault();

      const rect = svg.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
      const localY = ((event.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;

      const zoomIn = event.deltaY < 0;
      const scale = zoomIn ? 0.86 : 1.16;

      setViewBox((current) => ({
        x: localX - (localX - current.x) * scale,
        y: localY - (localY - current.y) * scale,
        w: current.w * scale,
        h: current.h * scale,
      }));
    },
    [viewBox],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || event.pointerType === 'touch') return;
      const svg = svgRef.current;
      if (!svg) return;
      setPanning({
        x: event.clientX,
        y: event.clientY,
        box: { ...viewBox },
      });
      svg.setPointerCapture(event.pointerId);
    },
    [viewBox],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!panning || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((event.clientX - panning.x) / rect.width) * panning.box.w;
      const dy = ((event.clientY - panning.y) / rect.height) * panning.box.h;

      setViewBox({
        x: panning.box.x - dx,
        y: panning.box.y - dy,
        w: panning.box.w,
        h: panning.box.h,
      });
    },
    [panning],
  );

  const onPointerUp = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.releasePointerCapture(event.pointerId);
    setPanning(null);
  }, []);

  const onMouseMoveDrag = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const point = getSvgCoordinates(event.clientX, event.clientY);
      if (!point) return;

      const dx = point.x - dragging.startSVGX;
      const dy = point.y - dragging.startSVGY;
      setManualPosition(dragging.id, dragging.startX + dx, dragging.startY + dy);
    },
    [dragging, getSvgCoordinates, setManualPosition],
  );

  const onMouseUpDrag = useCallback(() => {
    setDragging(null);
  }, []);

  if (!isVisible) return null;
  const svgCursor = dragging ? 'grabbing' : hoveredComponentId ? 'grab' : 'default';

  if (componentList.length === 0) {
    return (
      <div className="absolute inset-0 z-20 bg-[#04050b] flex items-center justify-center">
        <p className="text-white/20 text-sm font-mono select-none">Place components to see schematic</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20">
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={closeSchematic}
          className="rounded bg-black/65 px-2 py-1 text-[11px] font-mono text-white/85 border border-white/15 hover:text-white"
          title="Close schematic"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onResetLayout}
          className="rounded bg-black/65 px-2 py-1 text-[11px] font-mono text-white/85 border border-white/15 hover:text-white"
          title="Reset layout"
        >
          Reset Layout
        </button>
      </div>
      <svg
        ref={svgRef}
        className="w-full h-full bg-[#04050b]"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onMouseMove={onMouseMoveDrag}
        onMouseUp={onMouseUpDrag}
        onMouseLeave={onMouseUpDrag}
        style={{ cursor: svgCursor }}
      >
        <g>
          <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="#06080f" />

          {wireSegments.map((segment) => (
            <polyline
              key={segment.id}
              points={`${segment.x1},${segment.y1} ${segment.x2},${segment.y2}`}
              fill="none"
              stroke={segment.color}
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {orderedComponents.map((component) => {
            const pos = renderedLayout.get(component.id);
            if (!pos) return null;
            const selected = selectedComponentId === component.id;
            const cx = pos.x + pos.w / 2;
            const cy = pos.y + pos.h / 2;
            const isDragging = dragging?.id === component.id;
            const isHovered = hoveredComponentId === component.id;
            const showHandle = isDragging || isHovered;
            return (
              <g
                key={component.id}
                data-role="schematic-node"
                style={{ cursor: isDragging ? 'grabbing' : isHovered ? 'grab' : 'default' }}
                onClick={(event: MouseEvent<SVGGElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectComponent(selected ? null : component.id);
                }}
                onPointerDown={(event: PointerEvent<SVGGElement>) => event.stopPropagation()}
                onMouseEnter={() => setHoveredComponentId(component.id)}
                onMouseLeave={() => {
                  setHoveredComponentId((current) => (current === component.id ? null : current));
                }}
                onMouseDown={(event: MouseEvent<SVGGElement>) => {
                  if (event.button !== 0) return;
                  const point = getSvgCoordinates(event.clientX, event.clientY);
                  if (!point) return;
                  event.stopPropagation();
                  event.preventDefault();
                  setDragging({
                    id: component.id,
                    startX: pos.x,
                    startY: pos.y,
                    startSVGX: point.x,
                    startSVGY: point.y,
                  });
                }}
              >
                {symbolNode(component.type, cx, cy, selected, component.props as Record<string, number | string>)}
                <text
                  x={pos.x + 6}
                  y={pos.y + 12}
                  fontSize={12}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={600}
                  fill={selected ? '#7ef0ff' : 'rgba(255,255,255,0.72)'}
                  opacity={showHandle ? 0.7 : 0}
                  pointerEvents="none"
                >
                  ⠿
                </text>
                {selected && (
                  <g transform={`translate(${cx}, ${cy})`}>
                    <circle r={Math.max(pos.w, pos.h) / 2 + 6} fill="none" stroke="#7ef0ff" strokeWidth={2.4} opacity={0.65} />
                  </g>
                )}
                {/* Designator label above symbol (R1, C2, …) */}
                <text
                  x={cx}
                  y={pos.y - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fill={selected ? '#7ef0ff' : 'rgba(255,255,255,0.25)'}
                >
                  {getDesignator(component.id)}
                </text>
                {/* Value label below symbol (470Ω, 9V, …) */}
                {(() => {
                  const label = componentValueLabel(component);
                  if (!label) return null;
                  return (
                    <text
                      x={cx}
                      y={pos.y + pos.h + 14}
                      textAnchor="middle"
                      fontSize={11}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill={selected ? '#7ef0ff' : 'rgba(255,255,255,0.38)'}
                    >
                      {label}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>
      {computing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/35 text-[12px] font-mono text-white/85">
          <span>Computing layout…</span>
        </div>
      )}
    </div>
  );
}
