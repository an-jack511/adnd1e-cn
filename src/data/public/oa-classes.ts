import type { ClassEntry } from '../../schemas';

const source = [{ book: 'OA', section: 'Oriental Classes' }];
const all = ['human', 'hengeyokai', 'korobokuru', 'spirit-folk'];
const ability = (name: string, description: string) => ({ name, description });

export const oaClasses: ClassEntry[] = [
  {
    id: 'oa-barbarian', nameZh: '蛮族', nameEn: 'Barbarian', primeRequisite: '无', minimumAbilities: { STR: 15, DEX: 14, CON: 15 },
    eligibleRaces: ['human', 'korobokuru'], hitDie: 'd12', alignment: '任意非守序', armor: '任意', weapons: '任意', spellcasting: '无',
    description: '猎人、袭击者与游牧者；依靠本能、荒野能力和气力生存，并对魔法保持敌意。',
    abilities: [ability('荒野能力', '攀爬、自然环境隐藏、突袭、背后防护、跳跃、侦测幻觉、侦测魔法与快速疗伤。'), ability('蛮族加值', '随等级逐步使用药水、魔法武器、魔法护甲和防护卷轴，并提高对法术的豁免。'), ability('召集大军', '达到高等级后可在自己的出身地域召集蛮族军队。')], source
  },
  {
    id: 'oa-bushi', nameZh: '兵士', nameEn: 'Bushi', primeRequisite: 'STR', minimumAbilities: { STR: 9, DEX: 8, CON: 8 },
    eligibleRaces: all, hitDie: 'd10', alignment: '任意', armor: '任意护甲与盾牌', weapons: '任意', spellcasting: '无',
    description: '无主的职业武士、佣兵或漫游者；能使用各种武器护甲，并以气力暂时增强战斗能力。',
    abilities: [ability('武器专精', '拥有武器熟练项，可专精单一武器。'), ability('气力喝声', '每日一次以 kiai 暂时提高有效等级，获得更高等级的生命值、战斗能力与豁免。'), ability('自立生存', '能在聚居地寻找工作、装备和住所；高等级可建立自己的庄园或家族。')], source
  },
  {
    id: 'oa-kensai', nameZh: '剑圣', nameEn: 'Kensai', primeRequisite: 'WIS、DEX', minimumAbilities: { STR: 12, DEX: 14, WIS: 12 },
    eligibleRaces: ['human', 'hengeyokai', 'spirit-folk'], hitDie: 'd10', alignment: '任意守序', armor: '无', weapons: '任意；选择一种专精武器或徒手风格', spellcasting: '无',
    description: '以冥想、苦行和每日训练追求人与武器合一的武术家；不能穿护甲。',
    abilities: [ability('专精武器', '选择一种武器或徒手风格，逐级获得命中与伤害加值。'), ability('气力', '可宣布以专精武器造成最大伤害，并拥有冥想、恐惧抵抗和心灵决斗能力。'), ability('旋风攻击', '高等级可用专精武器攻击近旁的多个敌人。')], source
  },
  {
    id: 'oa-monk', nameZh: '僧侣', nameEn: 'Monk', primeRequisite: '无', minimumAbilities: { STR: 15, DEX: 15, CON: 11, CHA: 15 },
    eligibleRaces: ['human', 'spirit-folk'], hitDie: '2d4（1级），此后 d4', alignment: '任意守序', armor: '无', weapons: '武术武器及职业允许的武器', spellcasting: '无',
    description: '通过冥想、徒手战斗和精神纪律追求身心统一的东方修行者。',
    abilities: [ability('徒手与武术', '徒手伤害、攻击次数和特殊动作随等级成长；所有僧侣都能偏转飞弹。'), ability('僧侣气力', '每日按等级使用气力抵消魔法攻击，逐级获得防毒、抗心灵和自疗能力。'), ability('盗贼式能力', '逐级获得潜行、藏影、聆听、攀墙及搜索能力。')], source
  },
  {
    id: 'oa-ninja', nameZh: '忍者', nameEn: 'Ninja', primeRequisite: '无', minimumAbilities: { DEX: 14, INT: 15, CHA: 14 },
    eligibleRaces: ['human'], hitDie: 'd6', alignment: '任意非善良', armor: '皮甲、软垫皮、鳞甲或链甲', weapons: '任意；须以熟练项取得忍者偏好武器', spellcasting: '依第二职业',
    description: '精通忍术、潜行、伪装、杂技与刺杀的秘密职业；必须同时拥有兵士、僧兵、巫人或义侠职业。',
    abilities: [ability('忍术', '拥有伪装、隐蔽、攀爬、潜行、投掷和使用毒药的专门能力。'), ability('双职业', '忍者能力叠加在另一职业上；忍者身份必须隐藏，公开暴露会带来严重后果。'), ability('忍者装备', '能使用手里剑、铁菱、烟粉、镰锁和其他偏好武器。')], source
  },
  {
    id: 'oa-samurai', nameZh: '武士', nameEn: 'Samurai', primeRequisite: 'STR、INT、WIS', minimumAbilities: { STR: 13, CON: 13, INT: 14, WIS: 13 },
    eligibleRaces: ['human', 'korobokuru', 'spirit-folk'], hitDie: 'd10', alignment: '任意守序', armor: '任意', weapons: '任意', spellcasting: '无',
    description: '属于精英战士贵族阶层，首要职责是对大名绝对忠诚，并以荣誉、家族和侍奉维持身份。',
    abilities: [ability('武士道', '服从主君、维护家族荣誉并承担失职后果；荣誉会影响社会地位和战役资源。'), ability('战士能力', '使用战士的战斗成长、武器和护甲，并获得高等级追随者与家族宅邸。'), ability('恐惧与拔刀', '可用家传武器、威仪和训练令敌人畏惧；具体效果按武士等级表处理。')], source
  },
  {
    id: 'oa-shukenja', nameZh: '修贤者', nameEn: 'Shukenja', primeRequisite: 'WIS', minimumAbilities: { WIS: 12, DEX: 9 },
    eligibleRaces: ['human', 'hengeyokai'], hitDie: 'd6', alignment: '任意善良', armor: '皮甲、软垫、袈裟、腹卷、腹带、轻链、阵笠或镶钉皮', weapons: '职业允许的钝击、杖、链、镰、矛和东方武器', spellcasting: '修贤者法术',
    description: '游方圣人、教师、顾问和治疗者；以虔诚、法术、荣誉和慈悲服务旅途中遇到的人。',
    abilities: [ability('修贤者法术', '按感知与等级准备修贤者法术，可使用治疗、预言、保护和驱邪法术。',), ability('宗教与气', '拥有与信仰相关的气力、驱邪和宗教熟练能力。'), ability('旅行圣人', '能在陌生地区获得基本食宿与尊重，但必须遵守自己的宗教和善良阵营。')], source
  },
  {
    id: 'oa-sohei', nameZh: '僧兵', nameEn: 'Sohei', primeRequisite: 'STR、WIS', minimumAbilities: { STR: 13, INT: 10, WIS: 10 },
    eligibleRaces: ['human'], hitDie: 'd10', alignment: '任意守序', armor: '任意', weapons: '除吹箭、刀、针、爪套、机关杖和手里剑外的任意武器', spellcasting: '有限的僧兵法术',
    description: '战士型祭司，保护寺院并扩张寺院的政治主张；战斗能力强于修贤者，法术能力较少。',
    abilities: [ability('寺院武装', '使用战士的战斗成长与大部分护甲武器，同时承担寺院组织和政治职责。'), ability('有限施法', '按僧兵等级表获得少量修贤者法术。'), ability('寺院资源', '高等级可拥有寺院、追随者和代表寺院行动的军事力量。')], source
  },
  {
    id: 'oa-wu-jen', nameZh: '巫人', nameEn: 'Wu Jen', primeRequisite: 'INT', minimumAbilities: { INT: 13 },
    eligibleRaces: ['human', 'hengeyokai', 'korobokuru'], hitDie: 'd4', alignment: '任意非守序', armor: '无', weapons: '棒、木刀、吹箭、短弓、链、匕首、飞镖、军扇、十手、杖、烟斗、手里剑、投石索、短剑和短棍', spellcasting: '巫人法术；法术书与禁忌',
    description: '隐居的东方巫师与魔法师，研究元素、自然、阴阳和禁忌法术，受到敬畏也受到恐惧。',
    abilities: [ability('巫人法术', '使用独立法术表，法术按火、水、风、土、自然和其他领域分类。'), ability('禁忌', '师门、元素和自然力量会追究禁忌行为；违禁可能导致法术失败或其他后果。'), ability('研究与法术书', '依靠卷册、师父和长期研究获得新法术，不能穿护甲。')], source
  },
  {
    id: 'oa-yakuza', nameZh: '义侠', nameEn: 'Yakuza', primeRequisite: 'DEX、CHA', minimumAbilities: { STR: 11, DEX: 15, INT: 15, CHA: 16 },
    eligibleRaces: ['human', 'korobokuru'], hitDie: 'd6', alignment: '任意守序', armor: '皮甲或软垫', weapons: '任意', spellcasting: '无',
    description: '有组织的暴徒、敲诈者和治安维护者；通过收取贡金向当地商人提供保护。',
    abilities: [ability('组织与保护', '拥有严密的组织、地区关系和向成员提供庇护的能力。'), ability('盗贼技能', '擅长潜行、交涉、收集情报、开锁和处理城市冲突。'), ability('名望与忠诚', '义侠组织看重内部忠诚与秩序，背叛会带来荣誉和资源上的严重后果。')], source
  }
];
