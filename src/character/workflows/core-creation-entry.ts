import {admitCoreCreation,parseCoreCreation,type CoreCreation} from './core-create';
import {assertArcaneCreationLedger} from './core-arcane-creation';
import {createRuntimeFromAdmittedCoreCreation} from './core-admission';
import {newCoreCampaignArchive,parseCoreCampaignArchive,type CoreCampaignArchive} from './core-campaign-runtime';
import type {CampaignSave,CampaignSlot} from './core-campaign-storage';

/** Current creation handoff, not a replacement reader for legacy files. */
export function admitCoreCreationForCampaign(input:CoreCreation,review:{actorId:string;scope:string;at:string}):CoreCreation{
  const document=parseCoreCreation(input);
  assertArcaneCreationLedger(document);
  return admitCoreCreation(document,review);
}
export function campaignFromCreatedCharacter(input:CoreCreation):CoreCampaignArchive{
  const document=parseCoreCreation(input);
  if(document.status!=='admitted')throw new Error('角色尚未经明确准入，不能建立正式人物卡。');
  assertArcaneCreationLedger(document);
  return parseCoreCampaignArchive(newCoreCampaignArchive(createRuntimeFromAdmittedCoreCreation({document})));
}
export type CreationCampaignWriter=(slot:CampaignSlot,archive:CoreCampaignArchive,expectedToken:null)=>Promise<CampaignSave>;
export async function enterCreatedCharacter(input:CoreCreation,save:CreationCampaignWriter){
  const archive=campaignFromCreatedCharacter(input),slot={characterId:archive.runtime.transaction.characterId,branchId:archive.runtime.transaction.branchId};
  const result=await save(slot,archive,null);
  if(result.status!=='saved')throw new Error(`未覆盖已有角色；创建进度仍保留。${result.reason}`);
  return {archive,slot,url:`/character/sheet/?${new URLSearchParams({character:slot.characterId,branch:slot.branchId})}`};
}
