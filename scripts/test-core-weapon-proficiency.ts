import assert from 'node:assert/strict';
import { coreWeaponProficiencySlots, validateCoreWeaponSelections } from '../src/character/engine/core-weapon-proficiency';
const expected={cleric:[2,-3,4],druid:[2,-4,5],fighter:[4,-2,3],paladin:[3,-2,3],ranger:[3,-2,3],'magic-user':[1,-5,6],illusionist:[1,-5,6],thief:[2,-3,4],assassin:[3,-2,4],monk:[1,-3,2]} as const;
for(const [id,[initial,penalty,interval]] of Object.entries(expected)){const at1=coreWeaponProficiencySlots(id as keyof typeof expected,1);assert.deepEqual([at1.totalSlots,at1.nonProficiencyPenalty],[initial,penalty]);assert.equal(coreWeaponProficiencySlots(id as keyof typeof expected,interval+1).totalSlots,initial+1);}
assert.equal(coreWeaponProficiencySlots('cleric',5).totalSlots,3);assert.equal(coreWeaponProficiencySlots('cleric',9).totalSlots,4);assert.equal(coreWeaponProficiencySlots('fighter',4).totalSlots,5);
assert.throws(()=>validateCoreWeaponSelections({classId:'fighter',level:1,weaponIds:['sword','sword']}),/same slot twice/);
assert.throws(()=>validateCoreWeaponSelections({classId:'monk',level:1,weaponIds:['a','b']}),/for 1 slots/);
const partial=validateCoreWeaponSelections({classId:'fighter',level:1,weaponIds:['long-sword']});assert.equal(partial.status,'incomplete');assert.equal(partial.unfilledSlots,3);
console.log('PASS: all ten PHB37 core initial slots, penalties and added-slot intervals; duplicate/overflow guards; weapon legality remains a separate required pack.');
