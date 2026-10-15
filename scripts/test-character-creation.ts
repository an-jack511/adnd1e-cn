import assert from 'node:assert/strict';
import { assign, deterministicChoices, evaluate, generate, newDraft, parseDraft, totals, withBatch } from '../src/character/creation/engine';
import { exportText, importText, readLibrary, saveDraft, saveDraftLocked, storageKey } from '../src/character/creation/storage';
import type { Batch, Method } from '../src/character/creation/model';

const at='2026-10-14T00:00:00Z';
function sum(n:number){const dice=[1,1,1];let left=n-3;for(let i=0;i<3;i++){const add=Math.min(5,left);dice[i]+=add;left-=add;}return dice;}
function batch(method:Method, values:number[]):Batch{return {id:'batch-'+method,method,createdAt:at,candidates:values.map(sum)};}
let rolled=0;
const i=generate('DMG:I',()=>{rolled++;return [6,5,4,1][(rolled-1)%4];},'i',at);
assert.equal(rolled,24);assert.deepEqual(totals(i),[15,15,15,15,15,15]);
assert.deepEqual(evaluate(i,[5,4,3,2,1,0]),{STR:15,INT:15,WIS:15,DEX:15,CON:15,CHA:15});
assert.throws(()=>evaluate(i,[0,0,2,3,4,5]));
const ii=batch('DMG:II',Array.from({length:12},(_,i)=>i+3));
assert.deepEqual(evaluate(ii,[11,10,9,8,7,6]),{STR:14,INT:13,WIS:12,DEX:11,CON:10,CHA:9});
assert.throws(()=>evaluate(ii,[11,10,9,8,7,5]));
const tied=batch('DMG:II',[18,17,16,15,14,13,13,12,11,10,9,8]);
assert.equal(evaluate(tied,[0,1,2,3,4,6]).CHA,13);
const iii=batch('DMG:III',Array.from({length:36},(_,i)=>3+Math.floor(i/6)+i%6));
assert.deepEqual(deterministicChoices(iii),[5,11,17,23,29,35]);
assert.equal(evaluate(iii,[5,11,17,23,29,35]).CHA,13);
assert.throws(()=>evaluate(iii,[4,11,17,23,29,35]));
assert.throws(()=>evaluate(iii,[11,5,17,23,29,35]));
const iv=batch('DMG:IV',Array.from({length:72},(_,i)=>3+i%16));
assert.equal(evaluate(iv,[12,13,14,15,16,17]).STR,15);
assert.throws(()=>evaluate(iv,[12,13,14,15,16,23]));
assert.throws(()=>evaluate(iv,[13,12,14,15,16,17]));
for(const [method,count] of [['DMG:II',36],['DMG:III',108],['DMG:IV',216]] as const){let calls=0;generate(method,()=>{calls++;return 4;},method,at);assert.equal(calls,count);}
assert.throws(()=>generate('DMG:I',()=>7,'bad',at));
let draft=withBatch(newDraft('draft-1'),ii);draft=assign(draft,[11,10,9,8,7,6]);
const original=exportText(draft);const imported=importText(original,'imported');assert.equal(imported.id,'imported');assert.deepEqual(imported.scores,draft.scores);assert.equal(draft.id,'draft-1');
const forged=JSON.parse(original);forged.scores.STR=17;assert.throws(()=>importText(JSON.stringify(forged),'fake'));
assert.throws(()=>importText('{"name":"partial"}','partial'));
assert.throws(()=>importText('not-json','partial'));
const short=JSON.parse(original);short.activeBatch.candidates.pop();assert.throws(()=>parseDraft(short));
const unknown=JSON.parse(original);unknown.unmappedSecret=1;assert.throws(()=>parseDraft(unknown));
const previous=structuredClone(draft);draft=withBatch(draft,i);assert.equal(draft.history.length,1);assert.deepEqual(draft.history[0].scores,previous.scores);assert.equal(draft.scores,null);
const values=new Map<string,string>();const port={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
saveDraft(port,draft,null);assert.equal(readLibrary(port).length,1);
assert.throws(()=>saveDraft(port,draft,null));
saveDraft(port,draft,draft.revision);
values.set(storageKey,'broken');assert.throws(()=>saveDraft(port,draft,draft.revision));assert.equal(values.get(storageKey),'broken');
const unavailable={getItem:()=>null,setItem:()=>{throw new Error('quota');}};assert.throws(()=>saveDraft(unavailable,draft,null));assert.equal(draft.history.length,1);
async function concurrentTests(){
  values.set(storageKey,JSON.stringify({version:1,drafts:Array.from({length:200},(_,n)=>newDraft('full-'+n))}));
  const before=values.get(storageKey);assert.throws(()=>saveDraft(port,newDraft('extra'),null),/200/);assert.equal(values.get(storageKey),before);
  saveDraft(port,newDraft('full-0'),0);assert.equal(readLibrary(port).length,200);
  values.delete(storageKey);
  // Deterministic serialized lock port: exercises the same contract as Web Locks.
  let tail=Promise.resolve();const locks={request:(_name:string,_options:unknown,run:()=>unknown)=>{const result=tail.then(run);tail=result.then(()=>{},()=>{});return result;}} as unknown as Pick<LockManager,'request'>;
  await Promise.all([saveDraftLocked(port,newDraft('A'),null,locks),saveDraftLocked(port,newDraft('B'),null,locks)]);
  assert.deepEqual(readLibrary(port).map(d=>d.id),['A','B']);
  const same=await Promise.allSettled([saveDraftLocked(port,newDraft('C'),null,locks),saveDraftLocked(port,newDraft('C'),null,locks)]);
  assert.equal(same.filter(r=>r.status==='rejected').length,1);
  const advanced={...newDraft('C'),revision:2};saveDraft(port,advanced,0);
  assert.throws(()=>saveDraft(port,newDraft('C'),2),/回退/);assert.equal(readLibrary(port).find(d=>d.id==='C')?.revision,2);
  await assert.rejects(saveDraftLocked(port,newDraft('D'),null,undefined));assert.equal(readLibrary(port).length,3);
  console.log('PASS: DMG I–IV, integrity/import/history/storage; library capacity, serialized concurrent writes, same-ID conflict and no-lock fail-closed.');
}
concurrentTests().catch(e=>{console.error(e);process.exitCode=1;});
