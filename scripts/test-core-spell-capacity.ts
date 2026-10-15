import assert from 'node:assert/strict';
import {
  calculateCharacterSpellCapacities,
  calculateCoreSpellCapacity,
  preparedCapacityByLevel,
} from '../src/character/engine/core-spell-capacity';
import {
  bardSpellCapacityRows,
  clericSpellCapacityRows,
  coreSpellCapacityRulePack,
  druidSpellCapacityRows,
  illusionistSpellCapacityRows,
  magicUserSpellCapacityRows,
  paladinSpellCapacityRows,
  rangerDruidicSpellCapacityRows,
  rangerMagicUserSpellCapacityRows,
  type SpellCapacityRow,
} from '../src/character/rules/core-spell-capacity';

const compact = (rows: readonly SpellCapacityRow[]) => rows.map(row => `${row.level}:${row.daily.join(',')}`).join('|');
assert.equal(compact(clericSpellCapacityRows), '1:1,0,0,0,0,0,0|2:2,0,0,0,0,0,0|3:2,1,0,0,0,0,0|4:3,2,0,0,0,0,0|5:3,3,1,0,0,0,0|6:3,3,2,0,0,0,0|7:3,3,2,1,0,0,0|8:3,3,3,2,0,0,0|9:4,4,3,2,1,0,0|10:4,4,3,3,2,0,0|11:5,4,4,3,2,1,0|12:6,5,5,3,2,2,0|13:6,6,6,4,2,2,0|14:6,6,6,5,3,2,0|15:7,7,7,5,4,2,0|16:7,7,7,6,5,3,1|17:8,8,8,6,5,3,1|18:8,8,8,7,6,4,1|19:9,9,9,7,6,4,2|20:9,9,9,8,7,5,2|21:9,9,9,9,8,6,2|22:9,9,9,9,9,6,3|23:9,9,9,9,9,7,3|24:9,9,9,9,9,8,3|25:9,9,9,9,9,8,4|26:9,9,9,9,9,9,4|27:9,9,9,9,9,9,5|28:9,9,9,9,9,9,6|29:9,9,9,9,9,9,7');
assert.equal(compact(druidSpellCapacityRows), '1:2,0,0,0,0,0,0|2:2,1,0,0,0,0,0|3:3,2,1,0,0,0,0|4:4,2,2,0,0,0,0|5:4,3,2,0,0,0,0|6:4,3,2,1,0,0,0|7:4,4,3,1,0,0,0|8:4,4,3,2,0,0,0|9:5,4,3,2,1,0,0|10:5,4,3,3,2,0,0|11:5,5,3,3,2,1,0|12:5,5,4,4,3,2,1|13:6,5,5,5,4,3,2|14:6,6,6,6,5,4,3');
assert.equal(compact(paladinSpellCapacityRows), '9:1,0,0,0|10:2,0,0,0|11:2,1,0,0|12:2,2,0,0|13:2,2,1,0|14:3,2,1,0|15:3,2,1,1|16:3,3,1,1|17:3,3,2,1|18:3,3,3,1|19:3,3,3,2|20:3,3,3,3');
assert.equal(compact(rangerDruidicSpellCapacityRows), '8:1,0,0|9:1,0,0|10:2,0,0|11:2,0,0|12:2,1,0|13:2,1,0|14:2,2,0|15:2,2,0|16:2,2,1|17:2,2,2');
assert.equal(compact(rangerMagicUserSpellCapacityRows), '8:0,0|9:1,0|10:1,0|11:2,0|12:2,0|13:2,1|14:2,1|15:2,2|16:2,2|17:2,2');
assert.equal(compact(magicUserSpellCapacityRows), '1:1,0,0,0,0,0,0,0,0|2:2,0,0,0,0,0,0,0,0|3:2,1,0,0,0,0,0,0,0|4:3,2,0,0,0,0,0,0,0|5:4,2,1,0,0,0,0,0,0|6:4,2,2,0,0,0,0,0,0|7:4,3,2,1,0,0,0,0,0|8:4,3,3,2,0,0,0,0,0|9:4,3,3,2,1,0,0,0,0|10:4,4,3,2,2,0,0,0,0|11:4,4,4,3,3,0,0,0,0|12:4,4,4,4,4,1,0,0,0|13:5,5,5,4,4,2,0,0,0|14:5,5,5,4,4,2,1,0,0|15:5,5,5,5,5,2,1,0,0|16:5,5,5,5,5,3,2,1,0|17:5,5,5,5,5,3,3,2,0|18:5,5,5,5,5,3,3,2,1|19:5,5,5,5,5,3,3,3,1|20:5,5,5,5,5,4,3,3,2|21:5,5,5,5,5,4,4,4,2|22:5,5,5,5,5,5,4,4,3|23:5,5,5,5,5,5,5,5,3|24:5,5,5,5,5,5,5,5,4|25:5,5,5,5,5,5,5,5,5|26:6,6,6,6,5,5,5,5,5|27:6,6,6,6,6,6,6,5,5|28:6,6,6,6,6,6,6,6,6|29:7,7,7,7,6,6,6,6,6');
assert.equal(compact(illusionistSpellCapacityRows), '1:1,0,0,0,0,0,0|2:2,0,0,0,0,0,0|3:2,1,0,0,0,0,0|4:3,2,0,0,0,0,0|5:4,2,1,0,0,0,0|6:4,3,1,0,0,0,0|7:4,3,2,0,0,0,0|8:4,3,2,1,0,0,0|9:5,3,3,2,0,0,0|10:5,4,3,2,1,0,0|11:5,4,3,3,2,0,0|12:5,5,4,3,2,1,0|13:5,5,4,3,2,2,1|14:5,5,4,3,2,2,1|15:5,5,4,4,2,2,2|16:5,5,5,4,3,2,2|17:5,5,5,5,3,2,2|18:5,5,5,5,3,3,2|19:5,5,5,5,4,3,2|20:5,5,5,5,4,3,3|21:5,5,5,5,5,4,3|22:5,5,5,5,5,5,4|23:5,5,5,5,5,5,5|24:6,6,6,6,5,5,5|25:6,6,6,6,6,6,6|26:7,7,7,7,6,6,6');
assert.equal(compact(bardSpellCapacityRows), '1:1,0,0,0,0|2:2,0,0,0,0|3:3,0,0,0,0|4:3,1,0,0,0|5:3,2,0,0,0|6:3,3,0,0,0|7:3,3,1,0,0|8:3,3,2,0,0|9:3,3,3,0,0|10:3,3,3,1,0|11:3,3,3,2,0|12:3,3,3,3,0|13:3,3,3,3,1|14:3,3,3,3,2|15:3,3,3,3,3|16:4,3,3,3,3|17:4,4,3,3,3|18:4,4,4,3,3|19:5,4,4,4,3|20:5,4,4,4,4|21:5,5,4,4,4|22:5,5,5,4,4|23:5,5,5,5,5');

const capacities = (result: ReturnType<typeof calculateCoreSpellCapacity>, trackIndex = 0) => {
  assert.notEqual(result.status, 'needs-dm');
  if (result.status === 'needs-dm') throw new Error(result.reason);
  return result.tracks[trackIndex].levels.map(level => level.preparedCapacity);
};

const cleric9 = calculateCoreSpellCapacity({ careerId: 'cleric-low', classId: 'cleric', level: 1, model: 'single', intelligence: 10, wisdom: 9 });
assert.deepEqual(capacities(cleric9), [1,0,0,0,0,0,0]);
assert.equal(cleric9.status === 'needs-dm' ? null : cleric9.spellFailurePercent, 20);
const cleric18 = calculateCoreSpellCapacity({ careerId: 'cleric-high', classId: 'cleric', level: 1, model: 'single', intelligence: 10, wisdom: 18 });
assert.deepEqual(capacities(cleric18), [3,0,0,0,0,0,0], 'bonuses apply only after the class is entitled to that spell level');
const cleric16Wis = calculateCoreSpellCapacity({ careerId: 'cleric-11-wis16', classId: 'cleric', level: 11, model: 'single', intelligence: 10, wisdom: 16 });
assert.deepEqual(capacities(cleric16Wis), [7,6,4,3,2,0,0], 'WIS 16 cannot use the printed sixth-level cell');
const cleric17Wis = calculateCoreSpellCapacity({ careerId: 'cleric-11-wis17', classId: 'cleric', level: 11, model: 'single', intelligence: 10, wisdom: 17 });
assert.deepEqual(capacities(cleric17Wis), [7,6,5,3,2,1,0]);
const clericSeventhGate = calculateCoreSpellCapacity({ careerId: 'cleric-16-wis17', classId: 'cleric', level: 16, model: 'single', intelligence: 10, wisdom: 17 });
assert.equal(capacities(clericSeventhGate)[6], 0);
assert.equal(calculateCoreSpellCapacity({ careerId: 'cleric-30', classId: 'cleric', level: 30, model: 'single', intelligence: 10, wisdom: 18 }).status, 'needs-dm');

const druid = calculateCoreSpellCapacity({ careerId: 'druid-1', classId: 'druid', level: 1, model: 'single', intelligence: 10, wisdom: 12 });
assert.deepEqual(capacities(druid), [2,0,0,0,0,0,0]);
assert.equal(druid.status === 'needs-dm' ? null : druid.spellFailurePercent, 5);
assert.equal(calculateCoreSpellCapacity({ careerId: 'druid-15', classId: 'druid', level: 15, model: 'single', intelligence: 10, wisdom: 18 }).status, 'needs-dm');

assert.deepEqual(capacities(calculateCoreSpellCapacity({ careerId: 'paladin-8', classId: 'paladin', level: 8, model: 'single', intelligence: 10, wisdom: 13 })), [0,0,0,0]);
assert.deepEqual(capacities(calculateCoreSpellCapacity({ careerId: 'paladin-99', classId: 'paladin', level: 99, model: 'single', intelligence: 10, wisdom: 18 })), [3,3,3,3]);
assert.equal(calculateCoreSpellCapacity({ careerId: 'bad-paladin', classId: 'paladin', level: 9, model: 'single', intelligence: 10, wisdom: 12 }).status, 'needs-dm');

const ranger8 = calculateCoreSpellCapacity({ careerId: 'ranger-8', classId: 'ranger', level: 8, model: 'single', intelligence: 13, wisdom: 14 });
assert.deepEqual(capacities(ranger8, 0), [1,0,0]);
assert.deepEqual(capacities(ranger8, 1), [0,0]);
const ranger13 = calculateCoreSpellCapacity({ careerId: 'ranger-13', classId: 'ranger', level: 13, model: 'single', intelligence: 13, wisdom: 14 });
assert.deepEqual(capacities(ranger13, 0), [2,1,0]);
assert.deepEqual(capacities(ranger13, 1), [2,1]);
if (ranger13.status === 'needs-dm') throw new Error(ranger13.reason);
assert.equal(ranger13.tracks[1].chanceToKnowRequired, true);
assert.deepEqual(capacities(calculateCoreSpellCapacity({ careerId: 'ranger-max', classId: 'ranger', level: 99, model: 'single', intelligence: 13, wisdom: 14 }), 0), [2,2,2]);

const muInt9 = calculateCoreSpellCapacity({ careerId: 'mu-int9', classId: 'magic-user', level: 29, model: 'single', intelligence: 9, wisdom: 10 });
assert.deepEqual(capacities(muInt9), [7,7,7,7,0,0,0,0,0]);
if (muInt9.status === 'needs-dm') throw new Error(muInt9.reason);
assert.equal(muInt9.tracks[0].maximumUsableSpellLevel, 4);
const muInt18 = calculateCoreSpellCapacity({ careerId: 'mu-int18', classId: 'magic-user', level: 29, model: 'single', intelligence: 18, wisdom: 10 });
assert.deepEqual(capacities(muInt18), [7,7,7,7,6,6,6,6,6]);
assert.equal(calculateCoreSpellCapacity({ careerId: 'mu-30', classId: 'magic-user', level: 30, model: 'single', intelligence: 18, wisdom: 10 }).status, 'needs-dm');

assert.deepEqual(capacities(calculateCoreSpellCapacity({ careerId: 'illusionist-26', classId: 'illusionist', level: 26, model: 'single', intelligence: 15, wisdom: 10 })), [7,7,7,7,6,6,6]);
assert.equal(calculateCoreSpellCapacity({ careerId: 'illusionist-27', classId: 'illusionist', level: 27, model: 'single', intelligence: 15, wisdom: 10 }).status, 'needs-dm');

assert.equal(calculateCoreSpellCapacity({ careerId: 'bard-disabled', classId: 'bard', level: 1, model: 'bard', intelligence: 12, wisdom: 15 }).status, 'needs-dm');
const bard23 = calculateCoreSpellCapacity({ careerId: 'bard-23', classId: 'bard', level: 23, model: 'bard', intelligence: 12, wisdom: 15, bardEnabled: true });
assert.deepEqual(capacities(bard23), [5,5,5,5,5]);
assert.equal(bard23.status === 'needs-dm' ? null : bard23.bardEffectiveDruidLevel, 13);
assert.equal(calculateCoreSpellCapacity({ careerId: 'bard-24', classId: 'bard', level: 24, model: 'bard', intelligence: 12, wisdom: 15, bardEnabled: true }).status, 'needs-dm');

const blockedFormer = calculateCoreSpellCapacity({ careerId: 'former-cleric', classId: 'cleric', level: 5, model: 'two-class-former', intelligence: 10, wisdom: 15,
  twoClass: { formerCareerLevel: 5, currentCareerLevel: 5 } });
assert.equal(blockedFormer.status, 'blocked-two-class');
assert.throws(() => preparedCapacityByLevel(blockedFormer, 'cleric'), /blocked former class/);
const usableFormer = calculateCoreSpellCapacity({ careerId: 'former-cleric-usable', classId: 'cleric', level: 5, model: 'two-class-former', intelligence: 10, wisdom: 15,
  twoClass: { formerCareerLevel: 5, currentCareerLevel: 6 } });
assert.equal(usableFormer.status, 'calculated');
assert.equal(preparedCapacityByLevel(usableFormer, 'cleric')[1], 5);

const multi = calculateCharacterSpellCapacities([
  { careerId: 'half-elf-cleric', classId: 'cleric', level: 3, model: 'multi-class', intelligence: 13, wisdom: 13 },
  { careerId: 'half-elf-mu', classId: 'magic-user', level: 3, model: 'multi-class', intelligence: 13, wisdom: 13 },
]);
assert.equal(multi.aggregation, 'per-career-never-pooled');
assert.equal(multi.careers.length, 2);
assert.throws(() => calculateCharacterSpellCapacities([
  { careerId: 'same', classId: 'cleric', level: 1, model: 'multi-class', intelligence: 13, wisdom: 13 },
  { careerId: 'same', classId: 'magic-user', level: 1, model: 'multi-class', intelligence: 13, wisdom: 13 },
]), /Duplicate careerId/);

assert.equal(coreSpellCapacityRulePack.interpretation.zeroDoesNotMeanUnknown, true);
assert.equal(coreSpellCapacityRulePack.unresolved.expansionClassesAndTables.includes('not included'), true);
console.log('PASS: all seven core class progressions and 143 printed rows match visual goldens; ability gates, WIS bonuses/failure, printed dashes, explicit maxima, Bard opt-in, per-career multi/two-class boundaries and ledger capacity export are enforced.');
