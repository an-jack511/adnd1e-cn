import {
  constitutionSurvivalTable,
  coreRevivalMethods,
  raiseDeadEligibleRaces,
  revivalCheckSourceConflict,
  zeroHitPointRule,
  type CoreLifeStateSourceId,
  type CoreRevivalMethodId,
  type CoreSubjectRaceId,
} from '../rules/core-life-state';

export type MortalityState =
  | 'alive'
  | 'unconscious-bleeding'
  | 'unconscious-stabilized'
  | 'dead'
  | 'forever-dead';

export type ActionRestriction =
  | 'none'
  | 'unconscious'
  | 'zero-hp-convalescence'
  | 'raise-dead-bed-rest'
  | 'reincarnation-rebuild-pending'
  | 'dm-defined';

export interface PermanentLifeChange {
  readonly id: string;
  readonly kind:
    | 'revivification-constitution-loss'
    | 'severe-zero-hp-injury'
    | 'reincarnation-form-change'
    | 'other-permanent-change';
  readonly status: 'applied' | 'needs-dm';
  readonly description: string;
  readonly constitutionDelta?: number;
  readonly rulingId?: string;
  readonly sourceIds: readonly CoreLifeStateSourceId[];
}

export interface DeathRecord {
  readonly id: string;
  readonly cause: string;
  readonly gameDay?: number;
  readonly finality: 'ordinary' | 'failed-ordinary-revival' | 'ordinary-revival-limit-exhausted';
  readonly resolvedByMethodId?: CoreRevivalMethodId;
}

export interface ZeroHpEpisode {
  readonly id: string;
  readonly lowestHp: number;
  readonly roundsDeclining: number;
  readonly friendlyAidReceived: boolean;
  readonly comaTurns?: number;
  readonly minimumConvalescenceDays?: number;
}

export interface CoreLifeState {
  readonly actorId: string;
  /** Null means a revival succeeded but its exact HP total still needs settlement. */
  readonly currentHp: number | null;
  readonly maximumHp: number;
  readonly hpSettlement: 'settled' | 'needs-dm';
  readonly mortality: MortalityState;
  readonly actionRestriction: ActionRestriction;
  readonly initialConstitution: number;
  readonly currentConstitution: number;
  readonly successfulOrdinaryRevivifications: number;
  readonly zeroHpEpisode: ZeroHpEpisode | null;
  readonly lastDeath: DeathRecord | null;
  readonly permanentChanges: readonly PermanentLifeChange[];
}

function requiredId(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

function integer(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer.`);
}

function positiveInteger(value: number, label: string): void {
  integer(value, label);
  if (value < 1) throw new Error(`${label} must be positive.`);
}

function nonNegativeInteger(value: number, label: string): void {
  integer(value, label);
  if (value < 0) throw new Error(`${label} must be non-negative.`);
}

function uniqueSources(values: readonly CoreLifeStateSourceId[]): readonly CoreLifeStateSourceId[] {
  return Object.freeze([...new Set(values)]);
}

export function validateCoreLifeState(state: CoreLifeState): CoreLifeState {
  requiredId(state.actorId, 'actorId');
  positiveInteger(state.maximumHp, 'maximumHp');
  if (state.currentHp !== null) {
    integer(state.currentHp, 'currentHp');
    if (state.currentHp > state.maximumHp) throw new Error('currentHp cannot exceed maximumHp.');
  } else if (state.hpSettlement !== 'needs-dm') {
    throw new Error('A null currentHp requires needs-dm HP settlement.');
  }
  positiveInteger(state.initialConstitution, 'initialConstitution');
  integer(state.currentConstitution, 'currentConstitution');
  if (state.currentConstitution < 0) throw new Error('currentConstitution cannot be negative.');
  integer(state.successfulOrdinaryRevivifications, 'successfulOrdinaryRevivifications');
  if (state.successfulOrdinaryRevivifications < 0) throw new Error('successful revivifications cannot be negative.');
  if (state.successfulOrdinaryRevivifications > state.initialConstitution) {
    throw new Error('successful revivifications cannot exceed immutable initial Constitution.');
  }
  if ((state.mortality === 'unconscious-bleeding' || state.mortality === 'unconscious-stabilized') && !state.zeroHpEpisode) {
    throw new Error('An unconscious zero-HP state requires its episode facts.');
  }
  if ((state.mortality === 'dead' || state.mortality === 'forever-dead') && !state.lastDeath) {
    throw new Error('A dead state requires a death record.');
  }
  return state;
}

export function createCoreLifeState(input: {
  readonly actorId: string;
  readonly currentHp: number;
  readonly maximumHp: number;
  readonly initialConstitution: number;
  readonly currentConstitution?: number;
}): CoreLifeState {
  const state: CoreLifeState = Object.freeze({
    actorId: input.actorId,
    currentHp: input.currentHp,
    maximumHp: input.maximumHp,
    hpSettlement: 'settled',
    mortality: 'alive',
    actionRestriction: 'none',
    initialConstitution: input.initialConstitution,
    currentConstitution: input.currentConstitution ?? input.initialConstitution,
    successfulOrdinaryRevivifications: 0,
    zeroHpEpisode: null,
    lastDeath: null,
    permanentChanges: Object.freeze([]),
  });
  validateCoreLifeState(state);
  if (state.currentHp === null || state.currentHp < 1) throw new Error('A newly created living state must have at least 1 HP.');
  return state;
}

export type SameBlowEntryRule = 'strict-zero' | 'allow-minus-three';

interface DamageInput {
  readonly damage: number;
  readonly episodeId: string;
  readonly deathId: string;
  readonly cause: string;
  readonly gameDay?: number;
  readonly sameBlowEntryRule?: SameBlowEntryRule | null;
}

export type DamageResolution =
  | { readonly status: 'applied'; readonly state: CoreLifeState; readonly sourceIds: readonly CoreLifeStateSourceId[] }
  | { readonly status: 'needs-dm'; readonly reason: string; readonly proposedHp: number; readonly sourceIds: readonly CoreLifeStateSourceId[] };

function deathRecord(input: Pick<DamageInput, 'deathId' | 'cause' | 'gameDay'>, finality: DeathRecord['finality']): DeathRecord {
  requiredId(input.deathId, 'deathId');
  requiredId(input.cause, 'cause');
  if (input.gameDay !== undefined) positiveInteger(input.gameDay, 'gameDay');
  return Object.freeze({
    id: input.deathId,
    cause: input.cause,
    ...(input.gameDay === undefined ? {} : { gameDay: input.gameDay }),
    finality,
  });
}

export function applyHitPointLoss(state: CoreLifeState, input: DamageInput): DamageResolution {
  validateCoreLifeState(state);
  positiveInteger(input.damage, 'damage');
  requiredId(input.episodeId, 'episodeId');
  requiredId(input.cause, 'cause');
  if (state.mortality !== 'alive' || state.currentHp === null || state.hpSettlement !== 'settled') {
    throw new Error('Ordinary damage entry requires a living actor with settled HP.');
  }
  const proposedHp = state.currentHp - input.damage;
  if (proposedHp > 0) {
    return {
      status: 'applied',
      state: Object.freeze({ ...state, currentHp: proposedHp }),
      sourceIds: ['dmg:82:zero-hit-points'],
    };
  }

  if (proposedHp < 0 && proposedHp >= zeroHitPointRule.optionalSameBlowFloor && input.sameBlowEntryRule == null) {
    return {
      status: 'needs-dm', proposedHp,
      reason: 'DMG 82 makes the same-blow -1 through -3 unconscious entry optional; the campaign must adopt strict zero or allow-minus-three.',
      sourceIds: ['dmg:82:zero-hit-points'],
    };
  }

  const entersUnconscious = proposedHp === 0 ||
    (input.sameBlowEntryRule === 'allow-minus-three' && proposedHp >= zeroHitPointRule.optionalSameBlowFloor);
  if (entersUnconscious) {
    const episode: ZeroHpEpisode = Object.freeze({
      id: input.episodeId, lowestHp: proposedHp, roundsDeclining: 0, friendlyAidReceived: false,
    });
    return {
      status: 'applied',
      state: Object.freeze({
        ...state, currentHp: proposedHp, mortality: 'unconscious-bleeding',
        actionRestriction: 'unconscious', zeroHpEpisode: episode,
      }),
      sourceIds: ['dmg:82:zero-hit-points'],
    };
  }

  const dead = deathRecord(input, 'ordinary');
  return {
    status: 'applied',
    state: Object.freeze({
      ...state, currentHp: proposedHp, mortality: 'dead', actionRestriction: 'unconscious',
      zeroHpEpisode: null, lastDeath: dead,
    }),
    sourceIds: ['dmg:82:zero-hit-points'] as const,
  };
}

export function advanceZeroHpRound(state: CoreLifeState, input: { readonly deathId: string; readonly cause?: string; readonly gameDay?: number }) {
  validateCoreLifeState(state);
  if (state.mortality !== 'unconscious-bleeding' || state.currentHp === null || !state.zeroHpEpisode) {
    throw new Error('Only an unstabilized zero-HP episode loses the next negative point.');
  }
  const nextHp = state.currentHp - zeroHitPointRule.losesPerSucceedingRound;
  const episode = Object.freeze({
    ...state.zeroHpEpisode,
    lowestHp: Math.min(state.zeroHpEpisode.lowestHp, nextHp),
    roundsDeclining: state.zeroHpEpisode.roundsDeclining + 1,
  });
  if (nextHp <= zeroHitPointRule.deathAt) {
    const dead = deathRecord({
      deathId: input.deathId,
      cause: input.cause ?? 'zero-hit-point decline',
      ...(input.gameDay === undefined ? {} : { gameDay: input.gameDay }),
    }, 'ordinary');
    return Object.freeze({
      status: 'died' as const,
      state: Object.freeze({ ...state, currentHp: zeroHitPointRule.deathAt, mortality: 'dead' as const, lastDeath: dead, zeroHpEpisode: episode }),
      sourceIds: ['dmg:82:zero-hit-points'] as const,
    });
  }
  return Object.freeze({
    status: 'declined' as const,
    state: Object.freeze({ ...state, currentHp: nextHp, zeroHpEpisode: episode }),
    sourceIds: ['dmg:82:zero-hit-points'] as const,
  });
}

export function administerFriendlyAid(state: CoreLifeState) {
  validateCoreLifeState(state);
  if (state.mortality !== 'unconscious-bleeding' || !state.zeroHpEpisode) {
    throw new Error('Friendly aid can stop decline only during an unstabilized zero-HP episode.');
  }
  return Object.freeze({
    state: Object.freeze({
      ...state,
      mortality: 'unconscious-stabilized' as const,
      zeroHpEpisode: Object.freeze({ ...state.zeroHpEpisode, friendlyAidReceived: true }),
    }),
    hpChanged: false,
    sourceIds: ['dmg:82:zero-hit-points'] as const,
  });
}

export function reviveFromZeroHp(state: CoreLifeState, input: { readonly restoredHp: number; readonly comaTurns: number }) {
  validateCoreLifeState(state);
  if (!['unconscious-bleeding', 'unconscious-stabilized'].includes(state.mortality) || !state.zeroHpEpisode) {
    throw new Error('Zero-HP revival requires a living unconscious zero-HP episode.');
  }
  positiveInteger(input.restoredHp, 'restoredHp');
  if (input.restoredHp > state.maximumHp) throw new Error('restoredHp cannot exceed maximumHp.');
  positiveInteger(input.comaTurns, 'comaTurns');
  if (input.comaTurns > 6) throw new Error('comaTurns must be an actual 1d6 result.');
  const episode = Object.freeze({
    ...state.zeroHpEpisode,
    comaTurns: input.comaTurns,
    minimumConvalescenceDays: zeroHitPointRule.minimumConvalescenceDays,
  });
  return Object.freeze({
    state: Object.freeze({
      ...state, currentHp: input.restoredHp, hpSettlement: 'settled' as const,
      mortality: 'alive' as const, actionRestriction: 'zero-hp-convalescence' as const,
      zeroHpEpisode: episode,
    }),
    convalescence: Object.freeze({
      comaTurns: input.comaTurns,
      minimumRestDays: zeroHitPointRule.minimumConvalescenceDays,
      ordinaryHealingEndsRestriction: false,
      healSpellEndsRestriction: true,
    }),
    sourceIds: ['dmg:82:zero-hit-points'] as const,
  });
}

export function assessSevereZeroHpInjury(state: CoreLifeState) {
  validateCoreLifeState(state);
  const lowestHp = state.zeroHpEpisode?.lowestHp;
  if (lowestHp === undefined || lowestHp > zeroHitPointRule.severeNegativeThreshold) {
    return Object.freeze({ status: 'not-triggered' as const, sourceIds: ['dmg:82:zero-hit-points'] as const });
  }
  return Object.freeze({
    status: 'needs-dm' as const,
    reason: 'DMG 82 permits, but does not require or randomly determine, scarring or member loss at -6 or worse before revival.',
    lowestHp,
    sourceIds: ['dmg:82:zero-hit-points'] as const,
  });
}

export function recordSevereZeroHpInjury(state: CoreLifeState, input: {
  readonly changeId: string;
  readonly description: string;
  readonly rulingId: string;
}) {
  const assessment = assessSevereZeroHpInjury(state);
  if (assessment.status !== 'needs-dm') throw new Error('This episode did not reach the optional severe-injury threshold.');
  requiredId(input.changeId, 'changeId');
  requiredId(input.description, 'description');
  requiredId(input.rulingId, 'rulingId');
  const change: PermanentLifeChange = Object.freeze({
    id: input.changeId, kind: 'severe-zero-hp-injury', status: 'applied',
    description: input.description, rulingId: input.rulingId,
    sourceIds: ['dmg:82:zero-hit-points'] as const,
  });
  return Object.freeze({ ...state, permanentChanges: Object.freeze([...state.permanentChanges, change]) });
}

export type RevivalCheckRoute = 'phb-resurrection-survival' | 'dmg-p110-system-shock-wording';

export interface DeathInterval {
  readonly value: number;
  readonly unit: 'days' | 'years';
}

export interface RevivalAssessmentInput {
  readonly methodId: CoreRevivalMethodId;
  readonly subjectRaceId: CoreSubjectRaceId;
  readonly deathInterval: DeathInterval;
  readonly bodyAvailable: boolean;
  readonly casterLevel?: number;
  readonly checkRoute?: RevivalCheckRoute | null;
  readonly percentileRoll?: number;
}

export type RevivalAssessment = Readonly<{
  status: 'needs-dm' | 'forbidden' | 'ready-for-player-roll' | 'passed' | 'failed' | 'eligible-no-survival-roll';
  methodId: CoreRevivalMethodId;
  reason: string;
  sourceIds: readonly CoreLifeStateSourceId[];
  threshold?: number;
  percentileRoll?: number;
  constitutionLossOnSuccess?: number;
  countsAgainstInitialConstitutionLimit?: boolean;
  deathInterval?: DeathInterval;
  stateBasis: Readonly<{
    actorId: string;
    deathId: string;
    currentConstitution: number;
    successfulOrdinaryRevivifications: number;
  }>;
}>;

function result(input: Omit<RevivalAssessment, 'sourceIds'> & { sourceIds: readonly CoreLifeStateSourceId[] }): RevivalAssessment {
  return Object.freeze({ ...input, sourceIds: uniqueSources(input.sourceIds) });
}

function withinMethodWindow(methodId: CoreRevivalMethodId, interval: DeathInterval, casterLevel?: number): true | string {
  nonNegativeInteger(interval.value, 'deathInterval.value');
  const window = coreRevivalMethods[methodId].maximumDeathInterval;
  if (window.unit === 'needs-dm') return 'The bounded source pack does not verify this method’s death-time window.';
  if (window.unit === 'fixed-days') {
    if (interval.unit !== 'days') return 'Campaign year-to-day conversion is not inferred for this fixed-day spell window.';
    return interval.value <= window.value ? true : `Death interval exceeds the fixed ${window.value}-day limit.`;
  }
  if (interval.unit !== window.unit) return `The printed limit is in ${window.unit}; no campaign calendar conversion is inferred.`;
  if (casterLevel === undefined) return 'Caster level is required for this spell window.';
  positiveInteger(casterLevel, 'casterLevel');
  return interval.value <= window.perCasterLevel * casterLevel
    ? true
    : `Death interval exceeds ${window.perCasterLevel} ${window.unit} per caster level.`;
}

export function assessCoreRevival(state: CoreLifeState, input: RevivalAssessmentInput): RevivalAssessment {
  validateCoreLifeState(state);
  const method = coreRevivalMethods[input.methodId];
  const sources = method.sourceIds;
  if (state.mortality !== 'dead' && state.mortality !== 'forever-dead') {
    throw new Error('Revival assessment requires a dead character state.');
  }
  const basis = Object.freeze({
    actorId: state.actorId,
    deathId: state.lastDeath!.id,
    currentConstitution: state.currentConstitution,
    successfulOrdinaryRevivifications: state.successfulOrdinaryRevivifications,
  });
  const finish = (candidate: Omit<RevivalAssessment, 'sourceIds' | 'stateBasis'> & {
    readonly sourceIds: readonly CoreLifeStateSourceId[];
  }): RevivalAssessment => result({ ...candidate, stateBasis: basis });
  if (state.mortality === 'forever-dead' && input.methodId !== 'wish-or-other-magic') {
    return finish({ status: 'forbidden', methodId: input.methodId, reason: 'The prior ordinary survival failure made the character forever dead to ordinary revival.', sourceIds: sources });
  }
  if (!input.bodyAvailable) {
    return finish({ status: input.methodId === 'wish-or-other-magic' ? 'needs-dm' : 'forbidden', methodId: input.methodId, reason: 'The verified spell procedure requires the relevant corpse or bones; no substitute is inferred.', sourceIds: sources });
  }
  if (method.subjectEligibility === 'needs-dm') {
    return finish({ status: 'needs-dm', methodId: input.methodId, reason: 'Target eligibility and procedure are not fully verified for this method.', sourceIds: sources });
  }
  if (method.subjectEligibility === 'raise-dead-five-races' && !raiseDeadEligibleRaces.includes(input.subjectRaceId as typeof raiseDeadEligibleRaces[number])) {
    return finish({ status: 'forbidden', methodId: input.methodId, reason: 'Raise dead and resurrection list dwarf, gnome, half-elf, halfling and human only.', sourceIds: sources });
  }
  const window = withinMethodWindow(input.methodId, input.deathInterval, input.casterLevel);
  if (window !== true) {
    const beyond = window.startsWith('Death interval exceeds');
    return finish({ status: beyond ? 'forbidden' : 'needs-dm', methodId: input.methodId, reason: window, sourceIds: sources, deathInterval: input.deathInterval });
  }

  if (method.survivalCheck === 'none') {
    return finish({
      status: 'eligible-no-survival-roll', methodId: input.methodId,
      reason: 'This reincarnation route does not use the clerical resurrection-survival procedure; its distinct form outcome still remains.',
      sourceIds: sources, constitutionLossOnSuccess: 0,
      countsAgainstInitialConstitutionLimit: false, deathInterval: input.deathInterval,
    });
  }
  if (method.survivalCheck === 'needs-dm') {
    return finish({ status: 'needs-dm', methodId: input.methodId, reason: 'The method-specific survival procedure is unverified.', sourceIds: sources });
  }
  if (state.successfulOrdinaryRevivifications >= state.initialConstitution) {
    return finish({
      status: 'forbidden', methodId: input.methodId,
      reason: 'The immutable initial-Constitution limit on successful ordinary revivifications is exhausted.',
      sourceIds: sources,
    });
  }
  if (!input.checkRoute) {
    return finish({
      status: 'needs-dm', methodId: input.methodId,
      reason: revivalCheckSourceConflict.note,
      sourceIds: [...sources, ...revivalCheckSourceConflict.sourceIds],
    });
  }
  const row = constitutionSurvivalTable.find(candidate => candidate.score === state.currentConstitution);
  if (!row) {
    return finish({
      status: 'needs-dm', methodId: input.methodId,
      reason: 'Current Constitution lies outside the verified PHB 3–18 survival table; no extrapolation is made.',
      sourceIds: [...sources, 'phb:12:constitution-revivification'],
    });
  }
  const threshold = input.checkRoute === 'phb-resurrection-survival' ? row.resurrection : row.systemShock;
  if (input.percentileRoll === undefined) {
    return finish({
      status: 'ready-for-player-roll', methodId: input.methodId,
      reason: 'The player rolls d100; DMG 110 says this roll must not be tampered with.',
      threshold, sourceIds: [...sources, ...revivalCheckSourceConflict.sourceIds],
      constitutionLossOnSuccess: 1, countsAgainstInitialConstitutionLimit: true,
      deathInterval: input.deathInterval,
    });
  }
  positiveInteger(input.percentileRoll, 'percentileRoll');
  if (input.percentileRoll > 100) throw new Error('percentileRoll must be an actual d100 result.');
  return finish({
    status: input.percentileRoll <= threshold ? 'passed' : 'failed',
    methodId: input.methodId,
    reason: input.percentileRoll <= threshold
      ? 'The adopted Constitution-table check succeeded.'
      : 'The adopted Constitution-table check failed; ordinary raise dead/resurrection can no longer restore this character.',
    threshold, percentileRoll: input.percentileRoll,
    constitutionLossOnSuccess: 1, countsAgainstInitialConstitutionLimit: true,
    deathInterval: input.deathInterval,
    sourceIds: [...sources, ...revivalCheckSourceConflict.sourceIds],
  });
}

export function commitCoreRevival(state: CoreLifeState, assessment: RevivalAssessment, input: {
  readonly changeId: string;
  readonly appearanceTurns?: number;
}) {
  validateCoreLifeState(state);
  requiredId(input.changeId, 'changeId');
  if (
    assessment.stateBasis.actorId !== state.actorId ||
    assessment.stateBasis.deathId !== state.lastDeath?.id ||
    assessment.stateBasis.currentConstitution !== state.currentConstitution ||
    assessment.stateBasis.successfulOrdinaryRevivifications !== state.successfulOrdinaryRevivifications
  ) {
    throw new Error('Revival assessment is stale or belongs to a different death/state; reassess before commit.');
  }
  if (assessment.status === 'failed') {
    const lastDeath = state.lastDeath;
    if (!lastDeath) throw new Error('A failed revival requires the existing death record.');
    return Object.freeze({
      status: 'forever-dead' as const,
      state: Object.freeze({
        ...state,
        mortality: 'forever-dead' as const,
        lastDeath: Object.freeze({ ...lastDeath, finality: 'failed-ordinary-revival' as const }),
      }),
      sourceIds: assessment.sourceIds,
    });
  }
  if (assessment.status !== 'passed' && assessment.status !== 'eligible-no-survival-roll') {
    throw new Error('Only a passed or no-survival-roll assessment can be committed as a successful revival.');
  }
  const method = coreRevivalMethods[assessment.methodId];
  const priorDeath = state.lastDeath;
  if (!priorDeath || (state.mortality !== 'dead' && state.mortality !== 'forever-dead')) {
    throw new Error('Successful revival requires an unresolved death record.');
  }

  const reincarnation = method.distinctOutcomeTable === 'druid-table' || method.distinctOutcomeTable === 'magic-user-table';
  if (reincarnation) {
    if (input.appearanceTurns === undefined) throw new Error('Reincarnation requires the actual 1d6 appearance-turn result.');
    positiveInteger(input.appearanceTurns, 'appearanceTurns');
    if (input.appearanceTurns > 6) throw new Error('appearanceTurns must be an actual 1d6 result.');
    const change: PermanentLifeChange = Object.freeze({
      id: input.changeId, kind: 'reincarnation-form-change', status: 'needs-dm',
      description: `${method.distinctOutcomeTable} outcome, class, abilities and speech require method-specific settlement; appears in ${input.appearanceTurns} turn(s).`,
      sourceIds: method.sourceIds,
    });
    return Object.freeze({
      status: 'revived-rebuild-pending' as const,
      state: Object.freeze({
        ...state, currentHp: null, hpSettlement: 'needs-dm' as const,
        mortality: 'alive' as const, actionRestriction: 'reincarnation-rebuild-pending' as const,
        lastDeath: Object.freeze({ ...priorDeath, resolvedByMethodId: assessment.methodId }),
        permanentChanges: Object.freeze([...state.permanentChanges, change]),
      }),
      appearanceTurns: input.appearanceTurns,
      sourceIds: assessment.sourceIds,
    });
  }

  if (assessment.constitutionLossOnSuccess !== 1 || assessment.countsAgainstInitialConstitutionLimit !== true) {
    throw new Error('This bounded engine cannot commit an unverified ordinary revival effect.');
  }
  const change: PermanentLifeChange = Object.freeze({
    id: input.changeId, kind: 'revivification-constitution-loss', status: 'applied',
    description: 'Successful raise dead/resurrection permanently reduces current Constitution by 1; initial Constitution remains immutable.',
    constitutionDelta: -1, sourceIds: method.sourceIds,
  });
  const raiseDead = assessment.methodId === 'cleric-raise-dead';
  const bedRestDays = raiseDead && assessment.deathInterval?.unit === 'days' ? assessment.deathInterval.value : undefined;
  return Object.freeze({
    status: 'revived-hp-needs-dm' as const,
    state: Object.freeze({
      ...state, currentHp: null, hpSettlement: 'needs-dm' as const,
      mortality: 'alive' as const,
      actionRestriction: raiseDead ? 'raise-dead-bed-rest' as const : 'none' as const,
      currentConstitution: state.currentConstitution - 1,
      successfulOrdinaryRevivifications: state.successfulOrdinaryRevivifications + 1,
      lastDeath: Object.freeze({ ...priorDeath, resolvedByMethodId: assessment.methodId }),
      permanentChanges: Object.freeze([...state.permanentChanges, change]),
    }),
    ...(bedRestDays === undefined ? {} : { targetBedRestDays: bedRestDays }),
    casterObligation: assessment.methodId === 'cleric-resurrection'
      ? 'Caster cannot cast or fight until one day of bed rest per experience level of the person restored; track on the caster, not the target.'
      : null,
    sourceIds: assessment.sourceIds,
  });
}

export function recordDmPermanentConstitutionChange(state: CoreLifeState, input: {
  readonly changeId: string;
  readonly delta: number;
  readonly description: string;
  readonly rulingId: string;
  readonly sourceIds: readonly CoreLifeStateSourceId[];
}) {
  validateCoreLifeState(state);
  requiredId(input.changeId, 'changeId');
  requiredId(input.description, 'description');
  requiredId(input.rulingId, 'rulingId');
  integer(input.delta, 'delta');
  if (input.delta === 0) throw new Error('A permanent Constitution change cannot have a zero delta.');
  if (input.sourceIds.length === 0) throw new Error('A permanent change requires at least one source ID.');
  const next = state.currentConstitution + input.delta;
  if (!Number.isSafeInteger(next) || next < 0) throw new Error('The resulting current Constitution is invalid.');
  const change: PermanentLifeChange = Object.freeze({
    id: input.changeId, kind: 'other-permanent-change', status: 'applied',
    description: input.description, constitutionDelta: input.delta,
    rulingId: input.rulingId, sourceIds: uniqueSources(input.sourceIds),
  });
  return Object.freeze({
    ...state,
    currentConstitution: next,
    permanentChanges: Object.freeze([...state.permanentChanges, change]),
    // initialConstitution and successfulOrdinaryRevivifications intentionally remain unchanged.
  });
}
