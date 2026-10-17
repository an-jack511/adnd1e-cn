import {effectiveCoreActivityEnd,type CoreCampaignCalendar,type CalendarActivity} from './core-calendar';
type Purpose='training'|'zero-hp-rest';
export interface ActivityConsequenceFinding {protectedActivityId:string;otherActivityId:string;purpose:Purpose;status:'known-conflict'|'needs-dm';sourceIds:string[]}
function classify(protectedActivity:CalendarActivity,other:CalendarActivity,purpose:Purpose):ActivityConsequenceFinding{
  const known=purpose==='training'?['adventuring','travel'].includes(other.kind):['combat','spell-use','study','language-study','spell-research'].includes(other.kind);
  return {protectedActivityId:protectedActivity.id,otherActivityId:other.id,purpose,status:known?'known-conflict':'needs-dm',sourceIds:[purpose==='training'?'dmg:86:gaining-levels':'dmg:82:zero-hit-points']};
}
/** Completion consequences are separate from permission to record overlapping facts. */
export function inspectCoreActivityConsequences(calendar:CoreCampaignCalendar,activityIds:readonly string[],purpose:Purpose){
  if(purpose!=='training'&&purpose!=='zero-hp-rest')throw new Error('Unknown protected activity purpose.');
  const findings:ActivityConsequenceFinding[]=[];
  for(const id of activityIds){
    const protectedActivity=calendar.activities.find(activity=>activity.id===id);
    if(!protectedActivity||protectedActivity.kind!==(purpose==='training'?'training':'rest'))throw new Error('Unknown or mismatched protected activity.');
    const end=effectiveCoreActivityEnd(calendar,protectedActivity);
    if(end<=protectedActivity.startMinute)continue;
    for(const other of calendar.activities){
      if(other.id===id||other.actorId!==protectedActivity.actorId||other.startMinute>=end||effectiveCoreActivityEnd(calendar,other)<=protectedActivity.startMinute||effectiveCoreActivityEnd(calendar,other)<=other.startMinute)continue;
      findings.push(classify(protectedActivity,other,purpose));
    }
  }
  const unresolved=findings.filter(finding=>!calendar.consequenceRulings?.some(ruling=>ruling.protectedActivityId===finding.protectedActivityId&&ruling.otherActivityId===finding.otherActivityId&&ruling.purpose===purpose
    &&ruling.id?.trim()&&ruling.actorId?.trim()&&ruling.reason?.trim()&&ruling.sourceIds?.length&&finding.sourceIds.every(id=>ruling.sourceIds.includes(id))
    &&((ruling.disposition==='rule-exception'&&ruling.ruleStatus==='campaign-exception-not-raw')||(ruling.disposition==='compatible-facts'&&ruling.ruleStatus==='dm-factual-adjudication'))
    &&(finding.status!=='known-conflict'||ruling.disposition==='rule-exception')));
  return {findings,unresolved};
}
export function assertCoreActivityConsequencesResolved(calendar:CoreCampaignCalendar,activityIds:readonly string[],purpose:Purpose){
  const result=inspectCoreActivityConsequences(calendar,activityIds,purpose);
  if(result.unresolved.length)throw new Error('Unresolved activity consequences prevent completion; an overlap note alone does not preserve training/rest benefits.');
  return result;
}
export function adjudicateCoreActivityConsequence(calendar:CoreCampaignCalendar,input:{id:string;protectedActivityId:string;otherActivityId:string;purpose:Purpose;disposition:'compatible-facts'|'rule-exception';actorId:string;reason:string;evidenceSourceId:string}):CoreCampaignCalendar{
  if(!input.id?.trim()||!input.actorId?.trim()||!input.reason?.trim()||!input.evidenceSourceId?.trim())throw new Error('Consequence ruling requires identity, DM reason and factual evidence.');
  if(!['compatible-facts','rule-exception'].includes(input.disposition))throw new Error('Unknown consequence disposition.');
  const finding=inspectCoreActivityConsequences(calendar,[input.protectedActivityId],input.purpose).findings.find(entry=>entry.otherActivityId===input.otherActivityId);
  if(!finding)throw new Error('No actual matching overlap to adjudicate.');
  if(finding.status==='known-conflict'&&input.disposition!=='rule-exception')throw new Error('A known printed conflict requires an explicit non-RAW rule exception, not a compatibility note.');
  if(calendar.consequenceRulings?.some(entry=>entry.id===input.id||(entry.protectedActivityId===input.protectedActivityId&&entry.otherActivityId===input.otherActivityId&&entry.purpose===input.purpose)))throw new Error('Duplicate consequence ruling.');
  const {evidenceSourceId,...facts}=input;
  return {...structuredClone(calendar),consequenceRulings:[...structuredClone(calendar.consequenceRulings??[]),{...structuredClone(facts),sourceIds:[...finding.sourceIds,evidenceSourceId],ruleStatus:input.disposition==='rule-exception'?'campaign-exception-not-raw':'dm-factual-adjudication'}]};
}
