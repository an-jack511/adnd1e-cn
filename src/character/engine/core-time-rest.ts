import {
  coreActivityRules,
  knownActivityOverlapConflicts,
  languageStudyRule,
  naturalRecoveryConflict,
  naturalRecoveryRoutes,
  zeroHitPointConvalescenceRule,
  type CoreActivityKind,
  type CoreTimeRestSourceId,
  type NaturalRecoveryRouteId,
} from '../rules/core-time-rest';

export interface DayInterval {
  /** Positive integer campaign day on which the interval begins. */
  readonly startDay: number;
  /** First campaign day not occupied by the interval. */
  readonly endDayExclusive: number;
}
export interface TimedActivity {
  readonly id: string;
  readonly actorId: string;
  readonly kind: CoreActivityKind;
  readonly interval: DayInterval;
  readonly locationId?: string;
  readonly note?: string;
}

function positiveDay(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive safe-integer campaign day.`);
  }
}

export function validateDayInterval(interval: DayInterval): DayInterval {
  positiveDay(interval.startDay, 'startDay');
  positiveDay(interval.endDayExclusive, 'endDayExclusive');
  if (interval.endDayExclusive <= interval.startDay) {
    throw new Error('A campaign interval must contain at least one day.');
  }
  return Object.freeze({ ...interval });
}

export function intervalLengthDays(interval: DayInterval): number {
  const checked = validateDayInterval(interval);
  return checked.endDayExclusive - checked.startDay;
}

export function intervalsOverlap(a: DayInterval, b: DayInterval): boolean {
  const left = validateDayInterval(a);
  const right = validateDayInterval(b);
  return left.startDay < right.endDayExclusive && right.startDay < left.endDayExclusive;
}

export function advanceActorTime(input: {
  readonly actorId: string;
  readonly currentDay: number;
  readonly activity: TimedActivity;
}) {
  positiveDay(input.currentDay, 'currentDay');
  validateActivity(input.activity);
  if (input.activity.actorId !== input.actorId) throw new Error('Activity actor does not match the time ledger.');
  if (input.activity.interval.startDay !== input.currentDay) {
    throw new Error('Activity must begin at this actor’s current campaign day; no real-time or global-party jump is inferred.');
  }
  return Object.freeze({
    actorId: input.actorId,
    previousDay: input.currentDay,
    currentDay: input.activity.interval.endDayExclusive,
    activityId: input.activity.id,
    sourceIds: ['dmg:37:time-in-campaign'] as const,
  });
}

function validateActivity(activity: TimedActivity): void {
  if (!activity.id.trim() || !activity.actorId.trim()) throw new Error('Activity and actor IDs are required.');
  if (!(activity.kind in coreActivityRules)) throw new Error(`Unknown activity kind: ${String(activity.kind)}`);
  validateDayInterval(activity.interval);
}

type ActivityConflictResult =
  | { readonly status: 'different-actors' | 'no-overlap'; readonly sourceIds: readonly CoreTimeRestSourceId[] }
  | { readonly status: 'conflict' | 'needs-dm'; readonly reason: string; readonly sourceIds: readonly CoreTimeRestSourceId[] };

function isPair(a: CoreActivityKind, b: CoreActivityKind, left: CoreActivityKind, right: CoreActivityKind): boolean {
  return (a === left && b === right) || (a === right && b === left);
}

export function assessActivityConflict(a: TimedActivity, b: TimedActivity): ActivityConflictResult {
  validateActivity(a);
  validateActivity(b);
  if (a.actorId !== b.actorId) return { status: 'different-actors', sourceIds: ['dmg:37:time-in-campaign'] };
  if (!intervalsOverlap(a.interval, b.interval)) return { status: 'no-overlap', sourceIds: ['dmg:37:time-in-campaign'] };

  for (const conflict of knownActivityOverlapConflicts) {
    if (isPair(a.kind, b.kind, conflict.kinds[0], conflict.kinds[1])) {
      return { status: 'conflict', reason: conflict.reason, sourceIds: conflict.sourceIds };
    }
  }

  if (isPair(a.kind, b.kind, 'rest', a.kind === 'rest' ? b.kind : a.kind)) {
    const other = a.kind === 'rest' ? b : a;
    const effect = coreActivityRules[other.kind].dmgRecoveryRestEffect;
    if (effect === 'breaks') {
      return {
        status: 'conflict',
        reason: `${other.kind} interrupts recuperative rest under its sourced rule.`,
        sourceIds: coreActivityRules[other.kind].sourceIds,
      };
    }
    if (effect === 'needs-dm') {
      return {
        status: 'needs-dm',
        reason: `The source does not establish that every ${other.kind} interval qualifies as or interrupts recuperative rest.`,
        sourceIds: [...coreActivityRules.rest.sourceIds, ...coreActivityRules[other.kind].sourceIds],
      };
    }
  }

  return {
    status: 'needs-dm',
    reason: `Overlapping ${a.kind} and ${b.kind} are not declared universally compatible or incompatible by this rule pack.`,
    sourceIds: [...coreActivityRules[a.kind].sourceIds, ...coreActivityRules[b.kind].sourceIds],
  };
}

export function languageStudyMonths(intelligence: number) {
  if (!Number.isSafeInteger(intelligence)) throw new Error('Intelligence must be an integer.');
  if (intelligence < 3 || intelligence > 18) {
    return Object.freeze({
      status: 'needs-dm' as const,
      reason: 'This core calculation is limited to ordinary PHB ability scores 3–18.',
      sourceIds: languageStudyRule.sourceIds,
    });
  }
  const months = languageStudyRule.baseMonths - Math.max(0, intelligence - languageStudyRule.oneMonthReductionPerIntPointAbove);
  return Object.freeze({
    status: 'calculated' as const,
    months,
    instructorRequired: true,
    closeProximityRequired: true,
    calendarConversion: languageStudyRule.calendarConversion,
    sourceIds: languageStudyRule.sourceIds,
  });
}

export type InterruptionRuling = 'not-serious' | 'serious';

export function adjudicateActivityInterruption(input: {
  readonly activityId: string;
  readonly interruption: DayInterval;
  readonly cause: string;
  readonly dmRuling?: InterruptionRuling;
  readonly rulingId?: string;
}) {
  if (!input.activityId.trim() || !input.cause.trim()) throw new Error('Activity ID and interruption cause are required.');
  validateDayInterval(input.interruption);
  if (!input.dmRuling) {
    return Object.freeze({
      status: 'needs-dm' as const,
      activityId: input.activityId,
      interruption: { ...input.interruption },
      cause: input.cause,
      consequence: 'No benefit, cost, elapsed time, or continuity is changed until the DM classifies the interruption.',
    });
  }
  if (!input.rulingId?.trim()) throw new Error('A committed DM interruption ruling requires a rulingId.');
  return Object.freeze({
    status: input.dmRuling === 'serious' ? 'serious-interruption' as const : 'not-serious' as const,
    activityId: input.activityId,
    interruption: { ...input.interruption },
    cause: input.cause,
    rulingId: input.rulingId,
    consequence: input.dmRuling === 'serious'
      ? 'Apply only the consequence defined by the activity’s own sourced rule or a separately recorded DM ruling; never auto-refund or erase history.'
      : 'Keep the interruption record; this ruling does not itself erase prior benefit, cost, or elapsed time.',
  });
}

interface NaturalRecoveryInput {
  readonly routeId: NaturalRecoveryRouteId | null;
  readonly currentHp: number;
  readonly maximumHp: number;
  readonly restInterval: DayInterval;
  readonly priorContinuousRestDays?: number;
  /** Applicable CON hit-point adjustment supplied by the validated character rules. */
  readonly constitutionHealingAdjustment?: number;
  readonly overlappingActivities?: readonly TimedActivity[];
  readonly actorId: string;
  /** Required only for campaign-adopted-ruling. */
  readonly dmAwardHp?: number;
  readonly rulingId?: string;
}

function nonNegativeSafe(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer.`);
}

function validateHp(currentHp: number, maximumHp: number): void {
  nonNegativeSafe(currentHp, 'currentHp');
  if (!Number.isSafeInteger(maximumHp) || maximumHp < 1) throw new Error('maximumHp must be a positive safe integer.');
  if (currentHp > maximumHp) throw new Error('currentHp cannot exceed maximumHp.');
}

function capRecovery(currentHp: number, maximumHp: number, proposed: number): number {
  return Math.min(maximumHp - currentHp, proposed);
}

function phbRecoveryForDays(priorDays: number, days: number): number {
  let recovered = 0;
  for (let offset = 1; offset <= days; offset += 1) {
    const continuousDay = priorDays + offset;
    recovered += continuousDay <= 30 ? 1 : 5;
  }
  return recovered;
}

function dmgRecoveryForDays(priorDays: number, days: number, conAdjustment: number): number {
  let recovered = 0;
  for (let offset = 1; offset <= days; offset += 1) {
    const continuousDay = priorDays + offset;
    const week = Math.ceil(continuousDay / 7);
    const dayInWeek = ((continuousDay - 1) % 7) + 1;
    if (conAdjustment < 0 && dayInWeek <= Math.abs(conAdjustment)) continue;
    recovered += 1;
    // DMG states the positive CON addition by week after the first; posting it
    // at a completed week boundary is an explicit deterministic allocation.
    if (conAdjustment > 0 && week >= 2 && dayInWeek === 7) recovered += conAdjustment;
  }
  return recovered;
}

export function settleNaturalRecovery(input: NaturalRecoveryInput) {
  if (!input.actorId.trim()) throw new Error('actorId is required.');
  validateHp(input.currentHp, input.maximumHp);
  const interval = validateDayInterval(input.restInterval);
  const days = intervalLengthDays(interval);
  const priorDays = input.priorContinuousRestDays ?? 0;
  nonNegativeSafe(priorDays, 'priorContinuousRestDays');

  if (!input.routeId) {
    return Object.freeze({
      status: 'source-conflict-needs-adoption' as const,
      recoveredHp: 0,
      newHp: input.currentHp,
      conflictId: naturalRecoveryConflict.id,
      routeIds: naturalRecoveryConflict.routeIds,
      sourceIds: naturalRecoveryConflict.sourceIds,
    });
  }

  const overlaps = (input.overlappingActivities ?? []).filter(activity => {
    validateActivity(activity);
    return activity.actorId === input.actorId && intervalsOverlap(interval, activity.interval) && activity.kind !== 'rest';
  });
  const breaking = overlaps.filter(activity => coreActivityRules[activity.kind].dmgRecoveryRestEffect === 'breaks');
  if (breaking.length) {
    return Object.freeze({
      status: 'interrupted' as const,
      recoveredHp: 0,
      newHp: input.currentHp,
      interruptionActivityIds: breaking.map(activity => activity.id),
      reason: 'The requested interval is not continuous recuperative rest; split and recommit factual rest intervals instead of granting a partial result implicitly.',
      sourceIds: [...new Set(breaking.flatMap(activity => coreActivityRules[activity.kind].sourceIds))],
    });
  }
  const uncertain = overlaps.filter(activity => coreActivityRules[activity.kind].dmgRecoveryRestEffect === 'needs-dm');
  if (uncertain.length) {
    return Object.freeze({
      status: 'needs-dm' as const,
      recoveredHp: 0,
      newHp: input.currentHp,
      activityIds: uncertain.map(activity => activity.id),
      reason: 'The DM must decide whether the concrete overlapping activity qualifies as rest or interrupts continuity.',
      sourceIds: [...new Set(uncertain.flatMap(activity => coreActivityRules[activity.kind].sourceIds))],
    });
  }

  if (input.routeId === 'campaign-adopted-ruling') {
    if (!input.rulingId?.trim() || input.dmAwardHp === undefined) {
      return Object.freeze({
        status: 'needs-dm' as const,
        recoveredHp: 0,
        newHp: input.currentHp,
        reason: 'A campaign-adopted recovery ruling requires both a rulingId and an explicit HP award.',
        sourceIds: naturalRecoveryRoutes[input.routeId].sourceIds,
      });
    }
    nonNegativeSafe(input.dmAwardHp, 'dmAwardHp');
    const recoveredHp = capRecovery(input.currentHp, input.maximumHp, input.dmAwardHp);
    return Object.freeze({
      status: 'settled-by-ruling' as const,
      routeId: input.routeId,
      rulingId: input.rulingId,
      recoveredHp,
      newHp: input.currentHp + recoveredHp,
      continuousRestDaysAfter: priorDays + days,
      sourceIds: naturalRecoveryRoutes[input.routeId].sourceIds,
    });
  }

  let proposed: number;
  if (input.routeId === 'phb-105-natural') {
    proposed = phbRecoveryForDays(priorDays, days);
  } else {
    const conAdjustment = input.constitutionHealingAdjustment ?? 0;
    if (!Number.isSafeInteger(conAdjustment) || conAdjustment < -2 || conAdjustment > 4) {
      return Object.freeze({
        status: 'needs-dm' as const,
        recoveredHp: 0,
        newHp: input.currentHp,
        reason: 'The DMG route expects an applicable core CON adjustment from -2 through +4; unusual scores or effects require a ruling.',
        sourceIds: naturalRecoveryRoutes[input.routeId].sourceIds,
      });
    }
    const continuousRestDaysAfter = priorDays + days;
    proposed = continuousRestDaysAfter >= 28
      ? input.maximumHp - input.currentHp
      : dmgRecoveryForDays(priorDays, days, conAdjustment);
  }
  const recoveredHp = capRecovery(input.currentHp, input.maximumHp, proposed);
  return Object.freeze({
    status: 'settled' as const,
    routeId: input.routeId,
    recoveredHp,
    newHp: input.currentHp + recoveredHp,
    continuousRestDaysAfter: priorDays + days,
    sourceIds: naturalRecoveryRoutes[input.routeId].sourceIds,
  });
}

export function planZeroHitPointConvalescence(input: {
  readonly actorId: string;
  readonly comaTurns: number;
  readonly restStartDay: number;
  readonly intervention?: 'none' | 'cure-or-potion' | 'heal-spell';
  readonly interventionDay?: number;
}) {
  if (!input.actorId.trim()) throw new Error('actorId is required.');
  if (!Number.isSafeInteger(input.comaTurns) || input.comaTurns < 1 || input.comaTurns > 6) {
    throw new Error('comaTurns must be a recorded 1d6 result from 1 through 6.');
  }
  positiveDay(input.restStartDay, 'restStartDay');
  const intervention = input.intervention ?? 'none';
  if (input.interventionDay !== undefined) positiveDay(input.interventionDay, 'interventionDay');
  if (intervention !== 'none' && input.interventionDay === undefined) {
    throw new Error('A magical intervention requires its campaign day.');
  }
  if (input.interventionDay !== undefined && input.interventionDay < input.restStartDay) {
    throw new Error('Intervention cannot precede the convalescence start day.');
  }
  const ordinaryEnd = input.restStartDay + zeroHitPointConvalescenceRule.minimumRestDaysAfterComa;
  const liftedByHeal = intervention === 'heal-spell' && input.interventionDay! < ordinaryEnd;
  const restrictionEndDayExclusive = liftedByHeal ? input.interventionDay! : ordinaryEnd;
  return Object.freeze({
    status: liftedByHeal ? 'restriction-lifted-by-heal' as const : 'minimum-week-required' as const,
    actorId: input.actorId,
    comaTurns: input.comaTurns,
    intervention,
    restriction: restrictionEndDayExclusive === input.restStartDay
      ? null
      : Object.freeze({ startDay: input.restStartDay, endDayExclusive: restrictionEndDayExclusive }),
    prohibitedActions: zeroHitPointConvalescenceRule.prohibitedActions,
    hpTotalDoesNotEndRestriction: true,
    sourceIds: zeroHitPointConvalescenceRule.sourceIds,
  });
}
