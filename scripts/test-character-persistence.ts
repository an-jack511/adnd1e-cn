import assert from 'node:assert/strict';
import { guardWrite, openArchives, validateState } from '../src/character/persistence/indexeddb';
import type { TransactionState } from '../src/character/domain/transactions';
const empty:TransactionState<{hp:number}>={characterId:'c',branchId:'b',revision:0,throughSequence:0,facts:{hp:5},events:[],receipts:[],unexplainedTail:false};
validateState(empty);guardWrite(undefined,empty,null);
const next={...structuredClone(empty),revision:1};guardWrite(empty,next,0);
assert.throws(()=>guardWrite(empty,next,null),/conflict/);assert.throws(()=>guardWrite(next,empty,1),/revision/);
assert.throws(()=>guardWrite(empty,{...next,branchId:'foreign'},0),/identity/);
assert.throws(()=>guardWrite(empty,{...next,revision:2},0),/revision/);
assert.throws(()=>validateState({...empty,revision:NaN}));
assert.throws(()=>validateState({...next,receipts:[{commandId:'x',request:'x',revision:1,eventIds:['missing']}]}));
const event={id:'ev',type:'x',commandId:'x',sequence:1,actorId:'dm',at:'now',sourceIds:['ref'],payload:1};
assert.throws(()=>validateState({...next,throughSequence:1,events:[event,event]}));
assert.throws(()=>validateState({...next,throughSequence:1,events:[event],receipts:[{commandId:'other',request:'x',revision:1,eventIds:['ev']}]}));
async function test(){await assert.rejects(openArchives(undefined),/unavailable/);console.log('PASS: persistence identity/revision/history guards and unavailable-storage failure. Actual browser IndexedDB transactions require integration smoke testing.');}
test().catch(e=>{console.error(e);process.exitCode=1;});
