import { z } from 'zod';
import { spells } from '../src/data/public/spells';
import { monsters } from '../src/data/public/monsters';
import { items } from '../src/data/public/items';
import { books } from '../src/data/public/books';
import { SpellSchema, MonsterSchema, ItemSchema } from '../src/schemas';

const fail = (message: string): never => { throw new Error(message); };
const unique = (values: string[], label: string) => { const duplicates = values.filter((value, index) => values.indexOf(value) !== index); if (duplicates.length) fail(`${label} duplicate id: ${[...new Set(duplicates)].join(', ')}`); };
SpellSchema.array().parse(spells); MonsterSchema.array().parse(monsters); ItemSchema.array().parse(items);
unique(spells.map((entry) => entry.id), 'spells'); unique(monsters.map((entry) => entry.id), 'monsters'); unique(items.map((entry) => entry.id), 'items');
const bookIds = new Set(books.flatMap((book) => [book.id, book.short, book.title]));
for (const entry of [...spells, ...monsters, ...items]) for (const source of entry.source) if (!bookIds.has(source.book)) fail(`Unknown source "${source.book}"`);
for (const monster of monsters) if (monster.illustration && !monster.illustration.src.startsWith('/assets/')) fail(`Illustration must be local: ${monster.id}`);
console.log(`Validated ${spells.length} spells, ${monsters.length} monsters, ${items.length} items, ${books.length} books.`);
