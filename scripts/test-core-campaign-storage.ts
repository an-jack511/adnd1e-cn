import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate, recordCreationTask, admitCoreCreation } from '../src/character/workflows/core-create';
import { createRuntimeFromAdmittedCoreCreation } from '../src/character/workflows/core-admission';
import { newCoreCampaignArchive, commitCoreCampaignAction } from '../src/character/workflows/core-campaign-runtime';
import { coreCampaignStorageKey, loadCoreCampaign, saveCoreCampaign, recoverCoreCampaignHistory, type CoreCampaignStoragePort } from '../src/character/workflows/core-campaign-storage';

// Minimal transport fixture, not a test or certification of creation rules.
const scores = { STR:16, INT:9, WIS:12, DEX:12, CON:14, CHA:10 };
let doc = newCoreCreation({ id:'storage-pc', name:'Storage fixture', generation:{draftId:'rolls',draftRevision:1,batchId:'batch',method:'DMG:I',scores} });
doc = selectCoreCandidate(doc,{raceId:'human',subraceId:null,sex:'male',alignmentId:'NG',initialScores:scores,classIds:['fighter'],mode:'single',campaign:{allowedRaceIds:['human'],bardEnabled:false}});
for (const task of doc.tasks) doc = recordCreationTask(doc,task.id,{status:'complete',sourceIds:['test:storage-fixture'],note:'Transport fixture',facts:{fixture:true}});
doc = admitCoreCreation(doc,{actorId:'dm',at:'fixture',scope:'test'});
const initial = newCoreCampaignArchive(createRuntimeFromAdmittedCoreCreation({document:doc}));
const slot = {characterId:'storage-pc',branchId:'main'};
const key = coreCampaignStorageKey(slot);
class Memory implements CoreCampaignStoragePort {
  data = new Map<string,string>(); writes = 0; quota = false; race = false;
  getItem(k:string) { return this.data.get(k) ?? null; }
  compareAndSet(k:string, old:string|null, next:string) {
    this.writes++;
    if(this.quota) throw new Error('QuotaExceededError');
    if(this.race) { this.race=false; this.data.set(k, `${old} `); }
    if(this.getItem(k)!==old) return false;
    this.data.set(k,next); return true;
  }
}
const port = new Memory();
assert.equal(loadCoreCampaign(port,slot).status,'missing');
let saved = saveCoreCampaign(port,slot,initial,null);
assert.equal(saved.status,'saved');
function ready() { const result=loadCoreCampaign(port,slot); assert.equal(result.status,'ready'); if(result.status!=='ready') throw new Error('not ready'); return result; }
function advance(archive:typeof initial, id:string) {
  return commitCoreCampaignAction(archive,{id,actorId:'dm',at:id,expectedRevision:archive.runtime.transaction.revision,intent:{type:'experience',assessment:{id,xp:1,rating:'E',sourceIds:['test:session']}}});
}
const first=ready();
assert.deepEqual(first.archive,initial);
assert.equal(saveCoreCampaign(port,slot,initial,null).status,'conflict','create-only cannot overwrite');
const next=advance(initial,'session-1');
assert.equal(saveCoreCampaign(port,slot,next,first.token).status,'saved');
const second=ready();
assert.equal(saveCoreCampaign(port,slot,advance(initial,'divergent'),second.token).status,'conflict','same revision divergent actions');
assert.equal(saveCoreCampaign(port,slot,initial,second.token).status,'conflict','no downgrade even with fresh token');
assert.equal(saveCoreCampaign(port,slot,advance(next,'stale'),first.token).status,'conflict');
assert.equal(saveCoreCampaign(port,slot,next,second.token).status,'conflict','equal revision is not an overwrite');
const recovery=recoverCoreCampaignHistory(port,slot,second.token,1);
assert.equal(recovery.status,'recovery-conflict'); assert.deepEqual(recovery.recovered,initial);
assert.equal(port.getItem(key),second.token,'recovery never writes');
assert.equal(saveCoreCampaign(port,slot,recovery.recovered,second.token).status,'conflict');
assert.throws(()=>recoverCoreCampaignHistory(port,slot,first.token,1),/baseline/);
port.quota=true;
assert.equal(saveCoreCampaign(port,slot,advance(next,'quota'),second.token).status,'failed');
assert.equal(port.getItem(key),second.token,'quota preserves head AND history bytes'); port.quota=false;
port.race=true;
assert.equal(saveCoreCampaign(port,slot,advance(next,'race'),second.token).status,'conflict');
assert.equal(port.getItem(key),second.token+' ','competing write survives');
assert.equal(loadCoreCampaign(port,slot).status,'ready');
let current=ready();
for(let n=2;n<=9;n++) { assert.equal(saveCoreCampaign(port,slot,advance(current.archive,`session-${n}`),current.token).status,'saved'); current=ready(); }
assert.equal(current.history.length,5); assert.equal(current.history[0].generation,current.generation-1);
assert.throws(()=>recoverCoreCampaignHistory(port,slot,current.token,1),/unavailable/);
const branch={...slot,branchId:'alternate:/[]'};
const branched=newCoreCampaignArchive(createRuntimeFromAdmittedCoreCreation({document:doc,branchId:branch.branchId}));
assert.equal(saveCoreCampaign(port,branch,branched,null).status,'saved');
assert.equal(port.getItem(key),current.token,'same character different branch is isolated');
assert.equal(saveCoreCampaign(port,branch,initial,loadCoreCampaign(port,branch).token).status,'failed');
assert.notEqual(coreCampaignStorageKey({characterId:'a:b',branchId:'c'}),coreCampaignStorageKey({characterId:'a',branchId:'b:c'}));
const forged=structuredClone(current.archive); forged.runtime.transaction.revision++;
const writes=port.writes;
assert.equal(saveCoreCampaign(port,slot,forged,current.token).status,'failed'); assert.equal(port.writes,writes);
for(const raw of ['{broken',JSON.stringify({...JSON.parse(current.token),schemaVersion:99}),JSON.stringify({...JSON.parse(current.token),extra:'future'}),JSON.stringify({...JSON.parse(current.token),head:{...current.archive,schemaVersion:99}}),JSON.stringify({...JSON.parse(current.token),history:[]})]) {
  port.data.set(key,raw);
  const result=loadCoreCampaign(port,slot); assert.equal(result.status,'preserved');
  if(result.status==='preserved') assert.equal(result.raw,raw);
  assert.equal(saveCoreCampaign(port,slot,current.archive,raw).status,'conflict'); assert.equal(port.getItem(key),raw);
}
const unreadable:CoreCampaignStoragePort={getItem(){throw new Error('Access denied');},compareAndSet(){throw new Error('must not write');}};
assert.throws(()=>loadCoreCampaign(unreadable,slot),/Access denied/);
assert.equal(saveCoreCampaign(unreadable,slot,initial,null).status,'failed');
console.log('PASS: replay validation, atomic conflicts, lineage/downgrade protection, branch isolation, quota preservation, bounded history, explicit recovery conflicts, unknown-schema byte preservation and read failures.');
