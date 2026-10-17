import {checkCoreAdvancement} from '../engine/core-progression';
import type {AdventureAssessment,CoreAdvancementState} from './core-advancement';

/** Actual past awards only. These are referenceable facts, not newly awarded XP. */
export function recordedCoreAdventureAssessments(state:CoreAdvancementState):AdventureAssessment[]{
  return state.history.filter(entry=>entry.type==='experience.awarded').map(entry=>{
    if(typeof entry.id!=='string'||!entry.id.trim()||!Number.isSafeInteger(entry.xp)||(entry.xp as number)<0
      ||!['E','S','F','P'].includes(entry.rating as string)||!Array.isArray(entry.sourceIds)
      ||entry.sourceIds.some(id=>typeof id!=='string'||!id.trim()))throw new Error('Recorded adventure assessment is malformed.');
    return {id:entry.id,xp:entry.xp as number,rating:entry.rating as AdventureAssessment['rating'],sourceIds:[...entry.sourceIds]};
  });
}

/** The full basis of the last completed course, not a cherry-picked subset. */
export function previousCoreCourseAssessments(state:CoreAdvancementState):AdventureAssessment[]{
  const end=state.history.findLastIndex(entry=>entry.type==='advancement.awarded'&&entry.targetLevel===state.level);
  if(end<0)return [];
  const start=state.history.slice(0,end).findLastIndex(entry=>entry.type==='advancement.awarded');
  const course=state.history.slice(start+1,end),adopted=course.findLast(entry=>entry.type==='advancement.overrun-basis-adopted');
  const ids=adopted?.assessmentIds??course.filter(entry=>entry.type==='experience.awarded').map(entry=>entry.id);
  if(!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new Error('Previous course assessment basis is missing or ambiguous.');
  const recorded=recordedCoreAdventureAssessments(state);
  return ids.map(id=>{const matches=recorded.filter(entry=>entry.id===id);if(matches.length!==1)throw new Error('Assessment reference is missing or ambiguous; no rating may be invented.');return matches[0];});
}

/** DMG86 does not settle every single-batch multi-threshold case. This named
 * campaign adoption reuses selected real ratings, without changing XP or
 * pretending a new adventure occurred. It is not a unique-RAW assertion.
 */
export function adoptCoreOverrunTrainingBasis(state:CoreAdvancementState,input:{
  interpretation:'reuse-recorded-adventure-ratings';assessmentIds:readonly string[];actorId:string;reason:string;
}):CoreAdvancementState{
  if(state.status!=='adventuring'||state.candidate||state.assessments.length)throw new Error('Overrun basis requires an unopened next course with no unconsumed ratings.');
  if(input.interpretation!=='reuse-recorded-adventure-ratings'||!input.actorId?.trim()||!input.reason?.trim())throw new Error('Explicit campaign interpretation, DM actor and reason are required.');
  if(!state.history.some(entry=>entry.type==='advancement.awarded'&&entry.targetLevel===state.level))throw new Error('Overrun continuation requires an actual prior level award.');
  const check=checkCoreAdvancement({classId:state.classId,currentLevel:state.level,xp:state.xp,levelCap:state.levelCap});
  if(check.status==='not-eligible'||check.status==='unknown')throw new Error('Existing XP does not establish another advancement candidate.');
  if(!Array.isArray(input.assessmentIds)||!input.assessmentIds.length||new Set(input.assessmentIds).size!==input.assessmentIds.length)throw new Error('Choose distinct recorded adventure assessment IDs.');
  const recorded=recordedCoreAdventureAssessments(state);
  const assessments=input.assessmentIds.map(id=>{
    const matches=recorded.filter(entry=>entry.id===id);
    if(matches.length!==1)throw new Error('Assessment reference is missing or ambiguous; no rating may be invented.');
    return matches[0];
  });
  const previous=previousCoreCourseAssessments(state);
  if(assessments.length!==previous.length||previous.some(entry=>!input.assessmentIds.includes(entry.id)))throw new Error('Reuse must preserve the full previous-course rating set, not select a favorable subset.');
  return {...state,revision:state.revision+1,assessments:structuredClone(assessments),history:[...state.history,{
    type:'advancement.overrun-basis-adopted',interpretation:input.interpretation,ruleStatus:'campaign-adoption-not-unique-raw',
    actorId:input.actorId,reason:input.reason,currentLevel:state.level,targetLevel:state.level+1,
    assessmentIds:[...input.assessmentIds],xpUnchanged:state.xp,sourceIds:['dmg:86:gaining-levels'],
  }]};
}
