import { create } from 'zustand';
import type { Card, CardType, CommandPlan } from '../types';

export type ViewMode = 'stage' | 'codex' | 'chronicle';
export type StageLevel = 'world' | 'region';

export interface ToastItem {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warn';
}

interface MovePrompt {
  characterId: string;
  locationId: string;
  fromLocationId?: string;
  chapterNumber: number;
}

interface UIState {
  view: ViewMode;
  stageLevel: StageLevel;
  activeRegionId: string | null;
  chapter: number;
  playing: boolean;
  pov: string | null;

  selectedId: string | null;
  codexMode: 'cards' | 'graph';
  codexType: CardType | 'all';
  codexSort: 'importance' | 'name' | 'type' | 'updated';
  codexQuery: string;

  plan: CommandPlan | null;
  planLoading: boolean;
  planScope: 'all' | 'chapter' | 'selection';

  movePrompt: MovePrompt | null;
  deleteId: string | null;
  newCardOpen: boolean;
  settingsOpen: boolean;
  helpOpen: boolean;
  commandFocus: number;

  toasts: ToastItem[];
  pulseCardId: string | null;

  setView: (v: ViewMode) => void;
  setStageLevel: (l: StageLevel, regionId?: string | null) => void;
  setChapter: (n: number) => void;
  setPlaying: (p: boolean) => void;
  setPov: (id: string | null) => void;
  select: (id: string | null) => void;
  setCodexMode: (m: 'cards' | 'graph') => void;
  setCodexType: (t: CardType | 'all') => void;
  setCodexSort: (s: 'importance' | 'name' | 'type' | 'updated') => void;
  setCodexQuery: (q: string) => void;
  setPlan: (p: CommandPlan | null) => void;
  setPlanLoading: (b: boolean) => void;
  setPlanScope: (s: 'all' | 'chapter' | 'selection') => void;
  setMovePrompt: (p: MovePrompt | null) => void;
  setDeleteId: (id: string | null) => void;
  setNewCardOpen: (b: boolean) => void;
  setSettingsOpen: (b: boolean) => void;
  setHelpOpen: (b: boolean) => void;
  setPulse: (id: string | null) => void;
  toast: (text: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;
  focusCommand: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'stage',
  stageLevel: 'world',
  activeRegionId: null,
  chapter: 3,
  playing: false,
  pov: null,

  selectedId: null,
  codexMode: 'cards',
  codexType: 'all',
  codexSort: 'importance',
  codexQuery: '',

  plan: null,
  planLoading: false,
  planScope: 'all',

  movePrompt: null,
  deleteId: null,
  newCardOpen: false,
  settingsOpen: false,
  helpOpen: false,
  commandFocus: 0,

  toasts: [],
  pulseCardId: null,

  setView: (view) => set({ view, selectedId: null }),
  setStageLevel: (stageLevel, regionId = null) =>
    set({ stageLevel, activeRegionId: regionId }),
  setChapter: (chapter) => set({ chapter }),
  setPlaying: (playing) => set({ playing }),
  setPov: (pov) => set({ pov }),
  select: (selectedId) => set({ selectedId }),
  setCodexMode: (codexMode) => set({ codexMode }),
  setCodexType: (codexType) => set({ codexType }),
  setCodexSort: (codexSort) => set({ codexSort }),
  setCodexQuery: (codexQuery) => set({ codexQuery }),
  setPlan: (plan) => set({ plan }),
  setPlanLoading: (planLoading) => set({ planLoading }),
  setPlanScope: (planScope) => set({ planScope }),
  setMovePrompt: (movePrompt) => set({ movePrompt }),
  setDeleteId: (deleteId) => set({ deleteId }),
  setNewCardOpen: (newCardOpen) => set({ newCardOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setPulse: (pulseCardId) => set({ pulseCardId }),
  toast: (text, tone = 'info') =>
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text, tone }],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  focusCommand: () => set((s) => ({ commandFocus: s.commandFocus + 1 })),
}));

export function cardsOfType(cards: Card[], type: CardType | 'all'): Card[] {
  return type === 'all' ? cards : cards.filter((c) => c.type === type);
}
