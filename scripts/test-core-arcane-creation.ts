import assert from 'node:assert/strict';
import { recordCoreArcaneCreation, assertArcaneCreationLedger, coreArcaneCreationChoices, coreArcaneCreationInputSchema, type CoreArcaneCreationInput } from '../src/character/workflows/core-arcane-creation';
import { newCoreCreation, selectCoreCandidate, recordCreationTask, approveCreationTask, admitCoreCreation, parseCoreCreation, type CoreCreation } from '../src/character/workflows/core-create';
import { calculateCoreInitialHp, calculateCoreStartingMoney } from '../src/character/engine/core-starting-resources';
import { extraLanguageCapacity, planCoreLanguages } from '../src/character/engine/core-languages';
import { validateCoreWeaponSelections } from '../src/character/engine/core-weapon-proficiency';
import { evaluateCoreEquipmentLegality } from '../src/character/engine/core-equipment-legality';
import { commitCorePurchase, emptyCoins, type CoreInventoryLedger } from '../src/character/engine/core-inventory';
import { generateCorePsionics } from '../src/character/engine/core-psionics';
import { intelligenceSpellRule } from '../src/character/engine/core-spell-acquisition';
import { createRuntimeFromAdmittedCoreCreation } from '../src/character/workflows/core-admission';
import { newCoreCampaignArchive, parseCoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';
import { admittedCaster } from './fixtures/admitted-caster';

type ClassId = 'magic-user' | 'illusionist';
function creation(classId: ClassId) {
  const scores = { STR: 12, INT: classId === 'magic-user' ? 9 : 15, WIS: 12, DEX: classId === 'illusionist' ? 16 : 12, CON: 12, CHA: 12 };
  return selectCoreCandidate(newCoreCreation({ id: `arcane-adapter-test-${classId}`, name: `Arcane adapter ${classId}`, generation: { draftId: 'actual-test-dice', draftRevision: 1, batchId: 'explicit-test-batch', method: 'DMG:I', scores } }), { raceId: 'human', subraceId: null, sex: 'male', alignmentId: 'NG', initialScores: scores, classIds: [classId], mode: 'single', campaign: { allowedRaceIds: ['human'], bardEnabled: false } });
}
function request(classId: ClassId): CoreArcaneCreationInput {
  const spells = coreArcaneCreationChoices(classId);
  const slugs = classId === 'magic-user' ? ['read-magic', 'magic-missile', 'shield', 'detect-magic'] : ['color-spray', 'change-self', 'phantasmal-force'];
  const planned = slugs.map(slug => spells.find(spell => spell.definitionId.endsWith(`:${slug}`))!.definitionId);
  const passing = new Set(planned), minimum = intelligenceSpellRule(classId === 'magic-user' ? 9 : 15).minimumPerLevel;
  for (const spell of spells) { if (passing.size >= minimum) break; passing.add(spell.definitionId); }
  return {
    initialPlan: classId === 'magic-user' ? { classId, input: { rolls: { offensive: 6, defensive: 7, miscellaneous: 2 } } } : { classId, input: { rolls: [3, 2, 11] } },
    rollMethod: 'physical-or-external',
    chanceToKnow: { spellIds: spells.map(spell => spell.definitionId), attempts: spells.map(spell => ({ spellId: spell.definitionId, percentile: passing.has(spell.definitionId) ? 23 : 100 })), rollMethod: 'physical-or-external' },
    adoption: { policy: 'require-successful-checks', actorId: 'actual-test-dm', at: 'explicitly recorded test time', reason: 'This test campaign explicitly requires recorded successful Ctk checks for apprenticeship acquisition; no unique RAW reconciliation claimed.', sourceIds: ['campaign:test-arcane-adoption'] },
    spellbookId: `test-book-${classId}`,
    acquisitions: planned.map((spellId, index) => ({ spellId, sourceEntityId: `actual-source-${classId}-${index}`, transcriptionId: `actual-copy-${classId}-${index}`, sourceLabel: 'Confirmed public apprenticeship source', sourceAccessConfirmed: true, outcome: 'success' })),
  };
}

/** Finish the non-spell tasks with actual engines, not transport-only stubs. */
function finishCreation(document: CoreCreation) {
  const classId = document.candidate!.classIds[0] as ClassId, scores = document.candidate!.initialScores;
  const hp = calculateCoreInitialHp({ classIds: [classId], constitution: scores.CON, rollsByClass: { [classId]: [3] } });
  document = recordCreationTask(document, 'hp', { status: 'complete', sourceIds: [...hp.sourceIds], note: 'Explicit test die', facts: { ...hp, rollMethod: 'physical-or-external' } });
  const money = calculateCoreStartingMoney({ classIds: [classId], faces: [3, 2] });
  assert.equal(money.status, 'calculated');
  document = recordCreationTask(document, 'money', { status: 'complete', sourceIds: [...money.sourceIds], note: 'Explicit money dice', facts: { ...money } });
  const languages = planCoreLanguages({ raceId: 'human', alignmentId: 'neutral-good', intelligence: scores.INT, careers: [{ classId, level: 1 }], selections: ['orcish', 'elvish', 'dwarvish', 'goblin'].slice(0, extraLanguageCapacity('human', scores.INT)).map(languageId => ({ entitlementId: 'intelligence-extra', languageId, dmApproved: true, acquisition: 'pre-existing-at-creation' as const })) });
  assert.ok(Object.values(languages.openSlots).every(count => count === 0));
  document = recordCreationTask(document, 'languages', { status: 'complete', sourceIds: [...languages.sourceIds], note: 'DM-approved actual choices', facts: { ...languages } });
  const slots = validateCoreWeaponSelections({ classId, level: 1, weaponIds: ['dagger'] });
  const legality = evaluateCoreEquipmentLegality({ classId, item: { kind: 'weapon', id: 'dagger', family: 'dagger' } });
  assert.equal(legality.verdict, 'class-permitted');
  document = recordCreationTask(document, 'proficiencies', { status: 'complete', sourceIds: [...slots.sourceIds, ...legality.sourceIds], note: 'Filled permitted initial slot', facts: { slots, legality: [legality] } });
  const initial: CoreInventoryLedger = { revision: 0, locations: [{ id: 'character', kind: 'character', label: document.name, parentLocationId: null }], items: [], wallets: [{ id: 'purse', label: 'Starting purse', locationId: 'character', coins: { ...emptyCoins(), gp: money.gp } }] };
  const purchase = commitCorePurchase({ ledger: initial, eventId: 'real-test-purchase', expectedRevision: 0, walletId: 'purse', lines: [{ instanceId: 'test-dagger', definitionId: 'dagger-scabbard', quantity: 1, destinationLocationId: 'character', agreedUnitPriceCp: 400, availability: { status: 'dm-approved', decisionId: 'actual-supply-review' }, bulk: 'unknown', bulkRulingId: null }], tender: { ...emptyCoins(), gp: 2 }, change: emptyCoins() });
  document = recordCreationTask(document, 'equipment', { status: 'needs-dm', sourceIds: ['phb:35:money-equipment'], note: 'DM reviews actual kit and separate confirmed apprenticeship-book access; no inferred book purchase.', facts: { ledger: purchase.next, receipt: purchase.receipt } });
  const psionics = generateCorePsionics({ enabled: false, raceId: 'human', scores: { intelligence: scores.INT, wisdom: scores.WIS, charisma: scores.CHA } });
  document = recordCreationTask(document, 'psionics', { status: 'complete', sourceIds: [...psionics.sourceIds], note: 'Explicitly disabled', facts: { ...psionics } });
  document = recordCreationTask(document, 'admission-context', { status: 'needs-dm', sourceIds: ['project:campaign-admission-context'], note: 'Actual test campaign context', facts: { campaignId: 'arcane-adapter-test', location: 'school', psionicsEnabled: false } });
  for (const id of ['equipment', 'initial-spells', 'admission-context'] as const) document = approveCreationTask(document, id, { actorId: 'actual-test-dm', at: 'explicit review time', reason: 'Reviewed the recorded facts and explicit campaign adoption', sourceIds: document.tasks.find(task => task.id === id)!.sourceIds });
  assertArcaneCreationLedger(document);
  return admitCoreCreation(document, { actorId: 'actual-test-dm', at: 'explicit admission time', scope: 'arcane-adapter-test' });
}

for (const classId of ['magic-user', 'illusionist'] as const) {
  const document = creation(classId), input = request(classId), before = JSON.stringify({ document, input });
  const result = recordCoreArcaneCreation(document, input), task = result.document.tasks.find(task => task.id === 'initial-spells')!;
  assert.equal(JSON.stringify({ document, input }), before);
  assert.deepEqual(recordCoreArcaneCreation(document, input), result, 'deterministic, no random IDs or clock');
  assert.equal(task.status, 'needs-dm');
  assertArcaneCreationLedger(result.document);
  assert.equal(result.dmLedger.spellbookEntries.length, classId === 'magic-user' ? 4 : 3);
  assert.deepEqual(result.dmLedger.preparedCopies, []);
  assert.deepEqual(result.dmLedger.recoverySessions, []);
  assert.deepEqual(result.dmLedger.castings, []);
  assert.deepEqual(result.dmLedger.divineGrants, []);
  assert.ok(result.dmLedger.transcriptionAttempts.every(attempt => attempt.cost.actualGp === null && attempt.duration.actualMinutes === null));
  if (classId === 'illusionist') assert.equal((task.facts!.knowability as any).knownSpellIds.length, 7, 'INT minimum never adds four extra book entries');
  assert.equal(task.facts!.rawCertification, false);
  const publicLedger = task.facts!.ledger as any;
  for (const key of ['private', 'provenance', 'transcriptionAttempts', 'rulingId']) assert.equal(JSON.stringify(publicLedger).includes(`"${key}"`), false);
  const admitted = finishCreation(result.document);
  assertArcaneCreationLedger(parseCoreCreation(JSON.parse(JSON.stringify(admitted))));
  const campaign = newCoreCampaignArchive(createRuntimeFromAdmittedCoreCreation({ document: admitted }));
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(campaign))), campaign);
  for (const mutate of [
    (doc: any) => { doc.tasks.find((task: any) => task.id === 'initial-spells').facts.ledger.spellbookEntries[0].spell.level = 2; },
    (doc: any) => { doc.tasks.find((task: any) => task.id === 'initial-spells').facts.ledger.characterId = 'different-person'; },
    (doc: any) => { doc.tasks.find((task: any) => task.id === 'initial-spells').facts.ledger.preparedCopies.push({ id: 'invented-preparation' }); },
    (doc: any) => { doc.tasks.find((task: any) => task.id === 'initial-spells').facts.knowability.knownSpellIds.push('invented-knowledge'); },
    (doc: any) => { doc.tasks.find((task: any) => task.id === 'initial-spells').facts.input.initialPlan.classId = classId === 'magic-user' ? 'illusionist' : 'magic-user'; },
    (doc: any) => { doc.tasks.find((task: any) => task.id === 'initial-spells').sourceIds = []; },
  ]) {
    const changed = structuredClone(result.document); mutate(changed);
    assert.throws(() => assertArcaneCreationLedger(changed));
  }
  const extra = structuredClone(input), unowned = coreArcaneCreationChoices(classId).find(spell => !input.acquisitions.some(acquisition => acquisition.spellId === spell.definitionId))!;
  extra.acquisitions[0].spellId = unowned.definitionId;
  assert.throws(() => recordCoreArcaneCreation(document, extra), /actual initial plan/);
  const wrongList = structuredClone(input); wrongList.chanceToKnow.spellIds[0] = 'adnd1e-core:cleric:1:bless';
  assert.throws(() => recordCoreArcaneCreation(document, wrongList), /bounded initial-table/);
  const missingAttempt = structuredClone(input); missingAttempt.chanceToKnow.attempts = [];
  const unfinished = recordCoreArcaneCreation(document, { ...missingAttempt, acquisitions: [] });
  assert.equal(unfinished.document.tasks.find(task => task.id === 'initial-spells')!.status, 'pending');
  assert.throws(() => assertArcaneCreationLedger(unfinished.document));
  const failedCopy = structuredClone(input); failedCopy.acquisitions[0].outcome = 'failure';
  const failed = recordCoreArcaneCreation(document, failedCopy);
  assert.equal(failed.dmLedger.spellbookEntries.length, input.acquisitions.length - 1);
  assert.throws(() => assertArcaneCreationLedger(failed.document));
  const missingDate = structuredClone(input); missingDate.adoption.at = '';
  assert.throws(() => recordCoreArcaneCreation(document, missingDate));
  const supplied = structuredClone(input); supplied.acquisitions[0].actualCostGp = 0; supplied.acquisitions[0].actualDurationMinutes = 0;
  assert.throws(() => recordCoreArcaneCreation(document, supplied), /rulingId/);
  supplied.acquisitions[0].rulingId = 'explicit-actual-copy-ruling';
  const actual = recordCoreArcaneCreation(document, supplied);
  assert.equal(actual.dmLedger.transcriptionAttempts[0].cost.actualGp, 0);
  assert.equal(actual.dmLedger.transcriptionAttempts[0].cost.status, 'unknown');
  assert.equal(JSON.stringify(actual.document.tasks.find(task => task.id === 'initial-spells')!.facts!.ledger).includes('explicit-actual-copy-ruling'), false);
  // Legacy boundary: valid old admitted fixtures are still formally readable.
  // Only the NEW entry guard rejects their absent replayable adapter marker.
  const legacy = admittedCaster(classId), legacyDocument = parseCoreCreation(legacy.genesis.runtime.transaction.facts.modules[0].data);
  const savedLegacy = JSON.stringify(legacy);
  assert.throws(() => assertArcaneCreationLedger(legacyDocument), /unmarked legacy/);
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(savedLegacy)), legacy);
  assert.equal(JSON.stringify(legacy), savedLegacy);
  assert.throws(() => recordCoreArcaneCreation(admitted, input), /cannot be rewritten/);
}

// Explicit conflict: failed initial-grant Ctk is retained, never silently turned
// into a passing result or a new book under a supposed RAW exception.
const conflictInput = request('magic-user');
conflictInput.chanceToKnow.attempts = conflictInput.chanceToKnow.attempts.map(attempt => ({ ...attempt, percentile: 100 }));
conflictInput.acquisitions = conflictInput.acquisitions.map(acquisition => ({ ...acquisition, outcome: 'failure' }));
const conflict = recordCoreArcaneCreation(creation('magic-user'), conflictInput);
assert.equal(conflict.dmLedger.spellbookEntries.length, 0);
assert.ok((conflict.document.tasks.find(task => task.id === 'initial-spells')!.facts!.unresolved as string[]).includes('initial-grant-and-chance-to-know-conflict'));
assert.throws(() => assertArcaneCreationLedger(conflict.document));
const falseSuccess = structuredClone(conflictInput); falseSuccess.acquisitions[0].outcome = 'success';
assert.throws(() => recordCoreArcaneCreation(creation('magic-user'), falseSuccess), /Chance to Know/);
const incompleteIllusionist = request('illusionist');
incompleteIllusionist.initialPlan = { classId: 'illusionist', input: { rolls: [3, 3] } };
incompleteIllusionist.acquisitions = [];
const incomplete = recordCoreArcaneCreation(creation('illusionist'), incompleteIllusionist);
assert.equal(incomplete.document.tasks.find(task => task.id === 'initial-spells')!.status, 'pending');
assert.throws(() => assertArcaneCreationLedger(incomplete.document));
const planOnly = recordCreationTask(creation('magic-user'), 'initial-spells', { status: 'needs-dm', sourceIds: ['dmg:39:initial-magic-user-spells'], note: 'Legacy plan only', facts: { spells: ['read-magic', 'magic-missile', 'shield', 'detect-magic'] } });
assert.doesNotThrow(() => parseCoreCreation(planOnly));
assert.throws(() => assertArcaneCreationLedger(planOnly), /plan-only/);
assert.throws(() => coreArcaneCreationInputSchema.parse({ ...request('magic-user'), adoption: { ...request('magic-user').adoption, policy: 'pretend-failed-check-passed' } }));
console.log('PASS: explicit MU/illusionist initial plans, actual Ctk history and acquisition outcomes; engine-created sources/books without preparation or minimum grants; deterministic public projections, strict new-entry reconstruction guard and unchanged legacy parse/replay.');
