/**
 * SimBridge — SharedArrayBuffer singleton shared between main thread and workers.
 *
 * Usage:
 *   Main thread — SimController calls init(sab) once on mount.
 *   Worker      — receives sab via postMessage and calls init(sab).
 *   LED / VoltageBridge — read voltages[] directly every frame.
 *
 * Before init() is called, all arrays are zero-filled regular typed arrays,
 * so components render safely with 0 V everywhere.
 */
import {
  MAX_NETS,
  MAX_BRANCHES,
  SAB_VOLTAGE_OFFSET,
  SAB_DIGITAL_OFFSET,
  SAB_CURRENT_OFFSET,
} from '@/types/circuit';

// Default to regular (non-SAB) zero arrays before init — safe to read
export let voltages:      Float32Array = new Float32Array(MAX_NETS);
export let digitalStates: Uint8Array   = new Uint8Array(MAX_NETS);
export let branchCurrents: Float32Array = new Float32Array(MAX_BRANCHES);
export let simTimestamp: Float64Array = new Float64Array(1);

/** Call once on the main thread with the SharedArrayBuffer created in SimController. */
export function init(sab: SharedArrayBuffer): void {
  voltages       = new Float32Array(sab, SAB_VOLTAGE_OFFSET, MAX_NETS);
  digitalStates  = new Uint8Array(sab,   SAB_DIGITAL_OFFSET, MAX_NETS);
  branchCurrents = new Float32Array(sab, SAB_CURRENT_OFFSET, MAX_BRANCHES);
  simTimestamp   = new Float64Array(sab, SAB_TIMESTAMP_OFFSET, 1);
}
