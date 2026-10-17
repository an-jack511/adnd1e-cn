const labels: Record<string, string> = {
  human: '人类', dwarf: '矮人', elf: '精灵', gnome: '侏儒', 'half-elf': '半精灵', halfling: '半身人', 'half-orc': '半兽人',
  'hill-dwarf': '丘陵矮人', 'mountain-dwarf': '山地矮人', 'high-elf': '高等精灵', hairfoot: '毛脚半身人', tallfellow: '高个半身人', stout: '敦实半身人',
  cleric: '牧师', druid: '德鲁伊', fighter: '战士', paladin: '圣武士', ranger: '游侠', 'magic-user': '魔法师', illusionist: '幻术师', thief: '盗贼', assassin: '刺客', monk: '武僧', bard: '吟游诗人',
  LG: '守序善良', NG: '中立善良', CG: '混乱善良', LN: '守序中立', TN: '绝对中立', CN: '混乱中立', LE: '守序邪恶', NE: '中立邪恶', CE: '混乱邪恶',
  pending: '待完成', complete: '已记录', 'not-applicable': '不适用', 'needs-dm': '待补充', selection: '待选择', incomplete: '未完成', 'ready-for-review': '已准备好', admitted: '已建立', blocked: '被阻断',
  hp: '生命值', money: '起始金钱', languages: '语言', proficiencies: '武器熟练', equipment: '装备', 'initial-spells': '初始法术', psionics: '灵能', 'admission-context': '战役信息',
  STR: '力量', INT: '智力', WIS: '智慧', DEX: '敏捷', CON: '体质', CHA: '魅力',
  common: '通用语', dwarvish: '矮人语', elvish: '精灵语', gnomish: '侏儒语', orcish: '兽人语', goblin: '哥布林语', neutral: '中立通用语',
};

export function characterLabel(value: string): string { return labels[value] ?? value; }
export function taskLabel(value: string): string { return labels[value] ?? value; }
