import type { InitialCoreClassId } from '../rules/core-progression';
import { coreWeaponProficiencyRules } from '../rules/core-weapon-proficiency';
export function coreWeaponProficiencySlots(classId:InitialCoreClassId,level:number){
  if(!Number.isSafeInteger(level)||level<1)throw new Error('Level must be a positive integer.');
  const rule=coreWeaponProficiencyRules[classId],added=Math.floor((level-1)/rule.levelsPerAddedSlot);
  return{classId,level,initialSlots:rule.initialSlots,addedSlots:added,totalSlots:rule.initialSlots+added,nonProficiencyPenalty:rule.nonProficiencyPenalty,sourceIds:[...rule.sourceIds]};
}
export function validateCoreWeaponSelections(input:{classId:InitialCoreClassId;level:number;weaponIds:readonly string[]}){
  const plan=coreWeaponProficiencySlots(input.classId,input.level);if(new Set(input.weaponIds).size!==input.weaponIds.length)throw new Error('A weapon proficiency cannot fill the same slot twice.');
  if(input.weaponIds.some(id=>!id.trim()))throw new Error('Weapon proficiency IDs must be non-empty.');
  if(input.weaponIds.length>plan.totalSlots)throw new Error(`Selected ${input.weaponIds.length} weapons for ${plan.totalSlots} slots.`);
  return{...plan,weaponIds:[...input.weaponIds],unfilledSlots:plan.totalSlots-input.weaponIds.length,weaponLegality:'requires-class-weapon-rule-pack' as const,status:input.weaponIds.length===plan.totalSlots?'needs-rule-validation' as const:'incomplete' as const};
}
