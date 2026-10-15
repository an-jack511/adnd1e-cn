import { calculateCoreSpellCapacity, preparedCapacityByLevel } from '../engine/core-spell-capacity';
import { createCoreSpellLedger, recordDivineGrant, recordRecoverySession, projectSpellLedgerForPlayer, type DivineGrantRecord } from '../engine/core-spell-ledger';
import { parseCoreCreation, recordCreationTask, type CoreCreation } from './core-create';
import { evaluateCoreEligibility } from '../engine/core-eligibility';

/** Creation-only adapter. Grants are explicit DM facts; spell capacity is recomputed. */
export function recordCoreDivineCreation(document:CoreCreation,input:{
  grants:readonly DivineGrantRecord[];restHours:number;prayerMinutes:number;completedAt:string;sessionId:string;
}){
  const current=parseCoreCreation(document),candidate=current.candidate;
  if(!candidate||candidate.classIds.length!==1||!['cleric','druid'].includes(candidate.classIds[0]))throw new Error('Divine creation requires a single cleric or druid career.');
  const classId=candidate.classIds[0] as 'cleric'|'druid',scores=evaluateCoreEligibility(candidate).adjustedScores;
  const capacity=calculateCoreSpellCapacity({careerId:classId,classId,level:1,model:'single',intelligence:scores.INT,wisdom:scores.WIS});
  const limits=preparedCapacityByLevel(capacity,classId);
  if(!input.grants.length)throw new Error('Record at least one divine grant for initial preparation.');
  let ledger=createCoreSpellLedger({id:`${current.id}:spells`,characterId:current.id,careerId:classId,tradition:classId});
  for(const grant of input.grants)ledger=recordDivineGrant(ledger,grant);
  const requested=input.grants.filter(grant=>grant.status==='granted'&&grant.grantedSpell).map(grant=>({copyId:`${input.sessionId}:${grant.id}`,spell:grant.grantedSpell!,preparedFrom:{kind:'divine-grant' as const,id:grant.id}}));
  if(!requested.length)throw new Error('No granted divine spells are available for preparation.');
  ledger=recordRecoverySession(ledger,{id:input.sessionId,requested,actualRestHours:input.restHours,actualStudyOrPrayerMinutes:input.prayerMinutes,interruption:'none',completedAt:input.completedAt,preparedCapacityByLevel:limits});
  const session=ledger.recoverySessions.at(-1)!;
  const sourceIds=[...new Set(['project:core-divine-creation',...ledger.divineGrants.flatMap(grant=>grant.requestedSpell.sourceIds),...(capacity.status==='needs-dm'?capacity.sourceIds:capacity.tracks.flatMap(track=>track.sourceIds))])];
  return {document:recordCreationTask(current,'initial-spells',{status:session.status==='completed'?'needs-dm':'pending',sourceIds,note:session.status==='completed'?'神术授予与开局祈祷已记录，待 DM 审核。':`神术准备尚未完成：${session.status}`,facts:{capacity,ledger:projectSpellLedgerForPlayer(ledger)}}),dmLedger:ledger};
}
