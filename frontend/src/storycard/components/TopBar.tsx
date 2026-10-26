import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useProjectStore } from '../store/projectStore';
import { useUIStore, type ViewMode } from '../store/uiStore';
import { useSaveStatus } from '../store/saveStore';

const VIEWS: { key: ViewMode; label: string; icon: string }[] = [
  { key: 'stage', label: '舞台', icon: '◈' },
  { key: 'codex', label: '图鉴', icon: '❏' },
  { key: 'chronicle', label: '编年', icon: '☲' },
];

export default function TopBar() {
  const project = useProjectStore((s) => s.project);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);

  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const chapter = useUIStore((s) => s.chapter);
  const setChapter = useUIStore((s) => s.setChapter);
  const playing = useUIStore((s) => s.playing);
  const setPlaying = useUIStore((s) => s.setPlaying);
  const pov = useUIStore((s) => s.pov);
  const setPov = useUIStore((s) => s.setPov);
  const setNewCardOpen = useUIStore((s) => s.setNewCardOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setHelpOpen = useUIStore((s) => s.setHelpOpen);
  const saveState = useSaveStatus((s) => s.state);
  const saveMessage = useSaveStatus((s) => s.message);
  const navigate = useNavigate();

  const maxChapter = project.chapters.length;
  const currentChapter = useMemo(
    () => project.chapters.find((c) => c.number === chapter),
    [project.chapters, chapter],
  );
  const characters = project.cards.filter((c) => c.type === 'character');
  const chapterTitle = (currentChapter?.title ?? '')
    .replace(/^第\s*\d+\s*章\s*[·:：\-—]?\s*/, '')
    .trim();

  const setFromRatio = (ratio: number) => {
    const n = Math.max(1, Math.min(maxChapter, Math.round(ratio * (maxChapter - 1)) + 1));
    setChapter(n);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <button
          className="icon-btn brand-back"
          title="返回原模式项目（章节管理）"
          onClick={() => navigate(project.projectId ? `/project/${project.projectId}/chapters` : '/')}
        >
          ←
        </button>
        <div className="brand-mark">{project.title.slice(0, 1) || '卡'}</div>
        <div className="brand-text">
          <div className="brand-title">{project.title}</div>
          <div className="brand-sub">
            STORY CARDS · 卡牌模式
            <span className={`save-dot ${saveState}`} title={saveMessage || '自动保存'} />
            {' · '}
            {saveState === 'saving' ? '保存中' : saveState === 'error' ? '保存失败' : saveState === 'saved' ? '已保存' : '自动保存'}
          </div>
        </div>
      </div>

      <div className="topbar-center">
        <div className="view-tabs">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={clsx('view-tab', view === v.key && 'active')}
              onClick={() => setView(v.key)}
            >
              {view === v.key && (
                <motion.span
                  layoutId="view-pill"
                  className="view-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="view-tab-label">
                <span style={{ marginRight: 6, opacity: 0.7 }}>{v.icon}</span>
                {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-right">
        <div className="timeline" title="章节时间轴：拖动查看不同章节的状态快照">
          <button
            className={clsx('play-btn', playing && 'playing')}
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? '暂停' : '播放'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <div
            className="timeline-track"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setFromRatio((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className="timeline-fill"
              style={{ width: `${((chapter - 1) / Math.max(1, maxChapter - 1)) * 100}%` }}
            />
            <div
              className="timeline-thumb"
              style={{ left: `${((chapter - 1) / Math.max(1, maxChapter - 1)) * 100}%` }}
            />
            <div className="timeline-marks">
              {project.chapters.map((c) => (
                <span key={c.id} className="timeline-mark" />
              ))}
            </div>
          </div>
          <div className="chapter-label">
            第 <strong>{chapter}</strong> 章 · {chapterTitle || '未命名'}
          </div>
        </div>

        <select
          className="pov-select"
          value={pov ?? ''}
          onChange={(e) => setPov(e.target.value || null)}
          title="视角过滤"
        >
          <option value="">上帝视角</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} 视角
            </option>
          ))}
        </select>

        <button className="icon-btn" onClick={undo} disabled={!canUndo} title="撤销 Ctrl+Z">
          ↶
        </button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} title="重做 Ctrl+Shift+Z">
          ↷
        </button>
        <button className="icon-btn" onClick={() => setHelpOpen(true)} title="帮助与快捷键">
          ?
        </button>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="设置">
          ⚙
        </button>
        <button className="primary-btn" onClick={() => setNewCardOpen(true)}>
          ＋ 新建卡牌
        </button>
      </div>
    </header>
  );
}