import type { ComponentType } from '@/types/circuit';

export const PART_DESCRIPTIONS: Partial<Record<ComponentType | 'wire', string>> = {
  battery: 'Power source — supplies voltage',
  resistor: 'Limits current — protects other parts',
  led: 'Lights up when current flows through it',
  capacitor: 'Stores charge — used for timing & filters',
  diode: 'One-way valve — blocks reverse current',
  bjt: 'NPN transistor switch',
  pnp: 'PNP transistor switch',
  mosfet: 'Voltage-controlled switch',
  tactileSwitch: 'Push-button — closes circuit when pressed',
  potentiometer: 'Variable resistor — twist to change value',
  motor: 'DC motor — spins when powered',
  timer555: '555 timer — generates repeating pulses',
  inductor: 'Coil — resists current changes',
  arduino: 'Microcontroller — runs your sketch',
  schottky: 'Fast diode — low forward voltage drop',
  zener: 'Voltage-clamp diode',
  opamp: 'Amplifies voltage differences',
  wire: 'Connects two pins',
};
