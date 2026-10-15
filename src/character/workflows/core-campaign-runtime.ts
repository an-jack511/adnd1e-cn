import { canonical, type Json } from '../domain/transactions';
import { characterRegistry, commitCharacter, type CharacterRuntime } from '../domain/character-record';
import { parseCoreAdmissionArchive, type CoreAdmissionArchive } from './core-admission';
import { parseCoreCreation } from './core-create';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { newCoreAdvancement, awardAdventureXp, openAdvancementCandidate, attachTrainingPlan, payTraining, startTraining, recordTrainingSegment, awardCoreLevel, acceptAdvancementGate, interruptTraining, type AdventureAssessment, type CoreAdvancementState, type TrainingSegment } from './core-advancement';
import { spendCoreWallet, receiveCoreWallet, validateCoreInventoryLedger, type CoreInventoryLedger, type CoinCounts } from '../engine/core-inventory';
import type { InitialCoreClassId } from '../rules/core-progression';
import { attachNameLevelTrainingPlan } from './core-advancement';

type CampaignAction={id:string;actorId:string;at:string;expectedRevision:number;intent:
  {type:'experience';assessment:AdventureAssessment}|{type:'open-advancement'}|
  {type:'plan-training';route:'tutor'|'self';acceptedCostCp:number;reason?:string}|
  {type:'pay-training';amountCp:number;walletId:string;tender:CoinCounts;change:CoinCounts}|
  {type:'start-training'}|{type:'training-segment';segment:TrainingSegment}|{type:'award-level';hpRolls:number[]}|
  {type:'accept-gate';reason:string}|{type:'interrupt-training';reason:string}|
  {type:'plan-name-training';costFamily:'cleric'|'fighter'|'magic-user'|'thief';acceptedCostCp:number;reason:string}|
  {type:'income';walletId:string;coins:CoinCounts;sourceId:string;reason:string}};
export interface CoreCampaignArchive{
  format:'adnd1e-core-campaign-runtime';schemaVersion:1;genesis:CoreAdmissionArchive;
  actions:CampaignAction[];runtime:CharacterRuntime;
}
const sourceId='project:core-campaign-advancement';
const asJson=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Json;
function base(archive:CoreAdmissionArchive){
  const genesis=parseCoreAdmissionArchive(archive),document=parseCoreCreation(genesis.runtime.transaction.facts.modules[0].data);
  const candidate=document.candidate!;
  if(candidate.classIds.length!==1||candidate.classIds[0]==='bard')throw new Error('Campaign adapter requires a single ordinary core career.');
  const eligibility=evaluateCoreEligibility(candidate),classId=candidate.classIds[0] as InitialCoreClassId;
  const equipment=document.tasks.find(task=>task.id==='equipment')?.facts?.ledger;
  const inventory=equipment?structuredClone(equipment) as CoreInventoryLedger:null;if(inventory)validateCoreInventoryLedger(inventory);
  return {genesis,inventory,state:newCoreAdvancement({id:`${document.id}:advancement`,classId,level:1,xp:0,constitution:eligibility.adjustedScores.CON,levelCap:eligibility.classLevelCaps[classId]})};
}
export function newCoreCampaignArchive(admission:CoreAdmissionArchive):CoreCampaignArchive{
  const {genesis}=base(admission);return {format:'adnd1e-core-campaign-runtime',schemaVersion:1,genesis,actions:[],runtime:structuredClone(genesis.runtime)};
}
function reconstruct(genesis:CoreAdmissionArchive,actions:CampaignAction[]):CoreCampaignArchive{
  const initial=base(genesis);let runtime=structuredClone(initial.genesis.runtime),state:CoreAdvancementState=initial.state,inventory=initial.inventory;
  const ids=new Set<string>(),sources=new Set([...initial.genesis.registeredSourceIds,sourceId]);
  for(const action of actions){
    if(!action.id?.trim()||ids.has(action.id)||!action.actorId?.trim()||!action.at?.trim())throw new Error('Campaign action identity is missing or duplicated.');ids.add(action.id);
    if(action.expectedRevision!==runtime.transaction.revision)throw new Error('Campaign revision conflict.');
    if(action.intent.type==='experience'){
      if(!action.intent.assessment.id?.trim()||!['E','S','F','P'].includes(action.intent.assessment.rating))throw new Error('Experience assessment needs an identity and a printed performance rating.');
      if(!Array.isArray(action.intent.assessment.sourceIds)||!action.intent.assessment.sourceIds.length||action.intent.assessment.sourceIds.some(id=>typeof id!=='string'||!id.trim()))throw new Error('Experience assessment needs session sources.');
      action.intent.assessment.sourceIds.forEach(id=>sources.add(id));
      state=awardAdventureXp(state,action.intent.assessment);
    }else if(action.intent.type==='income'){
      if(!inventory)throw new Error('Verified inventory is required before income.');
      if(!action.intent.sourceId?.trim()||!action.intent.reason?.trim())throw new Error('Income needs a source and a DM explanation.');
      inventory=receiveCoreWallet({ledger:inventory,walletId:action.intent.walletId,coins:action.intent.coins});sources.add(action.intent.sourceId);
    }else if(action.intent.type==='open-advancement')state=openAdvancementCandidate(state);
    else if(action.intent.type==='plan-training')state=attachTrainingPlan(state,{route:action.intent.route,acceptedCostCp:action.intent.acceptedCostCp,costDecision:action.intent.reason?{actorId:action.actorId,reason:action.intent.reason}:undefined});
    else if(action.intent.type==='plan-name-training')state=attachNameLevelTrainingPlan(state,{costFamily:action.intent.costFamily,acceptedCostCp:action.intent.acceptedCostCp,actorId:action.actorId,reason:action.intent.reason});
    else if(action.intent.type==='pay-training'){
      if(!inventory)throw new Error('Verified inventory is required before training payments.');
      if(state.candidate?.acceptedCostCp!==null&&state.candidate&&state.candidate.paymentsCp.reduce((a,b)=>a+b,0)+action.intent.amountCp>state.candidate.acceptedCostCp!)throw new Error('Payment exceeds the remaining accepted training charge.');
      const paid=payTraining(state,{paymentId:action.id,amountCp:action.intent.amountCp});
      const spent=spendCoreWallet({ledger:inventory,walletId:action.intent.walletId,amountCp:action.intent.amountCp,tender:action.intent.tender,change:action.intent.change});
      state=paid;inventory=spent;
    }else if(action.intent.type==='start-training')state=startTraining(state);
    else if(action.intent.type==='accept-gate')state=acceptAdvancementGate(state,{actorId:action.actorId,reason:action.intent.reason});
    else if(action.intent.type==='interrupt-training')state=interruptTraining(state,{actorId:action.actorId,reason:action.intent.reason});
    else if(action.intent.type==='training-segment')state=recordTrainingSegment(state,action.intent.segment);
    else if(action.intent.type==='award-level')state=awardCoreLevel(state,{actorId:action.actorId,hpRolls:action.intent.hpRolls});
    else throw new Error('Unsupported campaign action; original history must be preserved.');
    sources.add('dmg:86:gaining-levels');
    runtime=commitCharacter(runtime,{id:action.id,type:'character.module.replace',characterId:runtime.transaction.characterId,branchId:runtime.transaction.branchId,expectedRevision:action.expectedRevision,actorId:action.actorId,at:action.at,payload:{id:'core-advancement',kind:'adnd1e-core-advancement',schemaVersion:state.schemaVersion,visibility:'player',sourceIds:[...sources],data:asJson({...state,inventory})}},characterRegistry(sources)).runtime;
  }
  return {format:'adnd1e-core-campaign-runtime',schemaVersion:1,genesis:initial.genesis,actions:structuredClone(actions),runtime};
}
export function parseCoreCampaignArchive(value:unknown):CoreCampaignArchive{
  const raw=asJson(value) as unknown as CoreCampaignArchive;
  if(raw?.format!=='adnd1e-core-campaign-runtime'||raw.schemaVersion!==1||!Array.isArray(raw.actions)||raw.actions.length>10000)throw new Error('Unsupported campaign archive.');
  const rebuilt=reconstruct(raw.genesis,raw.actions);
  if(canonical(asJson(raw))!==canonical(asJson(rebuilt)))throw new Error('Campaign snapshot differs from replayed rule actions.');
  return rebuilt;
}
export function commitCoreCampaignAction(archive:CoreCampaignArchive,action:CampaignAction):CoreCampaignArchive{
  const current=parseCoreCampaignArchive(archive);
  return reconstruct(current.genesis,[...current.actions,structuredClone(action)]);
}
