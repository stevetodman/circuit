// Single source of truth for all breadboard geometry constants.
// Import from here — never redefine locally.

export const PITCH = 0.254;        // 2.54 mm → Three.js units (1 unit = 10 mm)
export const CENTER_GAP = 0.508;   // gap between rows e and f
export const GRID_UNIT = PITCH;    // alias used in snap calculations
export const SNAP_THRESHOLD = GRID_UNIT * 0.68; // ~0.173 units — matches Diode
export const COLS = 63;
export const ROWS = 5;             // rows per side (a–e and f–j)
export const BOARD_TOP_Y = 0.15;   // top surface of board (board is 0.30 tall)
export const RAIL_GAP = PITCH * 2; // gap between main grid and power rail
export const RAIL_HOLES = 25;      // holes per power rail strip

/** z position for top-half rows (row 0=a farthest, row 4=e closest to gap) */
export function rowZTop(rowIndex: number): number {
  return -(CENTER_GAP / 2 + (ROWS - 1 - rowIndex) * PITCH);
}

/** z position for bottom-half rows (row 0=f closest to gap, row 4=j farthest) */
export function rowZBot(rowIndex: number): number {
  return CENTER_GAP / 2 + rowIndex * PITCH;
}
