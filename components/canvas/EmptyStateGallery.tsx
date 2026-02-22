'use client';

import { useCircuitStore } from '@/store/circuitStore';
import { EXAMPLE_CIRCUITS } from '@/features/examples/circuits';
import type { ExampleCircuit } from '@/features/examples/circuits';

type ExampleWithId = ExampleCircuit & { id?: string };

const EMPTY_GALLERY_LIMIT = 6;

const ICON_BY_EXAMPLE_ID: Record<string, string> = {
  'led-resistor': '💡',
  'voltage-divider': '⚡',
  'blink': '🔁',
  'rc-blinker': '⏱',
  'pot-dimmer': '🎛',
  'zener-regulator': '⚗',
  'bjt-switch': '🔀',
  '555-astable': '📡',
  'default': '🔌',
};

function identifyExample(example: ExampleWithId): string {
  if (example.id) return example.id;

  const slug = example.name.toLowerCase();
  if (slug.includes('led') && slug.includes('resistor')) return 'led-resistor';
  if (slug.includes('voltage') && slug.includes('divider')) return 'voltage-divider';
  if (slug.includes('rc') || slug.includes('capacitor')) return 'rc-blinker';
  if (slug.includes('blink')) return '555-astable';
  if (slug.includes('npn') || slug.includes('switch')) return 'bjt-switch';
  if (slug.includes('blinker') || slug.includes('555')) return '555-astable';
  if (slug.includes('pot')) return 'pot-dimmer';
  if (slug.includes('zener')) return 'zener-regulator';
  if (slug.includes('timer')) return '555-astable';
  return 'default';
}

function getExampleIcon(example: ExampleWithId): string {
  return ICON_BY_EXAMPLE_ID[identifyExample(example)] ?? '🔌';
}

export default function EmptyStateGallery() {
  const loadFromJSON = useCircuitStore((state) => state.loadFromJSON);
  const components = useCircuitStore((state) => state.components);

  if (Object.keys(components).length > 0) return null;

  const examples = EXAMPLE_CIRCUITS.slice(0, EMPTY_GALLERY_LIMIT);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
      <div className="w-full max-w-3xl pointer-events-auto">
        <div className="mx-auto rounded-xl border border-white/10 bg-[#111113]/90 px-5 py-4 text-white/80">
          <p className="text-sm font-semibold mb-3">Try an example:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {examples.map((example) => (
              <button
                key={example.name}
                type="button"
                onClick={() => loadFromJSON(example)}
                className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 p-3 text-left transition-colors"
              >
                <p className="text-xl mb-1" aria-hidden="true">{getExampleIcon(example)}</p>
                <p className="text-sm font-semibold text-white/90">{example.name}</p>
                <p className="text-xs text-white/55 leading-snug">{example.description}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50 text-center">
            Or drag a part from the left panel to start fresh
          </p>
        </div>
      </div>
    </div>
  );
}
