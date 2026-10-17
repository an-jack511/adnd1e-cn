import assert from 'node:assert/strict';
import {newCoreAdvancement,awardAdventureXp,openAdvancementCandidate,attachTrainingPlan,payTraining,startTraining,recordTrainingSegment} from '../src/character/workflows/core-advancement';
import {inspectCoreDatedTrainingCourse} from '../src/character/workflows/core-dated-training';
import {newCoreCalendar,scheduleCoreActivity,endCoreCalendarActivity,type CoreCampaignCalendar} from '../src/character/workflows/core-calendar';
import {recordCoreTrainingLocationTransition} from '../src/character/workflows/core-training-location';
let state=newCoreAdvancement({id:'pc:advancement',classId:'fighter',level:1,xp:0,constitution:10,levelCap:'unlimited'});
state=awardAdventureXp(state,{id:'actual',xp:2100,rating:'E',sourceIds:['session:actual']});state=openAdvancementCandidate(state);
state=attachTrainingPlan(state,{route:'tutor',acceptedCostCp:300000});state=payTraining(state,{paymentId:'paid',amountCp:300000});state=startTraining(state);
for(const id of ['a','b'])state=recordTrainingSegment(state,{id,weeksNumerator:1,weeksDenominator:2,dmConfirmedContinuous:true});
assert.equal(state.status,'ready-for-award');
assert.throws(()=>inspectCoreDatedTrainingCourse(state,null,'pc'),/configured campaign calendar/);
let calendar=newCoreCalendar({minutesPerDay:1440,daysPerWeek:7});
assert.throws(()=>inspectCoreDatedTrainingCourse(state,calendar,'pc'),/lacks a unique/);
for(const [index,id] of ['a','b'].entries())calendar=scheduleCoreActivity(calendar,{id:`pc:advancement:training:${id}`,actorId:'pc',kind:'training',startMinute:index*5040,endMinuteExclusive:(index+1)*5040,locationId:'school',sourceIds:['dmg:86:gaining-levels','dmg:37:time-in-campaign']});
const untouched=structuredClone(calendar),coverage=inspectCoreDatedTrainingCourse(state,calendar,'pc');
assert.equal(coverage.startMinute,0);assert.equal(coverage.completedAtMinute,10080);
assert.equal(coverage.validationScope,'course-interval-coverage');assert.equal(coverage.targetLevel,2);
assert.deepEqual(calendar,untouched);
for(const change of [
  (c:CoreCampaignCalendar)=>{c.activities[0].actorId='other';},
  (c:CoreCampaignCalendar)=>{c.activities[0].kind='rest';},
  (c:CoreCampaignCalendar)=>{c.activities[0].locationId=' ';},
  (c:CoreCampaignCalendar)=>{c.activities[0].endMinuteExclusive--;},
  (c:CoreCampaignCalendar)=>{c.activities[0].sourceIds=[];},
  (c:CoreCampaignCalendar)=>{c.activities[0].startMinute=-1;c.activities[0].endMinuteExclusive=5039;},
]){const changed=structuredClone(calendar);change(changed);assert.throws(()=>inspectCoreDatedTrainingCourse(state,changed,'pc'),/does not match/);}
const gapped=structuredClone(calendar);gapped.activities[1].startMinute++;gapped.activities[1].endMinuteExclusive++;
assert.throws(()=>inspectCoreDatedTrainingCourse(state,gapped,'pc'),/contiguous/);
const duplicated=structuredClone(calendar);duplicated.activities.push(structuredClone(duplicated.activities[0]));
assert.throws(()=>inspectCoreDatedTrainingCourse(state,duplicated,'pc'),/unique/);
const ended=endCoreCalendarActivity(calendar,{activityId:calendar.activities[0].id,endedAtMinute:5000,eventId:'interrupted',actorId:'dm',reason:'Actual early end',sourceIds:['session:interrupt']});
assert.throws(()=>inspectCoreDatedTrainingCourse(state,ended,'pc'),/does not match/);
assert.deepEqual(calendar,untouched);
let relocated=structuredClone(calendar);relocated.activities[1].locationId='distant-school';
assert.throws(()=>inspectCoreDatedTrainingCourse(state,relocated,'pc'),/no automatic teleport/);
relocated=recordCoreTrainingLocationTransition(relocated,{id:'actual-move',fromActivityId:relocated.activities[0].id,toActivityId:relocated.activities[1].id,method:'instantaneous-movement',continuityConfirmed:true,actorId:'dm',reason:'Actual instantaneous relocation confirmed, not ordinary travel',evidenceSourceId:'session:move'});
assert.equal(inspectCoreDatedTrainingCourse(state,relocated,'pc').completedAtMinute,10080);
relocated=scheduleCoreActivity(relocated,{id:'actual-travel-too',actorId:'pc',kind:'travel',startMinute:100,endMinuteExclusive:200,locationId:'road',sourceIds:['session:travel']},[{leftId:calendar.activities[0].id,rightId:'actual-travel-too',actorId:'dm',reason:'Record actual facts',sourceIds:['session:travel']}]);
assert.throws(()=>inspectCoreDatedTrainingCourse(state,relocated,'pc'),/Unresolved activity consequences/);
console.log('PASS: dated course requires exact rational time, actor/location/kind/sources, intact intervals and contiguous coverage; no fabricated calendar or mutation. Other activity consequences remain a separate gate.');
