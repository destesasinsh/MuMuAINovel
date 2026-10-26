import { useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Edge as RFEdge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import { EDGE_META } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { BandNode, ColumnLabelNode, EventFlowNode } from '../stage/nodes';
import { layoutChronicle } from '../../utils/helpers';

const nodeTypes = {
  event: EventFlowNode,
  band: BandNode,
  colLabel: ColumnLabelNode,
} as unknown as NodeTypes;

const ZOOM = 0.78;

export default function ChronicleView() {
  const project = useProjectStore((s) => s.project);
  const chapter = useUIStore((s) => s.chapter);
  const setChapter = useUIStore((s) => s.setChapter);
  const playing = useUIStore((s) => s.playing);
  const setPlaying = useUIStore((s) => s.setPlaying);
  const rf = useRef<ReactFlowInstance | null>(null);

  const { lanes, pos } = useMemo(() => {
    const events = project.cards.filter((c) => c.type === 'event');
    const chainIds = new Set(project.chains.map((c) => c.id));
    const used = new Set<string>();
    let hasUnassigned = false;
    for (const e of events) {
      const cid = (e.chainIds ?? []).find((id) => chainIds.has(id));
      if (cid) used.add(cid);
      else hasUnassigned = true;
    }
    const lanes = [
      ...project.chains
        .filter((c) => used.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, color: c.color })),
      ...(hasUnassigned ? [{ id: '__none__', name: '未归类', color: '#7d6d57' }] : []),
    ];
    return { lanes, pos: layoutChronicle(project, lanes) };
  }, [project]);

  const { nodes, edges } = useMemo(() => {
    const events = project.cards.filter((c) => c.type === 'event');
    const eventIds = new Set(events.map((e) => e.id));

    const bandNodes: Node[] = project.chapters
      .filter((ch) => ch.eventIds.length > 0)
      .map((ch) => {
        const xs = ch.eventIds.map((id) => pos[id]?.x ?? 0).filter((x) => x > 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        return {
          id: `band-${ch.id}`,
          type: 'band',
          position: { x: minX - 30, y: 66 },
          data: { number: ch.number, title: ch.title, summary: ch.summary },
          draggable: false,
          selectable: false,
          style: { width: maxX - minX + 258, height: lanes.length * 205 + 88, zIndex: 0 },
        } as Node;
      });

    const eventNodes: Node[] = events.map((e) => ({
      id: e.id,
      type: 'event',
      position: pos[e.id] ?? { x: 0, y: 0 },
      data: { cardId: e.id },
      zIndex: 2,
    }));

    const laneOf = (chainIds: string[] | undefined) => {
      const cid = (chainIds ?? []).find((id) => lanes.some((l) => l.id === id));
      return cid ?? '__none__';
    };
    const laneLabels: Node[] = lanes.map((l, i) => ({
      id: `lane-${l.id}`,
      type: 'colLabel',
      position: { x: -208, y: 120 + i * 205 + 28 },
      data: {
        label: l.name,
        color: l.color,
        count: events.filter((e) => laneOf(e.chainIds) === l.id).length,
      },
      draggable: false,
      selectable: false,
      zIndex: 1,
    }));

    const edges: RFEdge[] = project.edges
      .filter((e) => eventIds.has(e.from) && eventIds.has(e.to))
      .filter((e) => e.type === 'causes' || e.type === 'secret')
      .map((e) => {
        const meta = EDGE_META[e.type];
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          type: 'smoothstep',
          label: e.type === 'secret' ? '伏笔' : '',
          labelStyle: { fill: '#c9a227', fontSize: 9 },
          labelBgStyle: { fill: 'rgba(13,10,8,0.9)' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          style: {
            stroke: meta.color,
            strokeWidth: e.type === 'secret' ? 1.2 : 1.5,
            strokeDasharray: e.type === 'secret' ? '4 4' : undefined,
            opacity: 0.75,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: meta.color, width: 13, height: 13 },
          zIndex: 1,
        };
      });
    return { nodes: [...bandNodes, ...laneLabels, ...eventNodes], edges };
  }, [project, lanes, pos]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(nodes);
  useEffect(() => setRfNodes(nodes), [nodes, setRfNodes]);

  const focusCurrent = (duration = 0) => {
    const ch = project.chapters.find((c) => c.number === chapter);
    const xs = (ch?.eventIds ?? []).map((id) => pos[id]?.x ?? 0).filter((x) => x > 0);
    if (xs.length === 0) return;
    const x = Math.min(...xs);
    rf.current?.setViewport({ x: 240 - x * ZOOM, y: 110, zoom: ZOOM }, { duration });
  };

  useEffect(() => {
    if (playing) focusCurrent(700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, playing]);

  const written = project.cards.filter(
    (c) => c.type === 'event' && (c.chapter ?? 0) <= chapter,
  ).length;
  const planned = project.cards.filter((c) => c.type === 'event').length - written;

  return (
    <div className="chronicle-root">
      <div className="chronicle-toolbar">
        <span className="chronicle-title">事件流 · 编年</span>
        <span className="chronicle-sub">
          已写 <b style={{ color: 'var(--brass-2)' }}>{written}</b> · 未写{' '}
          <b style={{ color: 'var(--text-dim)' }}>{planned}</b> · 因果边{' '}
          {project.edges.filter((e) => e.type === 'causes').length}
        </span>
        <div className="lane-legend">
          {lanes.map((l) => (
            <span className="lane-item" key={l.id}>
              <i className="lane-swatch" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <span className="chronicle-sub">拖动 / 滚轮缩放查看时间线</span>
        <button className="ghost-btn" onClick={() => focusCurrent(600)}>
          ◎ 定位当前章
        </button>
        <button
          className="ghost-btn"
          onClick={() => setPlaying(!playing)}
          title="播放时间轴：从第 1 章推进到最后一章"
        >
          {playing ? '❚❚ 暂停回放' : '▶ 时间轴回放'}
        </button>
        <select
          className="select-mini"
          value={chapter}
          onChange={(e) => setChapter(Number(e.target.value))}
        >
          {project.chapters.map((c) => (
            <option key={c.id} value={c.number}>
              第 {c.number} 章 · {c.title}
            </option>
          ))}
        </select>
      </div>
      <div className="chronicle-canvas">
        <ReactFlow
          nodes={rfNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            rf.current = instance;
          }}
          defaultViewport={{ x: 170, y: 110, zoom: ZOOM }}
          minZoom={0.2}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
        >
          <Background
            variant={BackgroundVariant.Lines}
            gap={48}
            size={1}
            color="rgba(201,162,39,0.07)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
