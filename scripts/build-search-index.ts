import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spells } from '../src/data/public/spells';
import { monsters } from '../src/data/public/monsters';
import { items } from '../src/data/public/items';
import { classes } from '../src/data/public/classes';
import { races } from '../src/data/public/races';
import { rules } from '../src/data/public/rules';

const source = (entry: { source: { book: string }[] }) => entry.source.map((item) => item.book);
const index = [
  ...spells.map((entry) => ({ type: '法术', href: `/spells/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: entry.tags, source: source(entry), aliases: [] })),
  ...monsters.map((entry) => ({ type: '怪物', href: `/monsters/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: [entry.environment, entry.alignment, entry.size], source: source(entry), aliases: [] })),
  ...items.map((entry) => ({ type: '装备', href: `/equipment/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: entry.tags, source: source(entry), aliases: [] })),
  ...classes.map((entry) => ({ type: '职业', href: `/classes/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: [entry.primeRequisite], source: source(entry), aliases: [] })),
  ...races.map((entry) => ({ type: '种族', href: `/races/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.abilities.join('；'), tags: [entry.movement], source: source(entry), aliases: [] })),
  ...rules.map((entry) => ({ type: '规则', href: `/${entry.category === 'combat' ? 'combat' : entry.category === 'adventure' ? 'adventure' : 'rules'}/${entry.id}`, nameZh: entry.title, nameEn: '', description: entry.summary, tags: [entry.category], source: source(entry), aliases: [] }))
];
await writeFile(resolve('public/search-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
console.log(`Wrote ${index.length} search records.`);
