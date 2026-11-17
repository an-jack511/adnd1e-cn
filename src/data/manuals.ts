import spellbooks from './spellbooks.json';

export interface Manual {
  id: string;
  title: string;
  subtitle?: string;
  code?: string;
  category: 'compilations' | 'magic-user-spellbooks' | 'illusionist-spellbooks';
  cover: string;
  file: string;
  description: string;
  pages: number;
}

export const manualCategories = [
  { id: 'compilations', label: '规则汇编' },
  { id: 'spellbooks', label: '法术书' },
  { id: 'magic-user-spellbooks', label: '魔法师法术书' },
  { id: 'illusionist-spellbooks', label: '幻术师法术书' },
];

export const manuals: Manual[] = [
  {
    id: 'player-reference-2',
    title: 'AD&D 1e 玩家速查手册 · 第二册：冒险与战役',
    category: 'compilations',
    cover: '/manuals/player-reference-2/cover.jpg',
    file: '/manuals/player-reference-2/player-reference-2.pdf',
    description: '双面打印、单位换算与装订版。供玩家查阅及打印使用。',
    pages: 42,
  },
  ...(spellbooks as Manual[]),
];
