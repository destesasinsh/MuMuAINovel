import { MarkerType, type Edge as RFEdge, type Node } from '@xyflow/react';
import type { Project } from '../../types';
import { EDGE_META } from '../../types';
import { chapterAt } from '../../utils/helpers';

export function worldLevelNodes(project: Project): Node[] {
  return project.cards
    .filter((c) => c.type === 'region')
    .map((c) => ({
      id: c.id,
      type: 'region',
      position: { x: c.meta.x ?? 0, y: c.meta.y ?? 0 },
      data: { cardId: c.id },
    }));
}

export function regionLevelNodes(
  project: Project,
  regionId: string | null,
  chapter: number,
): Node[] {
  const locs = project.cards.filter(
    (c) => c.type === 'location' && c.meta.regionId === regionId,
  );
  const nodes: Node[] = locs.map((c) => ({
    id: c.id,
    type: 'location',
    position: { x: c.meta.x ?? 0, y: c.meta.y ?? 0 },
    data: { cardId: c.id },
  }));
  const ch = chapterAt(project, chapter);
  if (ch) {
    const byLoc = new Map<string, string[]>();
    for (const [cid, lid] of Object.entries(ch.locations)) {
      if (!locs.some((l) => l.id === lid)) continue;
      const arr = byLoc.get(lid) ?? [];
      arr.push(cid);
      byLoc.set(lid, arr);
    }
    for (const loc of locs) {
      const chars = byLoc.get(loc.id) ?? [];
      const baseX = loc.meta.x ?? 0;
      const baseY = loc.meta.y ?? 0;
      chars.forEach((cid, i) => {
        nodes.push({
          id: cid,
          type: 'character',
          position: {
            x: baseX + (i - (chars.length - 1) / 2) * 176,
            y: baseY + 146 + (i % 3) * 14,
          },
          data: { cardId: cid },
        });
      });
    }
  }
  return nodes;
}

export function stageEdges(
  project: Project,
  level: 'world' | 'region',
  regionId: string | null,
): RFEdge[] {
  const regionIds = new Set(
    project.cards.filter((c) => c.type === 'region').map((c) => c.id),
  );
  const locationIds = new Set(
    project.cards
      .filter((c) => c.type === 'location' && c.meta.regionId === regionId)
      .map((c) => c.id),
  );
  const allowed = level === 'world' ? regionIds : locationIds;
  const seen = new Set<string>();
  const out: RFEdge[] = [];

  for (const e of project.edges) {
    if (e.type !== 'path' && e.type !== 'secret') continue;
    if (!allowed.has(e.from) || !allowed.has(e.to)) continue;
    const key = [e.from, e.to].sort().join('::');
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = EDGE_META[e.type];
    const isSecret = e.type === 'secret';
    out.push({
      id: e.id,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      label: e.label || meta.label,
      animated: isSecret,
      style: {
        stroke: meta.color,
        strokeWidth: level === 'world' ? 2 : 1.6,
        strokeDasharray: meta.dash || undefined,
        opacity: 0.9,
      },
      labelStyle: { fill: '#b3a288', fontSize: 10, letterSpacing: 1 },
      labelBgStyle: { fill: 'rgba(13,10,8,0.88)' },
      labelBgPadding: [5, 2],
      labelBgBorderRadius: 4,
      markerEnd: isSecret
        ? { type: MarkerType.ArrowClosed, color: meta.color, width: 14, height: 14 }
        : undefined,
      zIndex: 0,
    });
  }
  return out;
}
