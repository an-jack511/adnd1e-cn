import assert from 'node:assert/strict';
import {
  evaluateCoreFabricationEligibility,
  planCoreOtherItemFabrication,
  planCorePotionFabrication,
  planCoreScrollInscription,
  projectCoreFabricationForPlayer,
  resolveCoreFabricationCheck,
  scrollFailurePercent,
} from '../src/character/engine/core-magic-item-fabrication';
import {
  CORE_DMG_SHA256,
  CORE_PHB_SHA256,
  coreMagicItemFabricationSources,
} from '../src/character/rules/core-magic-item-fabrication';

assert.equal(CORE_DMG_SHA256.length, 64);
assert.equal(CORE_PHB_SHA256.length, 64);
assert.deepEqual(coreMagicItemFabricationSources['dmg:118:other-items'].pdfPages, [119]);

assert.equal(evaluateCoreFabricationEligibility({ profession: 'magic-user', level: 6, category: 'potion', itemNature: 'consumable-potion', hasAlchemist: true }).decision, 'ineligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'magic-user', level: 7, category: 'potion', itemNature: 'consumable-potion', hasAlchemist: false }).decision, 'ineligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'magic-user', level: 12, category: 'potion', itemNature: 'consumable-potion', hasAlchemist: false }).decision, 'eligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'assassin', level: 9, category: 'potion', itemNature: 'poison' }).decision, 'eligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'druid', level: 12, category: 'other-item', itemNature: 'charged', itemUsableByMakerProfession: true }).decision, 'ineligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'druid', level: 13, category: 'other-item', itemNature: 'charged', itemUsableByMakerProfession: true }).decision, 'eligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'illusionist', level: 13, category: 'other-item', itemNature: 'permanent', itemUsableByMakerProfession: true }).decision, 'ineligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'illusionist', level: 14, category: 'other-item', itemNature: 'permanent', itemUsableByMakerProfession: true }).decision, 'eligible');
assert.equal(evaluateCoreFabricationEligibility({ profession: 'magic-user', level: 20, category: 'other-item', itemNature: 'permanent', itemIsAncientOrReserved: true }).decision, 'ineligible');

const potion = planCorePotionFabrication({
  profession: 'magic-user', level: 8, category: 'potion', itemNature: 'consumable-potion', hasAlchemist: true,
  potionXpAward: 250, potionHasNoListedXpAward: false, laboratoryGpValue: 600, laboratoryUpkeepPaid: true,
  specialIngredientApprovedAndPossessed: true, optionalFailurePercent: 10,
});
assert.equal(potion.decision, 'eligible');
assert.deepEqual(potion.calendar[0]?.quantity, { numerator: 3, denominator: 2 });
assert.equal(potion.transactions.find(transaction => transaction.description.startsWith('Basic'))?.amount, 125);
assert.equal(potion.transactions.find(transaction => transaction.description.startsWith('Monthly'))?.amount, 60);
assert.equal(resolveCoreFabricationCheck(potion.checks[0]!, 10).succeeded, false);
assert.equal(resolveCoreFabricationCheck(potion.checks[0]!, 11).succeeded, true);

const potionNeedsDm = planCorePotionFabrication({
  profession: 'magic-user', level: 12, category: 'potion', itemNature: 'consumable-potion', hasAlchemist: false,
  potionXpAward: null, potionHasNoListedXpAward: false, laboratoryGpValue: null, laboratoryUpkeepPaid: false,
  specialIngredientApprovedAndPossessed: null, optionalFailurePercent: null,
});
assert.equal(potionNeedsDm.decision, 'needs-dm');
assert.match(potionNeedsDm.needsDm.join(' '), /XP award/);

assert.equal(scrollFailurePercent({ level: 14, spellLevel: 7, surface: 'parchment' }), 13);
assert.equal(scrollFailurePercent({ level: 14, spellLevel: 7, surface: 'papyrus' }), 18);
assert.equal(scrollFailurePercent({ level: 14, spellLevel: 7, surface: 'vellum' }), 8);
const scroll = planCoreScrollInscription({
  profession: 'cleric', level: 14, category: 'scroll', itemNature: 'spell-scroll', spellLevel: 7,
  makerCanEmploySpell: true, surface: 'parchment', sheetCount: 1, actualGpPerSheet: 4,
  specialQuillConfirmed: true, dmInkFormulaApprovedAndPossessed: true, existingSpellCount: 0,
});
assert.equal(scroll.decision, 'eligible');
assert.equal(scroll.calendar[0]?.quantity.numerator, 7);
assert.equal(scroll.checks[0]?.target, 13);
assert.equal(resolveCoreFabricationCheck(scroll.checks[0]!, 13).succeeded, false);
assert.equal(resolveCoreFabricationCheck(scroll.checks[0]!, 14).succeeded, true);

const magicUserItem = planCoreOtherItemFabrication({
  profession: 'magic-user', level: 15, category: 'other-item', itemNature: 'permanent',
  itemUsableByMakerProfession: true, itemXpValue: 2_000, finestQualityConfirmed: true, rawMaterialGp: 5_000,
  dmFormulaApproved: true, requiredIngredientsPossessed: true, rolledEnchantAdditionalHours: 32,
  successiveSpellLevel: 5, rolledSuccessiveAdditionalHoursPerLevel: 6,
  itemSavingThrowTarget: 8, makerSavingThrowBonus: 5,
});
assert.equal(magicUserItem.decision, 'eligible');
assert.equal(magicUserItem.calendar[0]?.quantity.numerator, 48);
assert.equal(magicUserItem.calendar[1]?.quantity.numerator, 34);
assert.equal(magicUserItem.calendar.at(-1)?.quantity.numerator, 20);
assert.equal(magicUserItem.checks[0]?.target, 5, 'saving throw bonus is capped at +3');
assert.equal(resolveCoreFabricationCheck(magicUserItem.checks[0]!, 1).succeeded, false, 'natural 1 always fails');
assert.equal(resolveCoreFabricationCheck(magicUserItem.checks[0]!, 5).succeeded, true);
assert.equal(magicUserItem.transactions.some(transaction => transaction.kind === 'ability-loss' && transaction.amount === 1), true);

const clericItem = planCoreOtherItemFabrication({
  profession: 'cleric', level: 11, category: 'other-item', itemNature: 'charged', itemUsableByMakerProfession: true,
  clericItemPermittedAndAlignmentCompatible: true, itemXpValue: 1_000, finestQualityConfirmed: true,
  rawMaterialGp: 2_000, dmFormulaApproved: true, requiredIngredientsPossessed: true,
});
assert.equal(clericItem.decision, 'needs-dm', 'exemplary conduct and daily divine favor remain DM-private');
assert.deepEqual(clericItem.calendar.slice(0, 3).map(entry => entry.quantity.numerator), [14, 7, 1]);
assert.equal(resolveCoreFabricationCheck(clericItem.checks[0]!, 3, { divineFavorDay: 3 }).succeeded, true);
assert.equal(resolveCoreFabricationCheck(clericItem.checks[0]!, 4, { divineFavorDay: 3 }).succeeded, false);

const unclearRest = planCoreOtherItemFabrication({
  profession: 'illusionist', level: 14, category: 'other-item', itemNature: 'permanent', itemUsableByMakerProfession: true,
  itemXpValue: 250, finestQualityConfirmed: true, rawMaterialGp: 10_000, dmFormulaApproved: true,
  requiredIngredientsPossessed: true,
});
assert.equal(unclearRest.decision, 'needs-dm');
assert.match(unclearRest.needsDm.join(' '), /round convalescence/);

const compelled = evaluateCoreFabricationEligibility({
  profession: 'magic-user', level: 18, category: 'other-item', itemNature: 'permanent', compelled: 'charmed',
});
assert.equal(compelled.decision, 'ineligible');
assert.match(compelled.dmSecrets.join(' '), /usual time and money/);
assert.notEqual(evaluateCoreFabricationEligibility({
  profession: 'assassin', level: 9, category: 'potion', itemNature: 'poison', compelled: 'charmed',
}).decision, 'ineligible', 'the compelled-maker paragraph only certifies magic-users, not assassins');
const projected = JSON.stringify(projectCoreFabricationForPlayer(magicUserItem));
assert.equal(projected.includes('DM-defined fabrication ingredients'), false);
assert.equal(projected.includes('successive-dweomer'), true);
assert.equal(projected.includes('"target":5'), true, 'public basic check may expose its target');
const projectedCleric = JSON.stringify(projectCoreFabricationForPlayer(clericItem));
assert.equal(projectedCleric.includes('"target"'), false, 'DM-secret divine favor target is withheld');

console.log('PASS: PHB/DMG core potion, scroll, other-item, cleric/druid, illusionist, secrecy, calendar, and resource fabrication rules.');

