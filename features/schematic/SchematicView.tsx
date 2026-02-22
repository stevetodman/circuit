'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, WheelEvent } from 'react';
import type { CircuitNode, PlacedComponent } from '@/types/circuit';
import { useCircuitStore } from '@/store/circuitStore';
import { useSchematicStore } from '@/store/schematicStore';
import { layoutSchematic, type SchematicPos } from '@/features/schematic/SchematicLayout';
import {
  BJTSymbol,
  BatterySymbol,
  CapacitorSymbol,
  MotorSymbol,
  GenericSymbol,
  LEDSymbol,
  ResistorSymbol,
  DiodeSymbol,
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
    case 'bjt':
      return <BJTSymbol x={x} y={y} selected={selected} />;
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
  const open = useSchematicStore((s) => s.open);
  const [layout, setLayout] = useState<Map<string, SchematicPos>>(new Map());
  const [computing, setComputing] = useState(false);
  const [viewBox, setViewBox] = useState<ViewBox>(BASE_VIEW);
  const [panning, setPanning] = useState<{ x: number; y: number; box: ViewBox } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

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

  useEffect(() => {
    if (!isVisible) return;

    setComputing(true);
    const timer = setTimeout(() => {
      void (async () => {
        const next = await layoutSchematic(components, wires, nodes);
        setLayout(next);
        setViewBox(fitViewBox(next));
        setComputing(false);
      })();
    }, 200);

    return () => clearTimeout(timer);
  }, [components, wires, nodes, isVisible, fitViewBox]);

  const componentList = useMemo(() => Object.values(components), [components]);

  const terminals = useMemo(() => {
    const points: TerminalPoint[] = [];

    for (const component of componentList) {
      const pos = layout.get(component.id);
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

  if (!isVisible) return null;

  if (componentList.length === 0) {
    return (
      <div className="absolute inset-0 z-20 bg-[#04050b] flex items-center justify-center">
        <p className="text-white/20 text-sm font-mono select-none">Place components to see schematic</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20">
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

          {componentList.map((component) => {
            const pos = layout.get(component.id);
            if (!pos) return null;
            const selected = selectedComponentId === component.id;
            const cx = pos.x + pos.w / 2;
            const cy = pos.y + pos.h / 2;
            return (
              <g
                key={component.id}
                data-role="schematic-node"
                onClick={(event: MouseEvent<SVGGElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectComponent(selected ? null : component.id);
                }}
                onPointerDown={(event: PointerEvent<SVGGElement>) => event.stopPropagation()}
              >
                {symbolNode(component.type, cx, cy, selected)}
                {selected && (
                  <g transform={`translate(${cx}, ${cy})`}>
                    <circle r={Math.max(pos.w, pos.h) / 2 + 6} fill="none" stroke="#7ef0ff" strokeWidth={2.4} opacity={0.65} />
                  </g>
                )}
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
