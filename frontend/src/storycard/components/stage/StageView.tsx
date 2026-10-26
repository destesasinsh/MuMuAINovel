import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesState,
  type Edge as RFEdge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import clsx from 'clsx';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { regionLevelNodes, stageEdges, worldLevelNodes } from './build';
import { CharacterNode, LocationNode, RegionNode } from './nodes';
import { countsByType, eventsOfChapter } from '../../utils/helpers';

const nodeTypes = {
  region: RegionNode,
  location: LocationNode,
  character: CharacterNode,
} as unknown as NodeTypes;

export default function StageView() {
  const project = useProjectStore((s) => s.project);
  const rev = useProjectStore((s) => s.rev);
  const stageLevel = useUIStore((s) => s.stageLevel);
  const activeRegionId = useUIStore((s) => s.activeRegionId);
  const chapter = useUIStore((s) => s.chapter);
  const setStageLevel = useUIStore((s) => s.setStageLevel);
  const select = useUIStore((s) => s.select);

  const worldCard = project.cards.find((c) => c.type === 'world');
  const activeRegion = project.cards.find((c) => c.id === activeRegionId);
  const regionLocations = project.cards.filter(
    (c) => c.type === 'location' && (!activeRegionId || c.meta.regionId === activeRegionId),
  );

  const levelKey = `${stageLevel}:${activeRegionId ?? 'world'}`;

  return (
    <div className="stage-root">
      <div className="stage-backdrop" />
      <div className="stage-watermark">
        {stageLevel === 'world' ? worldCard?.name ?? project.title : activeRegion?.name ?? ''}
      </div>

      <StageCanvas
        key={levelKey}
        levelKey={levelKey}
        stageLevel={stageLevel}
        activeRegionId={activeRegionId}
        chapter={chapter}
        rev={rev}
        onBack={() => setStageLevel('world', null)}
        onSelect={select}
      />

      <div className="stage-breadcrumb">
        {stageLevel === 'region' ? (
          <>
            <button className="crumb-back" onClick={() => setStageLevel('world', null)}>
              ← 世界
            </button>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{activeRegion?.name ?? '区域'}</span>
          </>
        ) : (
          <span className="crumb-active">{worldCard?.name ?? project.title} · 世界概览</span>
        )}
      </div>

      <div className="stage-hud">
        {stageLevel === 'world' ? (
          <>
            <div className="hud-kicker">世界卡 · WORLD</div>
            <h2 className="hud-title">{worldCard?.name ?? project.title}</h2>
            <div className="hud-premise">{worldCard?.oneLiner ?? project.premise}</div>
            <div className="hud-stats">
              <span className="hud-chip">
                卡牌 <b>{project.cards.length}</b>
              </span>
              <span className="hud-chip">
                关联 <b>{project.edges.length}</b>
              </span>
              <span className="hud-chip">
                链 <b>{project.chains.length}</b>
              </span>
              <span className="hud-chip">
                章 <b>{project.chapters.length}</b>
              </span>
            </div>
            <div className="hud-legend">
              {countsByType(project.cards).map((t) => (
                <span className="legend-item" key={t.type}>
                  <i className="legend-dot" style={{ background: t.color }} />
                  {t.label} {t.count}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hud-kicker">区域卡 · REGION</div>
            <h2 className="hud-title">{activeRegion?.name ?? '区域'}</h2>
            <div className="hud-premise">{activeRegion?.oneLiner}</div>
            <div className="hud-stats">
              <span className="hud-chip">
                地点 <b>{regionLocations.length}</b>
              </span>
              <span className="hud-chip">
                本章事件 <b>{eventsOfChapter(project, chapter).length}</b>
              </span>
              <span className="hud-chip">
                危险 <b>{String(activeRegion?.fields.danger ?? '-')}</b>
              </span>
            </div>
            <div className="hud-legend">
              <span className="legend-item">
                控制：{String(activeRegion?.fields.control ?? '—')}
              </span>
            </div>
            <div className="hud-legend" style={{ display: 'block', lineHeight: 1.7 }}>
              {String(activeRegion?.fields.sensory ?? '').slice(0, 70)}
            </div>
          </>
        )}
      </div>

      <div className="stage-hint">
        {stageLevel === 'world'
          ? '拖拽区域可整理版面 · 点击「进入区域」看棋盘'
          : '把人物卡拖到地点上 = 生成一张移动事件 · 点击地点/人物可编辑'}
      </div>
    </div>
  );
}

function StageCanvas({
  stageLevel,
  activeRegionId,
  chapter,
  rev,
  onSelect,
}: {
  levelKey: string;
  stageLevel: 'world' | 'region';
  activeRegionId: string | null;
  chapter: number;
  rev: number;
  onBack: () => void;
  onSelect: (id: string | null) => void;
}) {
  const project = useProjectStore((s) => s.project);
  const patchCard = useProjectStore((s) => s.patchCard);
  const setMovePrompt = useUIStore((s) => s.setMovePrompt);
  const setStageLevel = useUIStore((s) => s.setStageLevel);
  const toast = useUIStore((s) => s.toast);
  const [dragging, setDragging] = useState(false);
  const rf = useRef<ReactFlowInstance | null>(null);

  const built = useMemo(() => {
    if (stageLevel === 'world') {
      return {
        nodes: worldLevelNodes(project),
        edges: stageEdges(project, 'world', null),
      };
    }
    return {
      nodes: regionLevelNodes(project, activeRegionId, chapter),
      edges: stageEdges(project, 'region', activeRegionId),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, stageLevel, activeRegionId, chapter, rev]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(built.nodes);
  const [edges, setEdges] = useState<RFEdge[]>(built.edges);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  useEffect(() => {
    const timer = setTimeout(() => {
      rf.current?.fitView({ padding: 0.06, maxZoom: 1.55, duration: 480 });
    }, 80);
    return () => clearTimeout(timer);
  }, [chapter]);

  return (
    <div className={clsx('stage-canvas', dragging && 'is-dragging')}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          rf.current = instance;
        }}
        fitView
        fitViewOptions={{ padding: 0.06, maxZoom: 1.55 }}
        minZoom={0.25}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        onNodeDragStart={() => setDragging(true)}
        onNodeDragStop={(_, node) => {
          setDragging(false);
          if (node.type === 'character') {
            const locs = built.nodes
              .filter((n) => n.type === 'location')
              .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y + 60 }));
            const threshold = 210;
            let best: { id: string; d: number } | null = null;
            for (const loc of locs) {
              const d = Math.hypot(loc.x - node.position.x, loc.y - node.position.y);
              if (!best || d < best.d) best = { id: loc.id, d };
            }
            if (best && best.d <= threshold) {
              const ch = project.chapters.find((c) => c.number === chapter);
              const from = ch?.locations[node.id];
              if (from === best.id) {
                setNodes(built.nodes);
                return;
              }
              setMovePrompt({
                characterId: node.id,
                locationId: best.id,
                fromLocationId: from,
                chapterNumber: chapter,
              });
            } else {
              toast('要放到某个地点上才会生成移动事件', 'warn');
              setNodes(built.nodes);
            }
            return;
          }
          // 区域/地点：把新位置写回卡牌
          patchCard(node.id, {
            meta: {
              ...(project.cards.find((c) => c.id === node.id)?.meta ?? {}),
              x: Math.round(node.position.x),
              y: Math.round(node.position.y),
            },
          });
        }}
        onNodeClick={(_, node) => {
          if (node.type === 'region') {
            setStageLevel('region', node.id);
            return;
          }
          onSelect(node.id);
        }}
        onPaneClick={() => onSelect(null)}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1}
          color="rgba(201,162,39,0.16)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
