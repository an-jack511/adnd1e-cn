import type { Item } from '../../schemas';

const source = [{ book: 'WSG', section: 'Weather, Clothing, Food, and Water' }];

export const wsgItems: Item[] = [
  { id: 'wsg-very-cold-clothing', nameZh: '极寒衣着', nameEn: 'Very Cold Clothing', category: '荒野生存用品', price: '约 15 gp', weight: '450 gp', acAdjustment: '可按 AC 8 处理', description: '适合低于 0 度的厚重衣着，包括派克大衣、皮毛裤、手套、厚鞋和面部遮盖物。', tags: ['WSG', '寒冷', '衣着'], source },
  { id: 'wsg-cold-clothing', nameZh: '寒冷衣着', nameEn: 'Cold Clothing', category: '荒野生存用品', price: '约 7 gp', weight: '250 gp', acAdjustment: '可按 AC 9 处理', description: '适合 0–30 度，以羊毛等厚实织物保温并抵御风。', tags: ['WSG', '寒冷', '衣着'], source },
  { id: 'wsg-moderate-clothing', nameZh: '适中衣着', nameEn: 'Moderate Clothing', category: '荒野生存用品', price: '不超过 3 gp', weight: '无或 150 gp', description: '适合 31–75 度；低温时使用轻或中等厚度外衣，休息和睡眠时仍需毯子。', tags: ['WSG', '衣着'], source },
  { id: 'wsg-hot-clothing', nameZh: '炎热衣着', nameEn: 'Hot Clothing', category: '荒野生存用品', price: '最多 6 sp', weight: '无', description: '适合高于 75 度；潮湿时露出皮肤促进汗液蒸发，干燥缺水时用衣物保留水分。', tags: ['WSG', '炎热', '衣着'], source },
  { id: 'wsg-rations', nameZh: '荒野口粮', nameEn: 'Wilderness Rations', category: '食物', price: '按战役设定', weight: '按份量', description: '普通固体食物和高含水量食物均可计入荒野生存；最低日粮依种族、体重与活动量变化。', tags: ['WSG', '食物', '补给'], source },
  { id: 'wsg-water-container', nameZh: '水容器', nameEn: 'Water Container', category: '补给容器', price: '按容器类型', weight: '按容量', description: '荒野行军必需品；水的负重值为每加仑 50 gp，同一容器每超过三加仑再加 50 gp。', tags: ['WSG', '水', '补给'], source },
  { id: 'wsg-fishing-line-and-hook', nameZh: '鱼线与鱼钩', nameEn: 'Fishing Line and Hook', category: '荒野生存用品', price: '按装备质量', weight: '轻', description: '有饵钩线捕鱼每小时按水域和时段掷表；渔网可使结果增加 50%。', tags: ['WSG', '捕鱼', '食物'], source },
  { id: 'wsg-fishing-net', nameZh: '渔网', nameEn: 'Fishing Net', category: '荒野生存用品', price: '按装备质量', weight: '按网大小', description: '用于捕鱼；相较有饵钩线，按原书规则使每小时捕鱼结果增加 50%。', tags: ['WSG', '捕鱼', '食物'], source },
  { id: 'wsg-hunting-bow', nameZh: '狩猎弓', nameEn: 'Hunting Bow', category: '武器', price: '按弓型', weight: '按弓型', damageSmallMedium: '按弓型', damageLarge: '按弓型', description: '狩猎体型 L 生物所需的远程武器；普通猎人必须能用它造成平均至少 3 点伤害。', tags: ['WSG', '武器', '狩猎', '远程'], source }
];
