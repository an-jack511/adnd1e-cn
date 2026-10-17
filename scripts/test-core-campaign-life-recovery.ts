import assert from 'node:assert/strict';
import { admittedFighter } from './fixtures/admitted-fighter';
import { commitCoreCampaignAction, parseCoreCampaignArchive, type CampaignAction, type CoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';
import { campaignSheet } from '../src/character/application/campaign-sheet';

const actorId = 'table-dm';
function commit(archive: CoreCampaignArchive, id: string, intent: CampaignAction['intent']): CoreCampaignArchive {
  return commitCoreCampaignAction(archive, {
    id,
    actorId,
    at: `campaign:${id}`,
    expectedRevision: archive.runtime.transaction.revision,
    intent,
  });
}

let recovery = admittedFighter();
recovery = commit(recovery, 'life-init', { type: 'initialize-life', currentHp: 7, reason: 'DM confirms current HP from the table.' });
recovery = commit(recovery, 'calendar', { type: 'configure-calendar', minutesPerDay: 1440, daysPerWeek: 7 });
recovery = commit(recovery, 'damage', { type: 'damage', amount: 2, cause: 'verified blade hit' });
assert.equal(campaignSheet(recovery).life?.currentHp, 5);

// PHB 105 and DMG 82 remain separate routes. This test adopts DMG 82 explicitly,
// records the day interval in the campaign calendar, and applies only its result.
recovery = commit(recovery, 'natural-1', {
  type: 'natural-recovery', routeId: 'dmg-82-natural', restStartDay: 1, restEndDayExclusive: 3,
  continuity: 'new', priorContinuousRestDays: 0, locationId: 'town-infirmary',
  constitutionHealingAdjustment: 0, reason: 'DM confirms two full days of recuperative rest.',
});
assert.equal(campaignSheet(recovery).life?.currentHp, 7);
const replayedRecovery = parseCoreCampaignArchive(JSON.parse(JSON.stringify(recovery)));
assert.deepEqual(replayedRecovery, recovery, 'natural recovery must be an archive-replayable state transition');

const interruptedBase = admittedFighter();
const interruptedLife = commit(interruptedBase, 'interrupted-life', { type: 'initialize-life', currentHp: 7, reason: 'DM confirms current HP.' });
const interruptedCalendar = commit(interruptedLife, 'interrupted-calendar', { type: 'configure-calendar', minutesPerDay: 1440, daysPerWeek: 7 });
const interruptedActivity = commit(interruptedCalendar, 'interrupted-activity', {
  type: 'schedule-activity',
  activity: { id: 'travel-overlap', actorId: interruptedCalendar.runtime.transaction.characterId, kind: 'travel', startMinute: 1440, endMinuteExclusive: 2880, locationId: 'road', sourceIds: ['session:travel'] },
});
const beforeInterruptedRecovery = JSON.stringify(interruptedActivity);
assert.throws(() => commit(interruptedActivity, 'interrupted-recovery', {
  type: 'natural-recovery', routeId: 'dmg-82-natural', restStartDay: 1, restEndDayExclusive: 3,
  continuity: 'new', priorContinuousRestDays: 0, locationId: 'town-infirmary', reason: 'Attempted rest overlaps actual travel.',
}), /interrupted|continuous|rest/i);
assert.equal(JSON.stringify(interruptedActivity), beforeInterruptedRecovery, 'an interrupted recovery attempt must be atomic');

const conflictBase = admittedFighter();
const conflictInit = commit(conflictBase, 'conflict-life', { type: 'initialize-life', currentHp: 7, reason: 'DM confirms current HP.' });
const conflictCalendar = commit(conflictInit, 'conflict-calendar', { type: 'configure-calendar', minutesPerDay: 1440, daysPerWeek: 7 });
const beforeConflict = JSON.stringify(conflictCalendar);
assert.throws(() => commit(conflictCalendar, 'conflict-route', {
  type: 'natural-recovery', routeId: null, restStartDay: 1, restEndDayExclusive: 2,
  continuity: 'new', priorContinuousRestDays: 0, locationId: 'bed', reason: 'No route selected.',
}), /conflict|select one/i);
assert.equal(JSON.stringify(conflictCalendar), beforeConflict, 'unresolved PHB/DMG conflict must not mutate the archive');

// Full death -> assessment -> revival -> explicit HP settlement remains a separate
// sequence; the engine never treats a death record as an automatic resurrection.
let death = admittedFighter();
death = commit(death, 'death-life', { type: 'initialize-life', currentHp: 7, reason: 'DM confirms current HP.' });
death = commit(death, 'death-entry', { type: 'damage', amount: 7, cause: 'verified fatal blow', sameBlowEntryRule: 'strict-zero' });
for (let round = 1; round <= 10; round += 1) {
  death = commit(death, `death-round-${round}`, { type: 'zero-hp-round', cause: 'unassisted zero-HP decline' });
}
assert.deepEqual([campaignSheet(death).life?.mortality, campaignSheet(death).life?.currentHp], ['dead', -10]);
death = commit(death, 'revival-assessment', {
  type: 'assess-revival', assessmentId: 'revival-assessment', methodId: 'cleric-raise-dead',
  subjectRaceId: 'human', deathInterval: { value: 2, unit: 'days' }, bodyAvailable: true,
  casterLevel: 9, checkRoute: 'phb-resurrection-survival', percentileRoll: 90,
  reason: 'DM confirms corpse, caster level, elapsed days, and the adopted PHB survival column.',
});
death = commit(death, 'revival-commit', { type: 'commit-revival', assessmentId: 'revival-assessment', changeId: 'revival-con-loss', reason: 'DM confirms the passed revival result.' });
assert.deepEqual(
  [campaignSheet(death).life?.mortality, campaignSheet(death).life?.currentHp, campaignSheet(death).life?.actionRestriction],
  ['alive', null, 'raise-dead-bed-rest'],
);
death = commit(death, 'revival-hp', { type: 'settle-current-hp', currentHp: 1, reason: 'DM records the actual post-revival HP settlement.' });
assert.deepEqual([campaignSheet(death).life?.currentHp, campaignSheet(death).life?.hpSettlement], [1, 'settled']);
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(death))), death, 'death and revival actions must replay identically');

console.log('PASS: natural recovery route adoption/calendar transaction, unresolved source conflict immutability, zero-HP death, revival assessment/commit, HP settlement, and canonical replay.');
