import assert from 'node:assert/strict';
import {
  adjudicateActivityInterruption,
  advanceActorTime,
  assessActivityConflict,
  intervalLengthDays,
  intervalsOverlap,
  languageStudyMonths,
  planZeroHitPointConvalescence,
  settleNaturalRecovery,
  validateDayInterval,
  type TimedActivity,
} from '../src/character/engine/core-time-rest';

const activity = (
  id: string,
  actorId: string,
  kind: TimedActivity['kind'],
  startDay: number,
  endDayExclusive: number,
): TimedActivity => ({ id, actorId, kind, interval: { startDay, endDayExclusive } });

// Half-open campaign days are deterministic and do not borrow the real clock.
assert.deepEqual(validateDayInterval({ startDay: 51, endDayExclusive: 57 }), { startDay: 51, endDayExclusive: 57 });
assert.equal(intervalLengthDays({ startDay: 51, endDayExclusive: 57 }), 6);
assert.equal(intervalsOverlap({ startDay: 1, endDayExclusive: 2 }, { startDay: 2, endDayExclusive: 3 }), false);
assert.equal(intervalsOverlap({ startDay: 1, endDayExclusive: 3 }, { startDay: 2, endDayExclusive: 4 }), true);
assert.throws(() => validateDayInterval({ startDay: 5, endDayExclusive: 5 }), /at least one day/);
assert.deepEqual(
  advanceActorTime({ actorId: 'pc-a', currentDay: 51, activity: activity('journey', 'pc-a', 'travel', 51, 62) }),
  {
    actorId: 'pc-a', previousDay: 51, currentDay: 62, activityId: 'journey',
    sourceIds: ['dmg:37:time-in-campaign'],
  },
);
assert.throws(
  () => advanceActorTime({ actorId: 'pc-b', currentDay: 51, activity: activity('a', 'pc-a', 'rest', 51, 52) }),
  /does not match/,
);

// Explicitly sourced conflicts are automatic; unproved overlaps remain DM work.
assert.equal(
  assessActivityConflict(
    activity('forge', 'pc-a', 'magic-item-manufacture', 1, 15),
    activity('raid', 'pc-a', 'adventuring', 7, 8),
  ).status,
  'conflict',
);
assert.equal(
  assessActivityConflict(
    activity('elvish', 'pc-a', 'language-study', 1, 181),
    activity('dwarvish', 'pc-a', 'language-study', 90, 270),
  ).status,
  'conflict',
);
assert.equal(
  assessActivityConflict(activity('rest', 'pc-a', 'rest', 1, 8), activity('fight', 'pc-a', 'combat', 4, 5)).status,
  'conflict',
);
assert.equal(
  assessActivityConflict(activity('rest', 'pc-a', 'rest', 1, 8), activity('travel', 'pc-a', 'travel', 4, 5)).status,
  'needs-dm',
);
assert.equal(
  assessActivityConflict(activity('a', 'pc-a', 'training', 1, 8), activity('b', 'pc-b', 'training', 1, 8)).status,
  'different-actors',
);
assert.equal(
  assessActivityConflict(activity('a', 'pc-a', 'training', 1, 8), activity('b', 'pc-a', 'spell-research', 8, 9)).status,
  'no-overlap',
);

// Language duration is kept in campaign months; month lengths remain campaign data.
const int12Language = languageStudyMonths(12);
const int13Language = languageStudyMonths(13);
const int18Language = languageStudyMonths(18);
assert.equal(int12Language.status, 'calculated');
assert.equal(int13Language.status, 'calculated');
assert.equal(int18Language.status, 'calculated');
if (int12Language.status !== 'calculated' || int13Language.status !== 'calculated' || int18Language.status !== 'calculated') {
  throw new Error('Ordinary PHB Intelligence scores unexpectedly require a DM ruling.');
}
assert.equal(int12Language.months, 12);
assert.equal(int13Language.months, 11);
assert.equal(int18Language.months, 6);
assert.equal(languageStudyMonths(19).status, 'needs-dm');

// Severe interruption is never guessed and does not silently undo time or money.
const pendingInterruption = adjudicateActivityInterruption({
  activityId: 'training-1', interruption: { startDay: 8, endDayExclusive: 9 }, cause: 'left town',
});
assert.equal(pendingInterruption.status, 'needs-dm');
assert.match(pendingInterruption.consequence, /No benefit, cost, elapsed time/);
assert.throws(
  () => adjudicateActivityInterruption({
    activityId: 'training-1', interruption: { startDay: 8, endDayExclusive: 9 }, cause: 'left town', dmRuling: 'serious',
  }),
  /rulingId/,
);
assert.equal(adjudicateActivityInterruption({
  activityId: 'training-1', interruption: { startDay: 8, endDayExclusive: 9 }, cause: 'left town',
  dmRuling: 'serious', rulingId: 'ruling-17',
}).status, 'serious-interruption');

const baseRecovery = {
  actorId: 'pc-a', currentHp: 1, maximumHp: 100, restInterval: { startDay: 1, endDayExclusive: 29 },
} as const;

// No hidden precedence: callers must adopt PHB, DMG, or an explicit campaign ruling.
const noRoute = settleNaturalRecovery({ ...baseRecovery, routeId: null });
assert.equal(noRoute.status, 'source-conflict-needs-adoption');
assert.deepEqual(noRoute.routeIds, ['phb-105-natural', 'dmg-82-natural']);

// The two printed narratives remain observably different.
const phb28 = settleNaturalRecovery({ ...baseRecovery, routeId: 'phb-105-natural' });
assert.deepEqual([phb28.status, phb28.recoveredHp, phb28.newHp], ['settled', 28, 29]);
const dmg28 = settleNaturalRecovery({ ...baseRecovery, routeId: 'dmg-82-natural', constitutionHealingAdjustment: 0 });
assert.deepEqual([dmg28.status, dmg28.recoveredHp, dmg28.newHp], ['settled', 99, 100]);

const phbAfterThirty = settleNaturalRecovery({
  routeId: 'phb-105-natural', actorId: 'pc-a', currentHp: 0, maximumHp: 100,
  restInterval: { startDay: 31, endDayExclusive: 33 }, priorContinuousRestDays: 30,
});
assert.equal(phbAfterThirty.recoveredHp, 10);

const dmgPoorCon = settleNaturalRecovery({
  routeId: 'dmg-82-natural', actorId: 'pc-a', currentHp: 0, maximumHp: 100,
  restInterval: { startDay: 1, endDayExclusive: 8 }, constitutionHealingAdjustment: -2,
});
assert.equal(dmgPoorCon.recoveredHp, 5);
const dmgHighConSecondWeek = settleNaturalRecovery({
  routeId: 'dmg-82-natural', actorId: 'pc-a', currentHp: 0, maximumHp: 100,
  restInterval: { startDay: 8, endDayExclusive: 15 }, priorContinuousRestDays: 7,
  constitutionHealingAdjustment: 4,
});
assert.equal(dmgHighConSecondWeek.recoveredHp, 11);

// A combat interval blocks settlement; uncertain travel requests a DM decision.
assert.equal(settleNaturalRecovery({
  routeId: 'dmg-82-natural', actorId: 'pc-a', currentHp: 1, maximumHp: 10,
  restInterval: { startDay: 1, endDayExclusive: 8 },
  overlappingActivities: [activity('fight', 'pc-a', 'combat', 4, 5)],
}).status, 'interrupted');
assert.equal(settleNaturalRecovery({
  routeId: 'dmg-82-natural', actorId: 'pc-a', currentHp: 1, maximumHp: 10,
  restInterval: { startDay: 1, endDayExclusive: 8 },
  overlappingActivities: [activity('cart', 'pc-a', 'travel', 4, 5)],
}).status, 'needs-dm');

const adopted = settleNaturalRecovery({
  routeId: 'campaign-adopted-ruling', actorId: 'pc-a', currentHp: 3, maximumHp: 10,
  restInterval: { startDay: 1, endDayExclusive: 3 }, dmAwardHp: 4, rulingId: 'campaign-recovery-1',
});
assert.deepEqual([adopted.status, adopted.recoveredHp, adopted.newHp], ['settled-by-ruling', 4, 7]);
assert.equal(settleNaturalRecovery({
  routeId: 'campaign-adopted-ruling', actorId: 'pc-a', currentHp: 3, maximumHp: 10,
  restInterval: { startDay: 1, endDayExclusive: 3 },
}).status, 'needs-dm');

// Zero-HP convalescence is a separate action restriction, not hpCurrent-derived.
const cure = planZeroHitPointConvalescence({
  actorId: 'pc-a', comaTurns: 4, restStartDay: 20, intervention: 'cure-or-potion', interventionDay: 20,
});
assert.equal(cure.status, 'minimum-week-required');
assert.deepEqual(cure.restriction, { startDay: 20, endDayExclusive: 27 });
assert.equal(cure.hpTotalDoesNotEndRestriction, true);
const heal = planZeroHitPointConvalescence({
  actorId: 'pc-a', comaTurns: 4, restStartDay: 20, intervention: 'heal-spell', interventionDay: 22,
});
assert.equal(heal.status, 'restriction-lifted-by-heal');
assert.deepEqual(heal.restriction, { startDay: 20, endDayExclusive: 22 });
assert.throws(() => planZeroHitPointConvalescence({ actorId: 'pc-a', comaTurns: 7, restStartDay: 20 }), /1 through 6/);

console.log('PASS: per-actor ordinal calendar, sourced overlap decisions, DM interruption gate, separate PHB/DMG recovery routes, and zero-HP convalescence.');
