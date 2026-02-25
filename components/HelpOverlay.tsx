'use client';

import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '@/store/uiStore';
import { useEffect, useState } from 'react';

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

const SIM_ACCURACY_NOTES = [
  'Capacitors: Backward Euler, 1 ms fixed timestep. RC circuits with τ < 1 ms may be inaccurate.',
  'BJTs: simplified Ebers-Moll (no Early effect, no temperature model).',
  '555 timer: behavioral frequency model — waveform shape is approximate.',
  'For precision analysis, use the SPICE export with LTspice.',
];

export default function HelpOverlay() {
  const { showHelp, toggleHelp } = useUIStore(useShallow((s) => ({ showHelp: s.showHelp, toggleHelp: s.toggleHelp })));
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!showHelp) setQuery('');
  }, [showHelp]);

  if (!showHelp) return null;
  const q = query.toLowerCase();
  const noMatches = SECTIONS.every(({ rows }) => {
    return !rows.some(([key, desc]) =>
      key.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
    );
  });

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
        <input
          type="text"
          placeholder="Search shortcuts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 placeholder-white/25 outline-none focus:border-white/20 mb-4"
          autoFocus
        />
        {SECTIONS.map(({ heading, rows }) => {
          const filteredRows = q
            ? rows.filter(([key, desc]) =>
              key.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
            )
            : rows;
          if (!filteredRows.length) return null;
          return (
            <div key={heading} className="mb-4 last:mb-0">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-1.5">{heading}</p>
              <table className="w-full text-xs">
                <tbody>
                  {filteredRows.map(([key, desc]) => (
                    <tr key={key} className="border-b border-white/[0.05]">
                      <td className="py-1.5 pr-4 font-mono text-white/60 whitespace-nowrap">{key}</td>
                      <td className="py-1.5 text-white/40">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {noMatches && (
          <p className="text-white/30 text-xs text-center py-4">No matches for &quot;{query}&quot;</p>
        )}
        {!q && (
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2">Simulation Accuracy</p>
            <ul className="space-y-1">
              {SIM_ACCURACY_NOTES.map((note) => (
                <li key={note} className="text-[11px] text-white/35 leading-snug pl-2 border-l border-white/10">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
