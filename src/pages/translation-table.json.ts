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
      senses: entry.senses ?? [],
      references: (entry.references ?? []).map(reference => ({
        edition: reference.edition ?? null,
        world: reference.world ?? null,
        source: reference.source ?? null,
        page: reference.page ?? null,
        url: reference.url ?? null,
        entryUrl: reference.entryUrl ?? null,
      })),
    }));
  return new Response(JSON.stringify({ entries }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
