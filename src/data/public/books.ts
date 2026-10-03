import type { SourceReference } from '../../schemas';

export type Book = { id: string; short: string; title: string; titleZh: string; description: string; source: SourceReference[]; chapters: { title: string; href: string }[] };

export const books: Book[] = [
  { id: 'phb', short: 'PHB', title: "Players Handbook", titleZh: '玩家手册', description: '人物创建、职业、种族、装备、法术、冒险与战斗的中文工作译稿。', source: [{ book: 'PHB' }], chapters: [{ title: '人物属性', href: '/rules/ability-scores' }, { title: '施法', href: '/rules/spell-casting' }] },
  { id: 'dmg', short: 'DMG', title: "Dungeon Masters Guide", titleZh: '地下城主指南', description: '主持、遭遇、战斗、宝藏、附录与战役管理的中文工作译稿。', source: [{ book: 'DMG' }], chapters: [{ title: '随机遭遇', href: '/tables' }, { title: '战役管理', href: '/books/dmg/dmg-campaign/' }] },
  { id: 'mm', short: 'MM', title: 'Monster Manual', titleZh: '怪物图鉴', description: 'A–Z 字头的中文怪物条目、说明与书内目录；结构化怪物库另行维护。', source: [{ book: 'MM' }], chapters: [{ title: '怪物合集', href: '/monsters' }] },
  { id: 'ua', short: 'UA', title: 'Unearthed Arcana', titleZh: '破解奥秘', description: '扩展职业、法术、装备与可选规则的中文工作译稿。', source: [{ book: 'UA' }], chapters: [] },
  { id: 'dsg', short: 'DSG', title: "Dungeoneer's Survival Guide", titleZh: '地城生存指南', description: '地下探险、深地环境、远征、战役设计与地图制作的完整中文译稿。', source: [{ book: 'DSG' }], chapters: [] },
  { id: 'ff', short: 'Fiend Folio', title: 'Fiend Folio', titleZh: 'Fiend Folio', description: '额外怪物来源。', source: [{ book: 'Fiend Folio' }], chapters: [{ title: '额外怪物', href: '/monsters?source=Fiend%20Folio' }] },
  { id: 'dd', short: 'D&DG', title: 'Deities & Demigods', titleZh: '诸神与半神', description: '神祇与宇宙设定的来源索引。', source: [{ book: 'Deities & Demigods' }], chapters: [{ title: '神祇（预留）', href: '/psionics' }] }
];
