import catalog from '../../../../terminology/catalog.json';

export const prerender = true;

const entries = catalog.entries
  .filter(entry => entry.en && entry.zh)
  .map(entry => ({
    id: entry.key,
    en: entry.en,
    zh: entry.zh,
    category: entry.category,
    status: entry.status,
    verificationScope: entry.verificationScope ?? null,
    aliases: entry.legacyZh ?? [],
    englishVariants: entry.englishVariants ?? [],
    activeIds: entry.activeIds ?? [],
    references: (entry.references ?? []).map(reference => ({
      edition: reference.edition ?? null,
      source: reference.source ?? null,
      world: reference.world ?? null,
      page: reference.page ?? null,
      url: reference.url ?? null,
      entryUrl: reference.entryUrl ?? null,
    })),
    occurrences: (entry.occurrences ?? []).map(occurrence => ({
      path: occurrence.path,
      location: occurrence.location,
      zh: occurrence.zh,
    })),
    notes: entry.notes ?? [],
  }));

export function GET() {
  return new Response(JSON.stringify({
    schemaVersion: '1.0.0',
    total: entries.length,
    translationPriority: ['3R', '5E', '5R'],
    statusDefinitions: {
      'verified-exact': '名称与所列中英参考精确对应；不代表 AD&D 1E 规则机制已逐句审校。',
      pending: '暂译或候选，尚未核定为规范译名。',
      'adapted-variant': '已记录适用范围和调整理由的译名变体。',
      'adapted-element': '仅部分名称语素已核实，完整名称仍待核。',
      'reference-conflict': '来源或语境中的译名存在分歧，需按具体用法判断。',
      'reference-only': '其他版本或设定名称参考，不直接作为 AD&D 1E 定译。',
    },
    entries,
  }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
