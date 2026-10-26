import { Handle, Position } from '@xyflow/react';
import clsx from 'clsx';
import { CARD_META } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { CardShell, Stars } from '../common/UI';
import { eventsOfChapter, statusLabel } from '../../utils/helpers';

type CardNodeData = { cardId: string };

export function RegionNode({ data }: { data: CardNodeData }) {
  const project = useProjectStore((s) => s.project);
  const selected = useUIStore((s) => s.selectedId === data.cardId);
  const pulse = useUIStore((s) => s.pulseCardId === data.cardId);
  const select = useUIStore((s) => s.select);
  const setStageLevel = useUIStore((s) => s.setStageLevel);
  const card = project.cards.find((c) => c.id === data.cardId);
  if (!card) return null;
  const danger = Number(card.fields.danger ?? 0);
  const locations = project.cards.filter(
    (c) => c.type === 'location' && c.meta.regionId === card.id,
  );
  const regionEvents = project.cards.filter(
    (c) => c.type === 'event' && c.meta.regionId === card.id,
  );
  return (
    <CardShell
      card={card}
      selected={selected}
      pulse={pulse}
      className="node-region"
      onClick={() => select(card.id)}
    >
      <div className="card-main">
        <h3 className="card-name">{card.name}</h3>
        <div className="card-sub">{card.oneLiner}</div>
        <div className="card-meta-row">
          <span className="card-tag">{String(card.fields.regionType ?? '区域')}</span>
          <span className="card-tag">控制：{String(card.fields.control ?? '—')}</span>
          <span className="card-tag" style={{ display: 'inline-flex', alignItems: 'center' }}>
            危险
            <span className="danger-pips">
              {Array.from({ length: 10 }).map((_, i) => (
                <i key={i} className={clsx('danger-pip', i < danger && 'on')} />
              ))}
            </span>
          </span>
          <span className="card-tag">
            {locations.length} 地点 · {regionEvents.length} 事件
          </span>
        </div>
      </div>
      <button
        className="region-enter"
        onClick={(e) => {
          e.stopPropagation();
          setStageLevel('region', card.id);
        }}
      >
        进入区域 · 看棋盘 →
      </button>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </CardShell>
  );
}

export function LocationNode({ data }: { data: CardNodeData }) {
  const project = useProjectStore((s) => s.project);
  const chapter = useUIStore((s) => s.chapter);
  const selected = useUIStore((s) => s.selectedId === data.cardId);
  const pulse = useUIStore((s) => s.pulseCardId === data.cardId);
  const select = useUIStore((s) => s.select);
  const card = project.cards.find((c) => c.id === data.cardId);
  if (!card) return null;
  const events = eventsOfChapter(project, chapter).filter(
    (e) => e.meta.locationId === card.id,
  );
  const sensory = String(card.fields.sensory ?? '');
  return (
    <CardShell
      card={card}
      selected={selected}
      pulse={pulse}
      className="node-location"
      onClick={() => select(card.id)}
    >
      <div className="loc-head">
        <span className="loc-name">{card.name}</span>
        <span className="loc-kind">{String(card.fields.kind ?? '')}</span>
      </div>
      <div className="loc-body">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="event-chip"
            onClick={(e) => {
              e.stopPropagation();
              select(ev.id);
            }}
          >
            <span>◈</span>
            <span>{ev.name}</span>
            <span className="tension">T{String(ev.fields.tension ?? '-')}</span>
          </div>
        ))}
        {events.length === 0 && <div className="loc-empty">本章暂无事件</div>}
        <div className="loc-sensory" title={sensory}>
          {sensory.slice(0, 24)}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </CardShell>
  );
}

export function CharacterNode({ data }: { data: CardNodeData }) {
  const project = useProjectStore((s) => s.project);
  const selected = useUIStore((s) => s.selectedId === data.cardId);
  const pulse = useUIStore((s) => s.pulseCardId === data.cardId);
  const pov = useUIStore((s) => s.pov);
  const select = useUIStore((s) => s.select);
  const card = project.cards.find((c) => c.id === data.cardId);
  if (!card) return null;
  const arcStage = String(card.fields.arc ?? '起');
  const arcIndex = ['起', '承', '转', '合'].indexOf(arcStage);
  const faded = Boolean(pov) && pov !== card.id;
  return (
    <CardShell
      card={card}
      selected={selected}
      pulse={pulse}
      className={clsx('node-character', faded && 'is-faded', pov === card.id && 'pov-focus')}
      onClick={() => select(card.id)}
    >
      <div className="card-main">
        <h3 className="card-name">{card.name}</h3>
        <div className="card-meta-row">
          <span className="char-role">
            {String(card.fields.role ?? '人物')} · {statusLabel(card)}
          </span>
          <span className="char-arc" title={`弧光：${arcStage}`}>
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={clsx('arc-cell', i <= arcIndex && 'on')} />
            ))}
          </span>
        </div>
        <Stars value={card.importance} />
      </div>
    </CardShell>
  );
}

export function MiniNode({ data }: { data: CardNodeData }) {
  const project = useProjectStore((s) => s.project);
  const meta = CARD_META;
  const selected = useUIStore((s) => s.selectedId === data.cardId);
  const select = useUIStore((s) => s.select);
  const card = project.cards.find((c) => c.id === data.cardId);
  if (!card) return null;
  return (
    <CardShell card={card} selected={selected} className="node-mini" onClick={() => select(card.id)}>
      <div className="card-main">
        <h3 className="card-name">{card.name}</h3>
        <div className="card-sub">{card.oneLiner}</div>
        <div className="card-meta-row">
          <span className="card-tag">{meta[card.type].label}</span>
          <span className="card-tag">{statusLabel(card)}</span>
          <Stars value={card.importance} />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </CardShell>
  );
}

export function EventFlowNode({ data }: { data: CardNodeData }) {
  const project = useProjectStore((s) => s.project);
  const chapter = useUIStore((s) => s.chapter);
  const selected = useUIStore((s) => s.selectedId === data.cardId);
  const select = useUIStore((s) => s.select);
  const card = project.cards.find((c) => c.id === data.cardId);
  if (!card) return null;
  const isFuture = (card.chapter ?? 0) > chapter;
  const isCurrent = card.chapter === chapter;
  const tension = Number(card.fields.tension ?? 0);
  const delta = String(card.fields.delta ?? '');
  const chain = project.chains.find((c) => (card.chainIds ?? []).includes(c.id));
  const accent = chain?.color ?? CARD_META.event.color;
  return (
    <div
      className={clsx('node-shell', 'node-event', selected && 'selected', isFuture && 'is-future', isCurrent && 'is-current')}
      onClick={() => select(card.id)}
    >
      <div
        className="card-frame"
        style={{ ['--type-color' as string]: accent } as React.CSSProperties}
      >
        <div className="card-ribbon">
          <span>幕</span>
        </div>
        <div className="event-order">
          #{card.order ?? '?'} · {card.chapter ? `第${card.chapter}章` : '未归章'}
        </div>
        <div className="card-main">
          <h3 className="card-name">{card.name}</h3>
          <div className="card-meta-row">
            <span className="card-tag">{String(card.fields.beat ?? '节拍')}</span>
            <span className="tension-bar" title={`紧张度 ${tension}/10`}>
              {Array.from({ length: 10 }).map((_, i) => (
                <i key={i} className={clsx('tension-cell', i < tension && 'on')} />
              ))}
            </span>
          </div>
          <div className="event-delta">{delta || card.oneLiner}</div>
        </div>
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      </div>
    </div>
  );
}

export function ColumnLabelNode({
  data,
}: {
  data: { label: string; color: string; count: number };
}) {
  return (
    <div className="col-label">
      <i style={{ background: data.color }} />
      {data.label}
      <span>{data.count}</span>
    </div>
  );
}

export function BandNode({
  data,
}: {
  data: { number: number; title: string; summary: string };
}) {
  const chapter = useUIStore((s) => s.chapter);
  return (
    <div
      className={clsx('band-box', data.number === chapter && 'is-current')}
      style={{ width: '100%', height: '100%' }}
    >
      <div className="band-label">第 {data.number} 章 · {data.title}</div>
      <div className="band-sub">{data.summary.slice(0, 34)}</div>
    </div>
  );
}
