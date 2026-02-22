/**
 * Analog simulation worker.
 *
 * Receives UPDATE_NETLIST messages from the main thread, runs the DC
 * operating-point solver, then writes net voltages into the SharedArrayBuffer
 * so the main thread can read them at 60 fps without postMessage overhead.
 *
 * Message protocol (main → worker):
 *   { type: 'UPDATE_NETLIST', nodes, components, wires, sab }
 *
 * Message protocol (worker → main):
 *   { type: 'VOLTAGES_READY', singular?: boolean }
 *   { type: 'SIM_ERROR', message: string }
 */
import { buildNetlist } from '../mna/NetlistBuilder';
import { solveDC }      from '../mna/MNASolver';
import { MAX_BRANCHES, SAB_CURRENT_OFFSET, SAB_TIMESTAMP_OFFSET } from '../../types/circuit';
import type { CircuitNode, PlacedComponent, Wire } from '../../types/circuit';

const MAX_NETS          = 256;
const SAB_VOLTAGE_OFFSET = 0;

interface UpdateNetlistMsg {
  type:       'UPDATE_NETLIST';
  nodes:      Record<string, CircuitNode>;
  components: Record<string, PlacedComponent>;
  wires:      Record<string, Wire>;
  sab:        SharedArrayBuffer;
}

let voltageView: Float32Array | null = null;
let branchCurrentView: Float32Array | null = null;
let timestampView: Float64Array | null = null;

self.onmessage = (e: MessageEvent<UpdateNetlistMsg>) => {
  const msg = e.data;
  if (msg.type !== 'UPDATE_NETLIST') return;

  // (Re)attach typed view to the shared buffer
  if (!voltageView || voltageView.buffer !== msg.sab) {
    voltageView = new Float32Array(msg.sab, SAB_VOLTAGE_OFFSET, MAX_NETS);
    branchCurrentView = new Float32Array(msg.sab, SAB_CURRENT_OFFSET, MAX_BRANCHES);
    timestampView = new Float64Array(msg.sab, SAB_TIMESTAMP_OFFSET, 1);
  }

  try {
    const netlist = buildNetlist(msg.nodes, msg.components, msg.wires);
    const result  = solveDC(netlist);

    voltageView.fill(0);
    branchCurrentView?.fill(0);

    if (result) {
      const voltageLen = Math.min(result.voltages.length, MAX_NETS);
      for (let i = 0; i < voltageLen; i++) voltageView[i] = result.voltages[i];

      const branchLen = Math.min(result.branchCurrents.length, MAX_BRANCHES);
      if (branchCurrentView) {
        for (let i = 0; i < branchLen; i++) branchCurrentView[i] = result.branchCurrents[i];
      }

      if (timestampView) {
        timestampView[0] = performance.now();
      }

      self.postMessage({ type: 'VOLTAGES_READY', singular: false });
      return;
    }

    self.postMessage({ type: 'VOLTAGES_READY', singular: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (voltageView) voltageView.fill(0);
    if (branchCurrentView) branchCurrentView.fill(0);
    self.postMessage({ type: 'SIM_ERROR', message });
  }
};
