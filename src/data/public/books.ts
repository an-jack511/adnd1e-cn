import type { SourceReference } from '../../schemas';

export type Book = { id: string; short: string; title: string; titleZh: string; description: string; source: SourceReference[]; chapters: { title: string; href: string }[] };

export const books: Book[] = [
  { id: 'phb', short: 'PHB', title: "Players Handbook", titleZh: '玩家手册', description: '人物创建、职业、种族、装备、法术、冒险与战斗的中文工作译稿。', source: [{ book: 'PHB' }], chapters: [{ title: '人物属性', href: '/rules/ability-scores' }, { title: '施法', href: '/rules/spell-casting' }] },
  { id: 'dmg', short: 'DMG', title: "Dungeon Masters Guide", titleZh: '地下城主指南', description: '主持、遭遇、战斗、宝藏、附录与战役管理的中文工作译稿。', source: [{ book: 'DMG' }], chapters: [{ title: '随机遭遇', href: '/tables' }, { title: '战役管理', href: '/books/dmg/dmg-campaign/' }] },
  { id: 'mm', short: 'MM', title: 'Monster Manual', titleZh: '怪物图鉴', description: 'A–Z 字头的中文怪物条目、说明与书内目录；结构化怪物库另行维护。', source: [{ book: 'MM' }], chapters: [{ title: '怪物合集', href: '/monsters' }] },
  { id: 'ua', short: 'UA', title: 'Unearthed Arcana', titleZh: '破解奥秘', description: '扩展职业、法术、装备与可选规则的中文工作译稿。', source: [{ book: 'UA' }], chapters: [] },
  { id: 'dsg', short: 'DSG', title: "Dungeoneer's Survival Guide", titleZh: '地城生存指南', description: '地下探险、深地环境、远征、战役设计与地图制作的完整中文译稿。', source: [{ book: 'DSG' }], chapters: [] },
  { id: 'wsg', short: 'WSG', title: 'Wilderness Survival Guide', titleZh: '荒野生存指南', description: '荒野地形、天气、补给、移动、自然危害与战役主持的完整中文译稿。', source: [{ book: 'WSG' }], chapters: [] },
  { id: 'oa', short: 'OA', title: 'Oriental Adventures', titleZh: '东方冒险', description: '东方职业、种族、荣誉、武术、法术、装备、怪物与卡拉图设定的完整中文译稿。', source: [{ book: 'OA' }], chapters: [] },
  { id: 'motp', short: 'MotP', title: 'Manual of the Planes', titleZh: '位面手册', description: '位面结构、内层位面、星界、外层位面、附录生物与位面法术索引的完整中文译稿。', source: [{ book: 'MotP' }], chapters: [] },
  { id: 'ff', short: 'FF', title: 'Fiend Folio', titleZh: '恶魔宝典', description: '扫描 PDF 第 1–128 页的完整中文逐页重译，包含额外怪物、遭遇表、等级表、索引与书后附页。', source: [{ book: 'FF' }], chapters: [{ title: '额外怪物', href: '/monsters?source=FF' }, { title: '恶魔宝典正文', href: '/books/ff/' }] },
  { id: 'mm2', short: 'MM2', title: 'Monster Manual II', titleZh: '怪物图鉴 II', description: 'Monster Manual II 的完整中文逐页重译，包含怪物条目、地下城与户外遭遇表、水域与位面表、分类索引及名称索引。', source: [{ book: 'MM2' }], chapters: [{ title: '新增怪物', href: '/monsters?source=MM2' }, { title: '怪物图鉴 II 正文', href: '/books/mm2/' }] },
  { id: 'ref3', short: 'REF3', title: 'The Book of Lairs', titleZh: '巢穴之书', description: '《巢穴之书》的完整中文逐页重译，包含遭遇、怪物统计、地图版面登记、目录与封底资料。', source: [{ book: 'REF3' }], chapters: [{ title: '巢穴之书正文', href: '/books/ref3/' }] },
  { id: 'ref4', short: 'REF4', title: 'The Book of Lairs II', titleZh: '巢穴之书 II', description: '《巢穴之书 II》的完整中文逐页重译，包含城市、荒野、地下、水域、异界遭遇、怪物统计、索引与封底资料。', source: [{ book: 'REF4' }], chapters: [{ title: '巢穴之书 II 正文', href: '/books/ref4/' }] },
  { id: 'ref5', short: 'REF5', title: 'Lords of Darkness', titleZh: '黑暗诸王', description: '《黑暗诸王》的完整中文逐页重译，包含不死生物遭遇、巢穴、怪物统计、夜间画廊、世俗指南与不死法术。', source: [{ book: 'REF5' }], chapters: [{ title: '黑暗诸王正文', href: '/books/ref5/' }] },
  { id: 'dla', short: 'DLA', title: 'Dragonlance Adventures', titleZh: '龙枪冒险', description: '《龙枪冒险》的完整中文逐页重译，包含克莱恩世界、骑士团、高等法术、种族、生物、龙、魔法物品、龙枪之战、人物与附录速查表。', source: [{ book: 'DLA' }], chapters: [{ title: '龙枪冒险正文', href: '/books/dla/' }, { title: '克莱恩生物', href: '/monsters?source=DLA' }] },
  { id: 'dl-atlas', short: 'DL Atlas', title: 'Atlas of the Dragonlance World', titleZh: '龙枪世界地图集', description: '龙枪世界的地区、城市、遗迹、路径、战役与主题地图资料的中文逐页译稿。', source: [{ book: 'DL Atlas' }], chapters: [{ title: '龙枪世界地图集正文', href: '/books/dl-atlas/' }] },
  { id: 'ilh', short: 'ILH', title: 'From the Inn of the Last Home: The Complete Krynn Source Book', titleZh: '来自最后归乡旅店：克莱恩资料大全', description: '《来自最后归乡旅店》的完整中文逐页译稿，包含克莱恩历史、种族论文、战争日志、数秘学、符文、歌曲、乐谱、食谱与封底资料。', source: [{ book: 'ILH' }], chapters: [{ title: '最后归乡旅店正文', href: '/books/ilh/' }] },
  { id: 'ddg', short: 'DDG', title: 'Deities & Demigods', titleZh: '诸神与半神', description: '神祇能力、神话体系、牧师规则、神圣物品与位面旅行的完整中文译稿。', source: [{ book: 'DDG' }], chapters: [] },
  { id: 'll', short: 'L&L', title: 'Legends & Lore', titleZh: '传奇与学识', description: '神祇战役规则、神话体系、神庙陈设、牧师速查与已知位面资料的完整中文译稿。', source: [{ book: 'L&L' }], chapters: [] },
  { id: 'dmdk', short: 'DMDK', title: "Dungeon Master's Design Kit", titleZh: '地下城主设计工具箱', description: '冒险设计、表单、示例冒险与冒险菜谱的完整中文译稿。', source: [{ book: 'DMDK' }], chapters: [] },
  { id: 'fr', short: 'FR', title: 'Forgotten Realms: Cyclopedia of the Realms', titleZh: '被遗忘的国度', description: '被遗忘国度的地理、历史、人物、组织、神祇、语言、货币、魔法与地图资料的完整中文逐页译稿。', source: [{ book: 'FR' }], chapters: [{ title: '被遗忘的国度正文', href: '/books/fr/' }] },
  { id: 'gha', short: 'GHA', title: 'Greyhawk Adventures', titleZh: '灰鹰冒险', description: '灰鹰战役资料的第 1–103 页中文逐页译稿，含神祇、怪物、人物、法术、魔法物品、奥斯地理和地下城主注记；第 104 页起的冒险模组按项目范围排除。', source: [{ book: 'GHA' }], chapters: [{ title: '灰鹰冒险正文', href: '/books/gha/' }, { title: '灰鹰怪物', href: '/monsters?source=GHA' }, { title: '灰鹰法术', href: '/spells?source=GHA' }, { title: '灰鹰魔法物品', href: '/equipment?source=GHA' }] }
];
