import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { CardType, PlanOp } from '../../types';
import { CARD_META, CARD_TYPE_ORDER } from '../../types';
import { isAiPlanningEnabled, setAiPlanningEnabled } from '../../ai';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Modal } from '../common/UI';

/* ---------------- 移动确认 ---------------- */
export function MoveConfirmModal() {
  const prompt = useUIStore((s) => s.movePrompt);
  const setPrompt = useUIStore((s) => s.setMovePrompt);
  const project = useProjectStore((s) => s.project);
  const moveCharacter = useProjectStore((s) => s.moveCharacter);
  const select = useUIStore((s) => s.select);
  const setPulse = useUIStore((s) => s.setPulse);
  const toast = useUIStore((s) => s.toast);

  const char = project.cards.find((c) => c.id === prompt?.characterId);
  const to = project.cards.find((c) => c.id === prompt?.locationId);
  const from = project.cards.find((c) => c.id === prompt?.fromLocationId);

  if (!prompt || !char || !to) {
    return (
      <Modal open={false} onClose={() => setPrompt(null)} title="">
        <div />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={() => setPrompt(null)}
      title="生成一张移动事件？"
      subtitle="舞台上的拖拽不会直接改数据，而是落成一张事件卡"
      width={480}
      footer={
        <>
          <button className="btn-ink ghost" onClick={() => setPrompt(null)}>
            取消
          </button>
          <button
            className="btn-ink primary"
            onClick={() => {
              const eventId = moveCharacter(prompt.characterId, prompt.locationId, prompt.chapterNumber);
              setPrompt(null);
              if (eventId) {
                select(eventId);
                setPulse(eventId);
                setTimeout(() => setPulse(null), 1400);
                toast(`已生成事件：${char.name} 前往 ${to.name}`, 'success');
              }
            }}
          >
            确认并生成事件
          </button>
        </>
      }
    >
      <div className="plan-summary">
        <b>{char.name}</b> 将从 <b>{from?.name ?? '当前位置'}</b> 移动到 <b>{to.name}</b>。
        <br />
        系统会：① 新增一张移动事件卡（第 {prompt.chapterNumber} 章）；② 更新第{' '}
        {prompt.chapterNumber} 章起的位置快照；③ 可随时撤销。
      </div>
      <div className="plan-meta">
        <span className="plan-meta-chip">事件卡 · 自动生成</span>
        <span className="plan-meta-chip">状态：已规划</span>
        <span className="plan-meta-chip">可撤销 Ctrl+Z</span>
      </div>
    </Modal>
  );
}

/* ---------------- 删除确认 ---------------- */
export function DeleteConfirmModal() {
  const deleteId = useUIStore((s) => s.deleteId);
  const setDeleteId = useUIStore((s) => s.setDeleteId);
  const project = useProjectStore((s) => s.project);
  const deleteCard = useProjectStore((s) => s.deleteCard);
  const select = useUIStore((s) => s.select);
  const toast = useUIStore((s) => s.toast);
  const card = project.cards.find((c) => c.id === deleteId);
  const refs = card ? project.edges.filter((e) => e.from === card.id || e.to === card.id).length : 0;

  return (
    <Modal
      open={Boolean(card)}
      onClose={() => setDeleteId(null)}
      title="删除这张卡？"
      subtitle="会同时清除与它相连的所有关系"
      width={440}
      footer={
        <>
          <button className="btn-ink ghost" onClick={() => setDeleteId(null)}>
            取消
          </button>
          <button
            className="btn-ink danger"
            onClick={() => {
              if (!card) return;
              deleteCard(card.id);
              select(null);
              setDeleteId(null);
              toast(`已删除《${card.name}》，可用 Ctrl+Z 恢复`, 'info');
            }}
          >
            删除
          </button>
        </>
      }
    >
      <div className="plan-summary">
        <b>{card?.name}</b>
        <br />
        这张卡关联了 <b>{refs}</b> 条边，删除后会一并清除；章节里的位置/参与者引用也会被清理。
      </div>
    </Modal>
  );
}

/* ---------------- 新建卡牌 ---------------- */
export function NewCardModal() {
  const open = useUIStore((s) => s.newCardOpen);
  const setOpen = useUIStore((s) => s.setNewCardOpen);
  const project = useProjectStore((s) => s.project);
  const addCard = useProjectStore((s) => s.addCard);
  const select = useUIStore((s) => s.select);
  const activeRegionId = useUIStore((s) => s.activeRegionId);
  const toast = useUIStore((s) => s.toast);

  const [type, setType] = useState<CardType>('character');
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState(activeRegionId ?? '');
  const [chapter, setChapter] = useState(1);

  useEffect(() => {
    if (open) {
      setName('');
      setRegionId(activeRegionId ?? project.cards.find((c) => c.type === 'region')?.id ?? '');
    }
  }, [open, activeRegionId, project.cards]);

  const create = () => {
    const finalName = name.trim() || `${CARD_META[type].label}卡`;
    const regions = project.cards.filter((c) => c.type === 'region');
    const extra: Record<string, unknown> = {};
    if (type === 'location') {
      const rid = regionId || regions[0]?.id;
      if (!rid) {
        toast('先创建一个区域卡', 'warn');
        return;
      }
      const count = project.cards.filter(
        (c) => c.type === 'location' && c.meta.regionId === rid,
      ).length;
      extra.meta = { regionId: rid, x: 260 + (count % 3) * 300, y: 160 + Math.floor(count / 3) * 220 };
    }
    if (type === 'region') {
      extra.meta = { x: 200 + Math.random() * 300, y: 200 + Math.random() * 160 };
    }
    if (type === 'event') {
      const maxOrder = Math.max(0, ...project.cards.filter((c) => c.type === 'event').map((e) => e.order ?? 0));
      extra.chapter = chapter;
      extra.order = maxOrder + 1;
      extra.status = 'planned';
      extra.meta = { regionId: activeRegionId ?? undefined };
    }
    const id = addCard(type, finalName, extra as never);
    select(id);
    setOpen(false);
    toast(`已新建${CARD_META[type].label}卡《${finalName}》`, 'success');
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="新建卡牌"
      subtitle="选一个类型，再给它一个名字"
      width={640}
      footer={
        <>
          <button className="btn-ink ghost" onClick={() => setOpen(false)}>
            取消
          </button>
          <button className="btn-ink primary" onClick={create}>
            创建
          </button>
        </>
      }
    >
      <div className="type-grid">
        {CARD_TYPE_ORDER.map((t) => (
          <button
            key={t}
            className={clsx('type-option', type === t && 'on')}
            onClick={() => setType(t)}
          >
            <span
              className="tp-glyph"
              style={{ background: `linear-gradient(150deg, ${CARD_META[t].color}, ${CARD_META[t].color}bb)` }}
            >
              {CARD_META[t].glyph}
            </span>
            <span className="tp-name">{CARD_META[t].label}</span>
            <span className="tp-blurb">{CARD_META[t].blurb}</span>
          </button>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 14 }}>
        <label>名称</label>
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`给这张${CARD_META[type].label}卡起个名字`}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
      </div>
      {type === 'location' && (
        <div className="form-row">
          <label>所属区域</label>
          <select className="form-input" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {project.cards
              .filter((c) => c.type === 'region')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {type === 'event' && (
        <div className="form-row">
          <label>落在哪一章</label>
          <select className="form-input" value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>
            {project.chapters.map((c) => (
              <option key={c.id} value={c.number}>
                第 {c.number} 章 · {c.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- AI 计划 ---------------- */
export function PlanModal() {
  const plan = useUIStore((s) => s.plan);
  const setPlan = useUIStore((s) => s.setPlan);
  const applyPlan = useProjectStore((s) => s.applyPlan);
  const select = useUIStore((s) => s.select);
  const setPulse = useUIStore((s) => s.setPulse);
  const toast = useUIStore((s) => s.toast);
  const project = useProjectStore((s) => s.project);
  const [ops, setOps] = useState<PlanOp[]>([]);

  useEffect(() => {
    setOps(plan?.ops.map((o) => ({ ...o })) ?? []);
  }, [plan]);

  const checkedCount = ops.filter((o) => o.checked).length;

  return (
    <Modal
      open={Boolean(plan)}
      onClose={() => setPlan(null)}
      width={720}
      title={plan?.title ?? 'AI 计划'}
      subtitle={
        plan?.mode === 'report'
          ? '只读分析 · 不会修改任何数据'
          : `${plan?.scopeLabel ?? ''} · 将修改 ${checkedCount}/${ops.length} 项`
      }
      footer={
        plan?.mode === 'report' ? (
          <button className="btn-ink primary" onClick={() => setPlan(null)}>
            知道了
          </button>
        ) : (
          <>
            <button className="btn-ink ghost" onClick={() => setPlan(null)}>
              取消
            </button>
            <button
              className="btn-ink primary"
              disabled={checkedCount === 0}
              onClick={() => {
                const count = applyPlan(ops);
                const first = ops.find((o) => o.checked);
                setPlan(null);
                if (first) {
                  select(first.cardId);
                  setPulse(first.cardId);
                  setTimeout(() => setPulse(null), 1400);
                }
                toast(`已应用 ${count} 项修改（可 Ctrl+Z 撤销）`, 'success');
              }}
            >
              应用选中的 {checkedCount} 项
            </button>
          </>
        )
      }
    >
      {plan?.mode === 'report' ? (
        <div className="plan-report">
          <div className="plan-summary">{plan.summary}</div>
          {plan.report?.map((r) => (
            <div className="plan-report-row" key={r.label}>
              <b>{r.label}</b>
              <span>{r.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="plan-summary">{plan?.summary}</div>
          {plan?.impact && plan.impact.length > 0 && (
            <div className="plan-meta">
              {plan.impact.map((i) => (
                <span className="plan-meta-chip" key={i.label}>
                  {i.label}：{i.value}
                </span>
              ))}
            </div>
          )}
          <div className="plan-list">
            {ops.map((op) => {
              const card = project.cards.find((c) => c.id === op.cardId);
              return (
                <div className={clsx('plan-item', !op.checked && 'unchecked')} key={op.id}>
                  <label className="plan-item-head">
                    <input
                      type="checkbox"
                      className="plan-check"
                      checked={op.checked}
                      onChange={(e) =>
                        setOps((prev) =>
                          prev.map((x) => (x.id === op.id ? { ...x, checked: e.target.checked } : x)),
                        )
                      }
                    />
                    <span className="plan-card-name">{card?.name ?? op.cardId}</span>
                    <span className="plan-field">{op.fieldLabel}</span>
                    <span className={clsx('plan-risk', op.risk)}>
                      {op.risk === 'low' ? '低风险' : op.risk === 'medium' ? '创意改动' : '高风险'}
                    </span>
                  </label>
                  <div className="plan-diff">
                    {op.before && <div className="diff-line before">{op.before}</div>}
                    <div className="diff-line after">{op.after}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------------- 设置 ---------------- */
export function SettingsModal({
  aiReady,
  onLoadSample,
  onImportClassic,
}: {
  aiReady: boolean;
  onLoadSample: () => void;
  onImportClassic: (overwrite: boolean) => void;
}) {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const toast = useUIStore((s) => s.toast);
  const [aiPlan, setAiPlan] = useState(isAiPlanningEnabled());
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}-storycards.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出项目 JSON', 'success');
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.cards) || !Array.isArray(data.edges) || !Array.isArray(data.chapters)) {
        throw new Error('bad shape');
      }
      const current = useProjectStore.getState().project;
      setProject({
        ...data,
        version: data.version ?? 1,
        projectId: current.projectId,
        revision: current.revision,
        creationMode: 'storycard',
        title: data.title || current.title,
        genre: current.genre || data.genre || '',
        theme: current.theme || data.theme || '',
        premise: current.premise || data.premise || '',
        chains: Array.isArray(data.chains) ? data.chains : [],
      });
      toast('项目 JSON 已导入，正在保存', 'success');
      setOpen(false);
    } catch {
      toast('导入失败：不是有效的项目 JSON', 'warn');
    }
  };

  const applyAiPlan = (value: boolean) => {
    setAiPlan(value);
    setAiPlanningEnabled(value);
    toast(value ? '指令规划已切换到 AI 模型' : '指令规划已切换到本地规则', 'info');
  };

  const importClassic = () => {
    if (project.cards.length > 1 && !window.confirm('导入会覆盖当前工作区的卡牌、边、链与章节，确定继续？')) return;
    onImportClassic(project.cards.length > 1);
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="设置"
      subtitle="AI 能力 · 项目数据 · 模式切换"
      width={620}
      footer={
        <button className="btn-ink primary" onClick={() => setOpen(false)}>
          完成
        </button>
      }
    >
      <div className="form-row">
        <label>AI 状态</label>
        <div className={`settings-status ${aiReady ? 'ready' : ''}`}>
          <span className={`save-dot ${aiReady ? 'saved' : 'idle'}`} />
          {aiReady
            ? '已配置 MuMuAINovel「API 设置」中的 AI Key；调用失败会自动回退本地 Mock'
            : '未配置 AI Key。字段级 AI 使用本地 Mock，仍可完整体验流程'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn-ink ghost" onClick={() => window.open('/settings', '_blank')}>
            打开 API 设置
          </button>
          <button className="btn-ink ghost" onClick={() => { setOpen(false); window.location.href = `/project/${project.projectId}/chapters`; }}>
            返回原模式项目
          </button>
        </div>
      </div>

      <div className="form-row">
        <label>底部指令规划</label>
        <div className="form-seg">
          <button className={clsx(!aiPlan && 'on')} onClick={() => applyAiPlan(false)}>
            本地规则（稳定）
          </button>
          <button className={clsx(aiPlan && 'on')} disabled={!aiReady} onClick={() => applyAiPlan(true)}>
            AI 模型（实验）
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 4, lineHeight: 1.6 }}>
          本地规则负责改名、巡检等确定性操作；AI 模型更适合“给所有反派补一条恐惧”这类创意批量。
          无论哪种，都会先出计划、逐张勾选后才写回。
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 8 }}>
        <label>项目数据</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ink ghost" onClick={exportJson}>
            导出 JSON
          </button>
          <button className="btn-ink ghost" onClick={() => fileRef.current?.click()}>
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.target.value = '';
            }}
          />
          <button className="btn-ink ghost" onClick={importClassic}>
            从原模式导入
          </button>
          <button
            className="btn-ink ghost"
            onClick={() => {
              if (!project.cards.length || window.confirm('示例会覆盖当前工作区，确定继续？')) {
                onLoadSample();
                setOpen(false);
              }
            }}
          >
            载入示例《苍梧卷》
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.7 }}>
          JSON 结构就是后端落库契约：cards / edges / chains / chapters。
          也可以把原模式的世界、人物、关系、大纲、章节、伏笔一键转成卡牌。
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- 帮助 ---------------- */
export function HelpModal() {
  const open = useUIStore((s) => s.helpOpen);
  const setOpen = useUIStore((s) => s.setHelpOpen);
  const setView = useUIStore((s) => s.setView);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="故事卡牌模式 · 三分钟上手"
      subtitle="数据已接入项目后端：卡牌、关联、链、章节快照都会自动保存"
      width={720}
      footer={
        <button className="btn-ink primary" onClick={() => setOpen(false)}>
          开始
        </button>
      }
    >
      <div className="help-grid">
        <div className="help-step">
          <b>1 · 舞台：把人物摆上去</b>
          <p>
            顶栏选「舞台」。点击「进入区域」看到地点与人物卡。把林澈拖到另一个地点，
            确认后会自动生成一张「移动事件卡」——位置变化永远是事件，不是手改。
          </p>
        </div>
        <div className="help-step">
          <b>2 · 图鉴：改卡与看关系</b>
          <p>
            切到「图鉴」，卡册按重要度/类型排序；点人物卡，右侧出现编辑面板。
            字段旁的「✦ AI」会调用项目设置里的模型；没配 Key 时自动用本地 Mock。
          </p>
        </div>
        <div className="help-step">
          <b>3 · 编年：看因果与回放</b>
          <p>
            切到「编年」，事件按链分泳道、因果连线。拖动顶栏时间轴，已写事件点亮、未写的是虚线；
            点「时间轴回放」可以从头播放到最后一章。
          </p>
        </div>
        <div className="help-step">
          <b>4 · 指挥：一句话改全库</b>
          <p>
            底部输入「给所有反派补一条恐惧」→ 生成计划 → 逐张 diff 勾选 → 应用。
            改名这类确定性操作走程序，创意类才交给 AI，且永远先给你看计划。
          </p>
        </div>
        <div className="help-step">
          <b>5 · 和原模式的关系</b>
          <p>
            卡牌模式是独立工作台，不覆盖原模式数据；设置里可以「从原模式导入」世界观、人物、关系、大纲、
            章节与伏笔。工作台左上角「←」随时回到原模式项目。
          </p>
        </div>
        <div className="help-step">
          <b>快捷键</b>
          <p>
            <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> 切视图 ·{' '}
            <span className="kbd">/</span> 聚焦指令 · <span className="kbd">Ctrl+S</span> 保存 ·{' '}
            <span className="kbd">Ctrl+Z</span> 撤销 · <span className="kbd">Ctrl+Shift+Z</span> 重做
          </p>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="btn-ink ghost" onClick={() => { setOpen(false); setView('stage'); }}>
          去舞台
        </button>
        <button className="btn-ink ghost" onClick={() => { setOpen(false); setView('chronicle'); }}>
          去编年
        </button>
        <button className="btn-ink ghost" onClick={() => { setOpen(false); setView('codex'); }}>
          去图鉴
        </button>
      </div>
    </Modal>
  );
}
