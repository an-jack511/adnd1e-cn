import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

type Entry = { min: number; max: number; result: string; href?: string };
type Table = { id: string; title: string; dice: string; category: '地下城' | '随机遭遇' | '战利品'; sourceHref: string; entries: Entry[] };
const root = resolve('../manuscript/dmg/topics');
const monsters = JSON.parse(readFileSync(resolve('src/data/public/monsters-imported.json'), 'utf8')) as Array<{ id: string; nameZh: string }>;
const magicItems = JSON.parse(readFileSync(resolve('src/data/public/magic-items-imported.json'), 'utf8')) as Array<{ id: string; nameZh: string }>;
monsters.sort((a, b) => b.nameZh.length - a.nameZh.length);
magicItems.sort((a, b) => b.nameZh.length - a.nameZh.length);
const clean = (text: string) => text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const number = (text: string) => text === '00' ? 100 : Number(text);
const parseRange = (text: string): [number, number] | undefined => {
  const match = clean(text).replace(/\*+$/, '').match(/^(\d{1,3})(?:[–—-](\d{1,3}))?$/);
  if (!match) return undefined;
  return [number(match[1]), number(match[2] ?? match[1])];
};
const tables: Table[] = [];
let incomplete = 0;

for (const file of readdirSync(root).filter((name) => /^(appendix-a-random-dungeon-generation|appendix-c-random-monster-encounters|treasure(?:-continuation)?)(?:-\d+)?\.md$/.test(name)).sort()) {
  const sourceName = basename(file, '.md');
  const sourceSlug = /^(appendix-a-random-dungeon-generation|appendix-c-random-monster-encounters|treasure)$/.test(sourceName) ? `dmg-${sourceName}` : sourceName;
  const category = sourceName.startsWith('appendix-a-') ? '地下城' : sourceName.startsWith('appendix-c-') ? '随机遭遇' : '战利品';
  const lines = readFileSync(resolve(root, file), 'utf8').split(/\r?\n/);
  let heading = sourceName;
  let count = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^#{2,5}\s/.test(line)) heading = clean(line.replace(/^#+\s*/, ''));
    if (!/^\|/.test(line)) continue;
    const rows: string[][] = [];
    while (index < lines.length && /^\|/.test(lines[index])) {
      rows.push(lines[index].split('|').slice(1, -1).map(clean));
      index++;
    }
    if (rows.length < 4 || !/骰|d%|d20|d100/i.test(rows[0]?.[0] ?? '')) continue;
    const headers = rows[0];
    const data = rows.slice(2);
    const diceColumns = headers.flatMap((cell, cellIndex) => /骰|d%|d(?:4|6|8|10|12|20|100)/i.test(cell) ? [cellIndex] : []);
    for (const firstColumn of diceColumns) {
      const resultColumn = firstColumn + 1;
      if (resultColumn >= headers.length) continue;
      const entries = data.flatMap((row) => {
        const range = parseRange(row[firstColumn] ?? '');
        if (!range || !row[resultColumn]) return [];
        const result = row.slice(resultColumn, diceColumns.find((column) => column > firstColumn) ?? row.length).join('；');
        const monster = category === '随机遭遇' ? monsters.find((entry) => result.startsWith(entry.nameZh) && (result.length === entry.nameZh.length || /[（(，,；;\s\d]/.test(result[entry.nameZh.length]))) : undefined;
        const magicItem = category === '战利品' ? magicItems.find((entry) => result.startsWith(entry.nameZh) && (result.length === entry.nameZh.length || /[（(，,；;\s\d]/.test(result[entry.nameZh.length]))) : undefined;
        return [{ min: range[0], max: range[1], result, ...(monster ? { href: `/monsters/${monster.id}` } : magicItem ? { href: `/equipment/${magicItem.id}` } : {}) }];
      });
      if (entries.length < 3) continue;
      const max = /d(?:100|%)/i.test(headers[firstColumn]) || entries.some((entry) => entry.max === 100) || entries.some((entry) => entry.max > 20) ? 100 : /d20/i.test(headers[firstColumn] + heading) ? 20 : /d10/i.test(headers[firstColumn] + heading) ? 10 : /d8/i.test(headers[firstColumn] + heading) ? 8 : /d6/i.test(headers[firstColumn] + heading) ? 6 : /d4/i.test(headers[firstColumn] + heading) ? 4 : Math.max(...entries.map((entry) => entry.max));
      const dice = `d${max}`;
      const covered = new Map<number, number>();
      for (const entry of entries) for (let roll = entry.min; roll <= entry.max; roll++) covered.set(roll, (covered.get(roll) ?? 0) + 1);
      if (covered.size !== max || [...covered].some(([roll, count]) => roll < 1 || roll > max || count !== 1)) { incomplete++; continue; }
      count++;
      tables.push({ id: `${sourceSlug}-table-${count}`, title: `${heading}${diceColumns.length > 1 ? ` · ${headers[resultColumn]}` : ''}`, dice, category, sourceHref: `/books/dmg/${sourceSlug}/`, entries });
    }
  }
}

writeFileSync(resolve('src/data/public/tables-imported.json'), `${JSON.stringify(tables, null, 2)}\n`);
console.log(`Imported ${tables.length} complete DMG roll tables (${tables.filter((t) => t.category === '地下城').length} dungeon, ${tables.filter((t) => t.category === '随机遭遇').length} encounter, ${tables.filter((t) => t.category === '战利品').length} treasure); skipped ${incomplete} incomplete ranges.`);
