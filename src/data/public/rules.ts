import type { RuleEntry } from '../../schemas';

const baseline: RuleEntry[] = [
  { id: 'initiative', title: '先攻 Initiative', category: 'combat', summary: '每轮开始时确定行动顺序；具体采用团规或规则书版本应在战役说明中注明。', body: ['先攻以 round 为单位处理。主持人先明确双方意图，再进行先攻判定或使用双方统一的团规。', '法术的 casting time 以 segment 表示，可能跨越先攻顺序并受到打断影响。'], related: [{ label: '战斗流程', href: '/combat/combat-sequence' }, { label: '法术施法', href: '/rules/spell-casting' }], source: [{ book: 'PHB', page: 61, section: 'Initiative' }, { book: 'DMG', page: 61, section: 'Combat' }] },
  { id: 'surprise', title: '突袭 Surprise', category: 'combat', summary: '决定一方是否在遭遇初始阶段失去行动或遭受特殊限制。', body: ['突袭通常在双方尚未充分察觉对方时发生。距离、光照、噪音、移动方式与环境都会影响判断。', '请把本条与具体的 encounter 流程、隐秘移动和听闻规则一起使用。'], related: [{ label: '遭遇', href: '/adventure/encounters' }, { label: '静默移动', href: '/adventure/silent-movement' }], source: [{ book: 'PHB', page: 49, section: 'Surprise' }] },
  { id: 'spell-casting', title: '施法时间与施法段', category: 'rules', summary: '法术的施法时间按段、轮或回合计；战斗中的完成时点取决于法术本身的施法时间。', body: ['一轮分为十段。施法时间为若干段的法术，在相应段完成；施法时间为若干轮或回合的法术则跨越更长时间。', '施法者须具备该法术所列的言语、姿势与材料成分。施法完成前若受到攻击或干扰，可能失去法术。', '可逆法术的正向与逆向效果须分别记录；逆向施法并非任意更改已记忆法术的效果。'], related: [{ label: '法术表', href: '/spells' }, { label: '法术中断', href: '/combat/spell-interruption' }], source: [{ book: 'PHB', page: 38, section: 'Spell Casting' }, { book: 'DMG', page: 65, section: 'Spell Casting in Combat' }] },
  { id: 'armor-class', title: '护甲等级 Armor Class', category: 'combat', summary: '1E 的 AC 通常越低越好；武器调整值与盾牌等修正依具体表格处理。', body: ['记录人物或怪物的最终 AC，并注明其来源，例如护甲、盾牌、敏捷、魔法和姿态。', '不要把 1E 的 AC 直接替换为现代的高数值护甲体系。'], source: [{ book: 'PHB', page: 36, section: 'Armor' }] },
  { id: 'movement-time-distance', title: '移动、时间与距离', category: 'adventure', summary: '将英尺、英寸标记、round 与 turn 分开记录。', body: ['战斗中的移动与探索中的移动使用不同的时间尺度。规则条目应同时显示原始单位与中文说明。', '在狭窄地形、负重或追逐中，主持人应优先查找对应专项规则。'], related: [{ label: '负重', href: '/adventure/encumbrance' }, { label: '追逐', href: '/adventure/pursuit' }], source: [{ book: 'PHB', page: 102, section: 'Movement' }] },
  { id: 'encumbrance', title: '负重 Encumbrance', category: 'adventure', summary: '物品重量会影响移动、行动与长途旅行。', body: ['装备数据保留原始重量与价格，角色卡可将其作为手工核对的输入。', '本 MVP 不替主持人自动裁决所有边界情形；资料站应优先提供可追溯的规则来源。'], source: [{ book: 'PHB', page: 101, section: 'Encumbrance' }] },
  { id: 'light', title: '光照 Light', category: 'adventure', summary: '火把、提灯、法术与黑暗视觉决定可见范围。', body: ['光照应在每次探索行动中记录，特别是地下城移动与遭遇前后。', '不要将 infravision、ultravision 与普通照明混为一谈。'], related: [{ label: '提灯', href: '/equipment/lantern' }, { label: '精灵', href: '/races/elf' }], source: [{ book: 'PHB', page: 102, section: 'Light and Vision' }] },
  { id: 'traps', title: '陷阱 Traps', category: 'adventure', summary: '搜索、触发与解除陷阱是地下城探索流程的一部分。', body: ['陷阱条目至少应记录触发条件、察觉机会、效果、伤害与解除方式。', '怪物能力、地形和机关不应被简化成一个统一的技能检定。'], source: [{ book: 'DMG', page: 19, section: 'Traps' }] },
  { id: 'strongholds', title: '据点 Strongholds', category: 'rules', summary: '高等级人物可以通过职业能力、财富与故事进展建立据点。', body: ['据点内容应与职业、追随者、领地和维护成本相联系。', '本页面只提供索引，具体职业的据点要求应从职业页面反向链接。'], source: [{ book: 'DMG', page: 97, section: 'Strongholds' }] },
  { id: 'ability-scores', title: '属性与派生值', category: 'rules', summary: '角色卡根据 STR、DEX、CON、CHA 等属性显示常用派生值。', body: ['角色卡中的计算器是桌面辅助工具，不替代主持人对版本、种族和职业规则的最终判断。', 'Exceptional Strength 仅适用于符合条件的高力量角色，并保留 18/xx 记法。'], related: [{ label: '快速车卡', href: '/character' }], source: [{ book: 'PHB', page: 9, section: 'Character Abilities' }] },
  { id: 'campaign-management', title: '战役管理（预留）', category: 'rules', summary: '用于放置未来的战役、训练、追随者和世界设定索引。', body: ['这是一个内容隔离的占位条目，未来可由授权翻译 Markdown 导入。'], source: [{ book: 'DMG', section: 'Campaign Management' }] },
  { id: 'optional-rules', title: '可选规则（预留）', category: 'rules', summary: '用于 UA 与其他扩展来源的可选规则。', body: ['扩展规则应明确标记来源与采用建议，不应悄悄改变核心条目。'], source: [{ book: 'UA', section: 'Optional Rules' }] },
  { id: 'combat-sequence', title: '战斗流程', category: 'combat', summary: '以 round 为单位组织声明、先攻、移动、攻击与结算。', body: ['先确定遭遇状态与突袭，再处理先攻和本轮行动。', '将攻击、伤害、法术与士气作为可独立链接的步骤。'], related: [{ label: '先攻', href: '/combat/initiative' }, { label: '突袭', href: '/combat/surprise' }, { label: '伤害', href: '/combat/damage' }], source: [{ book: 'PHB', page: 61, section: 'Combat Procedures' }] },
  { id: 'damage', title: '伤害 Damage', category: 'combat', summary: '攻击命中后按武器、怪物或法术的伤害表达式处理。', body: ['伤害数据使用骰式与原始大小类别表述，避免在数据层过早转换为其他版本的统一值。', '伤害与生命值、濒死、治疗条目相互链接。'], related: [{ label: '治疗', href: '/combat/healing' }], source: [{ book: 'PHB', page: 62, section: 'Damage' }] },
  { id: 'spell-interruption', title: '法术中断', category: 'combat', summary: '施法完成前受到攻击或其他干扰，可能失去正在施放的法术。', body: ['记录开始施法的段数与法术预计完成的段数。', '若施法完成前受到伤害或失去施法所需条件，按 PHB 与 DMG 的战斗施法规则处理。'], related: [{ label: '施法时间与施法段', href: '/rules/spell-casting' }], source: [{ book: 'DMG', page: 65, section: 'Spell Casting in Combat' }] },
  { id: 'multiple-attacks', title: '多重攻击', category: 'combat', summary: '高等级职业或特定生物可能在一轮中拥有多次攻击。', body: ['多重攻击不是现代 action economy 的同义词；应按职业等级、怪物条目与武器规则分别查阅。'], source: [{ book: 'PHB', page: 22, section: 'Fighter' }] },
  { id: 'weapon-proficiency', title: '武器熟练（预留）', category: 'combat', summary: '用于扩展不同版本的武器熟练与非熟练规则。', body: ['当前为入口条目，数据结构已允许职业能力链接到此页面。'], source: [{ book: 'UA', section: 'Weapon Proficiencies' }] },
  { id: 'encounters', title: '遭遇 Encounters', category: 'adventure', summary: '从旅行、地下城与城市活动中进入遭遇流程。', body: ['遭遇流程应同时考虑距离、突袭、光照、地形、意图与反应。', '随机遭遇表可作为遭遇的来源之一，但不应替代主持人的情境判断。'], related: [{ label: '突袭', href: '/combat/surprise' }, { label: '随机表', href: '/tables' }], source: [{ book: 'DMG', page: 47, section: 'Encounters' }] },
  { id: 'silent-movement', title: '静默移动', category: 'adventure', summary: '移动噪音、环境与地形会影响偷袭和遭遇判断。', body: ['记录角色是否主动降低速度、是否穿戴会发声的装备，以及地面材质。'], source: [{ book: 'PHB', page: 102, section: 'Movement' }] },
  { id: 'pursuit', title: '追逐 Pursuit', category: 'adventure', summary: '用于处理逃跑、追赶与距离变化。', body: ['将移动率、地形、负重、体力与随机事件分开记录，便于扩展完整规则。'], source: [{ book: 'DMG', page: 69, section: 'Chases' }] },
  { id: 'healing', title: '治疗 Healing', category: 'combat', summary: '生命值可由休息、法术、圣疗、药水及其他魔法效果恢复。', body: ['一般休息每天恢复 1 点生命值；长期休息后的恢复速度、魔法治疗与生命值上限应对照《玩家手册》原文译稿裁定。'], related: [{ label: '治疗法术', href: '/spells/cure-light-wounds' }], source: [{ book: 'PHB', section: 'Healing' }] }
];

// Quick-reference wording is checked against the local Chinese work text;
// detailed exceptions stay in the linked book chapter. These are useful at the
// table on their own, rather than placeholders that merely send readers away.
const revisions: Record<string, Partial<RuleEntry>> = {
  initiative: { summary: '突袭结束后，每个需要比较行动先后的战斗轮，双方通常各掷 1d6，点数较高的一方先行动。', body: ['先让双方说明意图，再各掷一枚六面骰；已发生的突袭段先结算，不再为突袭阶段掷先攻。', '缓慢或加速等效果、武器长度及特殊战斗情形可能改写先后。法术的施法时间仍需按 segment 计算，不能只看先攻骰。'] },
  surprise: { summary: '通常每方掷 1d6，1–2 表示被突袭；骰点差可造成每点 1 segment（6 秒）的失行动时间。', body: ['噪声、光源、隐蔽和怪物特殊能力会改变突袭概率；例如某怪物可能只在 1/6 的结果下被突袭。', '若双方都被突袭，比较骰点差以抵消或缩短突袭时间。突袭方可利用对手失去的 segment 接近、逃跑或攻击；法术仍要付出完整施法时间。'] },
  'combat-sequence': { summary: '遭遇先看突袭，再声明意图、掷先攻、按段处理移动、攻击与施法，最后结算伤害及后续反应。', body: ['一轮为 1 分钟，分为 10 个 segment；突袭结束后通常每轮重新判定先攻。', '近战、投射、法术和特殊攻击采用各自的时机与例外；攻击命中后结算伤害，必要时再进行豁免。'] },
  'armor-class': { summary: 'AC 越低越难命中；护甲、盾牌、敏捷、魔法和体型修正可能叠加，但要看攻击方向与类型。', body: ['例如鳞甲 AC 4 加盾牌为 AC 3；带 +1 的盾牌再改善为 AC 2。', '盾牌只能防护一定方向与数量的攻击者；背后攻击可能失去盾牌和敏捷防护。不同武器对不同 AC 的调整另查武器表。'] },
  'movement-time-distance': { summary: '地下城探索以 10 分钟 turn 计时；战斗轮为 1 分钟、每轮 10 段，移动率的英寸符号按情境换算。', body: ['地下城边绘图边探索时，每 10 分钟 turn 行进的距离为移动率所示的相应英寸数；沿已知路线可加快至五倍，逃跑可达十倍（仍受负重限制）。', '战斗中每 1" 按 10 尺计：6" 为每轮 60 尺、每段 6 尺；12" 为每轮 120 尺、每段 12 尺。户外旅行另以半日行程计算。'] },
  encumbrance: { summary: '负重既看重量也看体积；约 35／70／105 磅的装备层级分别对应常见移动率 12"／9"／6"，更重可降至 3"。', body: ['普通装备约 35 磅以内且不笨重，移动 12"；重装备约 70 磅，移动 9"；极重约 105 磅，移动 6"；超过约 105 磅或非常笨重，移动 3"。', '力量调整会改变这些指引；10 枚金币折合 1 磅。体积、取用便利和为战利品预留空间也应计入裁定。'] },
  light: { summary: '火把照亮约 40 尺、燃烧 6 turn；普通提灯约 30 尺、1 品脱优质灯油燃烧 24 turn。', body: ['聚光提灯光束约 80 尺、宽 1"，同样以 1 品脱油燃烧 24 turn。', '地图绘制与阅读需要普通光源；红外视觉不能代替照明做这件事。光源也会影响怪物察觉与突袭。'] },
  traps: { summary: '陷阱可能用于囚禁、引导、伤害或杀死角色；探杆、绘图、观察和合理装备比统一技能检定更重要。', body: ['坑洞、移动墙和单向门可囚禁或引导队伍；绊索、刀刃与飞弹消耗资源；深坑、毒针、酸池等可致命。', 'DM 应记录触发条件、察觉线索、效果及解除方式。逐寸搜查会消耗时间，也可能引来游荡怪物。'] },
  encounters: { summary: '区分游荡怪物与固定遭遇：前者随时间、噪声等出现，后者通常在巢穴或预设地点。', body: ['游荡遭遇不一定值得交战，往往携带较少财宝；固定巢穴更可能与有价值的收获相关。', '处理遭遇时依次考虑距离与突袭，再进入先攻、沟通、谈判或战斗；随机表只是确定遭遇来源的工具。'] },
  'silent-movement': { summary: '盗贼或魔法装备可使角色完全无声移动；按其成功百分比掷 d100，等于或低于成功率即成功。', body: ['成功后移动不发出声响，更容易突袭或从对手旁边潜过。普通角色仍会因装备、地形和行为发出声音。'] },
  'spell-casting': { summary: '1E 法术按法术表中的 segment、round 或 turn 施放；决定施法时机时必须与先攻一起处理。', body: ['施法者需具备法术所列言语、姿势与材料成分；寻找尚未备好的材料也要花费游戏时间。', '受击、擒抱或未能豁免的魔法攻击可能破坏尚未完成的法术。可逆法术要在准备时明确所用形式。'] },
  'spell-interruption': { summary: '法术尚在施放时若施法者被击中、擒抱或遭到未成功豁免的魔法攻击，法术会被破坏。', body: ['先记录施法起始 segment 与 casting time，再比较敌方攻击的时机；高环法术可能跨越一个完整近战轮。', '即使是治疗法术，也按施法与中断的战斗时序处理。'] },
  'multiple-attacks': { summary: '拥有每轮多次攻击的战士，面对不能多次攻击的对手时，通常可在轮初先攻击一次。', body: ['战士与战士相互近战时仍由先攻决定；加速、缓慢、长武器迎击冲锋等情况会改变顺序。', '具体攻击次数须按职业等级表、武器与对手情形核定，不把它简化为现代规则的额外动作。'] },
  damage: { summary: '命中后按武器、怪物或法术条目掷伤害，扣除目标生命值；原译稿指出降至 0 或以下即死亡。', body: ['武器对小／中型和大型目标的伤害可能不同，力量与魔法也会修正结果。', '治疗、再生及其他魔法可能改变后续结局，须结合具体规则处理。'] },
  healing: { summary: '通常每完整休息一天恢复 1 点生命值；经过 30 个游戏日后，此后每天恢复 5 点。', body: ['圣疗、法术、药水和魔法装置可更快恢复生命值。任何恢复都不能使生命值超过掷骰所得总值加上相关加值。'] },
  'weapon-proficiency': { title: '武器熟练 Weapon Proficiency', summary: '各职业在初始等级有一定武器熟练数；使用未熟练的武器会受到相应命中罚值。', body: ['人物应记录已选的熟练武器；达到表中指定等级后可增加熟练项。', '职业间可用武器与非熟练罚值不同，具体数值请对照 PHB 武器熟练表，而非套用后续版本。'], source: [{ book: 'PHB', section: 'Weapon Proficiency' }] },
  'ability-scores': { summary: '六项属性有各自的 1E 专用调整表，不能套用统一的现代属性调整值。', body: ['STR 影响命中、伤害、负重、开门与弯铁条；战士力量达到 18 时可掷百分骰确定非凡力量。', 'DEX 涉及反应／投射与防御；CON 涉及每颗生命骰 HP、系统冲击与复活存活；CHA 涉及追随者上限、忠诚和遭遇反应。车卡会按已录入的 PHB 工作表显示这些数据。'] },
  strongholds: { summary: '据点建设涉及土地、建筑、工匠、守军、费用与时间；职业高等级能力另行决定追随者与领地效果。', body: ['先确定地理位置、规模和防御结构，再按 DMG 建造与攻城章节核对费用与工期。', '职业赋予的据点或随从不是免费建造的同义词；战役中的统治与维护需另行记录。'], source: [{ book: 'DMG', section: 'Construction and Siege' }] },
  pursuit: { summary: '逃跑与追逐要比较移动率、地形、负重和双方行动；投下食物或财宝有时会使追兵停下。', body: ['高速移动时无法正常绘图。沿熟悉路线与在未知地下城中边探索边逃跑，也采用不同速度。', '距离变化与是否继续追击由具体情境裁定，不能只掷一次统一的追逐检定。'] }
};

export const rules: RuleEntry[] = baseline.filter((entry) => !['campaign-management', 'optional-rules'].includes(entry.id)).map((entry) => ({ ...entry, ...revisions[entry.id] }));
