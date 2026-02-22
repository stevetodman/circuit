/**
 * Analog simulation worker.
 *
 * Receives UPDATE_NETLIST messages from the main thread, runs the DC
 * operating-point solver, then writes net voltages into the SharedArrayBuffer
 * so the main thread can read them at 60 fps without postMessage overhead.
 *
 * Message protocol (main → worker):
 *   { type: 'UPDATE_NETLIST', nodes, components, sab }
 *
 * Message protocol (worker → main):
 *   { type: 'VOLTAGES_READY' }
 *   { type: 'SIM_ERROR', message: string }
 */
import { buildNetlist } from '../mna/NetlistBuilder';
import { solveDC }      from '../mna/MNASolver';
import type { CircuitNode, PlacedComponent } from '../../types/circuit';

const MAX_NETS          = 256;
const SAB_VOLTAGE_OFFSET = 0;

interface UpdateNetlistMsg {
  type:       'UPDATE_NETLIST';
  nodes:      Record<string, CircuitNode>;
  components: Record<string, PlacedComponent>;
  sab:        SharedArrayBuffer;
}

let voltageView: Float32Array | null = null;

self.onmessage = (e: MessageEvent<UpdateNetlistMsg>) => {
  const msg = e.data;
  if (msg.type !== 'UPDATE_NETLIST') return;

  // (Re)attach typed view to the shared buffer
  if (!voltageView || voltageView.buffer !== msg.sab) {
    voltageView = new Float32Array(msg.sab, SAB_VOLTAGE_OFFSET, MAX_NETS);
  }

  try {
    const netlist = buildNetlist(msg.nodes, msg.components);
    const result  = solveDC(netlist);

    voltageView.fill(0);
    if (result) {
      const len = Math.min(result.length, MAX_NETS);
      for (let i = 0; i < len; i++) voltageView[i] = result[i];
    }

    self.postMessage({ type: 'VOLTAGES_READY' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'SIM_ERROR', message });
  }
};
