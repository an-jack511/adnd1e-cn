import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const result: Record<string, { headers: string[]; rows: string[][] }> = {};
for (const [id, file, heading] of [
  ['cavalier', 'cavalier.md', '骑士表 I'],
  ['barbarian', 'barbarian.md', '野蛮人（战士）表 I'],
  ['thief-acrobat', 'thief-acrobat.md', '杂技盗贼表 I']
] as const) {
  const text = readFileSync(resolve('../manuscript/ua/topics', file), 'utf8');
  const lines = text.slice(text.indexOf(`## ${heading}`)).split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('|'));
  const rows: string[] = [];
  for (const line of lines.slice(start)) {
    if (!line.startsWith('|')) break;
    rows.push(line);
  }
  const tableRows = rows.map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()));
  result[id] = { headers: tableRows[0], rows: tableRows.slice(2).filter((row) => row.length === tableRows[0].length && /^[-\d]/.test(row[0])) };
  if (result[id].rows.length < 5) throw new Error(`Could not parse ${file} XP table`);
}
writeFileSync(resolve('src/data/public/ua-class-tables.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Imported ${Object.keys(result).length} UA class XP tables.`);
