'use client';

import { useUIStore } from '@/store/uiStore';

const SHORTCUTS = [
  ['O', 'Toggle oscilloscope'],
  ['S', 'Toggle schematic view'],
  ['R', 'Rotate selected / dragged component'],
  ['L', 'Toggle designator labels'],
  ['F', 'Zoom to fit'],
  ['1 / 2', 'Camera preset (perspective / top)'],
  ['Delete / Backspace', 'Delete selected'],
  ['Ctrl/Cmd+Z', 'Undo'],
  ['Ctrl/Cmd+Shift+Z', 'Redo'],
  ['Escape', 'Deselect / cancel'],
  ['I', 'Toggle current labels on wires'],
  ['?', 'Show / hide this panel'],
];

export default function HelpOverlay() {
  const { showHelp, toggleHelp } = useUIStore((s) => ({ showHelp: s.showHelp, toggleHelp: s.toggleHelp }));
  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={toggleHelp}
    >
      <div
        className="rounded-lg border border-white/[0.12] bg-[#111113] p-6 min-w-[320px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/80 text-sm font-semibold">Keyboard Shortcuts</span>
          <button onClick={toggleHelp} className="text-white/40 hover:text-white/80 text-lg leading-none">×</button>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {SHORTCUTS.map(([key, desc]) => (
              <tr key={key} className="border-b border-white/[0.05]">
                <td className="py-1.5 pr-4 font-mono text-white/60 whitespace-nowrap">{key}</td>
                <td className="py-1.5 text-white/40">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
