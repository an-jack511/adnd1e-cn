/** The working MM manuscript keeps Merman–Zombie after the Men article. */
export type MmSection = { slug: string; title: string; titleEn: string; letter: string; markdown: string };

export function splitMenManuscript(source: string): { men: string; monsters: MmSection[] } {
  const text = source.replace(/\r\n?/g, '\n');
  const headings = [...text.matchAll(/^## (.+)$/gm)];
  const first = headings.findIndex((match) => /\bMerman\b/.test(match[1]));
  if (first < 0) throw new Error('MM men.md: Merman boundary not found');
  const men = text.slice(0, headings[first].index).trimEnd() + '\n';
  const monsters = headings.slice(first).map((match, index, rest) => {
    const english = match[1].match(/[A-Z][A-Za-z0-9 ,’'()\-]+/)?.[0]?.trim().replace(/[,( ]+$/, '') ?? '';
    const title = match[1].slice(0, match[1].indexOf(english)).trim();
    if (!english || !title) throw new Error(`MM heading could not be split: ${match[1]}`);
    const bare = english.replace(/\([^)]*\)/g, '').trim();
    const canonical = bare.match(/^(.+), Giant$/) ? `Giant ${bare.match(/^(.+), Giant$/)![1]}` : bare;
    const id = canonical.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const start = match.index!;
    const end = rest[index + 1]?.index ?? text.length;
    return { slug: `mm-${id}`, title, titleEn: bare, letter: bare[0].toUpperCase(), markdown: `# ${title} ${bare}\n${text.slice(start + match[0].length, end).trimEnd()}\n` };
  });
  if (new Set(monsters.map((entry) => entry.slug)).size !== monsters.length) throw new Error('MM split produced duplicate slugs');
  return { men, monsters };
}
