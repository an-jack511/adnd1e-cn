import assert from 'node:assert/strict';
import { generateCorePsionics, psionicPotentialBonus } from '../src/character/engine/core-psionics';

assert.deepEqual(psionicPotentialBonus({ intelligence: 17, wisdom: 12, charisma: 17 }), {
  halfPoints: 6, exactBonus: 3, appliedBonus: 3, policy: 'sum-fractions-then-drop-remainder',
});
assert.equal(generateCorePsionics({ enabled: false, raceId: 'human', scores: { intelligence: 18, wisdom: 18, charisma: 18 } }).status, 'disabled');
assert.equal(generateCorePsionics({ enabled: true, raceId: 'dwarf', scores: { intelligence: 16, wisdom: 10, charisma: 10 } }).status, 'needs-dm');
assert.equal(generateCorePsionics({ enabled: true, raceId: 'other', scores: { intelligence: 18, wisdom: 18, charisma: 18 } }).status, 'ineligible');
assert.equal(generateCorePsionics({ enabled: true, raceId: 'human', scores: { intelligence: 15, wisdom: 15, charisma: 15 } }).status, 'ineligible');
assert.equal(generateCorePsionics({ enabled: true, raceId: 'human', scores: { intelligence: 17, wisdom: 12, charisma: 17 }, potentialPercentile: 96 }).status, 'no-potential');
assert.equal(generateCorePsionics({ enabled: true, raceId: 'human', scores: { intelligence: 17, wisdom: 12, charisma: 17 }, potentialPercentile: 97 }).status, 'awaiting-generation-rolls');

const generated = generateCorePsionics({ enabled: true, raceId: 'human', scores: { intelligence: 17, wisdom: 17, charisma: 12 },
  potentialPercentile: 96, strengthPercentile: 50, attackModePercentile: 40, defenseModePercentile: 26, disciplinePercentile: 41 });
assert.equal(generated.status, 'generated');
if (generated.status !== 'generated') throw new Error('Expected generated psionics.');
assert.equal(generated.psionicStrength, 70); assert.equal(generated.psionicAbility, 140);
assert.equal(generated.maximumAttackPoints, 70); assert.equal(generated.maximumDefensePoints, 70);
assert.equal(generated.attackModeCount, 2); assert.equal(generated.defenseModeCount, 3);
assert.deepEqual(generated.disciplineCounts, { minor: 2, major: 1 });
assert.equal(generated.identityAndAcquisition, 'requires-separate-random-and-dm-reviewed-workflow');

const maximum = generateCorePsionics({ enabled: true, raceId: 'human', scores: { intelligence: 18, wisdom: 18, charisma: 18 },
  potentialPercentile: 91, strengthPercentile: 100, attackModePercentile: 100, defenseModePercentile: 100, disciplinePercentile: 100 });
assert.equal(maximum.status, 'generated');
if (maximum.status !== 'generated') throw new Error('Expected maximum generated psionics.');
assert.equal(maximum.psionicStrength, 172); assert.equal(maximum.psionicAbility, 344);
assert.equal(maximum.attackModeCount, 5); assert.equal(maximum.defenseModeCount, 5);
assert.deepEqual(maximum.disciplineCounts, { minor: 4, major: 2 });
assert.throws(() => generateCorePsionics({ enabled: true, raceId: 'human', scores: { intelligence: 18, wisdom: 18, charisma: 18 }, potentialPercentile: 0 }), /1–100/);
console.log('PASS: optional psionic eligibility, fractional potential bonus, separate strength roll and ability bonus, dual maxima, mode counts and discipline counts match the verified PHB generation slice; identity, acquisition and combat remain explicitly separate.');
