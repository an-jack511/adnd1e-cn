import catalog from '../../terminology/catalog.json';

export function GET() {
  const entries = catalog.entries
    .filter(entry => entry.en && entry.zh)
    .map(entry => ({
      en: entry.en,
      zh: entry.zh,
      category: entry.category,
      status: entry.status,
      aliases: entry.legacyZh ?? [],
      englishVariants: entry.englishVariants ?? [],
      references: [...new Set((entry.references ?? []).map(reference => [
        reference.edition,
        reference.world,
        reference.source,
        reference.page ? `p. ${reference.page}` : '',
      ].filter(Boolean).join(' · ')))],
    }));
  return new Response(JSON.stringify({ entries }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
