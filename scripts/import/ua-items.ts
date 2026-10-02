import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Item } from '../../src/schemas';

const root = resolve('../manuscript/ua/topics');
const pages = JSON.parse(readFileSync(resolve('src/data/published/books.json'), 'utf8')) as { book: string; slug: string; sourceFile: string }[];
const existing = [...JSON.parse(readFileSync(resolve('src/data/public/items-imported.json'), 'utf8')), ...JSON.parse(readFileSync(resolve('src/data/public/magic-items-imported.json'), 'utf8'))] as Item[];
const clean = (text: string) => text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const chapterFor = (file: string) => pages.find((page) => page.book === 'ua' && page.sourceFile.endsWith(`/${file}`))?.slug;
const splitName = (text: string) => {
  const match = clean(text).replace(/\s*\*+$/, '').match(/^(.+?)\s+([A-Za-z][A-Za-z0-9'’(),+\-\s./&]+)$/);
  return match ? { zh: match[1].trim(), en: match[2].trim() } : undefined;
};
const descriptions = new Map<string, { text: string; chapter: string }>();
for (const file of readdirSync(root).filter((name) => /^dm-.*-descriptions(?:-\d+(?:-\d+)?)?\.md$/.test(name))) {
  const chapter = chapterFor(file);
  if (!chapter) continue;
  const chunks = readFileSync(resolve(root, file), 'utf8').split(/^##\s+/m).slice(1);
  for (const chunk of chunks) {
    const [heading, ...body] = chunk.split(/\r?\n/);
    const name = splitName(heading);
    if (!name) continue;
    const paragraph = body.join('\n').split(/\n\s*\n/).map(clean).find((value) => value && !value.startsWith('|') && !value.startsWith('!['));
    if (paragraph) descriptions.set(name.zh, { text: paragraph.slice(0, 1000), chapter });
  }
}
const result: Item[] = [];
const knownZh = new Set(existing.map((item) => item.nameZh));
const ids = new Set<string>();
const add = (item: Item) => { if (!ids.has(item.id)) { result.push(item); ids.add(item.id); } };

// UA's weight/damage table is in coin-weight units. Keep these values as printed;
// do not silently reinterpret them as pounds or treat them as shop prices.
const weaponLines = readFileSync(resolve(root, 'weapons.md'), 'utf8').split(/\r?\n/);
let inWeaponTable = false;
for (const line of weaponLines) {
  if (line.startsWith('## 按武器种类列出的重量与伤害')) { inWeaponTable = true; continue; }
  if (inWeaponTable && line.startsWith('## ')) break;
  if (!inWeaponTable || !line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map(clean);
  const name = splitName(cells[0]);
  if (!name || knownZh.has(name.zh) || !/^\d/.test(cells[1])) continue;
  const slug = name.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  add({ id: `ua-weapon-${slug}`, nameZh: name.zh, nameEn: name.en, category: '武器', price: '见 UA 装备价目', weight: `${cells[1]} gp 重量`, damageSmallMedium: cells[2], damageLarge: cells[3], description: `UA 武器表：约重 ${cells[1]} 金币重量；对小型／中型造成 ${cells[2]} 伤害，对大型造成 ${cells[3]} 伤害。`, tags: ['武器', 'UA'], source: [{ book: 'UA', section: chapterFor('weapons.md')! }] });
}

for (const file of readdirSync(root).filter((name) => /^dm-treasure-.*\.md$/.test(name)).sort()) {
  const text = readFileSync(resolve(root, file), 'utf8');
  const chapter = chapterFor(file);
  if (!chapter) continue;
  let heading = '';
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('## ')) heading = line.slice(3);
    if (!line.startsWith('|') || !/\b(?:III\.[A-H](?:\.\d+)?)\b/.test(heading)) continue;
    const cells = line.split('|').slice(1, -1).map(clean);
    if (cells.length < 4 || !/^\d{1,3}(?:[–—-]\d{1,3})?$/.test(cells[0])) continue;
    const name = splitName(cells[1].replace(/（[A-Z]）/g, '').replace(/\s*\*+$/, ''));
    if (!name || knownZh.has(name.zh)) continue;
    const detail = descriptions.get(name.zh);
    if (!detail) continue; // A roll-table label alone is not an item rule.
    const slug = name.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) continue;
    add({ id: `ua-magic-${slug}`, nameZh: name.zh, nameEn: name.en, category: '魔法物品', price: cells[3] === '—' ? '—' : `${cells[3]} gp（参考售价）`, weight: '见正文', description: detail.text, tags: ['魔法', 'UA'], source: [{ book: 'UA', section: detail.chapter }, { book: 'UA', section: chapter }] });
  }
}
writeFileSync(resolve('src/data/public/ua-items-imported.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Imported ${result.length} UA items (${result.filter((item) => item.category === '武器').length} weapons, ${result.filter((item) => item.category === '魔法物品').length} described magic items).`);
