import assert from 'node:assert/strict';
import {admittedCoreCharacter} from './fixtures/admitted-core-character';
import type {InitialCoreClassId} from '../src/character/rules/core-progression';
import {campaignSheet} from '../src/character/application/campaign-sheet';
import {campaignGrowth,campaignGrowthState,parseTrainingWeeks,remainingTrainingWeeks,printedTrainingCostCp,growthTrainingFormula,parseGpToCp,formatCpAsGp} from '../src/character/application/campaign-growth';
import {previewSheetAction,commitSheetAction,type SheetAction} from '../src/character/actions/campaign-actions';
import {exactTrainingTender} from '../src/character/actions/growth-actions';
import {parseCoreCampaignArchive,type CoreCampaignArchive} from '../src/character/workflows/core-campaign-runtime';
import {moneyValueCp,emptyCoins} from '../src/character/engine/core-inventory';
import {newCoreAdvancement,openAdvancementCandidate,acceptAdvancementGate} from '../src/character/workflows/core-advancement';

let serial=0;const apply=(a:CoreCampaignArchive,request:SheetAction)=>commitSheetAction(a,previewSheetAction(a,request,{id:`growth-action-${++serial}`,actorId:'actual-table-recorder',at:'recorded table time'}));
const careers:InitialCoreClassId[]=['fighter','paladin','ranger','cleric','druid','magic-user','illusionist','thief','assassin','monk'];
function finishCourse(input:CoreCampaignArchive,startMinute:number){
  let a=apply(input,{type:'character.growth.open'}),g=campaignGrowth(a);assert.equal(g.level,input.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')?campaignGrowth(input).level:1);
  if(g.status==='eligible-needs-dm'){a=apply(a,{type:'character.growth.gate',reason:'Explicit fixture campaign decision for this target level only; pending source issue is not claimed universally resolved.',classification:'campaign-exception',dmDecisionConfirmed:true});g=campaignGrowth(a);}assert.equal(g.status,'training-planned');
  a=apply(a,{type:'character.growth.plan',route:'tutor',tutorName:`Actual senior ${g.career}`,actualInstructionConfirmed:true});g=campaignGrowth(a);assert.equal(g.candidate!.acceptedCostCp,g.level*1500*200);
  a=apply(a,{type:'character.growth.pay',walletId:g.wallets[0].id,exactCoinsConfirmed:true});
  assert.equal(campaignGrowth(a).candidate!.remainingCp,0);
  if(!campaignGrowth(a).calendar)a=apply(a,{type:'character.growth.calendar',minutesPerDay:1440,daysPerWeek:7,adoptedConfirmed:true});
  a=apply(a,{type:'character.growth.start',actualStartConfirmed:true});assert.equal(campaignGrowth(a).level,g.level);
  const before=JSON.stringify(a);assert.throws(()=>apply(a,{type:'character.growth.award',hpRolls:[2],awardMinute:startMinute,dmAwardConfirmed:true}));assert.equal(JSON.stringify(a),before);
  a=apply(a,{type:'character.growth.progress',weeksNumerator:1,weeksDenominator:2,startMinute,location:'actual-training-school',actualContinuousConfirmed:true});assert.deepEqual(campaignGrowth(a).remainingWeeks,{numerator:1,denominator:2});
  assert.throws(()=>apply(a,{type:'character.growth.progress',weeksNumerator:1,weeksDenominator:2,startMinute:startMinute+6000,location:'actual-training-school',actualContinuousConfirmed:true}),/contiguous/);
  a=apply(a,{type:'character.growth.progress',weeksNumerator:1,weeksDenominator:2,startMinute:startMinute+5040,location:'actual-training-school',actualContinuousConfirmed:true});
  const ready=campaignGrowth(a);assert.equal(ready.status,'ready-for-award');assert.equal(ready.coverage!.completedAtMinute,startMinute+10080);assert.equal(ready.level,g.level);
  const oldHp=campaignSheet(a).life!.currentHp,oldMaximum=campaignSheet(a).maximumHp!,oldPrepared=campaignSheet(a).prepared.length;
  a=apply(a,{type:'character.growth.award',hpRolls:Array(ready.hp!.dice).fill(2),awardMinute:startMinute+10080,dmAwardConfirmed:true});
  assert.equal(campaignGrowth(a).level,g.level+1);assert.equal(campaignSheet(a).life?.currentHp,null);assert.equal(campaignSheet(a).life?.hpSettlement,'needs-dm');assert.ok(campaignSheet(a).maximumHp!>oldMaximum);assert.equal(campaignSheet(a).prepared.length,oldPrepared,'new capacity does not grant or prepare spells');
  a=apply(a,{type:'character.growth.settleHp',currentHp:oldHp!,actualHpConfirmed:true});assert.equal(campaignSheet(a).life?.currentHp,oldHp);assert.notEqual(campaignSheet(a).life?.currentHp,campaignSheet(a).maximumHp,'no automatic healing');
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(a))),a);return a;
}
for(const career of careers){
  let a=admittedCoreCharacter(career),s=campaignSheet(a),g=campaignGrowth(a);assert.equal(g.level,1);assert.equal(g.check.status,'not-eligible');
  a=apply(a,{type:'character.initializeLife',currentHp:s.maximumHp!,confirmed:true});
  a=apply(a,{type:'character.growth.experience',xp:g.check.threshold!,rating:'E',finalAwardConfirmed:true});assert.equal(campaignGrowth(a).level,1,'XP alone never grants a level');
  let opened=apply(a,{type:'character.growth.open'});if(campaignGrowth(opened).status==='eligible-needs-dm')opened=apply(opened,{type:'character.growth.gate',reason:'Explicit fixture campaign cap exception for this target only.',classification:'campaign-exception',dmDecisionConfirmed:true});const planned=apply(opened,{type:'character.growth.plan',route:'tutor',tutorName:'Actual tutor',actualInstructionConfirmed:true});
  assert.throws(()=>apply(planned,{type:'character.growth.pay',walletId:campaignGrowth(planned).wallets[0].id,exactCoinsConfirmed:true}),/余额不足/);
  const xp=campaignGrowth(a).xp;a=apply(a,{type:'character.growth.income',walletId:campaignGrowth(a).wallets[0].id,coins:{...emptyCoins(),gp:3000},actualIncomeConfirmed:true});assert.equal(campaignGrowth(a).xp,xp,'money receipt does not re-award XP');
  a=finishCourse(a,1440);assert.equal(campaignGrowth(a).level,2);assert.equal(campaignGrowth(a).xp,xp);
  console.log(`PASS: admitted ${career} -> final XP -> actual tutor/payment -> two continuous dated segments -> level2 -> actual HP settlement -> canonical replay.`);
}
// Single accepted large batch: three courses, unchanged XP, explicit full-rating adoption.
let overrun=admittedCoreCharacter('fighter');overrun=apply(overrun,{type:'character.initializeLife',currentHp:campaignSheet(overrun).maximumHp!,confirmed:true});
overrun=apply(overrun,{type:'character.growth.experience',xp:14000,rating:'E',finalAwardConfirmed:true});
overrun=apply(overrun,{type:'character.growth.income',walletId:campaignGrowth(overrun).wallets[0].id,coins:{...emptyCoins(),gp:30000},actualIncomeConfirmed:true});
for(let index=0;index<3;index++){
  if(index){assert.throws(()=>apply(overrun,{type:'character.growth.open'}),/ratings/);overrun=apply(overrun,{type:'character.growth.adoptRatings',reason:'Explicit campaign adoption: reuse the entire previous course rating basis; no new XP or adventure.',campaignAdoptionConfirmed:true});}
  overrun=finishCourse(overrun,1440+index*11520);assert.equal(campaignGrowth(overrun).xp,14000);
}
assert.equal(campaignGrowth(overrun).level,4);assert.equal(campaignGrowthState(overrun).state.history.filter(e=>e.type==='advancement.overrun-basis-adopted').length,2);
assert.deepEqual(exactTrainingTender({cp:0,sp:0,ep:2,gp:4,pp:0},1000),{...emptyCoins(),ep:2,gp:4});
assert.throws(()=>exactTrainingTender({...emptyCoins(),pp:1},200),/面额/,'no implicit coin exchange');
assert.deepEqual(parseTrainingWeeks('1.5'),{numerator:3,denominator:2});assert.deepEqual(parseTrainingWeeks('3/2'),{numerator:3,denominator:2});for(const invalid of ['0','1/0','Infinity','1e3','-1','0.123456789'])assert.throws(()=>parseTrainingWeeks(invalid));
const fractional={...newCoreAdvancement({classId:'fighter',level:1,xp:2001,constitution:12,levelCap:'unlimited'}),assessments:Array.from({length:7},(_,i)=>({id:`fraction-${i}`,xp:300,rating:(i===6?'S':'E') as 'E'|'S',sourceIds:['dmg:86:gaining-levels']}))};
assert.equal(printedTrainingCostCp(growthTrainingFormula(fractional,'tutor')),null,'fractionalcp cost is not silently rounded');
console.log('PASS: growth Actions, actual denominations, rational course time/cost, ten core career lifecycles and explicit multi-threshold continuation. Not full-system or extension certification.');
let partial=admittedCoreCharacter('fighter');
partial=apply(partial,{type:'character.initializeLife',currentHp:campaignSheet(partial).maximumHp!,confirmed:true});
partial=apply(partial,{type:'character.growth.experience',xp:2001,rating:'E',finalAwardConfirmed:true});
partial=apply(partial,{type:'character.growth.open'});
partial=apply(partial,{type:'character.growth.plan',route:'tutor',tutorName:'Actual tutor',actualInstructionConfirmed:true});
const wallet=campaignGrowth(partial).wallets[0],balance=moneyValueCp(wallet.coins);
partial=apply(partial,{type:'character.growth.pay',walletId:wallet.id,amountCp:200,exactCoinsConfirmed:true});
assert.equal(campaignGrowth(partial).candidate!.remainingCp,299800);
assert.equal(moneyValueCp(campaignGrowth(partial).wallets[0].coins),balance-200);
assert.throws(()=>apply(partial,{type:'character.growth.start',actualStartConfirmed:true}));
assert.throws(()=>apply(partial,{type:'character.growth.pay',walletId:wallet.id,amountCp:300000,exactCoinsConfirmed:true}),/超过/);
for(const cp of [1,2,199,200,299999,Number.MAX_SAFE_INTEGER])assert.equal(parseGpToCp(formatCpAsGp(cp)),cp);
for(const invalid of ['0','0.001','1e3','-1','1.0001'])assert.throws(()=>parseGpToCp(invalid));
const capped=openAdvancementCandidate({...newCoreAdvancement({classId:'fighter',level:1,xp:2001,constitution:12,levelCap:1}),assessments:[{id:'actual-adventure',xp:2001,rating:'E',sourceIds:['dmg:86:gaining-levels']} ]});
assert.throws(()=>acceptAdvancementGate(capped,{actorId:'dm',reason:'Not a factual confirmation',classification:'factual-confirmation'}),/战役例外/);
assert.equal(acceptAdvancementGate(capped,{actorId:'dm',reason:'Explicit campaign exception',classification:'campaign-exception'}).status,'training-planned');
assert.equal(acceptAdvancementGate(capped,{actorId:'dm',reason:'Legacy unclassified record'}).candidate!.dmDecision!.classification,undefined,'legacy records are preserved, not retrospectively relabelled');
console.log('PASS: partial actual payment, no unpaid course start, exact gp/cp round trips, numeric-cap exception classification and legacy replay.');
