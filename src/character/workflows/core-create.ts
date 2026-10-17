import { z } from 'zod';
import { evaluateCoreEligibility, type CoreCandidate, type CoreEligibilityResult } from '../engine/core-eligibility';
import { coreAbilityIds, coreAlignmentIds, coreClassIds, coreRaceIds } from '../rules/core-eligibility';
const abilityValue=z.number().int().min(3).max(18);
const score=z.object({STR:abilityValue,INT:abilityValue,WIS:abilityValue,DEX:abilityValue,CON:abilityValue,CHA:abilityValue}).strict();
const candidate=z.object({raceId:z.enum(coreRaceIds),subraceId:z.string().min(1).nullable(),sex:z.enum(['male','female']),alignmentId:z.enum(coreAlignmentIds),
  initialScores:score,classIds:z.array(z.enum(coreClassIds)).min(1).max(3),mode:z.enum(['single','multiclass']),campaign:z.object({allowedRaceIds:z.array(z.enum(coreRaceIds)).min(1),bardEnabled:z.boolean()}).strict(),profile:z.object({background:z.string().max(12000),portraitDataUrl:z.string().max(2500000).nullable()}).strict().optional()}).strict();
const taskIds=['hp','money','languages','proficiencies','equipment','initial-spells','psionics','admission-context'] as const;
const task=z.object({id:z.enum(taskIds),status:z.enum(['pending','complete','not-applicable','needs-dm']),sourceIds:z.array(z.string().min(1)),note:z.string(),facts:z.record(z.string(),z.unknown()).nullable()}).strict();
const decision=z.object({issueId:z.string().min(1),choice:z.enum(['accepted-exception','rejected']),actorId:z.string().min(1),reason:z.string().min(1),sourceIds:z.array(z.string().min(1))}).strict();
export const coreCreationSchema=z.object({format:z.literal('adnd1e-core-creation'),schemaVersion:z.literal('1.0.0'),id:z.string().min(1),revision:z.number().int().nonnegative(),name:z.string().max(200),
  generation:z.object({draftId:z.string().min(1),draftRevision:z.number().int().nonnegative(),batchId:z.string().min(1),method:z.enum(['DMG:I','DMG:II','DMG:III','DMG:IV']),scores:score}).strict(),
  candidate:candidate.nullable(),evaluation:z.unknown().nullable(),decisions:z.array(decision),tasks:z.array(task).length(taskIds.length),status:z.enum(['selection','blocked','needs-dm','incomplete','ready-for-review','admitted']),admission:z.object({actorId:z.string().min(1),at:z.string().min(1),scope:z.string().min(1)}).strict().nullable()}).strict();
export type CoreCreation=z.infer<typeof coreCreationSchema>;
export function newCoreCreation(input:{id?:string;name:string;generation:CoreCreation['generation']}):CoreCreation{
  return coreCreationSchema.parse({format:'adnd1e-core-creation',schemaVersion:'1.0.0',id:input.id??crypto.randomUUID(),revision:0,name:input.name,generation:input.generation,candidate:null,evaluation:null,decisions:[],
    tasks:taskIds.map(id=>({id,status:'pending',sourceIds:[],note:'尚未完成对应核心流程。',facts:null})),status:'selection',admission:null});
}
function unresolved(evaluation:CoreEligibilityResult,decisions:CoreCreation['decisions']){
  const accepted=new Set(decisions.filter(d=>d.choice==='accepted-exception').map(d=>d.issueId));return evaluation.issues.filter(i=>!accepted.has(i.id));
}
function derive(document:CoreCreation):CoreCreation{
  if(new Set(document.tasks.map(t=>t.id)).size!==taskIds.length)throw new Error('Creation tasks must contain each required task exactly once.');
  for(const task of document.tasks){
    if(task.status==='complete'&&task.facts===null)throw new Error('Completed task needs recorded facts.');
    if((task.status==='complete'||task.status==='not-applicable')&&!task.sourceIds.length)throw new Error('Resolved creation task needs sources.');
    if(task.id==='psionics'&&task.status==='complete'&&task.facts?.result&&typeof task.facts.result==='object'){
      const result=task.facts.result as {status?:string};
      if(!['disabled','ineligible','no-potential'].includes(result.status??''))throw new Error('Psionic potential or generated counts cannot certify complete identities and acquisition.');
    }
  }
  if(!document.candidate){if(document.admission)throw new Error('Admission requires a selected candidate.');return coreCreationSchema.parse({...document,evaluation:null,status:'selection'});}
  if(coreAbilityIds.some(id=>document.candidate!.initialScores[id]!==document.generation.scores[id]))throw new Error('Candidate abilities must match recorded generation scores.');
  const evaluation=evaluateCoreEligibility(document.candidate as CoreCandidate),open=unresolved(evaluation,document.decisions);
  const baseStatus=open.some(i=>i.verdict==='forbidden')?'blocked':open.length?'needs-dm':document.tasks.some(t=>t.status==='pending'||t.status==='needs-dm')?'incomplete':'ready-for-review';
  if(document.admission&&baseStatus!=='ready-for-review')throw new Error('Admitted creation has unresolved or incomplete requirements.');
  return coreCreationSchema.parse({...document,evaluation,status:document.admission?'admitted':baseStatus});
}
export function selectCoreCandidate(document:CoreCreation,value:CoreCandidate):CoreCreation{
  if(document.status==='admitted')throw new Error('Admitted creation cannot be rewritten; create a correction event.');
  const selected=candidate.parse(value);
  const unchanged=document.candidate!==null&&JSON.stringify(document.candidate)===JSON.stringify(selected);
  return derive({...document,candidate:selected,decisions:unchanged?document.decisions:[],tasks:unchanged?document.tasks:taskIds.map(id=>({id,status:'pending' as const,sourceIds:[],note:'身份或属性选择已变化，需要重新完成对应创建流程。',facts:null})),revision:document.revision+1,admission:null});
}
export function recordCreationTask(document:CoreCreation,id:typeof taskIds[number],value:Omit<CoreCreation['tasks'][number],'id'>):CoreCreation{
  if(document.status==='admitted')throw new Error('Admitted creation cannot be rewritten.');
  if(value.status==='complete'&&value.facts===null)throw new Error('Completed task needs recorded facts.');
  const tasks=document.tasks.map(t=>t.id===id?{id,...structuredClone(value)}:id==='money'&&t.id==='equipment'?{id:t.id,status:'pending' as const,sourceIds:t.sourceIds,note:'起始金钱已重新记录，请重新核算采购与余额；旧采购仅保留供核对。',facts:t.facts}:t);return derive({...document,tasks,revision:document.revision+1});
}
export function decideEligibilityIssue(document:CoreCreation,value:CoreCreation['decisions'][number]):CoreCreation{
  if(document.status==='admitted'||!document.candidate)throw new Error('No pending candidate decision.');
  const evaluation=evaluateCoreEligibility(document.candidate as CoreCandidate);
  if(!evaluation.issues.some(i=>i.id===value.issueId))throw new Error('Decision does not match a current eligibility issue.');
  const decisions=[...document.decisions.filter(d=>d.issueId!==value.issueId),structuredClone(value)];return derive({...document,decisions,revision:document.revision+1});
}
export function admitCoreCreation(document:CoreCreation,value:{actorId:string;at:string;scope:string}):CoreCreation{
  const current=derive(document);if(current.status!=='ready-for-review')throw new Error('Creation is not complete or has unresolved eligibility.');
  return coreCreationSchema.parse({...current,revision:current.revision+1,status:'admitted',admission:value});
}
export function approveCreationTask(document:CoreCreation,id:typeof taskIds[number],review:{actorId:string;at:string;reason:string;sourceIds:string[]}):CoreCreation{
  const current=parseCoreCreation(document);
  if(current.status==='admitted')throw new Error('Admitted creation cannot be rewritten.');
  const task=current.tasks.find(item=>item.id===id);
  if(!task||task.status!=='needs-dm'||task.facts===null)throw new Error('Only a needs-dm task with recorded facts can be approved.');
  if(id==='psionics')throw new Error('Psionic eligibility approval must return to generation; it does not complete modes and disciplines.');
  if(!review.actorId.trim()||!review.at.trim()||!review.reason.trim()||!review.sourceIds.length||review.sourceIds.some(id=>!id.trim()))throw new Error('Task approval requires DM identity, time, reason and sources.');
  return recordCreationTask(current,id,{status:'complete',sourceIds:[...new Set([...task.sourceIds,...review.sourceIds])],note:`${task.note} DM 确认：${review.reason}`,facts:{...structuredClone(task.facts),dmReview:structuredClone(review)}});
}
export function parseCoreCreation(value:unknown):CoreCreation{return derive(coreCreationSchema.parse(value));}
