import assert from 'node:assert/strict';
import {
  advanceOaFoundationStage,
  calculateOaStartingFunds,
  calculateOaStartingHonor,
  planOaBirth,
  resolveOaAbilities,
  resolveOaBirthOrder,
  resolveOaBirthRank,
  reviewOaQualification,
  type OaScores,
} from '../src/character/engine/oa-character-foundation';
import { oaCharacterFoundationPack, oaClassRules } from '../src/character/rules/oa-character-foundation';

assert.equal(oaCharacterFoundationPack.sourceSha256, 'DCFE6F59F4791DD51CC227DA425B745C7E259ADC3B96A917FB30CA237DB541EB');
assert.equal(Object.keys(oaClassRules).length, 10);
assert.equal(oaCharacterFoundationPack.independence.includes('not aliases'), true);

const methodI = resolveOaAbilities({ methodId: 'OA-I', raceId: 'human',
  rolls: [[6, 5, 4, 1], [6, 6, 3, 2], [5, 5, 5, 1], [6, 4, 4, 3], [6, 5, 3, 2], [6, 6, 4, 1]],
  assignTo: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], comelinessDice: [4, 4, 4] });
assert.deepEqual(methodI.scores, { STR: 15, DEX: 15, CON: 15, INT: 14, WIS: 14, CHA: 16 });
assert.equal(methodI.finalComeliness, 14); // raw 12 + CHA 16 adjustment +2

const methodII = resolveOaAbilities({ methodId: 'OA-II', raceId: 'spirit-folk',
  rolls: Array.from({ length: 12 }, (_, index) => [1 + index % 6, 6, 6]), selectedIndexes: [0, 1, 2, 3, 4, 5],
  assignTo: ['CHA', 'WIS', 'INT', 'CON', 'DEX', 'STR'], comelinessDice: [6, 6, 6] });
assert.equal(methodII.finalComeliness, 20); // CHA 13 gives +1, spirit folk +1
assert.throws(() => resolveOaAbilities({ methodId: 'OA-II', raceId: 'human', rolls: Array.from({ length: 12 }, () => [3, 3, 3]), selectedIndexes: [0, 0, 1, 2, 3, 4], assignTo: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], comelinessDice: [3, 3, 3] }));
const methodIII = resolveOaAbilities({ methodId: 'OA-III', raceId: 'korobokuru',
  rolls: [[6, 6, 6], [5, 5, 5], [4, 4, 4], [3, 3, 3], [2, 2, 2], [1, 1, 1]], comelinessDice: [5, 5, 5] });
assert.deepEqual(methodIII.scores, { STR: 18, DEX: 15, CON: 12, INT: 9, WIS: 6, CHA: 3 });
assert.equal(methodIII.finalComeliness, 8); // raw 15 + CHA 3 (-5) + korobokuru (-2)
const methodIV = resolveOaAbilities({ methodId: 'OA-IV', raceId: 'human',
  rolls: Array.from({ length: 12 }, (_, character) => Array.from({ length: 6 }, () => [1 + character % 6, 2, 3])),
  selectedCharacterIndex: 5, comelinessDice: [3, 4, 5] });
assert.deepEqual(methodIV.scores, { STR: 11, DEX: 11, CON: 11, INT: 11, WIS: 11, CHA: 11 });
assert.equal(methodIV.selectedIndexes[0], 5);

const rawSamurai: OaScores = { STR: 13, DEX: 12, CON: 13, INT: 14, WIS: 13, CHA: 12 };
let qualification = reviewOaQualification({ raceId: 'human', classId: 'samurai', alignmentId: 'LN', rawScores: rawSamurai });
assert.equal(qualification.status, 'allowed');
assert.equal(qualification.levelCap, 'unlimited');
qualification = reviewOaQualification({ raceId: 'hengeyokai', classId: 'bushi', alignmentId: 'CN', rawScores: { STR: 12, DEX: 12, CON: 12, INT: 12, WIS: 12, CHA: 12 }, hengeyokaiSubtypeAdjustments: null });
assert.equal(qualification.status, 'needs-dm');
qualification = reviewOaQualification({ raceId: 'korobokuru', classId: 'barbarian', alignmentId: 'CN', rawScores: { STR: 14, DEX: 14, CON: 14, INT: 8, WIS: 16, CHA: 8 } });
assert.equal(qualification.status, 'allowed'); // +1 STR/+1 CON/-2 INT happen before race/class checks
qualification = reviewOaQualification({ raceId: 'human', classId: 'ninja', coverClassId: 'bushi', alignmentId: 'NE', rawScores: { STR: 12, DEX: 15, CON: 10, INT: 15, WIS: 10, CHA: 14 } });
assert.equal(qualification.status, 'allowed');
qualification = reviewOaQualification({ raceId: 'human', classId: 'ninja', alignmentId: 'NE', rawScores: { STR: 12, DEX: 15, CON: 10, INT: 15, WIS: 10, CHA: 14 } });
assert.equal(qualification.status, 'forbidden');
qualification = reviewOaQualification({ raceId: 'human', classId: 'ninja', coverClassId: 'bushi', alignmentId: 'NG', rawScores: { STR: 12, DEX: 15, CON: 10, INT: 15, WIS: 10, CHA: 14 } });
assert.equal(qualification.status, 'forbidden');

assert.equal(planOaBirth('monk').status, 'not-used');
assert.equal(planOaBirth('samurai').modifier, 10);
assert.equal(planOaBirth('yakuza').status, 'needs-dm');
assert.equal(planOaBirth('yakuza', -5).modifier, -5);
let birth = resolveOaBirthRank({ dice: [10, 10], modifier: 10 });
assert.equal(birth.band?.label, '1st-rank');
birth = resolveOaBirthRank({ dice: [1, 1], modifier: -10 });
assert.equal(birth.status, 'needs-dm');
assert.deepEqual(resolveOaBirthOrder({ siblingSpaces: 5, dieSides: 6, roll: 6 }), { status: 'reroll', birthOrder: null });
assert.deepEqual(resolveOaBirthOrder({ siblingSpaces: 5, dieSides: 6, roll: 3 }), { status: 'resolved', birthOrder: 3 });
assert.throws(() => resolveOaBirthOrder({ siblingSpaces: 5, dieSides: 4, roll: 3 }));

let honor = calculateOaStartingHonor({ classId: 'samurai', raceId: 'human', scores: rawSamurai, familyBaseHonor: 20, ancestryHonorAdjustments: [-5, 2], birthrightPersonalHonor: [1, 2] });
assert.equal(honor.familyHonor, 17);
assert.equal(honor.characterHonor, 32); // 17 family +3 birthright + lowest 12
honor = calculateOaStartingHonor({ classId: 'monk', raceId: 'human', scores: rawSamurai });
assert.equal(honor.status, 'not-recorded');
honor = calculateOaStartingHonor({ classId: 'yakuza', raceId: 'human', scores: { STR: 11, DEX: 15, CON: 10, INT: 15, WIS: 9, CHA: 16 }, yakuzaD20: 7 });
assert.equal(honor.characterHonor, 36); // 27 base + lowest 9
honor = calculateOaStartingHonor({ classId: 'bushi', raceId: 'hengeyokai', scores: { STR: 12, DEX: 12, CON: 12, INT: 12, WIS: 12, CHA: 12 }, noFamilyBaseChoice: null });
assert.equal(honor.status, 'calculated'); // both Table 41 bases are 10

let funds = calculateOaStartingFunds({ classId: 'samurai', rolls: [[6, 5], [10]] });
assert.deepEqual(funds.totals, { chien: 11, tael: 10 });
funds = calculateOaStartingFunds({ classId: 'ninja', rolls: [[2]], coverClass: { classId: 'bushi', rolls: [[4], [10, 10, 10, 10], [100, 100]] } });
assert.deepEqual(funds.totals, { tael: 4, yuan: 40, fen: 200, chien: 2 });
assert.throws(() => calculateOaStartingFunds({ classId: 'ninja', rolls: [[1]], coverClass: null }));

assert.deepEqual(advanceOaFoundationStage('abilities', 'abilities', false), { stage: 'race-class', status: 'advanced' });
assert.deepEqual(advanceOaFoundationStage('family-caste', 'family-caste', true), { stage: 'family-caste', status: 'needs-dm' });
assert.throws(() => advanceOaFoundationStage('abilities', 'race-class', false));

assert.ok(oaCharacterFoundationPack.delegated.some(item => item.id === 'martial-arts-and-proficiencies'));
assert.ok(oaCharacterFoundationPack.delegated.some(item => item.id === 'ancestry-and-birthright-rows'));
console.log('PASS: independent OA foundation covers methods I-IV, Comeliness, races, ten classes, ninja cover track, caste/family/birth order, honor, funds and audited delegated boundaries.');
