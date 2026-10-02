/**
 * Copy explicitly selected local work translations into this public site.
 * This script is manual: the Cloudflare build never reads the parent manuscript.
 * Only Markdown text is imported; scans and source illustrations are excluded.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, posix, resolve } from 'node:path';

const bookIds = ['phb', 'dmg', 'mm'] as const;
type BookId = typeof bookIds[number];
type Topic = { slug: string; title: string; title_en?: string; group?: string; page?: string; file: string };
type PublishedTopic = { book: BookId; slug: string; title: string; titleEn: string; group: string; excerpt: string; sourceFile: string };

const sourceRoot = resolve(process.argv[2] ?? '../manuscript');
const outputRoot = resolve('src/published/books');
const indexPath = resolve('src/data/published/books.json');
const searchPath = resolve('src/data/published/book-search.json');

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
  const topicFiles = (await readdir(join(sourceRoot, book, 'topics'))).filter((file) => file.endsWith('.md'));
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
    markdown = markdown.trim() + '\n';
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
      await writeFile(join(outputRoot, book, `${slug}.md`), markdown.trim() + '\n', 'utf8');
      const text = markdown.replace(/<[^>]*>/g, ' ').replace(/[#*_|>`~]/g, ' ').replace(/\s+/g, ' ').trim();
      published.push({ book, slug, title: firstHeading, titleEn: '', group: '原书章节概览', excerpt: text.slice(0, 170), sourceFile: `manuscript/${book}/overviews/${file}` });
      search.push({ book, slug, title: firstHeading, titleEn: '', text });
    }
  }
}

await mkdir(resolve('src/data/published'), { recursive: true });
await writeFile(indexPath, `${JSON.stringify(published, null, 2)}\n`, 'utf8');
await writeFile(searchPath, `${JSON.stringify(search)}\n`, 'utf8');
console.log(`Imported ${published.length} translated topics: ${bookIds.map((book) => `${book} ${published.filter((topic) => topic.book === book).length}`).join(', ')}.`);
console.log('Source scans and original illustrations were not copied.');
