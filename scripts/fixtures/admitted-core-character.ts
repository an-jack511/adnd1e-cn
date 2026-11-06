import assert from 'node:assert/strict';
import { admittedCaster } from './admitted-caster';
import type { InitialCoreClassId } from '../../src/character/rules/core-progression';
import type { CoreWeaponFamily } from '../../src/character/rules/core-equipment-legality';
import { newCoreCreation, selectCoreCandidate, recordCreationTask, approveCreationTask, admitCoreCreation, parseCoreCreation, decideEligibilityIssue } from '../../src/character/workflows/core-create';
import { evaluateCoreEligibility } from '../../src/character/engine/core-eligibility';
import { createRuntimeFromAdmittedCoreCreation, replayRegistryForCoreAdmission } from '../../src/character/workflows/core-admission';
import { newCoreCampaignArchive, parseCoreCampaignArchive, type CoreCampaignArchive } from '../../src/character/workflows/core-campaign-runtime';
import { calculateCoreInitialHp, calculateCoreStartingMoney } from '../../src/character/engine/core-starting-resources';
import { extraLanguageCapacity, planCoreLanguages } from '../../src/character/engine/core-languages';
import { validateCoreWeaponSelections } from '../../src/character/engine/core-weapon-proficiency';
import { evaluateCoreEquipmentLegality } from '../../src/character/engine/core-equipment-legality';
import { commitCorePurchase, emptyCoins, moneyValueCp, type CoreInventoryLedger } from '../../src/character/engine/core-inventory';
import { generateCorePsionics } from '../../src/character/engine/core-psionics';
import { createCharacterRuntime, replayCharacter } from '../../src/character/domain/character-record';

const physicalRolls = {
  fighter: { hp: [7], money: [3, 2, 4, 2, 3], weapons: ['dagger', 'sword-long', 'sword-short', 'spear'] },
  paladin: { hp: [6], money: [3, 2, 4, 2, 3], weapons: ['dagger', 'sword-long', 'spear'] },
  ranger: { hp: [5, 4], money: [3, 2, 4, 2, 3], weapons: ['dagger', 'sword-long', 'spear'] },
  thief: { hp: [4], money: [4, 3], weapons: ['dagger', 'sword-short'] },
  assassin: { hp: [3], money: [4, 3], weapons: ['dagger', 'sword-short', 'spear'] },
  monk: { hp: [3, 2], money: [3, 2, 4, 2, 3], weapons: ['dagger'] },
} as const satisfies Record<Exclude<InitialCoreClassId, 'cleric' | 'druid' | 'magic-user' | 'illusionist'>, {
  hp: readonly number[]; money: readonly number[]; weapons: readonly CoreWeaponFamily[];
}>;

/**
 * In-memory growth-page fixtures only; this factory never reads/writes browser storage.
 * Casters deliberately retain the existing factory's identities, scores and explicit
 * acquisition adoptions. The other six careers have growth-fixture-* identities.
 */
export function admittedCoreCharacter(classId: InitialCoreClassId): CoreCampaignArchive {
  if (classId === 'cleric' || classId === 'druid' || classId === 'magic-user' || classId === 'illusionist') return admittedCaster(classId);

  const id = `growth-fixture-${classId}`;
  const scores = { STR: 17, INT: 17, WIS: 17, DEX: 17, CON: 17, CHA: 17 };
  const alignmentId = classId === 'paladin' ? 'LG' : classId === 'assassin' ? 'LE' : classId === 'monk' ? 'LN' : classId === 'thief' ? 'CN' : 'NG';
  const languageAlignment = classId === 'paladin' ? 'lawful-good' : classId === 'assassin' ? 'lawful-evil' : classId === 'monk' ? 'lawful-neutral' : classId === 'thief' ? 'chaotic-neutral' : 'neutral-good';
  const rolls = physicalRolls[classId];
  const at = '2026-10-17T09:00:00Z';
  const scope = 'growth-fixture-campaign';
  let document = newCoreCreation({ id, name: `Growth fixture ${classId}`, generation: { draftId: `${id}:physical-generation`, draftRevision: 1, batchId: 'growth-fixture-batch', method: 'DMG:I', scores } });
  document = selectCoreCandidate(document, { raceId: 'human', subraceId: null, sex: 'male', alignmentId, initialScores: scores, classIds: [classId], mode: 'single', campaign: { allowedRaceIds: ['human'], bardEnabled: false } });
  if (classId === 'assassin') {
    const issue = evaluateCoreEligibility(document.candidate!).issues.find(issue => issue.id === 'level-cap-assassin');
    assert.ok(issue);
    document = decideEligibilityIssue(document, { issueId: issue.id, choice: 'accepted-exception', actorId: 'fixture-dm', reason: 'Fixture campaign admits this legal first-level human assassin despite the pack\'s unresolved assassin level-cap referral. This entry decision establishes no higher-level cap and waives no future guild/challenge/seat requirements; re-review at advancement.', sourceIds: [...issue.sourceIds] });
  }

  // Physical presets, not generated totals. The HP engine validates initial die
  // counts/sides, including ranger 2d8 and monk 2d4, and computes CON per career.
  const hp = calculateCoreInitialHp({ classIds: [classId], constitution: scores.CON, rollsByClass: { [classId]: rolls.hp } });
  document = recordCreationTask(document, 'hp', { status: 'complete', sourceIds: [...hp.sourceIds], note: 'Recorded physical HP dice; engine applies career HD and CON, without a maximum-HP default.', facts: { ...hp, rollMethod: 'physical-or-external' } });
  const money = calculateCoreStartingMoney({ classIds: [classId], faces: rolls.money });
  assert.equal(money.status, 'calculated');
  if (money.status !== 'calculated') throw new Error('Fixture starting money needs DM.');
  document = recordCreationTask(document, 'money', { status: 'complete', sourceIds: [...money.sourceIds], note: 'Recorded physical money dice; use actual class family, including monk multiplier.', facts: { ...money, rollMethod: 'physical-or-external' } });

  const ordinaryLanguages = ['orcish', 'elvish', 'dwarvish', 'goblin', 'gnomish', 'halfling'];
  const capacity = extraLanguageCapacity('human', scores.INT);
  assert.ok(capacity <= ordinaryLanguages.length);
  const languages = planCoreLanguages({ raceId: 'human', alignmentId: languageAlignment, intelligence: scores.INT, careers: [{ classId, level: 1 }], selections: ordinaryLanguages.slice(0, capacity).map(languageId => ({ entitlementId: 'intelligence-extra', languageId, dmApproved: true, acquisition: 'pre-existing-at-creation' as const })) });
  assert.ok(languages.selections.every(selection => selection.status === 'accepted'));
  assert.ok(Object.values(languages.openSlots).every(count => count === 0));
  document = recordCreationTask(document, 'languages', { status: 'complete', sourceIds: [...languages.sourceIds], note: 'Automatic common/alignment/class tongues and all INT slots; DM approves ordinary languages as pre-existing.', facts: { ...languages } });

  const slots = validateCoreWeaponSelections({ classId, level: 1, weaponIds: rolls.weapons });
  const legality = rolls.weapons.map(family => evaluateCoreEquipmentLegality({ classId, item: { kind: 'weapon', id: family, family } }));
  assert.equal(slots.unfilledSlots, 0);
  assert.ok(legality.every(result => result.verdict === 'class-permitted'));
  document = recordCreationTask(document, 'proficiencies', { status: 'complete', sourceIds: [...new Set([...slots.sourceIds, ...legality.flatMap(result => result.sourceIds)])], note: 'All initial proficiency slots filled and class legality checked; proficiency does not imply ownership.', facts: { slots, legality } });

  const initial: CoreInventoryLedger = { revision: 0, locations: [{ id: 'character', kind: 'character', label: document.name, parentLocationId: null }], items: [], wallets: [{ id: 'purse', label: 'Starting purse', locationId: 'character', coins: { ...emptyCoins(), gp: money.gp } }] };
  const purchase = commitCorePurchase({ ledger: initial, eventId: `${id}:purchase`, expectedRevision: 0, walletId: 'purse', lines: [
    { instanceId: `${id}:dagger`, definitionId: 'dagger-scabbard', quantity: 1, destinationLocationId: 'character', agreedUnitPriceCp: 400, availability: { status: 'dm-approved', decisionId: `${id}:supply` }, bulk: 'unknown', bulkRulingId: null },
    { instanceId: `${id}:rope`, definitionId: 'rope-fifty-foot', quantity: 1, destinationLocationId: 'character', agreedUnitPriceCp: 40, availability: { status: 'dm-approved', decisionId: `${id}:supply` }, bulk: 'unknown', bulkRulingId: null },
  ], tender: { ...emptyCoins(), gp: 3 }, change: { ...emptyCoins(), cp: 160 } });
  assert.equal(moneyValueCp(purchase.next.wallets[0].coins), money.gp * 200 - 440);
  assert.ok(rolls.weapons.includes('dagger'));
  document = recordCreationTask(document, 'equipment', { status: 'needs-dm', sourceIds: ['phb:35:money-equipment', ...legality.flatMap(result => result.sourceIds)], note: 'Actual agreed dagger/rope purchase and balance. Bulk remains unknown; DM reviews these carried items without asserting calculated encumbrance.', facts: { ledger: purchase.next, receipt: purchase.receipt, purchasedWeaponFamily: 'dagger', carryingAdoption: 'DM approves campaign entry with unknown bulk; no automatic encumbrance certification' } });

  const psionics = generateCorePsionics({ enabled: false, raceId: 'human', scores: { intelligence: scores.INT, wisdom: scores.WIS, charisma: scores.CHA } });
  document = recordCreationTask(document, 'psionics', { status: 'complete', sourceIds: [...psionics.sourceIds], note: 'Psionics explicitly disabled by fixture campaign despite qualifying ability scores.', facts: { ...psionics } });
  document = recordCreationTask(document, 'initial-spells', { status: 'not-applicable', sourceIds: ['project:core-first-level-noncasting-task', ...(classId === 'paladin' ? ['phb:24:paladin-spell-capacity'] : classId === 'ranger' ? ['phb:25:ranger-spell-capacity'] : [])], note: 'This career has no initial spell acquisition/preparation at level one; later spell progression is a separate workflow.', facts: { classId, level: 1, initialSpellGrant: false } });
  document = recordCreationTask(document, 'admission-context', { status: 'needs-dm', sourceIds: ['project:campaign-admission-context'], note: 'In-memory growth fixture campaign entry, pending explicit DM review.', facts: { campaignId: scope, location: 'village', day: 1, psionicsEnabled: false, use: 'in-memory-tests-only', generationAdoption: 'Preset physical generation record with all six scores 17; STR 18/exceptional-strength branch excluded' } });
  assert.throws(() => admitCoreCreation(document, { actorId: 'fixture-dm', at, scope }), /not complete/);
  document = parseCoreCreation(JSON.parse(JSON.stringify(document)));
  for (const taskId of ['equipment', 'admission-context'] as const) document = approveCreationTask(document, taskId, { actorId: 'fixture-dm', at, reason: taskId === 'equipment' ? 'Approve recorded purchase, availability and carried kit for entry; unknown bulk remains an explicit DM adoption.' : 'Approve legal human career/alignment, physical presets and campaign entry with psionics disabled.', sourceIds: document.tasks.find(task => task.id === taskId)!.sourceIds });
  assert.equal(document.status, 'ready-for-review');
  document = admitCoreCreation(document, { actorId: 'fixture-dm', at, scope });
  const admission = createRuntimeFromAdmittedCoreCreation({ document: parseCoreCreation(JSON.parse(JSON.stringify(document))) });
  const pristine = createCharacterRuntime({ characterId: id, branchId: 'main', name: document.name, raceId: 'human', alignment: alignmentId, description: `Admitted core creation ${id}` });
  assert.deepEqual(replayCharacter(pristine, admission.runtime.transaction.events, replayRegistryForCoreAdmission(admission)).transaction.facts, admission.runtime.transaction.facts);
  const campaign = newCoreCampaignArchive(admission);
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(campaign))), campaign);
  return campaign;
}
