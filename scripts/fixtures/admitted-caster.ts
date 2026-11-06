import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate, recordCreationTask, approveCreationTask, admitCoreCreation, parseCoreCreation, type CoreCreation } from '../../src/character/workflows/core-create';
import { createRuntimeFromAdmittedCoreCreation, replayRegistryForCoreAdmission } from '../../src/character/workflows/core-admission';
import { newCoreCampaignArchive, parseCoreCampaignArchive, type CoreCampaignArchive } from '../../src/character/workflows/core-campaign-runtime';
import { recordCoreDivineCreation } from '../../src/character/workflows/core-divine-creation';
import { calculateCoreInitialHp, calculateCoreStartingMoney } from '../../src/character/engine/core-starting-resources';
import { extraLanguageCapacity, planCoreLanguages } from '../../src/character/engine/core-languages';
import { validateCoreWeaponSelections } from '../../src/character/engine/core-weapon-proficiency';
import { evaluateCoreEquipmentLegality } from '../../src/character/engine/core-equipment-legality';
import { commitCorePurchase, emptyCoins, moneyValueCp, type CoreInventoryLedger } from '../../src/character/engine/core-inventory';
import { generateCorePsionics } from '../../src/character/engine/core-psionics';
import { createCharacterRuntime, replayCharacter } from '../../src/character/domain/character-record';
import { planMagicUserInitialSpells, planIllusionistInitialSpells, newKnowabilityState, recordKnowabilityAttempt } from '../../src/character/engine/core-spell-acquisition';
import { magicUserInitialCategories, illusionistInitialTable } from '../../src/character/rules/core-spell-acquisition';
import { calculateCoreSpellCapacity, preparedCapacityByLevel } from '../../src/character/engine/core-spell-capacity';
import { createCoreSpellLedger, addArcaneSource, recordArcaneTranscription, recordRecoverySession, projectSpellLedgerForPlayer } from '../../src/character/engine/core-spell-ledger';
import { coreDivineFirstLevelChoices } from '../../src/character/rules/core-divine-first-level';
import type { CoreSpellDefinitionRef } from '../../src/character/rules/core-spell-ledger';

type CasterClassId = 'magic-user' | 'illusionist' | 'cleric' | 'druid';
const reviewedAt = '2026-10-17T08:00:00Z';
const preparedAt = '2026-10-17T07:45:00Z';

function recordArcaneCreation(document: CoreCreation, classId: 'magic-user' | 'illusionist') {
  const intelligence = document.candidate!.initialScores.INT;
  const plan = classId === 'magic-user'
    ? planMagicUserInitialSpells({ rolls: { offensive: 6, defensive: 7, miscellaneous: 2 } })
    : planIllusionistInitialSpells({ rolls: [3, 2, 11] });
  if ('status' in plan) assert.equal(plan.status, 'complete');
  // These are actual printed initial-table choices, not synthetic test spells.
  const definition = (slug: string): CoreSpellDefinitionRef => ({
    definitionId: `adnd1e-core:${classId}:1:${slug}`, rulesetId: 'adnd1e-core@1',
    listId: classId, level: 1, displayName: slug,
    sourceIds: [...plan.sourceIds!],
  });
  const group = classId === 'magic-user'
    ? ['read-magic', ...Object.values(magicUserInitialCategories).flat()]
    : [...illusionistInitialTable];
  // Campaign adoption: precheck this bounded initial-table group, requiring
  // passing Chance to Know for each apprenticeship acquisition. The illusionist
  // knows seven definitions but receives only the three initial-plan spells;
  // PHB's minimum is NOT a grant of extra books, sources, or prepared copies.
  const passing = new Set(plan.spells);
  if (classId === 'illusionist') for (const slug of group) {
    if (passing.size >= 7) break;
    passing.add(slug);
  }
  let knowability = newKnowabilityState(intelligence, group.map(slug => definition(slug).definitionId));
  for (const slug of group) knowability = recordKnowabilityAttempt(knowability, definition(slug).definitionId, passing.has(slug) ? 23 : 100);
  assert.equal(knowability.status, 'complete');
  const capacity = calculateCoreSpellCapacity({ careerId: classId, classId, level: 1, model: 'single', intelligence, wisdom: document.candidate!.initialScores.WIS });
  assert.equal(capacity.status, 'calculated');
  let ledger = createCoreSpellLedger({ id: `${document.id}:spells`, characterId: document.id, careerId: classId, tradition: classId });
  const spellbookId = `${document.id}:initial-book`;
  for (const slug of plan.spells) {
    const spell = definition(slug), sourceId = `${document.id}:master:${slug}`;
    ledger = addArcaneSource(ledger, {
      id: sourceId, spell, kind: 'master-grant', publicKind: 'teacher', publicLabel: 'Apprenticeship master book', consumed: false,
      private: { ownerId: 'fixture-master', locationId: 'fixture-school', provenance: 'Explicit campaign apprenticeship acquisition from the initial plan', dmNotes: [] },
    });
    // Use transcription as the existing ledger acquisition bridge. Unverified
    // copying costs/durations stay unknown; this does not certify a RAW adapter.
    ledger = recordArcaneTranscription(ledger, { id: `${document.id}:transcribe:${slug}`, sourceEntityId: sourceId, targetSpellbookId: spellbookId, knowability, outcome: 'success' });
  }
  const slug = classId === 'magic-user' ? 'magic-missile' : 'color-spray';
  const entry = ledger.spellbookEntries.find(item => item.spell.definitionId === definition(slug).definitionId)!;
  ledger = recordRecoverySession(ledger, {
    id: `${document.id}:initial-study`, requested: [{ copyId: `${document.id}:prepared:1`, spell: entry.spell, preparedFrom: { kind: 'spellbook-entry', id: entry.id } }],
    actualRestMinutes: 240, actualStudyOrPrayerMinutes: 15, interruption: 'none', completedAt: preparedAt,
    preparedCapacityByLevel: preparedCapacityByLevel(capacity, classId),
  });
  assert.equal(ledger.preparedCopies.length, 1);
  assert.equal(ledger.spellbookEntries.length, plan.spells.length);
  const projection = projectSpellLedgerForPlayer(ledger);
  return recordCreationTask(document, 'initial-spells', {
    status: 'needs-dm', sourceIds: [...new Set([...plan.sourceIds!, ...knowability.sourceIds, ...capacity.tracks.flatMap(track => track.sourceIds), 'fixture:arcane-initial-acquisition-adoption'])],
    note: 'Initial-plan apprenticeship acquisition; passing Chance to Know adopted explicitly by fixture campaign. Existing transcription/recovery bridge, not a RAW certification of initial acquisition or DMG p.40.',
    facts: {
      ...plan, rollMethod: 'physical-or-external', campaignChoiceVariant: false,
      acquisitionAdoption: { kind: 'campaign-adjudicated', source: 'master-apprenticeship', spellbookId, inventoryItemId: spellbookId, initialAcquisitionCost: 'campaign-supplied-book; transcription cost and duration unknown', chanceToKnowPolicy: 'precheck-bounded-initial-table-group; passing required for each acquired spell; minimum does not grant acquisition', rawCertification: false },
      knowability, capacity,
      ledger: { ...projection, schema: 'adnd1e.spell-ledger-player-portable', recoverySessions: projection.recoverySessions.map(({ actualRestHours, ...session }) => ({ ...session, actualRestMinutes: session.actualRestMinutes ?? Math.round(actualRestHours! * 60) })) },
    },
  });
}

/** Real, deterministic engine-created admission; no transport-only task stubs. */
export function admittedCaster(classId: CasterClassId): CoreCampaignArchive {
  const arcane = classId === 'magic-user' || classId === 'illusionist';
  const scores = { STR: 12, INT: classId === 'magic-user' ? 9 : classId === 'illusionist' ? 15 : 12, WIS: 14, DEX: classId === 'illusionist' ? 16 : 12, CON: 12, CHA: 15 };
  const alignmentId = classId === 'druid' ? 'TN' : 'NG';
  let document = newCoreCreation({ id: `admitted-${classId}`, name: `Admitted ${classId} caster`, generation: { draftId: `physical-${classId}`, draftRevision: 1, batchId: 'caster-fixtures', method: 'DMG:I', scores } });
  document = selectCoreCandidate(document, { raceId: 'human', subraceId: null, sex: 'male', alignmentId, initialScores: scores, classIds: [classId], mode: 'single', campaign: { allowedRaceIds: ['human'], bardEnabled: false } });
  const hp = calculateCoreInitialHp({ classIds: [classId], constitution: scores.CON, rollsByClass: { [classId]: [arcane ? 3 : classId === 'cleric' ? 5 : 4] } });
  document = recordCreationTask(document, 'hp', { status: 'complete', sourceIds: [...hp.sourceIds], note: 'Preset physical die result; no maximum-HP default.', facts: { ...hp, rollMethod: 'physical-or-external' } });
  const money = calculateCoreStartingMoney({ classIds: [classId], faces: arcane ? [3, 2] : [3, 4, 2] });
  assert.equal(money.status, 'calculated');
  if (money.status !== 'calculated') throw new Error('Starting money needs DM.');
  document = recordCreationTask(document, 'money', { status: 'complete', sourceIds: [...money.sourceIds], note: 'Preset physical starting-money dice.', facts: { ...money, rollMethod: 'physical-or-external' } });
  const languages = planCoreLanguages({ raceId: 'human', alignmentId: classId === 'druid' ? 'true-neutral' : 'neutral-good', intelligence: scores.INT, careers: [{ classId, level: 1 }], selections: ['orcish', 'elvish', 'dwarvish', 'goblin'].slice(0, extraLanguageCapacity('human', scores.INT)).map(languageId => ({ entitlementId: 'intelligence-extra', languageId, dmApproved: true, acquisition: 'pre-existing-at-creation' as const })) });
  assert.ok(languages.selections.every(selection => selection.status === 'accepted'));
  assert.ok(Object.values(languages.openSlots).every(count => count === 0));
  document = recordCreationTask(document, 'languages', { status: 'complete', sourceIds: [...languages.sourceIds], note: 'Automatic tongues and DM-approved pre-existing ordinary languages.', facts: { ...languages } });
  const weapons = classId === 'cleric' ? ['mace', 'hammer'] as const : classId === 'druid' ? ['dagger', 'sling'] as const : ['dagger'] as const;
  const slots = validateCoreWeaponSelections({ classId, level: 1, weaponIds: weapons });
  const legality = weapons.map(family => evaluateCoreEquipmentLegality({ classId, item: { kind: 'weapon', id: family, family } }));
  assert.equal(slots.unfilledSlots, 0);
  assert.ok(legality.every(result => result.verdict === 'class-permitted'));
  document = recordCreationTask(document, 'proficiencies', { status: 'complete', sourceIds: [...new Set([...slots.sourceIds, ...legality.flatMap(result => result.sourceIds)])], note: 'All initial slots filled with class-permitted weapons.', facts: { slots, legality } });
  const initial: CoreInventoryLedger = {
    revision: 0, locations: [{ id: 'character', kind: 'character', label: document.name, parentLocationId: null }],
    items: arcane ? [{ id: `${document.id}:initial-book`, definitionId: null, label: 'Campaign-supplied apprenticeship spellbook', quantity: 1, locationId: 'character', weight: { kind: 'unknown' }, bulk: 'unknown', bulkRulingId: null, acquiredByEventId: `${document.id}:apprenticeship-book-grant` }] : [],
    wallets: [{ id: 'purse', label: 'Starting purse', locationId: 'character', coins: { ...emptyCoins(), gp: money.gp } }],
  };
  const weaponPrice = classId === 'cleric' ? 1600 : 400;
  const purchase = commitCorePurchase({ ledger: initial, eventId: `${document.id}:purchase`, expectedRevision: 0, walletId: 'purse', lines: [
    { instanceId: `${document.id}:weapon`, definitionId: classId === 'cleric' ? 'mace-footmans' : 'dagger-scabbard', quantity: 1, destinationLocationId: 'character', agreedUnitPriceCp: weaponPrice, availability: { status: 'dm-approved', decisionId: 'fixture-supply' }, bulk: 'unknown', bulkRulingId: null },
    { instanceId: `${document.id}:rope`, definitionId: 'rope-fifty-foot', quantity: 1, destinationLocationId: 'character', agreedUnitPriceCp: 40, availability: { status: 'dm-approved', decisionId: 'fixture-supply' }, bulk: 'unknown', bulkRulingId: null },
  ], tender: { ...emptyCoins(), gp: weaponPrice / 200 + 1 }, change: { ...emptyCoins(), cp: 160 } });
  assert.equal(moneyValueCp(purchase.next.wallets[0].coins), money.gp * 200 - weaponPrice - 40);
  document = recordCreationTask(document, 'equipment', { status: 'needs-dm', sourceIds: ['phb:35:money-equipment', 'fixture:caster-equipment-review'], note: 'Actual purchase and balance; DM reviews carrying/bulk and supplied apprenticeship book. No automatic encumbrance claim.', facts: { ledger: purchase.next, receipt: purchase.receipt } });
  const psionics = generateCorePsionics({ enabled: false, raceId: 'human', scores: { intelligence: scores.INT, wisdom: scores.WIS, charisma: scores.CHA } });
  document = recordCreationTask(document, 'psionics', { status: 'complete', sourceIds: [...psionics.sourceIds], note: 'Psionics explicitly disabled by campaign.', facts: { ...psionics } });
  if (classId === 'magic-user' || classId === 'illusionist') document = recordArcaneCreation(document, classId);
  else {
    const spell = coreDivineFirstLevelChoices(classId).find(item => item.definitionId.endsWith(classId === 'cleric' ? ':cure-light-wounds' : ':entangle'))!;
    document = recordCoreDivineCreation(document, { grants: [{ id: `${document.id}:grant:1`, tradition: classId, requestedSpell: spell, grantedSpell: spell, authority: 'training-and-experience', status: 'granted', publicMessage: 'Initial prayer granted.', private: { trueAuthorityId: 'fixture-divine-authority', reason: 'Campaign initial grant', dmNotes: [] } }], restHours: 4, prayerMinutes: 15, completedAt: preparedAt, sessionId: `${document.id}:initial-prayer` }).document;
  }
  document = recordCreationTask(document, 'admission-context', { status: 'needs-dm', sourceIds: ['project:campaign-admission-context'], note: 'Recorded campaign entry for DM review.', facts: { campaignId: 'caster-fixture-campaign', location: 'village', day: 1, psionicsEnabled: false } });
  assert.throws(() => admitCoreCreation(document, { actorId: 'dm', at: reviewedAt, scope: 'caster-fixture-campaign' }), /not complete/);
  document = parseCoreCreation(JSON.parse(JSON.stringify(document)));
  for (const id of ['equipment', 'initial-spells', 'admission-context'] as const) document = approveCreationTask(document, id, { actorId: 'fixture-dm', at: reviewedAt, reason: id === 'initial-spells' && arcane ? 'Adopt recorded apprenticeship acquisition and passing Chance to Know policy; verify one completed preparation. Fixture adoption is not RAW self-certification.' : 'Reviewed recorded engine facts, campaign availability and admission context.', sourceIds: document.tasks.find(task => task.id === id)!.sourceIds });
  assert.equal(document.status, 'ready-for-review');
  document = admitCoreCreation(document, { actorId: 'fixture-dm', at: reviewedAt, scope: 'caster-fixture-campaign' });
  const admission = createRuntimeFromAdmittedCoreCreation({ document: parseCoreCreation(JSON.parse(JSON.stringify(document))) });
  const pristine = createCharacterRuntime({ characterId: document.id, branchId: 'main', name: document.name, raceId: 'human', alignment: alignmentId, description: `Admitted core creation ${document.id}` });
  assert.deepEqual(replayCharacter(pristine, admission.runtime.transaction.events, replayRegistryForCoreAdmission(admission)).transaction.facts, admission.runtime.transaction.facts);
  const campaign = newCoreCampaignArchive(admission);
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(campaign))), campaign);
  return campaign;
}
