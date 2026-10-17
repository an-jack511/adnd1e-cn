import assert from 'node:assert/strict';
import {resolveCoreTrainingStage} from '../src/character/engine/core-training-stage';
import {newCoreAdvancement,awardAdventureXp,openAdvancementCandidate,acceptAdvancementGate,attachTrainingPlan,attachNameLevelTrainingPlan} from '../src/character/workflows/core-advancement';
import {getCoreProgressionRow,type InitialCoreClassId} from '../src/character/rules/core-progression';
import {nameLevelWeeklyCostGp} from '../src/character/rules/core-training';
import {resolveDisplayRuleSource} from '../src/character/rules/source-directory';
// Golden title/level pairings: DMG86 title list + full PHB page images checked 2026-10-16.
const cases:[InitialCoreClassId,number,string,number,keyof typeof nameLevelWeeklyCostGp][]=[
  ['cleric',9,'High Priest',20,'cleric'],['druid',12,'Druid',21,'cleric'],
  ['fighter',9,'Lord',22,'fighter'],['paladin',9,'Paladin',24,'fighter'],
  ['ranger',10,'Ranger Lord',25,'fighter'],['magic-user',11,'Wizard',25,'magic-user'],
  ['illusionist',10,'Illusionist',26,'magic-user'],['thief',10,'Master Thief',27,'thief'],
  ['assassin',9,'Assassin',30,'thief'],['monk',7,'Superior Master',31,'cleric'],
];
function candidate(classId:InitialCoreClassId,level:number){
  const row=getCoreProgressionRow(classId,level+1);if(row.status==='unknown')throw new Error(row.reason);
  let state=newCoreAdvancement({id:`${classId}-${level}`,classId,level,xp:row.row.xpMin-1,constitution:10,levelCap:'unlimited'});
  state=awardAdventureXp(state,{id:'actual-adventure',xp:1,rating:'S',sourceIds:['session:test']});
  state=openAdvancementCandidate(state);
  return state.status==='eligible-needs-dm'?acceptAdvancementGate(state,{actorId:'dm',reason:'Separate class advancement requirements confirmed for test'}):state;
}
for(const [classId,level,title,page,family] of cases){
  const before=resolveCoreTrainingStage(classId,level-1),at=resolveCoreTrainingStage(classId,level);
  assert.equal(before.stage,'below-name');assert.equal(at.stage,'name-level');
  assert.equal(at.attainedNameLevel,level);assert.equal(at.title,title);
  assert.equal(resolveCoreTrainingStage(classId,level+1).stage,'name-level');
  assert(at.sourceIds.some(id=>resolveDisplayRuleSource(id)?.printedPages.includes(page)));
  let low=candidate(classId,level-1);const old=structuredClone(low);
  assert.throws(()=>attachNameLevelTrainingPlan(low,{costFamily:family,actorId:'dm',reason:'A reason must not bypass the attained-stage rule',acceptedCostCp:1}),/尚未达到名号/);
  assert.deepEqual(low,old);
  low=attachTrainingPlan(low,{route:'tutor',acceptedCostCp:(level-1)*1500*2*200});
  assert.equal(low.candidate?.training?.regime,'below-name');
  let named=candidate(classId,level);
  assert.throws(()=>attachTrainingPlan(named,{route:'tutor',acceptedCostCp:1,costDecision:{actorId:'dm',reason:'Fee reason cannot change stage'}}),/已达到名号/);
  assert.throws(()=>attachTrainingPlan(named,{route:'self',acceptedCostCp:1}),/已达到名号/);
  named=attachNameLevelTrainingPlan(named,{costFamily:family,actorId:'dm',reason:at.printedCostFamily?'Printed base class cost':'Explicit DM adoption for the unlisted profession, not a certified printed cost mapping',acceptedCostCp:level*nameLevelWeeklyCostGp[family]*2*200});
  assert.equal(named.candidate?.training?.weeksNumerator,2,'Named self-training uses score S=2 weeks, not four');
  assert.equal(named.candidate?.training?.regime,'name-level');
  if(at.printedCostFamily!==null){
    const wrong=family==='fighter'?'cleric':'fighter';
    assert.throws(()=>attachNameLevelTrainingPlan(candidate(classId,level),{costFamily:wrong,actorId:'dm',reason:'An ordinary reason cannot silently rewrite the printed family',acceptedCostCp:1}),/does not match/);
  }else assert.equal(at.printedCostFamily,null,'No invented exact printed cost family for subclasses or monk');
}
assert.throws(()=>resolveCoreTrainingStage('bard' as any,1),/own procedure/);
assert.throws(()=>resolveCoreTrainingStage('cavalier' as any,9),/own procedure/);
assert.throws(()=>resolveCoreTrainingStage('fighter',1.5),/positive integer/);
assert.throws(()=>resolveCoreTrainingStage('fighter',0),/positive integer/);
console.log('PASS: all ten DMG title/PHB level boundaries, attained-current-level routing, no reason-based stage bypass, four printed family guards and explicit unlisted-family interpretation boundary.');
