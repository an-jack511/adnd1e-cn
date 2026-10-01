import type { APIRoute } from 'astro';
import { spells } from '../data/public/spells';
import { monsters } from '../data/public/monsters';
import { items } from '../data/public/items';
import { classes } from '../data/public/classes';
import { races } from '../data/public/races';
import { rules } from '../data/public/rules';

export const GET: APIRoute = () => {
  const index = [
    ...spells.map((entry) => ({ type: '法术', href: `/spells/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: entry.tags, source: entry.source.map((source) => source.book), aliases: [] })),
    ...monsters.map((entry) => ({ type: '怪物', href: `/monsters/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: [entry.environment, entry.alignment, entry.size], source: entry.source.map((source) => source.book), aliases: [] })),
    ...items.map((entry) => ({ type: '装备', href: `/equipment/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: entry.tags, source: entry.source.map((source) => source.book), aliases: [] })),
    ...classes.map((entry) => ({ type: '职业', href: `/classes/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, tags: [entry.primeRequisite], source: entry.source.map((source) => source.book), aliases: [] })),
    ...races.map((entry) => ({ type: '种族', href: `/races/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.abilities.join('；'), tags: [entry.movement], source: entry.source.map((source) => source.book), aliases: [] })),
    ...rules.map((entry) => ({ type: '规则', href: `/${entry.category === 'combat' ? 'combat' : entry.category === 'adventure' ? 'adventure' : 'rules'}/${entry.id}`, nameZh: entry.title, nameEn: '', description: entry.summary, tags: [entry.category], source: entry.source.map((source) => source.book), aliases: [] }))
  ];
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
