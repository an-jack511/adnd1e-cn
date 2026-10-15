import assert from 'node:assert/strict';
import { coreEligibilityPack as pack, coreAbilityIds, coreRaceIds, coreClassIds,
  type CorePredicate, type CoreLevelLimit, type CoreRaceId, type CoreClassId } from '../src/character/rules/core-eligibility';

let checks = 0;
function equal(actual: unknown, expected: unknown, message: string) {
  assert.deepEqual(actual, expected, message); checks++;
}
function ok(value: unknown, message: string) { assert.ok(value, message); checks++; }
const race = (id:CoreRaceId) => pack.races.find(r => r.id === id)!;
const cls = (id:CoreClassId) => pack.classes.find(c => c.id === id)!;

// Independent fixtures transcribed from the page images, not generated from pack.
const expectedAccess: Record<CoreRaceId,string[]> = {
  dwarf:['fighter','thief','assassin'], elf:['fighter','magic-user','thief','assassin'],
  gnome:['fighter','illusionist','thief','assassin'],
  'half-elf':['cleric','druid','fighter','ranger','magic-user','thief','assassin'],
  halfling:['fighter','thief'], 'half-orc':['cleric','fighter','thief','assassin'],
  human:['cleric','druid','fighter','paladin','ranger','magic-user','illusionist','thief','assassin','monk'],
};
equal(pack.races.map(r=>r.id),['dwarf','elf','gnome','half-elf','halfling','half-orc','human'],'seven core race IDs');
equal(pack.classes.map(c=>c.id),['cleric','druid','fighter','paladin','ranger','magic-user','illusionist','thief','assassin','monk','bard'],'eleven distinct careers');
equal(pack.version,'1.0.0','fixed reviewed pack version');
for (const id of coreRaceIds) {
  equal(coreClassIds.filter(c=>race(id).pcClasses[c] === true),expectedAccess[id],`PHB13 PC row ${id}`);
  equal(race(id).pcClasses.bard,id === 'human' || id === 'half-elf' ? 'needs-dm' : false,`PHB117 special bard ${id}`);
}
const expectedMinima = {
  cleric:{WIS:9}, druid:{WIS:12,CHA:15}, fighter:{STR:9,CON:7},
  paladin:{STR:12,INT:9,WIS:13,CON:9,CHA:17}, ranger:{STR:13,INT:13,WIS:14,CON:14},
  'magic-user':{INT:9,DEX:6}, illusionist:{INT:15,DEX:16}, thief:{DEX:9},
  assassin:{STR:12,INT:11,DEX:12}, monk:{STR:15,WIS:15,DEX:15,CON:11},
  bard:{STR:15,INT:12,WIS:15,DEX:15,CON:10,CHA:15},
};
for (const id of coreClassIds) equal(cls(id).minimumAbilities,expectedMinima[id],`entry minima ${id}`);
equal(cls('thief').alignmentIds,['NG','LN','TN','CN','LE','NE','CE'],'PHB27 rare NG thief preserved');
equal(cls('cleric').alignmentIds.includes('TN'),false,'cleric excludes true neutral');
equal(cls('druid').alignmentIds,['TN'],'druid is true neutral');
equal(cls('paladin').alignmentIds,['LG'],'paladin LG');
equal(cls('ranger').alignmentIds,['LG','NG','CG'],'ranger good axis');
equal(cls('assassin').alignmentIds,['LE','NE','CE'],'assassin evil axis');
equal(cls('monk').alignmentIds,['LG','LN','LE'],'monk lawful axis');
equal(cls('bard').freshLevelOneEntry,false,'bard is not a fresh level1 class');
equal(pack.bardPath.raceIds,['human','half-elf'],'bard is not human-only ordinary dual-class');
equal(pack.bardPath.fighterStage,{classId:'fighter',minimumLevel:5,maximumLevel:7,mustRemainExclusive:true},'fighter switch window inclusive5–7');
equal(pack.bardPath.thiefStage,{classId:'thief',minimumLevel:5,maximumLevel:8},'thief switch window inclusive5–8');
equal(pack.bardPath.applyOrdinaryDualMinima,null,'no guessed bard dual-class override');

// Entire Race TableIII: min, maleMax, femaleMax in STR/INT/WIS/DEX/CON/CHA order.
// The conflicted half-orc DEX max is deliberately unknown, assertions checked below.
const expectedRanges:Record<CoreRaceId,(number|null)[][]> = {
  dwarf:[[8,18,17],[3,18,18],[3,18,18],[3,17,17],[12,19,19],[3,16,16]],
  elf:[[3,18,16],[8,18,18],[3,18,18],[7,19,19],[6,18,18],[8,18,18]],
  gnome:[[6,18,15],[7,18,18],[3,18,18],[3,18,18],[8,18,18],[3,18,18]],
  'half-elf':[[3,18,17],[4,18,18],[3,18,18],[6,18,18],[6,18,18],[3,18,18]],
  halfling:[[6,17,14],[6,18,18],[3,17,17],[8,18,18],[10,19,19],[3,18,18]],
  'half-orc':[[6,18,18],[3,17,17],[3,14,14],[3,null,null],[13,19,19],[3,12,12]],
  human:[[3,18,18],[3,18,18],[3,18,18],[3,18,18],[3,18,18],[3,18,18]],
};
const expectedAdjustments:Record<CoreRaceId,number[]> = {
  dwarf:[0,0,0,0,1,-1],elf:[0,0,0,1,-1,0],gnome:[0,0,0,0,0,0],
  'half-elf':[0,0,0,0,0,0],halfling:[-1,0,0,1,0,0],'half-orc':[1,0,0,0,1,-2],human:[0,0,0,0,0,0],
};
for(const id of coreRaceIds){
  equal(coreAbilityIds.map(a=>{const r=race(id).abilityRanges[a];return [r.min,r.maleMax,r.femaleMax];}),expectedRanges[id],`PHB15 ranges ${id}`);
  equal(coreAbilityIds.map(a=>race(id).abilityAdjustments[a]),expectedAdjustments[id],`PHB14/17 deltas ${id}`);
}
equal(race('dwarf').contextualCharisma?.preserveUnadjusted,true,'dwarf original CHA retained');
equal(race('half-orc').abilityRanges.CHA.scope,'non-own-race-interactions','half-orc CHA cap is contextual');
equal(race('half-orc').contextualCharisma?.unaffectedNpcSpeciesIds,['orc','half-orc'],'orc NPCs also retain original CHA');
equal(race('half-orc').abilityRanges.DEX.verification,'P','conflicted DEX is not certified');
equal(pack.pendingRules.find(p=>p.id==='half-orc-dex-maximum')?.alternatives.map(a=>a.value),[14,17],'both original DEX claims');
const expectedExceptional:Record<CoreRaceId,(number|null)[]> = {
  dwarf:[99,null],elf:[75,null],gnome:[50,null],'half-elf':[90,null],halfling:[null,null],'half-orc':[99,75],human:[100,50],
};
for(const id of coreRaceIds)equal([race(id).exceptionalStrength.maleMaxPercent,race(id).exceptionalStrength.femaleMaxPercent],expectedExceptional[id],`PHB9 exceptional STR ${id}`);

// Test-only interpreter for declarative cap predicates; this is not the main engine.
function matches(p:CorePredicate,s:Record<string,number>,subrace:string|null):boolean|null {
  if('all' in p){const result=p.all.map(x=>matches(x,s,subrace));return result.includes(false)?false:result.includes(null)?null:true;}
  if('any' in p){const result=p.any.map(x=>matches(x,s,subrace));return result.includes(true)?true:result.includes(null)?null:false;}
  if('subraceId' in p)return subrace === null ? null : p.subraceId === subrace;
  const v=s[p.ability]; if(v === undefined)return null;
  return p.op==='lt'?v<p.value:p.op==='eq'?v===p.value:v>=p.value;
}
function cap(l:CoreLevelLimit,s:Record<string,number>={},subrace:string|null=null):number|null {
  if(l.kind==='fixed')return l.value;
  if(l.kind!=='conditional')return null;
  for(const c of l.cases){const m=matches(c.when,s,subrace);if(m===null)return null;if(m)return c.value;}
  return l.otherwise;
}
for(const [r,c,a,expected] of [
  ['dwarf','fighter','STR',[7,8,9]],['elf','fighter','STR',[5,6,7]],
  ['half-elf','fighter','STR',[6,7,8]],['half-elf','ranger','STR',[6,7,8]],
  ['elf','magic-user','INT',[9,10,11]],['half-elf','magic-user','INT',[6,7,8]],
  ['half-orc','thief','DEX',[6,7,8]],
] as const){
  equal([16,17,18].map(score=>cap(race(r).classLevelLimits[c],{[a]:score})),expected,`PHB14 footnote ${r}/${c}`);
  equal(cap(race(r).classLevelLimits[c]),null,`unknown ${a} does not select highest cap`);
}
equal([17,18].map(STR=>cap(race('gnome').classLevelLimits.fighter,{STR})),[5,6],'gnome fighter STR18 threshold');
equal([[16,18],[18,16],[17,17],[18,18]].map(([INT,DEX])=>cap(race('gnome').classLevelLimits.illusionist,{INT,DEX})),[5,5,6,7],'gnome illusionist two-attribute gate');
equal([[17,18],[18,17]].map(([INT,DEX])=>cap(race('gnome').classLevelLimits.illusionist,{INT,DEX})),[null,null],'mixed gnome attributes require an adopted interpretation');
equal(cap(race('halfling').classLevelLimits.fighter,{STR:18},'hairfoot'),4,'hairfoot never gains footnote18 benefit');
equal(cap(race('halfling').classLevelLimits.fighter,{STR:17},'tallfellow'),5,'tallfellow17');
equal(cap(race('halfling').classLevelLimits.fighter,{STR:18},'tallfellow'),6,'tallfellow18 conditional, not a created18');
equal(cap(race('halfling').classLevelLimits.fighter,{STR:18},'stout'),5,'stout18');
equal(cap(race('halfling').classLevelLimits.fighter,{STR:18}),null,'unknown subrace not promoted to highest cap');
equal(race('half-elf').classLevelLimits.cleric.value,5,'half-elf cleric fixed5');
equal(race('half-orc').classLevelLimits.cleric.value,4,'half-orc cleric fixed4');
equal(race('half-orc').classLevelLimits.fighter.value,10,'half-orc fighter10');
equal(['dwarf','elf','gnome','half-elf'].map(id=>race(id as CoreRaceId).classLevelLimits.assassin.value),[9,10,8,11],'racial assassin caps');
for(const id of coreRaceIds)equal(race(id).classLevelLimits.thief.kind,id==='half-orc'?'conditional':'unlimited',`thief racial cap ${id}`);
equal(cls('assassin').intrinsicLevelLimit.kind,'unknown','assassin summary conflict unresolved');
equal(cls('assassin').intrinsicLevelLimit.value,null,'assassin unknown not0');
equal(pack.pendingRules.find(p=>p.id==='assassin-intrinsic-maximum')?.alternatives.map(a=>a.value),[14,15],'both assassin max claims');
equal(cls('druid').intrinsicLevelLimit.value,14,'druid intrinsic cap14 despite racial U');
equal(cls('monk').intrinsicLevelLimit.value,17,'monk intrinsic cap17');
equal(cls('bard').intrinsicLevelLimit.value,23,'bard intrinsic cap23');
equal(cls('druid').progressionGates.map(g=>[g.fromLevel,g.seats]),[[12,9],[13,3],[14,1]],'druid limited seats');
equal(cls('monk').progressionGates.map(g=>[g.fromLevel,g.throughLevel,g.seats]),[[8,8,3],[9,17,1]],'monk limited seats');
equal(pack.npcOnlyClassLimits.map(n=>[n.raceId,n.classId,n.level]),[['dwarf','cleric',8],['elf','cleric',7],['gnome','cleric',7],['halfling','druid',6]],'parentheses are NPC only');
for(const n of pack.npcOnlyClassLimits)equal(race(n.raceId).pcClasses[n.classId],false,`NPC ${n.id} cannot enable PC`);

const expectedCombos:Record<string,string[]>={
  'cleric/fighter':['half-elf','half-orc'],'cleric/fighter/magic-user':['half-elf'],
  'cleric/ranger':['half-elf'],'cleric/magic-user':['half-elf'],'cleric/thief':['half-orc'],'cleric/assassin':['half-orc'],
  'fighter/magic-user':['elf','half-elf'],'fighter/illusionist':['gnome'],
  'fighter/thief':['dwarf','elf','gnome','half-elf','halfling','half-orc'],'fighter/assassin':['half-orc'],
  'fighter/magic-user/thief':['elf','half-elf'],'magic-user/thief':['elf','half-elf'],
  'illusionist/thief':['gnome'],'fighter/illusionist/thief':['gnome'],
};
equal(Object.fromEntries(pack.multiClassCombinations.map(c=>[c.classIds.join('/'),c.raceIds])),expectedCombos,'complete explicit core combinations');
for(const c of pack.multiClassCombinations){
  for(const r of c.raceIds)for(const id of c.classIds)equal(race(r).pcClasses[id],true,`component access ${c.id}/${r}/${id}`);
  if(c.classIds.includes('cleric')&&c.raceIds.includes('half-elf'))equal(c.additionalMinima.map(m=>[m.raceId,m.ability,m.min]),[['half-elf','WIS',13]],'half-elf cleric combination WIS13 not9');
}
equal(pack.combinationPolicy.humanSimultaneous,false,'human cannot take simultaneous multiclass');
equal(pack.combinationPolicy.unlistedCoreCombination,false,'no unrestricted Cartesian product');
equal(pack.dualClass.raceIds,['human'],'ordinary sequential dual-class human only');
equal([pack.dualClass.oldPrincipalMinimum,pack.dualClass.newPrincipalMinimum],[15,17],'old/new principal threshold');
equal(pack.dualClass.newClassMustExceedOldLevel,true,'equal levels do not unlock dual-class benefits');
equal(pack.lowAbilityRestrictions.map(r=>[r.ability,r.maximum,r.onlyClassId]),[
  ['STR',5,'magic-user'],['INT',5,'fighter'],['WIS',5,'thief'],['DEX',5,'cleric'],['CON',5,'illusionist'],['CHA',5,'assassin'],
],'six independent low-score restrictions');

const sourceIds=new Set(pack.sources.map(s=>s.id));
equal(sourceIds.size,pack.sources.length,'unique source IDs');
const pendingIds=new Set(pack.pendingRules.map(p=>p.id));
equal(pendingIds.size,pack.pendingRules.length,'unique pending IDs');
for(const source of pack.sources){
  ok(Number.isInteger(source.printedPage)&&source.printedPage>0,`${source.id} printed integer`);
  equal(source.pdfIndex,source.pdfPage-1,`${source.id} PDF/index mapping`);
  equal(source.pdfPage,source.printedPage+1,`${source.id} verified early-book mapping only`);
  ok(source.scope.length>0,`${source.id} scoped certification`);
}
function inspect(value:unknown,path='pack'){
  if(typeof value==='number')ok(Number.isSafeInteger(value),`${path} checkable integer`);
  if(Array.isArray(value)){value.forEach((v,i)=>inspect(v,`${path}[${i}]`));return;}
  if(value===null||typeof value!=='object')return;
  const record=value as Record<string,unknown>;
  if(Array.isArray(record.sourceIds))for(const id of record.sourceIds)ok(sourceIds.has(id as string),`${path} source ref ${id}`);
  if(Array.isArray(record.pendingIds))for(const id of record.pendingIds)ok(pendingIds.has(id as string),`${path} pending ref ${id}`);
  if(record.kind==='ineligible'||record.kind==='unknown'||record.kind==='unlimited')equal(record.value,null,`${path} tagged null not numeric0`);
  if(record.verification==='P')ok(record.resolution==='needs-dm'||record.kind==='unknown'||Array.isArray(record.pendingIds),`${path} explicit pending handling`);
  Object.entries(record).forEach(([k,v])=>inspect(v,`${path}.${k}`));
}
inspect(pack);
equal(JSON.parse(JSON.stringify(pack)),pack,'JSON portable data, no Infinity/functions/undefined');
console.log(`Core eligibility data: ${checks} assertions passed. Original-page fixtures and references checked; no website, admission engine, git operation or full build tested.`);
