import { z } from 'zod';
import { spells } from '../src/data/public/spells';
import { monsters } from '../src/data/public/monsters';
import { items } from '../src/data/public/items';
import { books } from '../src/data/public/books';
import { tables } from '../src/data/public/tables';
import { classes } from '../src/data/public/classes';
import { races } from '../src/data/public/races';
import classTables from '../src/data/public/class-tables.json';
import uaClassTables from '../src/data/public/ua-class-tables.json';
import { SpellSchema, MonsterSchema, ItemSchema } from '../src/schemas';
import published from '../src/data/published/books.json';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fail = (message: string): never => { throw new Error(message); };
const unique = (values: string[], label: string) => { const duplicates = values.filter((value, index) => values.indexOf(value) !== index); if (duplicates.length) fail(`${label} duplicate id: ${[...new Set(duplicates)].join(', ')}`); };
SpellSchema.array().parse(spells); MonsterSchema.array().parse(monsters); ItemSchema.array().parse(items);
unique(spells.map((entry) => entry.id), 'spells'); unique(monsters.map((entry) => entry.id), 'monsters'); unique(items.map((entry) => entry.id), 'items');
unique(tables.map((entry) => entry.id), 'random tables');
unique(classes.map((entry) => entry.id), 'classes'); unique(races.map((entry) => entry.id), 'races');
for (const entry of classes) {
  if (!({ ...classTables, ...uaClassTables } as Record<string, { rows: string[][] }>)[entry.id]?.rows.length) fail(`Missing class XP table: ${entry.id}`);
  for (const raceId of entry.eligibleRaces) {
    const race = races.find((item) => item.id === raceId);
    if (!race || !race.eligibleClasses.some((item) => item.id === entry.id)) fail(`Class/race mismatch: ${entry.id}/${raceId}`);
  }
}
for (const entry of races) for (const allowed of entry.eligibleClasses) {
  const chosenClass = classes.find((item) => item.id === allowed.id);
  if (!chosenClass || !chosenClass.eligibleRaces.includes(entry.id)) fail(`Race/class mismatch: ${entry.id}/${allowed.id}`);
}
const bookIds = new Set(books.flatMap((book) => [book.id, book.short, book.title]));
for (const entry of [...spells, ...monsters, ...items]) for (const source of entry.source) if (!bookIds.has(source.book)) fail(`Unknown source "${source.book}"`);
for (const monster of monsters) if (monster.illustration && !monster.illustration.src.startsWith('/assets/')) fail(`Illustration must be local: ${monster.id}`);
unique(published.map((entry) => `${entry.book}/${entry.slug}`), 'published chapters');
const publishedKeys = new Set(published.map((entry) => `${entry.book}/${entry.slug}`));
for (const table of tables) {
  const match = table.sourceHref.match(/^\/books\/([^/]+)\/([^/]+)\/$/);
  if (!match || !publishedKeys.has(`${match[1]}/${match[2]}`)) fail(`Broken random table source: ${table.id}`);
  const sides = Number(table.dice.slice(1));
  for (let roll = 1; roll <= sides; roll++) if (table.entries.filter((entry) => entry.min <= roll && roll <= entry.max).length !== 1) fail(`Invalid random table range: ${table.id} roll ${roll}`);
}
for (const chapter of published) {
  if (!books.some((book) => book.id === chapter.book)) fail(`Unknown book in published chapter: ${chapter.book}`);
  const path = resolve(`src/published/books/${chapter.book}/${chapter.slug}.md`);
  if (!existsSync(path)) fail(`Missing published Markdown: ${chapter.book}/${chapter.slug}`);
  const body = readFileSync(path, 'utf8');
  if (/asset:|#unavailable-link|<script\b/i.test(body)) fail(`Unresolved or unsafe content: ${chapter.book}/${chapter.slug}`);
  for (const match of body.matchAll(/\/books\/(phb|dmg|mm|ua)\/([a-z0-9-]+)\//g)) {
    if (!publishedKeys.has(`${match[1]}/${match[2]}`)) fail(`Broken book link in ${chapter.book}/${chapter.slug}: ${match[0]}`);
  }
}
console.log(`Validated ${spells.length} spells, ${monsters.length} monsters, ${items.length} items, ${classes.length} classes, ${races.length} races, ${tables.length} random tables, ${books.length} books and ${published.length} published chapters.`);
