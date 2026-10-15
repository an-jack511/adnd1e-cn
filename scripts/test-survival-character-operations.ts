import assert from 'node:assert/strict';
import {
  calculateSurvivalProficiencySlots,
  dailyWaterRequirementPints,
  fatigueEffects,
  foodToleranceDays,
  nextWsgFatigueCheckAfterTurns,
  recordThermalExposure,
  recoverFatigue,
  resolveDeprivationCheck,
  resolveFatigueCheck,
  resolveSurvivalAbilityCheck,
  resolveSurvivalProficiencyCheck,
  sleepDebtEffects,
  validateSurvivalRuleProfile,
  waterToleranceDays,
} from '../src/character/engine/survival-character-operations';
import { survivalCharacterOperationsRulePack } from '../src/character/rules/survival-character-operations';

const dsg = { enabledBooks: ['dsg'] as const, proficiencyCheckPolicy: 'dsg' as const };
const both = { enabledBooks: ['dsg', 'wsg'] as const, proficiencyCheckPolicy: 'wsg' as const, wsgExpandedFirstLevelSlot: true };

assert.equal(validateSurvivalRuleProfile({ enabledBooks: [] }).status, 'disabled');
assert.equal(validateSurvivalRuleProfile({ enabledBooks: ['dsg'] }).status, 'needs-campaign-adoption');
assert.throws(() => validateSurvivalRuleProfile({ enabledBooks: ['dsg'], proficiencyCheckPolicy: 'wsg' }), /enabled book/);
assert.throws(() => validateSurvivalRuleProfile({ enabledBooks: ['wsg'], proficiencyCheckPolicy: 'wsg', wsgExpandedFirstLevelSlot: true }), /both DSG and WSG/);

const fighter1 = calculateSurvivalProficiencySlots({ profile: dsg, classId: 'fighter', level: 1 });
assert.equal(fighter1.status, 'calculated');
if (fighter1.status !== 'calculated') throw new Error('Fighter schedule unexpectedly unresolved.');
assert.deepEqual([fighter1.weaponSlots, fighter1.nonweaponSlots], [4, 2]);
const cleric5 = calculateSurvivalProficiencySlots({ profile: both, classId: 'cleric', level: 5 });
assert.equal(cleric5.status, 'calculated');
if (cleric5.status !== 'calculated') throw new Error('Cleric schedule unexpectedly unresolved.');
assert.deepEqual([cleric5.weaponSlots, cleric5.nonweaponSlots, cleric5.expandedFirstLevelSlot], [3, 5, 1]);
assert.equal(calculateSurvivalProficiencySlots({ profile: dsg, classId: 'bard', level: 4 }).status, 'needs-dm');

assert.equal(resolveSurvivalAbilityCheck({ ability: 'strength', score: 12, roll: 12 }).status, 'success');
assert.equal(resolveSurvivalAbilityCheck({ ability: 'strength', score: 12, roll: 13 }).status, 'failure');
const dsgLow = resolveSurvivalProficiencyCheck({ policy: 'dsg', abilityScore: 15, dieRoll: 5, printedDieModifier: -2 });
assert.deepEqual([dsgLow.modifiedRoll, dsgLow.automaticFailure, dsgLow.status], [3, true, 'failure']);
const wsgHigh = resolveSurvivalProficiencyCheck({ policy: 'wsg', abilityScore: 25, dieRoll: 19, printedDieModifier: -5 });
assert.deepEqual([wsgHigh.target, wsgHigh.automaticFailure, wsgHigh.status], [18, true, 'failure']);
const improved = resolveSurvivalProficiencyCheck({ policy: 'wsg', abilityScore: 14, dieRoll: 16, improvementSlots: 1 });
assert.deepEqual([improved.modifier, improved.modifiedRoll, improved.status], [-2, 14, 'success']);

assert.deepEqual([0, 1, 2, 3, 7].map(nextWsgFatigueCheckAfterTurns), [6, 5, 4, 3, 1]);
assert.equal(resolveFatigueCheck({ state: 'normal', currentConstitution: 12, roll: 13, mode: 'exertion' }).status, 'fatigued');
assert.equal(resolveFatigueCheck({ state: 'fatigued', currentConstitution: 10, roll: 11, mode: 'exertion' }).status, 'exhausted');
assert.equal(resolveFatigueCheck({ state: 'exhausted', currentConstitution: 8, roll: 7, mode: 'exhaustion-recovery' }).status, 'fatigued');
assert.deepEqual(fatigueEffects('exhausted'), { abilityPenalty: -4, attackDamageSavePenalty: -4, voluntaryPhysicalActivity: false });
assert.deepEqual(recoverFatigue({ state: 'fatigued', uninterruptedRestTurns: 2 }), { status: 'normal', checkRequired: false });
assert.equal(recoverFatigue({ state: 'exhausted', uninterruptedRestTurns: 6 }).checkRequired, true);

assert.deepEqual([foodToleranceDays(7, 8), foodToleranceDays(12, 13), foodToleranceDays(18, 18)], [4, 7, 10]);
assert.equal(waterToleranceDays({ strength: 12, constitution: 12 }), 3);
assert.equal(waterToleranceDays({ strength: 7, constitution: 12, reachedNinetyDegrees: true, ateAtLeastOneMealDaily: false }), 1);
assert.equal(waterToleranceDays({ strength: 12, constitution: 12, highWaterFood: true, female: true, noStrenuousActivity: true }), 7);
assert.equal(resolveDeprivationCheck({ condition: 'normal', roll: 15, strength: 12, constitution: 14, checkModifier: 1, deprivedOf: 'food' }).status, 'weakened');
assert.equal(resolveDeprivationCheck({ condition: 'weakened', roll: 20, strength: 18, constitution: 18, checkModifier: 0, deprivedOf: 'food-and-water' }).status, 'incapacitated');

assert.equal(dailyWaterRequirementPints({ activity: 'heavy', temperature: 'above-90', race: 'human' }).pints, 16);
assert.equal(dailyWaterRequirementPints({ activity: 'light', temperature: '50-70', race: 'elf' }).pints, 5.5);
assert.equal(dailyWaterRequirementPints({ activity: 'moderate', temperature: '71-90', race: 'dwarf' }).pints, 7);

assert.equal(sleepDebtEffects([4, 4]).status, 'sleep-deprived');
assert.equal(sleepDebtEffects([4, 4]).penalties?.dexterityCheck, 1);
assert.equal(sleepDebtEffects([0, 5]).status, 'rested');
assert.equal(sleepDebtEffects([2.5, 2.5]).penalties?.dexterityCheck, 3);

const thermal = { condition: 'none' as const, consecutiveFailedColdChecks: 2, constitutionLost: 0, physicalAbilityPointsLost: 0, wisdomPointsLost: 0 };
assert.equal(recordThermalExposure({ prior: thermal, protected: false, coldCheckFailed: true }).status, 'needs-dm');
const hypothermia = recordThermalExposure({ prior: thermal, protected: false, coldCheckFailed: true, dmRulingId: 'thermal-1' });
assert.equal(hypothermia.status, 'committed');
if (hypothermia.status !== 'committed') throw new Error('Thermal ruling unexpectedly pending.');
assert.equal(hypothermia.state.condition, 'hypothermia');

assert.equal(survivalCharacterOperationsRulePack.status, 'optional-sidecar');
assert.match(survivalCharacterOperationsRulePack.activation, /explicitly enabled/);
assert.equal(survivalCharacterOperationsRulePack.sources['wsg:64-65:sleep'].pdfPages[0], 65);

console.log('PASS: DSG/WSG optional activation, proficiency slots/check policies, fatigue, deprivation, water, sleep, and DM-gated exposure state.');
