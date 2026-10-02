import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Table = { headers: string[]; rows: string[][] };
const names = ['cleric', 'druid', 'fighter', 'paladin', 'ranger', 'magic-user', 'illusionist', 'thief', 'assassin', 'monk'];
const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_all, hex: string, decimal: string) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10))).replace(/\s+/g, ' ').trim();
const result: Record<string, Table> = {};
for (const name of names) {
  const body = readFileSync(resolve(`src/published/books/phb/${name}.md`), 'utf8');
  const tables = [...body.matchAll(/<TABLE>([\s\S]*?)<\/TABLE>/gi)];
  const xp = tables.map((match) => [...match[1].matchAll(/<TR>([\s\S]*?)<\/TR>/gi)].map((row) => [...row[1].matchAll(/<T[HD]>([\s\S]*?)<\/T[HD]>/gi)].map((cell) => clean(cell[1])))).find((rows) => rows[0]?.[0] === '经验值' && rows[0]?.[1] === '经验等级');
  if (!xp || xp.length < 8) throw new Error(`Missing XP table: ${name}`);
  result[name] = { headers: xp[0], rows: xp.slice(1).filter((row) => row.length === xp[0].length) };
}
const bardText = readFileSync(resolve('src/published/books/phb/bard-class.md'), 'utf8');
const bardBlock = bardText.match(/\| 经验值 \|[^\n]*\n(?:\|[^\n]*\n)+/)?.[0];
if (!bardBlock) throw new Error('Missing Bard XP table');
const bard = bardBlock.split(/\r?\n/).filter((line) => /^\|/.test(line)).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
result.bard = { headers: bard[0], rows: bard.slice(2).filter((row) => row.length === bard[0].length) };
writeFileSync(resolve('src/data/public/class-tables.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Imported XP tables for ${Object.keys(result).length} PHB classes.`);
