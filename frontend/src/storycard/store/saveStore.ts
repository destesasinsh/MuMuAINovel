import { create } from 'zustand';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusState {
  state: SaveState;
  message: string;
  savedAt: number | null;
  setStatus: (state: SaveState, message?: string) => void;
}

export const useSaveStatus = create<SaveStatusState>((set) => ({
  state: 'idle',
  message: '',
  savedAt: null,
  setStatus: (state, message = '') =>
    set({
      state,
      message,
      savedAt: state === 'saved' ? Date.now() : null,
    }),
}));
