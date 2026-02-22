declare module 'avr8js' {
  export const PinState: {
    High: 1;
    Low: 0;
    [key: string]: number;
  };

  export class CPU {
    cycles: number;
    constructor(memory: Uint16Array);
    tick(): void;
  }

  export class AVRIOPort {
    constructor(cpu: CPU, config: unknown);
    pinState(bit: number): number;
  }

  export class AVRTimer {
    constructor(cpu: CPU, config: unknown);
  }

  export class AVRUSART {
    constructor(cpu: CPU, config: unknown, frequency: number);
    onByteTransmit: (byte: number) => void;
  }

  export const portDConfig: unknown;
  export const portBConfig: unknown;
  export const portCConfig: unknown;
  export const timer0Config: unknown;
  export const usart0Config: unknown;
}
