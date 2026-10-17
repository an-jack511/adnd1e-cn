import assert from 'node:assert/strict';
import { admittedCoreCharacter } from './fixtures/admitted-core-character';
import { campaignJournal, campaignJournalTrainingInterval, type CampaignJournalView } from '../src/character/application/campaign-journal';
import { commitCoreCampaignAction, replayCoreCampaignActions, parseCoreCampaignArchive, type CampaignAction, type CoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';
import { emptyCoins } from '../src/character/engine/core-inventory';
import { newCoreCalendar } from '../src/character/workflows/core-calendar';
import type { CampaignSpellLedger } from '../src/character/workflows/core-campaign-preparation';
import { coreDivineFirstLevelChoices } from '../src/character/rules/core-divine-first-level';

const secret = 'JOURNAL_PRIVATE_SENTINEL';
let serial = 0;
function append(archive: CoreCampaignArchive, intent: CampaignAction['intent'], legacy = false) {
  const n = ++serial;
  const action: CampaignAction = { id: `${secret}:action:${n}`, actorId: `${secret}:recorder`, at: `recorded-${10000 - n}`, expectedRevision: archive.runtime.transaction.revision, intent };
  return legacy ? replayCoreCampaignActions(archive.genesis, [...archive.actions, action]) : commitCoreCampaignAction(archive, action);
}
function check(archive: CoreCampaignArchive): CampaignJournalView {
  const before = JSON.stringify(archive), revision = archive.runtime.transaction.revision;
  const view = campaignJournal(archive);
  assert.deepEqual(Object.keys(view).sort(), ['name', 'level', 'revision', 'calendar', 'entries'].sort());
  assert.equal(view.revision, revision);
  assert.equal(view.entries.length, archive.actions.length);
  for (const [index, entry] of view.entries.entries()) {
    assert.deepEqual(Object.keys(entry).sort(), ['ordinal', 'title', 'category', 'recordedAt', 'gameTime', 'details'].sort());
    assert.equal(entry.ordinal, index + 1);
    assert.equal(entry.recordedAt, archive.actions[index].at);
    assert.ok(entry.gameTime === null || typeof entry.gameTime === 'string');
    assert.ok(entry.details.every(detail => typeof detail === 'string'));
  }
  assert.equal(JSON.stringify(view).includes(secret), false, 'no private text, raw IDs, actors or source IDs');
  assert.deepEqual(campaignJournal(JSON.parse(before)), view, 'exported archive refresh is deterministic');
  assert.equal(JSON.stringify(archive), before, 'projection/refresh does not mutate archive or revision');
  if (view.entries.length) view.entries[0].details.push('caller mutation');
  const refreshed = campaignJournal(archive);
  assert.equal(JSON.stringify(refreshed).includes('caller mutation'), false, 'view owns its output');
  return refreshed;
}
const last = (archive: CoreCampaignArchive) => campaignJournal(archive).entries.at(-1)!;

// Ordinary occupancy labels are a static allowlist, never user-entered text.
let activities = append(admittedCoreCharacter('fighter'), { type: 'configure-calendar', minutesPerDay: 1440, daysPerWeek: 7 });
const activityCases = [['rest', '休息'], ['adventuring', '冒险'], ['combat', '战斗'], ['spell-use', '施法'], ['travel', '旅行'], ['language-study', '语言学习'], ['study', '学习'], ['spell-research', '法术研究'], ['magic-item-manufacture', '魔法物品制造'], ['other', '其他活动']] as const;
for (const [index, [kind, label]] of activityCases.entries()) {
  activities = append(activities, { type: 'schedule-activity', activity: { id: `${secret}:activity:${index}`, actorId: activities.runtime.transaction.characterId, kind, startMinute: index * 60, endMinuteExclusive: (index + 1) * 60, locationId: secret, sourceIds: [secret] } });
  const entry = last(activities);
  assert.ok(entry.details.includes(`活动：${label}。`));
  assert.ok(entry.details.includes('记录占用 60 分钟。'));
  assert.ok(entry.details.some(detail => detail.includes('只记录时间占用，不自动授予')));
}
check(activities);

// Full real, dated low-level growth history; no local download path or hand-built
// runtime snapshot. Every action is committed through the production engine.
let growth = admittedCoreCharacter('fighter');
assert.deepEqual(campaignJournal(growth).entries, []);
growth = append(growth, { type: 'initialize-life', currentHp: 10, reason: secret });
growth = append(growth, { type: 'damage', amount: 1, cause: secret });
growth = append(growth, { type: 'actual-healing', amount: 1, description: secret });
growth = append(growth, { type: 'record-defense', selection: { armorItemId: null, shieldItemId: null, ordinaryEquipmentConfirmed: true, note: secret } });
growth = append(growth, { type: 'relocate-item', itemId: 'growth-fixture-fighter:dagger', destinationLocationId: 'character', reason: secret, sourceId: secret });
growth = append(growth, { type: 'consume-item', itemId: 'growth-fixture-fighter:rope', quantity: 1, reason: secret, sourceId: secret });
growth = append(growth, { type: 'experience', assessment: { id: `${secret}:assessment`, xp: 2001, rating: 'E', sourceIds: [secret] } });
growth = append(growth, { type: 'income', walletId: 'purse', coins: { ...emptyCoins(), gp: 10000 }, sourceId: secret, reason: secret });
growth = append(growth, { type: 'open-advancement' });
growth = append(growth, { type: 'plan-training', route: 'tutor', acceptedCostCp: 300000, reason: secret, confirmation: { tutorName: secret, sameClassProfessionAndAvailabilityConfirmed: true } });
growth = append(growth, { type: 'pay-training', walletId: 'purse', amountCp: 300000, tender: { ...emptyCoins(), gp: 1500 }, change: emptyCoins() });
growth = append(growth, { type: 'configure-calendar', minutesPerDay: 1440, daysPerWeek: 7 });
growth = append(growth, { type: 'start-training' });
const beforeSegments = check(growth);
growth = append(growth, { type: 'scheduled-training-segment', segment: { id: `${secret}:segment-a`, weeksNumerator: 1, weeksDenominator: 2, dmConfirmedContinuous: true }, startMinute: 1440, locationId: `${secret}:place-a` });
assert.equal(last(growth).gameTime, '第2天 00:00 → 第5天 12:00');
assert.ok(last(growth).details.some(detail => detail.includes('5040 分钟')));
growth = append(growth, { type: 'scheduled-training-segment', segment: { id: `${secret}:segment-b`, weeksNumerator: 1, weeksDenominator: 2, dmConfirmedContinuous: true }, startMinute: 6480, locationId: `${secret}:place-b` });
const stateId = (growth.runtime.transaction.facts.modules.find(module => module.id === 'core-advancement')!.data as { id: string }).id;
// A formally supported, unmapped action exercises the generic fallback. Its raw
// type/method, actor, locations, evidence and reason must not become UI text.
growth = append(growth, { type: 'record-training-location-transition', fromActivityId: `${stateId}:training:${secret}:segment-a`, toActivityId: `${stateId}:training:${secret}:segment-b`, method: 'same-physical-place', continuityConfirmed: true, reason: secret, evidenceSourceId: secret });
assert.deepEqual({ title: last(growth).title, category: last(growth).category, details: last(growth).details }, { title: '战役记录', category: 'other', details: [] });
assert.equal(JSON.stringify(last(growth)).includes('record-training-location-transition'), false);
growth = append(growth, { type: 'award-level-dated', hpRolls: [4], awardMinute: 11520, consequencePolicy: 'v2', locationPolicy: 'v1' });
assert.equal(last(growth).gameTime, '第9天 00:00');
assert.ok(last(growth).details.includes('正式达到 2 级。'));
growth = append(growth, { type: 'settle-current-hp', currentHp: 10, reason: secret });
const grown = check(growth);
assert.equal(grown.level, 2);
assert.deepEqual(grown.entries.slice(0, beforeSegments.entries.length), beforeSegments.entries, 'later award does not rewrite earlier snapshots');
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(growth))), growth);
assert.ok(grown.entries[0].recordedAt > grown.entries[1].recordedAt, 'append order, not timestamp sort');

// Historical unscheduled progress remains undated after adopting a nonstandard
// calendar. Reconciliation gets its own time; it does not rewrite the old entry.
let legacy = admittedCoreCharacter('fighter');
legacy = append(legacy, { type: 'experience', assessment: { id: `${secret}:old-xp`, xp: 2001, rating: 'E', sourceIds: [secret] } });
legacy = append(legacy, { type: 'income', walletId: 'purse', coins: { ...emptyCoins(), gp: 3000 }, reason: secret, sourceId: secret });
legacy = append(legacy, { type: 'open-advancement' });
legacy = append(legacy, { type: 'plan-training', route: 'tutor', acceptedCostCp: 300000 });
legacy = append(legacy, { type: 'pay-training', walletId: 'purse', amountCp: 300000, tender: { ...emptyCoins(), gp: 1500 }, change: emptyCoins() });
legacy = append(legacy, { type: 'start-training' });
legacy = append(legacy, { type: 'training-segment', segment: { id: `${secret}:old-segment`, weeksNumerator: 1, weeksDenominator: 2, dmConfirmedContinuous: true } }, true);
const oldOrdinal = legacy.actions.length - 1, oldEntry = last(legacy);
assert.equal(oldEntry.gameTime, null);
let undatedAward = append(legacy, { type: 'training-segment', segment: { id: `${secret}:old-second`, weeksNumerator: 1, weeksDenominator: 2, dmConfirmedContinuous: true } }, true);
undatedAward = append(undatedAward, { type: 'award-level', hpRolls: [3] }, true);
assert.equal(last(undatedAward).gameTime, null);
assert.ok(last(undatedAward).details.includes('历史授级未记录战役日期。'));
undatedAward = append(undatedAward, { type: 'configure-calendar', minutesPerDay: 1000, daysPerWeek: 10 });
assert.equal(check(undatedAward).entries.at(-2)!.gameTime, null);
legacy = append(legacy, { type: 'configure-calendar', minutesPerDay: 1000, daysPerWeek: 10 });
legacy = append(legacy, { type: 'reconcile-training-segment', segmentId: `${secret}:old-segment`, startMinute: 1000, locationId: secret, reason: secret });
assert.equal(last(legacy).gameTime, '第2天 第0分钟 → 第7天 第0分钟');
assert.ok(last(legacy).details.some(detail => detail.includes('5000 分钟')));
assert.deepEqual(check(legacy).entries[oldOrdinal], oldEntry);
legacy = append(legacy, { type: 'scheduled-training-segment', segment: { id: `${secret}:new-segment`, weeksNumerator: 1, weeksDenominator: 2, dmConfirmedContinuous: true }, startMinute: 6000, locationId: secret });
legacy = append(legacy, { type: 'award-level-dated', hpRolls: [3], awardMinute: 11000, consequencePolicy: 'v2', locationPolicy: 'v1' });
assert.equal(last(legacy).gameTime, '第12天 第0分钟');
assert.deepEqual(check(legacy).entries[oldOrdinal], oldEntry);

// Isolated selector regression: the first same-start training activity belongs
// to another actor (and another course), so first-match-by-time would be wrong.
const calendar = newCoreCalendar({ minutesPerDay: 1440, daysPerWeek: 7 });
const activity = { id: 'course:training:segment', actorId: 'character', kind: 'training' as const, startMinute: 40, endMinuteExclusive: 5040, locationId: secret, sourceIds: [secret] };
calendar.activities.push({ ...activity, id: 'wrong-course:training:segment', actorId: 'someone-else', endMinuteExclusive: 99999 }, { ...activity, id: 'wrong-segment', endMinuteExclusive: 9999 }, activity);
assert.deepEqual(campaignJournalTrainingInterval({ id: 'course', calendar }, 'segment', 'character'), { startMinute: 40, endMinuteExclusive: 5040 });
assert.equal(campaignJournalTrainingInterval({ id: 'course', calendar }, 'segment', 'someone-else'), null);
assert.equal(campaignJournalTrainingInterval({ id: 'missing', calendar }, 'segment', 'character'), null);
calendar.activities.push({ ...activity });
assert.equal(campaignJournalTrainingInterval({ id: 'course', calendar }, 'segment', 'character'), null, 'ambiguous exact match is not guessed');

// All four actual caster ledgers: dated cast before calendar adoption stays
// undated, and preparation creates its own calendar with actual rest/study facts.
for (const classId of ['magic-user', 'illusionist', 'cleric', 'druid'] as const) {
  let caster = admittedCoreCharacter(classId);
  const creation = caster.genesis.runtime.transaction.facts.modules[0].data as any;
  const ledger = creation.tasks.find((task: any) => task.id === 'initial-spells').facts.ledger as CampaignSpellLedger;
  caster = append(caster, { type: 'initialize-life', currentHp: creation.tasks.find((task: any) => task.id === 'hp').facts.actualAward, reason: secret });
  caster = append(caster, { type: 'cast-prepared', copyId: ledger.preparedCopies[0].id, components: 'satisfied', observedOutcome: secret, reason: secret, atMinute: 100 });
  const castEntry = last(caster);
  assert.equal(castEntry.gameTime, null);
  assert.ok(castEntry.details.some(detail => detail.includes('100')));
  const castingId = `${caster.actions.at(-1)!.id}:casting`;
  const choice = classId === 'cleric' || classId === 'druid' ? { kind: 'divine-spell' as const, id: coreDivineFirstLevelChoices(classId)[0].definitionId, quantity: 1 } : { kind: 'spellbook-entry' as const, id: ledger.spellbookEntries[0].id, quantity: 1 };
  caster = append(caster, { type: 'prepare-spells', facts: { choices: [choice], restStartMinute: 300, restEndMinute: 540, studyStartMinute: 540, studyEndMinute: 555, locationId: secret, lastCastingId: castingId, completeRestAndNourishmentConfirmed: true, bookAccessOrDivineGrantConfirmed: true, restAfterLatestCastingConfirmed: true, initializeCalendar: { minutesPerDay: 1440, daysPerWeek: 7, confirmed: true } } });
  assert.equal(last(caster).gameTime, '第1天 05:00 → 第1天 09:15');
  assert.ok(last(caster).details.includes('完整休息 240 分钟。'));
  assert.ok(last(caster).details.includes('学习／祈祷 15 分钟。'));
  assert.deepEqual(check(caster).entries[1], castEntry);
}

// Actual zero-HP recovery and explicit rest checks, with no DM free text copied.
let recovery = admittedCoreCharacter('fighter');
recovery = append(recovery, { type: 'initialize-life', currentHp: 10, reason: secret });
recovery = append(recovery, { type: 'configure-calendar', minutesPerDay: 1000, daysPerWeek: 10 });
recovery = append(recovery, { type: 'damage', amount: 10, cause: secret, sameBlowEntryRule: 'strict-zero' });
const episodeId = `${recovery.actions.at(-1)!.id}:zero`;
recovery = append(recovery, { type: 'zero-hp-round', cause: secret });
recovery = append(recovery, { type: 'friendly-aid' });
recovery = append(recovery, { type: 'recover-zero-hp', restoredHp: 1, comaTurns: 3, restStartMinute: 100, locationId: secret, healingSourceId: secret, reason: secret });
assert.ok(last(recovery).details.some(detail => detail.includes('3 turn（非战斗 round）')));
assert.equal(last(recovery).gameTime, '第1天 第100分钟');
let heal = append(recovery, { type: 'resolve-heal-convalescence', episodeId, spellEffect: 'heal', effectEvidenceId: secret, effectiveMinute: 500, reason: secret });
assert.equal(last(heal).gameTime, '第1天 第500分钟');
check(heal);
recovery = append(recovery, { type: 'restart-zero-hp-rest', startMinute: 200, locationId: secret, reason: secret, sourceId: secret });
recovery = append(recovery, { type: 'complete-zero-hp-rest', completedThroughMinute: 7200, reason: secret, consequencePolicy: 'v2' });
assert.equal(last(recovery).gameTime, '第8天 第200分钟');
check(recovery);

// Interrupted courses and eligibility campaign exceptions.
let assassin = admittedCoreCharacter('assassin');
assassin = append(assassin, { type: 'experience', assessment: { id: secret, xp: 1501, rating: 'E', sourceIds: [secret] } });
assassin = append(assassin, { type: 'open-advancement' });
assassin = append(assassin, { type: 'accept-gate', classification: 'campaign-exception', reason: secret });
assert.ok(last(assassin).details.includes('已记录战役例外。'));
check(assassin);
let interrupted = growth; // A separate fresh eligible course, using existing real XP rules.
interrupted = append(interrupted, { type: 'experience', assessment: { id: `${secret}:second-xp`, xp: 2000, rating: 'E', sourceIds: [secret] } });
interrupted = append(interrupted, { type: 'open-advancement' });
interrupted = append(interrupted, { type: 'plan-training', route: 'tutor', acceptedCostCp: 600000 });
interrupted = append(interrupted, { type: 'pay-training', walletId: 'purse', amountCp: 600000, tender: { ...emptyCoins(), gp: 3000 }, change: emptyCoins() });
interrupted = append(interrupted, { type: 'start-training' });
interrupted = append(interrupted, { type: 'interrupt-training', reason: secret });
interrupted = append(interrupted, { type: 'restart-training', reason: secret });
assert.equal(last(interrupted).title, '重新安排训练');
check(interrupted);
const tampered = structuredClone(growth);
(tampered.runtime.transaction.facts.modules.find(module => module.id === 'core-advancement')!.data as any).level = 99;
assert.throws(() => campaignJournal(tampered), /replayed/);
const unknown = structuredClone(growth);
(unknown.actions[0].intent as any).type = `${secret}:future-action`;
assert.throws(() => campaignJournal(unknown), /Unsupported/, 'unrecognized archive actions must first pass the formal parser');
console.log('PASS: public append-order journal; real growth/preparation archives, per-action calendars, exact training activity/actor, explicit award minutes, private-field exclusion, deterministic pure refresh and formal replay rejection.');
