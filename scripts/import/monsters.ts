import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import type { Monster } from '../../src/schemas';

const sourceRoot = resolve('../manuscript/mm/topics');
const clean = (value: string) => value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const monsters: Monster[] = [];
const skipped: string[] = [];

for (const file of readdirSync(sourceRoot).filter((name) => name.endsWith('.md')).sort()) {
  const raw = readFileSync(resolve(sourceRoot, file), 'utf8');
  const heading = raw.match(/^#\s+(.+)$/m)?.[1] ?? '';
  const englishMatch = heading.match(/[A-Z][A-Za-z ,()'’/-]+/);
  const english = englishMatch?.[0]?.trim() ?? '';
  const chinese = englishMatch ? heading.slice(0, englishMatch.index).trim() : '';
  const stats = new Map<string, string>();
  for (const row of raw.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)) stats.set(row[1].trim(), clean(row[2]));
  const acText = stats.get('护甲等级') ?? '';
  const ac = Number(acText.replace(/−/g, '-').match(/-?\d+/)?.[0]);
  if (!chinese || !english || !Number.isFinite(ac) || !stats.has('生命骰')) { skipped.push(file); continue; }
  const table = raw.match(/^\| 项目 \| 数据 \|[\s\S]*?(?=\r?\n\r?\n)/m)?.[0] ?? '';
  const afterTable = table ? raw.slice(raw.indexOf(table) + table.length) : raw.slice(raw.indexOf('\n\n') + 2);
  const description = clean(afterTable).slice(0, 5500);
  const id = basename(file, '.md');
  monsters.push({
    id, nameZh: chinese, nameEn: english,
    frequency: stats.get('出现频率') ?? '未记载', numberAppearing: stats.get('出现数量') ?? '未记载',
    armorClass: ac, armorClassText: acText,
    movement: stats.get('移动力') ?? '未记载', hitDice: stats.get('生命骰') ?? '未记载',
    inLair: stats.get('在巢穴概率') ?? '未记载', treasureType: stats.get('财宝类型') ?? '未记载',
    attacks: stats.get('攻击次数') ?? '未记载', damage: stats.get('攻击伤害') ?? '未记载',
    specialAttacks: stats.get('特殊攻击') ?? '未记载', specialDefenses: stats.get('特殊防御') ?? '未记载',
    magicResistance: stats.get('魔法抗力') ?? '未记载', intelligence: stats.get('智力') ?? '未记载',
    alignment: stats.get('阵营') ?? '未记载', size: stats.get('体型') ?? '未记载',
    psionics: stats.get('灵能能力') ?? '未记载', environment: '原条目未单列',
    description, source: [{ book: 'MM', section: english }]
  });
}

writeFileSync(resolve('src/data/public/monsters-imported.json'), `${JSON.stringify(monsters, null, 2)}\n`);
console.log(`Imported ${monsters.length} MM monster records. Skipped ${skipped.length} non-stat entries.`);
if (skipped.length) console.log(skipped.join(', '));
