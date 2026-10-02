import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import type { RandomTable } from '../../src/data/public/tables';

const root = resolve('../manuscript/ua/topics');
const pages = JSON.parse(readFileSync(resolve('src/data/published/books.json'), 'utf8')) as { book: string; slug: string; sourceFile: string }[];
const items = JSON.parse(readFileSync(resolve('src/data/public/ua-items-imported.json'), 'utf8')) as { id: string; nameZh: string }[];
items.sort((a, b) => b.nameZh.length - a.nameZh.length);
const clean = (text: string) => text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const tables: RandomTable[] = [];
let skipped = 0;
for (const file of readdirSync(root).filter((name) => /^dm-treasure-.*\.md$/.test(name)).sort()) {
  const chapter = pages.find((page) => page.book === 'ua' && page.sourceFile.endsWith(`/${file}`));
  if (!chapter) throw new Error(`Missing UA chapter for ${file}`);
  const lines = readFileSync(resolve(root, file), 'utf8').split(/\r?\n/);
  let title = basename(file, '.md');
  let ordinal = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s/.test(lines[i])) title = clean(lines[i].replace(/^#+\s*/, ''));
    if (!lines[i].startsWith('|')) continue;
    const block: string[] = [];
    while (i < lines.length && lines[i].startsWith('|')) block.push(lines[i++]);
    const rows = block.map((line) => line.split('|').slice(1, -1).map(clean));
    if (rows.length < 4 || !/^d%$|^首次 d%$/.test(rows[0][0])) continue;
    const entries = rows.slice(2).flatMap((row) => {
      const match = row[0].replace(/\*+$/, '').match(/^(\d{1,3})(?:[–—-](\d{1,3}))?$/);
      if (!match || !row[1]) return [];
      const min = Number(match[1]);
      const max = match[2] === '00' ? 100 : Number(match[2] ?? match[1]);
      const item = items.find((candidate) => row[1].startsWith(candidate.nameZh) && (row[1].length === candidate.nameZh.length || /[\s（(，,；;+]/.test(row[1][candidate.nameZh.length])));
      return [{ min, max, result: row[1], ...(item ? { href: `/equipment/${item.id}` } : {}) }];
    });
    const seen = new Set<number>();
    let valid = true;
    for (const entry of entries) for (let n = entry.min; n <= entry.max; n++) {
      if (seen.has(n)) valid = false;
      seen.add(n);
    }
    if (!valid || seen.size !== 100 || !seen.has(1) || !seen.has(100)) { skipped++; continue; }
    ordinal++;
    tables.push({ id: `${chapter.slug}-table-${ordinal}`, title, dice: 'd100', category: '战利品', sourceHref: `/books/ua/${chapter.slug}/`, entries });
  }
}
writeFileSync(resolve('src/data/public/ua-tables-imported.json'), `${JSON.stringify(tables, null, 2)}\n`);
console.log(`Imported ${tables.length} complete UA treasure tables; skipped ${skipped} incomplete or conditional tables.`);
