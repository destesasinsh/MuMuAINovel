import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Spin } from 'antd';
import TopBar from './components/TopBar';
import StageView from './components/stage/StageView';
import CodexView from './components/codex/CodexView';
import ChronicleView from './components/chronicle/ChronicleView';
import CardEditor from './components/editor/CardEditor';
import CommandBar from './components/CommandBar';
import { ToastStack } from './components/common/UI';
import {
  DeleteConfirmModal,
  HelpModal,
  MoveConfirmModal,
  NewCardModal,
  PlanModal,
  SettingsModal,
} from './components/modals/Modals';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { useSaveStatus } from './store/saveStore';
import { setBackendAiAvailable } from './ai';
import { storycardApi, StoryCardApiError } from './api';
import { createSeedProject } from './seed';
import './styles/tokens.scoped.css';
import './styles/app.scoped.css';
import './styles/sandbox.css';

type LoadState = 'loading' | 'ready' | 'error';

export default function StoryCardWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const view = useUIStore((s) => s.view);
  const selectedId = useUIStore((s) => s.selectedId);
  const playing = useUIStore((s) => s.playing);
  const chapter = useUIStore((s) => s.chapter);
  const project = useProjectStore((s) => s.project);
  const setSaveStatus = useSaveStatus((s) => s.setStatus);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [importing, setImporting] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [aiReady, setAiReady] = useState(false);

  const readyRef = useRef(false);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const lastSavedRevisionRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoadState('loading');
    setLoadError('');
    readyRef.current = false;
    try {
      const [workspace, ai] = await Promise.all([
        storycardApi.getWorkspace(projectId),
        storycardApi.getAiStatus().catch(() => null),
      ]);
      const store = useProjectStore.getState();
      store.setProject(workspace);
      lastSavedRevisionRef.current = workspace.revision;
      dirtyRef.current = false;
      setSaveStatus('saved');
      if (ai) {
        setBackendAiAvailable(ai.available);
        setAiReady(ai.available);
      } else {
        setBackendAiAvailable(false);
      }
      const ui = useUIStore.getState();
      ui.setChapter(Math.min(Math.max(1, ui.chapter), Math.max(1, workspace.chapters.length)));
      ui.setView('stage');
      ui.select(null);
      ui.setPlan(null);
      readyRef.current = true;
      setLoadState('ready');
      setOnboardingOpen(workspace.cards.length <= 1);
    } catch (error) {
      const message = error instanceof StoryCardApiError ? error.detail : '无法加载卡牌工作区';
      setLoadError(message);
      setLoadState('error');
    }
  }, [projectId, setSaveStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNow = useCallback(async () => {
    if (!projectId || !readyRef.current) return;
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    const store = useProjectStore.getState();
    if (!dirtyRef.current) return;
    const revision = store.revision;
    savingRef.current = true;
    setSaveStatus('saving');
    try {
      const saved = await storycardApi.saveWorkspace(projectId, store.project, revision);
      lastSavedRevisionRef.current = saved.revision;
      useProjectStore.getState().setRevision(saved.revision);
      dirtyRef.current = false;
      setSaveStatus('saved');
    } catch (error) {
      if (error instanceof StoryCardApiError && error.status === 409) {
        setSaveStatus('error', '工作区已在别处更新，请刷新页面');
        useUIStore.getState().toast('工作区已在别处更新，当前修改尚未保存；请刷新页面', 'warn');
      } else {
        const message = error instanceof Error ? error.message : '保存失败';
        setSaveStatus('error', message);
        useUIStore.getState().toast(`保存失败：${message}`, 'warn');
      }
      // 保留 dirty，用户下一次编辑会再次尝试
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void saveNow();
      }
    }
  }, [projectId, setSaveStatus]);

  // 项目状态变化 → 防抖保存
  useEffect(() => {
    if (loadState !== 'ready') return;
    const unsubscribe = useProjectStore.subscribe((state, previous) => {
      if (!readyRef.current || state.project === previous.project) return;
      dirtyRef.current = true;
      setSaveStatus('idle', '有未保存的修改');
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void saveNow();
      }, 700);
    });
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        window.clearTimeout(timerRef.current);
        void saveNow();
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.clearTimeout(timerRef.current);
      if (dirtyRef.current) void saveNow();
    };
  }, [loadState, saveNow, setSaveStatus]);

  // 时间轴播放
  useEffect(() => {
    if (!playing) return;
    const max = useProjectStore.getState().project.chapters.length;
    const timer = window.setTimeout(() => {
      const ui = useUIStore.getState();
      if (ui.chapter >= max) {
        ui.setPlaying(false);
        return;
      }
      ui.setChapter(ui.chapter + 1);
    }, 1150);
    return () => window.clearTimeout(timer);
  }, [playing, chapter]);

  // 快捷键
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      const ui = useUIStore.getState();
      const store = useProjectStore.getState();

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        ui.focusCommand();
        return;
      }
      if (typing) {
        if (event.key === 'Escape') (target as HTMLInputElement).blur();
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        ui.focusCommand();
      } else if (event.key === '1') ui.setView('stage');
      else if (event.key === '2') ui.setView('codex');
      else if (event.key === '3') ui.setView('chronicle');
      else if (event.key === '?') ui.setHelpOpen(true);
      else if (event.key === 'Escape') {
        ui.setPlan(null);
        ui.setSettingsOpen(false);
        ui.setHelpOpen(false);
        ui.setNewCardOpen(false);
        ui.setMovePrompt(null);
        ui.setDeleteId(null);
        ui.select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const importClassic = async (overwrite: boolean) => {
    if (!projectId) return;
    setImporting(true);
    try {
      const workspace = await storycardApi.importClassic(projectId, overwrite);
      useProjectStore.getState().setProject(workspace);
      lastSavedRevisionRef.current = workspace.revision;
      dirtyRef.current = false;
      setSaveStatus('saved');
      const ui = useUIStore.getState();
      ui.setChapter(Math.min(Math.max(1, ui.chapter), Math.max(1, workspace.chapters.length)));
      setOnboardingOpen(false);
    } catch (error) {
      const message = error instanceof StoryCardApiError ? error.detail : '导入失败';
      window.alert(message);
    } finally {
      setImporting(false);
    }
  };

  const loadSample = async () => {
    const current = useProjectStore.getState();
    const sample = createSeedProject();
    // 示例数据的 id 很短（c1/r1/...），必须按项目命名空间化，
    // 否则同一个示例载入两个项目会撞上全局主键。
    const prefix = `sc-${(project.projectId || 'demo').slice(0, 8)}-`;
    const remap = (id?: string) => (id ? `${prefix}${id}` : id);
    const cards = sample.cards.map((card) => ({
      ...card,
      id: remap(card.id) as string,
      chainIds: (card.chainIds || []).map((id) => remap(id) as string),
      fields: {
        ...card.fields,
        ...(Array.isArray(card.fields.participants)
          ? { participants: (card.fields.participants as string[]).map((id) => remap(id) as string) }
          : {}),
      },
      meta: {
        ...card.meta,
        regionId: remap(card.meta.regionId),
        locationId: remap(card.meta.locationId),
      },
    }));
    const workspace = {
      ...sample,
      projectId: project.projectId,
      revision: current.revision,
      title: project.title || sample.title,
      genre: project.genre || sample.genre,
      theme: project.theme || sample.theme,
      premise: project.premise || sample.premise,
      cards,
      edges: sample.edges.map((edge) => ({
        ...edge,
        id: remap(edge.id) as string,
        from: remap(edge.from) as string,
        to: remap(edge.to) as string,
      })),
      chains: sample.chains.map((chain) => ({
        ...chain,
        id: remap(chain.id) as string,
        eventIds: chain.eventIds.map((id) => remap(id) as string),
      })),
      chapters: sample.chapters.map((chapter) => ({
        ...chapter,
        id: remap(chapter.id) as string,
        eventIds: chapter.eventIds.map((id) => remap(id) as string),
        locations: Object.fromEntries(
          Object.entries(chapter.locations).map(([cid, lid]) => [remap(cid), remap(lid)]),
        ) as Record<string, string>,
      })),
    };
    current.setProject(workspace);
    setOnboardingOpen(false);
  };

  if (loadState === 'loading') {
    return (
      <div className="storycard-root storycard-loading">
        <Spin size="large" />
        <div>正在打开故事卡牌工作区…</div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="storycard-root storycard-loading">
        <div className="storycard-error-card">
          <h2>打不开卡牌工作区</h2>
          <p>{loadError}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ink primary" onClick={() => void load()}>
              重试
            </button>
            <button className="btn-ink ghost" onClick={() => navigate(`/project/${projectId}`)}>
              返回项目
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="storycard-root">
      <div className="app">
        <TopBar />
        <div className="viewport">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              style={{ position: 'absolute', inset: 0 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {view === 'stage' && <StageView />}
              {view === 'codex' && <CodexView />}
              {view === 'chronicle' && <ChronicleView />}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>{selectedId && <CardEditor key="card-editor" />}</AnimatePresence>

          {onboardingOpen && (
            <div className="onboarding-mask">
              <motion.div
                className="onboarding-card"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="editor-kicker">故事卡牌模式 · 新工作区</div>
                <h2 className="onboarding-title">先从世界和舞台开始</h2>
                <p className="onboarding-text">
                  卡牌是唯一真相源：世界卡定规则，区域卡定舞台，人物卡和事件卡推动状态变化。
                  你可以直接从原模式导入已有设定（导入后项目切换为卡牌模式，原模式数据保留），
                  也可以载入示例先体验完整闭环。
                </p>
                <div className="onboarding-actions">
                  {project.classic?.hasContent && (
                    <button
                      className="btn-ink primary"
                      disabled={importing}
                      onClick={() => void importClassic(project.cards.length > 1)}
                    >
                      {importing ? '正在导入…' : `从原模式导入（${project.classic.characters} 人物 / ${project.classic.outlines} 大纲）`}
                    </button>
                  )}
                  <button className="btn-ink ghost" disabled={importing} onClick={() => void loadSample()}>
                    载入示例《苍梧卷》
                  </button>
                  <button
                    className="btn-ink ghost"
                    onClick={() => {
                      setOnboardingOpen(false);
                      useUIStore.getState().setNewCardOpen(true);
                    }}
                  >
                    直接新建第一张卡
                  </button>
                  <button className="btn-ink ghost" onClick={() => setOnboardingOpen(false)}>
                    先看看空工作区
                  </button>
                </div>
                <div className="onboarding-foot">
                  <span className={`save-dot ${aiReady ? 'saved' : 'idle'}`} />
                  {aiReady ? '已配置项目 AI Key（失败自动回退 Mock）' : '未配置 AI Key，字段级 AI 会使用本地 Mock'}
                  <button className="link-btn" onClick={() => useUIStore.getState().setSettingsOpen(true)}>
                    查看设置
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        <CommandBar />
        <ToastStack />

        <MoveConfirmModal />
        <DeleteConfirmModal />
        <NewCardModal />
        <PlanModal />
        <SettingsModal
          aiReady={aiReady}
          onLoadSample={() => void loadSample()}
          onImportClassic={(overwrite) => void importClassic(overwrite)}
        />
        <HelpModal />
      </div>
    </div>
  );
}