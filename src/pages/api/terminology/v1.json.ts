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
    senses: entry.senses ?? [],
  }));

export function GET() {
  return new Response(JSON.stringify({
    schemaVersion: '1.0.0',
    total: entries.length,
    translationPriority: ['3R', '5E', '5R'],
    statusDefinitions: {
      'verified-exact': '名称与所列中英参考精确对应；不代表 AD&D 1E 规则机制已逐句审校。',
      pending: '仅用于原词、来源文本或关键语境尚未辨明；不能仅因未找到后续版译名而使用。',
      'adapted-variant': '已确定并记录范围与理由的中文主译；译名可依据对应 1E 原词的适用版本证据，或在按 3R→5E→5R 检索后依既有术语与 D&D 翻译惯例自译。自译不是官方译名，核对方法见 verificationScope。',
      'adapted-element': '仅部分名称语素已核实，完整名称仍待核。',
      'reference-conflict': '来源或语境中的译名存在分歧，需按具体用法判断。',
      'reference-only': '兼容旧数据的状态；新目录不以跨版本参考词项创建独立条目。若出现此状态，必须能追溯到 AD&D 1E 原文词项。',
    },
    entries,
  }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
