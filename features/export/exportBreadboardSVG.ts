import type { CircuitNode as BreadboardNode, PlacedComponent, Wire } from '@/types/circuit';

const SCALE = 14;
const MARGIN = 40;
const COLS = 63;
const ROWS = 10;
const CENTER_GAP = 2;
const WIDTH = 1400;
const HEIGHT = 400;
const BOARD_WIDTH = (COLS - 1) * SCALE;
const BACKGROUND = '#1a1a2e';

const COMPONENT_PREFIX: Record<PlacedComponent['type'], string> = {
  led: 'D',
  resistor: 'R',
  capacitor: 'C',
  bjt: 'Q',
  pnp: 'Q',
  timer555: 'U',
  arduino: 'A',
  battery: 'V',
  motor: 'M',
  tactileSwitch: 'SW',
  diode: 'D',
  zener: 'D',
  schottky: 'D',
  mosfet: 'Q',
  opamp: 'U',
  inductor: 'L',
  potentiometer: 'RV',
};

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getNodePos(nodeId: string, nodes: Record<string, BreadboardNode>): { x: number; y: number } | null {
  const mainMatch = /^bb-([a-j])(\d{1,2})$/i.exec(nodeId);
  if (mainMatch) {
    const rowChar = mainMatch[1].toLowerCase();
    const col = Number(mainMatch[2]);
    const row = rowChar.charCodeAt(0) - 'a'.charCodeAt(0);
    if (col < 1 || col > COLS || row < 0 || row >= ROWS) return null;
    const x = MARGIN + (col - 1) * SCALE;
    const y = row < 5 ? MARGIN + row * SCALE : MARGIN + row * SCALE + CENTER_GAP * SCALE;
    return { x, y };
  }

  const railMatch = /^bb-(tp|tn|bp|bn)-(\d{1,2})$/i.exec(nodeId);
  if (!railMatch) return null;

  const rail = railMatch[1].toLowerCase();
  const n = Number(railMatch[2]);
  if (n < 1 || n > COLS) return null;

  const x = MARGIN + (n - 1) * SCALE;
  switch (rail) {
    case 'tp':
      return { x, y: MARGIN - 2 * SCALE };
    case 'tn':
      return { x, y: MARGIN - 1 * SCALE };
    case 'bp':
      return { x, y: MARGIN + 11 * SCALE + CENTER_GAP * SCALE + 1 * SCALE };
    case 'bn':
      return { x, y: MARGIN + 11 * SCALE + CENTER_GAP * SCALE + 2 * SCALE };
    default:
      return null;
  }
}

function formatNumeric(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value / 1_000_000}M`;
  if (abs >= 1_000) return `${value / 1_000}k`;
  if (abs > 0 && abs < 0.001) return `${value * 1_000_000}u`;
  return String(value);
}

function numberOrUndefined(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getComponentValue(component: PlacedComponent): string {
  switch (component.type) {
    case 'resistor': { const r = numberOrUndefined(component.props.resistance); return r != null ? `${formatNumeric(r)}Ω` : ''; }
    case 'capacitor': { const c = numberOrUndefined(component.props.capacitance); return c != null ? `${formatNumeric(c)}uF` : ''; }
    case 'inductor': { const l = numberOrUndefined(component.props.inductance); return l != null ? `${formatNumeric(l)}H` : ''; }
    case 'potentiometer': { const r = numberOrUndefined(component.props.resistance); return r != null ? `${formatNumeric(r)}Ω` : ''; }
    case 'timer555': { const r1 = numberOrUndefined(component.props.r1); return r1 != null ? `R1=${formatNumeric(r1)}Ω` : ''; }
    case 'battery': { const v = numberOrUndefined(component.props.voltage); return v != null ? `${formatNumeric(v)}V` : ''; }
    case 'motor': { const rpm = numberOrUndefined(component.props.rpm); return rpm != null ? `${formatNumeric(rpm)}rpm` : ''; }
    case 'led':
      return typeof component.props.color === 'string' && component.props.color.length > 0 ? component.props.color : '';
    default:
      return '';
  }
}

function getDesignators(components: Record<string, PlacedComponent>): Map<string, string> {
  const counts: Record<string, number> = {};
  const out = new Map<string, string>();

  for (const [id, comp] of Object.entries(components)) {
    const prefix = COMPONENT_PREFIX[comp.type] ?? 'X';
    const next = (counts[prefix] ?? 0) + 1;
    counts[prefix] = next;
    out.set(id, `${prefix}${next}`);
  }

  return out;
}

function getRowLetters(): string[] {
  return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
}

function wireList(wires: Wire[] | Record<string, Wire>): Wire[] {
  return Array.isArray(wires) ? wires : Object.values(wires);
}

export function exportBreadboardSVG(
  nodes: Record<string, BreadboardNode>,
  components: Record<string, PlacedComponent>,
  wires: Wire[] | Record<string, Wire>,
  circuitName: string,
): string {
  const elements: string[] = [];
  const rows = getRowLetters();
  const designators = getDesignators(components);
  const topRailY = MARGIN - 2 * SCALE;
  const topNegY = MARGIN - 1 * SCALE;
  const bottomRailY = MARGIN + 11 * SCALE + CENTER_GAP * SCALE + 1 * SCALE;
  const bottomNegY = MARGIN + 11 * SCALE + CENTER_GAP * SCALE + 2 * SCALE;

  elements.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none">`);
  elements.push(`<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${BACKGROUND}" />`);
  elements.push(`<text x="${MARGIN}" y="24" font-size="14" fill="#cde0ff">${escapeText(circuitName || 'circuit')}</text>`);

  const railHeight = 8;
  const railWidth = BOARD_WIDTH;

  elements.push(`<rect x="${MARGIN}" y="${topRailY - railHeight / 2}" width="${railWidth}" height="${railHeight}" fill="#ff3333" />`);
  elements.push(`<rect x="${MARGIN}" y="${topNegY - railHeight / 2}" width="${railWidth}" height="${railHeight}" fill="#111111" />`);
  elements.push(`<rect x="${MARGIN}" y="${bottomRailY - railHeight / 2}" width="${railWidth}" height="${railHeight}" fill="#ff3333" />`);
  elements.push(`<rect x="${MARGIN}" y="${bottomNegY - railHeight / 2}" width="${railWidth}" height="${railHeight}" fill="#111111" />`);

  for (let col = 1; col <= COLS; col += 1) {
    const x = MARGIN + (col - 1) * SCALE;
    for (let row = 0; row < ROWS; row += 1) {
      const nodeId = `bb-${rows[row]}${col}`;
      if (!nodes[nodeId]) continue;
      const y = row < 5 ? MARGIN + row * SCALE : MARGIN + row * SCALE + CENTER_GAP * SCALE;
      elements.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="#444" />`);
    }
  }

  for (let row = 0; row < ROWS; row += 1) {
    const y = row < 5 ? MARGIN + row * SCALE : MARGIN + row * SCALE + CENTER_GAP * SCALE;
    const labelX = MARGIN - 12;
    elements.push(`<text x="${labelX}" y="${y + 3}" font-size="11" fill="#9ca3af">${rows[row]}</text>`);
  }

  for (let col = 1; col <= COLS; col += 1) {
    if (!(col === 1 || col % 5 === 0 || col === COLS)) continue;
    const x = MARGIN + (col - 1) * SCALE;
    elements.push(`<text x="${x}" y="${MARGIN - 20}" text-anchor="middle" font-size="10" fill="#9ca3af">${col}</text>`);
  }

  const gapY = (MARGIN + 4 * SCALE + MARGIN + 5 * SCALE + CENTER_GAP * SCALE) / 2;
  elements.push(`<line x1="${MARGIN}" y1="${gapY}" x2="${MARGIN + BOARD_WIDTH}" y2="${gapY}" stroke="#888" stroke-width="2" />`);

  for (const [componentId, component] of Object.entries(components)) {
    const anchorNodeId = component.pins[0]?.nodeId;
    if (!anchorNodeId) continue;
    if (!nodes[anchorNodeId]) continue;
    const pos = getNodePos(anchorNodeId, nodes);
    if (!pos) continue;

    const pinCount = Math.max(1, component.pins.length);
    const compWidth = pinCount * 1.5 * SCALE;
    const compHeight = SCALE;
    const designator = designators.get(componentId) ?? `${COMPONENT_PREFIX[component.type] ?? 'X'}?`;
    const value = getComponentValue(component);
    const label = value ? `${designator} ${value}` : designator;
    const rectX = pos.x - compWidth / 2;
    const rectY = pos.y - compHeight / 2;
    elements.push(`<rect x="${rectX}" y="${rectY}" width="${compWidth}" height="${compHeight}" rx="4" fill="#28354d" stroke="#6ea8ff" stroke-width="1" />`);
    elements.push(`<text x="${pos.x}" y="${pos.y + 3}" text-anchor="middle" font-size="9" fill="#f0f4ff">${escapeText(label)}</text>`);
  }

  for (const wire of wireList(wires)) {
    if (!wire?.fromNodeId || !wire?.toNodeId) continue;
    const from = getNodePos(wire.fromNodeId, nodes);
    const to = getNodePos(wire.toNodeId, nodes);
    if (!from || !to) continue;

    const stroke = wire.color || '#88aaff';
    elements.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="2" />`);
  }

  elements.push('</svg>');
  return `${elements.join('\n')}\n`;
}
