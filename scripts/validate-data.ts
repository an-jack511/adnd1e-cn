import { z } from 'zod';
import { spells } from '../src/data/public/spells';
import { monsters } from '../src/data/public/monsters';
import { items } from '../src/data/public/items';
import { books } from '../src/data/public/books';
import { SpellSchema, MonsterSchema, ItemSchema } from '../src/schemas';
import published from '../src/data/published/books.json';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fail = (message: string): never => { throw new Error(message); };
const unique = (values: string[], label: string) => { const duplicates = values.filter((value, index) => values.indexOf(value) !== index); if (duplicates.length) fail(`${label} duplicate id: ${[...new Set(duplicates)].join(', ')}`); };
SpellSchema.array().parse(spells); MonsterSchema.array().parse(monsters); ItemSchema.array().parse(items);
unique(spells.map((entry) => entry.id), 'spells'); unique(monsters.map((entry) => entry.id), 'monsters'); unique(items.map((entry) => entry.id), 'items');
const bookIds = new Set(books.flatMap((book) => [book.id, book.short, book.title]));
for (const entry of [...spells, ...monsters, ...items]) for (const source of entry.source) if (!bookIds.has(source.book)) fail(`Unknown source "${source.book}"`);
for (const monster of monsters) if (monster.illustration && !monster.illustration.src.startsWith('/assets/')) fail(`Illustration must be local: ${monster.id}`);
unique(published.map((entry) => `${entry.book}/${entry.slug}`), 'published chapters');
const publishedKeys = new Set(published.map((entry) => `${entry.book}/${entry.slug}`));
for (const chapter of published) {
  if (!books.some((book) => book.id === chapter.book)) fail(`Unknown book in published chapter: ${chapter.book}`);
  const path = resolve(`src/published/books/${chapter.book}/${chapter.slug}.md`);
  if (!existsSync(path)) fail(`Missing published Markdown: ${chapter.book}/${chapter.slug}`);
  const body = readFileSync(path, 'utf8');
  if (/asset:|#unavailable-link|<script\b/i.test(body)) fail(`Unresolved or unsafe content: ${chapter.book}/${chapter.slug}`);
  for (const match of body.matchAll(/\/books\/(phb|dmg|mm)\/([a-z0-9-]+)\//g)) {
    if (!publishedKeys.has(`${match[1]}/${match[2]}`)) fail(`Broken book link in ${chapter.book}/${chapter.slug}: ${match[0]}`);
  }
}
console.log(`Validated ${spells.length} spells, ${monsters.length} monsters, ${items.length} items, ${books.length} books and ${published.length} published chapters.`);
