import type { Item } from '../../schemas';

const source = (page: number, section: string) => [{ book: 'GHA', page, section }];

export const ghaItems: Item[] = [
  { id: 'gha-ring-pomarj', nameZh: '波马吉戒指', nameEn: 'Ring of Pomarj', category: '魔法物品', price: '未列', weight: '未列', description: '灰鹰战役中的地区性魔法戒指；完整佩戴者限制与能力见原书条目。', tags: ['GHA', '灰鹰', '戒指'], source: source(73, 'Ring of Pomarj') },
  { id: 'gha-lantern-of-greyhawk', nameZh: '灰鹰的提灯', nameEn: 'Lantern of Greyhawk', category: '魔法物品', price: '未列', weight: '未列', description: '灰鹰特有的魔法提灯；其光照与特殊用途依原书条目处理。', tags: ['GHA', '灰鹰', '提灯'], source: source(81, 'Lantern of Greyhawk') },
  { id: 'gha-prism-of-greyhawk', nameZh: '灰鹰的棱镜', nameEn: 'Prism of Greyhawk', category: '魔法物品', price: '未列', weight: '未列', description: '与灰鹰城和奥斯魔法传统相关的棱镜型魔法物品；完整颜色与效果表见原书条目。', tags: ['GHA', '灰鹰', '魔法物品'], source: source(83, 'Prism of Greyhawk') },
  { id: 'gha-golden-circlet-greyhawk', nameZh: '灰鹰的金头环', nameEn: 'Golden Circlet of Greyhawk', category: '魔法物品', price: '未列', weight: '未列', description: '灰鹰的金色头环，可供魔法使用者或盗贼使用；能力和限制依原书条目。', tags: ['GHA', '灰鹰', '头部物品'], source: source(78, 'Golden Circlet of Greyhawk') },
  { id: 'gha-staff-war-nyrond', nameZh: '奈伦德战争法杖', nameEn: 'War Staff of Nyrond', category: '魔法物品', price: '未列', weight: '未列', description: '奈伦德地区的战争法杖；拥有魔法使用者限制和战斗能力。', tags: ['GHA', '灰鹰', '法杖'], source: source(75, 'War Staff of Nyrond') },
  { id: 'gha-wand-storm-skant', nameZh: '斯坎特风暴魔杖', nameEn: 'Storm Wand of Scant', category: '魔法物品', price: '未列', weight: '未列', description: '与海岸风暴相关的魔杖；充能、射程和风暴效果依原书条目。', tags: ['GHA', '灰鹰', '魔杖'], source: source(75, 'Storm Wand of Scant') },
  { id: 'gha-blue-armor-crystalmist', nameZh: '水晶雾山脉的蓝甲 +3', nameEn: 'Blue Armor +3 of the Crystalmist Mountains', category: '魔法护甲', price: '未列', weight: '未列', acAdjustment: '+3', description: '水晶雾山脉的蓝色魔法护甲，提供 +3 防护并具有原书所列特殊能力。', tags: ['GHA', '灰鹰', '护甲'], source: source(84, 'Blue Armor +3 of the Crystalmist Mountains') },
  { id: 'gha-sceptre-forgotten-city', nameZh: '遗忘之城的权杖', nameEn: 'Sceptre of the Forgotten City', category: '魔法物品', price: '未列', weight: '未列', description: '来自失落城市的权杖型魔法物品；完整启动方式与效果见原书条目。', tags: ['GHA', '灰鹰', '权杖'], source: source(86, 'Sceptre of the Forgotten City') }
];
