import {effectiveCoreActivityEnd,trainingSegmentMinutes,newCoreCalendar,type CoreCampaignCalendar} from './core-calendar';
import type {CoreAdvancementState} from './core-advancement';
import {assertCoreActivityConsequencesResolved} from './core-activity-consequences';
import {inspectCoreTrainingLocationBoundaries} from './core-training-location';
/** Validate recorded time coverage, not every possible travel/overlap exception. */
export function inspectCoreDatedTrainingCourse(state:CoreAdvancementState,calendar:CoreCampaignCalendar|null,actorId:string,options:{checkConsequences?:boolean;checkLocations?:boolean}={}){
  if(!calendar)throw new Error('Training award requires a configured campaign calendar and occupied intervals.');
  newCoreCalendar(calendar);
  if(!state.candidate?.training||!state.candidate.segments.length)throw new Error('Training has no recorded course segments.');
  const activities=state.candidate.segments.map(segment=>{
    const id=`${state.id}:training:${segment.id}`,matches=calendar.activities.filter(activity=>activity.id===id);
    if(matches.length!==1)throw new Error('Training segment lacks a unique occupied calendar interval; reconcile legacy progress first.');
    const activity=matches[0],minutes=trainingSegmentMinutes(calendar,segment.weeksNumerator,segment.weeksDenominator);
    if(activity.kind!=='training'||activity.actorId!==actorId||!activity.locationId.trim()
      ||!Number.isSafeInteger(activity.startMinute)||activity.startMinute<0||!Number.isSafeInteger(activity.endMinuteExclusive)
      ||!activity.sourceIds.includes('dmg:86:gaining-levels')||!activity.sourceIds.includes('dmg:37:time-in-campaign')
      ||activity.endMinuteExclusive-activity.startMinute!==minutes||effectiveCoreActivityEnd(calendar,activity)!==activity.endMinuteExclusive)throw new Error('Training interval actor, location, kind or full duration does not match recorded progress.');
    return activity;
  });
  for(let index=1;index<activities.length;index++)if(activities[index-1].endMinuteExclusive!==activities[index].startMinute)throw new Error('Training course intervals must be contiguous.');
  if(options.checkLocations!==false&&inspectCoreTrainingLocationBoundaries(calendar,activities.map(activity=>activity.id)).unresolved.length)throw new Error('Changed training locations require an explicit real movement or same-place boundary fact; no automatic teleport.');
  if(options.checkConsequences!==false)assertCoreActivityConsequencesResolved(calendar,activities.map(activity=>activity.id),'training');
  return {validationScope:'course-interval-coverage' as const,targetLevel:state.candidate.targetLevel,startMinute:activities[0].startMinute,
    completedAtMinute:activities.at(-1)!.endMinuteExclusive,activityIds:activities.map(activity=>activity.id),
    sourceIds:['dmg:86:gaining-levels','dmg:37:time-in-campaign']};
}
