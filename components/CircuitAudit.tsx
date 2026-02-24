'use client';

import { useMemo } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { runAudit } from '@/features/audit/circuitAudit';

const SEVERITY_ICON: Record<'error' | 'warn' | 'info', string> = {
  error: '⛔',
  warn: '⚠️',
  info: 'ℹ️',
};

export default function CircuitAudit() {
  const open = useUIStore((s) => s.circuitAuditOpen);
  const closeCircuitAudit = useUIStore((s) => s.closeCircuitAudit);
  const components = useCircuitStore((s) => s.components);
  const nodes = useCircuitStore((s) => s.nodes);
  const getDesignator = useCircuitStore((s) => s.getDesignator);
  const setSelectedComponents = useCircuitStore((s) => s.setSelectedComponents);

  const issues = useMemo(
    () => runAudit(components, nodes, getDesignator),
    [components, nodes, getDesignator]
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeCircuitAudit} />
      <div
        className="fixed z-50 top-16 left-1/2 -translate-x-1/2 w-80 bg-[#18181c] border border-white/15 rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.8)]"
        style={{ animation: 'toastIn 0.15s ease-out both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 pt-3 pb-2 border-b border-white/10 flex items-center justify-between">
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Circuit Audit</p>
          <span className="text-[10px] text-white/30">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="px-3 py-2 max-h-72 overflow-y-auto space-y-2">
          {issues.length === 0 ? (
            <p className="text-[12px] text-[#00e676] py-2">✓ All clear — no issues detected</p>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-2">
                <span className="text-[13px] shrink-0 mt-0.5">{SEVERITY_ICON[issue.severity]}</span>
                <div className="flex-1">
                  <p className="text-[11px] text-white/70 leading-snug">{issue.message}</p>
                  {issue.componentId && (
                    <button
                      className="text-[10px] text-[#7c6fff] hover:text-[#a89fff] mt-0.5"
                      onClick={() => {
                        setSelectedComponents([issue.componentId!]);
                        closeCircuitAudit();
                      }}
                    >
                      Go to {issue.componentLabel}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-3 pb-2 border-t border-white/10 pt-2">
          <p className="text-[9px] text-white/25">Ctrl+Shift+A to open · Esc to close</p>
        </div>
      </div>
    </>
  );
}
