import { describe, it } from 'vitest';
import { solveDC } from '../../../simulation/mna/MNASolver';
import type { Netlist } from '../../../simulation/mna/MNASolver';

describe('BJT+LED diagnostic', () => {
  it('BJT LED switch — mirrors example circuit', () => {
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 9 },
        { id: 'rb', kind: 'resistor', netA: 1, netB: 2, value: 10000 },
        { id: 'rc', kind: 'resistor', netA: 1, netB: 3, value: 220 },
        { id: 'd1', kind: 'diode', netA: 3, netB: 4, value: 0.7 },
        { id: 'q1', kind: 'bjt', netA: 4, netB: 2, netC: 0, value: 100 },
      ],
      netCount: 5,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    console.log('Converged:', result?.converged);
    console.log('Voltages:', result ? Array.from(result.voltages).map(v => v.toFixed(4)) : 'null');
  });
});
