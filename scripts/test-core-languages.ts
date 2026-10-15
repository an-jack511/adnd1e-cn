import assert from 'node:assert/strict';
import { extraLanguageCapacity, ordinaryLanguageStudyMonths, planCoreLanguages } from '../src/character/engine/core-languages';
import { coreLanguageRulePack } from '../src/character/rules/core-languages';

assert.deepEqual(Array.from({ length: 16 }, (_, index) => extraLanguageCapacity('human', index + 3)),
  [0,0,0,0,0,1,1,2,2,3,3,4,4,5,6,7]);
assert.equal(extraLanguageCapacity('dwarf', 18), 2);
assert.equal(extraLanguageCapacity('gnome', 18), 2);
assert.equal(extraLanguageCapacity('half-orc', 17), 2);
assert.equal(extraLanguageCapacity('elf', 15), 0);
assert.equal(extraLanguageCapacity('elf', 18), 3);
assert.equal(extraLanguageCapacity('half-elf', 16), 0);
assert.equal(extraLanguageCapacity('half-elf', 18), 2);
assert.equal(extraLanguageCapacity('halfling', 18), 2);
assert.equal(ordinaryLanguageStudyMonths(3), 12);
assert.equal(ordinaryLanguageStudyMonths(12), 12);
assert.equal(ordinaryLanguageStudyMonths(13), 11);
assert.equal(ordinaryLanguageStudyMonths(18), 6);

const elfThief = planCoreLanguages({ raceId: 'elf', alignmentId: 'chaotic-good', intelligence: 18,
  careers: [{ classId: 'thief', level: 1 }] });
assert.deepEqual(elfThief.automaticLanguages.map(entry => entry.languageId),
  ['common', 'elvish', 'gnomish', 'halfling', 'goblin', 'hobgoblin', 'orcish', 'gnoll', 'alignment:chaotic-good', 'thieves-cant']);
assert.equal(elfThief.entitlements.find(entry => entry.entitlementId === 'intelligence-extra')?.count, 3);
assert.equal(elfThief.openSlots['intelligence-extra'], 3);
assert.equal(elfThief.automaticLanguages.find(entry => entry.languageId === 'thieves-cant')?.kind, 'class-special');

const gnome = planCoreLanguages({ raceId: 'gnome', alignmentId: 'lawful-good', intelligence: 18, careers: [] });
assert.deepEqual(gnome.automaticCommunications, ['communicate:burrowing-mammals']);
assert.equal(gnome.entitlements[0].count, 2);

const druid2 = planCoreLanguages({ raceId: 'human', alignmentId: 'true-neutral', intelligence: 12,
  careers: [{ classId: 'druid', level: 2 }] });
assert.equal(druid2.automaticLanguages.some(entry => entry.languageId === 'druidic'), true);
assert.equal(druid2.entitlements.some(entry => entry.entitlementId === 'druid-level'), false);
const druid5 = planCoreLanguages({ raceId: 'human', alignmentId: 'true-neutral', intelligence: 12,
  careers: [{ classId: 'druid', level: 5 }], selections: [
    { entitlementId: 'intelligence-extra', languageId: 'orcish', dmApproved: false, acquisition: 'pre-existing-at-creation' },
    { entitlementId: 'druid-level', languageId: 'dryad', dmApproved: false, acquisition: 'class-level-grant' },
    { entitlementId: 'druid-level', languageId: 'common', dmApproved: true, acquisition: 'class-level-grant' },
  ] });
assert.equal(druid5.entitlements.find(entry => entry.entitlementId === 'druid-level')?.count, 3);
assert.equal(druid5.selections[0].status, 'needs-dm');
assert.equal(druid5.selections[1].status, 'accepted');
assert.equal(druid5.selections[2].status, 'invalid');
assert.equal(druid5.openSlots['intelligence-extra'], 2, 'a pending DM selection occupies a slot but does not become a known fact');
assert.equal(druid5.openSlots['druid-level'], 2);

const assassin8 = planCoreLanguages({ raceId: 'human', alignmentId: 'lawful-evil', intelligence: 18,
  careers: [{ classId: 'assassin', level: 8 }] });
assert.equal(assassin8.entitlements.some(entry => entry.entitlementId === 'assassin-level'), false);
const assassin10 = planCoreLanguages({ raceId: 'human', alignmentId: 'lawful-evil', intelligence: 16,
  careers: [{ classId: 'assassin', level: 10 }], selections: [
    { entitlementId: 'assassin-level', languageId: 'druidic', dmApproved: false, acquisition: 'class-level-grant' },
    { entitlementId: 'assassin-level', languageId: 'elvish', dmApproved: true, acquisition: 'class-level-grant' },
  ] });
assert.equal(assassin10.entitlements.find(entry => entry.entitlementId === 'assassin-level')?.count, 2);
assert.equal(assassin10.selections[0].status, 'accepted');
assert.equal(assassin10.selections[1].status, 'invalid');
assert.equal(assassin10.openSlots['assassin-level'], 1);
assert.equal(assassin10.automaticLanguages.some(entry => entry.languageId === 'thieves-cant'), false,
  'assassin thieving functions do not silently grant the thief class language');

const studied = planCoreLanguages({ raceId: 'human', alignmentId: 'neutral-good', intelligence: 13, careers: [], selections: [
  { entitlementId: 'intelligence-extra', languageId: 'kobold', dmApproved: true, acquisition: 'studied' },
] });
assert.equal(studied.selections[0].status, 'accepted');
assert.equal(studied.ordinaryStudyMonths, 11);

assert.throws(() => planCoreLanguages({ raceId: 'human', alignmentId: 'lawful-good', intelligence: 19, careers: [] }), /3 to 18/);
assert.throws(() => planCoreLanguages({ raceId: 'human', alignmentId: 'lawful-good', intelligence: 10,
  careers: [{ classId: 'fighter', level: 1 }, { classId: 'fighter', level: 2 }] }), /Duplicate career/);
assert.equal(coreLanguageRulePack.interpretation.noModernProficiencies, true);
assert.match(coreLanguageRulePack.unresolved.initialExtraLanguageTiming, /does not explicitly say/);
console.log('PASS: PHB/DMG core language capacities, racial overrides, automatic grants, Druid/Thief/Assassin timing, DM approval, study time, and slot/selection separation are enforced.');
