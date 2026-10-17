import { parseCoreCreation, type CoreCreation } from './core-create';
import type { CoreAdvancementState } from './core-advancement';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { coreWeaponProficiencySlots } from '../engine/core-weapon-proficiency';
import { projectCapabilitiesForPlayer } from '../engine/core-class-capabilities';
import { calculateCoreSpellCapacity } from '../engine/core-spell-capacity';
import type { CoreSpellCastingClassId } from '../rules/core-spell-capacity';

/** Recomputed guidance only: never writes capability grants or consumes spell-learning rolls. */
export function deriveCoreGrowthChecklist(creation:CoreCreation,state:CoreAdvancementState,selectedWeaponIds?:readonly string[]){
  const document=parseCoreCreation(creation),candidate=document.candidate;
  if(!candidate||candidate.classIds.length!==1||candidate.classIds[0]!==state.classId)throw new Error('Growth state does not match the creation career.');
  const scores=evaluateCoreEligibility(candidate).adjustedScores;
  const initial=coreWeaponProficiencySlots(state.classId,1),current=coreWeaponProficiencySlots(state.classId,state.level);
  const abilities=projectCapabilitiesForPlayer(state.classId,state.level);
  const baseline=projectCapabilitiesForPlayer(state.classId,1);
  const changes=abilities.filter(ability=>!baseline.some(previous=>previous.id===ability.id&&JSON.stringify(previous.value)===JSON.stringify(ability.value)));
  const tasks:{id:string;message:string;sourceIds:readonly string[]}[]=[];
  const unfilled=selectedWeaponIds?current.totalSlots-new Set(selectedWeaponIds).size:current.totalSlots-initial.totalSlots;
  if(unfilled>0)tasks.push({id:'weapon-proficiency-growth',message:`当前还有 ${unfilled} 个武器熟练位需要记录实际选择与职业许可。`,sourceIds:current.sourceIds});
  for(const ability of changes)tasks.push({id:`capability:${ability.id}`,message:`检查职业能力变化：${ability.id}。状态 ${ability.status}；尚未据此生成随从、据点或资源。`,sourceIds:ability.sourceIds});
  let capacity:ReturnType<typeof calculateCoreSpellCapacity>|null=null;
  if(['cleric','druid','paladin','ranger','magic-user','illusionist'].includes(state.classId)){
    const input={careerId:state.id,classId:state.classId as CoreSpellCastingClassId,model:'single' as const,intelligence:scores.INT,wisdom:scores.WIS};
    capacity=calculateCoreSpellCapacity({...input,level:state.level});
    const start=calculateCoreSpellCapacity({...input,level:1});
    if(capacity.status==='needs-dm')tasks.push({id:'spell-capacity-review',message:capacity.reason,sourceIds:capacity.sourceIds});
    else if(start.status!=='needs-dm'&&JSON.stringify(capacity.tracks)!==JSON.stringify(start.tracks))tasks.push({id:'spell-growth',message:'法术容量较一级已有变化；需分别完成实际取得、Chance to Know（适用职业）及准备，容量不授予法术。',sourceIds:capacity.tracks.flatMap(track=>track.sourceIds)});
  }
  return {classId:state.classId,level:state.level,weaponSlots:current,abilities,capacity,tasks,status:tasks.length?'growth-review-required' as const:'no-new-growth-tasks' as const};
}
