import type {CoreCampaignArchive} from './core-campaign-runtime';
export interface CoreCompletedRestReceipt {
  actionId:string;actorId:string;episodeId:string;restActivityId:string;
  startMinute:number;endMinuteExclusive:number;completedThroughMinute:number;
  consequencePolicy:'legacy'|'v1'|'v2';
}
/** Read-only projection from immutable completion-event snapshots, not the
 * replaceable current lifeRecovery field. Caller supplies a replay-validated archive.
 * Heal is not a completed full rest and is intentionally excluded.
 */
export function completedCoreRestHistory(archive:CoreCampaignArchive):CoreCompletedRestReceipt[]{
  const result:CoreCompletedRestReceipt[]=[];
  const eventsByCommand=new Map<string,typeof archive.runtime.transaction.events>();
  for(const event of archive.runtime.transaction.events)if(event.type==='character.module-replaced'){
    const group=eventsByCommand.get(event.commandId)??[];group.push(event);eventsByCommand.set(event.commandId,group);
  }
  for(const action of archive.actions){
    if(action.intent.type!=='complete-zero-hp-rest')continue;
    const events=eventsByCommand.get(action.id)??[];
    if(events.length!==1)throw new Error('Rest completion lacks a unique historical module event.');
    const payload=events[0].payload as unknown as {id?:string;data?:{lifeRecovery?:{episodeId?:unknown;restActivityId?:unknown;startMinute?:unknown;endMinuteExclusive?:unknown;completed?:unknown;resolution?:unknown}}};
    const recovery=payload.data?.lifeRecovery;
    if(payload.id!=='core-advancement'||!recovery||recovery.completed!==true||recovery.resolution
      ||typeof recovery.episodeId!=='string'||!recovery.episodeId.trim()||typeof recovery.restActivityId!=='string'||!recovery.restActivityId.trim()
      ||!Number.isSafeInteger(recovery.startMinute)||!Number.isSafeInteger(recovery.endMinuteExclusive)
      ||(recovery.startMinute as number)<0||(recovery.endMinuteExclusive as number)<=(recovery.startMinute as number)
      ||action.intent.completedThroughMinute<(recovery.endMinuteExclusive as number))throw new Error('Historical full-rest completion facts are inconsistent.');
    result.push({actionId:action.id,actorId:action.actorId,episodeId:recovery.episodeId,restActivityId:recovery.restActivityId,
      startMinute:recovery.startMinute as number,endMinuteExclusive:recovery.endMinuteExclusive as number,
      completedThroughMinute:action.intent.completedThroughMinute,consequencePolicy:action.intent.consequencePolicy??'legacy'});
  }
  return result;
}
