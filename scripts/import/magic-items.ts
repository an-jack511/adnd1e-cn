import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Item } from '../../src/schemas';

const lines = readFileSync(resolve('../manuscript/dmg/topics/treasure.md'), 'utf8').split(/\r?\n/);
const clean = (value: string) => value.replace(/\*+|\$|#/g, '').replace(/<[^>]+>/g, '').trim();
const slug = (value: string) => value.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const items: Item[] = [];
const ids = new Set<string>();
let heading = '';
for (let index = 0; index < lines.length; index++) {
  if (/^#{2,4} /.test(lines[index])) heading = clean(lines[index].replace(/^#+ /, ''));
  if (!/^\|/.test(lines[index])) continue;
  const rows: string[][] = [];
  while (index < lines.length && /^\|/.test(lines[index])) rows.push(lines[index++].split('|').slice(1, -1).map(clean));
  const header = rows[0] ?? [];
  if (header.length !== 4 || !/^d100$/i.test(header[0]) || !/^XP$/i.test(header[2]) || !/售价|出售价值/.test(header[3])) continue;
  for (const row of rows.slice(2)) {
    if (!/^\d{1,2}(?:[–—-]\d{1,2})?$/.test(row[0] ?? '')) continue;
    const original = row[1].replace(/（[^）]*）/g, '').trim();
    const english = original.match(/([A-Z][A-Za-z0-9'’+(),. /-]+)$/)?.[1]?.trim();
    if (!english) continue;
    const chinese = original.slice(0, original.length - english.length).trim();
    if (!chinese) continue;
    const section = heading.split(/(?=[A-Z][a-z]{2,})/)[0].trim() || heading;
    const baseId = `magic-${slug(english)}`;
    let id = baseId, suffix = 2;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    ids.add(id);
    const nameZh = /^III\.A\. 药水/.test(heading) && !/药水|油剂|滤剂|毒药/.test(chinese) ? `${chinese}药水` : chinese;
    items.push({ id, nameZh, nameEn: english, category: '魔法物品', price: row[3] === '—' ? '未列售价' : `参考售价 ${row[3]} gp`, weight: '未列', description: `${section}。DMG 表列 XP：${row[2]}；随机骰值：${row[0]}。`, tags: ['魔法物品', section], source: [{ book: 'DMG', section: heading }] });
  }
}
writeFileSync(resolve('src/data/public/magic-items-imported.json'), `${JSON.stringify(items, null, 2)}\n`);
console.log(`Imported ${items.length} DMG magic item index entries.`);
