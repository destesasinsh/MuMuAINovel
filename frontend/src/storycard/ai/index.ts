import type { Card, CardType, CommandPlan, Edge, PlanOp, Project } from '../types';
import { CARD_META, EDGE_META } from '../types';
import { storycardApi } from '../api';

/* 由工作台在加载时探测：是否接入了项目设置中的真实 AI */
let backendAiAvailable: boolean | null = null;

export function setBackendAiAvailable(value: boolean | null) {
  backendAiAvailable = value;
}

export function getBackendAiAvailable(): boolean | null {
  return backendAiAvailable;
}

const AI_PLAN_KEY = 'storycard-ai-plan';

export function isAiPlanningEnabled(): boolean {
  try {
    return localStorage.getItem(AI_PLAN_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAiPlanningEnabled(value: boolean) {
  localStorage.setItem(AI_PLAN_KEY, value ? '1' : '0');
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const str = (v: unknown): string => (Array.isArray(v) ? v.join('、') : v == null ? '' : String(v));

function byId(project: Project, id: string): Card | undefined {
  return project.cards.find((c) => c.id === id);
}
function nameOf(project: Project, id: string): string {
  return byId(project, id)?.name ?? id;
}

function fieldLabel(card: Card, key: string): string {
  const clean = key.startsWith('name:') ? key.slice(5) : key;
  if (clean === 'name') return '名称';
  if (clean === 'oneLiner') return '一句话';
  if (clean === 'summary') return '摘要';
  if (clean === 'body') return '详述';
  const def = CARD_META[card.type].fields.find((f) => f.key === clean);
  return def?.label ?? clean;
}

function roleOf(card: Card): string {
  return str(card.fields.role);
}

/* ------------------------------------------------------------------ */
/* Mock 文本生成                                                        */
/* ------------------------------------------------------------------ */

function mockValue(card: Card, key: string, project: Project): string {
  const name = card.name;
  const participants = Array.isArray(card.fields.participants)
    ? (card.fields.participants as string[]).map((id) => nameOf(project, id))
    : [];

  switch (key) {
    case 'desire':
      return pick([
        `得到${pick(['一个能站住脚的身份', '承认', '一个不再被夺走的位置', '复仇以外的东西'])}，哪怕代价是把身边的人都推开。`,
        `把「${pick(['父亲留下的问题', '十年前的旧账', '一个已经死掉的人'])}」弄清楚，否则他活不下去。`,
        `护住${pick(['一个不该由他来护的人', '一个所有人都说要放弃的地方', '一个承诺'])}。`,
      ]);
    case 'fear':
      return pick([
        `怕自己拼命抓住的东西，最后还是被人轻描淡写地拿走。`,
        `怕自己一旦停下来，就会承认${pick(['自己真的不行', '父亲的事没人会再提', '这世界确实不需要他'])}。`,
        `怕的不是死，是死得和父亲一样，连一句解释都没留下。`,
        `怕被自己人当成外人——这比被敌人恨更难受。`,
      ]);
    case 'flaw':
      return pick([
        `受了激就顾不上后果，明明知道该忍，还是先出剑再想。`,
        `太相信自己的判断，别人劝的话要等撞了墙才想起来。`,
        `把「不欠人情」当成底线，所以宁可自己扛也不开口。`,
        `心软。明知道对方在利用自己，还是会留一线。`,
      ]);
    case 'lie':
      return pick([
        `「力量就是一切」——只要够强，就不必解释。`,
        `「规矩能护住人」——他见过规矩护住谁，也见过规矩杀过谁。`,
        `「只有握在手里的才是自己的」——所以他什么都想抓住。`,
        `「出身决定一切」——所以他拼命证明自己不是例外。`,
      ]);
    case 'speech':
      return pick([
        `短句，不解释。急了会噎人，说完自己也后悔。`,
        `说话慢，喜欢先反问一句，等别人急了才给答案。`,
        `客气到疏离，越客气越说明她准备动手了。`,
        `爱引旧事和古语，说到关键处会停很久。`,
      ]);
    case 'sensory':
      return pick([
        `潮气从石缝里漫上来，带着旧纸和灯油的味道；远处有人敲钟，声音在雾里散成一片。`,
        `风里有铁锈和雪的味道；脚下的石子一动，就有细碎的回声。`,
        `光线是灰的，像被什么东西滤过；呼吸会不自觉地放轻。`,
      ]);
    case 'delta': {
      const outcome = str(card.fields.outcome) || card.oneLiner || '局面发生了变化';
      return `局面：${outcome}；状态：${name}.处境改变；关系：相关人物态度变化；伏笔：牵出「${pick([
        '旧事',
        '父辈的账',
        '一件不该出现的信物',
      ])}」。`;
    }
    case 'summary':
      return `${name}：${card.oneLiner || '故事在这里拐了一下'}。${pick([
        '表面上看是赢了，实际上把更大的麻烦引到了自己身上。',
        '所有人都以为事情过去了，只有一个人没有回头。',
        '这一笔在当时不起眼，很多章以后才会有人想起它。',
      ])}`;
    case 'oneLiner':
      return pick([
        `${name}，${pick(['一个不该被记住的人', '一个名字比人先到的人', '一个把刀藏在袖子里的人'])}。`,
        `${name}：${pick(['别人欠他一句解释', '他欠别人一条命', '所有人都以为他死了'])}。`,
      ]);
    case 'body':
      return `${name}的过去像一口枯井，往下看只能看到黑。${pick([
        '他从不主动提，但别人一提，他的手就会摸向腰间。',
        '她记得所有人的名字，只对自己的过去含糊其辞。',
      ])}`;
    default: {
      if (participants.length) {
        return `${name}与${participants.join('、')}之间的张力在于：没有人愿意先把话说明白。`;
      }
      return `${name}：${card.oneLiner || '在这里，故事需要一个人先动'}。`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* 字段级 AI                                                           */
/* ------------------------------------------------------------------ */

export async function assistField(
  card: Card,
  key: string,
  project: Project,
  action: string,
): Promise<string> {
  const cleanKey = key.startsWith('name:') ? key.slice(5) : key;
  const label = fieldLabel(card, key);
  if (backendAiAvailable !== false && project.projectId) {
    try {
      return await storycardApi.assistField(
        project.projectId,
        card,
        cleanKey,
        label,
        action,
        project.premise,
        relatedNames(card, project),
      );
    } catch (error) {
      if ((error as { status?: number }).status === 400) backendAiAvailable = false;
      /* 网络/模型失败时回退 mock，保证不阻塞写作 */
    }
  }
  await delay(420 + Math.random() * 420);
  return mockValue(card, cleanKey, project);
}

function relatedNames(card: Card, project: Project): string[] {
  const ids = new Set<string>();
  for (const edge of project.edges) {
    if (edge.from === card.id) ids.add(edge.to);
    if (edge.to === card.id) ids.add(edge.from);
  }
  for (const c of project.cards) {
    if (c.type === 'event' && Array.isArray(c.fields.participants)) {
      if ((c.fields.participants as string[]).includes(card.id)) ids.add(c.id);
    }
  }
  return [...ids]
    .map((id) => project.cards.find((c) => c.id === id)?.name || '')
    .filter(Boolean)
    .slice(0, 20);
}

export async function completeCardFields(
  card: Card,
  project: Project,
): Promise<{ field: string; label: string; value: string }[]> {
  const defs = CARD_META[card.type].fields;
  const empty = defs.filter((f) => !str(card.fields[f.key]).trim()).slice(0, 4);
  if (backendAiAvailable !== false && project.projectId) {
    try {
      const items = await storycardApi.completeFields(
        project.projectId,
        card,
        empty.map((f) => ({ key: f.key, label: f.label, placeholder: f.placeholder })),
        project.premise,
      );
      if (items.length) return items;
    } catch (error) {
      if ((error as { status?: number }).status === 400) backendAiAvailable = false;
    }
  }
  const out: { field: string; label: string; value: string }[] = [];
  for (const f of empty) {
    out.push({ field: f.key, label: f.label, value: await mockValue(card, f.key, project) });
  }
  if (out.length === 0) {
    out.push({
      field: defs[0].key,
      label: defs[0].label,
      value: mockValue(card, defs[0].key, project),
    });
  }
  return out;
}

export async function suggestRelations(
  card: Card,
  project: Project,
): Promise<{ toId: string; toName: string; type: Edge['type']; label: string; reason: string }[]> {
  const existing = new Set(
    project.edges.filter((e) => e.from === card.id || e.to === card.id).map((e) => (e.from === card.id ? e.to : e.from)),
  );
  const candidates = project.cards.filter((c) => c.id !== card.id && !existing.has(c.id));
  if (backendAiAvailable !== false && project.projectId) {
    try {
      const items = await storycardApi.suggestRelations(
        project.projectId,
        card,
        candidates,
        [...existing],
        project.premise,
      );
      if (items.length) return items;
    } catch (error) {
      if ((error as { status?: number }).status === 400) backendAiAvailable = false;
    }
  }
  await delay(380);
  const preferType: CardType[] =
    card.type === 'character'
      ? ['character', 'faction', 'item']
      : card.type === 'event'
        ? ['character', 'faction', 'event']
        : card.type === 'region'
          ? ['faction', 'location', 'region']
          : ['character', 'item', 'faction'];
  const pool = candidates.filter((c) => preferType.includes(c.type));
  const picked = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const labelPool =
    card.type === 'character'
      ? ['旧识', '暗中交易', '同门', '互相利用', '未说出口的敌意']
      : ['有所图谋', '旧日牵连', '被迫合作', '尚未揭开的联系'];
  const typeOf = (other: Card): Edge['type'] => {
    if (card.type === 'character' && other.type === 'faction') return 'belongs';
    if (card.type === 'character' && other.type === 'item') return 'owns';
    if (card.type === 'faction' && other.type === 'region') return 'controls';
    return 'relation';
  };
  return picked.map((other) => ({
    toId: other.id,
    toName: other.name,
    type: typeOf(other),
    label: pick(labelPool),
    reason: `${other.name} 目前与「${card.name}」没有直接关联，补一条关系可以让它在事件里出现得更自然。`,
  }));
}

/* ------------------------------------------------------------------ */
/* 指令 → 计划                                                         */
/* ------------------------------------------------------------------ */

function collectScope(project: Project, scope: string, chapter: number, selectedId: string | null): Card[] {
  if (scope === 'selection') {
    const card = selectedId ? byId(project, selectedId) : undefined;
    return card ? [card] : project.cards;
  }
  if (scope === 'chapter') {
    const ch = project.chapters.find((c) => c.number === chapter);
    if (!ch) return project.cards;
    const involved = new Set<string>([...ch.eventIds, ...Object.keys(ch.locations), ...Object.values(ch.locations)]);
    for (const eid of ch.eventIds) {
      const ev = byId(project, eid);
      if (ev && Array.isArray(ev.fields.participants)) {
        for (const pid of ev.fields.participants as string[]) involved.add(pid);
      }
    }
    return project.cards.filter((c) => involved.has(c.id));
  }
  return project.cards;
}

function opId() {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeOp(card: Card, field: string, before: string, after: string, risk: PlanOp['risk']): PlanOp {
  return {
    id: opId(),
    cardId: card.id,
    field,
    fieldLabel: fieldLabel(card, field.replace('name:', '')),
    before,
    after,
    risk,
    checked: true,
  };
}

function replaceInCard(card: Card, from: string, to: string): PlanOp[] {
  const ops: PlanOp[] = [];
  const texts: Array<[string, string]> = [
    ['name:name', card.name],
    ['name:oneLiner', card.oneLiner],
    ['name:summary', card.summary],
    ['name:body', card.body],
  ];
  for (const [field, value] of texts) {
    if (value && value.includes(from)) {
      ops.push(makeOp(card, field, value, value.split(from).join(to), 'low'));
    }
  }
  for (const [key, raw] of Object.entries(card.fields)) {
    if (typeof raw === 'string' && raw.includes(from)) {
      ops.push(makeOp(card, key, raw, raw.split(from).join(to), 'low'));
    }
    if (Array.isArray(raw)) {
      const joined = raw.join('、');
      if (joined.includes(from)) {
        ops.push(makeOp(card, key, joined, joined.split(from).join(to), 'low'));
      }
    }
  }
  return ops;
}

function renamePlan(project: Project, oldName: string, newName: string): CommandPlan {
  const ops: PlanOp[] = [];
  for (const card of project.cards) ops.push(...replaceInCard(card, oldName, newName));
  const touched = new Set(ops.map((o) => o.cardId)).size;
  return {
    title: `统一改名：${oldName} → ${newName}`,
    summary:
      ops.length === 0
        ? `没有在任何卡牌里找到「${oldName}」，请检查名称。`
        : `在 ${touched} 张卡上共 ${ops.length} 处引用将被替换。这是确定性操作，不会改动剧情。`,
    mode: ops.length ? 'edit' : 'report',
    ops,
    report:
      ops.length === 0
        ? [{ label: '未找到', value: `卡库里没有「${oldName}」的引用` }]
        : undefined,
    impact: [{ label: '涉及卡牌', value: `${touched} 张` }],
  };
}

function reportPlan(project: Project, chapter: number): CommandPlan {
  const pending = project.cards.filter((c) => c.type === 'foreshadow' && c.status === 'pending');
  const events = project.cards.filter((c) => c.type === 'event');
  const written = events.filter((c) => (c.chapter ?? 0) <= chapter);
  const planned = events.filter((c) => (c.chapter ?? 0) > chapter);
  const charEvents = new Map<string, number>();
  for (const e of events) {
    if (Array.isArray(e.fields.participants)) {
      for (const pid of e.fields.participants as string[]) {
        charEvents.set(pid, (charEvents.get(pid) ?? 0) + 1);
      }
    }
  }
  const idle = project.cards
    .filter((c) => c.type === 'character')
    .map((c) => ({ c, n: charEvents.get(c.id) ?? 0 }))
    .sort((a, b) => a.n - b.n)
    .slice(0, 3);
  const causal = project.edges.filter((e) => e.type === 'causes').length;
  const orphangEvents = events.filter(
    (e) => !project.edges.some((edge) => edge.type === 'causes' && (edge.to === e.id || edge.from === e.id)),
  );
  return {
    title: '项目巡检',
    summary: `第 ${chapter} 章视角下的结构快照：事件 ${events.length} 个（已写 ${written.length} / 规划 ${planned.length}），因果边 ${causal} 条，待收伏笔 ${pending.length} 条。`,
    mode: 'report',
    ops: [],
    report: [
      { label: '待收伏笔', value: pending.map((p) => `《${p.name}》埋于${str(p.fields.planted) || '?'}，计划${str(p.fields.plan) || '?'}`).join('；') || '无' },
      { label: '出场偏少', value: idle.map((x) => `${x.c.name}（${x.n} 个事件）`).join('、') },
      { label: '孤立事件', value: orphangEvents.length ? orphangEvents.map((e) => e.name).join('、') : '无，所有事件都有因果连接' },
      { label: '卡牌规模', value: `${project.cards.length} 张 / ${project.edges.length} 条边 / ${project.chains.length} 条链` },
    ],
    impact: [{ label: '只读', value: '不会修改任何数据' }],
  };
}

export async function planCommand(
  command: string,
  project: Project,
  scope: 'all' | 'chapter' | 'selection',
  chapter: number,
  selectedId: string | null,
): Promise<CommandPlan> {
  if (isAiPlanningEnabled() && backendAiAvailable !== false && project.projectId) {
    try {
      const plan = await storycardApi.planCommand(project.projectId, command, scope, chapter, selectedId);
      if (plan && (plan.ops.length > 0 || plan.mode === 'report')) return plan;
    } catch (error) {
      if ((error as { status?: number }).status === 400) backendAiAvailable = false;
      /* 真实模型不可用时回退本地规则 */
    }
  }
  return localPlanCommand(command, project, scope, chapter, selectedId);
}

async function localPlanCommand(
  command: string,
  project: Project,
  scope: 'all' | 'chapter' | 'selection',
  chapter: number,
  selectedId: string | null,
): Promise<CommandPlan> {
  await delay(650 + Math.random() * 500);
  const text = command.trim();
  const pool = collectScope(project, scope, chapter, selectedId);
  const scopeLabel =
    scope === 'all' ? '全项目' : scope === 'chapter' ? `第 ${chapter} 章相关` : '当前选中';

  // 巡检 / 查询
  if (/(巡检|检查|统计|谁|哪些|列出|看看|有没有|报告)/.test(text) && !/(改名|改成|补|加|改)/.test(text)) {
    const plan = reportPlan(project, chapter);
    plan.scopeLabel = scopeLabel;
    return plan;
  }

  // 改名（确定性）
  const rename = text.match(/(?:把|将)?\s*([\u4e00-\u9fa5A-Za-z0-9·\s]{1,20}?)\s*(?:改名|重命名|统一改成|统一改为|改成)\s*([\u4e00-\u9fa5A-Za-z0-9·]{1,20})/);
  if (rename) {
    const plan = renamePlan(project, rename[1].trim(), rename[2].trim());
    plan.scopeLabel = scopeLabel;
    return plan;
  }

  // 反派补恐惧 / 动机
  if (/(恐惧|害怕|怕)/.test(text) && /(反派|所有|每个|全部)/.test(text)) {
    const targets = pool.filter((c) => c.type === 'character' && (roleOf(c) === '反派' || c.tags.includes('反派')));
    const ops = targets.map((c) =>
      makeOp(c, 'fear', str(c.fields.fear), mockValue(c, 'fear', project), 'medium'),
    );
    return {
      title: '给反派补一条恐惧',
      summary:
        ops.length === 0
          ? '当前范围里没有标记为「反派」的人物卡。'
          : `将为 ${ops.length} 个反派补上恐惧。创意类修改，建议逐张查看。`,
      mode: ops.length ? 'edit' : 'report',
      ops,
      report: ops.length === 0 ? [{ label: '提示', value: '先把人物的功能定位设为「反派」，或给角色打上「反派」标签。' }] : undefined,
      impact: [{ label: '涉及卡牌', value: `${ops.length} 张` }, { label: '下游影响', value: '这些角色的动机将更明确，相关事件卡可在右栏重新生成' }],
      scopeLabel,
    };
  }

  // 感官细节
  if (/(感官|气味|声音|细节|描写)/.test(text)) {
    const targets = pool.filter((c) => c.type === 'region' || c.type === 'location');
    const ops = targets.map((c) =>
      makeOp(c, 'sensory', str(c.fields.sensory), mockValue(c, 'sensory', project), 'low'),
    );
    return {
      title: '补全场景感官细节',
      summary: ops.length ? `为 ${ops.length} 个区域/地点补上气味、声音、光线与温度——这是解决场景千篇一律最有效的字段。` : '当前范围没有区域或地点卡。',
      mode: ops.length ? 'edit' : 'report',
      ops,
      impact: [{ label: '涉及卡牌', value: `${ops.length} 张` }, { label: '用途', value: '写正文时自动注入当前区域的感官细节' }],
      scopeLabel,
    };
  }

  // 动机 / 欲望
  if (/(动机|欲望|想要什么)/.test(text)) {
    const targets = pool.filter((c) => c.type === 'character');
    const ops = targets.map((c) => makeOp(c, 'desire', str(c.fields.desire), mockValue(c, 'desire', project), 'medium'));
    return {
      title: '补全人物动机',
      summary: ops.length ? `为 ${ops.length} 个人物补上欲望。` : '当前范围没有人物卡。',
      mode: ops.length ? 'edit' : 'report',
      ops,
      scopeLabel,
    };
  }

  // 事件 delta
  if (/(状态变化|delta|影响|后果)/i.test(text)) {
    const targets = pool.filter((c) => c.type === 'event');
    const ops = targets.map((c) => makeOp(c, 'delta', str(c.fields.delta), mockValue(c, 'delta', project), 'medium'));
    return {
      title: '为事件补全状态变化',
      summary: ops.length ? `为 ${ops.length} 个事件拆出状态变化清单。` : '当前范围没有事件卡。',
      mode: ops.length ? 'edit' : 'report',
      ops,
      scopeLabel,
    };
  }

  // 兜底：润色摘要
  const named = project.cards.find((c) => text.includes(c.name));
  const targets = (named ? [named] : pool.filter((c) => c.type === 'event').sort((a, b) => b.importance - a.importance).slice(0, 3));
  const ops = targets.map((c) => makeOp(c, 'summary', c.summary, mockValue(c, 'summary', project), 'low'));
  if (ops.length === 0) {
    return { ...reportPlan(project, chapter), scopeLabel };
  }
  return {
    title: named ? `润色：${named.name}` : `润色 ${ops.length} 张重点卡`,
    summary: `没有识别到具体操作，按「润色摘要」执行。可以在输入里用「改名 / 补恐惧 / 补感官 / 巡检」这类关键词。`,
    mode: 'edit',
    ops,
    scopeLabel,
  };
}

/* ------------------------------------------------------------------ */
/* 辅助：计划说明                                                      */
/* ------------------------------------------------------------------ */

export function edgeLabel(type: Edge['type']): string {
  return EDGE_META[type]?.label ?? type;
}