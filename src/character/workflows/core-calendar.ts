import { assessOverlappingActivityKinds } from '../engine/core-time-rest';
import type { CoreActivityKind } from '../rules/core-time-rest';

export interface CalendarActivity{
  id:string;actorId:string;kind:CoreActivityKind;startMinute:number;endMinuteExclusive:number;
  locationId:string;sourceIds:string[];
}
export interface CoreCampaignCalendar{
  schemaVersion:1;minutesPerDay:number;daysPerWeek:number;activities:CalendarActivity[];
  overlapRulings:{leftId:string;rightId:string;actorId:string;reason:string;sourceIds:string[]}[];
  /** Amendments retain the original planned interval instead of erasing it. */
  earlyEndings?:{activityId:string;endedAtMinute:number;eventId:string;actorId:string;reason:string;sourceIds:string[]}[];
  consequenceRulings?:{id:string;protectedActivityId:string;otherActivityId:string;purpose:'training'|'zero-hp-rest';disposition:'compatible-facts'|'rule-exception';actorId:string;reason:string;sourceIds:string[];ruleStatus:'dm-factual-adjudication'|'campaign-exception-not-raw'}[];
  locationTransitions?:{id:string;fromActivityId:string;toActivityId:string;subjectId:string;fromLocationId:string;toLocationId:string;atMinute:number;method:'instantaneous-movement'|'same-physical-place';continuityConfirmed:true;actorId:string;reason:string;sourceIds:string[];ruleStatus:'dm-factual-adjudication'}[];
}
export function effectiveCoreActivityEnd(calendar:CoreCampaignCalendar,activity:CalendarActivity):number{
  return calendar.earlyEndings?.find(entry=>entry.activityId===activity.id)?.endedAtMinute??activity.endMinuteExclusive;
}
export function endCoreCalendarActivity(calendar:CoreCampaignCalendar,input:NonNullable<CoreCampaignCalendar['earlyEndings']>[number]):CoreCampaignCalendar{
  const activity=calendar.activities.find(entry=>entry.id===input.activityId);
  if(!activity)throw new Error('Unknown calendar activity to end.');
  integer(input.endedAtMinute,'activity end minute');
  if(input.endedAtMinute<activity.startMinute||input.endedAtMinute>=activity.endMinuteExclusive)throw new Error('Early end must be within the original activity interval.');
  if(!input.eventId?.trim()||!input.actorId?.trim()||!input.reason?.trim()||!input.sourceIds.length||input.sourceIds.some(id=>!id.trim()))throw new Error('Activity ending needs identity, DM reason and sources.');
  if(calendar.earlyEndings?.some(entry=>entry.activityId===input.activityId||entry.eventId===input.eventId))throw new Error('Activity already ended or ending event duplicated.');
  return {...structuredClone(calendar),earlyEndings:[...structuredClone(calendar.earlyEndings??[]),structuredClone(input)]};
}
function integer(value:number,label:string,min=0){if(!Number.isSafeInteger(value)||value<min)throw new Error(`${label} must be a safe integer >= ${min}.`);}
export function newCoreCalendar(input:{minutesPerDay:number;daysPerWeek:number}):CoreCampaignCalendar{
  integer(input.minutesPerDay,'minutes per day',1);integer(input.daysPerWeek,'days per week',1);
  integer(input.minutesPerDay*input.daysPerWeek,'minutes per week',1);
  return {minutesPerDay:input.minutesPerDay,daysPerWeek:input.daysPerWeek,schemaVersion:1,activities:[],overlapRulings:[]};
}
export function scheduleCoreActivity(calendar:CoreCampaignCalendar,activity:CalendarActivity,rulings:CoreCampaignCalendar['overlapRulings']=[]):CoreCampaignCalendar{
  newCoreCalendar(calendar);integer(activity.startMinute,'start minute');integer(activity.endMinuteExclusive,'end minute',1);
  if(activity.endMinuteExclusive<=activity.startMinute||!activity.id.trim()||!activity.actorId.trim()||!activity.locationId.trim()||!activity.sourceIds.length||activity.sourceIds.some(id=>!id.trim()))throw new Error('Activity requires identity, actor, positive interval, location and sources.');
  if(calendar.activities.some(item=>item.id===activity.id))throw new Error('Duplicate calendar activity.');
  assessOverlappingActivityKinds(activity,activity); // Validate kind even with an empty calendar.
  const accepted:CoreCampaignCalendar['overlapRulings']=[];
  for(const previous of calendar.activities){
    if(previous.actorId!==activity.actorId||previous.startMinute>=activity.endMinuteExclusive||activity.startMinute>=effectiveCoreActivityEnd(calendar,previous)||effectiveCoreActivityEnd(calendar,previous)<=previous.startMinute)continue;
    const finding=assessOverlappingActivityKinds(previous,activity);
    const ruling=rulings.find(item=>item.leftId===previous.id&&item.rightId===activity.id&&item.actorId.trim()&&item.reason.trim()&&item.sourceIds.length&&item.sourceIds.every(id=>id.trim()));
    if(!ruling)throw new Error(`${finding.status}: overlapping ${previous.kind} and ${activity.kind} require a recorded DM ruling, including any explicit exception.`);
    accepted.push(structuredClone(ruling));
  }
  if(accepted.length!==rulings.length)throw new Error('Overlap ruling does not match a current conflict.');
  return {...structuredClone(calendar),activities:[...structuredClone(calendar.activities),structuredClone(activity)],overlapRulings:[...structuredClone(calendar.overlapRulings),...accepted]};
}
export function trainingSegmentMinutes(calendar:CoreCampaignCalendar,weeksNumerator:number,weeksDenominator:number):number{
  integer(weeksNumerator,'weeks numerator',1);integer(weeksDenominator,'weeks denominator',1);
  const numerator=weeksNumerator*calendar.minutesPerDay*calendar.daysPerWeek;integer(numerator,'training minute numerator',1);
  if(numerator%weeksDenominator!==0)throw new Error('Training interval is finer than calendar minute precision; keep the rational duration for DM resolution.');
  return numerator/weeksDenominator;
}
