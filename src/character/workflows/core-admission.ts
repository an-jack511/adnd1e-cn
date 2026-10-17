import { canonical, type Command, type Json } from '../domain/transactions';
import { characterRegistry, commitCharacter, createCharacterRuntime, type CharacterRuntime } from '../domain/character-record';
import { parseCoreCreation, type CoreCreation } from './core-create';

export const coreAdmissionSourceId = 'project:core-creation-admission';

export interface CoreAdmissionArchive {
  readonly format: 'adnd1e-core-admission-runtime';
  readonly schemaVersion: 1;
  readonly runtime: CharacterRuntime;
  readonly registeredSourceIds: readonly string[];
}

/**
 * Player-owned handoff. This is deliberately not an admission record:
 * it contains the player's recorded creation facts and unresolved items, but
 * no DM actor, approval, or campaign entry decision.
 */
export interface CorePlayerArchive {
  readonly format: 'adnd1e-core-player-runtime';
  readonly schemaVersion: 1;
  readonly runtime: CharacterRuntime;
  readonly registeredSourceIds: readonly string[];
  readonly unresolved: readonly string[];
}

export type CoreGenesisArchive = CoreAdmissionArchive | CorePlayerArchive;

function json(value: unknown): Json {
  const result = JSON.parse(JSON.stringify(value)) as Json;
  canonical(result);
  return result;
}

/** Converts an explicitly DM-admitted creation into the authoritative event runtime. */
export function createRuntimeFromAdmittedCoreCreation(input:{document:CoreCreation;characterId?:string;branchId?:string}):CoreAdmissionArchive {
  const document=parseCoreCreation(input.document);
  if(document.status!=='admitted'||!document.admission||!document.candidate)throw new Error('Only an explicitly DM-admitted core creation can become an authoritative character runtime.');
  const characterId=input.characterId??document.id,branchId=input.branchId??'main';
  const gathered=[coreAdmissionSourceId,'project:identity-fact',
    ...document.tasks.flatMap(task=>task.sourceIds),...document.decisions.flatMap(decision=>decision.sourceIds)];
  const registeredSourceIds=[...new Set(gathered.filter(id=>id.trim()))];
  const moduleSourceIds=[...new Set([coreAdmissionSourceId,...document.tasks.flatMap(task=>task.sourceIds),...document.decisions.flatMap(decision=>decision.sourceIds)].filter(id=>id.trim()))];
  let runtime=createCharacterRuntime({characterId,branchId,name:document.name,raceId:document.candidate.raceId,alignment:document.candidate.alignmentId,
    description:`Admitted core creation ${document.id}`});
  const registry=characterRegistry(new Set(registeredSourceIds));
  const command:Command={id:`${document.id}:admission`,type:'character.module.replace',characterId,branchId,expectedRevision:0,
    actorId:document.admission.actorId,at:document.admission.at,payload:{id:'core-creation',kind:'adnd1e-core-creation',schemaVersion:document.schemaVersion,
      visibility:'player',sourceIds:moduleSourceIds,data:json(document)}};
  runtime=commitCharacter(runtime,command,registry).runtime;
  return Object.freeze({format:'adnd1e-core-admission-runtime',schemaVersion:1,runtime,registeredSourceIds:Object.freeze(registeredSourceIds)});
}

/** Converts a player's recorded creation into a playable local archive.
 * This never changes the creation into an admission and never invents a DM.
 */
export function createRuntimeFromPlayerCoreCreation(input:{document:CoreCreation;characterId?:string;branchId?:string;at?:string}):CorePlayerArchive {
  const document=parseCoreCreation(input.document);
  if(!document.candidate||document.status==='blocked'||document.status==='selection')throw new Error('Player creation needs a selected, non-blocked core identity.');
  const characterId=input.characterId??document.id,branchId=input.branchId??'main';
  const gathered=['project:core-creation-player','project:identity-fact',
    ...document.tasks.flatMap(task=>task.sourceIds),...document.decisions.flatMap(decision=>decision.sourceIds)];
  const registeredSourceIds=[...new Set(gathered.filter(id=>id.trim()))];
  const moduleSourceIds=[...new Set(['project:core-creation-player',...document.tasks.flatMap(task=>task.sourceIds),...document.decisions.flatMap(decision=>decision.sourceIds)].filter(id=>id.trim()))];
  let runtime=createCharacterRuntime({characterId,branchId,name:document.name,raceId:document.candidate.raceId,alignment:document.candidate.alignmentId,
    description:`Player-created core character ${document.id}`});
  const registry=characterRegistry(new Set(registeredSourceIds));
  const command:Command={id:`${document.id}:player-runtime`,type:'character.module.replace',characterId,branchId,expectedRevision:0,
    actorId:'local-table-player',at:input.at??new Date().toISOString(),payload:{id:'core-creation',kind:'adnd1e-core-creation',schemaVersion:document.schemaVersion,
      visibility:'player',sourceIds:moduleSourceIds,data:json(document)}};
  runtime=commitCharacter(runtime,command,registry).runtime;
  const unresolved=[...document.tasks.filter(task=>task.status==='pending'||task.status==='needs-dm').map(task=>`task:${task.id}`),
    ...document.status==='needs-dm'?['eligibility:unresolved']:[]];
  return Object.freeze({format:'adnd1e-core-player-runtime',schemaVersion:1,runtime,registeredSourceIds:Object.freeze(registeredSourceIds),unresolved:Object.freeze(unresolved)});
}

export function replayRegistryForCoreAdmission(archive:CoreAdmissionArchive){
  if(archive.format!=='adnd1e-core-admission-runtime'||archive.schemaVersion!==1)throw new Error('Unsupported core admission archive.');
  return characterRegistry(new Set(archive.registeredSourceIds));
}

export function replayRegistryForCorePlayer(archive:CorePlayerArchive){
  if(archive.format!=='adnd1e-core-player-runtime'||archive.schemaVersion!==1)throw new Error('Unsupported core player archive.');
  return characterRegistry(new Set(archive.registeredSourceIds));
}

export function parseCoreGenesisArchive(value:unknown):CoreGenesisArchive{
  const format=(value as {format?:unknown})?.format;
  if(format==='adnd1e-core-admission-runtime')return parseCoreAdmissionArchive(value);
  const encoded=JSON.stringify(value);
  if(!encoded||encoded.length>4*1024*1024)throw new Error('Core player archive exceeds the supported size.');
  const raw=JSON.parse(encoded) as CorePlayerArchive;
  if(raw?.format!=='adnd1e-core-player-runtime'||raw.schemaVersion!==1||!Array.isArray(raw.unresolved))throw new Error('Unsupported core player archive.');
  if(raw.runtime?.format!=='adnd1e-character-runtime'||raw.runtime.schemaVersion!=='1.0.0')throw new Error('Unsupported character runtime.');
  const transaction=raw.runtime.transaction;
  if(!transaction||!Array.isArray(transaction.events)||transaction.events.length!==1)throw new Error('Player archive v1 requires exactly one genesis event.');
  if(!Array.isArray(transaction.facts?.modules))throw new Error('Player facts are missing.');
  const module=transaction.facts.modules.find(item=>item.id==='core-creation');
  if(!module)throw new Error('Player creation module is missing.');
  const document=parseCoreCreation(module.data);
  const reconstructed=createRuntimeFromPlayerCoreCreation({document,characterId:transaction.characterId,branchId:transaction.branchId,at:transaction.events[0].at});
  if(canonical(json(raw))!==canonical(json(reconstructed)))throw new Error('Player archive facts, events, receipts or sources differ from reconstructed player archive.');
  return reconstructed;
}

/** Admission archive v1 contains exactly the genesis admission event, not later campaign edits. */
export function parseCoreAdmissionArchive(value:unknown):CoreAdmissionArchive{
  const encoded=JSON.stringify(value);
  if(!encoded||encoded.length>4*1024*1024)throw new Error('Core admission archive exceeds the supported size.');
  const raw=JSON.parse(encoded) as CoreAdmissionArchive;
  if(raw?.format!=='adnd1e-core-admission-runtime'||raw.schemaVersion!==1)throw new Error('Unsupported core admission archive.');
  if(raw.runtime?.format!=='adnd1e-character-runtime'||raw.runtime.schemaVersion!=='1.0.0')throw new Error('Unsupported character runtime.');
  const transaction=raw.runtime.transaction;
  if(!transaction||!Array.isArray(transaction.events)||transaction.events.length!==1)throw new Error('Admission archive v1 requires exactly one genesis event; preserve other histories for separate runtime import.');
  if(!Array.isArray(transaction.facts?.modules))throw new Error('Admission facts are missing.');
  const module=transaction.facts.modules.find(item=>item.id==='core-creation');
  if(!module)throw new Error('Admission creation module is missing.');
  const document=parseCoreCreation(module.data);
  const reconstructed=createRuntimeFromAdmittedCoreCreation({document,characterId:transaction.characterId,branchId:transaction.branchId});
  if(canonical(json(raw))!==canonical(json(reconstructed)))throw new Error('Admission archive facts, events, receipts or sources differ from reconstructed admission.');
  return reconstructed;
}
