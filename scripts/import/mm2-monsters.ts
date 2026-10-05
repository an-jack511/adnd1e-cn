import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Monster } from '../../src/schemas';

const sourceRoot = resolve('../manuscript/mm2/topics');
const clean = (value: string) => value
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/\*\*/g, '')
  .replace(/`/g, '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const field = (stats: Map<string, string>, prefix: string) => {
  const entry = [...stats.entries()].find(([key]) => key.startsWith(prefix));
  return entry?.[1] ?? '未记载';
};
const slugify = (value: string) => value.toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const monsters: Monster[] = [];
const skipped: string[] = [];

function importBlock(raw: string, heading: string, sourceFile: string) {
  const englishMatch = heading.match(/[A-Z][A-Za-z0-9 ,()'’/-]*$/);
  if (!englishMatch) return;
  const nameEn = englishMatch[0].trim();
  const nameZh = heading.slice(0, englishMatch.index).replace(/[（）()、，,：:]+$/g, '').trim() || nameEn;
  if (/插图|遭遇表|后记|索引/.test(nameZh)) return;
  const stats = new Map<string, string>();
  for (const row of raw.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)) stats.set(row[1].trim(), clean(row[2]));
  if (!stats.has('生命骰') && !stats.has('生命骰 Hit Dice')) return;
  const armorText = field(stats, '护甲等级');
  const armorClass = Number(armorText.replace(/[−–]/g, '-').match(/-?\d+/)?.[0]);
  const normalizedArmorClass = Number.isFinite(armorClass) ? armorClass : 0;
  const firstTable = raw.search(/^\|\s*项目\s*\|/m);
  const afterTable = firstTable >= 0 ? raw.slice(raw.indexOf('\n', firstTable) + 1).replace(/^(?:\|[^\n]*\n)+/m, '') : raw;
  monsters.push({
    id: `mm2-${slugify(nameEn)}`,
    nameZh,
    nameEn,
    frequency: field(stats, '出现频率'),
    numberAppearing: field(stats, '出现数量'),
    armorClass: normalizedArmorClass,
    armorClassText: armorText,
    movement: field(stats, '移动'),
    hitDice: field(stats, '生命骰'),
    inLair: field(stats, '巢穴概率'),
    treasureType: field(stats, '宝藏类型'),
    attacks: field(stats, '攻击次数'),
    damage: field(stats, '每次伤害'),
    specialAttacks: field(stats, '特殊攻击'),
    specialDefenses: field(stats, '特殊防御'),
    magicResistance: field(stats, '魔法抗性'),
    intelligence: field(stats, '智力'),
    alignment: field(stats, '阵营'),
    size: field(stats, '体型'),
    psionics: field(stats, '灵能能力'),
    environment: '原条目未单列',
    description: clean(afterTable).slice(0, 5500),
    source: [{ book: 'MM2', section: nameEn }]
  });
}

for (const file of readdirSync(sourceRoot).filter((name) => name.endsWith('.md')).sort()) {
  const raw = readFileSync(resolve(sourceRoot, file), 'utf8');
  const blocks = [...raw.matchAll(/^(#{1,2})\s+(.+)$/gm)];
  for (let index = 0; index < blocks.length; index++) {
    const heading = blocks[index][2].trim();
    const start = blocks[index].index!;
    const end = blocks[index + 1]?.index ?? raw.length;
    importBlock(raw.slice(start, end), heading, basename(file));
  }
}

writeFileSync(resolve('src/data/public/mm2-monsters-imported.json'), `${JSON.stringify(monsters, null, 2)}\n`);
console.log(`Imported ${monsters.length} MM2 monster records. Skipped ${skipped.length} malformed stat blocks.`);
if (skipped.length) console.log(skipped.join(', '));


