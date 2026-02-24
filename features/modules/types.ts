export type ComponentKind =
  | 'battery' | 'resistor' | 'led' | 'capacitor' | 'diode'
  | 'bjt' | 'pnp' | 'mosfet' | 'switch' | 'tactileSwitch' | 'potentiometer' | 'motor'
  | 'timer555' | 'inductor' | 'arduino' | 'schottky' | 'zener' | 'opamp' | 'voltageRegulator';

export interface ModuleStep {
  id: string;
  instruction: string;
  hint?: string;
  failHint?: string;
  spotlightTarget?: 'sidebar-parts' | 'breadboard' | 'oscilloscope' | 'properties';
  highlightComponent?: ComponentKind;
  validate: (state: ValidatorState) => boolean;
  autoLoadId?: string;
}

export interface Module {
  id: string;
  title: string;
  subtitle: string;
  concept: string;
  prerequisiteId?: string;
  autoLoadId?: string;
  steps: ModuleStep[];
}

export interface ValidatorState {
  components: Record<
    string,
    { type: ComponentKind; props: Record<string, unknown>; pins: Array<{ name: string; nodeId: string }> }
  >;
  nodes: Record<string, { netId: number | null }>;
  wires: Record<string, { fromNodeId: string; toNodeId: string }>;
  voltages: Float32Array;
  scopeChannels: Array<{ netId: number }>;
}
