import { calculateCoreSpellCapacity, preparedCapacityByLevel } from '../engine/core-spell-capacity';
import { createCoreSpellLedger, recordDivineGrant, recordRecoverySession, projectSpellLedgerForPlayer, type DivineGrantRecord } from '../engine/core-spell-ledger';
import { parseCoreCreation, recordCreationTask, type CoreCreation } from './core-create';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { coreDivineFirstLevelChoices } from '../rules/core-divine-first-level';

function portableLedger(ledger:Parameters<typeof projectSpellLedgerForPlayer>[0]){
  const projection=projectSpellLedgerForPlayer(ledger);
  return {...projection,schema:'adnd1e.spell-ledger-player-portable' as const,recoverySessions:projection.recoverySessions.map(({actualRestHours,...session})=>({...session,actualRestMinutes:session.actualRestMinutes??Math.round(actualRestHours!*60)}))};
}

/** Creation-only adapter. Grants are explicit DM facts; spell capacity is recomputed. */
export function recordCoreDivineCreation(document:CoreCreation,input:{
  grants:readonly DivineGrantRecord[];restHours:number;prayerMinutes:number;completedAt:string;sessionId:string;
}){
  const current=parseCoreCreation(document),candidate=current.candidate;
  if(!Number.isSafeInteger(Math.round(input.restHours*60))||!Number.isFinite(input.restHours)||input.restHours<0||Math.abs(input.restHours*60-Math.round(input.restHours*60))>1e-8||!Number.isSafeInteger(input.prayerMinutes)||input.prayerMinutes<0)throw new Error('Record rest and prayer with whole-minute precision.');
  if(!candidate||candidate.classIds.length!==1||!['cleric','druid'].includes(candidate.classIds[0]))throw new Error('Divine creation requires a single cleric or druid career.');
  const classId=candidate.classIds[0] as 'cleric'|'druid',scores=evaluateCoreEligibility(candidate).adjustedScores;
  const choices=coreDivineFirstLevelChoices(classId);
  for(const grant of input.grants)for(const spell of [grant.requestedSpell,grant.grantedSpell])if(spell){const known=choices.find(item=>item.definitionId===spell.definitionId);if(!known||JSON.stringify(known)!==JSON.stringify(spell))throw new Error('Initial divine spell must match the verified first-level class catalog.');}
  const capacity=calculateCoreSpellCapacity({careerId:classId,classId,level:1,model:'single',intelligence:scores.INT,wisdom:scores.WIS});
  const limits=preparedCapacityByLevel(capacity,classId);
  let ledger=createCoreSpellLedger({id:`${current.id}:spells`,characterId:current.id,careerId:classId,tradition:classId});
  if(!input.grants.length){
    const sourceIds=['project:core-divine-creation',...(capacity.status==='needs-dm'?capacity.sourceIds:capacity.tracks.flatMap(track=>track.sourceIds))];
    return {document:recordCreationTask(current,'initial-spells',{status:'needs-dm',sourceIds,note:'明确选择开局不准备神术，等待 DM 审核；没有创建可用副本。',facts:{capacity,ledger:portableLedger(ledger),preparedNone:true}}),dmLedger:ledger};
  }
  for(const grant of input.grants)ledger=recordDivineGrant(ledger,grant);
  const requested=input.grants.filter(grant=>grant.status==='granted'&&grant.grantedSpell).map(grant=>({copyId:`${input.sessionId}:${grant.id}`,spell:grant.grantedSpell!,preparedFrom:{kind:'divine-grant' as const,id:grant.id}}));
  if(!requested.length)throw new Error('No granted divine spells are available for preparation.');
  ledger=recordRecoverySession(ledger,{id:input.sessionId,requested,actualRestMinutes:Math.round(input.restHours*60),actualStudyOrPrayerMinutes:input.prayerMinutes,interruption:'none',completedAt:input.completedAt,preparedCapacityByLevel:limits});
  const session=ledger.recoverySessions.at(-1)!;
  const sourceIds=[...new Set(['project:core-divine-creation',...ledger.divineGrants.flatMap(grant=>grant.requestedSpell.sourceIds),...(capacity.status==='needs-dm'?capacity.sourceIds:capacity.tracks.flatMap(track=>track.sourceIds))])];
  return {document:recordCreationTask(current,'initial-spells',{status:session.status==='completed'?'needs-dm':'pending',sourceIds,note:session.status==='completed'?'神术授予与开局祈祷已记录，待 DM 审核。':`神术准备尚未完成：${session.status}`,facts:{capacity,ledger:portableLedger(ledger)}}),dmLedger:ledger};
}
