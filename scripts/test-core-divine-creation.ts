import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate } from '../src/character/workflows/core-create';
import { recordCoreDivineCreation } from '../src/character/workflows/core-divine-creation';
import type { DivineGrantRecord } from '../src/character/engine/core-spell-ledger';
function create(classId:'cleric'|'druid',wisdom:number){const scores={STR:12,INT:12,WIS:wisdom,DEX:12,CON:12,CHA:15};return selectCoreCandidate(newCoreCreation({name:classId,generation:{draftId:'d',draftRevision:1,batchId:'b',method:'DMG:I',scores}}),{raceId:'human',subraceId:null,sex:'male',alignmentId:classId==='druid'?'TN':'LG',initialScores:scores,classIds:[classId],mode:'single',campaign:{allowedRaceIds:['human'],bardEnabled:false}});}
function grant(classId:'cleric'|'druid',id:string):DivineGrantRecord{const spell={definitionId:`core:${classId}:1:light`,rulesetId:'adnd1e-core@1',listId:classId,level:1,displayName:'Light',sourceIds:[`phb:spell-table:${classId}:1`]};return {id,tradition:classId,requestedSpell:spell,grantedSpell:spell,authority:'training-and-experience',status:'granted',publicMessage:'Granted',private:{trueAuthorityId:'secret-authority',reason:'secret-reason',dmNotes:['secret-note']}};}
for(const classId of ['cleric','druid'] as const){
  const doc=create(classId,14),input={grants:[grant(classId,'g1')],restHours:4,prayerMinutes:15,completedAt:'day 1 dawn',sessionId:'s1'};
  const result=recordCoreDivineCreation(doc,input);assert.equal(result.document.tasks.find(t=>t.id==='initial-spells')!.status,'needs-dm');
  assert.equal(result.dmLedger.preparedCopies.length,1);
  for(const secret of ['secret-authority','secret-reason','secret-note'])assert.equal(JSON.stringify(result.document).includes(secret),false);
  const short=recordCoreDivineCreation(doc,{...input,restHours:0});assert.equal(short.document.tasks.find(t=>t.id==='initial-spells')!.status,'pending');assert.equal(short.dmLedger.preparedCopies.length,0);
  assert.throws(()=>recordCoreDivineCreation(doc,{...input,grants:Array.from({length:9},(_,i)=>grant(classId,`g${i}`)),prayerMinutes:180}),/capacity/);
}
console.log('PASS: cleric and druid initial grants use recalculated career/WIS capacity, prayer/rest gates, independent prepared copies and private-ledger separation.');
