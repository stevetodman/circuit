'use client';
import { useRef, useState, useEffect } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';

export default function SaveBlockPrompt() {
  const open = useUIStore((s) => s.saveBlockPromptOpen);
  const closeSaveBlockPrompt = useUIStore((s) => s.closeSaveBlockPrompt);
  const saveAsBlock = useCircuitStore((s) => s.saveAsBlock);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) saveAsBlock(trimmed);
    closeSaveBlockPrompt();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeSaveBlockPrompt}>
      <div
        className="bg-[#18181c] border border-white/15 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-4 py-3 min-w-[220px]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'toastIn 0.15s ease-out both' }}
      >
        <p className="text-[10px] text-white/40 mb-2">Save selection as block</p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); closeSaveBlockPrompt(); }
          }}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white w-full outline-none focus:border-[#7c6fff]/60"
          placeholder="e.g. Voltage Divider"
        />
        <p className="text-[9px] text-white/25 mt-1.5">Enter to save · Esc to cancel</p>
      </div>
    </div>
  );
}
