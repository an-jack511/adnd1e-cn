/**
 * Verified AD&D 1e PHB core-class capability facts.
 *
 * This pack does not duplicate progression, spell-capacity, thief-skill,
 * attack, saving-throw, or follower-composition tables.  A delegated entry
 * is an explicit link to such a subsystem, never an invented summary value.
 */
import type { InitialCoreClassId } from './core-progression';

const phbFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";
const dmgFile = "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";
const phbHash = 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213';
const dmgHash = '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669';

const source = (book: 'PHB' | 'DMG', printedPages: readonly number[], section: string, scope: string) => Object.freeze({
  book, printedPages: Object.freeze([...printedPages]), pdfPages: Object.freeze(printedPages.map(page => page + 1)),
  sourceFile: book === 'PHB' ? phbFile : dmgFile, sha256: book === 'PHB' ? phbHash : dmgHash,
  section, scope, verification: 'local-page-image-and-embedded-text' as const,
});

export const coreClassCapabilitySources = Object.freeze({
  'phb:20:cleric': source('PHB', [20], 'The Cleric', 'Turning, spell/weapon strictures, level 8 worship-place followers, level 9 religious stronghold.'),
  'phb:20-22:druid': source('PHB', [20, 21, 22], 'The Druid', 'Nature strictures, innate powers, languages, saves, limited seats, attendants and habitat.'),
  'phb:22:fighter': source('PHB', [22], 'The Fighter', 'Equipment breadth and level 9 freehold, troops and revenue.'),
  'phb:22-24:paladin': source('PHB', [22, 23, 24], 'The Paladin', 'Benefits, level unlocks, alignment/wealth/item/association strictures and no fighter troops.'),
  'phb:24-25:ranger': source('PHB', [24, 25], 'The Ranger', 'Giant-class damage, surprise/tracking, spells, followers, alignment/wealth/company/hiring strictures.'),
  'phb:25:magic-user': source('PHB', [25], 'The Magic-User', 'Spell books, level 11 manufacture and level 12 stronghold.'),
  'phb:26:illusionist': source('PHB', [26], 'The Illusionist', 'Magic-item restrictions and level 10 illusion-item manufacture.'),
  'phb:26-28:thief': source('PHB', [26, 27, 28], 'The Thief', 'Thief functions, backstab, languages, scrolls, level 10 headquarters and gang.'),
  'phb:28-30:assassin': source('PHB', [28, 29, 30], 'The Assassin', 'Poison/assassination/disguise, thief equivalence, languages, hirelings and guild advancement.'),
  'phb:30-32:monk': source('PHB', [30, 31, 32], 'The Monk', 'Combat/defence progression, powers, restrictions, upper-level contests and followers.'),
  'dmg:16:followers': source('DMG', [16], 'Followers for Upper Level Player Characters', 'Detailed composition tables are referee-facing and are not reproduced by this pack.'),
} as const);
export type CoreClassCapabilitySourceId = keyof typeof coreClassCapabilitySources;
export type CapabilityStatus = 'verified' | 'needs-dm' | 'unsupported';
export type CapabilityKind = 'action' | 'passive' | 'restriction' | 'spell-track' | 'follower' | 'stronghold' | 'advancement-gate' | 'delegated-table';
export type CapabilityVisibility = 'player' | 'dm-summary' | 'dm-secret';
export type CapabilityResolution = 'automatic' | 'record-use' | 'requires-roll' | 'requires-dm' | 'delegated';

export interface CoreClassCapability {
  readonly id: string;
  readonly classId: InitialCoreClassId;
  readonly label: string;
  readonly kind: CapabilityKind;
  readonly minimumLevel: number;
  readonly status: CapabilityStatus;
  readonly visibility: CapabilityVisibility;
  readonly resolution: CapabilityResolution;
  readonly rule: string;
  readonly sourceIds: readonly CoreClassCapabilitySourceId[];
  readonly engineFormula?: 'paladin-lay-on-hands' | 'paladin-cure-disease' | 'paladin-turning-level' | 'ranger-giant-damage' |
    'druid-extra-languages' | 'monk-weapon-damage-bonus' | 'monk-surprise-percent' | 'monk-esp-percent' |
    'monk-catalepsy-turns' | 'monk-self-heal' | 'monk-charm-affect-percent' | 'monk-follower-additions';
  readonly delegatedTo?: string;
}

const c = (value: CoreClassCapability): CoreClassCapability => Object.freeze(value);
const list = (...values: CoreClassCapability[]): readonly CoreClassCapability[] => Object.freeze(values);
const phb = (...sourceIds: CoreClassCapabilitySourceId[]) => Object.freeze(sourceIds);

export const coreClassCapabilities: Readonly<Record<InitialCoreClassId, readonly CoreClassCapability[]>> = Object.freeze({
  cleric: list(
    c({id:'cleric-turn-undead',classId:'cleric',label:'驱散或控制不死生物',kind:'delegated-table',minimumLevel:1,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',rule:'能力自1级存在；具体矩阵仅供DM使用，不向玩家档案泄露结果门槛。',delegatedTo:'DM cleric turning matrix',sourceIds:phb('phb:20:cleric')}),
    c({id:'cleric-blood-shedding-weapon-ban',classId:'cleric',label:'流血刃器限制',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'不得使用会流血的刃器或尖刺武器。',sourceIds:phb('phb:20:cleric')}),
    c({id:'cleric-spell-track',classId:'cleric',label:'牧师法术容量',kind:'spell-track',minimumLevel:1,status:'verified',visibility:'player',resolution:'delegated',rule:'每日容量及智慧调整由核心法术容量模块计算；神术授予仍由DMG神术授予规则处理。',delegatedTo:'core-spell-capacity/core-spell-acquisition',sourceIds:phb('phb:20:cleric')}),
    c({id:'cleric-worship-followers',classId:'cleric',label:'礼拜场所追随者',kind:'follower',minimumLevel:8,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'建立至少2,000平方英尺、含祭坛/圣龛/礼拜堂的礼拜场所后，吸引2d10×10名狂热忠诚且无薪追随者；武装人员类型与人数由DM告知。',sourceIds:phb('phb:20:cleric','dmg:16:followers')}),
    c({id:'cleric-religious-stronghold',classId:'cleric',label:'宗教据点',kind:'stronghold',minimumLevel:9,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'可建含至少2,500平方英尺底层大圣殿的宗教据点；宗教援助使通常建造费减半，清剿并有人居住后每居民每月收入9sp。',sourceIds:phb('phb:20:cleric')}),
  ),
  druid: list(
    c({id:'druid-nature-and-equipment-strictures',classId:'druid',label:'自然与装备戒律',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-dm',rule:'仅皮甲和木盾；金属甲破坏法术能力；保护树木、野生植物与庄稼，除生存/食用所需外避免杀动物；具体违背后果需DM裁定。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-no-turning',classId:'druid',label:'不能驱散不死生物',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'不能驱散或控制不死生物、恶魔或魔鬼。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-fire-lightning-save',classId:'druid',label:'火焰与闪电豁免',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'对火焰和闪电（电击）攻击的豁免骰获得+2。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-secret-language',classId:'druid',label:'德鲁伊秘语',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'除其他语言外掌握德鲁伊秘语。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-nature-identification-and-passage',classId:'druid',label:'自然辨识与穿越灌木',kind:'passive',minimumLevel:3,status:'verified',visibility:'player',resolution:'automatic',rule:'辨识植物、动物及纯净水；以正常移动穿过繁茂灌木且不留可辨踪迹。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-extra-languages',classId:'druid',label:'自然生物语言',kind:'passive',minimumLevel:3,status:'verified',visibility:'player',resolution:'automatic',engineFormula:'druid-extra-languages',rule:'3级获得列表中一种语言，此后每升一级再获得一种。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-woodland-charm-immunity',classId:'druid',label:'林地生物魅惑免疫',kind:'passive',minimumLevel:7,status:'verified',visibility:'player',resolution:'automatic',rule:'免疫本质上与林地相关生物所施放的魅惑法术。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-shape-change',classId:'druid',label:'变形',kind:'action',minimumLevel:7,status:'verified',visibility:'player',resolution:'record-use',rule:'每日最多三次，爬虫/鸟/哺乳动物各一次；体型范围和心智保留依原文，每次新形态治疗既有伤害的d6×10%。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-upper-level-seats',classId:'druid',label:'高阶德鲁伊席位',kind:'advancement-gate',minimumLevel:12,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'12/13/14级分别只有9/3/1席；须有空缺或按原文战胜在位者，XP本身不自动授予职位与能力。',sourceIds:phb('phb:20-22:druid')}),
    c({id:'druid-office-attendants',classId:'druid',label:'高阶职位随侍',kind:'follower',minimumLevel:12,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'12级每席有3名下级德鲁伊；大德鲁伊由九名9环入门者随侍。具体等级随职位资历而变，需战役席位状态。',sourceIds:phb('phb:20-22:druid')}),
  ),
  fighter: list(
    c({id:'fighter-all-arms-and-armor',classId:'fighter',label:'全部武器与护甲',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'可使用任何护甲、盾与武器；熟练槽和未熟练惩罚由武器熟练模块处理。',delegatedTo:'core-weapon-proficiency',sourceIds:phb('phb:22:fighter')}),
    c({id:'fighter-attack-rate',classId:'fighter',label:'战士攻击次数',kind:'delegated-table',minimumLevel:1,status:'verified',visibility:'player',resolution:'delegated',rule:'对通常目标的武器攻击次数随等级变化；不足1HD与0级目标另有逐等级攻击例外，不在本模块重抄战斗表。',delegatedTo:'combat attack-rate table',sourceIds:phb('phb:22:fighter','phb:24-25:ranger')}),
    c({id:'fighter-freehold',classId:'fighter',label:'自由领与部队',kind:'stronghold',minimumLevel:9,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'建城堡并清剿半径20–50英里后，可自动吸引由高于平均水平战士率领的武装人员；维持据点并支付军饷才继续服务，每居民每月收入7sp。',sourceIds:phb('phb:22:fighter','dmg:16:followers')}),
  ),
  paladin: list(
    c({id:'paladin-detect-evil',classId:'paladin',label:'侦测邪恶',kind:'action',minimumLevel:1,status:'verified',visibility:'player',resolution:'record-use',rule:'专注时可任意次数侦测60英尺内大致方向上的邪恶。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-save-bonus',classId:'paladin',label:'全豁免+2',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'所有豁免骰+2。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-disease-immunity',classId:'paladin',label:'疾病免疫',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'免疫一切形式疾病。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-lay-on-hands',classId:'paladin',label:'圣疗',kind:'action',minimumLevel:1,status:'verified',visibility:'player',resolution:'record-use',engineFormula:'paladin-lay-on-hands',rule:'每日一次，为自己或他人治疗每级2HP。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-cure-disease',classId:'paladin',label:'治疗疾病',kind:'action',minimumLevel:1,status:'verified',visibility:'player',resolution:'record-use',engineFormula:'paladin-cure-disease',rule:'每周每五个等级一次（1–5级1次、6–10级2次，依此类推）。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-protection-from-evil',classId:'paladin',label:'持续防护邪恶',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',rule:'持续放射半径10英尺的防护邪恶效果。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-code-and-possessions',classId:'paladin',label:'圣武士戒律',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-dm',rule:'须保持守序善良；蓄意邪恶永久失格，蓄意混乱需由7级以上守序善良牧师规定忏悔；另受十件魔法物品、10%即时什一税、有限财富、善良同伴及随从阵营限制。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-turning',classId:'paladin',label:'影响不死与下层界生物',kind:'delegated-table',minimumLevel:3,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',engineFormula:'paladin-turning-level',rule:'3级按1级牧师处理，此后等效牧师等级随圣武士等级逐级增长；具体矩阵为DM信息。',delegatedTo:'DM cleric turning matrix',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-warhorse',classId:'paladin',label:'召唤战马',kind:'follower',minimumLevel:4,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'4级或以后可召唤唯一智能重型战马；失去后十年期满前不能再得。战役须记录取得与失去日期。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-holy-sword',classId:'paladin',label:'圣剑威能',kind:'passive',minimumLevel:1,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'仅持有、出鞘并举起特殊“Holy Sword”时产生原文圆形威能；物品身份与详细解释由DM掌握。',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-spell-track',classId:'paladin',label:'圣武士神术',kind:'spell-track',minimumLevel:9,status:'verified',visibility:'player',resolution:'delegated',rule:'9级开始获得牧师法术容量，不能使用法术卷轴；容量由法术模块处理。',delegatedTo:'core-spell-capacity',sourceIds:phb('phb:22-24:paladin')}),
    c({id:'paladin-no-fighter-followers',classId:'paladin',label:'不吸引战士式部队',kind:'restriction',minimumLevel:9,status:'verified',visibility:'player',resolution:'automatic',rule:'不因建立据点而获得普通战士的武装人员群体。',sourceIds:phb('phb:22-24:paladin')}),
  ),
  ranger: list(
    c({id:'ranger-giant-class-damage',classId:'ranger',label:'对巨人类近战伤害',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',engineFormula:'ranger-giant-damage',rule:'近战命中PHB列举的“giant class”类人生物时，伤害加角色等级。',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-surprise',classId:'ranger',label:'游侠突袭',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-roll',rule:'使敌人受惊为d6掷1–3；自身受惊为d6掷1。情境修正仍由DM裁定。',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-tracking',classId:'ranger',label:'追踪',kind:'delegated-table',minimumLevel:1,status:'needs-dm',visibility:'dm-secret',resolution:'requires-dm',rule:'地城与户外追踪有不同基础率、时限、路线和天气修正；追踪判定及未获知线索不应由玩家端自行裁定。',delegatedTo:'ranger tracking procedure',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-code',classId:'ranger',label:'游侠戒律',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-dm',rule:'必须善良；转为非善良立即永久成为使用d8的战士。至8级前不得雇武装人员、仆役、助手或随从；同队游侠最多三名；仅保留自身/坐骑能携带财产，余财捐给非PC公益机构。',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-druid-spells',classId:'ranger',label:'游侠德鲁伊法术',kind:'spell-track',minimumLevel:8,status:'verified',visibility:'player',resolution:'delegated',rule:'8级开始获得有限德鲁伊法术。',delegatedTo:'core-spell-capacity',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-magic-user-spells',classId:'ranger',label:'游侠魔法师法术',kind:'spell-track',minimumLevel:9,status:'verified',visibility:'player',resolution:'delegated',rule:'9级开始获得有限魔法师法术，并像魔法师一样检查可学法术；不得从德鲁伊或魔法师卷轴施法。',delegatedTo:'core-spell-capacity/core-spell-acquisition',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-mental-magic-items',classId:'ranger',label:'感知心灵类魔法物品',kind:'passive',minimumLevel:10,status:'verified',visibility:'player',resolution:'automatic',rule:'可使用所有与clairaudience、clairvoyance、ESP、telepathy有关的非书写魔法物品。',sourceIds:phb('phb:24-25:ranger')}),
    c({id:'ranger-followers',classId:'ranger',label:'游侠追随者',kind:'follower',minimumLevel:10,status:'needs-dm',visibility:'dm-secret',resolution:'requires-dm',rule:'吸引2–24名追随者；具体构成由DM决定后告知。失去的此类追随者永不补充，但可另雇佣兵。',sourceIds:phb('phb:24-25:ranger','dmg:16:followers')}),
    c({id:'ranger-stronghold',classId:'ranger',label:'游侠据点',kind:'stronghold',minimumLevel:10,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'若建立据点，除不吸引战士式雇佣兵部队外，其余按战士处理。',sourceIds:phb('phb:24-25:ranger')}),
  ),
  'magic-user': list(
    c({id:'magic-user-spell-book',classId:'magic-user',label:'法术书与准备',kind:'spell-track',minimumLevel:1,status:'verified',visibility:'player',resolution:'delegated',rule:'法术须记录、理解、取得并由书准备；这些事实不得压成一个“已知法术”布尔值。',delegatedTo:'core-spell-ledger/core-spell-acquisition/core-spell-capacity',sourceIds:phb('phb:25:magic-user')}),
    c({id:'magic-user-item-creation',classId:'magic-user',label:'抄写卷轴与制造魔法物品',kind:'action',minimumLevel:11,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',rule:'11级起具备资格；实际可行性、概率、材料、费用、时间和结果依DMG研究/制造流程，且需要全神贯注的停工期。',delegatedTo:'core-magical-research/core-magic-item-fabrication',sourceIds:phb('phb:25:magic-user')}),
    c({id:'magic-user-stronghold',classId:'magic-user',label:'魔法师据点',kind:'stronghold',minimumLevel:12,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'12级起可建据点并清剿10或20英里半径，作为领主统治；成功后每居民每月收入5sp。',sourceIds:phb('phb:25:magic-user')}),
  ),
  illusionist: list(
    c({id:'illusionist-spell-track',classId:'illusionist',label:'幻术师法术体系',kind:'spell-track',minimumLevel:1,status:'verified',visibility:'player',resolution:'delegated',rule:'使用独立幻术师法术、法术书、理解与容量轨道；不得静默套用魔法师清单。',delegatedTo:'core-spell-ledger/core-spell-acquisition/core-spell-capacity',sourceIds:phb('phb:26:illusionist')}),
    c({id:'illusionist-item-restrictions',classId:'illusionist',label:'幻术师魔法物品限制',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-dm',rule:'只能使用职业正文列举的药水、卷轴、戒指、特定杖/棒/权杖、通用杂项、有限水晶球/长袍/书写物、适用神器与魔法匕首；具体物品标签须由物品规则判定。',delegatedTo:'magic-item catalog',sourceIds:phb('phb:26:illusionist')}),
    c({id:'illusionist-item-creation',classId:'illusionist',label:'制造幻术魔法物品',kind:'action',minimumLevel:10,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',rule:'10级起可制造产生或维持幻术的物品，流程大体参照魔法师；具体资格、成本与成功由DMG流程裁定。',delegatedTo:'core-magic-item-fabrication',sourceIds:phb('phb:26:illusionist')}),
  ),
  thief: list(
    c({id:'thief-functions',classId:'thief',label:'盗贼技能',kind:'delegated-table',minimumLevel:1,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',rule:'扒窃、开锁、找/拆陷阱、潜行、藏影、听声、攀墙及背刺均依等级/种族/敏捷/装备和情境；暗骰结果不应泄露。',delegatedTo:'verified thief skill tables (not yet in this pack)',sourceIds:phb('phb:26-28:thief')}),
    c({id:'thief-read-languages',classId:'thief',label:'阅读语言',kind:'action',minimumLevel:4,status:'verified',visibility:'player',resolution:'requires-roll',rule:'4级20%，以后每级+5%，最高80%；同一文字失败后仅在升一级后可重试。',sourceIds:phb('phb:26-28:thief')}),
    c({id:'thief-scroll-use',classId:'thief',label:'使用魔法卷轴',kind:'action',minimumLevel:10,status:'needs-dm',visibility:'dm-secret',resolution:'requires-dm',rule:'10级起可辨读魔法文字并使用除牧师（但不排除德鲁伊）之外卷轴；有25%误解及随法术环级增长的反向风险，细节由DM裁定。',sourceIds:phb('phb:26-28:thief')}),
    c({id:'thief-headquarters',classId:'thief',label:'盗贼总部与团伙',kind:'stronghold',minimumLevel:10,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'可在城镇内或一英里内以小型城堡式建筑设总部并吸引4–24盗贼，但会引发与本地盗贼公会的战争；不能建立其他职业式领地。',sourceIds:phb('phb:26-28:thief')}),
  ),
  assassin: list(
    c({id:'assassin-poison-and-assassination',classId:'assassin',label:'用毒与行刺',kind:'action',minimumLevel:1,status:'needs-dm',visibility:'dm-secret',resolution:'requires-dm',rule:'可用吞服/武器毒并在突袭时选择行刺表；注意毒物的概率、观察者反应、行刺表与XP均由DM裁定。',delegatedTo:'DM assassination/poison procedures',sourceIds:phb('phb:28-30:assassin')}),
    c({id:'assassin-disguise',classId:'assassin',label:'乔装',kind:'action',minimumLevel:1,status:'needs-dm',visibility:'dm-secret',resolution:'requires-dm',rule:'可乔装成人类、亚人或类人生物及不同性别/职业；每日识破基础2%，多项伪装与观察者INT+WIS修正由DM暗中结算。',sourceIds:phb('phb:28-30:assassin')}),
    c({id:'assassin-thief-functions',classId:'assassin',label:'盗贼技能',kind:'delegated-table',minimumLevel:3,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',rule:'除背刺外，盗贼技能按刺客等级低2级执行；1–2级无对应盗贼技能等级。',delegatedTo:'verified thief skill tables (not yet in this pack)',sourceIds:phb('phb:28-30:assassin')}),
    c({id:'assassin-alignment-languages',classId:'assassin',label:'额外阵营语言',kind:'passive',minimumLevel:9,status:'verified',visibility:'player',resolution:'requires-dm',rule:'INT至少15时9级获得一种，此后每级一种；上限为INT−14且最多4种，选择范围依原文。',sourceIds:phb('phb:28-30:assassin')}),
    c({id:'assassin-hirelings',classId:'assassin',label:'刺客雇员/随从限制',kind:'follower',minimumLevel:4,status:'verified',visibility:'player',resolution:'requires-dm',rule:'4级可雇低级刺客，8级可含盗贼，12级可雇任何职业；仅中立或邪恶者服务，随从总量仍受魅力约束。',sourceIds:phb('phb:28-30:assassin')}),
    c({id:'assassin-guildmaster',classId:'assassin',label:'刺客公会首领',kind:'advancement-gate',minimumLevel:14,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'升14级须具XP并行刺或死斗击败本地14级会长；取得7–28名公会成员，换主时每人75%可能离开，最大人数由DM定。',sourceIds:phb('phb:28-30:assassin')}),
    c({id:'assassin-grandfather',classId:'assassin',label:'刺客之祖',kind:'advancement-gate',minimumLevel:15,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'14级角色升15级须前往并以行刺或死斗杀死现任；总部迁建、前任追随者补偿及世界唯一职位均需战役状态。',sourceIds:phb('phb:28-30:assassin')}),
  ),
  monk: list(
    c({id:'monk-core-combat-tables',classId:'monk',label:'武僧徒手、AC、移动与攻击',kind:'delegated-table',minimumLevel:1,status:'unsupported',visibility:'player',resolution:'delegated',rule:'PHB31完整表含逐级AC、移动、徒手次数/伤害；本模块不从有损OCR猜录表格，须独立逐格视觉核验后实现。',delegatedTo:'future verified monk table',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-weapon-damage',classId:'monk',label:'武器伤害加值',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',engineFormula:'monk-weapon-damage-bonus',rule:'使用允许武器命中时，伤害加每级二分之一点；不得使用力量命中或伤害加值。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-save-and-missile-defence',classId:'monk',label:'武僧豁免防御',kind:'passive',minimumLevel:1,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'用盗贼豁免表；可用石化豁免躲开本应命中的非魔法投射物；成功豁免通常免伤，9级起可减半某些失败豁免伤害，但不适用于无伤害量效果。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-surprise',classId:'monk',label:'武僧受惊概率',kind:'passive',minimumLevel:1,status:'verified',visibility:'player',resolution:'automatic',engineFormula:'monk-surprise-percent',rule:'1级33⅓%，2级32%，此后每级下降2个百分点。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-thief-functions',classId:'monk',label:'武僧盗贼技能',kind:'delegated-table',minimumLevel:1,status:'needs-dm',visibility:'dm-secret',resolution:'delegated',rule:'开锁、找/拆陷阱、潜行、藏影、听声、攀墙按同级盗贼执行；不含扒窃。',delegatedTo:'verified thief skill tables (not yet in this pack)',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-speak-with-animals',classId:'monk',label:'与动物交谈',kind:'passive',minimumLevel:3,status:'verified',visibility:'player',resolution:'automatic',rule:'如德鲁伊般与动物交谈。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-esp-mask',classId:'monk',label:'心智遮蔽',kind:'passive',minimumLevel:4,status:'verified',visibility:'player',resolution:'automatic',engineFormula:'monk-esp-percent',rule:'4级ESP成功率仅30%，此后每级再降2个百分点。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-slow-fall',classId:'monk',label:'借壁缓降',kind:'passive',minimumLevel:4,status:'verified',visibility:'player',resolution:'requires-dm',rule:'4级距墙10英尺内最多20英尺；6级距墙40英尺内最多30英尺；13级距墙80英尺内任意距离；须能周期接触墙或类似表面。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-disease-haste-slow-immunity',classId:'monk',label:'疾病、加速与减速免疫',kind:'passive',minimumLevel:5,status:'verified',visibility:'player',resolution:'automatic',rule:'免疫一切疾病，且不受haste或slow影响。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-catalepsy',classId:'monk',label:'假死',kind:'action',minimumLevel:6,status:'verified',visibility:'player',resolution:'record-use',engineFormula:'monk-catalepsy-turns',rule:'可完美假死，最多维持等级×2个turn。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-hirelings',classId:'monk',label:'武僧雇员与随从',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-dm',rule:'1–5级不得有雇员/随从；6级可为单次冒险短雇并有至多2名战士（非圣武士/游侠）、盗贼或刺客随从，此后每级可多1名至魅力上限。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-self-heal',classId:'monk',label:'自我疗伤',kind:'action',minimumLevel:7,status:'verified',visibility:'player',resolution:'record-use',engineFormula:'monk-self-heal',rule:'每日一次，7级治疗d4+1，此后每级固定加1。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-speak-with-plants',classId:'monk',label:'与植物交谈',kind:'passive',minimumLevel:8,status:'verified',visibility:'player',resolution:'automatic',rule:'如德鲁伊般与植物交谈。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-upper-level-contest',classId:'monk',label:'高阶武僧席位挑战',kind:'advancement-gate',minimumLevel:8,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',rule:'8级有三席，9级以上每级一席；须徒手、无武器与魔法物品单挑在位者，拖延或失败会损失XP。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-followers',classId:'monk',label:'武僧追随者',kind:'follower',minimumLevel:8,status:'needs-dm',visibility:'dm-summary',resolution:'requires-dm',engineFormula:'monk-follower-additions',rule:'夺得8级席位且有寺院式总部后吸引d4+1名1级武僧；以后每级增加d2名。追随者同阵营、无薪，达到7级自动离开。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-charm-resistance',classId:'monk',label:'魅惑类抗性',kind:'passive',minimumLevel:9,status:'verified',visibility:'player',resolution:'automatic',engineFormula:'monk-charm-affect-percent',rule:'9级beguiling/charm/hypnosis/suggestion仅50%生效，此后每级下降5个百分点；抗性失败仍可豁免。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-mental-attacks',classId:'monk',label:'心灵攻击防御',kind:'passive',minimumLevel:10,status:'verified',visibility:'player',resolution:'automatic',rule:'对telepathic和mind blast攻击按INT18处理。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-poison-immunity',classId:'monk',label:'毒素免疫',kind:'passive',minimumLevel:11,status:'verified',visibility:'player',resolution:'automatic',rule:'免疫所有种类毒素。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-geas-quest-immunity',classId:'monk',label:'Geas与Quest免疫',kind:'passive',minimumLevel:12,status:'verified',visibility:'player',resolution:'automatic',rule:'不受geas与quest法术影响。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-quivering-palm',classId:'monk',label:'震颤掌',kind:'action',minimumLevel:13,status:'needs-dm',visibility:'dm-secret',resolution:'requires-dm',rule:'每周最多尝试一次，三轮内须接触；目标HD/HP、免疫类别与按施术等级天数内下达死亡命令等限制均由DM验证。',sourceIds:phb('phb:30-32:monk')}),
    c({id:'monk-treasure-and-items',classId:'monk',label:'财富与魔法物品限制',kind:'restriction',minimumLevel:1,status:'verified',visibility:'player',resolution:'requires-dm',rule:'不得穿甲持盾或用未列武器；最多2件魔法武器及3件其他允许物品，只留朴素生活与随从所需金钱，余财捐给非PC宗教机构；建寺可另留至250,000gp及维护费。',sourceIds:phb('phb:30-32:monk')}),
  ),
});

export const coreClassCapabilityPack = Object.freeze({
  id: 'adnd1e:phb:core-class-capabilities', version: '1.0.0', verifiedAt: '2026-10-15',
  status: 'verified-with-explicit-dm-and-unsupported-boundaries', sources: coreClassCapabilitySources,
  classes: coreClassCapabilities,
  exclusions: Object.freeze(['bard (staged optional path)', 'complete combat matrices', 'spell capacity rows', 'thief percentage rows', 'monk table II numeric rows', 'DM follower composition tables']),
});

export function getCoreClassCapabilities(classId: InitialCoreClassId): readonly CoreClassCapability[] {
  return coreClassCapabilities[classId];
}
