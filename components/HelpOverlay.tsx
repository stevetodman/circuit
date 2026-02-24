'use client';

import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '@/store/uiStore';

const SECTIONS = [
  {
    heading: 'Editing',
    rows: [
      ['R', 'Rotate selected / dragged component'],
      ['Delete / Backspace', 'Delete selected'],
      ['Ctrl/Cmd+Z', 'Undo'],
      ['Ctrl/Cmd+Shift+Z', 'Redo'],
      ['Ctrl/Cmd+C', 'Copy selected'],
      ['Ctrl/Cmd+V', 'Paste'],
      ['↑ ↓ ← →', 'Nudge selected component 1 grid step'],
      ['Ctrl/Cmd+N', 'New circuit'],
      ['Ctrl/Cmd+A', 'Select all'],
      ['Ctrl/Cmd+D', 'Duplicate'],
      ['Ctrl/Cmd+F', 'Search placed components'],
      ['Ctrl/Cmd+H', 'Find & replace component values'],
      ['Double-click component', 'Edit primary value inline'],
    ],
  },
  {
    heading: 'Tools',
    rows: [
      ['Ctrl/Cmd+Shift+A', 'Circuit audit — find connection issues'],
    ],
  },
  {
    heading: 'View',
    rows: [
      ['O', 'Toggle oscilloscope'],
      ['S', 'Toggle schematic view'],
      ['L', 'Toggle designator labels'],
      ['I', 'Toggle wire current labels'],
      ['P', 'Toggle polarity labels (+/−)'],
      ['B', 'Show / hide sidebar'],
      ['W', 'Toggle component value labels (Ω, µF, V)'],
      ['V', 'Toggle wire voltage colours'],
      ['T', 'Toggle wire thickness by current'],
      ['Q', 'Toggle wire routing (curve / orthogonal)'],
      ['H', 'Toggle voltage heatmap on breadboard'],
      ['F', 'Zoom to fit'],
      ['D', 'Toggle Bode plot (AC frequency sweep)'],
      ['F11', 'Toggle fullscreen'],
      ['1 / 2', 'Camera (perspective / top)'],
    ],
  },
  {
    heading: 'Simulation',
    rows: [
      ['Space', 'Pause / resume simulation'],
      ['1× / 2× / 5× / 10×', 'Simulation speed (in status bar)'],
    ],
  },
  {
    heading: 'Navigation',
    rows: [
      ['Click pin → click pin', 'Draw a wire'],
      ['Right-click component', 'Context menu (delete, rotate…)'],
      ['Right-click wire', 'Wire colour + net label'],
      ['Drag from palette', 'Place a component'],
      ['Click part tile', 'Click-to-place mode (click board to place)'],
      ['Right-click component → Swap type', 'Replace with pin-compatible type'],
      ['Drag on empty canvas', 'Box-select multiple components'],
      ['Ctrl/Cmd or Shift + click', 'Add to / remove from selection'],
      ['Click tactile switch', 'Toggle switch open/closed'],
      ['Scroll on potentiometer', 'Adjust wiper position'],
      ['Escape', 'Deselect / cancel drag'],
      ['A', 'Open Arduino panel'],
      ['Tab / Shift+Tab', 'Cycle component selection'],
      ['+/−', 'Zoom in / out'],
      ['?', 'Show / hide this panel'],
    ],
  },
];

export default function HelpOverlay() {
  const { showHelp, toggleHelp } = useUIStore(useShallow((s) => ({ showHelp: s.showHelp, toggleHelp: s.toggleHelp })));
  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={toggleHelp}
    >
      <div
        className="rounded-lg border border-white/[0.12] bg-[#111113] p-6 min-w-[360px] max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-white/80 text-sm font-semibold">Keyboard Shortcuts</span>
          <button
            type="button"
            onClick={toggleHelp}
            className="text-white/40 hover:text-white/80 text-lg leading-none focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
          >
            ×
          </button>
        </div>
        {SECTIONS.map(({ heading, rows }) => (
          <div key={heading} className="mb-4 last:mb-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-1.5">{heading}</p>
            <table className="w-full text-xs">
              <tbody>
                {rows.map(([key, desc]) => (
                  <tr key={key} className="border-b border-white/[0.05]">
                    <td className="py-1.5 pr-4 font-mono text-white/60 whitespace-nowrap">{key}</td>
                    <td className="py-1.5 text-white/40">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
