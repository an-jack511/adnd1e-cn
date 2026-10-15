import candidate from './schemas/character-v1.1.schema.json';
import projection from './schemas/player-projection.schema.json';
import { z } from 'zod';

/** Read-only inspection. No domain reducer, storage, clocks, RNG or creation imports. */
export const ARCHIVE_LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, depth: 64, nodes: 100_000, diagnostics: 100 });
export type ArchiveKind = 'full-candidate' | 'projection' | 'creation-draft' | 'legacy-assertions' | 'unknown-major' | 'unsupported-version' | 'unknown' | 'invalid';
export type Diagnostic = { code: string; path: string; severity: 'error' | 'warning'; message: string };
export type Check = 'not-run' | 'passed' | 'partial' | 'failed';
export type LegacyAssertion = { id: string; path: string; value: unknown; basis: 'legacy-asserted' };
export type ArchivePreview = {
  kind: ArchiveKind; readOnly: true; canStage: boolean; restoresPrivateArchive: boolean;
  originalText: string | null; diagnostics: Diagnostic[];
  validation: { syntax: Check; structure: Check; registeredPayloads: Check; references: Check;
    fullSchemaValidated: false; rulesValidated: false; admissionValidated: false };
  summary: { name: string | null; characterId: string | null; schemaVersion: string | null };
  data: unknown | null;
  legacy: null | { assertions: LegacyAssertion[]; unresolved: LegacyAssertion[]; unmappedLegacy: Record<string, unknown>;
    originalRolls: null; inferredInventory: null; inferredMoney: null; inferredMemory: null };
  replay: null | { checkpointSequence: number; lastInspectableSequence: number; hasUnknownTail: boolean; executable: false };
};
const originals = new WeakMap<ArchivePreview, { text: string | null; bytes: Uint8Array }>();
type Obj = Record<string, any>;
const object = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (v: Obj, key: string) => Object.prototype.hasOwnProperty.call(v, key);
const pointer = (base: string, key: string | number) => `${base}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
const knownEvents = new Set(candidate.$defs.event.properties.type.enum);
const equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (object(a) && object(b)) {
    const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k => own(b, k) && equal(a[k], b[k]));
  }
  return false;
};

/** Bounded checker for the explicitly used candidate keywords, not a general JSON Schema implementation. */
function schemaCheck(value: unknown, schema: any, root: any, path: string, fail: (code: string, path: string) => void): void {
  if (schema === true) return;
  if (schema === false) { fail('STRUCTURE', path); return; }
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/')) { fail('SCHEMA_UNSUPPORTED', path); return; }
    let ref = root;
    for (const k of schema.$ref.slice(2).split('/')) ref = ref?.[k.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (!ref) { fail('SCHEMA_UNSUPPORTED', path); return; }
    schemaCheck(value, ref, root, path, fail); return;
  }
  const supported = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties',
    'items', 'enum', 'const', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems', 'allOf', 'oneOf', 'if', 'then', 'else']);
  for (const k of Object.keys(schema)) if (!supported.has(k)) fail('SCHEMA_UNSUPPORTED', path);
  if (own(schema, 'const') && !equal(value, schema.const)) fail('STRUCTURE', path);
  if (schema.enum && !schema.enum.some((v: unknown) => equal(v, value))) fail('STRUCTURE', path);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = types.some((t: string) => t === 'null' ? value === null : t === 'object' ? object(value) : t === 'array' ? Array.isArray(value)
      : t === 'integer' ? typeof value === 'number' && Number.isSafeInteger(value)
      : t === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === t);
    if (!matches) { fail('STRUCTURE', path); return; }
  }
  if (typeof value === 'number' && ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) fail('STRUCTURE', path);
  if (typeof value === 'string' && ((schema.minLength !== undefined && Array.from(value).length < schema.minLength) || (schema.maxLength !== undefined && Array.from(value).length > schema.maxLength))) fail('STRUCTURE', path);
  if (object(value)) {
    for (const k of schema.required ?? []) if (!own(value, k)) fail('STRUCTURE', pointer(path, k));
    for (const k of Object.keys(value).sort()) {
      if (own(schema.properties ?? {}, k)) schemaCheck(value[k], schema.properties[k], root, pointer(path, k), fail);
      else if (schema.additionalProperties === false) fail('STRUCTURE', pointer(path, k));
      else if (object(schema.additionalProperties)) schemaCheck(value[k], schema.additionalProperties, root, pointer(path, k), fail);
    }
  }
  if (Array.isArray(value)) {
    if ((schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) fail('STRUCTURE', path);
    // Canonical keys keep uniqueness checks bounded instead of quadratic for untrusted arrays.
    if (schema.uniqueItems) {
      const canonical = (v: any): string => object(v) ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
        : Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : JSON.stringify(v);
      const keys = value.map(canonical); if (new Set(keys).size !== keys.length) fail('STRUCTURE', path);
    }
    if (schema.items) value.forEach((v, i) => schemaCheck(v, schema.items, root, pointer(path, i), fail));
  }
  for (const part of schema.allOf ?? []) schemaCheck(value, part, root, path, fail);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((part: any) => { let valid = true; schemaCheck(value, part, root, path, () => { valid = false; }); return valid; });
    if (matches.length !== 1) fail('STRUCTURE', path);
  }
  if (schema.if) {
    let matches = true; schemaCheck(value, schema.if, root, path, () => { matches = false; });
    const branch = matches ? schema.then : schema.else; if (branch) schemaCheck(value, branch, root, path, fail);
  }
}

function references(card: Obj, fail: (code: string, path: string) => void): void {
  const facts = card.checkpoint.facts;
  const sets = new Map<string, Set<string>>();
  const collect = (name: string, rows: Obj[], path: string) => {
    const ids = new Set<string>();
    rows.forEach((row, i) => { if (typeof row.id !== 'string' || !row.id || ids.has(row.id)) fail('DUPLICATE_OR_EMPTY_ID', `${path}/${i}/id`); ids.add(row.id); });
    sets.set(name, ids);
  };
  collect('event', card.events, '/events'); collect('roll', card.rolls, '/rolls');
  collect('source', card.rules.sources, '/rules/sources'); collect('definition', card.rules.definitions, '/rules/definitions');
  collect('decision', card.rules.decisions, '/rules/decisions');
  for (const [name, rows, path] of [
    ['career', facts.careers, '/checkpoint/facts/careers'], ['award', facts.hpAwards, '/checkpoint/facts/hpAwards'],
    ['inventory', facts.resources.inventory, '/checkpoint/facts/resources/inventory'], ['location', facts.resources.locations, '/checkpoint/facts/resources/locations'],
    ['wallet', facts.resources.wallets, '/checkpoint/facts/resources/wallets'], ['book', facts.magic.books, '/checkpoint/facts/magic/books'],
    ['memory', facts.magic.memory, '/checkpoint/facts/magic/memory'],
  ] as const) collect(name, rows, path);
  const ref = (name: string, id: unknown, path: string, nullable = false) => {
    if (nullable && id === null) return;
    if (typeof id !== 'string' || !sets.get(name)?.has(id)) fail('MISSING_REFERENCE', path);
  };
  const walk = (v: any, path: string) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, pointer(path, i))); return; }
    if (!object(v)) return;
    for (const [k, x] of Object.entries(v)) {
      const p = pointer(path, k);
      if (k === 'sourceIds' || k === 'rollIds' || k === 'dieRollIds' || k === 'careerEventIds' || k === 'checkEventIds') {
        if (Array.isArray(x)) x.forEach((id, i) => ref(k === 'sourceIds' ? 'source' : k === 'rollIds' || k === 'dieRollIds' ? 'roll' : 'event', id, pointer(p, i)));
      } else if (k === 'eventId' || k === 'preparedEventId' || k === 'spentEventId' || k === 'qualificationEventId') ref('event', x, p, true);
      else if (k === 'careerId') ref('career', x, p);
      else if (k === 'locationId') ref('location', x, p);
      else if (k === 'awardId' || k === 'hpAwardId') ref('award', x, p);
      else if (k === 'decisionId') ref('decision', x, p, true);
      walk(x, p);
    }
  };
  // Free-form notes, rule definitions, cache and extensions may contain external IDs: do not guess their namespaces.
  walk(facts.careers, '/checkpoint/facts/careers'); walk(facts.hpAwards, '/checkpoint/facts/hpAwards');
  walk(facts.resources, '/checkpoint/facts/resources'); walk(facts.magic, '/checkpoint/facts/magic');
  card.rules.definitions.forEach((v: Obj, i: number) => v.sourceIds.forEach((id: string, j: number) => ref('source', id, `/rules/definitions/${i}/sourceIds/${j}`)));
  facts.careerPath.careerIds.forEach((id: string, i: number) => ref('career', id, `/checkpoint/facts/careerPath/careerIds/${i}`));
  const eventsById = new Map<string, Obj>(card.events.map((e: Obj) => [e.id, e]));
  const sequences = new Set<number>(); let last = 0;
  card.events.forEach((e: Obj, i: number) => {
    const p = `/events/${i}`;
    if (sequences.has(e.sequence) || e.sequence <= last) fail('EVENT_SEQUENCE', `${p}/sequence`);
    sequences.add(e.sequence); last = e.sequence;
    ref('event', e.parentId, `${p}/parentId`, true); ref('event', e.supersedesId, `${p}/supersedesId`, true);
    if (e.parentId !== null) { const parent = eventsById.get(e.parentId); if (parent && parent.sequence >= e.sequence) fail('EVENT_SEQUENCE', `${p}/parentId`); }
    walk({ sourceIds: e.sourceIds, rollIds: e.rollIds }, p);
    if (e.type === 'creation.abilities-generated') for (const k of abilityKeys) ref('roll', e.payload.assignment[k], `${p}/payload/assignment/${k}`);
    if (knownEvents.has(e.type)) walk(e.payload, `${p}/payload`);
  });
  card.rolls.forEach((r: Obj, i: number) => {
    walk(r, `/rolls/${i}`);
    if (new Set(r.keptIndices).size !== r.keptIndices.length || r.keptIndices.some((k: number) => k >= r.faces.length)) fail('ROLL_INDICES', `/rolls/${i}/keptIndices`);
    const event = eventsById.get(r.eventId);
    if (event && !event.rollIds.includes(r.id)) fail('MISSING_REFERENCE', `/rolls/${i}/eventId`);
  });
  const locationsById = new Map<string, Obj>(facts.resources.locations.map((l: Obj) => [l.id, l]));
  facts.resources.locations.forEach((l: Obj, i: number) => {
    ref('location', l.parentId, `/checkpoint/facts/resources/locations/${i}/parentId`, true);
    ref('inventory', l.containerInstanceId, `/checkpoint/facts/resources/locations/${i}/containerInstanceId`, true);
    const seen = new Set<string>(); let at: Obj | undefined = l;
    while (at) { if (seen.has(at.id)) { fail('LOCATION_CYCLE', `/checkpoint/facts/resources/locations/${i}/parentId`); break; } seen.add(at.id); at = locationsById.get(at.parentId); }
  });
  if (card.cache.throughSequence > Math.max(card.checkpoint.atSequence, last)) fail('CACHE_SEQUENCE', '/cache/throughSequence');
}

const abilityKeys = ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'];
function inspectDraft(v: Obj, fail: (code: string, path: string) => void): void {
  const id = z.string().min(1), method = z.enum(['DMG:I', 'DMG:II', 'DMG:III', 'DMG:IV']);
  const score = z.object(Object.fromEntries(abilityKeys.map(k => [k, z.number().int().min(3).max(18)]))).strict();
  const batch = z.object({ id, method, createdAt: id, candidates: z.array(z.array(z.number().int().min(1).max(6))).max(72) }).strict();
  const choice = z.array(z.number().int().nonnegative()).length(6).nullable();
  const schema = z.object({ format: z.literal('adnd1e-creation-draft'), schemaVersion: z.literal('1.0.0'), id,
    revision: z.number().int().nonnegative(), name: z.string().max(200),
    profile: z.object({ books: z.tuple([z.literal('PHB'), z.literal('DMG'), z.literal('MM')]), abilityMethod: method,
      algorithm: z.literal('dmg-ability-generation-v1'), source: z.object({ book: z.literal('DMG'), printedPage: z.literal(11), section: z.literal('Generation of Ability Scores') }).strict() }).strict(),
    activeBatch: batch.nullable(), choices: choice, scores: score.nullable(),
    history: z.array(z.object({ batch, choices: choice, scores: score.nullable() }).strict()).max(200),
    audit: z.array(z.object({ at: id, action: z.enum(['generated', 'assigned', 'named', 'copied']), batchId: id.nullable() }).strict()).max(1000),
  }).strict();
  const result = schema.safeParse(v);
  if (!result.success) { result.error.issues.forEach(e => fail('DRAFT_STRUCTURE', e.path.reduce<string>((p, k) => pointer(p, String(k)), ''))); return; }
  const snapshots = [{ batch: v.activeBatch, choices: v.choices, scores: v.scores }, ...v.history];
  const ids = new Set<string>();
  snapshots.forEach((s: Obj, n: number) => {
    const path = n === 0 ? '' : `/history/${n - 1}`;
    const b = s.batch;
    if (!b) { if (s.choices || s.scores) fail('DRAFT_INTEGRITY', path); return; }
    if (ids.has(b.id)) fail('DUPLICATE_OR_EMPTY_ID', `${path}/batch/id`); ids.add(b.id);
    const counts: Record<string, number> = { 'DMG:I': 6, 'DMG:II': 12, 'DMG:III': 36, 'DMG:IV': 72 };
    const count = counts[b.method];
    if (b.candidates.length !== count || b.candidates.some((r: number[]) => r.length !== (b.method === 'DMG:I' ? 4 : 3))) { fail('DRAFT_INTEGRITY', path); return; }
    if (!s.choices) { if (s.scores) fail('DRAFT_INTEGRITY', path); return; }
    const c: number[] = s.choices, totals: number[] = b.candidates.map((r: number[]) => [...r].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0));
    let valid = new Set(c).size === 6 && c.every(i => i < count);
    if (b.method === 'DMG:II') valid &&= equal(c.map(i => totals[i]).sort((a, b) => b - a), [...totals].sort((a, b) => b - a).slice(0, 6));
    if (b.method === 'DMG:III') valid &&= c.every((i, a) => Math.floor(i / 6) === a && totals[i] === Math.max(...totals.slice(a * 6, a * 6 + 6)));
    if (b.method === 'DMG:IV') valid &&= c.every((i, a) => Math.floor(i / 6) === Math.floor(c[0] / 6) && i % 6 === a);
    if (!s.scores || !abilityKeys.every((k, i) => s.scores[k] === totals[c[i]]) || !valid) fail('DRAFT_INTEGRITY', path);
  });
  if (v.activeBatch && v.activeBatch.method !== v.profile.abilityMethod) fail('DRAFT_INTEGRITY', '/profile/abilityMethod');
  v.audit.forEach((a: Obj, i: number) => { if (a.batchId !== null && !ids.has(a.batchId)) fail('MISSING_REFERENCE', `/audit/${i}/batchId`); });
}

/** Accepts a string (exact original preserved), or bytes (fatal UTF-8 decode; bytes always preserved). */
export function inspectArchive(bytes: string | Uint8Array): ArchivePreview {
  // Copy into a plain Uint8Array: Node Buffer.slice() would otherwise retain a mutable view.
  const rawBytes = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes);
  let text: string | null = typeof bytes === 'string' ? bytes : null;
  const preview: ArchivePreview = { kind: 'invalid', readOnly: true, canStage: false, restoresPrivateArchive: false,
    originalText: text, diagnostics: [], validation: { syntax: 'not-run', structure: 'not-run', registeredPayloads: 'not-run', references: 'not-run', fullSchemaValidated: false, rulesValidated: false, admissionValidated: false },
    summary: { name: null, characterId: null, schemaVersion: null }, data: null, legacy: null, replay: null };
  const messages: Record<string, string> = {
    SIZE_LIMIT: '文件超过检查大小上限；原件仍可取回。', DEPTH_LIMIT: '文件嵌套超过检查上限。', NODE_LIMIT: '文件节点超过检查上限。',
    INVALID_UTF8: '字节不是有效UTF-8；只保留原始字节。', INVALID_JSON: 'JSON无法解析；未生成或覆盖人物。', ROOT_OBJECT: '档案根节点必须为对象。',
    UNSAFE_KEY: '含不支持的对象键，已停止检查。', NON_FINITE: '数值超出有限或安全整数范围。', STRUCTURE: '候选字段结构不符合已登记约束。',
    SCHEMA_UNSUPPORTED: '遇到检查器未支持的schema约束，不能认证结构。', DUPLICATE_OR_EMPTY_ID: 'ID为空或在该命名空间重复。',
    MISSING_REFERENCE: '引用未在相应记录集合找到。', EVENT_SEQUENCE: '事件顺序或父事件关系不一致。', ROLL_INDICES: '采用骰索引重复或越界。',
    LOCATION_CYCLE: '携带位置引用形成循环。', CACHE_SEQUENCE: '缓存声称覆盖尚不存在的记录。', DRAFT_STRUCTURE: '创建草稿结构不符合草稿契约。',
    DRAFT_INTEGRITY: '草稿骰组、方法、选择或结果不一致。', UNKNOWN_EVENT: '存在未登记事件；只读保留，禁止自动重放尾部。',
    UNKNOWN_MAJOR: '未知主要版本；仅保全和只读，不迁移为当前版本。', UNSUPPORTED_VERSION: '该具体版本尚无检查契约；仅保全和只读。',
    UNKNOWN_FORMAT: '未识别为支持的档案格式。', LEGACY_ASSERTIONS: '旧值仅是断言；法术用途、物品数量和规则来源须另行确认。',
    PARTIAL_VALIDATION: '仅完成已支持结构和选定引用检查；未验证全部schema语义、规则、资源守恒或DM认可。',
    PROJECTION_ONLY: '这是公开摘要，不能恢复或覆盖私密人物档案。', RULES_NOT_RESOLVED: '规则包未加载或核验；不能据此自动复算。',
  };
  const add = (code: string, path = '', severity: 'error' | 'warning' = 'error') => {
    if (preview.diagnostics.length < ARCHIVE_LIMITS.diagnostics && !preview.diagnostics.some(d => d.code === code && d.path === path)) preview.diagnostics.push({ code, path, severity, message: messages[code] ?? '检查未完成。' });
  };
  const finish = () => { preview.originalText = text; originals.set(preview, { text, bytes: rawBytes }); return preview; };
  if (rawBytes.byteLength > ARCHIVE_LIMITS.bytes) { add('SIZE_LIMIT'); return finish(); }
  if (text === null) { try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(rawBytes); } catch { add('INVALID_UTF8'); return finish(); } }
  let depth = 0, quoted = false, escaped = false;
  for (const ch of text) {
    if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; }
    else if (ch === '"') quoted = true;
    else if (ch === '{' || ch === '[') { if (++depth > ARCHIVE_LIMITS.depth) { add('DEPTH_LIMIT'); return finish(); } }
    else if (ch === '}' || ch === ']') depth--;
  }
  let value: unknown;
  try { value = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text); preview.validation.syntax = 'passed'; }
  catch { preview.validation.syntax = 'failed'; add('INVALID_JSON'); return finish(); }
  if (!object(value)) { add('ROOT_OBJECT'); return finish(); }
  const stack = [{ value: value as any, path: '' }]; let nodes = 0;
  while (stack.length) {
    const item = stack.pop()!; if (++nodes > ARCHIVE_LIMITS.nodes) { add('NODE_LIMIT'); return finish(); }
    if (typeof item.value === 'number' && (!Number.isFinite(item.value) || (Number.isInteger(item.value) && !Number.isSafeInteger(item.value)))) { add('NON_FINITE', item.path); return finish(); }
    if (item.value && typeof item.value === 'object') for (const k of Object.keys(item.value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(k)) { add('UNSAFE_KEY', pointer(item.path, k)); return finish(); }
      stack.push({ value: item.value[k], path: pointer(item.path, k) });
    }
  }
  preview.data = value;
  const v = value as Obj;
  preview.summary = { name: typeof v.name === 'string' ? v.name : typeof v.checkpoint?.facts?.identity?.name === 'string' ? v.checkpoint.facts.identity.name : typeof v.identity?.name === 'string' ? v.identity.name : null,
    characterId: typeof v.document?.characterId === 'string' ? v.document.characterId : typeof v.projection?.characterId === 'string' ? v.projection.characterId : null,
    schemaVersion: typeof v.schemaVersion === 'string' ? v.schemaVersion : null };
  const versions: Record<string, string> = { 'adnd1e-character': '1.1.0', 'adnd1e-character-projection': '1.0.0', 'adnd1e-creation-draft': '1.0.0' };
  if (typeof v.format === 'string' && own(versions, v.format) && v.schemaVersion !== versions[v.format]) {
    const major = typeof v.schemaVersion === 'string' ? /^(\d+)\.\d+\.\d+$/.exec(v.schemaVersion)?.[1] : undefined;
    preview.kind = major && major !== '1' ? 'unknown-major' : 'unsupported-version'; add(preview.kind === 'unknown-major' ? 'UNKNOWN_MAJOR' : 'UNSUPPORTED_VERSION', '/schemaVersion', 'warning'); return finish();
  }
  if (v.format === 'adnd1e-character' || v.format === 'adnd1e-character-projection') {
    const full = v.format === 'adnd1e-character'; preview.kind = full ? 'full-candidate' : 'projection';
    // Unknown event types are retained as opaque envelopes. Never validate/execute their payloads.
    const checked = structuredClone(v); const opaque: number[] = []; let opaqueInvalid = false;
    if (full && Array.isArray(checked.events)) checked.events.forEach((e: any, i: number) => {
      if (object(e) && typeof e.type === 'string' && !knownEvents.has(e.type)) {
        const envelope = { ...candidate.$defs.event, properties: { ...candidate.$defs.event.properties, type: { type: 'string', minLength: 1 } }, allOf: [] };
        schemaCheck(e, envelope, candidate, `/events/${i}`, (code, path) => { opaqueInvalid = true; add(code, path); });
        opaque.push(i); e.type = 'creation.review-requested'; e.payload = { pending: [] }; add('UNKNOWN_EVENT', `/events/${i}/type`, 'warning');
      }
    });
    let invalid = opaqueInvalid;
    schemaCheck(checked, full ? candidate : projection, full ? candidate : projection, '', (code, path) => { invalid = true; add(code, path); });
    preview.validation.structure = invalid ? 'failed' : 'passed';
    if (full) preview.validation.registeredPayloads = invalid ? 'failed' : opaque.length ? 'partial' : 'passed';
    if (!invalid && full) {
      let broken = false; references(v, (code, path) => { broken = true; add(code, path); }); preview.validation.references = broken ? 'failed' : 'passed';
      preview.canStage = !broken;
      preview.restoresPrivateArchive = !broken;
      const firstUnknown = opaque.length ? v.events[opaque[0]].sequence : Infinity;
      preview.replay = { checkpointSequence: v.checkpoint.atSequence, lastInspectableSequence: firstUnknown <= v.checkpoint.atSequence ? v.checkpoint.atSequence : Math.max(v.checkpoint.atSequence, ...v.events.filter((e: Obj) => e.sequence < firstUnknown).map((e: Obj) => e.sequence)), hasUnknownTail: opaque.length > 0, executable: false };
      add('RULES_NOT_RESOLVED', '/rules/packs', 'warning');
    } else if (!invalid) { preview.canStage = true; add('PROJECTION_ONLY', '', 'warning'); }
    add('PARTIAL_VALIDATION', '', 'warning');
  } else if (v.format === 'adnd1e-creation-draft') {
    preview.kind = 'creation-draft'; let failed = false;
    inspectDraft(v, (code, path) => { failed = true; add(code, path); }); preview.validation.structure = failed ? 'failed' : 'passed'; preview.canStage = !failed;
  } else if (!own(v, 'format') && !own(v, 'schemaVersion') && Object.keys(v).some(k => abilityKeys.includes(k) || ['race', 'class', 'level', 'hp_max', 'hp_current', 'xp'].includes(k) || /^(spell_|gear_)/.test(k))) {
    preview.kind = 'legacy-assertions'; preview.canStage = true;
    const assertions: LegacyAssertion[] = [], unresolved: LegacyAssertion[] = [];
    const unmappedLegacy: Obj = {};
    for (const k of Object.keys(v).sort()) {
      const entry: LegacyAssertion = { id: `legacy:${k}`, path: pointer('', k), value: v[k], basis: 'legacy-asserted' };
      if (['name', 'race', 'class', 'level', 'xp', 'hp_max', 'hp_current', ...abilityKeys].includes(k)) assertions.push(entry);
      else { unresolved.push(entry); unmappedLegacy[k] = v[k]; }
    }
    preview.legacy = { assertions, unresolved, unmappedLegacy, originalRolls: null, inferredInventory: null, inferredMoney: null, inferredMemory: null };
    add('LEGACY_ASSERTIONS', '', 'warning');
  } else { preview.kind = 'unknown'; add('UNKNOWN_FORMAT'); }
  return finish();
}

/** Returns exactly the inspected original, including whitespace/BOM; never stringify preview.data. */
export function exportOriginalText(preview: ArchivePreview): string {
  const original = originals.get(preview); if (!original || original.text === null) throw new Error('没有可无损回存的原始字符串；请取回原始字节。');
  return original.text;
}
export function exportOriginalBytes(preview: ArchivePreview): Uint8Array {
  const original = originals.get(preview); if (!original) throw new Error('不是本检查器生成的预览。'); return original.bytes.slice();
}
