import assert from 'node:assert/strict';
import {
  calculateBardRetainedHp,
  calculateMultiClassHpGain,
  planMultiClassXp,
  reviewBardTransition,
  reviewTwoClassAdventure,
  reviewTwoClassSwitch,
  type AbilityScores,
} from '../src/character/engine/core-career-paths';
import { coreCareerPathPack } from '../src/character/rules/core-career-paths';

const scores: AbilityScores = { STR: 17, INT: 17, WIS: 15, DEX: 17, CON: 15, CHA: 15 };

assert.deepEqual(coreCareerPathPack.kinds, ['multi-class', 'character-with-two-classes', 'bard-staged-path']);
assert.notEqual(coreCareerPathPack.multiClass.kind, coreCareerPathPack.characterWithTwoClasses.kind);
assert.notEqual(coreCareerPathPack.bard.kind, coreCareerPathPack.characterWithTwoClasses.kind);

let xp = planMultiClassXp({ raceId: 'elf', classIds: ['fighter', 'magic-user'], earnedXp: 1000 });
assert.equal(xp.status, 'calculated');
assert.deepEqual(xp.allocations, { fighter: 500, 'magic-user': 500 });
assert.equal(xp.unallocatedRemainder, 0);
xp = planMultiClassXp({ raceId: 'elf', classIds: ['fighter', 'magic-user'], earnedXp: 1001 });
assert.equal(xp.status, 'needs-dm');
assert.deepEqual(xp.allocations, { fighter: 500, 'magic-user': 500 });
assert.equal(xp.unallocatedRemainder, 1);
xp = planMultiClassXp({ raceId: 'human', classIds: ['fighter', 'magic-user'], earnedXp: 1000 });
assert.equal(xp.status, 'forbidden');
xp = planMultiClassXp({ raceId: 'dwarf', classIds: ['fighter', 'magic-user'], earnedXp: 1000 });
assert.equal(xp.status, 'forbidden');
assert.throws(() => planMultiClassXp({ raceId: 'elf', classIds: ['fighter', 'bard'], earnedXp: 1000 }));

let hp = calculateMultiClassHpGain({
  raceId: 'elf', classIds: ['fighter', 'magic-user'], constitution: 18,
  gains: [
    { classId: 'fighter', targetLevel: 1, rolls: [5] },
    { classId: 'magic-user', targetLevel: 1, rolls: [2] },
  ],
});
assert.equal(hp.status, 'calculated');
assert.equal(hp.numerator, 13); // fighter 5+4, magic-user 2+2
assert.equal(hp.quotient, 6.5);
assert.equal(hp.actualAward, 7); // halves round upward
hp = calculateMultiClassHpGain({
  raceId: 'elf', classIds: ['fighter', 'magic-user'], constitution: 10,
  gains: [{ classId: 'magic-user', targetLevel: 2, rolls: [3] }],
});
assert.equal(hp.actualAward, 2); // 3 / 2 = 1.5 -> 2
hp = calculateMultiClassHpGain({
  raceId: 'elf', classIds: ['fighter', 'magic-user'], constitution: 10,
  gains: [{ classId: 'fighter', targetLevel: 10, rolls: [] }],
});
assert.equal(hp.status, 'needs-dm');
assert.equal(hp.actualAward, null);
assert.throws(() => calculateMultiClassHpGain({ raceId: 'dwarf', classIds: ['fighter', 'magic-user'], constitution: 10,
  gains: [{ classId: 'fighter', targetLevel: 1, rolls: [5] }] }));

let switched = reviewTwoClassSwitch({ raceId: 'human', oldClassId: 'fighter', newClassId: 'magic-user', oldLevel: 6,
  scores, pairRuling: 'approved', alignmentCompatibility: 'compatible', newClassEntry: 'eligible' });
assert.equal(switched.status, 'allowed');
assert.deepEqual(switched.oldPrincipalAbilities, ['STR']);
assert.deepEqual(switched.newPrincipalAbilities, ['INT']);
assert.equal(switched.effects.oldClassProgressionStops, true);
switched = reviewTwoClassSwitch({ raceId: 'human', oldClassId: 'fighter', newClassId: 'magic-user', oldLevel: 6,
  scores: { ...scores, INT: 16 }, pairRuling: 'approved', alignmentCompatibility: 'compatible', newClassEntry: 'eligible' });
assert.equal(switched.status, 'forbidden');
assert.ok(switched.issues.some(item => item.id === 'new-principal-INT'));
switched = reviewTwoClassSwitch({ raceId: 'half-elf', oldClassId: 'fighter', newClassId: 'magic-user', oldLevel: 6,
  scores, pairRuling: 'approved', alignmentCompatibility: 'compatible', newClassEntry: 'eligible' });
assert.equal(switched.status, 'forbidden');
switched = reviewTwoClassSwitch({ raceId: 'human', oldClassId: 'paladin', newClassId: 'magic-user', oldLevel: 6,
  scores, pairRuling: null, alignmentCompatibility: 'needs-dm', newClassEntry: 'needs-dm' });
assert.equal(switched.status, 'needs-dm');
assert.ok(switched.issues.some(item => item.id === 'old-principal-unresolved'));
assert.throws(() => reviewTwoClassSwitch({ raceId: 'human', oldClassId: 'fighter', newClassId: 'magic-user', oldLevel: 6,
  scores: { ...scores, INT: Number.NaN }, pairRuling: 'approved', alignmentCompatibility: 'compatible', newClassEntry: 'eligible' }));

let adventure = reviewTwoClassAdventure({ oldLevel: 6, newLevel: 6, usedFormerClassFunction: true });
assert.equal(adventure.status, 'xp-forfeited');
assert.equal(adventure.formerFunctionsAvailable, false);
adventure = reviewTwoClassAdventure({ oldLevel: 6, newLevel: 7, usedFormerClassFunction: true });
assert.equal(adventure.status, 'xp-eligible');
assert.equal(adventure.formerFunctionsAvailable, true);
assert.equal(adventure.oldClassProgressionResumes, false);
adventure = reviewTwoClassAdventure({ oldLevel: 6, newLevel: 6, usedFormerClassFunction: null });
assert.equal(adventure.status, 'needs-dm');

let bard = reviewBardTransition({ transition: 'fighter-to-thief', bardCampaignApproved: true, raceId: 'half-elf',
  alignmentId: 'NG', scores, fighterLevel: 5, fighterWasExclusive: true, thiefLevel: null,
  druidicTutorConfirmed: null, ordinaryTwoClassMinimaRuling: 'special-bard-path-controls' });
assert.equal(bard.status, 'allowed');
bard = reviewBardTransition({ transition: 'fighter-to-thief', bardCampaignApproved: true, raceId: 'human',
  alignmentId: 'NG', scores, fighterLevel: 8, fighterWasExclusive: true, thiefLevel: null,
  druidicTutorConfirmed: null, ordinaryTwoClassMinimaRuling: 'special-bard-path-controls' });
assert.equal(bard.status, 'forbidden');
bard = reviewBardTransition({ transition: 'thief-to-bard', bardCampaignApproved: true, raceId: 'human',
  alignmentId: 'LN', scores, fighterLevel: 6, fighterWasExclusive: true, thiefLevel: 7,
  druidicTutorConfirmed: null, ordinaryTwoClassMinimaRuling: null });
assert.equal(bard.status, 'needs-dm');
assert.ok(bard.issues.some(item => item.id === 'druidic-tutor-unconfirmed'));
assert.ok(bard.issues.some(item => item.id === 'bard-two-class-minima-unresolved'));
bard = reviewBardTransition({ transition: 'thief-to-bard', bardCampaignApproved: true, raceId: 'elf',
  alignmentId: 'LG', scores, fighterLevel: 6, fighterWasExclusive: true, thiefLevel: 9,
  druidicTutorConfirmed: true, ordinaryTwoClassMinimaRuling: 'special-bard-path-controls' });
assert.equal(bard.status, 'forbidden');

let retained = calculateBardRetainedHp({ fighterLevel: 6, thiefLevel: 7, fighterAccumulatedHp: 40,
  thiefHpEarnedAboveFighterLevel: 4, bardAdditionalHp: 3 });
assert.equal(retained.status, 'calculated');
assert.equal(retained.retainedHp, 44);
assert.equal(retained.totalHpAfterBardAward, 47);
retained = calculateBardRetainedHp({ fighterLevel: 5, thiefLevel: 7, fighterAccumulatedHp: 35,
  thiefHpEarnedAboveFighterLevel: null, bardAdditionalHp: 0 });
assert.equal(retained.status, 'needs-dm');
assert.throws(() => calculateBardRetainedHp({ fighterLevel: 7, thiefLevel: 5, fighterAccumulatedHp: 45,
  thiefHpEarnedAboveFighterLevel: 1, bardAdditionalHp: 0 }));

console.log('PASS: distinct simultaneous multi-class, human successive two-class, and optional staged Bard paths; sourced XP/HP, 15/17 gates, former-function XP consequence, strict exceed release, stage windows and retained HP; unstated edges remain needs-dm.');
