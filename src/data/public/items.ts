import type { Item } from '../../schemas';
import imported from './items-imported.json';
import magicImported from './magic-items-imported.json';
import uaImported from './ua-items-imported.json';
import uaWeaponCombat from './ua-weapon-combat.json';
import uaWeaponHandheld from './ua-weapon-handheld.json';
import { oaItems } from './oa-items';
import { dsgItems } from './dsg-items';
import { wsgItems } from './wsg-items';
import { ref5Items } from './ref5-items';

const examples: Item[] = [
  { id: 'long-sword', nameZh: '长剑', nameEn: 'Long Sword', category: '武器', price: '15 gp', weight: '4 lb.', damageSmallMedium: '1d8', damageLarge: '1d12', length: '4 ft.', spaceRequired: '—', speedFactor: '5', acAdjustment: '—', description: '常见的单手军用剑。', tags: ['武器', '近战'], source: [{ book: 'PHB', page: 38 }] },
  { id: 'short-sword', nameZh: '短剑', nameEn: 'Short Sword', category: '武器', price: '10 gp', weight: '3 lb.', damageSmallMedium: '1d6', damageLarge: '1d8', length: '2 ft.', spaceRequired: '—', speedFactor: '3', acAdjustment: '—', description: '适合近身与狭窄空间作战的剑。', tags: ['武器', '近战'], source: [{ book: 'PHB', page: 38 }] },
  { id: 'dagger', nameZh: '匕首', nameEn: 'Dagger', category: '武器', price: '2 gp', weight: '1 lb.', damageSmallMedium: '1d4', damageLarge: '1d3', length: '1 ft.', spaceRequired: '—', speedFactor: '2', acAdjustment: '—', description: '可近战，也可投掷的短兵器。', tags: ['武器', '投掷'], source: [{ book: 'PHB', page: 38 }] },
  { id: 'mace', nameZh: '钉头锤', nameEn: 'Mace', category: '武器', price: '8 gp', weight: '10 lb.', damageSmallMedium: '1d6', damageLarge: '1d6+1', length: '—', spaceRequired: '—', speedFactor: '7', acAdjustment: '—', description: '钝击武器，常见于牧师。', tags: ['武器', '钝击'], source: [{ book: 'PHB', page: 38 }] },
  { id: 'shield', nameZh: '盾牌', nameEn: 'Shield', category: '护甲', price: '10 gp', weight: '5 lb.', acAdjustment: '-1', description: '提供 AC 改善的手持防具。', tags: ['护甲', '防御'], source: [{ book: 'PHB', page: 36 }] },
  { id: 'leather-armor', nameZh: '皮甲', nameEn: 'Leather Armor', category: '护甲', price: '5 gp', weight: '15 lb.', acAdjustment: 'AC 8', description: '轻型皮制护甲，可供盗贼与其他轻装职业使用。', tags: ['护甲'], source: [{ book: 'PHB', page: 36 }] },
  { id: 'backpack', nameZh: '背包', nameEn: 'Backpack', category: '冒险用品', price: '2 gp', weight: '2 lb.', description: '用于携带冒险物资的容器。', tags: ['冒险', '容器'], source: [{ book: 'PHB', page: 35 }] },
  { id: 'lantern', nameZh: '提灯', nameEn: 'Lantern', category: '冒险用品', price: '7 gp', weight: '2 lb.', description: '以油为燃料的照明工具；参见光照规则。', tags: ['光照', '探索'], source: [{ book: 'PHB', page: 35 }, { book: 'PHB', page: 102, section: 'Light' }] },
  { id: 'warhorse', nameZh: '战马', nameEn: 'Warhorse', category: '动物', price: '400 gp', weight: '—', description: '训练用于骑战的马匹。骑乘与冲锋规则另见战斗章节。', tags: ['动物', '坐骑'], source: [{ book: 'PHB', page: 36 }] },
  { id: 'healing-potion', nameZh: '治疗药水', nameEn: 'Potion of Healing', category: '魔法物品', price: '—', weight: '—', description: '饮用后恢复一定生命值；具体可用版本与价格由主持人决定。', tags: ['魔法', '治疗'], source: [{ book: 'DMG', section: 'Magic Items' }] }
];

const comparable = (name: string) => name.replace(/与鞘/g, '').replace(/，.*$/, '').trim();
const importedItems: Item[] = (imported as Item[]).map((item) => {
  const existing = examples.find((entry) => comparable(entry.nameZh) === comparable(item.nameZh));
  return existing ? { ...item, id: existing.id, nameEn: existing.nameEn, weight: item.weight === '见负重表' ? existing.weight : item.weight, damageSmallMedium: item.damageSmallMedium ?? existing.damageSmallMedium, damageLarge: item.damageLarge ?? existing.damageLarge, length: item.length ?? existing.length, spaceRequired: item.spaceRequired ?? existing.spaceRequired, speedFactor: item.speedFactor ?? existing.speedFactor, acAdjustment: item.acAdjustment ?? existing.acAdjustment, tags: [...new Set([...item.tags, ...existing.tags])] } : item;
});
const usedIds = new Set(importedItems.map((item) => item.id));
const uaCombatById = uaWeaponCombat as Record<string, Item['weaponCombat']>;
const uaHandheldById = uaWeaponHandheld as Record<string, NonNullable<Item['weaponCombat']>['handHeld']>;
const uaItemsWithCombat = (uaImported as Item[]).map((item) => {
  const combat = uaCombatById[item.id];
  const handHeld = uaHandheldById[item.id];
  return combat || handHeld ? { ...item, weaponCombat: { ...combat, ...(handHeld ? { handHeld } : {}) } } : item;
});
const uaCombatOnly: Item[] = [
  ['ua-weapon-bow-composite-long', '长复合弓', 'Bow, Composite, Long'],
  ['ua-weapon-bow-composite-short', '短复合弓', 'Bow, Composite, Short'],
  ['ua-weapon-bow-long', '长弓', 'Bow, Long'],
  ['ua-weapon-bow-short', '短弓', 'Bow, Short'],
  ['ua-weapon-crossbow-hand', '手弩', 'Crossbow, Hand'],
  ['ua-weapon-crossbow-heavy', '重弩', 'Crossbow, Heavy'],
  ['ua-weapon-crossbow-light', '轻弩', 'Crossbow, Light'],
  ['ua-weapon-dart', '飞镖', 'Dart'],
  ['ua-weapon-hammer', '锤', 'Hammer'],
  ['ua-weapon-javelin', '标枪', 'Javelin']
].map(([id, nameZh, nameEn]) => ({ id, nameZh, nameEn, category: '武器', price: '见 UA 装备价目', weight: '见 UA 重量与伤害表', description: 'UA 武器表：投掷／射击数据见原书第 28 页；重量与伤害见相应武器表。', tags: ['武器', 'UA'], source: [{ book: 'UA', section: 'ua-weapons' }], weaponCombat: (uaWeaponCombat as Record<string, Item['weaponCombat']>)[id] }));
export const items: Item[] = [...importedItems, ...(magicImported as Item[]), ...uaItemsWithCombat, ...uaCombatOnly, ...oaItems, ...dsgItems, ...wsgItems, ...ref5Items, ...examples.filter((item) => !usedIds.has(item.id))];
