import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import type { Spell } from '../../src/schemas';

const root = resolve('../manuscript/ua/topics');
const existing = JSON.parse(readFileSync(resolve('src/data/public/spells-imported.json'), 'utf8')) as Spell[];
const clean = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const className: Record<string, string> = { cleric: 'Cleric', druid: 'Druid', 'magic-user': 'Magic-User', illusionist: 'Illusionist' };
const pages = JSON.parse(readFileSync(resolve('src/data/published/books.json'), 'utf8')) as { book: string; slug: string; sourceFile: string }[];
const result: Spell[] = [];
for (const file of readdirSync(root).filter((name) => /^(cleric|druid|magic-user|illusionist)-(?:spells-\d+|cantrips?(?:-[a-z0-9]+)?)\.md$/.test(name)).sort()) {
  const stem = basename(file, '.md');
  const cls = Object.keys(className).find((name) => stem.startsWith(`${name}-`))!;
  const level = Number(stem.match(/spells-(\d+)/)?.[1] ?? 0);
  const chapter = pages.find((page) => page.book === 'ua' && page.sourceFile.endsWith(`/${file}`));
  if (!chapter) throw new Error(`UA published chapter missing: ${file}`);
  const body = readFileSync(resolve(root, file), 'utf8');
  const chunks = body.split(/^##\s+/m).slice(1);
  for (const chunk of chunks) {
    const [heading, ...rest] = chunk.split(/\r?\n/);
    const match = heading.match(/^(.+?)\s+([A-Za-z][A-Za-z'’ ,\-/]+?)(?:（|\(|$)/);
    if (!match) continue;
    const nameZh = clean(match[1]);
    const nameEn = clean(match[2]);
    const text = rest.join('\n');
    const row = (key: string) => clean(text.match(new RegExp(`\\| ${key} \\| ([^|]+) \\|`))?.[1] ?? '');
    const fourth = (key: string) => clean(text.match(new RegExp(`\\|[^\\n]+\\| ${key} \\| ([^|]+) \\|`))?.[1] ?? '');
    const componentsText = fourth('法术成分');
    const components = ([['言语', 'V'], ['姿势', 'S'], ['材料', 'M']] as const).filter(([zh]) => componentsText.includes(zh)).map(([, en]) => en);
    const paragraphs = text.split(/\n\s*\n/).map(clean).filter((line) => line && !line.startsWith('|') && !line.startsWith('![') && !line.startsWith('>'));
    const description = paragraphs.filter((line) => !/^(以下|原书|译注|参见)/.test(line)).slice(0, 3).join(' ').slice(0, 1200);
    if (!description || (level > 0 && !row('等级'))) continue;
    const isExisting = existing.some((entry) => entry.nameEn.toLowerCase() === nameEn.toLowerCase() && entry.classes.includes(className[cls]) && entry.level === level);
    if (isExisting) continue;
    const school = heading.match(/（([^）]+)）/)?.[1]?.replace(/\s+[A-Za-z].*$/, '') ?? '见正文';
    const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `ua-${cls}-${level}-${slug}`;
    result.push({ id, nameZh, nameEn, classes: [className[cls]], level, school, components: components.length ? components : ['V', 'S'], castingTime: fourth('施法时间') || clean(text.match(/\*\*施法时间：\*\*([^。\n]+)/)?.[1] ?? '') || '见正文', range: row('距离') || '见正文', duration: row('持续时间') || '见正文', areaOfEffect: row('影响范围') || clean(text.match(/\*\*影响范围：\*\*([^。\n]+)/)?.[1] ?? '') || '见正文', savingThrow: fourth('豁免') || '见正文', reversible: /可逆|逆法术/.test(text), description, tags: level === 0 ? ['小法术'] : [], source: [{ book: 'UA', section: chapter.slug }] });
  }
}
const ids = result.map((entry) => entry.id);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate UA spell id');
writeFileSync(resolve('src/data/public/ua-spells-imported.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Imported ${result.length} UA spell entries.`);
