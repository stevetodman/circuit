import { create } from 'zustand';
import { MAX_CHANNELS, clearChannel } from '@/features/oscilloscope/scopeBuffer';

export interface Channel {
  netId: number;
  color: string;
  label?: string;
}

interface ScopeState {
  open: boolean;
  channels: Channel[];
  toggle: () => void;
  toggleOpen: () => void;
  addChannel: (netId: number, label?: string) => void;
  removeChannel: (netId: number) => void;
  clearChannels: () => void;
}

const CHANNEL_COLORS = ['#56c2ff', '#ffd166', '#9b5de5', '#06d6a0'];

export const useScopeStore = create<ScopeState>()((set, get) => ({
  open: false,
  channels: [],

  toggle() {
    set({ open: !get().open });
  },

  toggleOpen() {
    set({ open: !get().open });
  },

  addChannel(netId, label) {
    const { channels } = get();

    if (channels.length >= MAX_CHANNELS) {
      return;
    }

    if (channels.some((c) => c.netId === netId)) {
      return;
    }

    const color = CHANNEL_COLORS[channels.length % CHANNEL_COLORS.length];
    set({
      channels: [...channels, { netId, color, label }],
    });
  },

  removeChannel(netId) {
    clearChannel(netId);
    set({ channels: get().channels.filter((channel) => channel.netId !== netId) });
  },

  clearChannels() {
    const { channels } = get();
    for (const channel of channels) {
      clearChannel(channel.netId);
    }
    set({ channels: [] });
  },
}));
