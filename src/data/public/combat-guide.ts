// Adapted from the user-supplied A.D.D.I.C.T. v2.2, pp. 1–10, 17–19.
// This is Prata's synthesis; it is deliberately separate from core matrix data.
export const actionTypes = ['天然近战', '武器近战', '多轮攻击', '冲锋', '单次投射', '多次投射', '施法', '驱散不死'] as const;
export const timingTerms: Record<string, string> = {
  same: '同时结算，双方都承受结果。',
  high: '通常由先攻骰较高的一方先行动。',
  dex: '比较先攻；投射者按敏捷攻击调整修正自己的阵营骰，并检查轻装限制。',
  reach: '比较武器长度／触及，较长者先攻击；冲锋接战不用普通先攻。',
  speed: '符合速度因子条件时，SF 较低者先；刚接近或冲锋时不用此项。',
  multiSame: '先排多轮攻击，再在对应位置同时结算。',
  multiHigh: '先排多轮攻击，再在对应位置比较先攻。',
  multiDex: '先排多轮攻击，再比较先攻；投射者另计敏捷调整。',
  multiSpeed: '先排多轮攻击；对应位置按普通近战或武器速度规则处理。',
  multiReach: '先排多轮攻击，再按武器长度／触及决定接战先后。',
  missile: '初次投射先于冲锋者接战；核对射程、就绪状态与实际能否射击。',
  turn: '按本文口径，驱散先于冲锋接战；仍须目标已在有效范围内。',
  dieSpell: '比较施法者的先攻骰所示段数与施法时间；数值小者先，相等同时。',
  speedSpell: '比较武器 SF 与施法时间；数值小者先，相等同时。',
  losingSpell: '攻击者输先攻时，比较 |武器 SF − 攻击者输掉的骰值| 与施法时间；小者先，相等同时。',
  moveSpell: '比较抵达目标所需移动段数与施法时间；小者先，相等同时。',
  spellsSame: '施法时间短者先；时间相等且先攻平手时同时完成。',
  spellsHigh: '施法时间短者先；时间相等时先攻高者先。',
  multiSpell: '按首次攻击的类型处理对施法的时序，勿把多轮攻击全部压到施法之前。',
};
export const termLabels: Record<string, string> = {
  same:'同时', high:'先攻高者', dex:'先攻＋投射敏捷', reach:'较长触及', speed:'较低 SF',
  multiSame:'多轮→同时', multiHigh:'多轮→先攻', multiDex:'多轮→投射先攻', multiSpeed:'多轮→近战规则', multiReach:'多轮→触及',
  missile:'先投射', turn:'先驱散', dieSpell:'施法者骰 vs 施法', speedSpell:'SF vs 施法', losingSpell:'|SF − 输骰| vs 施法',
  moveSpell:'移动 vs 施法', spellsSame:'短法术→同时', spellsHigh:'短法术→先攻', multiSpell:'看首次攻击类型',
};
// Row is acting side; in the unequal table the ROW has the higher d6.
export const tiedTiming = [
  ['same','same','multiSame','reach','same','multiSame','dieSpell','same'],
  ['same','speed','multiSpeed','reach','same','multiSame','speedSpell','same'],
  ['multiSame','multiSpeed','multiSpeed','multiReach','multiSame','multiSame','multiSpell','same'],
  ['reach','reach','multiReach','reach','missile','missile','moveSpell','turn'],
  ['same','same','multiSame','missile','same','multiSame','dieSpell','same'],
  ['multiSame','multiSame','multiSame','missile','multiSame','multiSame','dieSpell','same'],
  ['dieSpell','speedSpell','multiSpell','moveSpell','dieSpell','dieSpell','spellsSame','dieSpell'],
  ['same','same','same','turn','same','same','dieSpell','same'],
];
export const unequalTiming = [
  ['high','high','multiHigh','reach','dex','multiDex','high','high'],
  ['high','high','multiHigh','reach','dex','multiDex','high','high'],
  ['multiHigh','multiHigh','multiHigh','multiReach','multiDex','multiDex','high','high'],
  ['reach','reach','multiReach','reach','missile','missile','moveSpell','turn'],
  ['dex','dex','multiDex','missile','dex','multiDex','dex','dex'],
  ['multiDex','multiDex','multiDex','missile','multiDex','multiDex','dex','dex'],
  ['dieSpell','losingSpell','multiSpell','moveSpell','dieSpell','dieSpell','spellsHigh','dieSpell'],
  ['high','high','high','turn','high','high','high','high'],
];
export const combatChecklist = [
  '首次遭遇：双方是否突袭？净突袭段数、个人敏捷反应与距离是否记录？',
  '声明：DM 先定敌方意图；玩家说明行动，施法者指定法术与目标。',
  '例外：是否有先攻前射击、灵能、特殊物品或跨轮施法？',
  '先攻：每方掷骰；投射敏捷、轻装条件和特殊骰型是否适用？',
  '时序：本轮攻击轮次、冲锋触及、武器 SF、施法与中断分别核对。',
  '命中：选对攻击矩阵、目标 AC、护甲类型、射程、熟练与情境修正。',
  '结算：S/M 或 L 伤害、豁免、附加效果、弹药与已用法术是否更新？',
  '轮末：持续效果、流血、士气、撤退、距离和下一轮声明是否更新？',
];
export const quickChecks = [
  '开团：本团采用核心规则还是 UA 等扩展？先攻与死亡规则有无另行约定？',
  '人物：HP、AC、豁免、武器与法术、负重及移动率是否齐全？',
  '探索：队形、地图、光源余量、口粮和经过的回合是否记录？',
  '遭遇：先判察觉、突袭、距离与反应，再决定交涉、避让或战斗。',
  '战斗：声明→先攻与例外→命中或豁免→伤害与轮末效果。',
  '收尾：战利品、经验、治疗、休整与人物卡备份是否完成？',
];
export const quickLinks = [
  {id:'combat',title:'战斗判定',links:[['行动先后对照','/play/combat/#action-matrix'],['施法与中断','/play/combat/#spell-combat'],['多轮攻击','/play/combat/#multiple-attacks'],['突袭与距离','/play/combat/#surprise'],['怪物攻击矩阵（DMG）','/read/dmg/64ff4d2e57bc8c49/#read-49734749281bd166-table-6'],['驱散不死表（DMG）','/read/dmg/64ff4d2e57bc8c49/#read-49734749281bd166-table-8']]},
  {id:'character',title:'人物常用数值',links:[['六项属性表','/character/abilities/'],['护甲、武器与射程','/equipment/'],['职业等级与能力','/classes/'],['种族与等级限制','/races/'],['人物卡','/character/']]},
  {id:'exploration',title:'探索与遭遇',links:[['时间、移动与距离','/books/phb/movement-time-distance/'],['负重','/books/phb/encumbrance/'],['光照与视觉','/books/phb/light/'],['搜索与陷阱','/play/travel/#actions'],['遭遇与反应','/play/encounter/'],['随机遭遇表','/tables/#encounter']]},
  {id:'magic',title:'法术与休整',links:[['法术条目检索','/spells/'],['准备与施放','/play/magic/'],['治疗与恢复','/combat/healing/'],['雇员与随从','/books/phb/hirelings-henchmen/'],['经验与升级','/play/advancement/'],['财宝表','/tables/#treasure']]},
];
