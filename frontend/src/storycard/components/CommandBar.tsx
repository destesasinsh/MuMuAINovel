import { useEffect, useRef, useState } from 'react';
import { planCommand } from '../ai';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

const QUICK = [
  '给所有反派补一条恐惧',
  '把青云宗改名为青云剑宗',
  '补全场景感官细节',
  '检查伏笔与孤立事件',
  '给事件补全状态变化',
];

export default function CommandBar() {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const project = useProjectStore((s) => s.project);
  const chapter = useUIStore((s) => s.chapter);
  const scope = useUIStore((s) => s.planScope);
  const setScope = useUIStore((s) => s.setPlanScope);
  const selectedId = useUIStore((s) => s.selectedId);
  const loading = useUIStore((s) => s.planLoading);
  const setLoading = useUIStore((s) => s.setPlanLoading);
  const setPlan = useUIStore((s) => s.setPlan);
  const toast = useUIStore((s) => s.toast);
  const focusTick = useUIStore((s) => s.commandFocus);

  useEffect(() => {
    if (focusTick > 0) inputRef.current?.focus();
  }, [focusTick]);

  const run = async (value?: string) => {
    const command = (value ?? text).trim();
    if (!command || loading) return;
    setLoading(true);
    try {
      const plan = await planCommand(command, project, scope, chapter, selectedId);
      setPlan(plan);
    } catch {
      toast('AI 计划生成失败，请稍后重试', 'warn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="command-bar">
      <div className="command-inner">
        <div className="command-row">
          <select
            className="command-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as never)}
            title="指令作用范围"
          >
            <option value="all">范围：全项目</option>
            <option value="chapter">范围：当前章相关</option>
            <option value="selection">范围：当前选中卡</option>
          </select>
          <div className="command-input-wrap">
            <span className="command-glyph">命</span>
            <input
              ref={inputRef}
              className="command-input"
              value={text}
              placeholder="用一句话指挥整张卡库：给所有反派补一条恐惧 / 把青云宗改名为青云剑宗 / 检查伏笔…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void run();
                }
              }}
            />
            <button
              className="command-send"
              disabled={loading || !text.trim()}
              onClick={() => void run()}
            >
              {loading ? '起草中…' : '生成计划 ⏎'}
            </button>
          </div>
        </div>
        <div className="command-chips">
          {QUICK.map((q) => (
            <button
              key={q}
              className="chip-mini"
              onClick={() => {
                setText(q);
                void run(q);
              }}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="command-hint">
          AI 只产出「计划」，逐张确认后才会改数据 · <b>Enter</b> 生成 · <b>/</b> 聚焦 ·{' '}
          <b>Ctrl+Z</b> 撤销
        </div>
      </div>
    </div>
  );
}
