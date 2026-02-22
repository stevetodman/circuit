'use client';

import { useShallow } from 'zustand/react/shallow';
import { useScopeStore } from '@/store/scopeStore';

function ScopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1 13h14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M2 13V5c.9-2 2.6-3 4.7-3 1.1 0 2 .5 2.8 1.4C10.3 5.1 11.2 13 15 13"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ScopeButton() {
  const { open, toggle } = useScopeStore(useShallow((state) => ({
    open: state.open,
    toggle: state.toggle,
  })));

  return (
    <button
      type="button"
      onClick={() => toggle()}
      title="Oscilloscope (O)"
      aria-label="Toggle oscilloscope"
      className={`mx-2 mb-2 rounded-md border text-[11px] font-semibold px-2 py-1.5 inline-flex items-center justify-center gap-1.5 ${open ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-200' : 'border-white/20 bg-white/3 text-white/75 hover:border-white/35 hover:text-white'} focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none`}
    >
      <ScopeIcon />
      Scope
    </button>
  );
}
