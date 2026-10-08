import type { ClassEntry } from '../../schemas';
import { oaClasses } from './oa-classes';

const allRaces = ['human', 'dwarf', 'elf', 'gnome', 'half-elf', 'halfling', 'half-orc'];
const source = (section: string) => [{ book: 'PHB', section }];

const baseClasses: ClassEntry[] = [
  {
    id: 'cavalier', nameZh: '骑士', nameEn: 'Cavalier', primeRequisite: '无经验加值', minimumAbilities: { STR: 15, DEX: 15, CON: 15, INT: 10, WIS: 10 },
    eligibleRaces: ['human', 'elf', 'half-elf'], hitDie: '1d10+3（直接入职）；0 级侍从另见正文', alignment: '任意善良',
    armor: '任意；依骑士守则优先选用最佳护甲', weapons: '任意；首选骑枪及骑兵武器', spellcasting: '无',
    description: 'UA 的骑乘战士职业，须遵守骑士守则并侍奉神祇、贵族、组织或事业；精灵、半精灵骑士另有血统和出身条件。',
    abilities: [
      { name: '首选武器', description: '骑枪、选定的剑与骑兵武器随等级获得命中加值；首选武器攻击次数按高 5 级计算。' },
      { name: '骑乘与格挡', description: '骑乘攻击、骑术和盾牌格挡有专门规则。' },
      { name: '恐惧与心智抵抗', description: '免疫恐惧；善良骑士可将此保护延伸到近旁盟友，对影响心智的魔法另有抵抗。' }
    ], source: [{ book: 'UA', section: 'ua-cavalier' }]
  },
  {
    id: 'barbarian', nameZh: '野蛮人', nameEn: 'Barbarian', primeRequisite: '无经验加值', minimumAbilities: { STR: 15, CON: 15, DEX: 14 },
    eligibleRaces: ['human'], hitDie: 'd12', alignment: '非守序', armor: '任意；笨重护甲削弱敏捷防护加值', weapons: '任意；初始须熟练手斧、匕首和矛', spellcasting: '无',
    description: 'UA 的战士子职业；感知不得高于 16，基础移动率 15″，不可兼任两个职业。',
    abilities: [
      { name: '野外生存', description: '具有荒野求生、攀爬、快速移动和警觉等专门能力。' },
      { name: '属性防护', description: '敏捷高于 14 与体质高于 14 时，按野蛮人专用规则调整 AC 和生命值。' },
      { name: '天然攻击', description: '从 4 级起，徒手攻击逐渐能伤害要求魔法武器的生物；不提供命中或伤害加值。' }
    ], source: [{ book: 'UA', section: 'ua-barbarian' }]
  },
  {
    id: 'thief-acrobat', nameZh: '杂技盗贼', nameEn: 'Thief-Acrobat', primeRequisite: 'STR、DEX', minimumAbilities: { STR: 15, DEX: 16 },
    eligibleRaces: allRaces, hitDie: '沿用盗贼', alignment: '沿用盗贼', armor: '轻装；杂技动作受负重及笨重护甲限制', weapons: '沿用盗贼', spellcasting: '无',
    description: 'UA 的盗贼分流职业；盗贼升过 5 级后，需师傅训练 6 周，才从第 6 级转入杂技路线。',
    abilities: [
      { name: '杂技', description: '走钢索、撑杆跳、跳跃、翻腾与坠落减伤；效果依等级表及负重决定。' },
      { name: '盗贼技能变化', description: '扒窃、开锁、寻找及拆除陷阱停留在 5 级数值；攀墙继续成长。' }
    ], source: [{ book: 'UA', section: 'ua-thief-acrobat' }]
  },
  {
    id: 'cleric', nameZh: '牧师', nameEn: 'Cleric', primeRequisite: 'WIS', minimumAbilities: { WIS: 9 },
    eligibleRaces: ['human', 'half-elf', 'half-orc'], hitDie: 'd8', alignment: '除绝对中立外任意',
    armor: '任意护甲与盾牌', weapons: '棍棒、连枷、锤、钉头锤、长杖', spellcasting: '牧师法术；祈祷准备',
    description: '防护、治疗与驱退不死生物；能穿甲，但不得使用带刃或尖头武器。',
    abilities: [
      { name: '驱退不死生物', description: '按牧师等级与目标类别使用驱退矩阵。', href: '/books/phb/turning-undead/' },
      { name: '施法', description: '感知影响额外法术与施法；法术须高声念诵。', href: '/spells/?class=Cleric' },
      { name: '8 级追随者', description: '建立礼拜场所后，可吸引 20—200 名追随者。' },
      { name: '9 级宗教要塞', description: '可修建宗教要塞；建造费用按同类建筑的一半计算。', href: '/rules/strongholds' }
    ], source: source('Cleric')
  },
  {
    id: 'druid', nameZh: '德鲁伊', nameEn: 'Druid', primeRequisite: 'WIS、CHA', minimumAbilities: { WIS: 12, CHA: 15 },
    eligibleRaces: ['human', 'half-elf'], hitDie: 'd8', alignment: '绝对中立',
    armor: '皮甲、木盾；不得穿金属甲', weapons: '棍棒、匕首、飞镖、锤、弯刀、投石索、矛、长杖', spellcasting: '德鲁伊法术',
    description: '自然祭司；使用自然法术，掌握德鲁伊秘密语言，高等级可变化动物形态。',
    abilities: [
      { name: '3 级自然识别', description: '辨识植物、动物与纯净水源，并能穿越杂草地带而不留可辨踪迹。' },
      { name: '7 级变形', description: '每日最多三次，分别化为爬行动物、鸟类或哺乳动物；每类每日一次。' },
      { name: '特殊豁免', description: '对火焰与闪电攻击的豁免掷骰 +2。' },
      { name: '高等级席位', description: '12 级以上德鲁伊人数受限制，晋级涉及既有席位。' }
    ], source: source('Druid')
  },
  {
    id: 'fighter', nameZh: '战士', nameEn: 'Fighter', primeRequisite: 'STR', minimumAbilities: { STR: 9, CON: 7 },
    eligibleRaces: allRaces, hitDie: 'd10', alignment: '任意', armor: '任意护甲与盾牌', weapons: '任意', spellcasting: '无',
    description: '使用全部护甲与武器，拥有最强的常规战斗成长。',
    abilities: [
      { name: '多重攻击', description: '攻击次数随等级及对手情况变化；见近战规则。', href: '/combat/multiple-attacks' },
      { name: '非凡力量', description: '力量 18 时可掷百分骰，确定 18/xx。', href: '/books/phb/abilities-strength/' },
      { name: '9 级领地', description: '建立城堡并肃清周边后，可吸引披甲武士并从居民取得收入。', href: '/rules/strongholds' }
    ], source: source('Fighter')
  },
  {
    id: 'paladin', nameZh: '圣武士', nameEn: 'Paladin', primeRequisite: 'STR、WIS', minimumAbilities: { STR: 12, INT: 9, WIS: 13, CON: 9, CHA: 17 },
    eligibleRaces: ['human'], hitDie: 'd10', alignment: '守序善良', armor: '任意护甲与盾牌', weapons: '任意', spellcasting: '9 级起逐渐获得牧师法术',
    description: '守序善良的战士子职业，须持续遵守阵营与财物戒律。',
    abilities: [
      { name: '探测邪恶', description: '集中精神时，可探测最远 60 英尺内的邪恶。' },
      { name: '豁免与疾病', description: '所有豁免 +2；免疫疾病。' },
      { name: '圣疗', description: '每日一次，每等级治疗 2 点伤害。' },
      { name: '驱退与战马', description: '3 级起驱退不死生物；4 级起可召来特殊战马。' },
      { name: '圣武士戒律', description: '魔法物品数量受限；收入须取十分之一捐赠。' }
    ], source: source('Paladin')
  },
  {
    id: 'ranger', nameZh: '游侠', nameEn: 'Ranger', primeRequisite: 'STR、INT、WIS', minimumAbilities: { STR: 13, INT: 13, WIS: 14, CON: 14 },
    eligibleRaces: ['human', 'half-elf'], hitDie: '1 级 2d8，此后每级 d8', alignment: '任意善良',
    armor: '任意护甲与盾牌', weapons: '任意', spellcasting: '8 级起德鲁伊法术；9 级起魔法师法术',
    description: '擅长野外追踪、侦察与对抗巨人类；须维持善良阵营。',
    abilities: [
      { name: '对巨人类伤害', description: '近战命中巨人类类人生物时，每等级额外造成 1 点伤害。' },
      { name: '突袭', description: '通常以 d6 的 1—3 使对手遭到突袭；自己通常只在 1 时被突袭。' },
      { name: '追踪', description: '能在地下或户外追踪，成功率依路径和环境调整。' },
      { name: '财物限制', description: '只能保留随身或坐骑可携带的财物；多余部分应捐出。' }
    ], source: source('Ranger')
  },
  {
    id: 'magic-user', nameZh: '魔法师', nameEn: 'Magic-User', primeRequisite: 'INT', minimumAbilities: { INT: 9, DEX: 6 },
    eligibleRaces: ['human', 'elf', 'half-elf'], hitDie: 'd4', alignment: '任意', armor: '无', weapons: '匕首、飞镖、长杖', spellcasting: '魔法师法术；法术书与记忆',
    description: '依靠法术书、研究与记忆施法；不能穿甲，可用武器很少。',
    abilities: [
      { name: '法术书', description: '每个可用环级须有相应法术书；已施展的法术需重新记忆。', href: '/rules/spell-casting' },
      { name: '11 级附魔', description: '可为物品附魔或抄写魔法卷轴。' },
      { name: '12 级要塞', description: '可建造要塞并肃清周边地区。', href: '/rules/strongholds' }
    ], source: source('Magic-User')
  },
  {
    id: 'illusionist', nameZh: '幻术师', nameEn: 'Illusionist', primeRequisite: 'INT、DEX', minimumAbilities: { INT: 15, DEX: 16 },
    eligibleRaces: ['human', 'gnome'], hitDie: 'd4', alignment: '任意', armor: '无', weapons: '匕首、飞镖、长杖', spellcasting: '幻术师法术',
    description: '使用独立幻术师法术表，许多魔法物品的使用权也与魔法师不同。',
    abilities: [
      { name: '幻术法术', description: '按幻术师法术表准备与施放。', href: '/spells/?class=Illusionist' },
      { name: '10 级制造', description: '可制造产生或维持幻象的魔法物品。' }
    ], source: source('Illusionist')
  },
  {
    id: 'thief', nameZh: '盗贼', nameEn: 'Thief', primeRequisite: 'DEX', minimumAbilities: { DEX: 9 },
    eligibleRaces: allRaces, hitDie: 'd6', alignment: '中立或邪恶；极少数可为中立善良',
    armor: '皮甲；不使用盾牌', weapons: '棍棒、匕首、飞镖、投石索、剑', spellcasting: '无；10 级可读部分卷轴',
    description: '擅长开锁、潜行、搜索陷阱、攀墙与背后偷袭。',
    abilities: [
      { name: '盗贼技能', description: '扒窃、开锁、发现／拆除陷阱、无声移动、藏于阴影、聆听与攀墙。' },
      { name: '背后偷袭', description: '命中掷骰 +4；伤害倍数随经验等级提高。' },
      { name: '盗贼黑话', description: '所有盗贼都会说本职业秘密语言。' },
      { name: '10 级团伙', description: '可在城镇附近设总部，吸引其他盗贼。' }
    ], source: source('Thief')
  },
  {
    id: 'assassin', nameZh: '刺客', nameEn: 'Assassin', primeRequisite: '无经验加值', minimumAbilities: { STR: 12, INT: 11, DEX: 12 },
    eligibleRaces: ['human', 'dwarf', 'elf', 'gnome', 'half-elf', 'half-orc'], hitDie: 'd6', alignment: '任意邪恶',
    armor: '皮甲；可使用盾牌', weapons: '任意', spellcasting: '无；高等级可读部分卷轴',
    description: '盗贼子职业；擅长行刺、乔装与用毒，阵营必须邪恶。',
    abilities: [
      { name: '行刺', description: '目标遭到突袭时可使用行刺表；失败仍造成正常武器伤害。' },
      { name: '乔装', description: '可伪装成人类、半人类或类人生物；被识破概率视伪装内容而变。' },
      { name: '阵营语言', description: '9 级起，符合智力条件者可学习额外阵营语言。' }
    ], source: source('Assassin')
  },
  {
    id: 'monk', nameZh: '武僧', nameEn: 'Monk', primeRequisite: '无经验加值', minimumAbilities: { STR: 15, WIS: 15, DEX: 15, CON: 11 },
    eligibleRaces: ['human'], hitDie: '1 级 2d4，此后每级 d4', alignment: '任意守序',
    armor: '无护甲、无盾牌', weapons: '棒、棍棒、弩、匕首、手斧、标枪、短棒、长柄武器、矛、长杖', spellcasting: '无',
    description: '苦修与徒手战斗职业；不能穿甲，也不会因敏捷获得防御等级调整。',
    abilities: [
      { name: '徒手攻击', description: '伤害、每轮攻击次数与昏迷概率随等级变化。' },
      { name: '盗贼能力', description: '可开锁、发现／拆除陷阱、潜行、藏于阴影、聆听和攀墙。' },
      { name: '等级席位', description: '高等级名额有限，晋升需挑战同位阶武僧。' }
    ], source: source('Monk')
  },
  {
    id: 'bard', nameZh: '吟游诗人', nameEn: 'Bard', primeRequisite: 'STR、WIS、DEX、CHA', minimumAbilities: { STR: 15, INT: 12, WIS: 15, DEX: 15, CON: 10, CHA: 15 },
    eligibleRaces: ['human', 'half-elf'], hitDie: '保留战士／盗贼阶段生命骰；吟游诗人阶段依表', alignment: '任意中立',
    armor: '依战士、盗贼与德鲁伊阶段规则', weapons: '依阶段与相关职业规则', spellcasting: '吟游诗人阶段使用德鲁伊法术',
    description: 'PHB 附录中的补充职业：先为战士，再转盗贼，之后接受德鲁伊教习。',
    abilities: [
      { name: '进阶路线', description: '战士达到 5—7 级后转盗贼；盗贼达到 5—8 级后开始德鲁伊教习。' },
      { name: '传说知识', description: '能了解传奇人物、地点与事物，并辨认部分魔法物品。' },
      { name: '法术与德鲁伊能力', description: '吟游诗人阶段按等级表获得德鲁伊法术和相应德鲁伊能力。' }
    ], source: source('Appendix II: The Bard')
  }
];

const dlaRaceAccess: Record<string, string[]> = {
  'dla-kender': ['fighter', 'barbarian', 'ranger', 'thief', 'thief-acrobat', 'cleric', 'druid'],
  'dla-gully-dwarf': ['fighter', 'thief'],
  'dla-krynn-minotaur': ['fighter', 'cleric'],
  'dla-silvanesti-elf': ['paladin', 'fighter', 'ranger', 'magic-user', 'illusionist'],
  'dla-qualinesti-elf': ['fighter', 'magic-user', 'thief']
};
for (const classEntry of baseClasses) {
  if (classEntry.eligibleRaces === allRaces) classEntry.eligibleRaces = [...allRaces];
  for (const [raceId, classIds] of Object.entries(dlaRaceAccess)) {
    if (classIds.includes(classEntry.id)) classEntry.eligibleRaces.push(raceId);
  }
}

export const classes: ClassEntry[] = [...baseClasses, ...oaClasses];
