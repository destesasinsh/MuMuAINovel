import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import type { Card, CardType, Edge, PlanOp, Project } from '../types';
import { newCard } from '../types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

interface PastEntry {
  label: string;
  project: Project;
}

interface ProjectState {
  project: Project;
  rev: number;
  revision: number;
  past: PastEntry[];
  future: PastEntry[];
  pending: PastEntry | null;

  beginEdit: (label: string) => void;
  endEdit: () => void;
  mutate: (label: string, recipe: (draft: Draft<Project>) => void) => void;
  silent: (recipe: (draft: Draft<Project>) => void) => void;
  undo: () => void;
  redo: () => void;

  addCard: (type: CardType, name: string, extra?: Partial<Card>) => string;
  duplicateCard: (id: string) => string | null;
  deleteCard: (id: string) => void;
  patchCard: (id: string, patch: Partial<Card>) => void;
  patchFields: (id: string, fields: Record<string, unknown>) => void;
  addEdge: (from: string, to: string, type: Edge['type'], label?: string) => void;
  deleteEdge: (id: string) => void;
  moveCharacter: (characterId: string, locationId: string, chapterNumber: number) => string | null;
  applyPlan: (ops: PlanOp[], label?: string) => number;

  setProject: (p: Project) => void;
  replaceProject: (p: Project) => void;
  setRevision: (revision: number) => void;
  reset: () => void;
}

const CAP = 50;

function emptyProject(): Project {
  return {
    version: 1,
    projectId: '',
    revision: 0,
    creationMode: 'storycard',
    title: '未命名项目',
    genre: '',
    theme: '',
    premise: '',
    cards: [],
    edges: [],
    chains: [],
    chapters: [],
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: emptyProject(),
  rev: 0,
  revision: 0,
  past: [],
  future: [],
  pending: null,

  beginEdit: (label) => {
    const { pending, project } = get();
    if (pending) return;
    set({ pending: { label, project: clone(project) } });
  },

  endEdit: () => {
    const { pending } = get();
    if (!pending) return;
    set((state) => ({
      pending: null,
      past: [...state.past.slice(-(CAP - 1)), pending],
      future: [],
    }));
  },

  mutate: (label, recipe) =>
    set((state) => {
      const snapshot = clone(state.project);
      const next = produce(state.project, recipe);
      return {
        project: next,
        rev: state.rev + 1,
        past: [...state.past.slice(-(CAP - 1)), { label, project: snapshot }],
        future: [],
      };
    }),

  silent: (recipe) =>
    set((state) => ({
      project: produce(state.project, recipe),
      rev: state.rev + 1,
    })),

  undo: () =>
    set((state) => {
      const last = state.past[state.past.length - 1];
      if (!last) return {};
      return {
        project: last.project,
        rev: state.rev + 1,
        past: state.past.slice(0, -1),
        future: [...state.future, { label: last.label, project: state.project }],
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[state.future.length - 1];
      if (!next) return {};
      return {
        project: next.project,
        rev: state.rev + 1,
        past: [...state.past, { label: next.label, project: state.project }],
        future: state.future.slice(0, -1),
      };
    }),

  addCard: (type, name, extra = {}) => {
    const card = newCard(type, name, extra);
    get().mutate(`新建卡牌：${name}`, (draft) => {
      draft.cards.push(card);
    });
    return card.id;
  },

  duplicateCard: (id) => {
    const src = get().project.cards.find((c) => c.id === id);
    if (!src) return null;
    const copy: Card = {
      ...clone(src),
      id: `card-${src.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${src.name}（副本）`,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      meta: { ...src.meta, x: (src.meta.x ?? 0) + 40, y: (src.meta.y ?? 0) + 40 },
    };
    get().mutate(`复制卡牌：${src.name}`, (draft) => {
      draft.cards.push(copy);
    });
    return copy.id;
  },

  deleteCard: (id) => {
    const card = get().project.cards.find((c) => c.id === id);
    if (!card) return;
    get().mutate(`删除卡牌：${card.name}`, (draft) => {
      draft.cards = draft.cards.filter((c) => c.id !== id);
      draft.edges = draft.edges.filter((e) => e.from !== id && e.to !== id);
      draft.chains = draft.chains.map((ch) => ({
        ...ch,
        eventIds: ch.eventIds.filter((eid) => eid !== id),
      }));
      draft.chapters = draft.chapters.map((ch) => {
        const locations = { ...ch.locations };
        delete locations[id];
        return {
          ...ch,
          eventIds: ch.eventIds.filter((eid) => eid !== id),
          locations,
        };
      });
      for (const c of draft.cards) {
        if (Array.isArray(c.fields.participants)) {
          c.fields.participants = (c.fields.participants as string[]).filter((p) => p !== id);
        }
      }
    });
  },

  patchCard: (id, patch) => {
    get().silent((draft) => {
      const card = draft.cards.find((c) => c.id === id);
      if (!card) return;
      Object.assign(card, patch, { updatedAt: Date.now() });
    });
  },

  patchFields: (id, fields) => {
    get().silent((draft) => {
      const card = draft.cards.find((c) => c.id === id);
      if (!card) return;
      Object.assign(card.fields, fields);
      card.updatedAt = Date.now();
    });
  },

  addEdge: (from, to, type, label = '') => {
    if (!from || !to || from === to) return;
    get().mutate('新增关联', (draft) => {
      draft.edges.push({
        id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from,
        to,
        type,
        label,
        strength: 0,
        notes: '',
      });
    });
  },

  deleteEdge: (id) => {
    get().mutate('删除关联', (draft) => {
      draft.edges = draft.edges.filter((e) => e.id !== id);
    });
  },

  moveCharacter: (characterId, locationId, chapterNumber) => {
    const { project } = get();
    const char = project.cards.find((c) => c.id === characterId);
    const loc = project.cards.find((c) => c.id === locationId);
    if (!char || !loc) return null;
    const chapter = project.chapters.find((c) => c.number === chapterNumber);
    if (!chapter) return null;
    const fromLocationId = chapter.locations[characterId];
    if (fromLocationId === locationId) return null;
    if (loc.type !== 'location') return null;

    const order = Math.max(0, ...project.cards.filter((c) => c.type === 'event').map((e) => e.order ?? 0)) + 1;
    const eventId = `card-event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventCard = newCard('event', `${char.name} 前往 ${loc.name}`, {
      id: eventId,
      oneLiner: `${char.name} 从${loc.name}的方向动身`,
      summary: `（由舞台拖拽生成）${char.name}在第${chapterNumber}章移动到${loc.name}。`,
      status: 'planned',
      importance: 0.35,
      tags: ['移动', '舞台生成'],
      order,
      chapter: chapterNumber,
      chainIds: [],
      fields: {
        time: `第${chapterNumber}章`,
        place: loc.name,
        participants: [char.id],
        goal: '移动',
        obstacle: '',
        turn: '',
        outcome: `抵达${loc.name}`,
        delta: `${char.name}.位置 → ${loc.name}`,
        beat: '铺垫',
        tension: '3',
        pov: char.name,
        reveal: '',
      },
      meta: { regionId: loc.meta.regionId, locationId: loc.id },
    });

    get().mutate(`移动人物：${char.name} → ${loc.name}`, (draft) => {
      draft.cards.push(eventCard);
      for (const ch of draft.chapters) {
        if (ch.number >= chapterNumber) {
          ch.locations[characterId] = locationId;
        }
      }
      const target = draft.chapters.find((ch) => ch.number === chapterNumber);
      if (target && !target.eventIds.includes(eventId)) target.eventIds.push(eventId);
    });
    return eventId;
  },

  applyPlan: (ops, label = 'AI 批量修改') => {
    const effective = ops.filter((op) => op.checked);
    if (effective.length === 0) return 0;
    const now = Date.now();
    get().mutate(label, (draft) => {
      for (const op of effective) {
        const card = draft.cards.find((c) => c.id === op.cardId);
        if (!card) continue;
        if (op.field.startsWith('name:')) {
          const key = op.field.slice(5);
          if (key === 'name') card.name = op.after;
          else if (key === 'oneLiner') card.oneLiner = op.after;
          else if (key === 'summary') card.summary = op.after;
          else if (key === 'body') card.body = op.after;
        } else {
          card.fields[op.field] = op.after;
        }
        card.updatedAt = now;
        card.history = [
          ...card.history.slice(-19),
          {
            at: now,
            field: op.field,
            fieldLabel: op.fieldLabel,
            before: op.before,
            after: op.after,
          },
        ];
      }
    });
    return effective.length;
  },

  setProject: (p) =>
    set({ project: p, revision: p.revision || 0, rev: get().rev + 1, past: [], future: [], pending: null }),

  replaceProject: (p) =>
    set({ project: p, revision: p.revision || 0, rev: get().rev + 1, past: [], future: [], pending: null }),

  setRevision: (revision) => set({ revision }),

  reset: () =>
    set({
      project: emptyProject(),
      revision: 0,
      rev: get().rev + 1,
      past: [],
      future: [],
      pending: null,
    }),
}));
