export type PlaySection = { id: string; title: string; points: string[]; links: { label: string; href: string }[]; sources: { label: string; href: string }[] };
export type PlayPage = { slug: string; title: string; intro: string; sequence: string[]; sections: PlaySection[] };
const phb = (slug: string, label: string) => ({ label: `PHB：${label}`, href: `/books/phb/${slug}/` });
const dmg = (slug: string, label: string) => ({ label: `DMG：${label}`, href: `/books/dmg/${slug}/` });
const link = (label: string, href: string) => ({ label, href });
export const playPages: PlayPage[] = [
  { slug: 'character-creation', title: '创建角色', intro: '按 PHB 的角色创建顺序逐项记录；限制由种族、职业与属性共同决定。',
    sequence: ['生成六项属性', '选择种族与职业并核对最低值和等级上限', '确定阵营、生命值、语言与初始金钱', '购买装备，计算 AC、移动与负重', '记录职业、种族能力和法术，完成人物卡'], sections: [
      { id: 'abilities', title: '属性', points: ['先决定本团采用的掷骰方法；通常的 3d6 与 DMG 的其他方法不是可以混用的同一程序。', '属性生成后先检查种族范围，再应用种族修正和职业最低要求；战士等符合条件的职业可记录非凡力量。'], links: [link('PHB 属性表', '/books/phb/group-04/'), link('在人物卡掷属性', '/character/')], sources: [phb('group-04', '角色属性'), dmg('dmg-character-abilities', '角色属性与生成方法')] },
      { id: 'race-class', title: '种族与职业', points: ['以 PHB 种族表 I 查可选职业；表 II 查种族等级上限。括号中的职业上限只用于非玩家角色。', '职业还可能有最低属性、阵营和进阶限制。多职业与人类双职不是同一规则。'], links: [link('种族表', '/races/'), link('职业表', '/classes/'), link('车卡资格检查', '/character/')], sources: [phb('races', '种族职业表'), phb('overview-character-classes', '职业')] },
      { id: 'identity', title: '阵营、生命值与金钱', points: ['根据职业限制选阵营；从职业生命骰确定初始生命值，并应用符合条件的体质调整。', '初始金钱按所选职业掷骰；记录购物前余额和最终携带的每件装备。'], links: [link('职业详情与等级表', '/classes/'), link('装备价格表', '/equipment/')], sources: [phb('creating-a-character', '创建玩家角色'), phb('money-equipment-and-arms', '金钱与装备')] },
      { id: 'equipment', title: '装备、AC 与负重', points: ['穿戴护甲确定基础 AC；有效盾牌、敏捷及魔法修正另计。盾牌不总能防护侧后方攻击。', '负重既看重量也看体积；PHB 的四档移动仅是通常情形，力量、笨重程度和 DM 裁定会影响结果。'], links: [link('装备索引', '/equipment/'), link('人物卡 AC 与负重', '/character/')], sources: [phb('money-equipment-and-arms', '护甲等级表'), phb('encumbrance', '负重')] },
      { id: 'finish', title: '能力、法术与记录', points: ['写下职业与种族能力、语言、豁免和武器数据；施法职业按各自规则记录法术书或可用法术。', '最后核对角色是否符合属性、种族、阵营与装备要求。车卡的 DM 覆盖仅记录裁定，不改写 RAW。'], links: [link('REF2 人物卡', '/character/'), link('法术索引', '/spells/')], sources: [phb('spell-tables', '法术表'), phb('races', '种族')] }
    ] },
  { slug: 'travel', title: '旅行与探索', intro: '把出发准备、时间推进、探索动作和遭遇放在同一张桌边流程上。',
    sequence: ['核对装备、负重、坐骑、口粮和光源', '声明路线与速度，推进探索回合或旅行日', '处理搜索、门、光照与地图', '按地点和时段检查遭遇与环境风险', '结算休息、补给和恢复'], sections: [
      { id: 'before', title: '出发前', points: ['记下每人携带物和负重档：约 35、70、105 磅分别是 PHB 的常用分界，力量和体积仍须调整。', '把火把、提灯、油、口粮、水、坐骑与携带财宝的余量列在行军记录中。'], links: [link('装备', '/equipment/'), link('负重', '/adventure/encumbrance/')], sources: [phb('encumbrance', '负重'), phb('money-equipment-and-arms', '装备')] },
      { id: 'time', title: '时间与移动', points: ['一回合为 10 分钟；战斗的一轮为 1 分钟，一轮分为 10 段。不要把探索回合与战斗轮混作同一单位。', '地下城与户外的英寸距离换算不同；按地形、负重、坐骑及具体行动重新核对速度。'], links: [link('PHB 移动规则', '/books/phb/movement-time-distance/')], sources: [phb('movement-time-distance', '移动、时间与距离')] },
      { id: 'actions', title: '探索动作', points: ['声明是谨慎搜索、聆听、开门还是继续前进；这些行动可能消耗时间并产生噪声。', '可见距离受光源、遮蔽物和红外／紫外视觉限制；秘密门与陷阱要按对应能力裁定。'], links: [link('光照', '/adventure/light/'), link('陷阱', '/adventure/traps/')], sources: [phb('light', '光照'), phb('traps', '陷阱')] },
      { id: 'risk', title: '遭遇与休息', points: ['在应检查遭遇的时点掷对应环境表；掷出怪物后仍须确定距离、突袭和反应。', '休息时记录守夜、照明与补给；生命值自然恢复和法术准备依各自规则处理。'], links: [link('遭遇流程', '/play/encounter/'), link('DM 随机遭遇', '/dm/'), link('治疗', '/combat/healing/')], sources: [dmg('dmg-appendix-c-random-monster-encounters', '随机遭遇'), phb('healing', '治疗')] }
    ] },
  { slug: 'encounter', title: '遭遇', intro: '遭遇是探索转向交涉、追逐或战斗的分岔点，不等于自动开战。',
    sequence: ['确定双方是否察觉彼此与突袭情况', '确定遭遇距离及可见范围', '判断意图，必要时掷反应', '选择交涉、避让、逃跑或进入战斗'], sections: [
      { id: 'surprise', title: '突袭', points: ['通常双方各掷 1d6；掷出 1 或 2 的一方遭到突袭。特殊怪物和环境可改变概率。', '两边都遭突袭时按差值抵消；每点差值通常造成 1 段（6 秒）无法行动。DMG 把同一环节称为“受惊”。'], links: [link('战斗中的突袭', '/play/combat/#surprise')], sources: [phb('surprise', '突袭'), dmg('dmg-combat', '受惊')] },
      { id: 'distance', title: '距离与视觉', points: ['DMG 通常以 1d6+4 寸确定未知遭遇距离，再按视线、噪声、空间和突袭修正。', '光源、红外或紫外视觉只能在有效范围内帮助发现对方。'], links: [link('光照与视觉', '/adventure/light/')], sources: [dmg('dmg-combat', '遭遇距离'), phb('light', '光照')] },
      { id: 'reaction', title: '交涉或升级', points: ['尚未确定敌意时，按怪物态度、语言、魅力及 DMG 反应程序裁定；玩家可谈判、贿赂或退避。', '发生逃跑时进入追逐；双方选择攻击时进入战斗流程，并逐轮处理士气与撤退。'], links: [link('战斗流程', '/play/combat/'), link('追逐', '/adventure/pursuit/'), link('随机遭遇表', '/tables/')], sources: [phb('negotiation', '谈判'), dmg('dmg-combat', '遭遇与战斗')] }
    ] },
  { slug: 'combat', title: '战斗', intro: '从突袭、距离和先攻开始，按每轮声明、行动与结算；下列条目是 PHB 与 DMG 的桌边合并速查。',
    sequence: ['确定突袭与距离', '声明行动，双方各掷 1d6 判先攻', '依先后处理移动、攻击、施法、魔法物品与驱散', '核对攻击矩阵／豁免，结算伤害', '检查士气、撤退和下一轮'], sections: [
      { id: 'sequence', title: '每轮流程', points: ['DMG 先处理突袭和距离；无突袭或突袭结束后，双方每轮各掷 1d6，通常高者先行动。', '先攻方可避战、交涉、等待、投射／施法／驱散、接近／冲锋、架武器迎击、近战或擒抱；再结算另一方行动。'], links: [link('遭遇流程', '/play/encounter/')], sources: [dmg('dmg-combat', '遭遇、战斗与先攻'), phb('combat-procedures', '战斗流程')] },
      { id: 'surprise', title: '突袭', points: ['通常 1d6 掷出 1—2 即被突袭；每点未抵消的突袭差造成 1 段不能行动。', '突袭段内可逃跑、接近或攻击；法术仍需完整施法时间。噪声、光亮和事先察觉可取消突袭机会。'], links: [link('遭遇距离', '/play/encounter/#distance')], sources: [phb('surprise', '突袭'), dmg('dmg-combat', '受惊')] },
      { id: 'initiative', title: '先攻', points: ['双方通常各掷 1d6，较高一方先行动；每轮重新判定。一般不把敏捷直接加进先攻骰。', '平手时可能同时行动；多重攻击、冲锋、施法及武器速度有专项处理，不能简单套“赢家全部先打”。'], links: [link('多重攻击', '/combat/multiple-attacks/')], sources: [phb('initiative', '先攻'), dmg('dmg-combat', '先攻与平手')] },
      { id: 'movement', title: '移动与接近', points: ['先确定本轮双方距离；移动、冲锋、撤退与追逐不能只看角色卡上的基础移动率。', '地下城的 1 寸通常为 10 尺；户外地图换算不同。负重会降低可用移动。'], links: [link('负重', '/play/travel/#before'), link('追逐', '/adventure/pursuit/')], sources: [phb('movement-time-distance', '移动'), dmg('dmg-combat', '战斗距离')] },
      { id: 'attacks', title: '近战、投射与特殊攻击', points: ['普通武器攻击用攻击矩阵对照目标 AC；命中后按武器对 S/M 或 L 的伤害骰结算。', '投射武器需检查射程、发射速率、遮蔽和弹药；擒抱、拳击、压倒另有程序，不按普通武器伤害直接代替。'], links: [link('武器伤害与速度', '/equipment/'), link('PHB 攻击矩阵', '/books/phb/attack-saving-throw-matrices/')], sources: [phb('melee-combat', '近战'), phb('missile-discharge', '投射武器'), dmg('dmg-combat', '特殊战斗')] },
      { id: 'spell-combat', title: '战斗施法', points: ['宣告施法，核对法术的成分和施法时间；一轮有 10 段，施法时间可能以段、轮或回合计。', '施法完成前被击中、擒抱或受到其他符合规则的干扰，可能令法术失效；突袭段中施法也须满足完整施法时间。'], links: [link('施法与魔法', '/play/magic/'), link('法术表', '/spells/')], sources: [phb('spell-combat', '战斗施法'), dmg('dmg-combat', '施法与中断')] },
      { id: 'armor-class', title: '护甲等级与豁免', points: ['无甲 AC 10；链甲 AC 5。可防护方向上的盾牌改善 1 级，再计入敏捷和魔法调整；低 AC 较难命中。', '小盾每轮只挡 1 次、普通盾 2 次、大盾 3 次攻击；侧后方攻击通常不享盾牌防护。', '许多魔法与吐息攻击不掷普通命中骰，而由目标进行相应豁免。'], links: [link('PHB 护甲表', '/books/phb/money-equipment-and-arms/'), link('人物卡 AC 计算', '/character/')], sources: [phb('money-equipment-and-arms', '护甲等级表'), phb('armor-class', '护甲修正'), phb('saving-throw', '豁免')] },
      { id: 'damage', title: '伤害、死亡与治疗', points: ['命中后立即结算伤害；中毒、麻痹等附加效果可能还要求豁免。', '生命值减少并不都等于同等身体创伤；昏迷、死亡与治疗要按相应条款分别处理。'], links: [link('PHB 伤害', '/books/phb/damage/'), link('治疗', '/combat/healing/')], sources: [phb('damage', '伤害'), phb('healing', '治疗')] },
      { id: 'morale', title: '士气、撤退与下一轮', points: ['遭受重大损失、首领倒下等情形可能触发士气判断；并非所有遭遇都打到最后一人。', '一方逃离、无法继续战斗或战斗结束时停止逐轮流程；否则更新距离并开始下一轮。'], links: [link('遭遇', '/play/encounter/'), link('追逐', '/adventure/pursuit/')], sources: [phb('morale', '士气'), dmg('dmg-combat', '战斗流程')] }
    ] },
  { slug: 'magic', title: '施法与魔法', intro: '这里查如何准备和施放法术；具体法术数值在法术资料库。', sequence: ['确定职业可用法术与环级', '准备／记忆，检查法术书及材料', '宣告施法并核对段、轮或回合的施法时间', '完成效果、豁免与逆向法术处理'], sections: [
    { id: 'preparation', title: '准备与记忆', points: ['魔法师依赖法术书与记忆；牧师、德鲁伊、幻术师各有独立法术表和职业规则。', '已施放的法术不能当作仍已准备；法术数量依职业等级表。'], links: [link('职业与等级表', '/classes/'), link('法术表', '/spells/')], sources: [phb('group-23', '施法'), phb('spell-tables', '法术表')] },
    { id: 'casting-time', title: '成分、时间与距离', points: ['按条目的言语、姿势和材料成分执行；缺少必需成分时不能照常施法。', '战斗轮为 1 分钟、每轮 10 段。施法时间为轮或回合的法术不能假定在本轮内完成。'], links: [link('战斗施法', '/play/combat/#spell-combat')], sources: [phb('group-23', '施法'), phb('spell-combat', '战斗施法')] },
    { id: 'resolution', title: '效果与中断', points: ['依目标、范围、持续时间和豁免栏结算；有逆向效果的法术要分别注明。', '若在完成前受到符合规则的打击、擒抱或魔法干扰，依战斗施法规则处理失效。'], links: [link('法术数据库', '/spells/'), link('施法中断', '/play/combat/#spell-combat')], sources: [phb('spell-combat', '施法与中断'), dmg('dmg-combat', '战斗施法')] }
    ] },
  { slug: 'downtime', title: '城镇与休整', intro: '冒险后的采购、恢复、受雇者和下一次出发准备。', sequence: ['出售财宝、结算经验与金钱', '补充装备与食宿，治疗伤势', '雇用人员或处理随从', '研究、训练与升级', '记录据点和下一次冒险的开支'], sections: [
    { id: 'supplies', title: '采购与食宿', points: ['按装备价格表记录购买和余额；服务、坐骑及雇员费用与携带物分开记账。', '恢复生命值及准备法术需要相应时间，不能因“回到城镇”便自动补满。'], links: [link('装备与服务', '/equipment/'), link('治疗', '/combat/healing/')], sources: [phb('money-equipment-and-arms', '金钱与装备'), phb('healing', '治疗')] },
    { id: 'people', title: '受雇者与随从', points: ['雇员与忠于角色的随从并非同一类；能力、报酬、忠诚和人数上限各有相应规则。', '把雇用费用和出行补给列入下次冒险准备。'], links: [link('PHB 受雇者', '/books/phb/hirelings-henchmen/')], sources: [phb('hirelings-henchmen', '受雇者'), dmg('dmg-hirelings', '受雇者')] },
    { id: 'growth', title: '训练与成长', points: ['确认经验值、等级要求与训练时间；升级后重新核对生命值、职业能力、法术与豁免。'], links: [link('成长与升级', '/play/advancement/'), link('职业表', '/classes/')], sources: [phb('experience', '经验'), dmg('dmg-experience', '经验')] }
    ] },
  { slug: 'advancement', title: '成长与升级', intro: '先确认经验值，再按职业表逐项更新人物卡；不要只把等级数字加一。', sequence: ['核对经验值门槛和训练要求', '检查种族等级上限及双职／多职业规则', '记录新增生命骰或固定生命值', '更新攻击、豁免、职业能力和法术', '保存升级前后人物卡'], sections: [
    { id: 'experience', title: '经验与资格', points: ['职业等级表给出经验值门槛；DMG 对经验分配和训练有补充。', '非人职业等级可能受属性值和种族上限约束；吟游诗人等特殊进阶须按附录处理。'], links: [link('职业等级表', '/classes/'), link('种族等级限制', '/races/')], sources: [phb('experience', '经验'), phb('races', '种族等级表'), dmg('dmg-experience', '经验')] },
    { id: 'changes', title: '逐项更新', points: ['职业表决定新增生命骰或固定生命值；体质调整只在适用的生命骰上处理。', '核对攻击矩阵、豁免表、盗贼能力、驱散不死、法术位和高等级能力；不同职业变化不同。', '若目前没有经过原表核对的自动计算，就保留手动记录，不给出虚构数值。'], links: [link('职业详情', '/classes/'), link('REF2 人物卡', '/character/')], sources: [phb('attack-saving-throw-matrices', '攻击与豁免矩阵'), phb('spell-tables', '法术表')] }
    ] }
];
