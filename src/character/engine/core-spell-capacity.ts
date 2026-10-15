import {
  clericWisdomAdjustments,
  coreClassSpellTracks,
  coreSpellCapacityTracks,
  type CoreSpellCapacitySourceId,
  type CoreSpellCapacityTrackId,
  type CoreSpellCastingClassId,
} from '../rules/core-spell-capacity';

export type CareerModel = 'single' | 'multi-class' | 'two-class-current' | 'two-class-former' | 'bard';

export interface CoreSpellCapacityInput {
  readonly careerId: string;
  readonly classId: CoreSpellCastingClassId;
  readonly level: number;
  readonly model: CareerModel;
  readonly intelligence: number | null;
  readonly wisdom: number | null;
  readonly bardEnabled?: boolean;
  /** Required only for a former career in the human two-class procedure. */
  readonly twoClass?: Readonly<{ currentCareerLevel: number; formerCareerLevel: number }>;
}

export interface SpellCapacityLevelResult {
  readonly spellLevel: number;
  readonly printedBase: number;
  readonly abilityGatedBase: number;
  readonly wisdomBonus: number;
  readonly preparedCapacity: number;
  readonly printedCell: 'number' | 'dash-normalized-to-zero';
}

export interface SpellCapacityTrackResult {
  readonly trackId: CoreSpellCapacityTrackId;
  readonly listId: 'cleric' | 'druid' | 'magic-user' | 'illusionist';
  readonly levels: readonly SpellCapacityLevelResult[];
  readonly maximumUsableSpellLevel: number;
  readonly chanceToKnowRequired: boolean;
  readonly capacityDoesNotEstablishAcquisition: true;
  readonly sourceIds: readonly CoreSpellCapacitySourceId[];
}

export interface CalculatedSpellCapacity {
  readonly status: 'calculated' | 'blocked-two-class';
  readonly careerId: string;
  readonly classId: CoreSpellCastingClassId;
  readonly careerLevel: number;
  readonly model: CareerModel;
  readonly usableNow: boolean;
  readonly reason: string | null;
  readonly spellFailurePercent: number | null;
  readonly wisdomBonusPolicy: 'applied-cleric-table' | 'not-applicable';
  readonly bardEffectiveDruidLevel: number | null;
  readonly tracks: readonly SpellCapacityTrackResult[];
}

export interface NeedsDmSpellCapacity {
  readonly status: 'needs-dm';
  readonly careerId: string;
  readonly classId: CoreSpellCastingClassId;
  readonly careerLevel: number;
  readonly reason: string;
  readonly sourceIds: readonly CoreSpellCapacitySourceId[];
}

export type CoreSpellCapacityResult = CalculatedSpellCapacity | NeedsDmSpellCapacity;

const positive = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} must be a positive safe integer.`);
};
const ability = (value: number | null, label: string) => {
  if (value === null) return;
  if (!Number.isSafeInteger(value) || value < 3) throw new Error(`${label} must be null or an integer of at least 3.`);
};
const sourceIdsForClass = (classId: CoreSpellCastingClassId) => Object.freeze(coreClassSpellTracks[classId]
  .flatMap(trackId => coreSpellCapacityTracks[trackId].sourceIds));

function minimumAbilityProblem(input: CoreSpellCapacityInput): string | null {
  const requireScore = (name: 'intelligence' | 'wisdom', minimum: number) => {
    const score = input[name];
    return score === null ? `${name} is required to verify ${input.classId} spell capacity.`
      : score < minimum ? `${input.classId} requires ${name.toUpperCase()} ${minimum} for this core spell progression.` : null;
  };
  if (input.classId === 'cleric') return requireScore('wisdom', 9);
  if (input.classId === 'druid') return requireScore('wisdom', 12);
  if (input.classId === 'magic-user') return requireScore('intelligence', 9);
  if (input.classId === 'illusionist') return requireScore('intelligence', 15);
  if (input.classId === 'paladin') return requireScore('wisdom', 13);
  if (input.classId === 'ranger') return requireScore('intelligence', 13) ?? requireScore('wisdom', 14);
  return requireScore('intelligence', 12) ?? requireScore('wisdom', 15);
}

function maximumArcaneSpellLevel(intelligence: number): number {
  if (intelligence < 9) return 0;
  if (intelligence < 10) return 4;
  if (intelligence < 12) return 5;
  if (intelligence < 14) return 6;
  if (intelligence < 16) return 7;
  if (intelligence < 18) return 8;
  return 9;
}

function tableRow(trackId: CoreSpellCapacityTrackId, careerLevel: number) {
  const rule = coreSpellCapacityTracks[trackId];
  if (careerLevel < rule.firstSpellUsingLevel) return { kind: 'before-first' as const, daily: Array(rule.maxSpellLevel).fill(0) as number[] };
  const exact = rule.rows.find(row => row.level === careerLevel);
  if (exact) return { kind: 'row' as const, daily: [...exact.daily] };
  const last = rule.rows.at(-1)!;
  if (careerLevel > last.level && rule.beyondLastRow === 'explicit-maximum') return { kind: 'explicit-maximum' as const, daily: [...last.daily] };
  return { kind: 'unsupported' as const, daily: [] as number[] };
}

function clericWisdom(wisdom: number) {
  return clericWisdomAdjustments.find(row => wisdom >= row.minWisdom && (row.maxWisdom === null || wisdom <= row.maxWisdom))!;
}

function buildTrack(input: CoreSpellCapacityInput, trackId: CoreSpellCapacityTrackId): SpellCapacityTrackResult | NeedsDmSpellCapacity {
  const rule = coreSpellCapacityTracks[trackId];
  const row = tableRow(trackId, input.level);
  if (row.kind === 'unsupported') return {
    status: 'needs-dm', careerId: input.careerId, classId: input.classId, careerLevel: input.level,
    reason: `${trackId} has no verified PHB capacity row or explicit maximum for career level ${input.level}.`, sourceIds: rule.sourceIds,
  };
  const wisdomApplies = input.classId === 'cleric' || input.classId === 'druid';
  const wisdomRule = wisdomApplies ? clericWisdom(input.wisdom!) : null;
  const intCap = rule.listId === 'magic-user' ? maximumArcaneSpellLevel(input.intelligence!)
    : rule.listId === 'illusionist' ? maximumArcaneSpellLevel(input.intelligence!) : rule.maxSpellLevel;
  const levels = row.daily.map((printedBase, index): SpellCapacityLevelResult => {
    const spellLevel = index + 1;
    const divineAbilityAllowed = !wisdomApplies || spellLevel < 6 || (spellLevel === 6 ? input.wisdom! >= 17 : input.wisdom! >= 18);
    const arcaneAbilityAllowed = spellLevel <= intCap;
    const abilityGatedBase = divineAbilityAllowed && arcaneAbilityAllowed ? printedBase : 0;
    const wisdomBonus = wisdomApplies && abilityGatedBase > 0 ? wisdomRule!.cumulativeBonus[index] ?? 0 : 0;
    return Object.freeze({ spellLevel, printedBase, abilityGatedBase, wisdomBonus,
      preparedCapacity: abilityGatedBase + wisdomBonus,
      printedCell: printedBase === 0 ? 'dash-normalized-to-zero' as const : 'number' as const });
  });
  let maximumUsableSpellLevel = 0;
  for (const level of levels) if (level.preparedCapacity > 0) maximumUsableSpellLevel = level.spellLevel;
  return Object.freeze({ trackId, listId: rule.listId, levels: Object.freeze(levels), maximumUsableSpellLevel,
    chanceToKnowRequired: rule.chanceToKnow, capacityDoesNotEstablishAcquisition: true,
    sourceIds: Object.freeze([...rule.sourceIds, ...(wisdomApplies ? ['phb:11:wisdom-cleric-adjustments' as const] : []),
      ...(rule.listId === 'magic-user' || rule.listId === 'illusionist' ? ['phb:10:intelligence-spell-levels' as const] : [])]) });
}

export function calculateCoreSpellCapacity(input: CoreSpellCapacityInput): CoreSpellCapacityResult {
  if (!input.careerId.trim()) throw new Error('careerId is required.');
  positive(input.level, 'career level'); ability(input.intelligence, 'intelligence'); ability(input.wisdom, 'wisdom');
  if (input.model === 'bard' && input.classId !== 'bard') throw new Error('The bard career model is reserved for the Bard class.');
  if (input.classId === 'bard' && input.model !== 'bard') throw new Error('Bard capacity requires the bard career model.');
  if (input.classId === 'bard' && input.bardEnabled !== true) return {
    status: 'needs-dm', careerId: input.careerId, classId: input.classId, careerLevel: input.level,
    reason: 'PHB Appendix II Bard is supplemental and must be explicitly enabled by the campaign.',
    sourceIds: ['phb:117-118:bard-spell-capacity'],
  };
  const problem = minimumAbilityProblem(input);
  if (problem) return { status: 'needs-dm', careerId: input.careerId, classId: input.classId, careerLevel: input.level,
    reason: problem, sourceIds: sourceIdsForClass(input.classId) };
  const built = coreClassSpellTracks[input.classId].map(trackId => buildTrack(input, trackId));
  const unresolved = built.find((track): track is NeedsDmSpellCapacity => 'status' in track && track.status === 'needs-dm');
  if (unresolved) return unresolved;
  const verifiedTracks = built as SpellCapacityTrackResult[];

  let status: CalculatedSpellCapacity['status'] = 'calculated';
  let usableNow = true;
  let reason: string | null = null;
  if (input.model === 'two-class-former') {
    if (!input.twoClass) return { status: 'needs-dm', careerId: input.careerId, classId: input.classId, careerLevel: input.level,
      reason: 'Former two-class capacity needs both current and former career levels to determine whether old class abilities are currently usable.',
      sourceIds: sourceIdsForClass(input.classId) };
    positive(input.twoClass.currentCareerLevel, 'current two-class career level'); positive(input.twoClass.formerCareerLevel, 'former career level');
    if (input.twoClass.formerCareerLevel !== input.level) throw new Error('formerCareerLevel must match this capacity career level.');
    if (input.twoClass.currentCareerLevel <= input.twoClass.formerCareerLevel) {
      status = 'blocked-two-class'; usableNow = false;
      reason = 'The current human class has not yet exceeded the former class level; former class spell ability is not currently usable.';
    }
  }
  const wisdomApplies = input.classId === 'cleric' || input.classId === 'druid';
  return Object.freeze({ status, careerId: input.careerId, classId: input.classId, careerLevel: input.level,
    model: input.model, usableNow, reason,
    spellFailurePercent: wisdomApplies ? clericWisdom(input.wisdom!).spellFailurePercent : null,
    wisdomBonusPolicy: wisdomApplies ? 'applied-cleric-table' : 'not-applicable',
    bardEffectiveDruidLevel: input.classId === 'bard' ? (input.level === 23 ? 13 : Math.min(input.level, 12)) : null,
    tracks: Object.freeze(verifiedTracks) });
}

/** Calculates each career independently. It deliberately exposes no pooled total. */
export function calculateCharacterSpellCapacities(inputs: readonly CoreSpellCapacityInput[]) {
  const ids = new Set<string>();
  const results = inputs.map(input => {
    if (ids.has(input.careerId)) throw new Error(`Duplicate careerId: ${input.careerId}`);
    ids.add(input.careerId);
    return calculateCoreSpellCapacity(input);
  });
  return Object.freeze({ schema: 'adnd1e.core-spell-capacity-set', schemaVersion: 1,
    aggregation: 'per-career-never-pooled' as const, careers: Object.freeze(results) });
}

export function preparedCapacityByLevel(result: CoreSpellCapacityResult, trackId: CoreSpellCapacityTrackId): Readonly<Record<number, number>> {
  if (result.status === 'needs-dm') throw new Error('Unverified capacity cannot be supplied to the spell ledger.');
  if (!result.usableNow) throw new Error('A currently blocked former class cannot supply usable prepared capacity.');
  const track = result.tracks.find(candidate => candidate.trackId === trackId);
  if (!track) throw new Error(`Capacity result does not contain track: ${trackId}`);
  return Object.freeze(Object.fromEntries(track.levels.map(level => [level.spellLevel, level.preparedCapacity])));
}
