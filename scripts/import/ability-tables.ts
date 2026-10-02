import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A small, reviewable extract of the existing PHB work translation. The source
// files stay outside the public repository; only these table values are copied.
const root = resolve(import.meta.dirname, '../../..');
const early = JSON.parse(readFileSync(resolve(root, 'translation/pages.json'), 'utf8'));
const later = JSON.parse(readFileSync(resolve(root, 'translation/batches/pages_012_020.json'), 'utf8'));
const table = (page: any, title: string) => page.blocks.find((block: any) => block.type === 'table' && (typeof block.title === 'string' ? block.title.includes(title) : block.title?.translation?.includes(title)));
const pick = (page: any, title: string) => {
  const found = table(page, title);
  if (!found) throw new Error(`Missing PHB table: ${title}`);
  return found.translated_rows ?? found.rows;
};
const page = (number: number) => later.pages.find((entry: any) => entry.pdf_page === number);
const intelligence = readFileSync(resolve(import.meta.dirname, '../../src/published/books/phb/intelligence.md'), 'utf8');
const intelligenceTables = [...intelligence.matchAll(/<TABLE>([\s\S]*?)<\/TABLE>/gi)].map((block) => [...block[1].matchAll(/<TR>([\s\S]*?)<\/TR>/gi)].map((row) => [...row[1].matchAll(/<T[HD]>([\s\S]*?)<\/T[HD]>/gi)].map((cell) => cell[1].replace(/<[^>]+>/g, '').trim())));
if (intelligenceTables.length < 2) throw new Error('Missing PHB Intelligence tables');
const intelligenceRows = intelligenceTables[0].slice(1).map((row) => {
  const score = Number(row[0]);
  const magic = intelligenceTables[1].slice(1).find((entry) => { const [lo, hi] = entry[0].split(/[–-]/).map(Number); return score >= lo && score <= (hi ?? lo); });
  return [row[0], row[2], magic?.[1] ?? '—', magic?.[2] ?? '—', magic?.[3] ?? '—'];
});
const output = {
  STR: { page: 9, labels: ['命中', '伤害', '负重（gp）', '开门／6', '弯铁条'], rows: pick(early.pages[9], '力量表 II') },
  INT: { page: 10, labels: ['额外语言', '习得法术概率', '每环最低', '每环最高'], rows: intelligenceRows },
  WIS: { page: 11, labels: ['精神攻击豁免'], rows: pick(page(12), '感知表 I').map((row: string[]) => [row[0], row[2]]) },
  DEX: { page: 11, labels: ['反应／投射', 'AC 调整'], rows: pick(page(12), '敏捷表 I').map((row: string[]) => [row[0], row[2], row[3]]) },
  CON: { page: 12, labels: ['每颗生命骰 HP', '系统冲击', '复活存活'], rows: pick(page(13), '体质表').map((row: string[]) => [row[0], row[2], row[3], row[4]]) },
  CHA: { page: 13, labels: ['追随者上限', '忠诚', '反应'], rows: pick(page(14), '魅力表').map((row: string[]) => [row[0], row[2], row[3], row[4]]) },
};
writeFileSync(resolve(import.meta.dirname, '../../src/data/public/ability-tables.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log('Extracted PHB work-translation ability tables for the character sheet.');
