import type { Card, Chapter, Chain, Edge, Project } from './types';
import { newCard } from './types';

/** 演示用种子数据：一部长篇玄幻《苍梧卷》的骨架 */
export function createSeedProject(): Project {
  const cards: Card[] = [];
  const edges: Edge[] = [];

  const push = (c: Card) => {
    cards.push(c);
    return c;
  };
  const edge = (
    from: string,
    to: string,
    type: Edge['type'],
    label: string,
    strength = 0,
    notes = '',
  ) => {
    edges.push({
      id: `edge-${edges.length + 1}`,
      from,
      to,
      type,
      label,
      strength,
      notes,
    });
  };

  /* ---------------- 世界 ---------------- */
  push(
    newCard('world', '苍梧界', {
      id: 'w1',
      oneLiner: '灵气将尽的九州，天穹裂开一道无人敢直视的缝',
      summary:
        '九州之上有苍梧，苍梧之上有天穹。三百年前天穹裂开，灵气如潮退去，修行者以命续道。',
      body:
        '苍梧界分九州，故事发生在东荒与北境之间。修行分炼气、筑基、金丹三境，每进一步都要以寿元或记忆为代价。天穹裂缝之上有「守夜人」，世人只当是传说。',
      tags: ['九州', '灵气退潮', '天穹裂缝'],
      importance: 1,
      fields: {
        era: '苍梧历三百年。灵气退潮后的第三代修行者，宗门式微、边关吃紧、商阀抬头。',
        power: '炼气 → 筑基 → 金丹。每突破一境需献祭一段寿元或记忆；金丹之上几乎无人可及。',
        taboo: '不可直视天穹裂缝；不可在月圆之夜进入万妖山脉；不可直呼守夜人之名。',
        naming: '宗门多「青云/玄铁/断念」式双字；功法名带器物与情绪；称号多用「老祖/长老/家主」。',
      },
    }),
  );

  /* ---------------- 区域 ---------------- */
  const regions: Array<[string, string, string, Partial<Card>]> = [
    [
      'r1',
      '东荒·青云山脉',
      'region',
      {
        oneLiner: '松脂与冷雾，钟声从云里落下来',
        summary: '青云宗立派三百年的山门之地，山下有灵矿与商道，是东荒最像样的地方。',
        tags: ['东荒', '宗门', '灵矿'],
        importance: 0.9,
        fields: {
          regionType: '山脉',
          sensory: '松脂味混着冷雾；钟声从云层里落下来；石阶常年潮湿，指尖一摸是凉的。',
          travel: '与北境断魂关有驿道相连，马车七日；后山有秘道直通万妖山脉，仅月圆之夜开启。',
          control: '青云宗（苏家在矿脉一带另有商路）',
          danger: '3',
          stateNote: '第 4 章后：苏家在矿脉增派了人手，山门气氛转紧。',
        },
        meta: { x: 120, y: 170 },
      },
    ],
    [
      'r2',
      '北境·断魂关',
      'region',
      {
        oneLiner: '铁锈味的雪，风里有骨头相撞的声音',
        summary: '大周北境第一关，关外是魔道与妖物，关内是活不下去的人。',
        tags: ['北境', '边关', '战场'],
        importance: 0.85,
        fields: {
          regionType: '边关',
          sensory: '铁锈味的雪；风里有骨头相撞的声音；夜里营火把雪照成暗红色。',
          travel: '自东荒乘马车七日；关内禁飞，任何御器升空都会被守军射落。',
          control: '大周军方',
          danger: '8',
          stateNote: '第 5 章后：血刀老祖夜袭，关内戒严。',
        },
        meta: { x: 560, y: 110 },
      },
    ],
    [
      'r3',
      '万妖山脉',
      'region',
      {
        oneLiner: '腐叶的甜香，雾里有不属于人的脚步声',
        summary: '被天穹裂缝污染的山脉，妖物与旧时代的秘密都埋在这里。',
        tags: ['秘境', '隐藏地图', '妖'],
        importance: 0.8,
        fields: {
          regionType: '秘境',
          sensory: '腐叶的甜香；雾里有脚步声但看不见人；抬头时天光会被什么东西挡一下。',
          travel: '从青云宗后山秘道单向进入；月圆夜才开启；出来要走三天三夜。',
          control: '无主（万妖王盘踞）',
          danger: '9',
          stateNote: '第 6 章首次进入。',
        },
        meta: { x: 940, y: 260 },
      },
    ],
  ];
  for (const [id, name, _type, extra] of regions) {
    push(newCard('region', name, { id, ...extra }));
  }

  /* ---------------- 地点 ---------------- */
  const locations: Array<[string, string, string, Partial<Card>]> = [
    ['l1', '青云宗·山门', 'r1', { oneLiner: '三百级石阶，尽头是两块被剑气削平的崖', fields: { kind: '宗门', sensory: '石阶湿滑，风从山口灌下来，带着松脂味', atmosphere: '肃穆、清冷' }, meta: { x: 280, y: 120, regionId: 'r1' }, importance: 0.7 }],
    ['l2', '青云宗·演武场', 'r1', { oneLiner: '青石擂台，四面看台被剑气刻满了字', fields: { kind: '宗门', sensory: '青石上有陈年血渍，风里有铁锈和汗味', atmosphere: '亢奋、压抑' }, meta: { x: 650, y: 170, regionId: 'r1' }, importance: 0.75 }],
    ['l3', '青云宗·藏经阁', 'r1', { oneLiner: '七层木楼，夜里只亮一盏灯', fields: { kind: '宗门', sensory: '旧纸和灯油的味道，地板一踩就响', atmosphere: '安静、秘密' }, meta: { x: 360, y: 390, regionId: 'r1' }, importance: 0.6 }],
    ['l4', '断魂关·关隘', 'r2', { oneLiner: '十几丈高的黑石墙，墙缝里插着断箭', fields: { kind: '关隘', sensory: '铁锈味的雪；风撞在墙上像有人在哭', atmosphere: '肃杀、绝望' }, meta: { x: 300, y: 150, regionId: 'r2' }, importance: 0.8 }],
    ['l5', '断魂关·军营大帐', 'r2', { oneLiner: '最暖的一顶帐篷，也是消息最杂的地方', fields: { kind: '战场', sensory: '炭火、烈酒、湿甲胄的味道混在一起', atmosphere: '嘈杂、压抑' }, meta: { x: 650, y: 150, regionId: 'r2' }, importance: 0.65 }],
    ['l6', '断魂关·战地医帐', 'r2', { oneLiner: '白布一掀，里面的疼都不装', fields: { kind: '战场', sensory: '草药、血、雪水；有人在低声念名字', atmosphere: '疲惫、脆弱' }, meta: { x: 430, y: 400, regionId: 'r2' }, importance: 0.55 }],
    ['l7', '万妖山脉·入口', 'r3', { oneLiner: '两块长满黑苔的巨石，中间永远有雾', fields: { kind: '秘境', sensory: '腐叶的甜香，雾里有机括转动的轻响', atmosphere: '诡异、古老' }, meta: { x: 480, y: 240, regionId: 'r3' }, importance: 0.7 }],
  ];
  for (const [id, name, regionId, extra] of locations) {
    push(newCard('location', name, { id, ...extra }));
    edge(id, regionId, 'belongs', '位于');
  }

  /* ---------------- 人物 ---------------- */
  const characters: Array<[string, string, string, Partial<Card>]> = [
    [
      'c1',
      '林澈',
      'character',
      {
        oneLiner: '青云宗最像废物的外门弟子，怀里揣着父亲的一把断剑',
        summary: '十七岁，炼气三层，十年不得寸进。父亲十年前死在北境，只留下一把断念与半块军牌。',
        body: '话少，挨打不吭声。认定的事九头牛拉不回。左肩有一道旧伤，是父亲失踪那年留下的。',
        tags: ['主角', '外门', '北境旧案'],
        importance: 0.95,
        fields: {
          role: '主角',
          desire: '查清父亲真正的死因，而不是听一句「战死」。',
          fear: '被当成废物——不是怕输，是怕没人再把他当回事。',
          flaw: '冲动易怒，受了激就顾不上后果。',
          lie: '力量就是一切——只要够强，就不必解释。',
          speech: '短句，不解释；被逼急了就噎人，说完自己也后悔。',
          arc: '起',
          secret: '体内有一缕不属于自己的剑意，来自断念古剑。',
        },
      },
    ],
    [
      'c2',
      '苏晚',
      'character',
      {
        oneLiner: '苏家嫡女，客气里带刀，越客气越危险',
        summary: '十八岁，筑基二层。被家族当作联姻筹码养大，却在暗中查苏家的账。',
        body: '嘴上从不得罪人，手里从不留活口。她比林澈早知道父亲之死的真相，只是一直没说。',
        tags: ['情感线', '苏家', '联姻'],
        importance: 0.85,
        fields: {
          role: '情感线',
          desire: '保住苏家，但不让苏家把自己卖出去。',
          fear: '被当作联姻筹码，最后连名字都留不下。',
          flaw: '心软，关键时刻会对不该心软的人心软。',
          lie: '家族高于一切——她一直这么告诉自己。',
          speech: '客气、慢，一句话里三个转折；越客气越说明她要动手了。',
          arc: '起',
          secret: '她知道林澈父亲死因的一部分，并且手里握着契约抄本。',
        },
      },
    ],
    [
      'c3',
      '苏擎',
      'character',
      {
        oneLiner: '苏家家主，慢条斯理地反问，然后把刀递到别人手里',
        summary: '筑基七层。用二十年把苏家从商贩做成商阀，靠的不是武力，是让所有人都欠他一点。',
        body: '疑心极重，但对外永远温和。灵矿、军需、消息，他都要插一手。',
        tags: ['反派', '苏家', '权谋'],
        importance: 0.8,
        fields: {
          role: '反派',
          desire: '吞下青云山脉的灵矿，让苏家成为东荒第一。',
          fear: '苏家在自己手里败落，死后连牌位都进不了祠堂。',
          flaw: '多疑，连自己的女儿都防。',
          lie: '只有握在手里的才是自己的。',
          speech: '语速慢，喜欢反问；发怒前会先笑一下。',
          arc: '承',
          secret: '他与血刀老祖有旧账，十年前那笔买卖他也在场。',
        },
      },
    ],
    [
      'c4',
      '血刀老祖',
      'character',
      {
        oneLiner: '关外的老魔，刀上凝着三十年前的血',
        summary: '金丹初期。为续命追着断念古剑追了十年，认定剑中残魂能治好他的枯竭。',
        body: '笑声像破风箱。不屑于讲道理，但极讲规矩——他答应的事一定做，杀的人也一定有理由。',
        tags: ['反派', '魔道', '杀父仇人'],
        importance: 0.75,
        fields: {
          role: '反派',
          desire: '拿到古剑残魂续命。',
          fear: '死，以及死前那种一点一点枯掉的感觉。',
          flaw: '傲慢，不把炼气期的小辈放在眼里。',
          lie: '强者不需要解释。',
          speech: '嘶哑、短促；笑的时候像破风箱。',
          arc: '承',
          secret: '当年杀死林澈父亲的人是他，但下令的是苏擎。',
        },
      },
    ],
    [
      'c5',
      '周长老',
      'character',
      {
        oneLiner: '青云宗最后一个还愿意讲规矩的人',
        summary: '筑基九层，守藏经阁二十年。知道宗门烂了，但还想护住最后一点骨气。',
        body: '慢，爱引古语，说话先叹气。当年把林澈父亲从北境带回来的人就是他。',
        tags: ['导师', '青云宗', '旧事知情人'],
        importance: 0.6,
        fields: {
          role: '导师',
          desire: '护住青云宗最后一点骨气。',
          fear: '青云宗在自己这一代手里散了。',
          flaw: '优柔，明知道该动手时总想再等等。',
          lie: '规矩能护住人。',
          speech: '慢，爱引古语；说到旧事会停顿很久。',
          arc: '承',
          secret: '他知道林澈父亲是守夜人，也知道那把断念是从哪来的。',
        },
      },
    ],
    [
      'c6',
      '陈砚',
      'character',
      {
        oneLiner: '内门首席，礼貌的讥讽是他的刀',
        summary: '筑基三年，宗门最看好的年轻剑修。他输不起，尤其输给林澈。',
        body: '出身旁支，全靠自己爬上内门，所以格外在意别人怎么看。',
        tags: ['同门', '对照组', '嫉妒'],
        importance: 0.5,
        fields: {
          role: '同门',
          desire: '稳稳拿到内门首席，不出任何意外。',
          fear: '输给林澈，坐实「旁支就是旁支」。',
          flaw: '嫉妒，藏得很好但藏不住手。',
          lie: '出身决定一切。',
          speech: '礼貌的讥讽；越是人多越客气。',
          arc: '起',
          secret: '大比那天他故意留手羞辱林澈，是有人指使的。',
        },
      },
    ],
    [
      'c7',
      '阿九',
      'character',
      {
        oneLiner: '会说反话的小妖，认得所有不该被认得的纹样',
        summary: '化形不完全的妖，混在万妖山脉入口一带。被万妖王夺走了名字，只剩一个编号。',
        body: '贪玩、好奇、记仇。嘴上说「人没一个好东西」，但会偷偷给迷路的人指路。',
        tags: ['隐藏', '妖', '情报'],
        importance: 0.55,
        fields: {
          role: '隐藏',
          desire: '找回被夺走的名字。',
          fear: '被同类吞掉，连编号都不剩。',
          flaw: '贪玩，关键时刻会分心。',
          lie: '妖没有情义。',
          speech: '说反话，正话反着讲；喜欢给人起外号。',
          arc: '起',
          secret: '她见过林澈父亲的军牌，而且知道第三种纹样的意思。',
        },
      },
    ],
    [
      'c8',
      '万妖王',
      'character',
      {
        oneLiner: '被封印在妖山深处的旧王，说话像在念碑文',
        summary: '金丹后期，上古大妖。要借天穹裂缝打开九州与人间的门。',
        body: '不急，不上火。它已经等了三百年，不差这几十年。',
        tags: ['隐藏', '大妖', '旧王'],
        importance: 0.65,
        fields: {
          role: '隐藏',
          desire: '借天穹裂缝打开九州与人间的门。',
          fear: '被重新封印回深渊。',
          flaw: '轻敌，把「人」当作一种会自己死掉的生物。',
          lie: '人妖天生为敌。',
          speech: '缓慢、宏大，像在念碑文；很少用第一人称。',
          arc: '承',
          secret: '它认识断念古剑的上一任主人。',
        },
      },
    ],
  ];
  for (const [id, name, _type, extra] of characters) {
    const card = newCard('character', name, { id, ...extra });
    push(card);
  }

  /* ---------------- 势力 / 物品 / 伏笔 ---------------- */
  push(
    newCard('faction', '青云宗', {
      id: 'f1',
      oneLiner: '三百年的正道宗门，如今靠一块矿脉吊着气',
      summary: '剑修三百，护山大阵尚存。宗门内部早已分成了两派：守山派与矿脉派。',
      importance: 0.7,
      tags: ['正道', '宗门'],
      fields: {
        goal: '守住山门与灵脉，别在东荒这一轮洗牌里散掉。',
        resources: '剑修三百、护山大阵、藏经阁、两处灵矿。',
        stance: '中立偏正道，对苏家忌惮。',
      },
    }),
  );
  push(
    newCard('faction', '大周军方', {
      id: 'f2',
      oneLiner: '五万边军守着断魂关，朝廷已经三年没发足饷',
      summary: '北境的实际控制者。对宗门没有好感，对魔道只有一种态度：杀。',
      importance: 0.7,
      tags: ['边军', '北境'],
      fields: {
        goal: '守住断魂关，别让魔道过线。',
        resources: '边军五万、玄铁重甲、关隘、斥候。',
        stance: '对魔道敌对，对宗门戒备。',
      },
    }),
  );
  push(
    newCard('faction', '苏家', {
      id: 'f3',
      oneLiner: '东荒最大的商阀，钱比剑硬',
      summary: '靠灵矿与军需起家。明面上做买卖，暗地里和关外有来往。',
      importance: 0.6,
      tags: ['商阀', '东荒'],
      fields: {
        goal: '垄断东荒的灵矿与商路。',
        resources: '钱、矿、商队、情报网、玄铁令。',
        stance: '逐利，随时可以换边。',
      },
    }),
  );

  push(
    newCard('item', '断念古剑', {
      id: 'i1',
      oneLiner: '断了一半的剑，剑柄里睡着一个不是人的东西',
      summary: '林澈父亲的遗物。剑身断口平滑，像是被什么东西一口咬断的。',
      importance: 0.9,
      tags: ['遗物', '古剑', '残魂'],
      fields: {
        ability: '随持有者的心意出鞘；可斩断低阶术法与阵法。',
        cost: '每次出鞘都会吃掉持有者的一小段记忆，或一段寿元。',
        holder: '林澈',
        chekhov: '关键道具',
      },
    }),
  );
  push(
    newCard('item', '父亲军牌', {
      id: 'i2',
      oneLiner: '半块军牌，背面刻着三种不属于边军的纹样',
      summary: '北境守军的制式军牌，断口处有灼烧痕迹。背面的第三种纹样无人认得。',
      importance: 0.8,
      tags: ['遗物', '谜题', '守夜人'],
      fields: {
        ability: '能打开万妖山脉入口的部分禁制；是「守夜人」身份的信物。',
        cost: '无，但持有它会被某些人追踪。',
        holder: '林澈',
        chekhov: '谜题线索',
      },
    }),
  );
  push(
    newCard('item', '玄铁令', {
      id: 'i3',
      oneLiner: '能调一队边军的黑铁令牌，被苏家拆成了两半',
      summary: '大周军方发给苏家的通行与调兵凭证。苏家把它拆成两半，一半在林澈手里，一半在苏晚手里。',
      importance: 0.6,
      tags: ['令牌', '苏家'],
      fields: {
        ability: '合令可调动断魂关一队守军，仅一次。',
        cost: '用一次就作废，且会被军方追责。',
        holder: '苏擎（原本）→ 林澈、苏晚各持一半',
        chekhov: '关键道具',
      },
    }),
  );

  push(
    newCard('foreshadow', '军牌上的第三种纹样', {
      id: 'fo1',
      oneLiner: '那三个圈不是边军的记号，是守夜人的',
      summary: '第三章军牌被认出，第四章纹样现世。计划在第八章揭晓——守夜人一直在监视天穹裂缝。',
      importance: 0.8,
      tags: ['身份', '守夜人'],
      fields: {
        hint: '军牌背面除了边军编号，还有三个套在一起的圆，摸上去是烫的。',
        planted: '第三章·断魂关入伍',
        plan: '第八章·北境旧案：由周长老认出纹样，引出守夜人。',
        category: '秘密',
      },
    }),
  );
  push(
    newCard('foreshadow', '古剑里的残魂', {
      id: 'fo2',
      oneLiner: '剑断了，剑柄里那个东西没死',
      summary: '第二章认主时埋下，第五章夜袭时第一次苏醒。计划第九章彻底交代来历。',
      importance: 0.75,
      tags: ['古剑', '残魂'],
      fields: {
        hint: '认主那天，剑柄里传出一声很轻的、像有人翻身的声音。',
        planted: '第二章·亡父遗物认主',
        plan: '第九章·剑中故人：残魂是上一任守夜人。',
        category: '物品',
      },
    }),
  );
  push(
    newCard('foreshadow', '苏晚的联姻', {
      id: 'fo3',
      oneLiner: '苏家要把她嫁到关外，换一条商路',
      summary: '第四章苏晚来信时埋下，第五章契约暴露。计划第七章由苏晚自己掀桌。',
      importance: 0.7,
      tags: ['感情线', '苏家'],
      fields: {
        hint: '信纸边缘有被反复折叠的痕迹，那是一个被划掉的名字。',
        planted: '第四章·苏晚来信',
        plan: '第七章·一纸婚书：苏晚当众烧掉婚书。',
        category: '关系',
      },
    }),
  );

  /* ---------------- 事件 ---------------- */
  const events: Array<[string, string, number, number, Partial<Card>]> = [
    [
      'e1',
      '宗门大比受辱',
      1,
      1,
      {
        oneLiner: '木剑被当众折断，看台上没人替他说话',
        summary:
          '大比最后一轮，林澈对上内门首席陈砚。对手故意留手，把他耍了半炷香才折断木剑。',
        importance: 0.85,
        status: 'written',
        tags: ['激励事件', '受辱'],
        fields: {
          time: '苍梧历三百年·秋，大比第三日',
          place: '青云宗·演武场',
          participants: ['c1', 'c6', 'c5'],
          goal: '赢下大比，证明自己不是废物。',
          obstacle: '陈砚已筑基三年，境界差距摆在台上。',
          turn: '陈砚明明能一剑结束，却偏要留手，等台下笑够了才折断木剑。',
          outcome: '林澈重伤，被抬下擂台；青云宗上下都记住了「那个废物」。',
          delta: '林澈.声望 -30；陈砚.声望 +10；林澈.与陈砚 关系 -50',
          beat: '激励事件',
          tension: '6',
          pov: '林澈',
          reveal: '陈砚留手是有人授意——但林澈当时没看出来。',
        },
        order: 1,
        chapter: 1,
        chainIds: ['chain-1'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l2' },
      },
    ],
    [
      'e2',
      '藏经阁夜遇',
      1,
      2,
      {
        oneLiner: '长老假装没看见，留了一句话',
        summary: '林澈夜里潜进藏经阁偷阅剑谱，被周长老撞见。长老没有抓他，只留下一句「别把它当剑用」。',
        importance: 0.7,
        status: 'written',
        tags: ['铺垫', '导师'],
        fields: {
          time: '大比三日后，夜',
          place: '青云宗·藏经阁',
          participants: ['c1', 'c5'],
          goal: '找一部能赢回来的剑谱。',
          obstacle: '藏经阁七层，夜里有人守。',
          turn: '周长老早已察觉，却在他翻到第七层时才出声。',
          outcome: '林澈得到半部《断念残篇》，以及一句听不懂的话。',
          delta: '林澈.获得线索「断念」；周长老.对林澈 态度 +10',
          beat: '铺垫',
          tension: '4',
          pov: '林澈',
          reveal: '周长老认识「断念」这个名字。',
        },
        order: 2,
        chapter: 1,
        chainIds: ['chain-2', 'chain-3'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l3' },
      },
    ],
    [
      'e3',
      '亡父遗物认主',
      2,
      3,
      {
        oneLiner: '血滴在断口上，断剑第一次响了',
        summary: '林澈在山门收拾父亲遗物，血滴在断剑断口，古剑认主，剑柄里传来一声很轻的翻身声。',
        importance: 0.9,
        status: 'written',
        tags: ['上升', '认主', '伏笔'],
        fields: {
          time: '被逐出宗门的前夜',
          place: '青云宗·山门',
          participants: ['c1'],
          goal: '打开父亲留下的木匣。',
          obstacle: '断剑不认他，三次脱手。',
          turn: '掌心被断口割破，血渗进剑身，剑鸣如叹。',
          outcome: '古剑认主，林澈第一次听见剑里的声音。',
          delta: '林澈.能力 +1；断念古剑.持有者=林澈；伏笔「残魂」埋下',
          beat: '上升',
          tension: '6',
          pov: '林澈',
          reveal: '剑里有一个不是人的东西。',
        },
        order: 3,
        chapter: 2,
        chainIds: ['chain-3'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l1' },
      },
    ],
    [
      'e4',
      '被逐出宗门',
      2,
      4,
      {
        oneLiner: '宗门要一个交代，苏家要一个结果',
        summary: '大比之后苏家施压，宗门决定把林澈逐出山门。周长老以「下山历练」的名义保下他一条命。',
        importance: 0.9,
        status: 'written',
        tags: ['转折', '逐出'],
        fields: {
          time: '认主次日，晨',
          place: '青云宗·山门',
          participants: ['c1', 'c3', 'c5', 'c6'],
          goal: '宗门要给苏家一个交代。',
          obstacle: '苏擎亲自上山，话里话外都是灵矿。',
          turn: '周长老抢先开口，把「逐出」说成「下山历练」。',
          outcome: '林澈离开青云宗，只带走一把断剑和半块军牌。',
          delta: '林澈.身份=散修；林澈.与苏家 关系 -40；林澈.与周长老 关系 +20',
          beat: '转折',
          tension: '7',
          pov: '林澈',
          reveal: '苏家对灵矿的胃口比所有人想的都大。',
        },
        order: 4,
        chapter: 2,
        chainIds: ['chain-1'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l1' },
      },
    ],
    [
      'e5',
      '北上途中遇袭',
      2,
      5,
      {
        oneLiner: '第一次用剑，就用了不该用的力量',
        summary: '林澈北上投军，在驿道上被血刀老祖截杀。断念第一次出鞘，斩断对方的刀，也暴露了剑意。',
        importance: 0.85,
        status: 'written',
        tags: ['上升', '遇袭'],
        fields: {
          time: '离山第七日，黄昏',
          place: '东荒驿道',
          participants: ['c1', 'c4'],
          goal: '活下来，保住父亲的剑。',
          obstacle: '血刀老祖是金丹初期，差距如天堑。',
          turn: '断念不听使唤地自己出鞘，剑光把整条驿道照白了一瞬。',
          outcome: '林澈重伤，血刀老祖退走——但他已经知道剑在谁手里。',
          delta: '林澈.重伤；血刀老祖.知道古剑持有者；林澈.失去一段记忆',
          beat: '上升',
          tension: '8',
          pov: '林澈',
          reveal: '古剑的力量远超炼气期能承受的极限。',
        },
        order: 5,
        chapter: 2,
        chainIds: ['chain-1', 'chain-3'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l1' },
      },
    ],
    [
      'e6',
      '断魂关入伍',
      3,
      6,
      {
        oneLiner: '军牌被认出来的那一刻，他成了「那个人的儿子」',
        summary: '林澈带着军牌投军，守关的老卒认出军牌，破例收他入营。',
        importance: 0.7,
        status: 'written',
        tags: ['铺垫', '入伍', '伏笔'],
        fields: {
          time: '入冬第一场雪',
          place: '断魂关·军营大帐',
          participants: ['c1'],
          goal: '活下去，查父亲的事。',
          obstacle: '边军不收来历不明的人。',
          turn: '老卒翻过军牌，手抖了一下，叫出了父亲的名字。',
          outcome: '林澈入营；伏笔「军牌纹样」埋下。',
          delta: '林澈.身份=边军新卒；林澈.进入断魂关；伏笔「纹样」埋下',
          beat: '铺垫',
          tension: '4',
          pov: '林澈',
          reveal: '父亲在断魂关很有名。',
        },
        order: 6,
        chapter: 3,
        chainIds: ['chain-1'],
        meta: { x: 560, y: 110, regionId: 'r2', locationId: 'l5' },
      },
    ],
    [
      'e7',
      '关隘夜巡遇魔修',
      3,
      7,
      {
        oneLiner: '魔修在用和古剑相同的吐息法',
        summary: '林澈夜巡，撞见魔修在关墙下引动什么。交手后得到半块玄铁令。',
        importance: 0.75,
        status: 'written',
        tags: ['上升', '夜巡'],
        fields: {
          time: '雪夜，三更',
          place: '断魂关·关隘',
          participants: ['c1', 'c4'],
          goal: '查清魔修在关墙下做什么。',
          obstacle: '对方是筑基后期，且熟悉关防。',
          turn: '魔修的吐息法，和林澈在剑里听到的声音一模一样。',
          outcome: '魔修退走，留下半块玄铁令。',
          delta: '林澈.获得玄铁令（半块）；林澈.怀疑古剑与魔道有关',
          beat: '上升',
          tension: '6',
          pov: '林澈',
          reveal: '古剑的来历可能不干净。',
        },
        order: 7,
        chapter: 3,
        chainIds: ['chain-1'],
        meta: { x: 560, y: 110, regionId: 'r2', locationId: 'l4' },
      },
    ],
    [
      'e8',
      '军牌上的第三种纹样',
      4,
      8,
      {
        oneLiner: '三个套在一起的圆，是守夜人的记号',
        summary: '老卒认出军牌背面的纹样，说出「守夜人」三个字。林澈第一次知道父亲的身份。',
        importance: 0.9,
        status: 'written',
        tags: ['中点', '揭示', '伏笔回收'],
        fields: {
          time: '入营一月后',
          place: '断魂关·军营大帐',
          participants: ['c1'],
          goal: '弄清军牌背面的纹样。',
          obstacle: '营里没人愿意提「守夜人」。',
          turn: '一个快死的老卒认出纹样，说完就咽了气。',
          outcome: '林澈知道父亲是守夜人；伏笔「第三种纹样」回收一半。',
          delta: '林澈.知道父亲身份；伏笔「纹样」进度 50%',
          beat: '中点',
          tension: '7',
          pov: '林澈',
          reveal: '守夜人不是传说，是编制。',
        },
        order: 8,
        chapter: 4,
        chainIds: ['chain-1', 'chain-3'],
        meta: { x: 560, y: 110, regionId: 'r2', locationId: 'l5' },
      },
    ],
    [
      'e9',
      '苏晚来信',
      4,
      9,
      {
        oneLiner: '信里夹着半块玄铁令，和一张被划掉的名字',
        summary: '苏晚派人送信到断魂关，信里夹着另外半块玄铁令。两条线第一次接上。',
        importance: 0.8,
        status: 'written',
        tags: ['铺垫', '感情线', '合令'],
        fields: {
          time: '同月，驿马三日',
          place: '青云宗·山门',
          participants: ['c2'],
          goal: '把半块令送到林澈手里，不被人发现。',
          obstacle: '苏家盯着她的每一封信。',
          turn: '她把令缝在信纸夹层，用一句家常话做暗号。',
          outcome: '玄铁令合璧；苏晚与林澈开始互信。',
          delta: '玄铁令.可合令；林澈.与苏晚 信任 +20；伏笔「联姻」埋下',
          beat: '铺垫',
          tension: '5',
          pov: '苏晚',
          reveal: '苏晚在查苏家，而且查得比林澈深。',
        },
        order: 9,
        chapter: 4,
        chainIds: ['chain-2'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l1' },
      },
    ],
    [
      'e10',
      '血刀老祖夜袭',
5,
      10,
      {
        oneLiner: '剑里那个东西醒了，认出了杀父仇人',
        summary: '血刀老祖夜袭断魂关，为夺古剑。断念残魂第一次苏醒，喊出一个名字。',
        importance: 1,
        status: 'written',
        tags: ['高潮', '复仇', '残魂苏醒'],
        fields: {
          time: '腊月，雪夜',
          place: '断魂关·关隘',
          participants: ['c1', 'c4'],
          goal: '保住古剑，保住关。',
          obstacle: '金丹初期对炼气，几乎没有胜算。',
          turn: '断念里的残魂醒了，用林澈的嘴喊出一个名字——那是父亲的名字。',
          outcome: '血刀老祖重伤退走；林澈知道杀父仇人就在眼前。',
          delta: '林澈.知道杀父仇人；古剑.残魂=苏醒；伏笔「残魂」回收一半；林澈.重伤',
          beat: '高潮',
          tension: '10',
          pov: '林澈',
          reveal: '残魂认识父亲，也认识血刀老祖。',
        },
        order: 10,
        chapter: 5,
        chainIds: ['chain-1', 'chain-3'],
        meta: { x: 560, y: 110, regionId: 'r2', locationId: 'l4' },
      },
    ],
    [
      'e11',
      '苏家与魔道交易',
5,
      11,
      {
        oneLiner: '契约上写着灵矿，也写着一个人的名字',
        summary: '苏晚偷出苏家与魔道的契约抄本，发现当年那笔买卖里也有林澈父亲的名字。',
        importance: 0.9,
        status: 'written',
        tags: ['高潮', '权谋', '双线合流'],
        fields: {
          time: '同一夜，青云宗',
          place: '青云宗·山门',
          participants: ['c2', 'c3', 'c4'],
          goal: '拿到苏家与魔道勾结的证据。',
          obstacle: '苏擎把契约锁在祠堂。',
          turn: '契约末尾的担保人一栏，写着「林」字——是林澈父亲的笔迹。',
          outcome: '证据落到苏晚手里；苏晚决定不再替苏家遮掩。',
          delta: '苏家.与魔道=勾结（苏晚已知）；苏晚.与苏家 关系 -30',
          beat: '高潮',
          tension: '8',
          pov: '苏晚',
          reveal: '林澈父亲当年是苏家与魔道交易的中人。',
        },
        order: 11,
        chapter: 5,
        chainIds: ['chain-1', 'chain-2'],
        meta: { x: 120, y: 120, regionId: 'r1', locationId: 'l1' },
      },
    ],
    [
      'e12',
      '万妖山脉入口',
6,
      12,
      {
        oneLiner: '军牌贴上石壁，雾裂开一道门',
        summary: '林澈按军牌纹样的指引找到入口，阿九出现，认出军牌上的第三种纹样。',
        importance: 0.85,
        status: 'planned',
        tags: ['规划', '新地图', '妖山'],
        fields: {
          time: '开春，月圆夜',
          place: '万妖山脉·入口',
          participants: ['c1', 'c7'],
          goal: '找到父亲笔记里说的那道门。',
          obstacle: '入口只在月圆夜开，且需要军牌。',
          turn: '阿九认得军牌，说「你爹欠我一个名字」。',
          outcome: '入口开启，阿九同行。',
          delta: '林澈.进入万妖山脉；阿九.与林澈 关系 +20',
          beat: '收束',
          tension: '7',
          pov: '林澈',
          reveal: '父亲来过妖山，而且欠了妖一个人情。',
        },
        order: 12,
        chapter: 6,
        chainIds: ['chain-1'],
        meta: { x: 940, y: 260, regionId: 'r3', locationId: 'l7' },
      },
    ],
    [
      'e13',
      '断念的代价',
6,
      13,
      {
        oneLiner: '他拿父亲之死的记忆，换了一次出手',
        summary: '妖山深处，万妖王逼问残魂来历。林澈以记忆为价，请残魂出手。',
        importance: 0.95,
        status: 'planned',
        tags: ['规划', '代价', '高潮前夜'],
        fields: {
          time: '妖山第七日',
          place: '万妖山脉·入口',
          participants: ['c1', 'c8'],
          goal: '从万妖王手里活下来。',
          obstacle: '万妖王金丹后期，且能压制残魂。',
          turn: '残魂开口要价：一段关于父亲的记忆。',
          outcome: '林澈活下来，却记不清父亲的脸了。',
          delta: '林澈.记忆缺失（父亲相关）；古剑.能力 +2；林澈.弧光 转向「合」',
          beat: '余波',
          tension: '9',
          pov: '林澈',
          reveal: '残魂与万妖王认识，且比想象中更久。',
        },
        order: 13,
        chapter: 6,
        chainIds: ['chain-3'],
        meta: { x: 940, y: 260, regionId: 'r3', locationId: 'l7' },
      },
    ],
    [
      'e14',
      '苏晚的选择',
6,
      14,
      {
        oneLiner: '她烧了矿契，也烧了自己的退路',
        summary: '苏擎把苏晚囚在医帐，逼她签婚书。苏晚烧了矿契，苏家与她反目。',
        importance: 0.85,
        status: 'planned',
        tags: ['规划', '感情线', '转折'],
        fields: {
          time: '开春，林澈入妖山的同一夜',
          place: '断魂关·战地医帐',
          participants: ['c2', 'c3'],
          goal: '不被押去关外成婚。',
          obstacle: '苏擎用苏家三百口人的生计逼她。',
          turn: '她当着苏擎的面烧了矿契，火光里第一次没笑。',
          outcome: '苏晚与苏家决裂，带着半块玄铁令北上。',
          delta: '苏晚.与苏家 决裂；苏晚.位置 → 断魂关；伏笔「联姻」回收',
          beat: '转折',
          tension: '8',
          pov: '苏晚',
          reveal: '苏家的矿契是假的，真契在苏擎手里。',
        },
        order: 14,
        chapter: 6,
        chainIds: ['chain-2'],
        meta: { x: 560, y: 110, regionId: 'r2', locationId: 'l6' },
      },
    ],
  ];
  for (const [id, name, _ch, _order, extra] of events) {
    push(newCard('event', name, { id, ...extra }));
  }

  /* ---------------- 章节 ---------------- */
  const chapters: Chapter[] = [
    {
      id: 'ch1',
      number: 1,
      title: '大比之辱',
      summary: '林澈在大比上被陈砚当众折断木剑，藏经阁夜遇周长老，得到半部《断念残篇》。',
      eventIds: ['e1', 'e2'],
      locations: { c1: 'l2', c2: 'l2', c6: 'l2', c5: 'l3', c3: 'l1', c4: 'l4', c7: 'l7', c8: 'l7' },
    },
    {
      id: 'ch2',
      number: 2,
      title: '逐出山门',
      summary: '苏家施压，林澈被逐出青云宗。临行前古剑认主，北上途中遭血刀老祖截杀。',
      eventIds: ['e3', 'e4', 'e5'],
      locations: { c1: 'l1', c2: 'l1', c3: 'l1', c5: 'l1', c6: 'l2', c4: 'l4', c7: 'l7', c8: 'l7' },
    },
    {
      id: 'ch3',
      number: 3,
      title: '断魂关',
      summary: '林澈带军牌投军，被老卒认出。夜巡撞见魔修，得到半块玄铁令。',
      eventIds: ['e6', 'e7'],
      locations: { c1: 'l5', c2: 'l1', c3: 'l1', c5: 'l1', c6: 'l2', c4: 'l4', c7: 'l7', c8: 'l7' },
    },
    {
      id: 'ch4',
      number: 4,
      title: '军牌上的第三种纹样',
      summary: '老卒认出守夜人纹样后咽气。苏晚来信，半块玄铁令合璧。',
      eventIds: ['e8', 'e9'],
      locations: { c1: 'l5', c2: 'l1', c3: 'l1', c5: 'l1', c6: 'l2', c4: 'l4', c7: 'l7', c8: 'l7' },
    },
    {
      id: 'ch5',
      number: 5,
      title: '夜袭与契约',
      summary: '血刀老祖夜袭断魂关，古剑残魂苏醒，林澈知道杀父仇人。苏晚拿到苏家与魔道的契约。',
      eventIds: ['e10', 'e11'],
      locations: { c1: 'l4', c2: 'l1', c3: 'l1', c5: 'l1', c6: 'l2', c4: 'l4', c7: 'l7', c8: 'l7' },
    },
    {
      id: 'ch6',
      number: 6,
      title: '万妖之门',
      summary: '（规划中）林澈入妖山，以记忆为价请残魂出手；苏晚烧掉矿契与苏家决裂。',
      eventIds: ['e12', 'e13', 'e14'],
      locations: { c1: 'l7', c2: 'l6', c3: 'l6', c5: 'l1', c6: 'l2', c4: 'l4', c7: 'l7', c8: 'l7' },
    },
  ];

  /* ---------------- 链 ---------------- */
  const chains: Chain[] = [
    {
      id: 'chain-1',
      name: '复仇主线',
      kind: '主线',
      goal: '查清父亲之死，让苏家与血刀老祖付出代价',
      color: '#b3452f',
      eventIds: ['e1', 'e4', 'e5', 'e7', 'e8', 'e10', 'e12'],
    },
    {
      id: 'chain-2',
      name: '感情线',
      kind: '感情',
      goal: '苏晚从家族筹码变成自己人，与林澈互信',
      color: '#c2734a',
      eventIds: ['e2', 'e9', 'e11', 'e14'],
    },
    {
      id: 'chain-3',
      name: '藏剑秘密',
      kind: '支线',
      goal: '古剑残魂的来历，以及守夜人与天穹裂缝的关系',
      color: '#a8863c',
      eventIds: ['e2', 'e3', 'e8', 'e10', 'e13'],
    },
  ];

  /* ---------------- 边 ---------------- */
  // 人物关系
  edge('c1', 'c2', 'relation', '青梅·暗生', 55);
  edge('c1', 'c6', 'relation', '同门竞争', -20);
  edge('c1', 'c5', 'relation', '师徒', 70);
  edge('c1', 'c3', 'relation', '旧案牵连', -60);
  edge('c1', 'c4', 'relation', '杀父之仇', -100);
  edge('c2', 'c3', 'relation', '父女', 30);
  edge('c2', 'c4', 'relation', '交易对象', -30);
  edge('c3', 'c5', 'relation', '立场对立', -40);
  edge('c3', 'c4', 'relation', '旧账同谋', 20);
  edge('c4', 'c8', 'relation', '互相利用', 20);
  edge('c1', 'c7', 'relation', '妖山偶遇', 10);
  edge('c7', 'c8', 'relation', '同族·被夺名', 30);
  edge('c5', 'c6', 'relation', '师徒', 40);

  // 人物 → 势力 / 区域
  edge('c1', 'f1', 'belongs', '外门弟子');
  edge('c5', 'f1', 'belongs', '长老');
  edge('c6', 'f1', 'belongs', '内门首席');
  edge('c2', 'f3', 'belongs', '嫡女');
  edge('c3', 'f3', 'belongs', '家主');
  edge('c7', 'r3', 'belongs', '栖身');
  edge('c8', 'r3', 'belongs', '盘踞');

  // 势力 → 区域
  edge('f1', 'r1', 'controls', '山门与灵脉', 80);
  edge('f2', 'r2', 'controls', '边关', 90);
  edge('f3', 'r1', 'controls', '灵矿商路', 40);

  // 持有
  edge('c1', 'i1', 'owns', '持有');
  edge('c1', 'i2', 'owns', '持有');
  edge('c3', 'i3', 'owns', '持有一半');

  // 通行
  edge('r1', 'r2', 'path', '驿道·七日');
  edge('r2', 'r1', 'path', '驿道·七日');
  edge('r1', 'r3', 'secret', '后山秘道·月圆单向');
  edge('r2', 'r3', 'secret', '关外迷雾');
  edge('l1', 'l2', 'path', '石阶');
  edge('l1', 'l3', 'path', '回廊');
  edge('l4', 'l5', 'path', '营道');
  edge('l4', 'l6', 'path', '担架道');
  edge('l5', 'l6', 'path', '营道');

  // 事件因果
  edge('e1', 'e4', 'causes', '受辱招来苏家施压');
  edge('e2', 'e3', 'causes', '残篇指引认主');
  edge('e3', 'e5', 'causes', '剑鸣引来血刀老祖');
  edge('e4', 'e6', 'causes', '离山北上投军');
  edge('e5', 'e6', 'causes', '重伤被边军所救');
  edge('e6', 'e7', 'causes', '入伍后夜巡');
  edge('e7', 'e8', 'causes', '玄铁令牵出军牌');
  edge('e8', 'e10', 'causes', '知道守夜人引来夜袭');
  edge('e9', 'e11', 'causes', '合令让苏晚敢查祠堂');
  edge('e10', 'e12', 'causes', '残魂苏醒指引妖山');
  edge('e11', 'e14', 'causes', '契约逼苏晚决裂');
  edge('e12', 'e13', 'causes', '入山引出旧王');

  // 伏笔 → 事件
  edge('fo1', 'e8', 'secret', '纹样现世');
  edge('fo2', 'e10', 'secret', '残魂苏醒');
  edge('fo3', 'e11', 'secret', '契约里的名字');

  // 世界 → 区域
  edge('w1', 'r1', 'belongs', '东荒');
  edge('w1', 'r2', 'belongs', '北境');
  edge('w1', 'r3', 'belongs', '妖山');

  return {
    version: 1,
    projectId: '',
    revision: 0,
    creationMode: 'storycard',
    title: '苍梧卷',
    genre: '玄幻',
    theme: '一个人要花多大力气，才能不被世界当成废物',
    premise: '灵气退潮的九州，一个被逐出宗门的废物，追着父亲留下的一把断剑，从东荒追到北境，再追进妖山。',
    cards,
    edges,
    chains,
    chapters,
  };
}