import assert from 'node:assert/strict';
import { evaluateCoreEquipmentLegality as check } from '../src/character/engine/core-equipment-legality';
import { coreClassEquipmentRules, coreEquipmentSources } from '../src/character/rules/core-equipment-legality';

assert.deepEqual(Object.keys(coreClassEquipmentRules).sort(), ['assassin','cleric','druid','fighter','illusionist','magic-user','monk','paladin','ranger','thief'].sort());
assert.equal(coreEquipmentSources['phb:19:class-equipment-table'].printedPages[0],19);
assert.equal(coreEquipmentSources['phb:19:class-equipment-table'].pdfPages[0],20);
assert.match(coreEquipmentSources['phb:19:class-equipment-table'].sha256,/^[A-F0-9]{64}$/);

const weapon=(family:any, extra:Record<string,unknown>={})=>({kind:'weapon' as const,id:String(family),family,...extra});
const armor=(family:any)=>({kind:'armor' as const,id:`armor-${family}`,family});
const shield=(material:any)=>({kind:'shield' as const,id:`shield-${material}`,material});

for(const classId of ['fighter','paladin','ranger'] as const) {
  assert.equal(check({classId,item:armor('other')}).verdict,'class-permitted');
  assert.equal(check({classId,item:shield('metal')}).verdict,'class-permitted');
  assert.equal(check({classId,item:weapon('sword-long',{lengthFeet:4}),character:{heightFeet:6,bodyWeightPounds:180}}).verdict,'class-permitted');
}
assert.equal(check({classId:'cleric',item:weapon('mace')}).verdict,'class-permitted');
assert.equal(check({classId:'cleric',item:weapon('sword-long')}).verdict,'prohibited');
const claimedClericException=check({classId:'cleric',item:weapon('sword-long'),context:{religiousOrSettingExceptionClaimed:true}});
assert.equal(claimedClericException.verdict,'needs-dm');
assert.equal(claimedClericException.rawBaseline,'prohibited');

assert.equal(check({classId:'druid',item:armor('leather')}).verdict,'class-permitted');
assert.equal(check({classId:'druid',item:armor('other')}).verdict,'prohibited');
assert.equal(check({classId:'druid',item:shield('wood')}).verdict,'class-permitted');
assert.equal(check({classId:'druid',item:shield('metal')}).verdict,'prohibited');
assert.equal(check({classId:'druid',item:weapon('scimitar')}).verdict,'class-permitted');
assert.equal(check({classId:'druid',item:weapon('sword-long')}).verdict,'prohibited');

for(const classId of ['magic-user','illusionist'] as const) {
  assert.equal(check({classId,item:armor('leather')}).verdict,'prohibited');
  assert.equal(check({classId,item:shield('wood')}).verdict,'prohibited');
  assert.equal(check({classId,item:weapon('dagger')}).verdict,'class-permitted');
  assert.equal(check({classId,item:weapon('sling')}).verdict,'prohibited');
}
assert.equal(check({classId:'thief',item:armor('leather')}).verdict,'class-permitted');
assert.equal(check({classId:'thief',item:shield('wood')}).verdict,'prohibited');
for(const sword of ['sword-short','sword-broad','sword-long'] as const) assert.equal(check({classId:'thief',item:weapon(sword)}).verdict,'class-permitted');
for(const sword of ['sword-bastard','sword-two-handed'] as const) assert.equal(check({classId:'thief',item:weapon(sword)}).verdict,'prohibited');

assert.equal(check({classId:'assassin',item:armor('leather')}).verdict,'class-permitted');
assert.equal(check({classId:'assassin',item:shield('wood')}).verdict,'class-permitted');
assert.equal(check({classId:'assassin',item:shield('metal')}).verdict,'class-permitted');
assert.equal(check({classId:'assassin',item:weapon('sword-long'),character:{heightFeet:6,bodyWeightPounds:180}}).verdict,'class-permitted');
assert.equal(check({classId:'monk',item:armor('leather')}).verdict,'prohibited');
assert.equal(check({classId:'monk',item:shield('wood')}).verdict,'prohibited');
assert.equal(check({classId:'monk',item:weapon('bo-stick')}).verdict,'class-permitted');
assert.equal(check({classId:'monk',item:weapon('sword-long')}).verdict,'prohibited');

assert.equal(check({classId:'fighter',item:weapon('longbow'),character:{heightFeet:4.9,bodyWeightPounds:150}}).verdict,'prohibited');
assert.equal(check({classId:'fighter',item:weapon('longbow'),character:{bodyWeightPounds:150}}).verdict,'needs-dm');
assert.equal(check({classId:'fighter',item:weapon('sword-two-handed'),character:{heightFeet:6,bodyWeightPounds:99}}).verdict,'prohibited');
assert.equal(check({classId:'assassin',item:weapon('sword-two-handed'),character:{heightFeet:4,bodyWeightPounds:80}}).verdict,'class-permitted');
assert.equal(check({classId:'ranger',item:weapon('pole-arm'),character:{heightFeet:6,bodyWeightPounds:99}}).verdict,'needs-dm');
assert.equal(check({classId:'ranger',item:weapon('pole-arm',{weightGpEquivalent:250}),character:{heightFeet:6,bodyWeightPounds:99}}).verdict,'prohibited');

assert.equal(check({classId:'fighter',item:weapon('pike',{lengthFeet:18,weightGpEquivalent:180}),character:{heightFeet:6,bodyWeightPounds:180},context:{environment:'dungeon',massedPikeSupport:true}}).verdict,'prohibited');
assert.equal(check({classId:'fighter',item:weapon('pike',{lengthFeet:18,weightGpEquivalent:180}),character:{heightFeet:6,bodyWeightPounds:180},context:{environment:'outdoors',massedPikeSupport:'unknown'}}).verdict,'needs-dm');
assert.equal(check({classId:'fighter',item:weapon('pike',{lengthFeet:18,weightGpEquivalent:180}),character:{heightFeet:6,bodyWeightPounds:180},context:{environment:'outdoors',massedPikeSupport:true}}).verdict,'class-permitted');

const uncheckedMagic=check({classId:'cleric',item:{...weapon('mace'),magical:true}});
assert.equal(uncheckedMagic.verdict,'needs-dm');
assert.equal(check({classId:'cleric',item:{...weapon('mace'),magical:true,itemSpecificRestriction:'compatible'}}).verdict,'class-permitted');
assert.equal(check({classId:'fighter',item:{...weapon('sword-long'),magical:true,itemSpecificRestriction:'proscribed'},character:{heightFeet:6,bodyWeightPounds:180}}).verdict,'prohibited');
assert.equal(check({classId:'druid',item:armor('unknown')}).verdict,'needs-dm');
assert.equal(check({classId:'monk',item:weapon('unknown')}).verdict,'needs-dm');
assert.throws(()=>check({classId:'fighter',item:weapon('longbow'),character:{heightFeet:0}}),/positive finite/);

console.log('PASS: ten core classes; armor/shield/weapon permissions; cleric override audit; druid material limits; thief swords; PHB size/weight limits; magical-item proscription; DMG pike context.');
