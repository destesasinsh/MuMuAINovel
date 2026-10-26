/** 数据模型：卡牌 / 边 / 链 / 章节 / 工程 */
export type CardType =
  | 'world'
  | 'region'
  | 'location'
  | 'character'
  | 'faction'
  | 'item'
  | 'event'
  | 'foreshadow';

export type EdgeType =
  | 'relation' // 人-人 / 人-势力 等
  | 'causes' // 事件因果
  | 'belongs' // 隶属/位于
  | 'controls' // 控制
  | 'owns' // 持有
  | 'path' // 通行路径
  | 'secret'; // 隐秘通道/线索

export interface CardVersion {
  at: number;
  field: string;
  fieldLabel: string;
  before: string;
  after: string;
}

export type FieldValue = string | number | string[];

export interface Card {
  id: string;
  type: CardType;
  name: string;
  aliases: string[];
  oneLiner: string;
  summary: string;
  body: string;
  tags: string[];
  importance: number; // 0-1
  status: string;
  fields: Record<string, FieldValue>;
  history: CardVersion[];
  meta: {
    x?: number;
    y?: number;
    regionId?: string;
    locationId?: string;
  };
  /** 事件专用：故事内时间顺序（1..n） */
  order?: number;
  /** 事件专用：落到第几章 */
  chapter?: number;
  /** 事件专用：所属链 */
  chainIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  label: string;
  strength: number; // -100..100
  notes: string;
}

export interface Chain {
  id: string;
  name: string;
  kind: string;
  goal: string;
  color: string;
  eventIds: string[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  eventIds: string[];
  /** characterId -> locationId（该章的状态快照） */
  locations: Record<string, string>;
}

export interface ClassicSummary {
  characters: number;
  outlines: number;
  chapters: number;
  foreshadows: number;
  hasContent: boolean;
}

export interface Project {
  version: number;
  projectId: string;
  revision: number;
  creationMode: 'classic' | 'storycard';
  title: string;
  genre: string;
  theme: string;
  premise: string;
  cards: Card[];
  edges: Edge[];
  chains: Chain[];
  chapters: Chapter[];
  classic?: ClassicSummary;
}

/** AI 指令计划里的一条修改 */
export interface PlanOp {
  id: string;
  cardId: string;
  field: string;
  fieldLabel: string;
  before: string;
  after: string;
  risk: 'low' | 'medium' | 'high';
  checked: boolean;
}

export interface CommandPlan {
  title: string;
  summary: string;
  mode: 'edit' | 'report';
  ops: PlanOp[];
  report?: { label: string; value: string }[];
  impact?: { label: string; value: string }[];
  scopeLabel?: string;
}

/* ------------------------------------------------------------------ */
/* 卡牌类型元信息（决定颜色、字段、状态机）                            */
/* ------------------------------------------------------------------ */

export type FieldKind = 'text' | 'textarea' | 'list' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: string[];
  aiHint?: string;
  /** 特殊渲染：参与人员多选 */
  widget?: 'participants';
}

export interface CardTypeMeta {
  label: string;
  glyph: string;
  color: string;
  blurb: string;
  statuses: { value: string; label: string }[];
  fields: FieldDef[];
}

export const CARD_META: Record<CardType, CardTypeMeta> = {
  world: {
    label: '世界',
    glyph: '寰',
    color: '#c9a227',
    blurb: '全局不变量：时代、力量体系、禁忌',
    statuses: [
      { value: 'stable', label: '稳定' },
      { value: 'turbulent', label: '动荡' },
      { value: 'broken', label: '崩坏' },
    ],
    fields: [
      { key: 'era', label: '时代背景', kind: 'textarea', placeholder: '纪年、王朝更替、文明程度…' },
      { key: 'power', label: '力量体系', kind: 'textarea', placeholder: '炼气→筑基→金丹…代价与上限' },
      { key: 'taboo', label: '世界禁忌', kind: 'textarea', placeholder: '不可直视天穹、不可越境…' },
      { key: 'naming', label: '命名风格', kind: 'textarea', placeholder: '宗门/功法/称号的构词规则' },
    ],
  },
  region: {
    label: '区域',
    glyph: '域',
    color: '#5f8f6f',
    blurb: '舞台：气候、势力、通行、危险度',
    statuses: [
      { value: 'open', label: '开放' },
      { value: 'war', label: '战乱' },
      { value: 'closed', label: '封闭' },
      { value: 'ruined', label: '废墟' },
    ],
    fields: [
      { key: 'regionType', label: '区域类型', kind: 'select', options: ['山脉', '城市', '边关', '秘境', '位面', '荒野'] },
      { key: 'sensory', label: '感官细节', kind: 'textarea', placeholder: '气味 / 声音 / 光线 / 温度 —— 描写的地基', aiHint: '补三条可复用的感官描写' },
      { key: 'travel', label: '通行方式', kind: 'textarea', placeholder: '与谁相邻、怎么去、要多久、有什么门槛' },
      { key: 'control', label: '当前控制势力', kind: 'text', placeholder: '谁的地盘' },
      { key: 'danger', label: '危险等级', kind: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'stateNote', label: '动态状态', kind: 'textarea', placeholder: '战乱/易主/封印…第 N 章后变化' },
    ],
  },
  location: {
    label: '地点',
    glyph: '址',
    color: '#4f8c8c',
    blurb: '场景棋盘上的具体位置',
    statuses: [
      { value: 'normal', label: '正常' },
      { value: 'damaged', label: '受损' },
      { value: 'blocked', label: '封锁' },
    ],
    fields: [
      { key: 'kind', label: '场所类型', kind: 'select', options: ['宗门', '关隘', '街巷', '秘境', '宅邸', '战场'] },
      { key: 'sensory', label: '感官细节', kind: 'textarea', placeholder: '到这里第一眼/第一口气味' },
      { key: 'atmosphere', label: '氛围关键词', kind: 'text', placeholder: '肃杀 / 香火 / 潮湿' },
    ],
  },
  character: {
    label: '人物',
    glyph: '人',
    color: '#c2734a',
    blurb: '欲望、恐惧、缺陷、谎言 —— 弧光的四件套',
    statuses: [
      { value: 'present', label: '在场' },
      { value: 'away', label: '离场' },
      { value: 'missing', label: '失踪' },
      { value: 'dead', label: '死亡' },
    ],
    fields: [
      { key: 'role', label: '功能定位', kind: 'select', options: ['主角', '反派', '配角', '导师', '同门', '情感线', '隐藏', '工具人'] },
      { key: 'desire', label: '欲望', kind: 'textarea', placeholder: '他想要什么', aiHint: '补一条能驱动 30 章的欲望' },
      { key: 'fear', label: '恐惧', kind: 'textarea', placeholder: '他怕失去什么', aiHint: '补一条恐惧' },
      { key: 'flaw', label: '缺陷', kind: 'textarea', placeholder: '性格弱点', aiHint: '补一条会害死他的缺陷' },
      { key: 'lie', label: '谎言（信条）', kind: 'textarea', placeholder: '他信错的那句话', aiHint: '补一句他信错的信条' },
      { key: 'speech', label: '说话风格', kind: 'textarea', placeholder: '口头禅 / 句式 / 用词偏好' },
      { key: 'arc', label: '弧光阶段', kind: 'select', options: ['起', '承', '转', '合'] },
      { key: 'secret', label: '秘密', kind: 'textarea', placeholder: '读者/他人不知道的事' },
    ],
  },
  faction: {
    label: '势力',
    glyph: '旗',
    color: '#5b7fa6',
    blurb: '组织、目标、资源、态度',
    statuses: [
      { value: 'rising', label: '兴盛' },
      { value: 'damaged', label: '受损' },
      { value: 'fallen', label: '覆灭' },
    ],
    fields: [
      { key: 'goal', label: '目标', kind: 'textarea', placeholder: '他们在这个故事里要什么' },
      { key: 'resources', label: '资源', kind: 'textarea', placeholder: '人、钱、兵、情报' },
      { key: 'stance', label: '态度', kind: 'text', placeholder: '中立 / 敌对 / 观望' },
    ],
  },
  item: {
    label: '物品',
    glyph: '器',
    color: '#8a6fa8',
    blurb: '能力、代价、持有者、契诃夫之枪',
    statuses: [
      { value: 'intact', label: '完好' },
      { value: 'damaged', label: '破损' },
      { value: 'lost', label: '遗失' },
      { value: 'sealed', label: '封印' },
    ],
    fields: [
      { key: 'ability', label: '能力', kind: 'textarea', placeholder: '它能做什么' },
      { key: 'cost', label: '代价', kind: 'textarea', placeholder: '使用它要付出什么' },
      { key: 'holder', label: '当前持有者', kind: 'text', placeholder: '谁拿着' },
      { key: 'chekhov', label: '道具权重', kind: 'select', options: ['关键道具', '普通道具', '谜题线索'] },
    ],
  },
  event: {
    label: '事件',
    glyph: '幕',
    color: '#b3452f',
    blurb: '唯一能改变状态的东西：目标-障碍-结果 + delta',
    statuses: [
      { value: 'written', label: '已写' },
      { value: 'planned', label: '已规划' },
      { value: 'idea', label: '灵感' },
    ],
    fields: [
      { key: 'time', label: '故事时间', kind: 'text', placeholder: '如「大比次日黄昏」' },
      { key: 'place', label: '地点', kind: 'text', placeholder: '发生地' },
      { key: 'participants', label: '参与者', kind: 'list', widget: 'participants', placeholder: '选择人物卡' },
      { key: 'goal', label: '目标', kind: 'textarea', placeholder: '谁要什么' },
      { key: 'obstacle', label: '障碍', kind: 'textarea', placeholder: '谁挡着' },
      { key: 'turn', label: '转折', kind: 'textarea', placeholder: '局面反转的那一下' },
      { key: 'outcome', label: '结果', kind: 'textarea', placeholder: '表面结果' },
      { key: 'delta', label: '状态变化', kind: 'textarea', placeholder: '林澈.level +1；苏家.关系 -20', aiHint: '把结果拆成对卡牌的状态变化' },
      { key: 'beat', label: '节拍', kind: 'select', options: ['铺垫', '激励事件', '上升', '中点', '低谷', '高潮', '收束', '余波'] },
      { key: 'tension', label: '紧张度', kind: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'pov', label: '视角', kind: 'text', placeholder: '从谁的眼里看' },
      { key: 'reveal', label: '释放的信息', kind: 'textarea', placeholder: '揭示/回收了什么' },
    ],
  },
  foreshadow: {
    label: '伏笔',
    glyph: '谶',
    color: '#a8863c',
    blurb: '埋下的线，必须在某处收回来',
    statuses: [
      { value: 'pending', label: '待收' },
      { value: 'resolved', label: '已收' },
      { value: 'overdue', label: '超期' },
    ],
    fields: [
      { key: 'hint', label: '埋设方式', kind: 'textarea', placeholder: '读者看到的那一笔' },
      { key: 'planted', label: '埋于', kind: 'text', placeholder: '第 N 章 / 哪个场景' },
      { key: 'plan', label: '计划回收', kind: 'textarea', placeholder: '第 N 章，怎么揭' },
      { key: 'category', label: '伏笔类型', kind: 'select', options: ['身份', '物品', '关系', '事件', '秘密'] },
    ],
  },
};

export const CARD_TYPE_ORDER: CardType[] = [
  'world',
  'region',
  'location',
  'character',
  'faction',
  'item',
  'event',
  'foreshadow',
];

export const EDGE_META: Record<
  EdgeType,
  { label: string; color: string; dash: string; desc: string }
> = {
  relation: { label: '关系', color: '#c2734a', dash: '', desc: '人物 / 势力之间的情感与立场' },
  causes: { label: '因果', color: '#b3452f', dash: '', desc: '事件导致事件' },
  belongs: { label: '隶属', color: '#7d8a6a', dash: '5 4', desc: '属于谁 / 位于何处' },
  controls: { label: '控制', color: '#5b7fa6', dash: '8 4', desc: '势力控制区域' },
  owns: { label: '持有', color: '#8a6fa8', dash: '2 3', desc: '人物持有物品' },
  path: { label: '通行', color: '#5f8f6f', dash: '10 5', desc: '区域 / 地点之间的路' },
  secret: { label: '秘道', color: '#a8863c', dash: '3 4', desc: '隐秘通道与线索' },
};

export const EDGE_TYPES: EdgeType[] = [
  'relation',
  'causes',
  'belongs',
  'controls',
  'owns',
  'path',
  'secret',
];

export function defaultFields(type: CardType): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of CARD_META[type].fields) {
    out[f.key] = f.kind === 'list' ? '' : '';
  }
  return out;
}

export function newCard(
  type: CardType,
  name: string,
  extra: Partial<Card> = {},
): Card {
  const now = Date.now();
  return {
    id: `card-${type}-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name,
    aliases: [],
    oneLiner: '',
    summary: '',
    body: '',
    tags: [],
    importance: 0.5,
    status: CARD_META[type].statuses[0].value,
    fields: defaultFields(type),
    history: [],
    meta: {},
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}
