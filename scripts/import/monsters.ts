import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import type { Monster } from '../../src/schemas';
import { splitMenManuscript } from './mm-sections';

const sourceRoot = resolve('../manuscript/mm/topics');
const assetRoot = resolve('../assets');
const publicMonsterRoot = resolve('public/assets/monsters/mm');
mkdirSync(publicMonsterRoot, { recursive: true });
const clean = (value: string) => value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const monsters: Monster[] = [];
const skipped: string[] = [];
const retranslationId = (file: string) => {
  let stem = basename(file, '.md').replace(/-retranslation$/, '');
  if (stem === 'giant-turtle') return 'turtle';
  if (stem === 'portuguese-man-o-war') return 'portuguese-man-o-war-giant';
  if (stem.startsWith('giant-')) stem = `${stem.slice('giant-'.length)}-giant`;
  return stem;
};

function importRecord(raw: string, id: string) {
  const heading = raw.match(/^#\s+(.+)$/m)?.[1] ?? '';
  const englishMatch = heading.match(/[A-Z][A-Za-z0-9 ,()'’/-]+/);
  const english = englishMatch?.[0]?.trim() ?? '';
  const chinese = englishMatch ? heading.slice(0, englishMatch.index).trim() : '';
  const stats = new Map<string, string>();
  for (const row of raw.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)) stats.set(row[1].trim(), clean(row[2]));
  const acText = stats.get('护甲等级') ?? '';
  const ac = Number(acText.replace(/−/g, '-').match(/-?\d+/)?.[0]);
  if (!chinese || !english || !Number.isFinite(ac) || !stats.has('生命骰')) { skipped.push(id); return; }
  const table = raw.match(/^\| 项目 \| 数据 \|[\s\S]*?(?=\r?\n\r?\n)/m)?.[0] ?? '';
  const afterTable = table ? raw.slice(raw.indexOf(table) + table.length) : raw.slice(raw.indexOf('\n\n') + 2);
  const description = clean(afterTable).slice(0, 5500);
  const assets = [...raw.matchAll(/!\[[^\]]*\]\(asset:([^\)]+)\)/g)].map((match) => match[1]);
  const assetName = assets.find((name) => /restored|audit/i.test(name) && existsSync(resolve(assetRoot, name)))
    ?? assets.find((name) => existsSync(resolve(assetRoot, name)));
  const printedPage = raw.match(/(?:印刷页|printed page[s]?)\s*[：:]?\s*(\d+)/i)?.[1];
  let illustration: Monster['illustration'];
  if (assetName && printedPage) {
    const targetName = `${id}.png`;
    copyFileSync(resolve(assetRoot, assetName), resolve(publicMonsterRoot, targetName));
    illustration = { src: `/assets/monsters/mm/${targetName}`, source: 'Monster Manual', page: Number(printedPage) };
  }
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
    description, ...(illustration ? { illustration } : {}), source: [{ book: 'MM', section: english }]
  });
}

for (const file of readdirSync(sourceRoot).filter((name) => name.endsWith('.md') && !name.endsWith('-retranslation.md')).sort()) {
  const raw = readFileSync(resolve(sourceRoot, file), 'utf8');
  if (file === 'men.md') {
    const split = splitMenManuscript(raw);
    importRecord(split.men, 'men');
    for (const section of split.monsters) importRecord(section.markdown, section.slug.slice(3));
  } else importRecord(raw, basename(file, '.md'));
}

// Replace the legacy M–Z catch-all entries with the page-audited files while
// keeping their established IDs, so existing site links remain stable.
for (const file of readdirSync(sourceRoot).filter((name) => name.endsWith('-retranslation.md')).sort()) {
  if (file === 'cover-retranslation.md' || file === 'index-retranslation.md' || file === 'treasure-types-retranslation.md') continue;
  importRecord(readFileSync(resolve(sourceRoot, file), 'utf8'), retranslationId(file));
}

const latestById = new Map(monsters.map((monster) => [monster.id, monster]));
monsters.splice(0, monsters.length, ...latestById.values());

writeFileSync(resolve('src/data/public/monsters-imported.json'), `${JSON.stringify(monsters, null, 2)}\n`);
console.log(`Imported ${monsters.length} MM monster records. Skipped ${skipped.length} non-stat or composite entries.`);
if (skipped.length) console.log(skipped.join(', '));
