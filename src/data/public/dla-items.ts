import type { Item } from '../../schemas';

const source = (page: number, section: string) => [{ book: 'DLA', page, section }];

export const dlaItems: Item[] = [
  { id: 'dla-istar-truth', nameZh: 'Istar 的真相', nameEn: "Istar's Truth", category: '魔法物品', price: '未列', weight: '未列', description: '迫使服用者如实回答 2d4 个是非问题和 1d4 个较长问题；目标可对药水作承受 -5 罚值的豁免。', tags: ['魔法', '药水', '审问'], source: source(91, "Istar's Truth") },
  { id: 'dla-staff-striking-curing', nameZh: '打击／治疗法杖', nameEn: 'Staff of Striking/Curing', category: '魔法物品', price: '未列', weight: '未列', description: '阳光下每日恢复 5 点充能，最多 50 点；可作为 +3 武器打击，也可消耗充能进行治疗。', tags: ['魔法', '法杖', '治疗'], source: source(91, 'Staff of Striking/Curing') },
  { id: 'dla-brooch-imog', nameZh: 'Imog 的胸针', nameEn: 'Brooch of Imog', category: '魔法物品', price: '未列', weight: '未列', description: '熟知命令词的魔法使用者每日一次创造次级无敌法球，持续 10 轮。', tags: ['魔法', '胸针', '防护'], source: source(92, 'Brooch of Imog') },
  { id: 'dla-dragonarmor', nameZh: '龙甲', nameEn: 'Dragonarmor', category: '魔法物品', price: '未列', weight: '未列', description: '克莱恩特有的龙制护甲；完整防护、佩戴限制与龙金属规则见原书条目。', tags: ['魔法', '护甲', '龙'], source: source(93, 'Dragonarmor') },
  { id: 'dla-plate-solamnus', nameZh: 'Solamnus 的板甲', nameEn: 'The Plate of Solamnus', category: '魔法物品', price: '未列', weight: '未列', description: '索拉姆尼亚传奇板甲，关联骑士团的荣誉与防护。', tags: ['魔法', '护甲', '索拉姆尼亚'], source: source(93, 'The Plate of Solamnus') },
  { id: 'dla-shield-huma', nameZh: 'Huma 之盾', nameEn: 'Shield of Huma', category: '魔法物品', price: '未列', weight: '未列', description: '与 Huma 传说和龙枪战争相连的传奇盾牌；具体防护和使用条件见原书条目。', tags: ['魔法', '盾牌', '龙枪'], source: source(93, 'Shield of Huma') },
  { id: 'dla-dragonlance', nameZh: '龙枪', nameEn: 'Dragonlance', category: '魔法武器', price: '未列', weight: '未列', description: '用于对抗巨龙的传奇武器；龙枪的锻造需要 Kharas 之锤、Ergoth 银臂和纯龙金属。', tags: ['魔法', '武器', '龙'], source: source(94, 'Dragonlance') },
  { id: 'dla-frostreaver', nameZh: '冰裂斧', nameEn: 'Frostreaver', category: '魔法武器', price: '未列', weight: '未列', description: '克莱恩特有的传奇斧类武器，拥有冰霜相关力量。', tags: ['魔法', '武器', '寒冷'], source: source(94, 'Frostreaver') },
  { id: 'dla-icon-truth', nameZh: '真理圣徽', nameEn: 'Icon of Truth', category: '魔法物品', price: '未列', weight: '未列', description: '克莱恩特殊圣徽，用于揭示真相并与神圣力量相连。', tags: ['魔法', '圣徽', '真相'], source: source(95, 'Icon of Truth') },
  { id: 'dla-orb-dragonkind', nameZh: '屠龙宝珠', nameEn: 'Orb of Dragonkind', category: '神器', price: '未列', weight: '未列', description: '可召来附近邪恶巨龙，也会魅惑凝视它的角色；同时拥有治疗、持续光明和侦测魔法能力。', tags: ['神器', '龙', '魅惑'], source: source(95, 'Orb of Dragonkind') },
  { id: 'dla-hammer-kharas', nameZh: 'Kharas 之锤', nameEn: 'Hammer of Kharas', category: '神器', price: '未列', weight: '未列', description: '锻造龙枪所需的神器；攻击加值 +2，对亡灵和深渊生物如破坏权杖，并拥有多项自主启动的能力。', tags: ['神器', '武器', '矮人', '龙枪'], source: source(96, 'Hammer of Kharas') },
  { id: 'dla-silver-arm-ergoth', nameZh: 'Ergoth 银臂', nameEn: 'Silver Arm of Ergoth', category: '神器', price: '未列', weight: '未列', description: '只能与力量至少 17 的善良无右臂人类接合；如再生戒指般提供再生，并参与完美龙枪的锻造。', tags: ['神器', '龙枪', '再生'], source: source(96, 'Silver Arm of Ergoth') },
  { id: 'dla-staff-magius', nameZh: 'Magius 之杖', nameEn: 'Staff of Magius', category: '神器', price: '未列', weight: '未列', description: '只能由魔法使用者使用；如 +3 防护戒指并以 +2 魔法武器攻击，能施展羽落术和持续光明术，并强化高等级施法。', tags: ['神器', '法杖', '魔法师'], source: source(97, 'Staff of Magius') },
  { id: 'dla-bloodstone-fistandantilus', nameZh: 'Fistandantilus 的血石', nameEn: 'Bloodstone of Fistandantilus', category: '神器', price: '未列', weight: '未列', description: '邪恶神器，可吸取受害者生命、智慧与记忆；使用者必须在阵营追踪表上向邪恶移动至少 10 格。', tags: ['神器', '邪恶', '生命吸取'], source: source(97, 'Bloodstone of Fistandantilus') },
  { id: 'dla-device-time-journeying', nameZh: '时空旅行装置', nameEn: 'Device of Time Journeying', category: '神器', price: '未列', weight: '未列', description: '可把使用者附近的角色送往所需时间或地点之一；装置会自行回到主人身边。', tags: ['神器', '时间', '传送'], source: source(97, 'Device of Time Journeying') },
  { id: 'dla-nightjewel', nameZh: '夜明珠', nameEn: 'The Nightjewel', category: '魔法物品', price: '未列', weight: '未列', description: '进入 Shoikan 林地时修正队伍的恐惧检定，并能在不拔武器、不施法的条件下保护队伍免受林地不死生物攻击。', tags: ['魔法', '防护', '不死者'], source: source(98, 'The Nightjewel') },
  { id: 'dla-rabbitslayer', nameZh: '兔杀者', nameEn: "Rabbitslayer, Tasslehoff's Knife", category: '魔法武器', price: '未列', weight: '未列', description: '攻击与伤害均为 +4，造成 1d4+4 点伤害；遗失或被盗后会在 1d20 小时内回到肯德身边。', tags: ['魔法', '匕首', '肯德'], source: source(99, "Rabbitslayer, Tasslehoff's Knife") }
];
