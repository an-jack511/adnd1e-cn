import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

type Entry = { min: number; max: number; result: string };
type Table = { id: string; title: string; dice: string; category: '地下城' | '随机遭遇' | '战利品'; sourceHref: string; entries: Entry[] };
const root = resolve('../manuscript/ff/topics');
const manifest = JSON.parse(readFileSync(resolve('../manuscript/ff/book.json'), 'utf8')) as { topics: Array<{ slug: string; file: string }> };
const sourceSlugs = new Map(manifest.topics.map((topic) => [basename(topic.file), topic.slug]));
const clean = (value: string) => value.replace(/\*\*/g, '').replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const asNumber = (value: string) => value === '00' ? 100 : Number(value);
const parseRange = (value: string): [number, number] | undefined => {
  const match = clean(value).replace(/\*+$/, '').match(/^(\d{1,3})(?:[–—-](\d{1,3}))?$/);
  return match ? [asNumber(match[1]), asNumber(match[2] ?? match[1])] : undefined;
};
const tables: Table[] = [];
let sequence = 0;

for (const file of readdirSync(root).filter((name) => name.endsWith('.md')).sort()) {
  const sourceSlug = sourceSlugs.get(file);
  if (!sourceSlug) continue;
  const lines = readFileSync(resolve(root, file), 'utf8').split(/\r?\n/);
  let heading = basename(file, '.md');
  for (let index = 0; index < lines.length; index++) {
    if (/^#{2,5}\s/.test(lines[index])) heading = clean(lines[index].replace(/^#+\s*/, ''));
    if (!/^\|/.test(lines[index])) continue;
    const rows: string[][] = [];
    while (index < lines.length && /^\|/.test(lines[index])) {
      rows.push(lines[index].split('|').slice(1, -1).map(clean));
      index++;
    }
    if (rows.length < 4 || !/骰值/.test(rows[0]?.[0] ?? '')) continue;
    const diceColumn = 0;
    const resultColumn = 1;
    const entries = rows.slice(2).flatMap((row) => {
      const range = parseRange(row[diceColumn] ?? '');
      const result = row.slice(resultColumn).filter(Boolean).join('；');
      return range && result ? [{ min: range[0], max: range[1], result }] : [];
    });
    if (entries.length < 3) continue;
    const max = Math.max(...entries.map((entry) => entry.max));
    if (max < 4 || max > 100) continue;
    const coverage = new Map<number, number>();
    for (const entry of entries) for (let roll = entry.min; roll <= entry.max; roll++) coverage.set(roll, (coverage.get(roll) ?? 0) + 1);
    if (coverage.size !== max || [...coverage].some(([roll, count]) => roll < 1 || roll > max || count !== 1)) continue;
    sequence++;
    tables.push({ id: `ff-${sourceSlug}-table-${sequence}`, title: `FF ${heading}`, dice: `d${max}`, category: '随机遭遇', sourceHref: `/books/ff/${sourceSlug}/`, entries });
  }
}

writeFileSync(resolve('src/data/public/ff-tables-imported.json'), `${JSON.stringify(tables, null, 2)}\n`);
console.log(`Imported ${tables.length} complete FF roll tables.`);
