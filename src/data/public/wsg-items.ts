import type { Item } from '../../schemas';

const source = [{ book: 'WSG', section: 'Weather, Clothing, Food, and Water' }];
const shelterSource = [{ book: 'WSG', page: 62, section: 'Portable Shelters' }];

export const wsgItems: Item[] = [
  { id: 'wsg-very-cold-clothing', nameZh: '极寒衣着', nameEn: 'Very Cold Clothing', category: '荒野生存用品', price: '约 15 gp', weight: '450 gp', acAdjustment: '可按 AC 8 处理', description: '适合低于 0 度的厚重衣着，包括派克大衣、皮毛裤、手套、厚鞋和面部遮盖物。', tags: ['WSG', '寒冷', '衣着'], source },
  { id: 'wsg-cold-clothing', nameZh: '寒冷衣着', nameEn: 'Cold Clothing', category: '荒野生存用品', price: '约 7 gp', weight: '250 gp', acAdjustment: '可按 AC 9 处理', description: '适合 0–30 度，以羊毛等厚实织物保温并抵御风。', tags: ['WSG', '寒冷', '衣着'], source },
  { id: 'wsg-moderate-clothing', nameZh: '适中衣着', nameEn: 'Moderate Clothing', category: '荒野生存用品', price: '不超过 3 gp', weight: '无或 150 gp', description: '适合 31–75 度；低温时使用轻或中等厚度外衣，休息和睡眠时仍需毯子。', tags: ['WSG', '衣着'], source },
  { id: 'wsg-hot-clothing', nameZh: '炎热衣着', nameEn: 'Hot Clothing', category: '荒野生存用品', price: '最多 6 sp', weight: '无', description: '适合高于 75 度；潮湿时露出皮肤促进汗液蒸发，干燥缺水时用衣物保留水分。', tags: ['WSG', '炎热', '衣着'], source },
  { id: 'wsg-rations', nameZh: '荒野口粮', nameEn: 'Wilderness Rations', category: '食物', price: '按战役设定', weight: '按份量', description: '普通固体食物和高含水量食物均可计入荒野生存；最低日粮依种族、体重与活动量变化。', tags: ['WSG', '食物', '补给'], source },
  { id: 'wsg-water-container', nameZh: '水容器', nameEn: 'Water Container', category: '补给容器', price: '按容器类型', weight: '按容量', description: '荒野行军必需品；水的负重值为每加仑 50 gp，同一容器每超过三加仑再加 50 gp。', tags: ['WSG', '水', '补给'], source },
  { id: 'wsg-fishing-line-and-hook', nameZh: '鱼线与鱼钩', nameEn: 'Fishing Line and Hook', category: '荒野生存用品', price: '按装备质量', weight: '轻', description: '有饵钩线捕鱼每小时按水域和时段掷表；渔网可使结果增加 50%。', tags: ['WSG', '捕鱼', '食物'], source },
  { id: 'wsg-fishing-net', nameZh: '渔网', nameEn: 'Fishing Net', category: '荒野生存用品', price: '按装备质量', weight: '按网大小', description: '用于捕鱼；相较有饵钩线，按原书规则使每小时捕鱼结果增加 50%。', tags: ['WSG', '捕鱼', '食物'], source },
  { id: 'wsg-hunting-bow', nameZh: '狩猎弓', nameEn: 'Hunting Bow', category: '武器', price: '按弓型', weight: '按弓型', damageSmallMedium: '按弓型', damageLarge: '按弓型', description: '狩猎体型 L 生物所需的远程武器；普通猎人必须能用它造成平均至少 3 点伤害。', tags: ['WSG', '武器', '狩猎', '远程'], source },
  { id: 'wsg-poor-shelter-small', nameZh: '简陋小型庇护所', nameEn: 'Poor Shelter, Small', category: '荒野生存用品', price: '10 gp', weight: '350 gp 负重值', description: '可容纳一名人类大小角色，或两名较小角色。搭建时间 1d2+1 轮；耐湿：小雨/小雪；抗风 20 mph；寿命 40 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-poor-shelter-medium', nameZh: '简陋中型庇护所', nameEn: 'Poor Shelter, Medium', category: '荒野生存用品', price: '20 gp', weight: '450 gp 负重值', description: '可舒适容纳两名人类大小角色，或相当数量的较小角色。搭建时间 1d2+2 轮；耐湿：小雨/小雪；抗风 20 mph；寿命 40 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-poor-shelter-large', nameZh: '简陋大型庇护所', nameEn: 'Poor Shelter, Large', category: '荒野生存用品', price: '30 gp', weight: '600 gp 负重值', description: '设计用于容纳四名人类大小角色。搭建时间 1d2+3 轮；耐湿：小雨/小雪；抗风 20 mph；寿命 40 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-adequate-shelter-small', nameZh: '合格小型庇护所', nameEn: 'Adequate Shelter, Small', category: '荒野生存用品', price: '30 gp', weight: '500 gp 负重值', description: '搭建时间 1d3+1 轮；耐湿：中雨/中雪；抗风 30 mph；寿命 80 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-adequate-shelter-medium', nameZh: '合格中型庇护所', nameEn: 'Adequate Shelter, Medium', category: '荒野生存用品', price: '50 gp', weight: '600 gp 负重值', description: '搭建时间 1d3+2 轮；耐湿：中雨/中雪；抗风 30 mph；寿命 80 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-adequate-shelter-large', nameZh: '合格大型庇护所', nameEn: 'Adequate Shelter, Large', category: '荒野生存用品', price: '75 gp', weight: '750 gp 负重值', description: '搭建时间 1d3+3 轮；耐湿：中雨/中雪；抗风 30 mph；寿命 80 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-good-shelter-small', nameZh: '良好小型庇护所', nameEn: 'Good Shelter, Small', category: '荒野生存用品', price: '75 gp', weight: '600 gp 负重值', description: '搭建时间 1d3+1 轮；耐湿：大雨/大雪；抗风 40 mph；寿命 120 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-good-shelter-medium', nameZh: '良好中型庇护所', nameEn: 'Good Shelter, Medium', category: '荒野生存用品', price: '120 gp', weight: '800 gp 负重值', description: '搭建时间 1d3+2 轮；耐湿：大雨/大雪；抗风 40 mph；寿命 120 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-good-shelter-large', nameZh: '良好大型庇护所', nameEn: 'Good Shelter, Large', category: '荒野生存用品', price: '180 gp', weight: '1000 gp 负重值', description: '搭建时间 1d4+2 轮；耐湿：大雨/大雪；抗风 40 mph；寿命 120 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-superior-shelter-small', nameZh: '优良小型庇护所', nameEn: 'Superior Shelter, Small', category: '荒野生存用品', price: '200 gp', weight: '750 gp 负重值', description: '搭建时间 1d4+1 轮；耐湿：暴雨；抗风 50 mph；寿命 180 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-superior-shelter-medium', nameZh: '优良中型庇护所', nameEn: 'Superior Shelter, Medium', category: '荒野生存用品', price: '300 gp', weight: '1000 gp 负重值', description: '搭建时间 1d4+2 轮；耐湿：暴雨；抗风 50 mph；寿命 180 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource },
  { id: 'wsg-superior-shelter-large', nameZh: '优良大型庇护所', nameEn: 'Superior Shelter, Large', category: '荒野生存用品', price: '400 gp', weight: '1500 gp 负重值', description: '搭建时间 1d4+3 轮；耐湿：暴雨；抗风 50 mph；寿命 180 点。', tags: ['WSG', '庇护所', '露营'], source: shelterSource }
];
