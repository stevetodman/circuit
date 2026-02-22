export type ComponentKind =
  | 'battery' | 'resistor' | 'led' | 'capacitor' | 'diode'
  | 'bjt' | 'mosfet' | 'switch' | 'potentiometer' | 'motor'
  | 'timer555' | 'inductor' | 'arduino' | 'schottky' | 'zener';

export interface ModuleStep {
  id: string;
  instruction: string;
  hint?: string;
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
  steps: ModuleStep[];
}

export interface ValidatorState {
  components: Record<
    string,
    { type: ComponentKind; props: Record<string, unknown>; pins: Array<{ name: string; nodeId: string }> }
  >;
  nodes: Record<string, { netId: number | null }>;
  wires: Record<string, { from: string; to: string }>;
  voltages: Float32Array;
  scopeChannels: Array<{ netId: number }>;
}
