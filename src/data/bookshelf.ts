import { existsSync } from 'node:fs';
import directory from './public/book-directory.json';
import { books } from './public/books';
import published from './published/topics';
import { manuals, manualCategories } from './manuals';

export interface ShelfBook {
  id: string;
  title: string;
  subtitle?: string;
  subtitleLang?: string;
  code?: string;
  pages?: number;
  format?: string;
  href: string;
  cover?: string;
  categories: string[];
}

export const libraryCategories = [
  { id: 'core', label: '核心规则' },
  { id: 'expansions', label: '拓展规则' },
  { id: 'monsters', label: '怪物' },
  { id: 'settings', label: '设定' },
  { id: 'magazines', label: '杂志' },
  ...manualCategories,
];

const catalog = [...directory, ...books.filter(book =>
  !directory.some(entry => entry.id === book.id) && published.some(topic => topic.book === book.id)
).map(book => ({ ...book, group: '', archive: '' }))];

const ruleBooks: ShelfBook[] = catalog.map(book => {
  const categories = /^dragon-\d+$/.test(book.id) ? ['magazines']
    : ['phb', 'dmg'].includes(book.id) ? ['core']
    : book.id === 'mm' ? ['core', 'monsters']
    : ['ff', 'mm2', 'ref3', 'ref4', 'ref5'].includes(book.id) ? ['monsters']
    : book.group.startsWith('战役设定') || book.id === 'dl-atlas' ? ['settings']
    : ['expansions'];
  const cover = [`/assets/covers/${book.id}.jpg`, `/archive/${book.id}/book-cover.jpg`]
    .find(path => existsSync(new URL(`../../public${path}`, import.meta.url)));
  return {
    id: book.id, title: book.titleZh, subtitle: book.title, code: book.short,
    href: book.archive ? `/read/${book.id}/` : `/books/${book.id}/`,
    cover,
    categories,
  };
}).sort((a, b) => {
  const order = libraryCategories.findIndex(category => category.id === a.categories[0])
    - libraryCategories.findIndex(category => category.id === b.categories[0]);
  return order || (a.categories[0] === 'magazines'
    ? Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]) : 0);
});

export const libraryBooks: ShelfBook[] = [...ruleBooks, ...manuals.map(book => ({
  id: book.id, title: book.title, subtitle: book.subtitle, subtitleLang: 'la', code: book.code,
  cover: book.cover, href: `/manuals/${book.id}/`, pages: book.pages, format: 'PDF',
  categories: book.category === 'compilations' ? [book.category] : ['spellbooks', book.category],
}))];
