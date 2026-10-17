import assert from 'node:assert/strict';
import {newCoreAdvancement,awardAdventureXp,openAdvancementCandidate,attachTrainingPlan,payTraining,startTraining,recordTrainingSegment,awardCoreLevel} from '../src/character/workflows/core-advancement';
import {adoptCoreOverrunTrainingBasis,recordedCoreAdventureAssessments} from '../src/character/workflows/core-overrun-training';
let state=newCoreAdvancement({id:'overrun',classId:'fighter',level:1,xp:0,constitution:10,levelCap:'unlimited'});
state=awardAdventureXp(state,{id:'first',xp:1000,rating:'E',sourceIds:['session:first']});
state=awardAdventureXp(state,{id:'large',xp:13000,rating:'S',sourceIds:['session:large']});
const adoption={interpretation:'reuse-recorded-adventure-ratings' as const,assessmentIds:['first','large'],actorId:'dm',reason:'Explicit campaign adoption for this already accepted overrun; not unique RAW'};
assert.throws(()=>adoptCoreOverrunTrainingBasis(state,adoption),/no unconsumed/);
for(const target of [2,3,4]){
  if(target>2){
    const before=structuredClone(state);
    assert.throws(()=>openAdvancementCandidate(state),/ratings/);
    assert.throws(()=>awardAdventureXp(state,{id:`fake-zero-${target}`,xp:0,rating:'E',sourceIds:['fake']}),/blocked/);
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,{...adoption,assessmentIds:[]}),/distinct/);
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,{...adoption,assessmentIds:['first','first']}),/distinct/);
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,{...adoption,assessmentIds:['invented']}),/missing or ambiguous/);
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,{...adoption,assessmentIds:['first']}),/full previous-course/);
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,{...adoption,reason:' '}),/Explicit campaign/);
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,{...adoption,interpretation:'automatic-raw' as any}),/Explicit campaign/);
    assert.deepEqual(state,before);
    state=adoptCoreOverrunTrainingBasis(state,adoption);
    assert.equal(state.xp,14000);assert.equal(state.level,target-1);
    assert.deepEqual(state.assessments,before.history.filter(entry=>entry.type==='experience.awarded').map(entry=>({id:entry.id,xp:entry.xp,rating:entry.rating,sourceIds:entry.sourceIds})));
    assert.equal(state.history.at(-1)?.ruleStatus,'campaign-adoption-not-unique-raw');
    assert.throws(()=>adoptCoreOverrunTrainingBasis(state,adoption),/no unconsumed/);
  }
  state=openAdvancementCandidate(state);
  const fee=(target-1)*1500*3/2*200;
  state=attachTrainingPlan(state,{route:'tutor',acceptedCostCp:fee});
  state=payTraining(state,{paymentId:`payment-${target}`,amountCp:fee});state=startTraining(state);
  state=recordTrainingSegment(state,{id:`course-${target}`,weeksNumerator:3,weeksDenominator:2,dmConfirmedContinuous:true});
  state=awardCoreLevel(state,{actorId:'dm',hpRolls:[5]});
  assert.equal(state.level,target);assert.equal(state.xp,14000);
}
assert.equal(state.history.filter(entry=>entry.type==='experience.awarded').length,2);
assert.equal(state.history.filter(entry=>entry.type==='advancement.overrun-basis-adopted').length,2);
assert.equal(recordedCoreAdventureAssessments(state).length,2);
assert.throws(()=>adoptCoreOverrunTrainingBasis(state,adoption),/does not establish/);
assert.throws(()=>adoptCoreOverrunTrainingBasis({...state,xp:18001,history:[]},adoption),/actual prior/);
assert.throws(()=>recordedCoreAdventureAssessments({...state,history:[{type:'experience.awarded',id:'bad',xp:1,rating:'modern',sourceIds:[]}]}),/malformed/);
console.log('PASS: accepted 14000 XP retains exact XP through three separate paid courses; explicit historical-rating adoption, no invented awards, no implicit RAW policy, failure immutability and terminal eligibility guards.');
