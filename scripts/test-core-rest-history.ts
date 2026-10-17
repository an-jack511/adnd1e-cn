import assert from 'node:assert/strict';
import {completedCoreRestHistory} from '../src/character/workflows/core-rest-history';
import type {CoreCampaignArchive} from '../src/character/workflows/core-campaign-runtime';
// Selector-only transport fixture; this is not an admission or RAW certification.
const fixture={actions:[{id:'rest-one',actorId:'dm',intent:{type:'complete-zero-hp-rest',completedThroughMinute:11080,consequencePolicy:'v1'}}],runtime:{transaction:{events:[{
  commandId:'rest-one',type:'character.module-replaced',payload:{id:'core-advancement',data:{lifeRecovery:{episodeId:'episode-one',restActivityId:'period-one',startMinute:1000,endMinuteExclusive:11080,completed:true}}},
}],facts:{modules:[{data:{lifeRecovery:{episodeId:'newer-current-episode'}}}]}}}};
const project=(value:unknown)=>completedCoreRestHistory(value as CoreCampaignArchive);
const before=JSON.stringify(fixture),receipts=project(fixture);
assert.equal(receipts.length,1);assert.equal(receipts[0].episodeId,'episode-one');assert.equal(receipts[0].consequencePolicy,'v1');
assert.equal(JSON.stringify(fixture),before);
receipts[0].episodeId='caller-mutated';assert.equal(project(fixture)[0].episodeId,'episode-one');
const legacy=structuredClone(fixture) as any;delete legacy.actions[0].intent.consequencePolicy;
assert.equal(project(legacy)[0].consequencePolicy,'legacy');
const noRest=structuredClone(fixture) as any;noRest.actions[0].intent.type='resolve-heal-convalescence';
assert.equal(project(noRest).length,0);
const duplicate=structuredClone(fixture);duplicate.runtime.transaction.events.push(structuredClone(duplicate.runtime.transaction.events[0]));
assert.throws(()=>project(duplicate),/unique historical/);
const absent=structuredClone(fixture);absent.runtime.transaction.events=[];
assert.throws(()=>project(absent),/unique historical/);
for(const change of [
  (value:any)=>{value.runtime.transaction.events[0].payload.id='other-module';},
  (value:any)=>{value.runtime.transaction.events[0].payload.data.lifeRecovery.completed=false;},
  (value:any)=>{value.runtime.transaction.events[0].payload.data.lifeRecovery.episodeId=' ';},
  (value:any)=>{value.runtime.transaction.events[0].payload.data.lifeRecovery.startMinute=-1;},
  (value:any)=>{value.runtime.transaction.events[0].payload.data.lifeRecovery.endMinuteExclusive=1000;},
  (value:any)=>{value.runtime.transaction.events[0].payload.data.lifeRecovery.resolution={method:'heal'};},
  (value:any)=>{value.actions[0].intent.completedThroughMinute=11079;},
]){const changed=structuredClone(fixture);change(changed);assert.throws(()=>project(changed),/inconsistent/);}
console.log('PASS: rest proofs derive from unique completion-event snapshots, survive current-state replacement, preserve policy/legacy labels, exclude Heal and reject malformed or ambiguous historical facts without mutation.');
