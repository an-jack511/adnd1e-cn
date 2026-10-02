import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Spell } from '../../src/schemas';

const sourceRoot = resolve('../manuscript/phb/topics');
const classFiles = [
  ['Cleric', 'spell-explanations-clerics.md'],
  ['Druid', 'spell-explanations-druids.md'],
  ['Magic-User', 'spell-explanations-magic-users.md'],
  ['Illusionist', 'spell-explanations-illusionists.md']
] as const;
const clean = (value: string) => value.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
const slugify = (value: string) => value.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byId = new Map<string, Spell>();
const skipped: string[] = [];

for (const [characterClass, file] of classFiles) {
  const markdown = readFileSync(resolve(sourceRoot, file), 'utf8');
  for (const chunk of markdown.split(/(?=^###\s)/m).slice(1)) {
    const heading = chunk.match(/^###\s+([^\n]+)/)?.[1] ?? '';
    const meta = chunk.match(/<div\s+class="spell-meta"\s*>([\s\S]*?)<\/div>/i);
    if (!meta) continue;
    const name = clean(heading.match(/^\*([^*]+)\*/)?.[1] ?? heading.split('（')[0]);
    const english = name.match(/([A-Z][A-Za-z0-9,'’() /-]+)$/)?.[1]?.trim() ?? '';
    const chinese = name.slice(0, name.length - english.length).trim();
    if (!english || !chinese) { skipped.push(`${file}: ${heading}`); continue; }
    const lines = meta[1].split(/<br\s*\/?\s*>/i).map(clean);
    const field = (label: string) => lines.find((line) => line.includes(label))?.split('：').slice(1).join('：').trim() ?? '';
    const level = Number(field('等级 Level'));
    if (!Number.isInteger(level) || level < 1) { skipped.push(`${file}: ${heading}`); continue; }
    const school = clean([...heading.matchAll(/（([^）]+)）/g)].at(-1)?.[1] ?? '未注明').replace(/，?可逆\s*Reversible/i, '').trim();
    const components = (field('成分 Components').match(/[VSM]/g) ?? []) as Spell['components'];
    const rest = chunk.slice(chunk.indexOf(meta[0]) + meta[0].length).split(/(?=^##\s)/m)[0];
    const description = clean(rest).slice(0, 5000);
    const baseId = slugify(english);
    const key = byId.has(baseId) && byId.get(baseId)?.level !== level ? `${baseId}-level-${level}` : baseId;
    const source = { book: 'PHB', section: `Spell Explanations: ${characterClass}` };
    const existing = byId.get(key);
    if (existing) {
      if (!existing.classes.includes(characterClass)) existing.classes.push(characterClass);
      existing.source.push(source);
      continue;
    }
    byId.set(key, {
      id: key, nameZh: chinese, nameEn: english, classes: [characterClass], level, school,
      components, castingTime: field('施法时间 Casting Time') || '见正文',
      range: field('距离 Range') || '见正文', duration: field('持续时间 Duration') || '见正文',
      areaOfEffect: field('影响范围 Area of Effect') || '见正文', savingThrow: field('豁免检定 Saving Throw') || '见正文',
      reversible: /可逆|Reversible/i.test(heading), description,
      tags: [characterClass], source: [source]
    });
  }
}

const spells = [...byId.values()];
writeFileSync(resolve('src/data/public/spells-imported.json'), `${JSON.stringify(spells, null, 2)}\n`);
console.log(`Imported ${spells.length} PHB spells. Skipped ${skipped.length} headings.`);
if (skipped.length) console.log(skipped.slice(0, 12).join('\n'));
