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
  { id: 'ff', short: 'Fiend Folio', title: 'Fiend Folio', titleZh: 'Fiend Folio', description: '额外怪物来源。', source: [{ book: 'Fiend Folio' }], chapters: [{ title: '额外怪物', href: '/monsters?source=Fiend%20Folio' }] },
  { id: 'ddg', short: 'DDG', title: 'Deities & Demigods', titleZh: '诸神与半神', description: '神祇能力、神话体系、牧师规则、神圣物品与位面旅行的完整中文译稿。', source: [{ book: 'DDG' }], chapters: [] },
  { id: 'll', short: 'L&L', title: 'Legends & Lore', titleZh: '传奇与学识', description: '神祇战役规则、神话体系、神庙陈设、牧师速查与已知位面资料的完整中文译稿。', source: [{ book: 'L&L' }], chapters: [] }
];
