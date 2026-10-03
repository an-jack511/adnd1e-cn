import type { Item } from '../../schemas';

const source = [{ book: 'DSG', section: 'Equipment' }];

export const dsgItems: Item[] = [
  { id: 'dsg-air-bladder', nameZh: '空气囊', nameEn: 'Air Bladder', category: '地下探险用品', price: '15 gp', weight: '20 gp', description: '静止时可供一名角色呼吸一整轮；充气后可漂浮，踢腿移动速度为正常游泳速度的三分之一。', tags: ['DSG', '呼吸', '游泳'], source },
  { id: 'dsg-beacon-lantern', nameZh: '信标灯', nameEn: 'Beacon Lantern', category: '地下探险用品', price: '40 gp', weight: '200 gp', description: '不能手提，须安装在建筑、车辆或船上；向 240 英尺外投射锥形光束，每 10 轮消耗一品脱油。', tags: ['DSG', '光照'], source },
  { id: 'dsg-small-metal-chest', nameZh: '小型金属箱', nameEn: 'Small Metal Chest', category: '容器', price: '100 gp', weight: '20 gp', description: '密封后不透光且气密，适合储存不想被魔法检查的物品、宝石或恒光物品。', tags: ['DSG', '容器', '防护'], source },
  { id: 'dsg-ice-claws', nameZh: '冰爪', nameEn: 'Ice Claws', category: '地下探险用品', price: '40 gp', weight: '50 gp', description: '绑在靴底的铁钉，用于冰面和其他滑面；穿戴会影响噪声和移动。', tags: ['DSG', '攀爬', '冰面'], source },
  { id: 'dsg-crowbar', nameZh: '撬棍', nameEn: 'Crowbar', category: '工具', price: '3 gp', weight: '75 gp', description: '用于撬门、撬石和施加杠杆力的铁制工具。', tags: ['DSG', '工具'], source },
  { id: 'dsg-iron-drill', nameZh: '铁钻', nameEn: 'Iron Drill', category: '工具', price: '5 gp', weight: '50 gp', description: '可钻穿木墙或石墙；全力工作时每轮钻 1 英寸木材，或每 3 轮钻 1 英寸石材，噪声可传到 120 英尺。', tags: ['DSG', '工具', '挖掘'], source },
  { id: 'dsg-grappling-hook', nameZh: '抓钩', nameEn: 'Grappling Hook', category: '攀爬用品', price: '75 gp', weight: '75 gp', description: '通常系在绳上，用于钩住突出物、固定攀爬路线或建立保护点。', tags: ['DSG', '攀爬', '绳索'], source },
  { id: 'dsg-waterproof-lantern', nameZh: '防水提灯', nameEn: 'Waterproof Lantern', category: '地下探险用品', price: '50 gp', weight: '50 gp', description: '正常照明半径 30 英尺，水下缩为 10 英尺；浸没时秘密掷骰决定剩余燃烧轮数。', tags: ['DSG', '光照', '水下'], source },
  { id: 'dsg-lard', nameZh: '猪油', nameEn: 'Lard', category: '消耗品', price: '5 cp/品脱', weight: '20 gp', description: '可使角色通过最低尺寸 80% 宽的通道；受火焰攻击时每轮额外受 2 点伤害，持续 1d6 轮，也可作寒冷水域隔热层。', tags: ['DSG', '消耗品', '寒冷'], source },
  { id: 'dsg-waterproof-oil', nameZh: '防水油', nameEn: 'Waterproof Oil', category: '消耗品', price: '1 gp/品脱', weight: '20 gp', description: '一品脱可涂两平方码皮革或羊毛；淋雨时防水 1d6+6 轮，浸水时防水 1d6 轮。', tags: ['DSG', '消耗品', '防水'], source },
  { id: 'dsg-pickaxe', nameZh: '鹤嘴锄', nameEn: 'Pickaxe', category: '工具/武器', price: '20 gp', weight: '200 gp', damageSmallMedium: '1d10', damageLarge: '1d20', description: '矿工必需品；没有鹤嘴锄时挖掘效率减半，作为武器攻击 -2。', tags: ['DSG', '工具', '挖掘', '武器'], source },
  { id: 'dsg-chalk-dust', nameZh: '粉笔粉', nameEn: 'Chalk Dust', category: '地下探险用品', price: '2 sp', weight: '20 gp', description: '可覆盖 20×20 英尺地面或八名人形生物；撒地留痕，抛向空中或墙面可显出隐形生物轮廓。', tags: ['DSG', '侦测', '隐形'], source },
  { id: 'dsg-pulley', nameZh: '滑轮', nameEn: 'Pulley', category: '工具', price: '25 gp', weight: '60 gp', description: '单个可改变受力方向；成对使用时可使可提升重量加倍、四倍或六倍，取决于绳组。', tags: ['DSG', '工具', '攀爬'], source },
  { id: 'dsg-hollow-reed', nameZh: '空心芦苇', nameEn: 'Hollow Reed', category: '水下用品', price: '1 sp', weight: '1 cp', description: '插入口中并封住鼻孔后可让角色仰卧在水下呼吸；倒置姿势移动速度最多为正常游泳速度的三分之一。', tags: ['DSG', '呼吸', '水下'], source },
  { id: 'dsg-shovel', nameZh: '铁锹', nameEn: 'Shovel', category: '工具', price: '10 gp', weight: '180 gp', description: '采矿和挖掘工具；没有铁锹时，每日挖掘量减半。', tags: ['DSG', '工具', '挖掘'], source },
  { id: 'dsg-whistle', nameZh: '哨子', nameEn: 'Whistle', category: '信号用品', price: '1 sp', weight: '1 cp', description: '可由木、骨或芦苇制成，声音可传到 1000 英尺。', tags: ['DSG', '信号'], source },
  { id: 'dsg-folding-boat', nameZh: '折叠船', nameEn: 'Folding Boat', category: '交通工具', price: '500 gp', weight: '600 gp', description: '皮革船壳和折叠木骨架，收起后可装入背包；1d3 回合展开为小划艇。', tags: ['DSG', '交通工具', '水上'], source },
  { id: 'dsg-small-canoe', nameZh: '小独木舟', nameEn: 'Small Canoe', category: '交通工具', price: '100 gp', weight: '800 gp', description: '可载 3 名正常装备或 2 名重装备角色，轻载时易划且灵活。', tags: ['DSG', '交通工具', '水上'], source },
  { id: 'dsg-large-canoe', nameZh: '大独木舟', nameEn: 'Large Canoe', category: '交通工具', price: '300 gp', weight: '1600 gp', description: '可载 9 名正常装备或 6 名重装备角色；比小独木舟稳定但仍可能倾覆。', tags: ['DSG', '交通工具', '水上'], source },
  { id: 'dsg-kayak', nameZh: '皮艇', nameEn: 'Kayak', category: '交通工具', price: '250 gp', weight: '500 gp', description: '单人油布包骨架船，适合急流和冷水；倾覆后不会立即进水。', tags: ['DSG', '交通工具', '水上'], source }
];
