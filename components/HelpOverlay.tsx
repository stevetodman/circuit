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
      ['Ctrl/Cmd+A', 'Select all'],
      ['Ctrl/Cmd+D', 'Duplicate'],
    ],
  },
  {
    heading: 'View',
    rows: [
      ['O', 'Toggle oscilloscope'],
      ['S', 'Toggle schematic view'],
      ['L', 'Toggle designator labels'],
      ['I', 'Toggle wire current labels'],
      ['F', 'Zoom to fit'],
      ['1 / 2', 'Camera (perspective / top)'],
    ],
  },
  {
    heading: 'Navigation',
    rows: [
      ['Click pin → click pin', 'Draw a wire'],
      ['Right-click component', 'Context menu (delete, rotate…)'],
      ['Drag from palette', 'Place a component'],
      ['Escape', 'Deselect / cancel drag'],
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
          <button onClick={toggleHelp} className="text-white/40 hover:text-white/80 text-lg leading-none">×</button>
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
