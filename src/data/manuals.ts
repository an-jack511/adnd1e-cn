export interface Manual {
  id: string;
  title: string;
  category: 'compilations' | 'spellbooks';
  cover: string;
  file: string;
  description: string;
  pages: number;
}

export const manualCategories = [
  { id: 'compilations', label: '规则汇编' },
  { id: 'spellbooks', label: '法术书' },
];

export const manuals: Manual[] = [
  {
    id: 'player-reference-2',
    title: 'AD&D 1e 玩家速查手册 · 第二册',
    category: 'compilations',
    cover: '/manuals/player-reference-2/cover.jpg',
    file: '/manuals/player-reference-2/player-reference-2.pdf',
    description: '双面打印、单位换算与装订版。供玩家查阅及打印使用。',
    pages: 42,
  },
];
