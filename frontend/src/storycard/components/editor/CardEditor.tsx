import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { Card, FieldDef } from '../../types';
import { CARD_META, EDGE_TYPES, EDGE_META } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Stars } from '../common/UI';
import {
  assistField,
  completeCardFields,
  suggestRelations,
} from '../../ai';
import { edgesOf, eventsOfCard, fmtTime, statusLabel } from '../../utils/helpers';

type Suggestion = { field: string; label: string; value: string };

export default function CardEditor() {
  const project = useProjectStore((s) => s.project);
  const selectedId = useUIStore((s) => s.selectedId);
  const select = useUIStore((s) => s.select);
  const setDeleteId = useUIStore((s) => s.setDeleteId);
  const toast = useUIStore((s) => s.toast);

  const beginEdit = useProjectStore((s) => s.beginEdit);
  const endEdit = useProjectStore((s) => s.endEdit);
  const patchCard = useProjectStore((s) => s.patchCard);
  const patchFields = useProjectStore((s) => s.patchFields);
  const mutate = useProjectStore((s) => s.mutate);
  const addEdge = useProjectStore((s) => s.addEdge);
  const deleteEdge = useProjectStore((s) => s.deleteEdge);

  const card = project.cards.find((c) => c.id === selectedId);
  const [ai, setAi] = useState<{ field: string; loading: boolean; value: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [relations, setRelations] = useState<
    { toId: string; toName: string; type: string; label: string; reason: string }[] | null
  >(null);
  const [newRel, setNewRel] = useState({ type: 'relation', to: '' });

  const meta = card ? CARD_META[card.type] : null;
  const relationsOfCard = useMemo(
    () => (card ? edgesOf(project, card.id) : []),
    [project, card],
  );

  if (!card || !meta) return null;

  const startEdit = () => beginEdit(`编辑：${card.name}`);
  const aiDiffFor = (fieldKey: string, current: string, retry: () => void) =>
    ai?.field === fieldKey ? (
      <AiDiff
        loading={ai.loading}
        value={ai.value}
        before={current}
        onAccept={acceptAi}
        onRetry={retry}
        onClose={() => setAi(null)}
      />
    ) : null;
  const commitText = (key: string, value: string) => {
    if (key === 'name') patchCard(card.id, { name: value });
    else if (key === 'oneLiner') patchCard(card.id, { oneLiner: value });
    else if (key === 'summary') patchCard(card.id, { summary: value });
    else if (key === 'body') patchCard(card.id, { body: value });
  };

  const runAi = async (field: FieldDef | { key: string; label: string }, action = '改写') => {
    setAi({ field: field.key, loading: true, value: '' });
    try {
      const value = await assistField(card, field.key, project, action);
      setAi({ field: field.key, loading: false, value });
    } catch {
      setAi(null);
      toast('AI 生成失败，请在设置里检查 API', 'warn');
    }
  };

  const acceptAi = () => {
    if (!ai || !ai.value) return;
    const label = ai.field.startsWith('name:')
      ? 'AI 改写'
      : CARD_META[card.type].fields.find((f) => f.key === ai.field)?.label ?? 'AI 改写';
    mutate(`AI 改写：${card.name} · ${label}`, (draft) => {
      const c = draft.cards.find((x) => x.id === card.id);
      if (!c) return;
      if (ai.field.startsWith('name:')) {
        const key = ai.field.slice(5) as 'name' | 'oneLiner' | 'summary' | 'body';
        c[key] = ai.value;
      } else {
        c.fields[ai.field] = ai.value;
      }
      c.history = [
        ...c.history.slice(-19),
        {
          at: Date.now(),
          field: ai.field,
          fieldLabel: label,
          before: ai.field.startsWith('name:')
            ? String((card as unknown as Record<string, unknown>)[ai.field.slice(5)] ?? '')
            : String(card.fields[ai.field] ?? ''),
          after: ai.value,
        },
      ];
      c.updatedAt = Date.now();
    });
    setAi(null);
    toast('已采纳 AI 修改', 'success');
  };

  const runComplete = async () => {
    const list = await completeCardFields(card, project);
    setSuggestions(list);
  };

  const applySuggestion = (s: Suggestion) => {
    mutate(`AI 补全：${card.name} · ${s.label}`, (draft) => {
      const c = draft.cards.find((x) => x.id === card.id);
      if (!c) return;
      c.fields[s.field] = s.value;
      c.history = [
        ...c.history.slice(-19),
        { at: Date.now(), field: s.field, fieldLabel: s.label, before: String(card.fields[s.field] ?? ''), after: s.value },
      ];
      c.updatedAt = Date.now();
    });
    setSuggestions((prev) => (prev ? prev.filter((x) => x.field !== s.field) : prev));
    toast('已补上一个字段', 'success');
  };

  const runRelations = async () => {
    const list = await suggestRelations(card, project);
    setRelations(list);
  };

  const backlinks = eventsOfCard(project, card.id);
  const chains = project.chains.filter((c) => c.eventIds.includes(card.id));

  return (
    <motion.aside
      className="editor"
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
    >
      <div className="editor-head">
        <div className="editor-kicker">
          <i className="type-dot" style={{ background: meta.color }} />
          {meta.label}卡 · {statusLabel(card)}
        </div>
        <h2 className="editor-title">
          {card.name}
          <span
            className="editor-star"
            onClick={() => {
              const next = card.importance >= 1 ? 0.4 : Math.min(1, card.importance + 0.2);
              mutate('调整重要度', (draft) => {
                const c = draft.cards.find((x) => x.id === card.id);
                if (c) c.importance = Number(next.toFixed(2));
              });
            }}
            title="点击提升重要度"
          >
            <Stars value={card.importance} />
          </span>
        </h2>
        <div className="editor-status">
          {meta.blurb}
          {card.type === 'event' && card.chapter ? ` · 第 ${card.chapter} 章` : ''}
          {card.meta.regionId ? ' · 有区域归属' : ''}
        </div>
        <button className="modal-close editor-close" onClick={() => select(null)} aria-label="关闭">
          ✕
        </button>
      </div>

      <div className="editor-body">
        <section>
          <div className="section-title">基本</div>
          <FieldRow label="名称">
            <input
              className="field-input"
              value={card.name}
              onFocus={startEdit}
              onBlur={endEdit}
              onChange={(e) => commitText('name', e.target.value)}
            />

          </FieldRow>
          <FieldRow label="一句话" onAi={() => runAi({ key: 'name:oneLiner', label: '一句话' })}>
            <input
              className="field-input"
              value={card.oneLiner}
              onFocus={startEdit}
              onBlur={endEdit}
              onChange={(e) => commitText('oneLiner', e.target.value)}
            />
            {aiDiffFor('name:oneLiner', card.oneLiner, () =>
              runAi({ key: 'name:oneLiner', label: '一句话' }, '换一个方向重写'),
            )}
          </FieldRow>
          <FieldRow label="摘要" onAi={() => runAi({ key: 'name:summary', label: '摘要' })}>
            <textarea
              className="field-textarea"
              rows={2}
              value={card.summary}
              onFocus={startEdit}
              onBlur={endEdit}
              onChange={(e) => commitText('summary', e.target.value)}
            />
            {aiDiffFor('name:summary', card.summary, () =>
              runAi({ key: 'name:summary', label: '摘要' }, '换一个方向重写'),
            )}
          </FieldRow>
          <FieldRow label="详述" onAi={() => runAi({ key: 'name:body', label: '详述' })}>
            <textarea
              className="field-textarea"
              rows={3}
              value={card.body}
              onFocus={startEdit}
              onBlur={endEdit}
              onChange={(e) => commitText('body', e.target.value)}
            />
            {aiDiffFor('name:body', card.body, () =>
              runAi({ key: 'name:body', label: '详述' }, '换一个方向重写'),
            )}
          </FieldRow>
          <FieldRow label="标签">
            <input
              className="field-input"
              value={card.tags.join('、')}
              onFocus={startEdit}
              onBlur={endEdit}
              placeholder="用、分隔"
              onChange={(e) =>
                patchCard(card.id, {
                  tags: e.target.value
                    .split(/[、,，\s]+/)
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </FieldRow>
          <FieldRow label="状态">
            <div className="chip-list">
              {meta.statuses.map((s) => (
                <button
                  key={s.value}
                  className={clsx('chip-select', card.status === s.value && 'on')}
                  onClick={() => {
                    mutate('修改状态', (draft) => {
                      const c = draft.cards.find((x) => x.id === card.id);
                      if (c) c.status = s.value;
                    });
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </FieldRow>
        </section>

        <section>
          <div className="section-title">{meta.label}字段</div>
          {meta.fields.map((f) => (
            <FieldRow
              key={f.key}
              label={f.label}
              onAi={() => runAi(f, String(card.fields[f.key] ?? '') ? '改写' : '补全')}
            >
              {f.widget === 'participants' ? (
                <ParticipantsPicker card={card} />
              ) : f.kind === 'select' ? (
                <select
                  className="field-select"
                  value={String(card.fields[f.key] ?? '')}
                  onChange={(e) => {
                    beginEdit(`编辑：${card.name}`);
                    patchFields(card.id, { [f.key]: e.target.value });
                    endEdit();
                  }}
                >
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.kind === 'textarea' ? (
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={String(card.fields[f.key] ?? '')}
                  placeholder={f.placeholder}
                  onFocus={startEdit}
                  onBlur={endEdit}
                  onChange={(e) => patchFields(card.id, { [f.key]: e.target.value })}
                />
              ) : (
                <input
                  className="field-input"
                  value={String(card.fields[f.key] ?? '')}
                  placeholder={f.placeholder}
                  onFocus={startEdit}
                  onBlur={endEdit}
                  onChange={(e) => patchFields(card.id, { [f.key]: e.target.value })}
                />
              )}
              {ai?.field === f.key && (
                <AiDiff
                  loading={ai.loading}
                  value={ai.value}
                  before={String(card.fields[f.key] ?? '')}
                  onAccept={acceptAi}
                  onRetry={() => runAi(f, '换一个方向重写')}
                  onClose={() => setAi(null)}
                />
              )}
            </FieldRow>
          ))}

        </section>

        {suggestions && suggestions.length > 0 && (
          <section>
            <div className="section-title">AI 补全建议</div>
            {suggestions.map((s) => (
              <div className="ai-diff" key={s.field}>
                <div className="ai-diff-head">{s.label}</div>
                <div className="diff-line after">{s.value}</div>
                <div className="diff-actions">
                  <button className="mini-btn primary" onClick={() => applySuggestion(s)}>
                    采纳
                  </button>
                  <button
                    className="mini-btn"
                    onClick={() => setSuggestions((prev) => prev?.filter((x) => x.field !== s.field) ?? null)}
                  >
                    忽略
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {relations && relations.length > 0 && (
          <section>
            <div className="section-title">AI 关联建议</div>
            {relations.map((r) => (
              <div className="ai-diff" key={r.toId + r.label}>
                <div className="ai-diff-head">
                  {r.toName} · {EDGE_META[r.type as keyof typeof EDGE_META]?.label ?? r.type}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{r.reason}</div>
                <div className="diff-actions">
                  <button
                    className="mini-btn primary"
                    onClick={() => {
                      addEdge(card.id, r.toId, r.type as never, r.label);
                      setRelations((prev) => prev?.filter((x) => x.toId !== r.toId) ?? null);
                      toast(`已建立关联：${r.toName}`, 'success');
                    }}
                  >
                    建立关联
                  </button>
                  <button
                    className="mini-btn"
                    onClick={() => setRelations((prev) => prev?.filter((x) => x.toId !== r.toId) ?? null)}
                  >
                    忽略
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section>
          <div className="section-title">关联 · {relationsOfCard.length}</div>
          <div className="relation-list">
            {relationsOfCard.map((e) => {
              const otherId = e.from === card.id ? e.to : e.from;
              const other = project.cards.find((c) => c.id === otherId);
              const em = EDGE_META[e.type];
              return (
                <div className="relation-item" key={e.id}>
                  <span className="rel-type" style={{ color: em.color }}>
                    {e.label || em.label}
                  </span>
                  <span className="rel-target" onClick={() => select(otherId)}>
                    {other?.name ?? otherId}
                  </span>
                  <button className="rel-del" onClick={() => deleteEdge(e.id)} title="删除关联">
                    ✕
                  </button>
                </div>
              );
            })}
            {relationsOfCard.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>还没有关联</div>
            )}
          </div>
          <div className="add-relation">
            <select
              className="field-select"
              value={newRel.type}
              onChange={(e) => setNewRel({ ...newRel, type: e.target.value })}
            >
              {EDGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EDGE_META[t].label}
                </option>
              ))}
            </select>
            <select
              className="field-select"
              value={newRel.to}
              onChange={(e) => setNewRel({ ...newRel, to: e.target.value })}
            >
              <option value="">选择目标卡…</option>
              {project.cards
                .filter((c) => c.id !== card.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {CARD_META[c.type].label} · {c.name}
                  </option>
                ))}
            </select>
            <button
              className="mini-btn"
              disabled={!newRel.to}
              onClick={() => {
                addEdge(card.id, newRel.to, newRel.type as never, '');
                setNewRel({ ...newRel, to: '' });
                toast('已添加关联', 'success');
              }}
            >
              ＋
            </button>
          </div>
        </section>

        {(backlinks.length > 0 || chains.length > 0) && (
          <section>
            <div className="section-title">反向链接</div>
            <div className="chip-list">
              {backlinks.map((ev) => (
                <button key={ev.id} className="chip-select" onClick={() => select(ev.id)}>
                  事件 · {ev.name}
                </button>
              ))}
              {chains.map((ch) => (
                <span key={ch.id} className="chip-select" style={{ cursor: 'default' }}>
                  链 · {ch.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="section-title">版本历史</div>
          <div className="history-list">
            {card.history.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>还没有 AI 或批量修改记录</div>
            )}
            {[...card.history]
              .slice(-6)
              .reverse()
              .map((h, i) => (
                <div
                  className="history-item"
                  key={`${h.at}-${i}`}
                  title="点击回滚"
                  onClick={() => {
                    mutate(`回滚：${card.name} · ${h.fieldLabel}`, (draft) => {
                      const c = draft.cards.find((x) => x.id === card.id);
                      if (!c) return;
                      if (h.field.startsWith('name:')) {
                        (c as unknown as Record<string, string>)[h.field.slice(5)] = h.before;
                      } else {
                        c.fields[h.field] = h.before;
                      }
                      c.updatedAt = Date.now();
                    });
                    toast('已回滚该字段', 'info');
                  }}
                >
                  {fmtTime(h.at)} · <b>{h.fieldLabel}</b> · {h.after.slice(0, 18)}…
                </div>
              ))}
          </div>
        </section>
      </div>

      <div className="editor-foot">
        <button className="ghost-btn" onClick={runComplete}>
          ✦ 补全缺失
        </button>
        <button className="ghost-btn" onClick={runRelations}>
          ✦ 联想关联
        </button>
        <button className="ghost-btn danger" onClick={() => setDeleteId(card.id)}>
          删除
        </button>
      </div>
    </motion.aside>
  );
}

function FieldRow({
  label,
  onAi,
  children,
}: {
  label: string;
  onAi?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="field-row">
      <div className="field-label">
        <span>{label}</span>
        {onAi && (
          <button className="ai-btn" onClick={onAi} title="AI 辅助">
            ✦ AI
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function AiDiff({
  loading,
  value,
  before,
  onAccept,
  onRetry,
  onClose,
}: {
  loading: boolean;
  value: string;
  before: string;
  onAccept: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="ai-diff"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        <div className="ai-diff-head">✦ AI 建议 {loading ? '· 生成中…' : ''}</div>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>正在根据世界观与卡牌上下文起草…</div>
        ) : (
          <>
            {before && <div className="diff-line before">{before}</div>}
            <div className="diff-line after">{value}</div>
            <div className="diff-actions">
              <button className="mini-btn primary" onClick={onAccept}>
                采纳
              </button>
              <button className="mini-btn" onClick={onRetry}>
                换一版
              </button>
              <button className="mini-btn" onClick={onClose}>
                放弃
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ParticipantsPicker({ card }: { card: Card }) {
  const project = useProjectStore((s) => s.project);
  const patchFields = useProjectStore((s) => s.patchFields);
  const beginEdit = useProjectStore((s) => s.beginEdit);
  const endEdit = useProjectStore((s) => s.endEdit);
  const current = Array.isArray(card.fields.participants)
    ? (card.fields.participants as string[])
    : [];
  const characters = project.cards.filter((c) => c.type === 'character');
  return (
    <div className="chip-list">
      {characters.map((c) => {
        const on = current.includes(c.id);
        return (
          <button
            key={c.id}
            className={clsx('chip-select', on && 'on')}
            onClick={() => {
              beginEdit(`编辑：${card.name}`);
              patchFields(card.id, {
                participants: on ? current.filter((id) => id !== c.id) : [...current, c.id],
              });
              endEdit();
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
