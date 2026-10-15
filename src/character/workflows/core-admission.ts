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

export function replayRegistryForCoreAdmission(archive:CoreAdmissionArchive){
  if(archive.format!=='adnd1e-core-admission-runtime'||archive.schemaVersion!==1)throw new Error('Unsupported core admission archive.');
  return characterRegistry(new Set(archive.registeredSourceIds));
}
