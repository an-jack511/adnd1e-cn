import type { SourceReference } from '../../schemas';

export type Book = { id: string; short: string; title: string; titleZh: string; description: string; source: SourceReference[]; chapters: { title: string; href: string }[] };

export const books: Book[] = [
  { id: 'phb', short: 'PHB', title: "Players Handbook", titleZh: '玩家手册', description: '人物创建、职业、种族、装备与施法规则。这里仅保留结构化索引与已授权内容的入口。', source: [{ book: 'PHB' }], chapters: [{ title: '人物属性', href: '/rules/ability-scores' }, { title: '施法', href: '/rules/spell-casting' }] },
  { id: 'dmg', short: 'DMG', title: "Dungeon Masters Guide", titleZh: '地下城主指南', description: '主持人使用的流程、遭遇、奖励与战役管理参考。', source: [{ book: 'DMG' }], chapters: [{ title: '随机遭遇', href: '/tables' }, { title: '战役管理', href: '/rules/campaign-management' }] },
  { id: 'mm', short: 'MM', title: 'Monster Manual', titleZh: '怪物图鉴', description: '怪物条目的来源书索引。怪物数据与书籍阅读模式分开组织。', source: [{ book: 'MM' }], chapters: [{ title: '怪物合集', href: '/monsters' }] },
  { id: 'ua', short: 'UA', title: 'Unearthed Arcana', titleZh: 'Unearthed Arcana', description: '扩展职业、法术、装备与可选规则。', source: [{ book: 'UA' }], chapters: [{ title: '扩展规则', href: '/rules/optional-rules' }] },
  { id: 'ff', short: 'Fiend Folio', title: 'Fiend Folio', titleZh: 'Fiend Folio', description: '额外怪物来源。', source: [{ book: 'Fiend Folio' }], chapters: [{ title: '额外怪物', href: '/monsters?source=Fiend%20Folio' }] },
  { id: 'dd', short: 'D&DG', title: 'Deities & Demigods', titleZh: '诸神与半神', description: '神祇与宇宙设定的来源索引。', source: [{ book: 'Deities & Demigods' }], chapters: [{ title: '神祇（预留）', href: '/psionics' }] }
];
