export type RandomTable = { id: string; title: string; dice: string; entries: { min: number; max: number; result: string; href?: string }[] };

export const tables: RandomTable[] = [
  { id: 'dungeon-encounters', title: '地下城遭遇（示例）', dice: 'd100', entries: [{ min: 1, max: 20, result: '2d6 哥布林', href: '/monsters/goblin' }, { min: 21, max: 35, result: '1d6 巨鼠', href: '/monsters/giant-rat' }, { min: 36, max: 50, result: '1d4 巨型蜘蛛', href: '/monsters/giant-spider' }, { min: 51, max: 70, result: '2d6 骷髅', href: '/monsters/skeleton' }, { min: 71, max: 85, result: '2d6 食人魔', href: '/monsters/ogre' }, { min: 86, max: 100, result: '无遭遇：听见远处的水声' }] }
];
