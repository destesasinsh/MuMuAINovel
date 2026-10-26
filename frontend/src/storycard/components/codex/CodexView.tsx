import { useEffect, useMemo } from 'react';
import {
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Edge as RFEdge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import clsx from 'clsx';
import { CARD_META, CARD_TYPE_ORDER, EDGE_META, type CardType } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { CardShell, Stars } from '../common/UI';
import { MiniNode, ColumnLabelNode } from '../stage/nodes';
import { layoutByType, statusLabel } from '../../utils/helpers';

const nodeTypes = { mini: MiniNode, colLabel: ColumnLabelNode } as unknown as NodeTypes;

export default function CodexView() {
  const project = useProjectStore((s) => s.project);
  const mode = useUIStore((s) => s.codexMode);
  const setMode = useUIStore((s) => s.setCodexMode);
  const type = useUIStore((s) => s.codexType);
  const setType = useUIStore((s) => s.setCodexType);
  const sort = useUIStore((s) => s.codexSort);
  const setSort = useUIStore((s) => s.setCodexSort);
  const query = useUIStore((s) => s.codexQuery);
  const setQuery = useUIStore((s) => s.setCodexQuery);
  const selectedId = useUIStore((s) => s.selectedId);
  const select = useUIStore((s) => s.select);
  const setDeleteId = useUIStore((s) => s.setDeleteId);
  const toast = useUIStore((s) => s.toast);
  const duplicateCard = useProjectStore((s) => s.duplicateCard);

  const filtered = useMemo(() => {
    let list = project.cards;
    if (type !== 'all') list = list.filter((c) => c.type === type);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.oneLiner.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)) ||
          c.aliases.some((a) => a.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    if (sort === 'importance') sorted.sort((a, b) => b.importance - a.importance);
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    else if (sort === 'type')
      sorted.sort((a, b) => CARD_TYPE_ORDER.indexOf(a.type) - CARD_TYPE_ORDER.indexOf(b.type));
    else sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    return sorted;
  }, [project.cards, type, query, sort]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: project.cards.length };
    for (const c of project.cards) map[c.type] = (map[c.type] ?? 0) + 1;
    return map;
  }, [project.cards]);

  const handleDuplicate = (id: string) => {
    const newId = duplicateCard(id);
    if (newId) {
      select(newId);
      toast('已复制一张卡', 'success');
    }
  };

  return (
    <div className="codex-root">
      <div className="codex-toolbar">
        <div className="search-box">
          <span style={{ opacity: 0.5 }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索卡名 / 简介 / 标签…"
          />
        </div>

        <div className="filter-chips">
          <button className={clsx('chip', type === 'all' && 'active')} onClick={() => setType('all')}>
            全部 {counts.all}
          </button>
          {CARD_TYPE_ORDER.map((t) => (
            <button
              key={t}
              className={clsx('chip', type === t && 'active')}
              onClick={() => setType(t as CardType)}
            >
              <i className="dot" style={{ background: CARD_META[t].color }} />
              {CARD_META[t].label} {counts[t] ?? 0}
            </button>
          ))}
        </div>

        <div className="toolbar-spacer" />
        <span className="codex-count">共 {filtered.length} 张</span>

        <select className="select-mini" value={sort} onChange={(e) => setSort(e.target.value as never)}>
          <option value="importance">按重要度</option>
          <option value="type">按类型</option>
          <option value="name">按名称</option>
          <option value="updated">最近更新</option>
        </select>

        <div className="mode-toggle">
          <button className={clsx(mode === 'cards' && 'active')} onClick={() => setMode('cards')}>
            卡册
          </button>
          <button className={clsx(mode === 'graph' && 'active')} onClick={() => setMode('graph')}>
            关系图
          </button>
        </div>
      </div>

      {mode === 'cards' ? (
        <div className="codex-scroll">
          <div className="codex-grid">
            {filtered.map((card, index) => (
              <div
                key={card.id}
                className="codex-tile"
                style={{ ['--i' as string]: index } as React.CSSProperties}
                onClick={() => select(card.id)}
              >
                <CardShell card={card} selected={selectedId === card.id}>
                  <div className="card-main">
                    <h3 className="card-name">{card.name}</h3>
                    <div className="card-sub">{card.oneLiner || card.summary}</div>
                    <div className="card-meta-row">
                      <span className="card-tag">{statusLabel(card)}</span>
                      {card.tags.slice(0, 2).map((tag) => (
                        <span className="card-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="tile-foot">
                      <Stars value={card.importance} />
                      <span style={{ marginLeft: 'auto', fontSize: 9.5, opacity: 0.55 }}>
                        {CARD_META[card.type].label}
                      </span>
                    </div>
                  </div>
                </CardShell>
                <div className="tile-actions">
                  <button
                    className="tile-action"
                    title="复制"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(card.id);
                    }}
                  >
                    ⧉
                  </button>
                  <button
                    className="tile-action danger"
                    title="删除"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(card.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <RelationGraph />
      )}
    </div>
  );
}

function RelationGraph() {
  const project = useProjectStore((s) => s.project);
  const type = useUIStore((s) => s.codexType);
  const select = useUIStore((s) => s.select);

  const { nodes, edges } = useMemo(() => {
    const cards = project.cards.filter((c) =>
      type === 'all' ? c.type !== 'event' : c.type === type,
    );
    const idSet = new Set(cards.map((c) => c.id));
    const pos = layoutByType(cards);
    const nodes: Node[] = cards.map((c) => ({
      id: c.id,
      type: 'mini',
      position: pos[c.id] ?? { x: 0, y: 0 },
      data: { cardId: c.id },
    }));
    // 列标题
    const present = CARD_TYPE_ORDER.filter((t) => cards.some((c) => c.type === t));
    const globalMinY = Math.min(...cards.map((c) => pos[c.id]?.y ?? 0));
    for (const t of present) {
      const list = cards.filter((c) => c.type === t);
      const col = present.indexOf(t);
      nodes.push({
        id: `col-${t}`,
        type: 'colLabel',
        position: { x: col * 330, y: globalMinY - 92 },
        data: { label: CARD_META[t].label, color: CARD_META[t].color, count: list.length },
        draggable: false,
        selectable: false,
        zIndex: 1,
      } as Node);
    }
    const edges: RFEdge[] = project.edges
      .filter((e) => idSet.has(e.from) && idSet.has(e.to))
      .map((e) => {
        const meta = EDGE_META[e.type];
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          type: 'smoothstep',
          label: e.label || meta.label,
          labelStyle: { fill: '#b3a288', fontSize: 9.5 },
          labelBgStyle: { fill: 'rgba(13,10,8,0.86)' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          style: {
            stroke: meta.color,
            strokeWidth: 1.4,
            strokeDasharray: meta.dash || undefined,
            opacity: 0.8,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: meta.color, width: 12, height: 12 },
        };
      });
    return { nodes, edges };
  }, [project, type]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(nodes);
  useEffect(() => setRfNodes(nodes), [nodes, setRfNodes]);

  return (
    <div className="graph-root">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.14 }}
        minZoom={0.15}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        onNodeClick={(_, node) => select(node.id)}
        onPaneClick={() => select(null)}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
