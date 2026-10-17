import {effectiveCoreActivityEnd,type CoreCampaignCalendar} from './core-calendar';
export interface TrainingLocationBoundary {fromActivityId:string;toActivityId:string;subjectId:string;fromLocationId:string;toLocationId:string;atMinute:number}
export function inspectCoreTrainingLocationBoundaries(calendar:CoreCampaignCalendar,activityIds:readonly string[]){
  const boundaries:TrainingLocationBoundary[]=[];
  for(let index=1;index<activityIds.length;index++){
    const from=calendar.activities.find(activity=>activity.id===activityIds[index-1]),to=calendar.activities.find(activity=>activity.id===activityIds[index]);
    if(!from||!to||from.kind!=='training'||to.kind!=='training'||from.actorId!==to.actorId)throw new Error('Training location boundary requires matching actor and training intervals.');
    if(effectiveCoreActivityEnd(calendar,from)!==to.startMinute)throw new Error('Training location boundary must be time-contiguous.');
    if(from.locationId!==to.locationId)boundaries.push({fromActivityId:from.id,toActivityId:to.id,subjectId:from.actorId,fromLocationId:from.locationId,toLocationId:to.locationId,atMinute:to.startMinute});
  }
  const unresolved=boundaries.filter(boundary=>!calendar.locationTransitions?.some(entry=>entry.fromActivityId===boundary.fromActivityId&&entry.toActivityId===boundary.toActivityId
    &&entry.subjectId===boundary.subjectId&&entry.fromLocationId===boundary.fromLocationId&&entry.toLocationId===boundary.toLocationId&&entry.atMinute===boundary.atMinute
    &&entry.continuityConfirmed===true&&['instantaneous-movement','same-physical-place'].includes(entry.method)&&entry.ruleStatus==='dm-factual-adjudication'
    &&entry.id?.trim()&&entry.actorId?.trim()&&entry.reason?.trim()&&entry.sourceIds?.includes('dmg:37:time-in-campaign')));
  return {boundaries,unresolved};
}
/** Records a DM-confirmed real boundary fact, not a free teleport or an
 * exception to the prohibition on traveling during a continuous course. */
export function recordCoreTrainingLocationTransition(calendar:CoreCampaignCalendar,input:{id:string;fromActivityId:string;toActivityId:string;method:'instantaneous-movement'|'same-physical-place';continuityConfirmed:boolean;actorId:string;reason:string;evidenceSourceId:string}):CoreCampaignCalendar{
  if(!input.id?.trim()||!input.actorId?.trim()||!input.reason?.trim()||!input.evidenceSourceId?.trim()||input.continuityConfirmed!==true)throw new Error('Location transition requires actual evidence, DM explanation and explicit continuity confirmation.');
  if(!['instantaneous-movement','same-physical-place'].includes(input.method))throw new Error('Ordinary travel cannot be disguised as an instantaneous boundary.');
  const boundary=inspectCoreTrainingLocationBoundaries(calendar,[input.fromActivityId,input.toActivityId]).boundaries[0];
  if(!boundary)throw new Error('No changed-location training boundary exists.');
  if(calendar.locationTransitions?.some(entry=>entry.id===input.id||(entry.fromActivityId===input.fromActivityId&&entry.toActivityId===input.toActivityId)))throw new Error('Duplicate location transition.');
  return {...structuredClone(calendar),locationTransitions:[...structuredClone(calendar.locationTransitions??[]),{...boundary,id:input.id,method:input.method,continuityConfirmed:true,actorId:input.actorId,reason:input.reason,sourceIds:['dmg:37:time-in-campaign','dmg:86:gaining-levels',input.evidenceSourceId],ruleStatus:'dm-factual-adjudication'}]};
}
