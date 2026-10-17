import {z} from 'zod';
import type {InitialCoreClassId} from '../rules/core-progression';
import {coreClassSpellTracks,type CoreSpellCastingClassId} from '../rules/core-spell-capacity';
import {spellRecoveryRestHours,spellRecoveryRule,type CoreSpellDefinitionRef,type CoreSpellTradition} from '../rules/core-spell-ledger';
import {calculateCoreSpellCapacity} from '../engine/core-spell-capacity';
import type {PlayerSpellLedgerProjection,PreparedSpellCopy,SpellRecoverySession} from '../engine/core-spell-ledger';
import {coreDivineFirstLevelChoices} from '../rules/core-divine-first-level';
import {newCoreCalendar,scheduleCoreActivity,effectiveCoreActivityEnd,type CoreCampaignCalendar} from './core-calendar';

export type CampaignSpellLedger=Omit<PlayerSpellLedgerProjection,'schema'>&{schema:PlayerSpellLedgerProjection['schema']|'adnd1e.spell-ledger-player-portable'};
const id=z.string().trim().min(1).max(300),minute=z.number().int().nonnegative();
export const preparationChoiceSchema=z.object({kind:z.enum(['spellbook-entry','divine-spell']),id,quantity:z.number().int().min(1).max(50)}).strict();
export const preparationFactsSchema=z.object({
  choices:z.array(preparationChoiceSchema).min(1).max(50),restStartMinute:minute,restEndMinute:minute,studyStartMinute:minute,studyEndMinute:minute,locationId:id,
  completeRestAndNourishmentConfirmed:z.literal(true),bookAccessOrDivineGrantConfirmed:z.literal(true),restAfterLatestCastingConfirmed:z.literal(true),
  lastCastingId:id.nullable(),initializeCalendar:z.object({minutesPerDay:z.number().int().min(1),daysPerWeek:z.number().int().min(1),confirmed:z.literal(true)}).strict().optional(),
}).strict();
export type PreparationFacts=z.infer<typeof preparationFactsSchema>;
export interface PreparationCourse {eventId:string;sessionId:string;restActivityId:string;studyActivityId:string;restStartMinute:number;restEndMinute:number;studyStartMinute:number;studyEndMinute:number;locationId:string;lastCastingId:string|null;priorCastingIds:string[]}
export interface PreparationContext {classId:InitialCoreClassId;level:number;intelligence:number;wisdom:number;characterId:string}

export function campaignPreparationCapacity(ledger:CampaignSpellLedger,context:PreparationContext){
  if(ledger.characterId!==context.characterId||!Object.hasOwn(coreClassSpellTracks,context.classId))throw new Error('A matching character spell ledger and casting career are required.');
  const capacity=calculateCoreSpellCapacity({careerId:ledger.careerId,classId:context.classId as CoreSpellCastingClassId,level:context.level,model:'single',intelligence:context.intelligence,wisdom:context.wisdom});
  if(capacity.status!=='calculated'||!capacity.usableNow)throw new Error('Current verified spell capacity is unresolved.');
  const track=capacity.tracks.find(t=>t.listId===ledger.tradition);
  if(!track)throw new Error('Ledger tradition does not belong to the actual career.');
  return track;
}

export function divinePreparationChoices(ledger:CampaignSpellLedger):readonly CoreSpellDefinitionRef[]{
  if(!['cleric','druid'].includes(ledger.tradition))return[];
  const known=new Map<string,CoreSpellDefinitionRef>();
  for(const spell of [...coreDivineFirstLevelChoices(ledger.tradition as 'cleric'|'druid'),...ledger.divineGrants.flatMap(g=>[g.requestedSpell,...g.grantedSpell?[g.grantedSpell]:[]])]){
    if(spell.listId!==ledger.tradition||spell.rulesetId!=='adnd1e-core@1')continue;
    const previous=known.get(spell.definitionId);
    if(previous&&(previous.level!==spell.level||previous.listId!==spell.listId||previous.rulesetId!==spell.rulesetId))throw new Error('Conflicting divine definition identity; preserve the archive for review.');
    if(!previous)known.set(spell.definitionId,spell);
  }
  return [...known.values()];
}
export function campaignPreparationPlan(ledger:CampaignSpellLedger,context:PreparationContext,choices:PreparationFacts['choices']){
  const track=campaignPreparationCapacity(ledger,context);
  const parsed=z.array(preparationChoiceSchema).min(1).max(50).parse(choices),divine=['cleric','druid'].includes(ledger.tradition),seen=new Set<string>();
  const selected=parsed.map(choice=>{
    if(seen.has(`${choice.kind}:${choice.id}`))throw new Error('Use one quantity per selected spell, not duplicate rows.');seen.add(`${choice.kind}:${choice.id}`);
    if(divine!==(choice.kind==='divine-spell'))throw new Error('Spellbook study and divine bestowal are separate procedures.');
    const spell=choice.kind==='spellbook-entry'?ledger.spellbookEntries.find(e=>e.id===choice.id&&e.status==='present')?.spell:divinePreparationChoices(ledger).find(s=>s.definitionId===choice.id);
    if(!spell||spell.listId!==ledger.tradition||spell.rulesetId!=='adnd1e-core@1'||!Number.isSafeInteger(spell.level)||spell.level<1||spell.level>9||!spell.sourceIds.length)throw new Error('A present matching core spellbook entry or a verified public divine definition is required.');
    return {...choice,spell};
  });
  if(selected.reduce((n,c)=>n+c.quantity,0)>50)throw new Error('Prepare at most 50 copies per recorded course.');
  for(const row of track.levels){
    const ready=ledger.preparedCopies.filter(c=>c.status==='ready'&&c.spell.level===row.spellLevel).length;
    const requested=selected.filter(c=>c.spell.level===row.spellLevel).reduce((n,c)=>n+c.quantity,0);
    if(requested&&ready+requested>row.preparedCapacity)throw new Error(`第${row.spellLevel}环容量不足：已有${ready}份，本次${requested}份，上限${row.preparedCapacity}份。未消耗的准备不会被覆盖。`);
  }
  if(selected.some(c=>!track.levels.some(row=>row.spellLevel===c.spell.level&&row.preparedCapacity>0)))throw new Error('This spell level is not currently usable.');
  const highest=Math.max(...selected.map(c=>c.spell.level)),rest=spellRecoveryRestHours.find(r=>highest>=r.minimumLevel&&highest<=r.maximumLevel)!;
  return {selected,capacity:track.levels.map(row=>({level:row.spellLevel,maximum:row.preparedCapacity,ready:ledger.preparedCopies.filter(c=>c.status==='ready'&&c.spell.level===row.spellLevel).length})),requiredRestMinutes:rest.hours*60,requiredStudyMinutes:selected.reduce((n,c)=>n+c.quantity*c.spell.level*spellRecoveryRule.studyOrPrayerMinutesPerSpellLevel,0),sourceIds:[...spellRecoveryRule.sourceIds,...track.sourceIds]};
}

/** Completed ordinary course only. No inferred sleep, automatic grant or secret reconstruction. */
export function completeCampaignPreparation(input:{ledger:CampaignSpellLedger;context:PreparationContext;calendar:CoreCampaignCalendar|null;courses:readonly PreparationCourse[];facts:PreparationFacts;eventId:string;recordedAt:string;castingTimes:readonly {castingId:string;atMinute:number}[]}){
  const facts=preparationFactsSchema.parse(input.facts);
  const latest=input.ledger.castings.at(-1)?.id??null;
  if(facts.lastCastingId!==latest)throw new Error('最近施法记录已变化，请重新核对完整休息的先后关系。');
  const plan=campaignPreparationPlan(input.ledger,input.context,facts.choices);
  if(!input.eventId.trim()||!input.recordedAt.trim())throw new Error('Course identity and recorded time are required.');
  let calendar=input.calendar?structuredClone(input.calendar):null;
  if(!calendar){if(!facts.initializeCalendar)throw new Error('请先明确本战役日历，不能自动假设一天或一周的长度。');calendar=newCoreCalendar(facts.initializeCalendar);}
  else if(facts.initializeCalendar&&(facts.initializeCalendar.minutesPerDay!==calendar.minutesPerDay||facts.initializeCalendar.daysPerWeek!==calendar.daysPerWeek))throw new Error('Preparation cannot silently replace the existing campaign calendar.');
  if(facts.restEndMinute-facts.restStartMinute<plan.requiredRestMinutes||facts.studyEndMinute-facts.studyStartMinute<plan.requiredStudyMinutes||facts.studyStartMinute<facts.restEndMinute)throw new Error('完整休息或逐份学习／祈祷时间不足，或顺序不正确。');
  const timedIds=new Set<string>();
  for(const cast of input.castingTimes){
    if(!Number.isSafeInteger(cast.atMinute)||cast.atMinute<0||timedIds.has(cast.castingId)||!input.ledger.castings.some(c=>c.id===cast.castingId))throw new Error('已定时施法的身份或时间事实不一致。');timedIds.add(cast.castingId);
    if(cast.atMinute>=facts.restStartMinute)throw new Error('已有施法不在本次完整休息之前，不能只按最后追加的一条记录认定休息有效。');
  }
  const existing=input.courses.find(c=>c.lastCastingId===latest&&c.restStartMinute===facts.restStartMinute&&c.restEndMinute===facts.restEndMinute&&c.locationId===facts.locationId);
  // Reusing one actual rest for consecutive study is allowed; no new sleep tax per spell.
  const reused=existing?calendar.activities.find(a=>a.id===existing.restActivityId):calendar.activities.find(a=>a.actorId===input.context.characterId&&a.kind==='rest'&&a.startMinute===facts.restStartMinute&&effectiveCoreActivityEnd(calendar!,a)===facts.restEndMinute&&a.locationId===facts.locationId);
  const sourceIds=[...plan.sourceIds],actorId=input.context.characterId,restId=reused?.id??`${input.eventId}:rest`,studyId=`${input.eventId}:study`;
  if(reused&&(reused.startMinute!==facts.restStartMinute||effectiveCoreActivityEnd(calendar,reused)!==facts.restEndMinute||reused.actorId!==actorId||reused.locationId!==facts.locationId||reused.kind!=='rest'))throw new Error('Previously recorded rest was amended or no longer matches this course.');
  for(const a of calendar.activities){
    const end=effectiveCoreActivityEnd(calendar,a);
    if(a.actorId!==actorId||end<=a.startMinute||end<=facts.restStartMinute||a.startMinute>=facts.studyStartMinute)continue;
    const priorStudy=input.courses.find(c=>c.studyActivityId===a.id&&c.restActivityId===restId&&c.lastCastingId===latest);
    if(a.id===restId||(priorStudy&&end<=facts.studyStartMinute))continue;
    throw new Error('休息到准备之间已有其他活动；普通向导不能认定这些活动兼容，请先由DM核对。');
  }
  if(!reused)calendar=scheduleCoreActivity(calendar,{id:restId,actorId,kind:'rest',startMinute:facts.restStartMinute,endMinuteExclusive:facts.restEndMinute,locationId:facts.locationId,sourceIds});
  calendar=scheduleCoreActivity(calendar,{id:studyId,actorId,kind:'study',startMinute:facts.studyStartMinute,endMinuteExclusive:facts.studyEndMinute,locationId:facts.locationId,sourceIds});
  const ledger=structuredClone(input.ledger),sessionId=`${input.eventId}:session`,requests:{copyId:string;spell:CoreSpellDefinitionRef;preparedFrom:PreparedSpellCopy['preparedFrom']}[]=[];
  const used=new Set([ledger.ledgerId,...ledger.sources.map(x=>x.id),...ledger.spellbookEntries.map(x=>x.id),...ledger.divineGrants.map(x=>x.id),...ledger.preparedCopies.map(x=>x.id),...ledger.castings.map(x=>x.id),...ledger.recoverySessions.map(x=>x.id)]);
  const reserve=(key:string)=>{if(used.has(key))throw new Error('Spell record identity conflict.');used.add(key);};reserve(sessionId);
  const grants=[...ledger.divineGrants];
  for(const chosen of plan.selected)for(let n=0;n<chosen.quantity;n++){
    const copyId=`${input.eventId}:copy:${requests.length}`;reserve(copyId);
    let preparedFrom:PreparedSpellCopy['preparedFrom'];
    if(chosen.kind==='spellbook-entry')preparedFrom={kind:'spellbook-entry',id:chosen.id};
    else{
      const grantId=`${input.eventId}:grant:${requests.length}`;reserve(grantId);
      grants.push({id:grantId,requestedSpell:chosen.spell,grantedSpell:chosen.spell,status:'granted',publicMessage:'本次祈祷的实际授予已按战役确认；不是沿用历史授予。'});preparedFrom={kind:'divine-grant',id:grantId};
    }
    requests.push({copyId,spell:chosen.spell,preparedFrom});
  }
  const session:Omit<SpellRecoverySession,'rulingId'>={id:sessionId,requested:requests,requiredRestHours:plan.requiredRestMinutes/60,requiredStudyOrPrayerMinutes:plan.requiredStudyMinutes,actualRestMinutes:facts.restEndMinute-facts.restStartMinute,actualStudyOrPrayerMinutes:facts.studyEndMinute-facts.studyStartMinute,interruption:'none',status:'completed',completedAt:input.recordedAt};
  const next:CampaignSpellLedger={...ledger,revision:ledger.revision+1,divineGrants:grants,recoverySessions:[...ledger.recoverySessions,session],preparedCopies:[...ledger.preparedCopies,...requests.map(r=>({id:r.copyId,spell:r.spell,preparedFrom:r.preparedFrom,recoverySessionId:sessionId,status:'ready' as const,expendedByCastingId:null}))]};
  const course:PreparationCourse={eventId:input.eventId,sessionId,restActivityId:restId,studyActivityId:studyId,restStartMinute:facts.restStartMinute,restEndMinute:facts.restEndMinute,studyStartMinute:facts.studyStartMinute,studyEndMinute:facts.studyEndMinute,locationId:facts.locationId,lastCastingId:latest,priorCastingIds:input.ledger.castings.map(c=>c.id)};
  return {ledger:next,calendar,course,sourceIds};
}

/** Later calendar amendments cannot silently keep benefits proved by an earlier course. */
export function assertPreparationHistoryCoherent(calendar:CoreCampaignCalendar,courses:readonly PreparationCourse[],castingTimes:readonly {castingId:string;atMinute:number}[]){
  for(const course of courses){
    const rest=calendar.activities.find(a=>a.id===course.restActivityId),study=calendar.activities.find(a=>a.id===course.studyActivityId);
    if(!rest||!study||rest.kind!=='rest'||study.kind!=='study'||rest.actorId!==study.actorId||rest.locationId!==course.locationId||study.locationId!==course.locationId||rest.startMinute!==course.restStartMinute||effectiveCoreActivityEnd(calendar,rest)!==course.restEndMinute||study.startMinute!==course.studyStartMinute||effectiveCoreActivityEnd(calendar,study)!==course.studyEndMinute)throw new Error('已完成法术准备的时间证明已改变；必须纠正该课程，不能保留原收益。');
    for(const other of calendar.activities){
      const end=effectiveCoreActivityEnd(calendar,other);
      if(other.id===rest.id||other.id===study.id||other.actorId!==rest.actorId||end<=other.startMinute||end<=course.restStartMinute||other.startMinute>=course.studyEndMinute)continue;
      const prior=courses.find(c=>c.studyActivityId===other.id&&c.restActivityId===rest.id&&c.lastCastingId===course.lastCastingId&&c.studyEndMinute<=course.studyStartMinute);
      if(!prior)throw new Error('新增活动与已完成法术准备冲突；普通重叠备注不能保留该课程收益。');
    }
    if(castingTimes.some(c=>course.priorCastingIds.includes(c.castingId)?c.atMinute>=course.restStartMinute:c.atMinute<course.studyEndMinute))throw new Error('已定时施法与课程前后次序矛盾；须先纠正课程，而非重复取得法术。');
  }
}
