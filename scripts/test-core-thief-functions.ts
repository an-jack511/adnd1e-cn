import assert from 'node:assert/strict';
import {coreBackstabView,coreThiefFunctions} from '../src/character/engine/core-thief-functions';

const at=(classId:'thief'|'assassin'|'monk',level:number,raceId:'human'|'dwarf'|'elf'|'gnome'|'half-elf'|'halfling'|'half-orc',dexterity:number)=>Object.fromEntries(coreThiefFunctions({classId,level,raceId,dexterity}).map(item=>[item.id,item]));

let skills=at('thief',1,'human',9);
assert.deepEqual([skills['pick-pockets'].base,skills['open-locks'].base,skills['find-remove-traps'].base,skills['move-silently'].base,skills['hide-in-shadows'].base,skills['hear-noise'].base,skills['climb-walls'].base,skills['read-languages'].base],[30,25,20,15,10,10,85,null]);
assert.deepEqual([skills['pick-pockets'].target,skills['open-locks'].target,skills['move-silently'].target,skills['hide-in-shadows'].target],[15,15,-5,0]);

skills=at('thief',1,'halfling',18);
assert.deepEqual([skills['pick-pockets'].target,skills['open-locks'].target,skills['find-remove-traps'].target,skills['move-silently'].target,skills['hide-in-shadows'].target,skills['hear-noise'].target,skills['climb-walls'].target,skills['read-languages'].target],[45,45,30,35,35,15,70,null]);
skills=at('thief',4,'halfling',18);
assert.equal(skills['read-languages'].target,15);

skills=at('thief',4,'elf',16);
assert.equal(skills['read-languages'].target,20);
assert.equal(skills['pick-pockets'].target,50);
assert.equal(skills['hide-in-shadows'].target,35);

skills=at('assassin',3,'human',13);
assert.equal(skills['pick-pockets'].base,30,'assassin level3 uses thief level1');
assert.equal(skills['read-languages'].base,null);
skills=at('assassin',2,'human',13);
assert.equal(skills['pick-pockets'].base,null,'assassin levels 1–2 have no thief-function level');

skills=at('monk',1,'human',15);
assert.equal(skills['pick-pockets'].target,null,'monk has no pick pockets');
assert.equal(skills['open-locks'].target,25);
assert.equal(skills['move-silently'].target,15);

assert.deepEqual(coreBackstabView(1),{multiplier:2,attackBonus:4,sourceIds:['phb:26-27:thief-functions']});
assert.equal(coreBackstabView(5).multiplier,3);
assert.equal(coreBackstabView(13).multiplier,5);
assert.throws(()=>coreThiefFunctions({classId:'thief',level:1,raceId:'human',dexterity:8}),/DEX 9–18/);
assert.throws(()=>coreThiefFunctions({classId:'thief',level:18,raceId:'human',dexterity:13}),/1–17级/);
console.log('PASS: PHB thief function rows, DEX/racial adjustments, assassin/monk inheritance, backstab and no-roll player targets.');
