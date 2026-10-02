import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Item } from '../../src/schemas';

const source = resolve('../build/chm/content/phb/money-equipment-and-arms.html');
const html = new TextDecoder('gbk').decode(readFileSync(source));
const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_m, hex: string, decimal: string) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10))).replace(/\s+/g, ' ').trim();
const section = html.match(/基本装备与补给价格 Basic Equipment And Supplies Costs[\s\S]*?<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
if (!section) throw new Error('PHB equipment price table not found');
const rows = [...section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1])));
if (rows[0]?.join('|') !== '类别|物品|价格') throw new Error(`Unexpected PHB equipment headers: ${rows[0]?.join('|')}`);
const items: Item[] = rows.slice(1).filter((row) => row.length >= 3 && row[1] && row[2]).map((row, index) => ({
  id: `phb-item-${String(index + 1).padStart(3, '0')}`,
  nameZh: row[1], nameEn: '', category: row[0] || '其他', price: row[2], weight: '见负重表',
  description: `《玩家手册》基本装备与补给价格表：${row[0]}；价格 ${row[2]}。重量与特殊性质请查同书装备、武器及负重章节。`,
  tags: [row[0] || '其他'], source: [{ book: 'PHB', section: 'Basic Equipment and Supplies Costs' }]
}));
writeFileSync(resolve('src/data/public/items-imported.json'), `${JSON.stringify(items, null, 2)}\n`);
console.log(`Imported ${items.length} PHB equipment price records; categories: ${[...new Set(items.map((item) => item.category))].join(', ')}`);
