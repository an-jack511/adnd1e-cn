import assert from 'node:assert/strict';
import { commit, canonical, type Command, type Registry, type TransactionState } from '../src/character/domain/transactions';
type Facts={coins:number;items:number};
const start:TransactionState<Facts>={characterId:'c',branchId:'b',revision:0,throughSequence:0,facts:{coins:20,items:0},events:[],receipts:[],unexplainedTail:false};
const integer=(p:unknown)=>{assert.equal(typeof p,'number');assert.ok(Number.isSafeInteger(p));};
const registry:Registry<Facts>={sourceIds:new Set(['dm-price']),validateFacts:f=>{assert.ok(f.coins>=0&&f.items>=0);},commands:{buy:{validate:integer,plan:(_,c)=>[
  {id:c.id+'-paid',type:'coins',sourceIds:['dm-price'],payload:-(c.payload as number)},
  {id:c.id+'-item',type:'items',sourceIds:['dm-price'],payload:1}
]}},events:{coins:{validate:integer,apply:(f,e)=>({...f,coins:f.coins+(e.payload as number)})},items:{validate:integer,apply:(f,e)=>({...f,items:f.items+(e.payload as number)})}}};
const command:Command={id:'buy1',type:'buy',characterId:'c',branchId:'b',expectedRevision:0,actorId:'pl',at:'2026-10-14',payload:5};
const result=commit(start,command,registry);assert.deepEqual(result.state.facts,{coins:15,items:1});assert.deepEqual(start.facts,{coins:20,items:0});
assert.equal(result.state.events[1].sequence,2);assert.equal(result.state.revision,1);
const retry=commit(result.state,{...command,expectedRevision:1},registry);assert.equal(retry.duplicate,true);assert.equal(retry.state,result.state);
assert.throws(()=>commit(result.state,{...command,payload:6},registry),/reused/);
assert.throws(()=>commit(result.state,{...command,id:'buy2'},registry),/Revision/);
assert.throws(()=>commit({...start,unexplainedTail:true},command,registry),/tail/);
assert.throws(()=>commit(start,{...command,branchId:'other'},registry),/branch/);
const faulty:Registry<Facts>={...registry,events:{...registry.events,items:{validate:integer,apply:()=>{throw new Error('second event failure');}}}};
assert.throws(()=>commit(start,command,faulty),/second event/);assert.deepEqual(start.facts,{coins:20,items:0});assert.equal(start.events.length,0);
assert.throws(()=>commit(start,{...command,payload:21},registry));assert.deepEqual(start.facts,{coins:20,items:0});
assert.throws(()=>commit(start,command,{...registry,sourceIds:new Set()}),/source/);
assert.throws(()=>commit(start,{...command,type:'constructor'},registry),/Unsupported/);
assert.throws(()=>canonical(0.5));assert.throws(()=>canonical(JSON.parse('{"__proto__":5}')));
assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2}));
console.log('PASS: atomic batches, retry identity, revision/branch guards, source references, unknown-tail refusal, rollback and canonical integer facts. Framework tests, not RAW lifecycle certification.');
