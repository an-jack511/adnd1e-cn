import { canonical, commit, type Command, type Event, type Json, type Receipt, type Registry, type TransactionState } from './transactions';

export type FactVisibility = 'player' | 'dm-private';
export type CharacterModule = {
  id: string; kind: string; schemaVersion: string; visibility: FactVisibility;
  sourceIds: string[]; data: Json;
};
export type CharacterRuling = {
  id: string; ruleId: string; choice: string; reason: string; actorId: string;
  visibility: FactVisibility; sourceIds: string[];
};
export type CharacterFacts = {
  identity: { name: string; raceId: string; alignment: string; description: string };
  modules: CharacterModule[];
  rulings: CharacterRuling[];
};
export type DerivedCache = {
  engineVersion: string; rulesDigest: string; throughSequence: number;
  values: Json; warnings: string[];
};
export type CharacterRuntime = {
  format: 'adnd1e-character-runtime'; schemaVersion: '1.0.0';
  transaction: TransactionState<CharacterFacts & Json>;
  cache: DerivedCache | null;
  proposals: { id: string; kind: string; submittedBy: string; at: string; payload: Json }[];
};

const nonempty: (value: unknown, label: string) => asserts value is string = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
};
const object = (value: unknown): value is Record<string, Json> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, Json>, keys: readonly string[]) => {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error('Unexpected payload field.');
};
const strings = (value: unknown, label: string) => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`${label} must contain stable IDs.`);
};
function validateModule(value: unknown): asserts value is CharacterModule {
  if (!object(value)) throw new Error('Module payload must be an object.');
  exactKeys(value, ['id', 'kind', 'schemaVersion', 'visibility', 'sourceIds', 'data']);
  nonempty(value.id, 'module id'); nonempty(value.kind, 'module kind'); nonempty(value.schemaVersion, 'module schemaVersion');
  if (value.visibility !== 'player' && value.visibility !== 'dm-private') throw new Error('Unknown module visibility.');
  strings(value.sourceIds, 'module sourceIds'); if (!(value.sourceIds as string[]).length) throw new Error('Module must cite a source.');
  canonical(value.data);
}
function validateRuling(value: unknown): asserts value is CharacterRuling {
  if (!object(value)) throw new Error('Ruling payload must be an object.');
  exactKeys(value, ['id', 'ruleId', 'choice', 'reason', 'actorId', 'visibility', 'sourceIds']);
  for (const key of ['id', 'ruleId', 'choice', 'reason', 'actorId'] as const) nonempty(value[key], `ruling ${key}`);
  if (value.visibility !== 'player' && value.visibility !== 'dm-private') throw new Error('Unknown ruling visibility.');
  strings(value.sourceIds, 'ruling sourceIds'); if (!(value.sourceIds as string[]).length) throw new Error('Ruling must cite a source.');
}
function validateFacts(facts: CharacterFacts & Json): void {
  nonempty(facts.identity.name, 'name');
  for (const key of ['raceId', 'alignment', 'description'] as const) if (typeof facts.identity[key] !== 'string') throw new Error('Invalid identity fact.');
  const moduleIds = new Set<string>();
  facts.modules.forEach(module => { validateModule(module); if (moduleIds.has(module.id)) throw new Error('Duplicate module ID.'); moduleIds.add(module.id); });
  const rulingIds = new Set<string>();
  facts.rulings.forEach(ruling => { validateRuling(ruling); if (rulingIds.has(ruling.id)) throw new Error('Duplicate ruling ID.'); rulingIds.add(ruling.id); });
}

export function createCharacterRuntime(input: { characterId: string; branchId: string; name: string; raceId?: string; alignment?: string; description?: string }): CharacterRuntime {
  nonempty(input.characterId, 'characterId'); nonempty(input.branchId, 'branchId'); nonempty(input.name, 'name');
  const facts = { identity: { name: input.name, raceId: input.raceId ?? '', alignment: input.alignment ?? '', description: input.description ?? '' }, modules: [], rulings: [] } as CharacterFacts & Json;
  validateFacts(facts);
  return { format: 'adnd1e-character-runtime', schemaVersion: '1.0.0', transaction: { characterId: input.characterId, branchId: input.branchId, revision: 0, throughSequence: 0, facts, events: [], receipts: [], unexplainedTail: false }, cache: null, proposals: [] };
}

const payloadObject = (payload: Json) => { if (!object(payload)) throw new Error('Payload must be an object.'); return payload; };
export function characterRegistry(sourceIds: ReadonlySet<string>): Registry<CharacterFacts & Json> {
  return {
    sourceIds, validateFacts,
    commands: {
      'character.identity.record': {
        validate(payload) { const p = payloadObject(payload); exactKeys(p, ['name', 'raceId', 'alignment', 'description']); for (const k of ['name', 'raceId', 'alignment', 'description'] as const) if (typeof p[k] !== 'string') throw new Error('Invalid identity payload.'); nonempty(p.name, 'name'); },
        plan(_facts, command) { return [{ id: `${command.id}:identity`, type: 'character.identity-recorded', sourceIds: ['project:identity-fact'], payload: command.payload }]; },
      },
      'character.module.replace': {
        validate: validateModule,
        plan(_facts, command) { const module = command.payload as CharacterModule & Json; return [{ id: `${command.id}:module`, type: 'character.module-replaced', sourceIds: [...module.sourceIds], payload: module }]; },
      },
      'character.ruling.record': {
        validate: validateRuling,
        plan(_facts, command) { const ruling = command.payload as CharacterRuling & Json; return [{ id: `${command.id}:ruling`, type: 'character.ruling-recorded', sourceIds: [...ruling.sourceIds], payload: ruling }]; },
      },
    },
    events: {
      'character.identity-recorded': { validate(payload) { const p = payloadObject(payload); exactKeys(p, ['name', 'raceId', 'alignment', 'description']); }, apply(facts, event) { const base=facts as CharacterFacts; return { ...base, identity: structuredClone(event.payload) } as CharacterFacts & Json; } },
      'character.module-replaced': { validate: validateModule, apply(facts, event) { const base=facts as CharacterFacts; const module = structuredClone(event.payload) as CharacterModule; return { ...base, modules: [...base.modules.filter(item => item.id !== module.id), module] } as CharacterFacts & Json; } },
      'character.ruling-recorded': { validate: validateRuling, apply(facts, event) { const base=facts as CharacterFacts; const ruling = structuredClone(event.payload) as CharacterRuling; if (base.rulings.some(item => item.id === ruling.id)) throw new Error('Duplicate ruling ID.'); return { ...base, rulings: [...base.rulings, ruling] } as CharacterFacts & Json; } },
    },
  };
}

/** Every committed fact invalidates derived values; callers must explicitly recalculate them. */
export function commitCharacter(runtime: CharacterRuntime, command: Command, registry: Registry<CharacterFacts & Json>): { runtime: CharacterRuntime; receipt: Receipt; duplicate: boolean } {
  const result = commit(runtime.transaction, command, registry);
  return { runtime: result.duplicate ? runtime : { ...structuredClone(runtime), transaction: result.state, cache: null }, receipt: result.receipt, duplicate: result.duplicate };
}
export function installDerivedCache(runtime: CharacterRuntime, cache: DerivedCache): CharacterRuntime {
  nonempty(cache.engineVersion, 'engineVersion'); nonempty(cache.rulesDigest, 'rulesDigest');
  if (cache.throughSequence !== runtime.transaction.throughSequence) throw new Error('Derived cache does not cover the current fact sequence.');
  strings(cache.warnings, 'warnings'); canonical(cache.values);
  return { ...structuredClone(runtime), cache: structuredClone(cache) };
}
export function stageProposal(runtime: CharacterRuntime, proposal: CharacterRuntime['proposals'][number]): CharacterRuntime {
  for (const key of ['id', 'kind', 'submittedBy', 'at'] as const) nonempty(proposal[key], `proposal ${key}`);
  if (runtime.proposals.some(item => item.id === proposal.id)) throw new Error('Duplicate proposal ID.'); canonical(proposal.payload);
  return { ...structuredClone(runtime), proposals: [...runtime.proposals, structuredClone(proposal)] };
}

export type PlayerCharacterProjection = {
  format: 'adnd1e-character-projection'; schemaVersion: 'runtime-1.0.0';
  characterId: string; branchId: string; revision: number; throughSequence: number;
  identity: CharacterFacts['identity']; modules: CharacterModule[]; rulings: CharacterRuling[];
};
/** Explicit allow-list: events, receipts, proposals, cache and every dm-private fact are absent. */
export function playerProjection(runtime: CharacterRuntime): PlayerCharacterProjection {
  const facts = runtime.transaction.facts;
  return { format: 'adnd1e-character-projection', schemaVersion: 'runtime-1.0.0', characterId: runtime.transaction.characterId, branchId: runtime.transaction.branchId,
    revision: runtime.transaction.revision, throughSequence: runtime.transaction.throughSequence, identity: structuredClone(facts.identity),
    modules: facts.modules.filter(item => item.visibility === 'player').map(item => structuredClone(item)),
    rulings: facts.rulings.filter(item => item.visibility === 'player').map(item => structuredClone(item)) };
}

/** Rebuild a checkpoint from its event log; unknown tails are never executed. */
export function replayCharacter(initial: CharacterRuntime, events: readonly Event[], registry: Registry<CharacterFacts & Json>): CharacterRuntime {
  if (initial.transaction.revision !== 0 || initial.transaction.throughSequence !== 0 || initial.transaction.events.length) throw new Error('Replay requires a pristine initial runtime.');
  let facts = structuredClone(initial.transaction.facts); let sequence = 0;
  for (const event of events) {
    if (event.sequence !== sequence + 1) throw new Error('Non-contiguous event sequence.');
    const reducer = registry.events[event.type]; if (!reducer) throw new Error('Unknown event type: replay refused.');
    if (!event.sourceIds.length || event.sourceIds.some(id => !registry.sourceIds.has(id))) throw new Error('Unresolved replay source.');
    reducer.validate(event.payload); facts = reducer.apply(facts, structuredClone(event)); registry.validateFacts(facts); sequence = event.sequence;
  }
  return { ...structuredClone(initial), transaction: { ...initial.transaction, revision: events.length, throughSequence: sequence, facts, events: events.map(event=>structuredClone(event)), receipts: [], unexplainedTail: false }, cache: null };
}
