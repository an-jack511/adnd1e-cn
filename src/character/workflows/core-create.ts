import { z } from 'zod';
import { evaluateCoreEligibility, type CoreCandidate, type CoreEligibilityResult } from '../engine/core-eligibility';
import { coreAbilityIds, coreAlignmentIds, coreClassIds, coreRaceIds } from '../rules/core-eligibility';
const abilityValue=z.number().int().min(3).max(18);
const score=z.object({STR:abilityValue,INT:abilityValue,WIS:abilityValue,DEX:abilityValue,CON:abilityValue,CHA:abilityValue}).strict();
const candidate=z.object({raceId:z.enum(coreRaceIds),subraceId:z.string().min(1).nullable(),sex:z.enum(['male','female']),alignmentId:z.enum(coreAlignmentIds),
  initialScores:score,classIds:z.array(z.enum(coreClassIds)).min(1).max(3),mode:z.enum(['single','multiclass']),campaign:z.object({allowedRaceIds:z.array(z.enum(coreRaceIds)).min(1),bardEnabled:z.boolean()}).strict()}).strict();
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
  if(!document.candidate)return coreCreationSchema.parse({...document,evaluation:null,status:'selection'});
  const evaluation=evaluateCoreEligibility(document.candidate as CoreCandidate),open=unresolved(evaluation,document.decisions);
  const baseStatus=open.some(i=>i.verdict==='forbidden')?'blocked':open.length?'needs-dm':document.tasks.some(t=>t.status==='pending'||t.status==='needs-dm')?'incomplete':'ready-for-review';
  if(document.admission&&baseStatus!=='ready-for-review')throw new Error('Admitted creation has unresolved or incomplete requirements.');
  return coreCreationSchema.parse({...document,evaluation,status:document.admission?'admitted':baseStatus});
}
export function selectCoreCandidate(document:CoreCreation,value:CoreCandidate):CoreCreation{
  if(document.status==='admitted')throw new Error('Admitted creation cannot be rewritten; create a correction event.');
  return derive({...document,candidate:candidate.parse(value),decisions:[],revision:document.revision+1,admission:null});
}
export function recordCreationTask(document:CoreCreation,id:typeof taskIds[number],value:Omit<CoreCreation['tasks'][number],'id'>):CoreCreation{
  if(document.status==='admitted')throw new Error('Admitted creation cannot be rewritten.');
  if(value.status==='complete'&&value.facts===null)throw new Error('Completed task needs recorded facts.');
  const tasks=document.tasks.map(t=>t.id===id?{id,...structuredClone(value)}:t);return derive({...document,tasks,revision:document.revision+1});
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
export function parseCoreCreation(value:unknown):CoreCreation{return derive(coreCreationSchema.parse(value));}
