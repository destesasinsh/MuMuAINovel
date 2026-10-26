import type { Card, CardType, Chapter, Project } from '../types';
import { CARD_META, CARD_TYPE_ORDER } from '../types';

export function byId(project: Project, id: string | null | undefined): Card | undefined {
  if (!id) return undefined;
  return project.cards.find((c) => c.id === id);
}

export function nameOf(project: Project, id: string | null | undefined): string {
  return byId(project, id)?.name ?? '';
}

export function edgesOf(project: Project, cardId: string) {
  return project.edges.filter((e) => e.from === cardId || e.to === cardId);
}

export function eventsOfCard(project: Project, cardId: string): Card[] {
  return project.cards.filter(
    (c) =>
      c.type === 'event' &&
      Array.isArray(c.fields.participants) &&
      (c.fields.participants as string[]).includes(cardId),
  );
}

export function eventsOfChapter(project: Project, chapter: number): Card[] {
  return project.cards
    .filter((c) => c.type === 'event' && c.chapter === chapter)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function chapterAt(project: Project, n: number): Chapter | undefined {
  return project.chapters.find((c) => c.number === n);
}

export function charactersAt(project: Project, chapter: number, locationId: string): Card[] {
  const ch = chapterAt(project, chapter);
  if (!ch) return [];
  return Object.entries(ch.locations)
    .filter(([, loc]) => loc === locationId)
    .map(([cid]) => byId(project, cid))
    .filter((c): c is Card => Boolean(c && c.type === 'character'));
}

export function statusLabel(card: Card): string {
  return CARD_META[card.type].statuses.find((s) => s.value === card.status)?.label ?? card.status;
}

export function importanceStars(v: number): number {
  return Math.max(1, Math.min(5, Math.round(v * 5)));
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 按类型分列布局（关系图用） */
export function layoutByType(cards: Card[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const columns = CARD_TYPE_ORDER.filter((t) => cards.some((c) => c.type === t));
  const colW = 330;
  const rowH = 148;
  columns.forEach((type, colIdx) => {
    const list = cards.filter((c) => c.type === type);
    list.forEach((card, rowIdx) => {
      out[card.id] = {
        x: colIdx * colW,
        y: (rowIdx - (list.length - 1) / 2) * rowH,
      };
    });
  });
  return out;
}

/** 事件编年表布局：按链分泳道，按 order 横向排 */
export function layoutChronicle(
  project: Project,
  laneList: { id: string; name: string }[],
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const events = project.cards
    .filter((c) => c.type === 'event')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const laneIndex: Record<string, number> = {};
  laneList.forEach((l, i) => {
    laneIndex[l.id] = i;
  });
  const unassignedLane = laneList.length;
  events.forEach((e) => {
    const laneId = (e.chainIds ?? []).find((cid) => laneIndex[cid] != null);
    const lane = laneId ? laneIndex[laneId] : unassignedLane;
    out[e.id] = {
      x: 95 + ((e.order ?? 1) - 1) * 235,
      y: 120 + lane * 205,
    };
  });
  return out;
}

export function nearestLocation(
  locations: { id: string; x: number; y: number }[],
  point: { x: number; y: number },
  threshold = 190,
): string | null {
  let best: string | null = null;
  let bestD = threshold;
  for (const loc of locations) {
    const d = Math.hypot(loc.x - point.x, loc.y - point.y);
    if (d < bestD) {
      bestD = d;
      best = loc.id;
    }
  }
  return best;
}

export function countsByType(cards: Card[]): { type: CardType; label: string; count: number; color: string }[] {
  return CARD_TYPE_ORDER.map((type) => ({
    type,
    label: CARD_META[type].label,
    color: CARD_META[type].color,
    count: cards.filter((c) => c.type === type).length,
  }));
}
