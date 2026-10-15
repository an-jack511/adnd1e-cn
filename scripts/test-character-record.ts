import assert from 'node:assert/strict';
import { canonical, type Command } from '../src/character/domain/transactions';
import { characterRegistry, commitCharacter, createCharacterRuntime, installDerivedCache, playerProjection, replayCharacter, stageProposal } from '../src/character/domain/character-record';

const sources = new Set(['project:identity-fact', 'PHB:p35', 'DMG:p86']);
const registry = characterRegistry(sources);
let runtime = createCharacterRuntime({ characterId: 'char-1', branchId: 'main', name: 'Alyx', raceId: 'human', alignment: 'neutral-good' });
const command = (id:string,type:string,payload:any,revision=runtime.transaction.revision):Command => ({ id,type,characterId:'char-1',branchId:'main',expectedRevision:revision,actorId:'player-1',at:'576-01-01T00:00:00Z',payload });

let result = commitCharacter(runtime, command('c1','character.module.replace',{ id:'inventory',kind:'core-inventory',schemaVersion:'1.0.0',visibility:'player',sourceIds:['PHB:p35'],data:{walletCp:2000} }), registry);
runtime = result.runtime;
runtime = installDerivedCache(runtime,{engineVersion:'engine-1',rulesDigest:'sha256:rules-a',throughSequence:runtime.transaction.throughSequence,values:{encumbrance:'normal'},warnings:[]});
assert.equal(runtime.cache?.values && (runtime.cache.values as any).encumbrance,'normal');

result = commitCharacter(runtime,command('c2','character.ruling.record',{id:'r-private',ruleId:'training:tutor',choice:'approved',reason:'known instructor',actorId:'dm-1',visibility:'dm-private',sourceIds:['DMG:p86']}),registry);
runtime=result.runtime; assert.equal(runtime.cache,null,'committing a fact must invalidate derived values');
runtime=commitCharacter(runtime,command('c3','character.ruling.record',{id:'r-public',ruleId:'training:result',choice:'one-week',reason:'rating result',actorId:'dm-1',visibility:'player',sourceIds:['DMG:p86']}),registry).runtime;

const publicCard=playerProjection(runtime); const publicText=canonical(publicCard as any);
assert.equal(publicCard.modules.length,1); assert.equal(publicCard.rulings.length,1);
for(const secret of ['r-private','known instructor','dm-private','events','receipts','proposals','cache'])assert.equal(publicText.includes(secret),false,`projection leaked ${secret}`);

const duplicate=commitCharacter(runtime,command('c3','character.ruling.record',{id:'r-public',ruleId:'training:result',choice:'one-week',reason:'rating result',actorId:'dm-1',visibility:'player',sourceIds:['DMG:p86']},0),registry);
assert.equal(duplicate.duplicate,true); assert.equal(duplicate.runtime,runtime);
assert.throws(()=>commitCharacter(runtime,command('c3','character.ruling.record',{id:'changed',ruleId:'x',choice:'x',reason:'x',actorId:'dm',visibility:'player',sourceIds:['DMG:p86']}),registry),/identity reused/);
assert.throws(()=>installDerivedCache(runtime,{engineVersion:'x',rulesDigest:'x',throughSequence:0,values:{},warnings:[]}),/does not cover/);

const pristine=createCharacterRuntime({characterId:'char-1',branchId:'main',name:'Alyx',raceId:'human',alignment:'neutral-good'});
const replayed=replayCharacter(pristine,runtime.transaction.events,registry);
assert.deepEqual(replayed.transaction.facts,runtime.transaction.facts);
assert.throws(()=>replayCharacter(pristine,[...runtime.transaction.events,{...runtime.transaction.events.at(-1)!,id:'unknown',sequence:runtime.transaction.throughSequence+1,type:'extension.unknown'}],registry),/Unknown event type/);

const staged=stageProposal(runtime,{id:'proposal-1',kind:'import-candidate',submittedBy:'player-1',at:'576-01-01T01:00:00Z',payload:{name:'Untrusted'}});
assert.equal(staged.transaction.revision,runtime.transaction.revision,'staging cannot mutate authoritative facts');
assert.equal(staged.proposals.length,1);
assert.throws(()=>commitCharacter(runtime,command('bad','character.module.replace',{id:'derived',kind:'cache',schemaVersion:'1',visibility:'player',sourceIds:[],data:{ac:3.5}}),registry),/source|integer/i);
console.log('Authoritative character record, cache invalidation, replay, proposal isolation and projection secrecy passed.');
