/**
 * Copy explicitly selected local work translations into this public site.
 * This script is manual: the Cloudflare build never reads the parent manuscript.
 * Only Markdown text is imported; scans and source illustrations are excluded.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, posix, resolve } from 'node:path';
import { splitMenManuscript } from './mm-sections';

const bookIds = ['phb', 'dmg', 'mm', 'ua', 'dsg', 'wsg', 'oa', 'motp', 'ddg', 'll', 'dmdk', 'ff'] as const;
type BookId = typeof bookIds[number];
type Topic = { slug: string; title: string; title_en?: string; group?: string; page?: string; file: string };
type PublishedTopic = { book: BookId; slug: string; title: string; titleEn: string; group: string; excerpt: string; sourceFile: string };

// These unprefixed DSG filenames are superseded working copies. Keep the
// manifest's retranslation files as the single public source for each chapter.
const supersededDsgSources = new Set([
  'campaign-design.md',
  'campaign-management.md',
  'compiled-tables-index.md',
  'cultures-underdark.md',
  'deepearth-areas.md',
  'deepearth.md',
  'mapping-geomorphs.md',
]);

// The WSG manifest now points at the page-audited retranslation files. Keep
// older summary copies out of the public mirror so each chapter has one
// canonical site entry.
const supersededWsgSources = new Set([
  'camping.md',
  'dm.md',
  'environment.md',
  'magic.md',
  'medicine.md',
  'natural-hazards.md',
  'overview.md',
  'preface-contents.md',
  'proficiencies.md',
  'title-credits.md',
  'vision.md',
  'weather-appendix.md',
  'weather-clothing.md',
  'what-is-it.md',
]);

const sourceRoot = resolve(process.argv[2] ?? '../manuscript');
const outputRoot = resolve('src/published/books');
const indexPath = resolve('src/data/published/books.json');
const searchPath = resolve('src/data/published/book-search.json');
const legacyRoot = resolve('../build/chm/content');
// CommonMark does not close **strong** before some Chinese punctuation when
// another CJK character follows immediately. Preserve the author's intended
// emphasis explicitly instead of showing literal asterisks on the site.
const fixEmphasis = (value: string) => value.replace(/\*\*([^*|\n]+)\*\*/g, (match, content: string, offset: number) => {
  if (value[offset - 1] === '\\' || /^\s|\s$/.test(content) || /[<>]/.test(content)) return match;
  return `<strong>${content}</strong>`;
});

const manifests = new Map<BookId, { title: string; title_en: string; topics: Topic[] }>();
const slugByFile = new Map<string, string>();
const aliases = new Map<string, string>();

for (const book of bookIds) {
  const manifest = JSON.parse(await readFile(join(sourceRoot, book, 'book.json'), 'utf8'));
  manifests.set(book, manifest);
  for (const topic of manifest.topics as Topic[]) {
    const sourceName = basename(topic.file, '.md');
    const key = `${book}/${sourceName}`;
    if (slugByFile.has(key) && slugByFile.get(key) !== topic.slug) throw new Error(`Repeated source file: ${key}`);
    slugByFile.set(key, topic.slug);
    aliases.set(`${book}/${topic.slug}`, topic.slug);
    aliases.set(key, topic.slug);
    if (topic.page && !aliases.has(`${book}/${topic.page}`)) aliases.set(`${book}/${topic.page}`, topic.slug);
  }
  for (const file of await readdir(join(sourceRoot, book, 'topics'))) {
    if (!file.endsWith('.md')) continue;
    const sourceName = basename(file, '.md');
    const key = `${book}/${sourceName}`;
    if (!aliases.has(key)) aliases.set(key, sourceName);
  }
  if (book === 'phb') {
    for (const file of await readdir(join(sourceRoot, book, 'overviews'))) {
      if (!file.endsWith('.md')) continue;
      const key = `${book}/${basename(file, '.md')}`;
      if (!aliases.has(key)) aliases.set(key, `overview-${basename(file, '.md')}`);
    }
  }
}

// The earlier CHM edition contains finished work-translation text for a number
// of PHB/DMG chapters that the newer, topic-split manuscript only names.
// Import the text and tables, but never the scanned art or HTML site chrome.
const stripTags = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_m, hex: string, decimal: string) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10))).replace(/\s+/g, ' ').trim();
const legacyGroup = (book: BookId, slug: string) => {
  if (book === 'dmg') return '旧版连续章节';
  if (/abilit|strength|intelligence|wisdom|dexterity|constitution|charisma/.test(slug)) return '角色属性';
  if (/race|elves|dwarves|gnomes|halflings|half-|humans|racial/.test(slug)) return '角色种族';
  if (/class|fighter|cleric|druid|paladin|ranger|thief|assassin|monk|illusionist|magic-user|bard/.test(slug)) return '角色职业';
  if (/spell|magic/.test(slug)) return '法术';
  if (/combat|weapon|armor|attack|saving/.test(slug)) return '战斗';
  if (/money|equip|encumbrance/.test(slug)) return '装备';
  if (/adventure|dungeon|time|distance|movement|trap/.test(slug)) return '冒险';
  return '原书其他章节';
};
async function importLegacy() {
for (const book of ['phb', 'dmg'] as const) {
  for (const file of (await readdir(join(legacyRoot, book))).filter((name) => name.endsWith('.html') && name !== 'index.html').sort()) {
    const slug = basename(file, '.html');
    const raw = new TextDecoder('gbk').decode(await readFile(join(legacyRoot, book, file)));
    const body = raw.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
    if (!body) continue;
    const titleHtml = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    if (!titleHtml) continue;
    const title = stripTags(titleHtml);
    let html = body.replace(/<p\b[^>]*class=["']?home-link["']?[^>]*>[\s\S]*?<\/p>/i, '')
      .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '')
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/\s(?:style|class|align|valign|width|height|border|cellpadding|cellspacing|bgcolor|face|size)=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/<a\b[^>]*href=(['"])([^'"]+)\1[^>]*>/gi, (_match, _quote: string, href: string) => {
        if (href.startsWith('#')) return `<a href="${href}">`;
        const target = href.match(/^(?:\.\.\/)?(phb|dmg|mm|ua)\/([^#?]+)\.html(#[^?]+)?$/i);
        if (target) return `<a href="/books/${target[1].toLowerCase()}/${target[2]}/${target[3] ?? ''}">`;
        const local = href.match(/^([^./#?]+)\.html(#[^?]+)?$/i);
        return local ? `<a href="/books/${book}/${local[1]}/${local[2] ?? ''}">` : '<span>';
      });
    // Do not leave orphan closing anchors when image-only links are discarded.
    html = html.replace(/<span>([\s\S]*?)<\/a>/gi, '<span>$1</span>');
    const plain = stripTags(html);
    const current = published.find((topic) => topic.book === book && topic.slug === slug);
    const currentText = current ? search.find((entry) => entry.book === book && entry.slug === slug)!.text : '';
    if (plain.length < (current ? 25 : 100)) continue;
    if (current && (currentText.length >= 120 || plain.length <= currentText.length)) continue;
    const markdown = html.trim().replace(/\r/g, '') + '\n';
    await writeFile(join(outputRoot, book, `${slug}.md`), markdown, 'utf8');
    if (current) {
      current.excerpt = plain.slice(0, 170);
      current.sourceFile = `build/chm/content/${book}/${file}`;
      search.find((entry) => entry.book === book && entry.slug === slug)!.text = plain;
    } else {
      published.push({ book, slug, title, titleEn: '', group: legacyGroup(book, slug), excerpt: plain.slice(0, 170), sourceFile: `build/chm/content/${book}/${file}` });
      search.push({ book, slug, title, titleEn: '', text: plain });
    }
  }
}
}

function rewriteTarget(target: string, book: BookId): string {
  if (/^(https?:|mailto:|#|\/)/i.test(target)) return target;
  const [file, fragment] = target.split('#', 2);
  if (!/\.(html|md)$/i.test(file)) return target;
  const normalized = posix.normalize(posix.join(book, file.replace(/\\/g, '/'))).replace(/\.(html|md)$/i, '');
  const slug = aliases.get(normalized);
  const targetBook = normalized.split('/')[0];
  if (!bookIds.includes(targetBook as BookId)) return '#';
  if (!slug) {
    const letter = normalized.match(/mm-letter-([a-z])$/i)?.[1];
    if (targetBook === 'mm' && letter) return `/books/mm/#letter-${letter.toUpperCase()}`;
    return `/books/${targetBook}/`;
  }
  return `/books/${targetBook}/${slug}/${fragment ? `#${fragment}` : ''}`;
}

const published: PublishedTopic[] = [];
const search: Array<{ book: BookId; slug: string; title: string; titleEn: string; text: string }> = [];

for (const book of bookIds) {
  const manifest = manifests.get(book)!;
  const byFile = new Map((manifest.topics as Topic[]).map((topic) => [basename(topic.file), topic]));
  const topicFiles = (await readdir(join(sourceRoot, book, 'topics'))).filter((file) => file.endsWith('.md')
    && !(book === 'dsg' && supersededDsgSources.has(file))
    && !(book === 'wsg' && supersededWsgSources.has(file)));
  const orderedFiles = [
    ...(manifest.topics as Topic[]).map((topic) => basename(topic.file)),
    ...topicFiles.filter((file) => !byFile.has(file)).sort()
  ];
  const seen = new Set<string>();
  await mkdir(join(outputRoot, book), { recursive: true });
  for (const file of orderedFiles) {
    if (seen.has(file)) continue;
    seen.add(file);
    const topic = byFile.get(file);
    const slug = topic?.slug ?? basename(file, '.md');
    const raw = await readFile(join(sourceRoot, book, 'topics', file), 'utf8');
    if (/<script\b|javascript:|\bon\w+\s*=/i.test(raw)) throw new Error(`Unsafe markup in ${book}/${file}`);
    const firstHeading = raw.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim() ?? slug;
    const title = topic?.title ?? firstHeading.replace(/\s+[A-Z][A-Za-z' -]*$/, '').trim();
    const titleEn = topic?.title_en ?? '';
    const group = topic?.group ?? (file.startsWith('appendix-') ? '附录续页' : '补充篇页');
    let markdown = raw.replace(/^#\s+.+\r?\n/, '');
    markdown = markdown.replace(/!\[[^\]]*\]\([^)]*\)\s*/g, '');
    markdown = markdown.replace(/<img\b[^>]*>/gi, '');
    markdown = markdown.replace(/\]\(([^)]+)\)/g, (_match, target: string) => `](${rewriteTarget(target, book)})`);
    markdown = markdown.replace(/href=(['"])([^'"]+)\1/g, (_match, quote: string, target: string) => `href=${quote}${rewriteTarget(target, book)}${quote}`);
    if (book === 'ua' && slug === 'ua-spell-tables') markdown += '\n\n- [牧师法术表](/books/ua/ua-cleric-spell-table/)\n- [德鲁伊法术表](/books/ua/ua-druid-spell-table/)\n- [魔法师法术表](/books/ua/ua-magic-user-spell-table/)\n- [幻术师法术表](/books/ua/ua-illusionist-spell-table/)';
    markdown = fixEmphasis(markdown.trim()) + '\n';
    await writeFile(join(outputRoot, book, `${slug}.md`), markdown, 'utf8');
    const text = markdown
      .replace(/<[^>]*>/g, ' ')
      .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.slice(1, match.indexOf(']')))
      .replace(/[#*_|>`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    published.push({ book, slug, title, titleEn, group, excerpt: text.slice(0, 170), sourceFile: `manuscript/${book}/topics/${file}` });
    search.push({ book, slug, title, titleEn, text });
  }
  if (book === 'phb') {
    for (const file of (await readdir(join(sourceRoot, book, 'overviews'))).filter((name) => name.endsWith('.md'))) {
      const sourceName = basename(file, '.md');
      const slug = aliases.get(`${book}/${sourceName}`);
      if (!slug?.startsWith('overview-')) continue;
      const raw = await readFile(join(sourceRoot, book, 'overviews', file), 'utf8');
      const firstHeading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? sourceName;
      let markdown = raw.replace(/^#\s+.+\r?\n/, '');
      markdown = markdown.replace(/!\[[^\]]*\]\([^)]*\)\s*/g, '').replace(/<img\b[^>]*>/gi, '');
      markdown = markdown.replace(/\]\(([^)]+)\)/g, (_match, target: string) => `](${rewriteTarget(target, book)})`);
      markdown = markdown.replace(/href=(['"])([^'"]+)\1/g, (_match, quote: string, target: string) => `href=${quote}${rewriteTarget(target, book)}${quote}`);
      await writeFile(join(outputRoot, book, `${slug}.md`), fixEmphasis(markdown.trim()) + '\n', 'utf8');
      const text = markdown.replace(/<[^>]*>/g, ' ').replace(/[#*_|>`~]/g, ' ').replace(/\s+/g, ' ').trim();
      published.push({ book, slug, title: firstHeading, titleEn: '', group: '原书章节概览', excerpt: text.slice(0, 170), sourceFile: `manuscript/${book}/overviews/${file}` });
      search.push({ book, slug, title: firstHeading, titleEn: '', text });
    }
  }
}

// men.md was a temporary catch-all: keep Men at its old URL, and publish
// Merman–Zombie as separate stable chapters under their real letter headings.
const mmSource = await readFile(join(sourceRoot, 'mm', 'topics', 'men.md'), 'utf8');
const mmSplit = splitMenManuscript(mmSource);
const menTopic = published.find((entry) => entry.book === 'mm' && entry.slug === 'mm-men');
const menSearch = search.find((entry) => entry.book === 'mm' && entry.slug === 'mm-men');
if (!menTopic || !menSearch) throw new Error('MM Men chapter missing from manifest');
const menMarkdown = fixEmphasis(mmSplit.men.replace(/^# .+\n/, '').replace(/!\[[^\]]*\]\([^)]*\)\s*/g, '').trim()) + '\n';
await writeFile(join(outputRoot, 'mm', 'mm-men.md'), menMarkdown, 'utf8');
menSearch.text = menMarkdown.replace(/[#*_|>`~]/g, ' ').replace(/\s+/g, ' ').trim();
menTopic.excerpt = menSearch.text.slice(0, 170);
for (const section of mmSplit.monsters) {
  const markdown = fixEmphasis(section.markdown.replace(/^# .+\n/, '').replace(/!\[[^\]]*\]\([^)]*\)\s*/g, '').trim()) + '\n';
  await writeFile(join(outputRoot, 'mm', `${section.slug}.md`), markdown, 'utf8');
  const text = markdown.replace(/<[^>]*>/g, ' ').replace(/[#*_|>`~]/g, ' ').replace(/\s+/g, ' ').trim();
  published.push({ book: 'mm', slug: section.slug, title: section.title, titleEn: section.titleEn, group: '怪物条目', excerpt: text.slice(0, 170), sourceFile: 'manuscript/mm/topics/men.md' });
  search.push({ book: 'mm', slug: section.slug, title: section.title, titleEn: section.titleEn, text });
}

await importLegacy();
const validChapters = new Set(published.map((topic) => `${topic.book}/${topic.slug}`));
for (const topic of published) {
  const path = join(outputRoot, topic.book, `${topic.slug}.md`);
  const markdown = await readFile(path, 'utf8');
  const repaired = markdown.replace(/\/books\/(phb|dmg|mm|ua)\/([a-z0-9-]+)\//g, (href, book: string, slug: string) => validChapters.has(`${book}/${slug}`) ? href : `/books/${book}/`);
  if (repaired !== markdown) await writeFile(path, repaired, 'utf8');
}
await mkdir(resolve('src/data/published'), { recursive: true });
await writeFile(indexPath, `${JSON.stringify(published, null, 2)}\n`, 'utf8');
await writeFile(searchPath, `${JSON.stringify(search)}\n`, 'utf8');
console.log(`Imported ${published.length} translated topics: ${bookIds.map((book) => `${book} ${published.filter((topic) => topic.book === book).length}`).join(', ')}.`);
console.log('Source scans and original illustrations were not copied.');
