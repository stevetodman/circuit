'use client';

import { useEffect, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useToastStore } from '@/store/toastStore';
import {
  createSlot,
  formatRelativeTime,
  type CircuitSlot,
  loadSlots,
  saveSlots,
  MAX_SLOTS,
} from '@/features/saves/savedCircuits';

export default function SavedCircuitsPanel() {
  const [slots, setSlots] = useState<CircuitSlot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const circuitName = useCircuitStore((state) => state.circuitName);
  const saveToJSON = useCircuitStore((state) => state.saveToJSON);
  const loadFromJSON = useCircuitStore((state) => state.loadFromJSON);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    setSlots(loadSlots());
  }, []);

  const handleSave = () => {
    const json = saveToJSON();
    const slot = createSlot(circuitName || 'Untitled', json);
    const updated = [slot, ...slots].slice(0, MAX_SLOTS);
    saveSlots(updated);
    setSlots(updated);
    addToast(`Saved "${slot.name}"`, 'info');
  };

  const handleLoad = (slot: CircuitSlot) => {
    try {
      loadFromJSON(JSON.parse(slot.json));
      addToast(`Loaded "${slot.name}"`, 'info');
    } catch {
      addToast('Failed to load circuit -- save may be corrupted', 'error');
    }
  };

  const handleDelete = (id: string) => {
    const deleted = slots.find((slot) => slot.id === id);
    const updated = slots.filter((slot) => slot.id !== id);
    saveSlots(updated);
    setSlots(updated);
    if (deleted) addToast(`Deleted "${deleted.name}"`, 'info');
  };

  const handleRename = (id: string, name: string) => {
    const updated = slots.map((slot) =>
      slot.id === id ? { ...slot, name: name.trim() || 'Untitled' } : slot
    );
    saveSlots(updated);
    setSlots(updated);
    setEditingId(null);
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/[0.08]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Saved Circuits
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={slots.length >= MAX_SLOTS}
          className="text-[10px] text-[#7c6fff] hover:text-[#a89fff] disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
          title={
            slots.length >= MAX_SLOTS
              ? `Max ${MAX_SLOTS} slots — delete one first`
              : 'Save current circuit as a new slot'
          }
        >
          + Save current
        </button>
      </div>
      {slots.length === 0 ? (
        <p className="text-[10px] text-white/25 italic">No saved circuits yet.</p>
      ) : (
        <div className="space-y-1.5">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-1.5 group">
              <div className="flex-1 min-w-0">
                {editingId === slot.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onBlur={() => handleRename(slot.id, editName)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleRename(slot.id, editName);
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full text-[11px] bg-white/[0.07] border border-white/15 rounded px-1.5 py-0.5 text-white/80 outline-none focus:border-[#7c6fff]/50"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(slot.id);
                      setEditName(slot.name);
                    }}
                    className="text-left text-[11px] text-white/60 hover:text-white/85 truncate max-w-full block transition-colors"
                    title="Click to rename"
                  >
                    {slot.name}
                  </button>
                )}
                <p className="text-[9px] text-white/25 font-mono">
                  {formatRelativeTime(slot.savedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLoad(slot)}
                className="text-[10px] text-[#6ec4ff] hover:text-[#a8e4ff] transition-colors shrink-0"
                title={`Load "${slot.name}"`}
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => handleDelete(slot.id)}
                className="text-[10px] text-white/20 hover:text-red-400 transition-colors shrink-0"
                title={`Delete "${slot.name}"`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
