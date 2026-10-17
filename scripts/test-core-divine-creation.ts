import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate } from '../src/character/workflows/core-create';
import { recordCoreDivineCreation } from '../src/character/workflows/core-divine-creation';
import type { DivineGrantRecord } from '../src/character/engine/core-spell-ledger';
import { coreDivineFirstLevelChoices } from '../src/character/rules/core-divine-first-level';
import { canonical, type Json } from '../src/character/domain/transactions';
import { recordCreationTask, approveCreationTask, admitCoreCreation } from '../src/character/workflows/core-create';
import { createRuntimeFromAdmittedCoreCreation } from '../src/character/workflows/core-admission';
import { newCoreCampaignArchive, commitCoreCampaignAction, parseCoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';
function create(classId:'cleric'|'druid',wisdom:number){const scores={STR:12,INT:12,WIS:wisdom,DEX:12,CON:12,CHA:15};return selectCoreCandidate(newCoreCreation({name:classId,generation:{draftId:'d',draftRevision:1,batchId:'b',method:'DMG:I',scores}}),{raceId:'human',subraceId:null,sex:'male',alignmentId:classId==='druid'?'TN':'LG',initialScores:scores,classIds:[classId],mode:'single',campaign:{allowedRaceIds:['human'],bardEnabled:false}});}
function grant(classId:'cleric'|'druid',id:string):DivineGrantRecord{const spell=coreDivineFirstLevelChoices(classId)[0];return {id,tradition:classId,requestedSpell:spell,grantedSpell:spell,authority:'training-and-experience',status:'granted',publicMessage:'Granted',private:{trueAuthorityId:'secret-authority',reason:'secret-reason',dmNotes:['secret-note']}};}
for(const classId of ['cleric','druid'] as const){
  const doc=create(classId,14),input={grants:[grant(classId,'g1')],restHours:4,prayerMinutes:15,completedAt:'day 1 dawn',sessionId:'s1'};
  assert.equal(coreDivineFirstLevelChoices(classId).length,12);
  const badGrant=grant(classId,'bad');assert.throws(()=>recordCoreDivineCreation(doc,{...input,grants:[{...badGrant,requestedSpell:{...badGrant.requestedSpell,level:2}}]}),/catalog/);
  const result=recordCoreDivineCreation(doc,input);assert.equal(result.document.tasks.find(t=>t.id==='initial-spells')!.status,'needs-dm');
  const fractional=recordCoreDivineCreation(doc,{...input,restHours:4.5});
  const portable=fractional.document.tasks.find(t=>t.id==='initial-spells')!.facts!.ledger as any;
  assert.equal(portable.recoverySessions[0].actualRestMinutes,270);assert.equal(portable.recoverySessions[0].actualRestHours,undefined);
  assert.doesNotThrow(()=>canonical(JSON.parse(JSON.stringify(fractional.document)) as Json));
  const empty=recordCoreDivineCreation(doc,{...input,grants:[]});assert.equal(empty.dmLedger.preparedCopies.length,0);assert.equal(empty.document.tasks.find(t=>t.id==='initial-spells')!.facts!.preparedNone,true);
  assert.equal(result.dmLedger.preparedCopies.length,1);
  let admitted=result.document;
  // Non-spell tasks are transport fixtures here, not a second RAW creation certification.
  for(const task of admitted.tasks.filter(task=>task.id!=='initial-spells'))admitted=recordCreationTask(admitted,task.id,{status:'complete',sourceIds:['fixture:transport-only'],note:'Transport fixture',facts:{recorded:true}});
  admitted=approveCreationTask(admitted,'initial-spells',{actorId:'dm',at:'day1',reason:'Verified actual grant and prayer',sourceIds:admitted.tasks.find(task=>task.id==='initial-spells')!.sourceIds});
  admitted=admitCoreCreation(admitted,{actorId:'dm',at:'day1',scope:'spell-operation-test'});
  const campaign=newCoreCampaignArchive(createRuntimeFromAdmittedCoreCreation({document:admitted})),copyId=result.dmLedger.preparedCopies[0].id;
  const command={id:'cast-one',actorId:'dm',at:'day2',expectedRevision:1,intent:{type:'cast-prepared' as const,copyId,components:'satisfied' as const,reason:'Components and situation checked',observedOutcome:'Resolved separately'}};
  const cast=commitCoreCampaignAction(campaign,command);
  assert.equal((cast.runtime.transaction.facts.modules.find(module=>module.id==='core-advancement')!.data as any).spells.preparedCopies[0].status,'expended');
  assert.throws(()=>commitCoreCampaignAction(cast,{...command,id:'cast-again',expectedRevision:2}),/ready prepared copy/);
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(cast))),cast);
  for(const secret of ['secret-authority','secret-reason','secret-note'])assert.equal(JSON.stringify(cast).includes(secret),false);
  for(const secret of ['secret-authority','secret-reason','secret-note'])assert.equal(JSON.stringify(result.document).includes(secret),false);
  const short=recordCoreDivineCreation(doc,{...input,restHours:0});assert.equal(short.document.tasks.find(t=>t.id==='initial-spells')!.status,'pending');assert.equal(short.dmLedger.preparedCopies.length,0);
  assert.throws(()=>recordCoreDivineCreation(doc,{...input,grants:Array.from({length:9},(_,i)=>grant(classId,`g${i}`)),prayerMinutes:180}),/capacity/);
}
assert.ok(!coreDivineFirstLevelChoices('druid').some(item=>item.definitionId.endsWith(':cure-light-wounds')),'PHB p41 places druid Cure Light Wounds at second level, not first');
console.log('PASS: cleric and druid initial grants use recalculated career/WIS capacity, prayer/rest gates, independent prepared copies and private-ledger separation.');
