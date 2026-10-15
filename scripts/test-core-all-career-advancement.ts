import assert from 'node:assert/strict';
import { coreClassIds, getCoreProgressionRow } from '../src/character/rules/core-progression';
import { newCoreAdvancement, awardAdventureXp, openAdvancementCandidate, acceptAdvancementGate, attachTrainingPlan, payTraining, startTraining, recordTrainingSegment, awardCoreLevel } from '../src/character/workflows/core-advancement';

for(const classId of coreClassIds){
  if(classId==='bard')continue; // Bard is a staged career, covered by its own path tests.
  const second=getCoreProgressionRow(classId,2);if(second.status==='unknown')throw new Error(second.reason);
  let state=newCoreAdvancement({id:`career:${classId}`,classId,level:1,xp:0,constitution:14,levelCap:'unlimited'});
  state=awardAdventureXp(state,{id:'first-adventure',xp:second.row.xpMin-1,rating:'E',sourceIds:['session:first']});
  assert.throws(()=>openAdvancementCandidate(state),/XP|门槛/);
  state=awardAdventureXp(state,{id:'second-adventure',xp:1,rating:'S',sourceIds:['session:second']});
  state=openAdvancementCandidate(state);assert.equal(state.level,1);
  if(state.status==='eligible-needs-dm')state=acceptAdvancementGate(state,{actorId:'dm',reason:'Class-specific qualification reviewed'});
  state=attachTrainingPlan(state,{route:'tutor',acceptedCostCp:450000});
  assert.equal(state.candidate!.training!.weeksNumerator,3);assert.equal(state.candidate!.training!.weeksDenominator,2);
  assert.throws(()=>startTraining(state),/paid/);
  state=payTraining(state,{paymentId:'paid',amountCp:450000});state=startTraining(state);
  assert.throws(()=>awardAdventureXp(state,{id:'blocked',xp:1,rating:'E',sourceIds:['session:blocked']}),/blocked/);
  assert.throws(()=>recordTrainingSegment(state,{id:'unconfirmed',weeksNumerator:3,weeksDenominator:2,dmConfirmedContinuous:false}),/DM/);
  state=recordTrainingSegment(state,{id:'half-week',weeksNumerator:1,weeksDenominator:2,dmConfirmedContinuous:true});
  assert.equal(state.status,'training-active');assert.throws(()=>awardCoreLevel(state,{actorId:'dm',hpRolls:[1]}),/not complete/);
  state=recordTrainingSegment(state,{id:'full-week',weeksNumerator:1,weeksDenominator:1,dmConfirmedContinuous:true});
  state=awardCoreLevel(state,{actorId:'dm',hpRolls:[1]});
  assert.equal(state.level,2);assert.equal(state.status,'adventuring');
  assert.equal((state.history.at(-1)!.hp as {actualAward:number}).actualAward,1,`${classId} gains one new die at level two with CON14`);
  assert.equal(state.xp,second.row.xpMin);assert.equal(state.candidate,null);assert.equal(state.assessments.length,0);
}
console.log('PASS: ten ordinary core careers, XP boundary, mixed-rating fractional training, payment/continuity/XP gates and level-two HP award. Creation, class ability growth, wallet transactions and browser paths have separate acceptance scopes.');
