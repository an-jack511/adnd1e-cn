const labels: Record<string, string> = {
  human: '人类', dwarf: '矮人', elf: '精灵', gnome: '侏儒', 'half-elf': '半精灵', halfling: '半身人', 'half-orc': '半兽人',
  'hill-dwarf': '丘陵矮人', 'mountain-dwarf': '山地矮人', 'high-elf': '高等精灵', hairfoot: '毛脚半身人', tallfellow: '高个半身人', stout: '敦实半身人',
  cleric: '牧师', druid: '德鲁伊', fighter: '战士', paladin: '圣武士', ranger: '游侠', 'magic-user': '魔法师', illusionist: '幻术师', thief: '盗贼', assassin: '刺客', monk: '武僧', bard: '吟游诗人',
  LG: '守序善良', NG: '中立善良', CG: '混乱善良', LN: '守序中立', TN: '绝对中立', CN: '混乱中立', LE: '守序邪恶', NE: '中立邪恶', CE: '混乱邪恶',
  pending: '待完成', complete: '已记录', 'not-applicable': '不适用', 'needs-dm': '待补充', selection: '待选择', incomplete: '未完成', 'ready-for-review': '已准备好', admitted: '已建立', blocked: '被阻断',
  hp: '生命值', money: '起始金钱', languages: '语言', proficiencies: '武器熟练', equipment: '装备', 'initial-spells': '初始法术', psionics: '灵能', 'admission-context': '战役信息',
  STR: '力量', INT: '智力', WIS: '智慧', DEX: '敏捷', CON: '体质', CHA: '魅力',
  common: '通用语', dwarvish: '矮人语', elvish: '精灵语', gnomish: '侏儒语', orcish: '兽人语', goblin: '哥布林语',
  kobold: '狗头人语', hobgoblin: '熊地精语', gnoll: '豺狼人语',
  'alignment:lawful-good': '守序善良阵营语', 'alignment:lawful-neutral': '守序中立阵营语', 'alignment:lawful-evil': '守序邪恶阵营语',
  'alignment:neutral-good': '中立善良阵营语', 'alignment:neutrality': '绝对中立阵营语', 'alignment:neutral-evil': '中立邪恶阵营语',
  'alignment:chaotic-good': '混乱善良阵营语', 'alignment:chaotic-neutral': '混乱中立阵营语', 'alignment:chaotic-evil': '混乱邪恶阵营语',
  druidic: '德鲁伊语', 'thieves-cant': '盗贼黑话',
  centaur: '半人马语', dryad: '树精语', faun: '牧神语', 'green-dragon': '绿龙语', 'hill-giant': '丘陵巨人语',
  lizardman: '蜥蜴人语', manticore: '蝎尾狮语', nixie: '尼克希语', pixie: '皮克精语', sprite: '精灵妖语', treantish: '树人语',
  'communicate:burrowing-mammals': '与穴居哺乳动物交流',
  'needs-rest': '需要休息', 'needs-study-or-prayer': '需要学习或祈祷', checking: '检查中', planned: '已计划', completed: '已完成',
  'physical-or-external': '桌上实体骰或外部骰器', 'browser-crypto': '浏览器随机骰',
};

export function characterLabel(value: string): string { return labels[value] ?? value; }
export function taskLabel(value: string): string { return labels[value] ?? value; }
export function languageLabel(value: string): string { return labels[value] ?? '其他语言（手动记录）'; }

/**
 * Printed equipment facts stay in their source form in the rules package.
 * Player-facing surfaces must use this display layer instead of leaking the
 * English catalog names into the creation and campaign workflows.
 */
const equipmentLabels: Record<string, string> = {
  Banded: '带甲', Chain: '链甲', 'Helmet, great': '大型头盔', 'Helmet, small': '小型头盔', Leather: '皮甲', Padded: '软垫甲', Plate: '板甲', Ring: '环甲', Scale: '鳞甲',
  'Shield, large': '大型盾牌', 'Shield, small': '小型盾牌', 'Shield, small, wooden': '小型木盾', Splinted: '条板甲', Studded: '镶钉皮甲',
  'Arrow, normal, single': '普通箭（单支）', 'Arrow, normal, dozen': '普通箭（一打）', 'Arrow, silver, single': '银箭（单支）', 'Axe, battle': '战斧', 'Axe, hand or throwing': '手斧或投掷斧',
  Bardiche: '长柄战斧', 'Bec de corbin': '鸦嘴斧', 'Bill-Guisarme': '钩镰枪', 'Bow, composite short': '复合短弓', 'Bow, composite, long': '复合长弓', 'Bow, long': '长弓', 'Bow, short': '短弓',
  'Crossbow, heavy': '重弩', 'Crossbow, light': '轻弩', 'Dagger and scabbard': '匕首及鞘', Dart: '飞镖', Fauchard: '钩镰', 'Fauchard-Fork': '叉形钩镰', "Flail, footman's": '步兵链枷', "Flail, horseman's": '骑兵链枷', 'Fork, Military': '军用叉',
  Glaive: '长柄刀', 'Glaive-Guisarme': '钩镰长柄刀', Guisarme: '钩镰', 'Guisarme-Voulge': '钩镰戟', Halberd: '戟', 'Hammer, Lucern': '鹿角锤', Hammer: '战锤', Javelin: '标枪', Lance: '骑枪', "Mace, footman's": '步兵锤', "Mace, horseman's": '骑兵锤', 'Morning Star': '晨星', Partisan: '党卫枪',
  "Pick, Military, footman's": '步兵军镐', "Pick, Military, horseman's": '骑兵军镐', 'Pike, awl': '锥枪', 'Quarrel (or Bolt), light, single': '轻弩矢（单支）', 'Quarrel (or Bolt), heavy, score': '重弩矢（二十支）', Ranseur: '三叉枪', Scimitar: '弯刀', 'Sling & Bullets, dozen': '投石索及一打石弹', 'Sling Bullets, score': '石弹（二十枚）', Spear: '矛', Spetum: '三叉矛', 'Sword, bastard, & scabbard': '混种剑及鞘', 'Sword, broad, & scabbard': '阔剑及鞘', 'Sword, long & scabbard': '长剑及鞘', 'Sword, short & scabbard': '短剑及鞘', 'Sword, two-handed': '双手剑', Trident: '三叉戟', Voulge: '戟刀',
  Belt: '腰带', 'Boots, high, hard': '高筒硬靴', 'Boots, high, soft': '高筒软靴', 'Boots, low, hard': '低筒硬靴', 'Boots, low, soft': '低筒软靴', Cap: '便帽', Cloak: '斗篷', 'Girdle, broad': '宽腰带', 'Girdle, normal': '普通腰带', Hat: '帽子', Robe: '长袍', 'Belladonna, sprig': '颠茄枝', 'Garlic, bud': '蒜头', 'Wolvesbane, sprig': '附子枝',
  Chicken: '鸡', Cow: '牛', 'Dog, guard': '护卫犬', 'Dog, hunting': '猎犬', Donkey: '驴', Goat: '山羊', 'Hawk, large': '大鹰', 'Hawk, small': '小鹰', 'Horse, draft': '挽马', 'Horse, heavy war': '重型战马', 'Horse, light war': '轻型战马', 'Horse, medium war': '中型战马', 'Horse, riding (light)': '轻型骑乘马', Mule: '骡', Ox: '牛（役畜）', Pigeon: '鸽子', Piglet: '小猪', Pig: '猪', Pony: '小马', Sheep: '绵羊', Songbird: '鸣禽',
  'Backpack, leather': '皮革背包', 'Box, iron, large': '大型铁箱', 'Box, iron, small': '小型铁箱', 'Candle, tallow': '兽脂蜡烛', 'Candle, wax': '蜡烛', 'Case, bone, map or scroll': '骨制地图或卷轴筒', 'Case, leather, map or scroll': '皮革地图或卷轴筒', 'Chest, wooden, large': '大型木箱', 'Chest, wooden, small': '小型木箱', 'Lantern, bullseye': '牛眼灯', 'Lantern, hooded': '罩灯', 'Mirror, large metal': '大型金属镜', 'Mirror, small, silver': '小型银镜', 'Oil, flask of': '一瓶油', "Pole, 10'": '十英尺长杆', 'Pouch, belt, large': '大型腰包', 'Pouch, belt, small': '小型腰包', 'Quiver, 1 doz. arrows cap.': '箭袋（容纳一打箭）', 'Quiver, 1 score arrows cap.': '箭袋（容纳二十支箭）', 'Quiver, 1 score bolts cap.': '弩矢袋（容纳二十支）', 'Quiver, 2 score bolts cap.': '弩矢袋（容纳四十支）', "Rope, 50'": '五十英尺绳', 'Sack, large': '大袋', 'Sack, small': '小袋', 'Skin for water or wine': '水袋或酒囊', 'Spike, iron, large': '大型铁钉', "Thieves' picks & tools": '盗贼工具', 'Tinder Box, with flint & steel': '火绒盒（含燧石与钢片）', Torch: '火把',
  'Ale, pint': '麦芽酒（一品脱）', 'Beer, small, pint': '淡啤酒（一品脱）', "Food, merchant's meal": '普通餐', 'Food, rich meal': '丰盛餐', 'Grain, horse meal, 1 day': '马粮（一日份）', 'Mead, pint': '蜂蜜酒（一品脱）', 'Rations, iron, 1 week': '硬饼干口粮（一周）', 'Rations, standard, 1 week': '普通口粮（一周）', 'Wine, pint, good': '上等葡萄酒（一品脱）', 'Wine, pint, watered': '兑水葡萄酒（一品脱）',
  'Beads, Prayer': '祈祷珠', 'Incense, stick': '香（一支）', 'Symbol, Holy or Unholy, iron': '铁制圣徽或邪徽', 'Symbol, Holy or Unholy, silver': '银制圣徽或邪徽', 'Symbol, Holy or Unholy, wooden': '木制圣徽或邪徽', 'Water, Holy or Unholy, vial': '圣水或邪水（一瓶）',
  'Barding, chain': '链甲马铠', 'Barding, leather': '皮甲马铠', 'Barding, plate': '板甲马铠', 'Bit and Bridle': '马衔与马缰', Harness: '挽具', Saddle: '马鞍', 'Saddle Bags, large': '大型鞍囊', 'Saddle Bags, small': '小型鞍囊', 'Saddle Blanket': '鞍毯',
  'Barge (or Raft), small': '小型驳船或木筏', 'Boat, small': '小船', 'Boat, long': '长船', Cart: '马车', 'Galley, large': '大型桨帆船', 'Galley, small': '小型桨帆船', 'Ship, merchant, large': '大型商船', 'Ship, merchant, small': '小型商船', 'Ship, war': '战船', Wagon: '货车',
};

export function equipmentLabel(value: string, definitionId?: string): string {
  return (value && equipmentLabels[value]) || value;
}

export function equipmentUnitLabel(value: string): string {
  return ({one:'件', dozen:'一打', score:'二十件', 'sling-and-dozen-bullets':'投石索及一打石弹'} as Record<string,string>)[value] ?? value;
}

const sourceSections: Record<string, string> = {
  'Attack Matrices I.A–I.D.1': '攻击矩阵 I.A–I.D.1',
  'Saving Throw Matrix for Characters and Human Types': '人物与人类类型的豁免矩阵',
  'Dexterity Table I and defensive adjustment notes': '敏捷表 I 与防御调整说明',
  'Armor; Armor Class Table; shield limits': '护甲、护甲等级表与盾牌限制',
  'The Monk; Monks Table II': '武僧；武僧表 II',
  'The Thief; Thief Function Table': '盗贼；盗贼技能表',
  'Dexterity Table II: Adjustments For Thieves': '敏捷表 II：盗贼调整',
  'The Thief': '盗贼职业',
  'The Assassin': '刺客职业',
  'The Monk': '武僧职业',
};

export function sourceSectionLabel(value: string): string {
  return sourceSections[value] ?? value;
}
