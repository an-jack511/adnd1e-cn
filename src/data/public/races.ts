import type { RaceEntry } from '../../schemas';

export const races: RaceEntry[] = [
  { id: 'human', nameZh: '人类', nameEn: 'Human', modifiers: '无默认调整', restrictions: '通常无职业限制', levelLimits: '通常无种族等级上限', languages: '通用语及地区语言', movement: '12"', abilities: ['适应性强', '可选择任意单一职业'], source: [{ book: 'PHB', page: 14, section: 'Human' }] },
  { id: 'elf', nameZh: '精灵', nameEn: 'Elf', modifiers: 'DEX +1（采用的版本若有规定）', restrictions: '职业组合与武器限制见条目', levelLimits: '按职业与版本', languages: '精灵语、通用语及相关语言', movement: '12"', abilities: ['黑暗视觉/夜视（按版本）', '对特定秘门与隐藏门有察觉能力', '可多职业'], source: [{ book: 'PHB', page: 16, section: 'Elf' }] }
];
