import type { KnowabilityState } from './core-spell-acquisition';
import {
  arcaneTranscriptionRule,
  spellRecoveryRestHours,
  spellRecoveryRule,
  traditionRules,
  type ArcaneTradition,
  type CoreSpellDefinitionRef,
  type CoreSpellTradition,
  type DivineTradition,
} from '../rules/core-spell-ledger';

type SourceKind = 'master-grant' | 'level-advance-grant' | 'captured-spellbook' | 'borrowed-spellbook' | 'scroll' | 'exchange' | 'research' | 'other';
type PublicSourceKind = 'teacher' | 'level-advance' | 'found-book' | 'borrowed-book' | 'scroll' | 'exchange' | 'research' | 'undisclosed';

export interface ArcaneSourceEntity {
  readonly id: string;
  readonly spell: CoreSpellDefinitionRef;
  readonly kind: SourceKind;
  readonly publicKind: PublicSourceKind;
  readonly publicLabel: string | null;
  readonly consumed: boolean;
  readonly private: Readonly<{ ownerId: string | null; locationId: string | null; provenance: string; dmNotes: readonly string[] }>;
}
export interface SpellbookEntry {
  readonly id: string;
  readonly spellbookId: string;
  readonly spell: CoreSpellDefinitionRef;
  readonly sourceEntityId: string;
  readonly transcriptionAttemptId: string;
  readonly status: 'present' | 'lost' | 'destroyed';
}
export interface ArcaneTranscriptionAttempt {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly spell: CoreSpellDefinitionRef;
  readonly knowabilityStateFingerprint: string;
  readonly outcome: 'success' | 'failure';
  readonly targetSpellbookId: string | null;
  readonly cost: Readonly<{ status: 'unknown'; actualGp: number | null; rulingId: string | null }>;
  readonly duration: Readonly<{ status: 'unknown'; actualMinutes: number | null; rulingId: string | null }>;
}
export interface DivineGrantRecord {
  readonly id: string;
  readonly tradition: DivineTradition;
  readonly requestedSpell: CoreSpellDefinitionRef;
  readonly grantedSpell: CoreSpellDefinitionRef | null;
  readonly authority: 'training-and-experience' | 'intermediary' | 'deity' | 'dm-adjudicated';
  readonly status: 'granted' | 'withheld';
  readonly publicMessage: string;
  readonly private: Readonly<{ trueAuthorityId: string | null; reason: string; dmNotes: readonly string[] }>;
}
export interface PreparedSpellCopy {
  readonly id: string;
  readonly spell: CoreSpellDefinitionRef;
  readonly preparedFrom: Readonly<{ kind: 'spellbook-entry'; id: string } | { kind: 'divine-grant'; id: string }>;
  readonly recoverySessionId: string;
  readonly status: 'ready' | 'expended';
  readonly expendedByCastingId: string | null;
}
export interface SpellCastingRecord {
  readonly id: string;
  readonly preparedCopyId: string;
  readonly spell: CoreSpellDefinitionRef;
  readonly occurredAt: string;
  readonly observedOutcome: string | null;
}
export interface RecoveryRequest {
  readonly copyId: string;
  readonly spell: CoreSpellDefinitionRef;
  readonly preparedFrom: PreparedSpellCopy['preparedFrom'];
}
export interface SpellRecoverySession {
  readonly id: string;
  readonly requested: readonly RecoveryRequest[];
  readonly requiredRestHours: number;
  readonly requiredStudyOrPrayerMinutes: number;
  readonly actualRestHours: number;
  readonly actualStudyOrPrayerMinutes: number;
  readonly interruption: 'none' | 'possible' | 'confirmed';
  readonly status: 'planned' | 'needs-rest' | 'needs-study-or-prayer' | 'needs-dm' | 'completed';
  readonly rulingId: string | null;
  readonly completedAt: string | null;
}
export interface CoreSpellLedger {
  readonly schema: 'adnd1e.core-spell-ledger';
  readonly schemaVersion: 1;
  readonly id: string;
  readonly characterId: string;
  readonly careerId: string;
  readonly tradition: CoreSpellTradition;
  readonly revision: number;
  readonly arcaneSources: readonly ArcaneSourceEntity[];
  readonly spellbookEntries: readonly SpellbookEntry[];
  readonly transcriptionAttempts: readonly ArcaneTranscriptionAttempt[];
  readonly divineGrants: readonly DivineGrantRecord[];
  readonly preparedCopies: readonly PreparedSpellCopy[];
  readonly castings: readonly SpellCastingRecord[];
  readonly recoverySessions: readonly SpellRecoverySession[];
}

const nonBlank = (value: string, label: string) => { if (!value.trim()) throw new Error(`${label} is required.`); };
const positive = (value: number, label: string) => { if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} must be a positive safe integer.`); };
const nonNegative = (value: number, label: string) => { if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer.`); };
const uniqueId = (ledger: CoreSpellLedger, id: string) => {
  nonBlank(id, 'record id');
  const used = [ledger.arcaneSources, ledger.spellbookEntries, ledger.transcriptionAttempts, ledger.divineGrants,
    ledger.preparedCopies, ledger.castings, ledger.recoverySessions].some(records => records.some(record => record.id === id));
  if (used) throw new Error(`Duplicate spell-ledger record id: ${id}`);
};
const validateSpell = (spell: CoreSpellDefinitionRef) => {
  nonBlank(spell.definitionId, 'spell definitionId'); nonBlank(spell.rulesetId, 'spell rulesetId');
  nonBlank(spell.displayName, 'spell displayName'); positive(spell.level, 'spell level');
  if (!spell.sourceIds.length || spell.sourceIds.some(source => !source.trim())) throw new Error('A spell definition requires source IDs.');
};
const matchesTradition = (tradition: CoreSpellTradition, spell: CoreSpellDefinitionRef) => traditionRules[tradition].listId === spell.listId;
const next = (ledger: CoreSpellLedger, patch: Partial<CoreSpellLedger>): CoreSpellLedger => Object.freeze({ ...ledger, ...patch, revision: ledger.revision + 1 });

export function createCoreSpellLedger(input: { id: string; characterId: string; careerId: string; tradition: CoreSpellTradition }): CoreSpellLedger {
  nonBlank(input.id, 'ledger id'); nonBlank(input.characterId, 'characterId'); nonBlank(input.careerId, 'careerId');
  if (!(input.tradition in traditionRules)) throw new Error('Unknown core spell tradition.');
  return Object.freeze({ schema: 'adnd1e.core-spell-ledger', schemaVersion: 1, ...input, revision: 0,
    arcaneSources: [], spellbookEntries: [], transcriptionAttempts: [], divineGrants: [], preparedCopies: [], castings: [], recoverySessions: [] });
}

export interface SpellEligibilityInput {
  readonly spell: CoreSpellDefinitionRef;
  readonly maximumUsableSpellLevel: number;
  readonly preparedCapacityAtLevel: number;
  readonly currentlyReadyAtLevel: number;
  readonly knowability?: KnowabilityState;
  readonly spellbookEntryId?: string;
}
export function assessSpellEligibility(ledger: CoreSpellLedger, input: SpellEligibilityInput) {
  validateSpell(input.spell); nonNegative(input.maximumUsableSpellLevel, 'maximum usable spell level');
  nonNegative(input.preparedCapacityAtLevel, 'prepared capacity'); nonNegative(input.currentlyReadyAtLevel, 'currently ready count');
  const reasons: string[] = [];
  if (!matchesTradition(ledger.tradition, input.spell)) reasons.push('spell-list-mismatch');
  if (input.spell.level > input.maximumUsableSpellLevel) reasons.push('spell-level-not-usable');
  if (input.currentlyReadyAtLevel >= input.preparedCapacityAtLevel) reasons.push('prepared-capacity-full');
  if (traditionRules[ledger.tradition].kind === 'arcane') {
    if (!input.knowability || !input.knowability.knownSpellIds.includes(input.spell.definitionId)) reasons.push('not-established-as-knowable');
    const entry = ledger.spellbookEntries.find(candidate => candidate.id === input.spellbookEntryId && candidate.spell.definitionId === input.spell.definitionId);
    if (!entry || entry.status !== 'present') reasons.push('present-spellbook-entry-required');
  } else if (input.knowability || input.spellbookEntryId) reasons.push('arcane-evidence-not-applicable-to-divine-spells');
  return Object.freeze({ status: reasons.length ? 'ineligible' as const : 'eligible' as const,
    reasons: Object.freeze(reasons), sourceIds: traditionRules[ledger.tradition].sourceIds });
}

export function addArcaneSource(ledger: CoreSpellLedger, source: ArcaneSourceEntity): CoreSpellLedger {
  if (traditionRules[ledger.tradition].kind !== 'arcane') throw new Error('Divine ledgers do not contain arcane source entities.');
  uniqueId(ledger, source.id); validateSpell(source.spell);
  if (!matchesTradition(ledger.tradition, source.spell)) throw new Error('Source spell is not on this tradition list.');
  nonBlank(source.private.provenance, 'private provenance');
  return next(ledger, { arcaneSources: Object.freeze([...ledger.arcaneSources, Object.freeze({ ...source, private: Object.freeze({ ...source.private, dmNotes: Object.freeze([...source.private.dmNotes]) }) })]) });
}

export function recordArcaneTranscription(ledger: CoreSpellLedger, input: {
  readonly id: string; readonly sourceEntityId: string; readonly targetSpellbookId: string;
  readonly knowability: KnowabilityState; readonly outcome: 'success' | 'failure';
  readonly actualCostGp?: number; readonly actualDurationMinutes?: number; readonly rulingId?: string;
}): CoreSpellLedger {
  if (traditionRules[ledger.tradition].kind !== 'arcane') throw new Error('Divine spell grants are not transcription attempts.');
  uniqueId(ledger, input.id); nonBlank(input.targetSpellbookId, 'target spellbook id');
  const source = ledger.arcaneSources.find(candidate => candidate.id === input.sourceEntityId);
  if (!source || source.consumed) throw new Error('A present, unconsumed arcane source entity is required.');
  const knowable = input.knowability.knownSpellIds.includes(source.spell.definitionId);
  if (input.outcome === 'success' && !knowable) throw new Error('A successful transcription requires established Chance to Know eligibility.');
  if (input.knowability.spellIds.includes(source.spell.definitionId) === false) throw new Error('Knowability state does not cover this spell definition.');
  const actualCostGp = input.actualCostGp ?? null, actualDurationMinutes = input.actualDurationMinutes ?? null;
  if (actualCostGp !== null) nonNegative(actualCostGp, 'actual transcription cost');
  if (actualDurationMinutes !== null) nonNegative(actualDurationMinutes, 'actual transcription duration');
  if ((actualCostGp !== null || actualDurationMinutes !== null) && !input.rulingId?.trim()) throw new Error('Actual cost or duration requires an explicit rulingId because the bounded source is unknown.');
  const attempt: ArcaneTranscriptionAttempt = Object.freeze({ id: input.id, sourceEntityId: source.id, spell: source.spell,
    knowabilityStateFingerprint: `${input.knowability.intelligence}:${input.knowability.round}:${input.knowability.attempts.length}:${input.knowability.knownSpellIds.join(',')}`,
    outcome: input.outcome, targetSpellbookId: input.outcome === 'success' ? input.targetSpellbookId : null,
    cost: Object.freeze({ status: arcaneTranscriptionRule.costs.status, actualGp: actualCostGp, rulingId: input.rulingId ?? null }),
    duration: Object.freeze({ status: arcaneTranscriptionRule.duration.status, actualMinutes: actualDurationMinutes, rulingId: input.rulingId ?? null }) });
  let sources = ledger.arcaneSources;
  let entries = ledger.spellbookEntries;
  if (input.outcome === 'success') {
    const entryId = `${input.id}:entry`;
    uniqueId(ledger, entryId);
    const entry: SpellbookEntry = Object.freeze({ id: entryId, spellbookId: input.targetSpellbookId, spell: source.spell,
      sourceEntityId: source.id, transcriptionAttemptId: input.id, status: 'present' });
    entries = Object.freeze([...entries, entry]);
    if (source.kind === 'scroll') sources = Object.freeze(sources.map(candidate => candidate.id === source.id ? Object.freeze({ ...candidate, consumed: true }) : candidate));
  }
  return next(ledger, { arcaneSources: sources, spellbookEntries: entries,
    transcriptionAttempts: Object.freeze([...ledger.transcriptionAttempts, attempt]) });
}

export function recordDivineGrant(ledger: CoreSpellLedger, grant: DivineGrantRecord): CoreSpellLedger {
  if (traditionRules[ledger.tradition].kind !== 'divine') throw new Error('Arcane ledgers cannot receive divine grants.');
  uniqueId(ledger, grant.id); validateSpell(grant.requestedSpell);
  if (grant.tradition !== ledger.tradition || !matchesTradition(ledger.tradition, grant.requestedSpell)) throw new Error('Requested spell does not match the divine tradition.');
  if (grant.grantedSpell) { validateSpell(grant.grantedSpell); if (!matchesTradition(ledger.tradition, grant.grantedSpell)) throw new Error('Granted spell does not match the divine tradition.'); }
  if ((grant.status === 'granted') !== Boolean(grant.grantedSpell)) throw new Error('A granted record requires a granted spell, while a withheld record must not contain one.');
  nonBlank(grant.publicMessage, 'public grant message');
  return next(ledger, { divineGrants: Object.freeze([...ledger.divineGrants, Object.freeze({ ...grant,
    private: Object.freeze({ ...grant.private, dmNotes: Object.freeze([...grant.private.dmNotes]) }) })]) });
}

function recoveryRequirements(requested: readonly RecoveryRequest[]) {
  if (!requested.length) throw new Error('A recovery session must request at least one prepared copy.');
  const ids = new Set<string>(); let highest = 0; let minutes = 0;
  for (const request of requested) { nonBlank(request.copyId, 'prepared copy id'); if (ids.has(request.copyId)) throw new Error('Prepared copy IDs must be unique.');
    ids.add(request.copyId); validateSpell(request.spell); highest = Math.max(highest, request.spell.level); minutes += request.spell.level * spellRecoveryRule.studyOrPrayerMinutesPerSpellLevel; }
  const row = spellRecoveryRestHours.find(candidate => highest >= candidate.minimumLevel && highest <= candidate.maximumLevel);
  if (!row) throw new Error('Core recovery supports spell levels 1 through 9 only.');
  return { restHours: row.hours, minutes };
}

export function recordRecoverySession(ledger: CoreSpellLedger, input: {
  readonly id: string; readonly requested: readonly RecoveryRequest[]; readonly actualRestHours: number;
  readonly actualStudyOrPrayerMinutes: number; readonly interruption: SpellRecoverySession['interruption'];
  /** Verified career/ability capacity by spell level; this ledger does not invent the class table. */
  readonly preparedCapacityByLevel: Readonly<Record<number, number>>;
  readonly rulingId?: string; readonly completedAt?: string;
}): CoreSpellLedger {
  uniqueId(ledger, input.id); nonNegative(input.actualRestHours, 'actual rest hours'); nonNegative(input.actualStudyOrPrayerMinutes, 'actual study/prayer minutes');
  const required = recoveryRequirements(input.requested); let status: SpellRecoverySession['status'];
  if (input.interruption !== 'none' && !input.rulingId?.trim()) status = 'needs-dm';
  else if (input.actualRestHours < required.restHours) status = 'needs-rest';
  else if (input.actualStudyOrPrayerMinutes < required.minutes) status = 'needs-study-or-prayer';
  else status = 'completed';
  if (status === 'completed' && !input.completedAt?.trim()) throw new Error('A completed recovery session requires completedAt.');
  const requestedAtLevel = new Map<number, number>();
  const citedDivineGrants = new Set<string>();
  for (const request of input.requested) {
    if (!matchesTradition(ledger.tradition, request.spell)) throw new Error('Recovery request contains a spell from another tradition.');
    requestedAtLevel.set(request.spell.level, (requestedAtLevel.get(request.spell.level) ?? 0) + 1);
    if (request.preparedFrom.kind === 'spellbook-entry') {
      if (traditionRules[ledger.tradition].kind !== 'arcane') throw new Error('Divine preparation cannot cite a spellbook entry.');
      const entry = ledger.spellbookEntries.find(candidate => candidate.id === request.preparedFrom.id && candidate.status === 'present');
      if (!entry || entry.spell.definitionId !== request.spell.definitionId) throw new Error('A present matching spellbook entry is required at recovery.');
    } else {
      if (traditionRules[ledger.tradition].kind !== 'divine') throw new Error('Arcane preparation cannot cite a divine grant.');
      if (citedDivineGrants.has(request.preparedFrom.id)
        || ledger.preparedCopies.some(copy => copy.preparedFrom.kind === 'divine-grant' && copy.preparedFrom.id === request.preparedFrom.id)) {
        throw new Error('Each divine grant record can create only one prepared copy.');
      }
      citedDivineGrants.add(request.preparedFrom.id);
      const grant = ledger.divineGrants.find(candidate => candidate.id === request.preparedFrom.id && candidate.status === 'granted');
      if (!grant?.grantedSpell || grant.grantedSpell.definitionId !== request.spell.definitionId) throw new Error('A matching granted divine spell is required at recovery.');
    }
  }
  for (const [level, requestedCount] of requestedAtLevel) {
    const capacity = input.preparedCapacityByLevel[level];
    if (capacity === undefined) throw new Error(`Verified prepared capacity is required for spell level ${level}.`);
    nonNegative(capacity, `prepared capacity at spell level ${level}`);
    const currentlyReady = ledger.preparedCopies.filter(copy => copy.status === 'ready' && copy.spell.level === level).length;
    if (currentlyReady + requestedCount > capacity) throw new Error(`Prepared spell capacity exceeded at spell level ${level}.`);
  }
  const session: SpellRecoverySession = Object.freeze({ id: input.id, requested: Object.freeze(input.requested.map(request => Object.freeze({ ...request, preparedFrom: Object.freeze({ ...request.preparedFrom }) }))),
    requiredRestHours: required.restHours, requiredStudyOrPrayerMinutes: required.minutes, actualRestHours: input.actualRestHours,
    actualStudyOrPrayerMinutes: input.actualStudyOrPrayerMinutes, interruption: input.interruption, status,
    rulingId: input.rulingId ?? null, completedAt: status === 'completed' ? input.completedAt! : null });
  const copies = status === 'completed' ? input.requested.map(request => Object.freeze({ id: request.copyId, spell: request.spell,
    preparedFrom: request.preparedFrom, recoverySessionId: input.id, status: 'ready' as const, expendedByCastingId: null })) : [];
  for (const copy of copies) uniqueId(ledger, copy.id);
  return next(ledger, { recoverySessions: Object.freeze([...ledger.recoverySessions, session]), preparedCopies: Object.freeze([...ledger.preparedCopies, ...copies]) });
}

export function castPreparedSpell(ledger: CoreSpellLedger, input: {
  readonly castingId: string; readonly preparedCopyId: string; readonly occurredAt: string;
  readonly componentState: 'satisfied' | 'not-required' | 'needs-dm'; readonly observedOutcome?: string;
}) {
  uniqueId(ledger, input.castingId); nonBlank(input.occurredAt, 'casting occurredAt');
  if (input.componentState === 'needs-dm') return Object.freeze({ status: 'needs-dm' as const, ledger, reason: 'Material/verbal/somatic and situational requirements must be adjudicated before consumption.' });
  const copy = ledger.preparedCopies.find(candidate => candidate.id === input.preparedCopyId);
  if (!copy || copy.status !== 'ready') throw new Error('Exactly one ready prepared copy is required for casting.');
  const casting: SpellCastingRecord = Object.freeze({ id: input.castingId, preparedCopyId: copy.id, spell: copy.spell,
    occurredAt: input.occurredAt, observedOutcome: input.observedOutcome ?? null });
  const updated = next(ledger, { preparedCopies: Object.freeze(ledger.preparedCopies.map(candidate => candidate.id === copy.id
    ? Object.freeze({ ...candidate, status: 'expended' as const, expendedByCastingId: casting.id }) : candidate)),
    castings: Object.freeze([...ledger.castings, casting]) });
  return Object.freeze({ status: 'cast' as const, ledger: updated, casting });
}

export interface PlayerSpellLedgerProjection {
  readonly schema: 'adnd1e.spell-ledger-player-projection'; readonly schemaVersion: 1;
  readonly ledgerId: string; readonly characterId: string; readonly careerId: string; readonly tradition: CoreSpellTradition; readonly revision: number;
  readonly sources: readonly { id: string; spell: CoreSpellDefinitionRef; kind: PublicSourceKind; label: string | null; consumed: boolean }[];
  readonly spellbookEntries: readonly SpellbookEntry[];
  readonly divineGrants: readonly { id: string; requestedSpell: CoreSpellDefinitionRef; grantedSpell: CoreSpellDefinitionRef | null; status: DivineGrantRecord['status']; publicMessage: string }[];
  readonly preparedCopies: readonly PreparedSpellCopy[]; readonly castings: readonly SpellCastingRecord[];
  readonly recoverySessions: readonly Omit<SpellRecoverySession, 'rulingId'>[];
  readonly disclosure: 'public-facts-only';
}

/** Allowlist projection: private source provenance, divine reasons, rolls and DM notes are never copied. */
export function projectSpellLedgerForPlayer(ledger: CoreSpellLedger): PlayerSpellLedgerProjection {
  return Object.freeze({ schema: 'adnd1e.spell-ledger-player-projection', schemaVersion: 1, ledgerId: ledger.id,
    characterId: ledger.characterId, careerId: ledger.careerId, tradition: ledger.tradition, revision: ledger.revision,
    sources: Object.freeze(ledger.arcaneSources.map(source => Object.freeze({ id: source.id, spell: source.spell,
      kind: source.publicKind, label: source.publicLabel, consumed: source.consumed }))),
    spellbookEntries: Object.freeze(ledger.spellbookEntries.map(entry => Object.freeze({ ...entry }))),
    divineGrants: Object.freeze(ledger.divineGrants.map(grant => Object.freeze({ id: grant.id, requestedSpell: grant.requestedSpell,
      grantedSpell: grant.grantedSpell, status: grant.status, publicMessage: grant.publicMessage }))),
    preparedCopies: Object.freeze(ledger.preparedCopies.map(copy => Object.freeze({ ...copy, preparedFrom: Object.freeze({ ...copy.preparedFrom }) }))),
    castings: Object.freeze(ledger.castings.map(casting => Object.freeze({ ...casting }))),
    recoverySessions: Object.freeze(ledger.recoverySessions.map(({ rulingId: _secretRulingId, ...session }) => Object.freeze({ ...session }))),
    disclosure: 'public-facts-only' });
}

export const isArcaneTradition = (tradition: CoreSpellTradition): tradition is ArcaneTradition => traditionRules[tradition].kind === 'arcane';
