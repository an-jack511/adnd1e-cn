import type { ClassEntry, Item, RaceEntry } from '../schemas';
import abilityTables from '../data/public/ability-tables.json';

export type Ability = 'STR' | 'INT' | 'WIS' | 'DEX' | 'CON' | 'CHA';
export type RuleIssue = { code: string; message: string; source: string };
export type EligibilityInput = { raceId: string; classId: string; alignment: string; abilities: Partial<Record<Ability, string>> };
export type RuleResult<T> = { value: T; components: { label: string; value: number; source: string }[]; notes: string[] };
const alignmentRules: Record<string, (alignment: string) => boolean> = {
  paladin: (value) => value === 'LG', druid: (value) => value === 'TN', ranger: (value) => value.endsWith('G'),
  assassin: (value) => value.endsWith('E'), monk: (value) => value.startsWith('L'), cleric: (value) => value !== 'TN',
  bard: (value) => value.includes('N'), thief: (value) => value.includes('N') || value.endsWith('E')
};
const abilityNumber = (value: string | undefined) => Number.parseInt(value ?? '', 10);
export function checkEligibility(input: EligibilityInput, classes: ClassEntry[], races: RaceEntry[]): RuleIssue[] {
  const chosenClass = classes.find((entry) => entry.id === input.classId);
  const race = races.find((entry) => entry.id === input.raceId);
  if (!chosenClass) return [];
  const issues: RuleIssue[] = [];
  if (race && !chosenClass.eligibleRaces.includes(race.id)) issues.push({ code: 'race-class', message: `${race.nameZh}不能以玩家角色身份选择${chosenClass.nameZh}`, source: 'PHB 种族表 I' });
  for (const [ability, minimum] of Object.entries(chosenClass.minimumAbilities)) {
    const actual = abilityNumber(input.abilities[ability as Ability]);
    if (Number.isFinite(actual) && actual < minimum) issues.push({ code: `ability-${ability}`, message: `${chosenClass.nameZh}要求 ${ability} ≥ ${minimum}；当前为 ${actual}`, source: `PHB ${chosenClass.nameEn}` });
  }
  if (input.alignment && alignmentRules[chosenClass.id] && !alignmentRules[chosenClass.id](input.alignment)) issues.push({ code: 'alignment', message: `${chosenClass.nameZh}不允许所选阵营`, source: `PHB ${chosenClass.nameEn}` });
  return issues;
}

const armorBase: Record<string, number> = { '皮甲': 8, '衬甲': 8, '镶嵌皮甲': 7, '环甲': 7, '鳞甲': 6, '链甲': 5, '板条甲': 4, '带甲': 4, '板甲': 3 };
const dexRows = abilityTables.DEX.rows;
export function computeArmorClass(armor: Item | undefined, shield: Item | undefined, dexterity: string, manualModifier = 0): RuleResult<number> {
  const base = armor ? armorBase[armor.nameZh] : 10;
  const safeBase = base ?? 10;
  const dex = Number(dexterity);
  const dexRow = dexRows.find((row) => Number(row[0]) === dex);
  const dexModifier = dexRow ? Number(dexRow[2]) : 0;
  const components = [{ label: armor ? armor.nameZh : '无甲', value: safeBase, source: 'PHB 护甲等级表' }];
  if (shield) components.push({ label: shield.nameZh, value: -1, source: 'PHB 盾牌：正面且有效时' });
  if (dexRow && dexModifier) components.push({ label: `DEX ${dex}`, value: dexModifier, source: 'PHB 敏捷表 I' });
  if (manualModifier) components.push({ label: 'DM 手动调整', value: manualModifier, source: 'DM 裁定' });
  return { value: components.reduce((sum, part, index) => index ? sum + part.value : part.value, 0), components,
    notes: [shield ? '盾牌仅在有效方向、每轮可防护的攻击次数内计入。' : '', armor && base === undefined ? `${armor.nameZh}没有核对到 PHB 基础 AC，暂按无甲计算。` : ''].filter(Boolean) };
}

export function weightPounds(item: Item): number | undefined {
  const lb = item.weight.match(/^([\d.]+) 磅/);
  if (lb) return Number(lb[1]);
  const gp = item.weight.match(/^([\d.]+) 金币重量/);
  return gp ? Number(gp[1]) / 10 : undefined;
}
export function computeEncumbrance(entries: { item: Item; quantity: number }[]): RuleResult<number> & { unknown: string[]; movement: string } {
  const components: RuleResult<number>['components'] = [];
  const unknown: string[] = [];
  for (const { item, quantity } of entries) {
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const weight = weightPounds(item);
    if (weight === undefined) unknown.push(item.nameZh);
    else components.push({ label: `${item.nameZh} × ${quantity}`, value: weight * quantity, source: item.source.map((entry) => entry.book).join('、') });
  }
  const value = components.reduce((sum, part) => sum + part.value, 0);
  const movement = value <= 35 ? '通常 12 寸' : value <= 70 ? '通常 9 寸' : value <= 105 ? '通常 6 寸' : '通常 3 寸';
  return { value, components, unknown, movement, notes: ['PHB 四档负重是概略指引；力量、体积、坐骑与魔法装备可能改变结论。', ...(unknown.length ? ['有物品未列重量，当前总重为已知部分下限。'] : [])] };
}

export function checkEquipment(classId: string, weapon: Item | undefined, armor: Item | undefined, shield: Item | undefined): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (['magic-user', 'illusionist', 'monk'].includes(classId) && (armor || shield)) issues.push({ code: 'armor', message: '当前职业不能穿戴所选护甲或盾牌', source: 'PHB 职业装备限制' });
  if (['thief', 'assassin'].includes(classId) && armor && !['皮甲', '衬甲'].includes(armor.nameZh)) issues.push({ code: 'armor', message: '当前职业不能穿戴所选护甲', source: 'PHB 职业装备限制' });
  if (classId === 'thief' && shield) issues.push({ code: 'shield', message: '盗贼不能使用盾牌', source: 'PHB Thief' });
  if (classId === 'druid' && armor && !['皮甲', '衬甲'].includes(armor.nameZh)) issues.push({ code: 'armor', message: '德鲁伊不能穿戴所选金属护甲', source: 'PHB Druid' });
  if (classId === 'druid' && shield && !/木/.test(shield.nameZh)) issues.push({ code: 'shield', message: '德鲁伊应使用木盾', source: 'PHB Druid' });
  const name = weapon?.nameZh.replace(/与鞘$/, '') ?? '';
  if (weapon && ['magic-user', 'illusionist'].includes(classId) && !['匕首', '飞镖', '长杖'].some((part) => name.includes(part))) issues.push({ code: 'weapon', message: `${classId === 'magic-user' ? '魔法师' : '幻术师'}不能使用${name}`, source: 'PHB 职业武器限制' });
  if (weapon && classId === 'cleric' && !['棍棒', '连枷', '锤', '钉头锤', '长杖'].some((part) => name.includes(part))) issues.push({ code: 'weapon', message: `牧师不能使用${name}`, source: 'PHB Cleric' });
  return issues;
}
