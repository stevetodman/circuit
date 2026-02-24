export interface CircuitSlot {
  id: string;
  name: string;
  json: string;
  savedAt: number; // Date.now()
}

const KEY = 'circuit-slots-v1';
export const MAX_SLOTS = 5;

export function loadSlots(): CircuitSlot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CircuitSlot[];
  } catch {
    return [];
  }
}

export function saveSlots(slots: CircuitSlot[]): void {
  localStorage.setItem(KEY, JSON.stringify(slots.slice(0, MAX_SLOTS)));
}

export function createSlot(name: string, json: string): CircuitSlot {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled',
    json,
    savedAt: Date.now(),
  };
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
