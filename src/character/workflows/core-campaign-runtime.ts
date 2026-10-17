import { canonical, type Json } from '../domain/transactions';
import { characterRegistry, commitCharacter, type CharacterRuntime } from '../domain/character-record';
import { parseCoreAdmissionArchive, type CoreAdmissionArchive } from './core-admission';
import { parseCoreCreation } from './core-create';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { newCoreAdvancement, awardAdventureXp, openAdvancementCandidate, attachTrainingPlan, payTraining, startTraining, recordTrainingSegment, awardCoreLevel, acceptAdvancementGate, interruptTraining, type AdventureAssessment, type CoreAdvancementState, type TrainingSegment } from './core-advancement';
import { spendCoreWallet, receiveCoreWallet, validateCoreInventoryLedger, type CoreInventoryLedger, type CoinCounts } from '../engine/core-inventory';
import type { InitialCoreClassId } from '../rules/core-progression';
import { attachNameLevelTrainingPlan } from './core-advancement';
import { restartInterruptedTraining } from './core-advancement';
import { assessCoreRevival, commitCoreRevival, resolveHealConvalescenceException, type RevivalCheckRoute } from '../engine/core-life-state';
import { endCoreCalendarActivity, effectiveCoreActivityEnd } from './core-calendar';
import { adoptCoreOverrunTrainingBasis } from './core-overrun-training';
import { inspectCoreDatedTrainingCourse } from './core-dated-training';
import {adjudicateCoreActivityConsequence,assertCoreActivityConsequencesResolved} from './core-activity-consequences';
import {recordCoreTrainingLocationTransition} from './core-training-location';
import { newCoreCalendar, scheduleCoreActivity, trainingSegmentMinutes, type CoreCampaignCalendar, type CalendarActivity } from './core-calendar';
import { consumeCoreInventoryItem, relocateInventoryItem, unpackCoreInventoryBundle } from '../engine/core-inventory';
import { coreWeaponChoices } from '../rules/core-weapon-choices';
import { validateCoreWeaponSelections } from '../engine/core-weapon-proficiency';
import { evaluateCoreEquipmentLegality } from '../engine/core-equipment-legality';
import { createCoreLifeState, applyHitPointLoss, advanceZeroHpRound, administerFriendlyAid, reviveFromZeroHp, validateCoreLifeState, type CoreLifeState, type SameBlowEntryRule } from '../engine/core-life-state';
import { castPublicPreparedSpell, type PlayerSpellLedgerProjection } from '../engine/core-spell-ledger';
import {applyActualHealing} from '../engine/core-actual-healing';
import {coreDefense,defenseSelectionSchema,type DefenseSelection} from '../engine/core-defense';
import {completeCampaignPreparation,assertPreparationHistoryCoherent,type CampaignSpellLedger,type PreparationFacts,type PreparationCourse} from './core-campaign-preparation';
import {settleNaturalRecovery, type DayInterval, type TimedActivity} from '../engine/core-time-rest';
import type {NaturalRecoveryRouteId} from '../rules/core-time-rest';
import type {CoreRevivalMethodId, CoreSubjectRaceId} from '../rules/core-life-state';
import { parsePublicRelationshipProjection, publicRelationshipProjectionSource, publicRelationshipProjectionToModule, type PublicRelationshipProjectionFile } from '../engine/core-relationships-public';

export type CampaignAction={id:string;actorId:string;at:string;expectedRevision:number;intent:
  {type:'experience';assessment:AdventureAssessment}|{type:'open-advancement'}|
  {type:'adopt-overrun-basis';interpretation:'reuse-recorded-adventure-ratings';assessmentIds:string[];reason:string}|
  {type:'plan-training';route:'tutor'|'self';acceptedCostCp:number;reason?:string;confirmation?:{tutorName:string|null;sameClassProfessionAndAvailabilityConfirmed:true}}|
  {type:'pay-training';amountCp:number;walletId:string;tender:CoinCounts;change:CoinCounts}|
  {type:'start-training'}|{type:'training-segment';segment:TrainingSegment}|{type:'award-level';hpRolls:number[]}|
  {type:'accept-gate';reason:string;classification?:'factual-confirmation'|'campaign-exception'}|{type:'interrupt-training';reason:string}|{type:'restart-training';reason:string}|
  {type:'plan-name-training';costFamily:'cleric'|'fighter'|'magic-user'|'thief';acceptedCostCp:number;reason:string}|
  {type:'income';walletId:string;coins:CoinCounts;sourceId:string;reason:string}|
  {type:'expense';walletId:string;amountCp:number;tender:CoinCounts;change:CoinCounts;sourceId:string;reason:string}|
  {type:'configure-calendar';minutesPerDay:number;daysPerWeek:number}|
  {type:'schedule-activity';activity:CalendarActivity;rulings?:CoreCampaignCalendar['overlapRulings']}|
  {type:'scheduled-training-segment';segment:TrainingSegment;startMinute:number;locationId:string}|
  {type:'reconcile-training-segment';segmentId:string;startMinute:number;locationId:string;reason:string}|
  {type:'award-level-dated';hpRolls:number[];awardMinute:number;consequencePolicy?:'v1'|'v2';locationPolicy?:'v1'}|
  {type:'record-training-location-transition';fromActivityId:string;toActivityId:string;method:'instantaneous-movement'|'same-physical-place';continuityConfirmed:boolean;reason:string;evidenceSourceId:string}|
  {type:'adjudicate-activity-consequence';protectedActivityId:string;otherActivityId:string;purpose:'training'|'zero-hp-rest';disposition:'compatible-facts'|'rule-exception';reason:string;evidenceSourceId:string}|
  {type:'consume-item';itemId:string;quantity:number;reason:string;sourceId:string}|
  {type:'relocate-item';itemId:string;destinationLocationId:string;reason:string;sourceId:string}|
  {type:'unpack-item';itemId:string;bundleCount:number;pieceInstanceId:string;reason:string;sourceId:string}|
  {type:'learn-weapon';weaponId:string;reason:string}|
  {type:'initialize-life';currentHp:number;reason:string}|
  {type:'damage';amount:number;cause:string;sameBlowEntryRule?:SameBlowEntryRule}|
  {type:'actual-healing';amount:number;description:string}|
  {type:'record-defense';selection:DefenseSelection}|
  {type:'prepare-spells';facts:PreparationFacts}|
  {type:'zero-hp-round';cause:string}|{type:'friendly-aid'}|
  {type:'settle-current-hp';currentHp:number;reason:string}|
  {type:'recover-zero-hp';restoredHp:number;comaTurns:number;restStartMinute:number;locationId:string;healingSourceId:string;reason:string}|
  {type:'complete-zero-hp-rest';completedThroughMinute:number;reason:string;consequencePolicy?:'v1'|'v2'}|
  {type:'restart-zero-hp-rest';startMinute:number;locationId:string;reason:string;sourceId:string}|
  {type:'resolve-heal-convalescence';episodeId:string;spellEffect:'heal';effectEvidenceId:string;effectiveMinute:number;reason:string}|
  {type:'assess-revival';assessmentId:string;methodId:CoreRevivalMethodId;subjectRaceId:CoreSubjectRaceId;deathInterval:{value:number;unit:'days'|'years'};bodyAvailable:boolean;casterLevel?:number;checkRoute?:RevivalCheckRoute|null;percentileRoll?:number;reason:string}|
  {type:'commit-revival';assessmentId:string;changeId:string;appearanceTurns?:number;reason:string}|
  {type:'natural-recovery';routeId:NaturalRecoveryRouteId|null;restStartDay:number;restEndDayExclusive:number;continuity:'new'|'continuous';priorContinuousRestDays:number;locationId:string;constitutionHealingAdjustment?:number;dmAwardHp?:number;rulingId?:string;reason:string;rulings?:CoreCampaignCalendar['overlapRulings']}|
  {type:'cast-prepared';copyId:string;components:'satisfied'|'not-required'|'needs-dm';observedOutcome:string;reason:string;atMinute?:number}|{type:'import-public-relationships';projection:PublicRelationshipProjectionFile}};
export interface CoreCampaignArchive{
  format:'adnd1e-core-campaign-runtime';schemaVersion:1;genesis:CoreAdmissionArchive;
  actions:CampaignAction[];runtime:CharacterRuntime;
}
const sourceId='project:core-campaign-advancement';
const asJson=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Json;
function base(archive:CoreAdmissionArchive){
  const genesis=parseCoreAdmissionArchive(archive),document=parseCoreCreation(genesis.runtime.transaction.facts.modules[0].data);
  const candidate=document.candidate!;
  if(candidate.classIds.length!==1||candidate.classIds[0]==='bard')throw new Error('Campaign adapter requires a single ordinary core career.');
  const eligibility=evaluateCoreEligibility(candidate),classId=candidate.classIds[0] as InitialCoreClassId;
  const equipment=document.tasks.find(task=>task.id==='equipment')?.facts?.ledger;
  const inventory=equipment?structuredClone(equipment) as CoreInventoryLedger:null;if(inventory)validateCoreInventoryLedger(inventory);
  const proficiencies=document.tasks.find(task=>task.id==='proficiencies')?.facts;
  const recorded=proficiencies?.slots&&typeof proficiencies.slots==='object'?(proficiencies.slots as {weaponIds?:unknown}).weaponIds:null;
  const initialWeaponIds=Array.isArray(recorded)&&recorded.every(id=>typeof id==='string')?recorded as string[]:null;
  const initialHp=document.tasks.find(task=>task.id==='hp')?.facts?.actualAward;
  const initialSpells=document.tasks.find(task=>task.id==='initial-spells')?.facts?.ledger as CampaignSpellLedger|undefined;
  const publicSpells=initialSpells&&['adnd1e.spell-ledger-player-projection','adnd1e.spell-ledger-player-portable'].includes(initialSpells.schema)?structuredClone(initialSpells):null;
  return {genesis,inventory,initialWeaponIds,publicSpells,adjustedScores:eligibility.adjustedScores,initialHp:typeof initialHp==='number'?initialHp:null,state:newCoreAdvancement({id:`${document.id}:advancement`,classId,level:1,xp:0,constitution:eligibility.adjustedScores.CON,levelCap:eligibility.classLevelCaps[classId]})};
}
export function newCoreCampaignArchive(admission:CoreAdmissionArchive):CoreCampaignArchive{
  const {genesis}=base(admission);return {format:'adnd1e-core-campaign-runtime',schemaVersion:1,genesis,actions:[],runtime:structuredClone(genesis.runtime)};
}
/** Rebuild supported history, including legacy actions. Not a new-operation writer:
 * use commitCoreCampaignAction for present-day write policy and legacy refusal.
 */
export function replayCoreCampaignActions(genesis:CoreAdmissionArchive,actions:CampaignAction[]):CoreCampaignArchive{
  const initial=base(genesis);let runtime=structuredClone(initial.genesis.runtime),state:CoreAdvancementState=initial.state,inventory=initial.inventory;
  let calendar:CoreCampaignCalendar|null=null;
  let datedLevelAwards:(ReturnType<typeof inspectCoreDatedTrainingCourse>&{eventId:string;actorId:string;awardMinute:number;consequencePolicy?:'v1'|'v2';locationPolicy?:'v1'})[]|null=null;
  const completedRestActivityIds:string[]=[];
  let weaponProficiencies:{weaponId:string;level:number;actorId:string;reason:string;sourceIds:string[]}[]|null=null;
  let life:CoreLifeState|null=null;
  let spells:CampaignSpellLedger|null=null;
  let defense:DefenseSelection|null=null;
  let spellPreparationCourses:PreparationCourse[]|null=null;
  let spellCastingTimes:{castingId:string;atMinute:number}[]|null=null;
  let lifeRecovery:{episodeId:string;restActivityId:string;startMinute:number;endMinuteExclusive:number;comaTurns:number;healingSourceId:string;completed:boolean;consequencePolicy?:'v1'|'v2';priorRestAttempts?:{restActivityId:string;startMinute:number;endMinuteExclusive:number;restartActionId:string}[];resolution?:{method:'heal';eventId:string;effectEvidenceId:string;effectiveMinute:number}}|null=null;
  let pendingRevival:{assessmentId:string;input:Parameters<typeof assessCoreRevival>[1]}|null=null;
  let naturalRecovery:{routeId:NaturalRecoveryRouteId;continuousRestDays:number;lastRestEndDay:number}|null=null;
  let publicRelationships:PublicRelationshipProjectionFile|null=null;
  const ids=new Set<string>(),sources=new Set([...initial.genesis.registeredSourceIds,sourceId,publicRelationshipProjectionSource]);
  for(const action of actions){
    if(!action.id?.trim()||ids.has(action.id)||!action.actorId?.trim()||!action.at?.trim())throw new Error('Campaign action identity is missing or duplicated.');ids.add(action.id);
    if(action.expectedRevision!==runtime.transaction.revision)throw new Error('Campaign revision conflict.');
    if((action.intent.type==='award-level-dated'||action.intent.type==='complete-zero-hp-rest')&&action.intent.consequencePolicy==='v1'){
      for(const previous of datedLevelAwards??[])if(previous.consequencePolicy==='v1')assertCoreActivityConsequencesResolved(calendar!,previous.activityIds,'training');
      if(lifeRecovery?.completed&&lifeRecovery.consequencePolicy==='v1'&&!lifeRecovery.resolution)assertCoreActivityConsequencesResolved(calendar!,[lifeRecovery.restActivityId],'zero-hp-rest');
    }
    if((action.intent.type==='award-level-dated'||action.intent.type==='complete-zero-hp-rest')&&action.intent.consequencePolicy==='v2'){
      for(const previous of datedLevelAwards??[])assertCoreActivityConsequencesResolved(calendar!,previous.activityIds,'training');
      if(completedRestActivityIds.length)assertCoreActivityConsequencesResolved(calendar!,completedRestActivityIds,'zero-hp-rest');
    }
    if(life&&(life.mortality!=='alive'||life.actionRestriction!=='none'||life.hpSettlement!=='settled')&&['start-training','training-segment','scheduled-training-segment','award-level','award-level-dated','learn-weapon','cast-prepared'].includes(action.intent.type))throw new Error('Current mortality, action restriction or HP settlement prevents this character activity.');
    if(action.intent.type==='import-public-relationships'){
      const projection=parsePublicRelationshipProjection(action.intent.projection,runtime.transaction.characterId);
      if(publicRelationships&&projection.revision<publicRelationships.revision)throw new Error('Public relationship projection revision cannot move backwards.');
      if(publicRelationships&&projection.revision===publicRelationships.revision&&canonical(asJson(projection))!==canonical(asJson(publicRelationships)))throw new Error('Public relationship projection revision is already occupied by different facts.');
      publicRelationships=projection;
      sources.add(publicRelationshipProjectionSource);
    }else if(action.intent.type==='cast-prepared'){
      if(spellPreparationCourses&&action.intent.atMinute===undefined)throw new Error('完成新准备课程后的施法必须有战役时间；旧无日期消费不能绕过时间证明。');
      const ledger:CampaignSpellLedger|null=spells??initial.publicSpells;if(!ledger)throw new Error('No prepared-spell ledger is recorded.');
      if(action.intent.atMinute!==undefined){
        const minute=action.intent.atMinute;
        if(!Number.isSafeInteger(minute)||minute<0||(spellCastingTimes??[]).some(c=>c.atMinute>minute))throw new Error('施法战役时间非法或早于已记录的施法；历史纠错不能直接倒填。');
        const copyId=action.intent.copyId,copy=ledger.preparedCopies.find(c=>c.id===copyId),course=spellPreparationCourses?.find(c=>c.sessionId===copy?.recoverySessionId);
        if(course&&minute<course.studyEndMinute)throw new Error('不能在该准备副本完成以前施放。');
        spellCastingTimes=[...spellCastingTimes??[],{castingId:`${action.id}:casting`,atMinute:minute}];
      }
      if(!action.intent.reason?.trim())throw new Error('Casting requires a DM confirmation of components and situation.');
      const result:{status:'cast';ledger:CampaignSpellLedger}|{status:'needs-dm';ledger:CampaignSpellLedger;reason:string}=castPublicPreparedSpell(ledger,{castingId:`${action.id}:casting`,preparedCopyId:action.intent.copyId,occurredAt:action.at,componentState:action.intent.components,observedOutcome:action.intent.observedOutcome});
      if(result.status==='needs-dm')throw new Error(result.reason);spells=result.ledger;
      const casting=result.ledger.castings.at(-1)!;casting.spell.sourceIds.forEach(id=>sources.add(id));sources.add('project:prepared-spell-consumption');
    }else if(action.intent.type==='prepare-spells'){
      if(!life||life.mortality!=='alive'||life.actionRestriction!=='none'||life.hpSettlement!=='settled')throw new Error('请先确认人物生命与行动状态；昏迷、复活卧床或零HP休养不能当成普通法术准备。');
      const ledger=spells??initial.publicSpells;if(!ledger)throw new Error('没有实际法术账本；不能从职业容量凭空生成。');
      const result=completeCampaignPreparation({ledger,context:{classId:state.classId,level:state.level,intelligence:initial.adjustedScores.INT,wisdom:initial.adjustedScores.WIS,characterId:runtime.transaction.characterId},calendar,courses:spellPreparationCourses??[],facts:action.intent.facts,eventId:action.id,recordedAt:action.at,castingTimes:spellCastingTimes??[]});
      spells=result.ledger;calendar=result.calendar;spellPreparationCourses=[...spellPreparationCourses??[],result.course];result.sourceIds.forEach(id=>sources.add(id));
    }else if(action.intent.type==='recover-zero-hp'){
      if(!calendar||!life?.zeroHpEpisode)throw new Error('Zero-HP recovery requires the recorded episode and campaign calendar.');
      if(!action.intent.healingSourceId?.trim()||!action.intent.reason?.trim())throw new Error('Record actual healing and DM confirmation that the coma has elapsed.');
      const recovered=reviveFromZeroHp(life,{restoredHp:action.intent.restoredHp,comaTurns:action.intent.comaTurns});
      const end=action.intent.restStartMinute+recovered.convalescence.minimumRestDays*calendar.minutesPerDay;
      const activity:CalendarActivity={id:`${action.id}:convalescence`,actorId:runtime.transaction.characterId,kind:'rest',startMinute:action.intent.restStartMinute,endMinuteExclusive:end,locationId:action.intent.locationId,sourceIds:['dmg:82:zero-hit-points',action.intent.healingSourceId]};
      const scheduled=scheduleCoreActivity(calendar,activity);
      lifeRecovery={episodeId:life.zeroHpEpisode.id,restActivityId:activity.id,startMinute:activity.startMinute,endMinuteExclusive:end,comaTurns:action.intent.comaTurns,healingSourceId:action.intent.healingSourceId,completed:false};
      life=recovered.state;calendar=scheduled;sources.add('dmg:82:zero-hit-points');sources.add(action.intent.healingSourceId);
    }else if(action.intent.type==='resolve-heal-convalescence'){
      if(!calendar||!life||!lifeRecovery||lifeRecovery.completed)throw new Error('No pending zero-HP recovery to resolve with Heal.');
      if(!Number.isSafeInteger(action.intent.effectiveMinute)||action.intent.effectiveMinute<lifeRecovery.startMinute)throw new Error('Heal effect must be dated at or after this recorded convalescence began.');
      const result=resolveHealConvalescenceException(life,{spellEffect:action.intent.spellEffect,episodeId:action.intent.episodeId,effectEvidenceId:action.intent.effectEvidenceId,actorId:action.actorId,reason:action.intent.reason});
      if(action.intent.effectiveMinute<lifeRecovery.endMinuteExclusive)calendar=endCoreCalendarActivity(calendar,{activityId:lifeRecovery.restActivityId,endedAtMinute:action.intent.effectiveMinute,eventId:action.id,actorId:action.actorId,reason:action.intent.reason,sourceIds:[...result.sourceIds,action.intent.effectEvidenceId]});
      life=result.state;
      lifeRecovery=Object.assign({},lifeRecovery,{completed:true,resolution:{method:'heal' as const,eventId:action.id,effectEvidenceId:action.intent.effectEvidenceId,effectiveMinute:action.intent.effectiveMinute}});
      result.sourceIds.forEach(id=>sources.add(id));sources.add(action.intent.effectEvidenceId);
    }else if(action.intent.type==='restart-zero-hp-rest'){
      if(!calendar||!life||life.actionRestriction!=='zero-hp-convalescence'||!lifeRecovery||lifeRecovery.completed)throw new Error('No pending zero-HP rest period can be restarted.');
      if(!action.intent.reason?.trim()||!action.intent.sourceId?.trim()||!Number.isSafeInteger(action.intent.startMinute)||action.intent.startMinute<lifeRecovery.startMinute)throw new Error('Rest restart requires actual time, source and DM reason; it cannot precede the previous rest start.');
      const start=action.intent.startMinute,restActivityId=`${action.id}:convalescence`;
      const end:number=start+(lifeRecovery.endMinuteExclusive-lifeRecovery.startMinute);
      if(start<lifeRecovery.endMinuteExclusive)calendar=endCoreCalendarActivity(calendar,{activityId:lifeRecovery.restActivityId,endedAtMinute:start,eventId:action.id,actorId:action.actorId,reason:action.intent.reason,sourceIds:['dmg:82:zero-hit-points',action.intent.sourceId]});
      calendar=scheduleCoreActivity(calendar,{id:restActivityId,actorId:runtime.transaction.characterId,kind:'rest',startMinute:start,endMinuteExclusive:end,locationId:action.intent.locationId,sourceIds:['dmg:82:zero-hit-points',action.intent.sourceId]});
      const prior:{restActivityId:string;startMinute:number;endMinuteExclusive:number;restartActionId:string}={restActivityId:lifeRecovery.restActivityId,startMinute:lifeRecovery.startMinute,endMinuteExclusive:lifeRecovery.endMinuteExclusive,restartActionId:action.id};
      lifeRecovery=Object.assign({},lifeRecovery,{restActivityId,startMinute:start,endMinuteExclusive:end,priorRestAttempts:[...(lifeRecovery.priorRestAttempts??[]),prior]});
      sources.add('dmg:82:zero-hit-points');sources.add(action.intent.sourceId);
    }else if(action.intent.type==='complete-zero-hp-rest'){
      if(!life||life.actionRestriction!=='zero-hp-convalescence'||!lifeRecovery||lifeRecovery.completed)throw new Error('No pending zero-HP convalescence.');
      if(!Number.isSafeInteger(action.intent.completedThroughMinute)||action.intent.completedThroughMinute<lifeRecovery.endMinuteExclusive||!action.intent.reason?.trim())throw new Error('The minimum rest interval and DM completion confirmation are required.');
      if(action.intent.consequencePolicy!==undefined){
        if(!['v1','v2'].includes(action.intent.consequencePolicy)||!calendar)throw new Error('Unsupported completion consequence policy.');
        assertCoreActivityConsequencesResolved(calendar,[lifeRecovery.restActivityId],'zero-hp-rest');
      }
      life=validateCoreLifeState({...life,actionRestriction:'none'});lifeRecovery=Object.assign({},lifeRecovery,{completed:true},action.intent.consequencePolicy?{consequencePolicy:action.intent.consequencePolicy}:{});sources.add('dmg:82:zero-hit-points');
      completedRestActivityIds.push(lifeRecovery.restActivityId);
    }else if(action.intent.type==='assess-revival'){
      if(!life)throw new Error('Life state is not initialized.');
      if(!action.intent.assessmentId.trim()||!action.intent.reason.trim())throw new Error('Revival assessment requires an identity and DM reason.');
      const input={methodId:action.intent.methodId,subjectRaceId:action.intent.subjectRaceId,deathInterval:action.intent.deathInterval,bodyAvailable:action.intent.bodyAvailable,...action.intent.casterLevel===undefined?{}:{casterLevel:action.intent.casterLevel},...action.intent.checkRoute===undefined?{}:{checkRoute:action.intent.checkRoute},...action.intent.percentileRoll===undefined?{}:{percentileRoll:action.intent.percentileRoll}} as Parameters<typeof assessCoreRevival>[1];
      assessCoreRevival(life,input);
      pendingRevival={assessmentId:action.intent.assessmentId,input};
      if(action.intent.checkRoute)sources.add('phb:12:constitution-revivification');
    }else if(action.intent.type==='commit-revival'){
      if(!life||!pendingRevival||pendingRevival.assessmentId!==action.intent.assessmentId)throw new Error('A matching, current revival assessment is required before commitment.');
      if(!action.intent.changeId.trim()||!action.intent.reason.trim())throw new Error('Revival commitment requires a change identity and DM reason.');
      const assessment=assessCoreRevival(life,pendingRevival.input);
      const result=commitCoreRevival(life,assessment,{changeId:action.intent.changeId,...action.intent.appearanceTurns===undefined?{}:{appearanceTurns:action.intent.appearanceTurns}});
      life=result.state;result.sourceIds.forEach(id=>sources.add(id));pendingRevival=null;
    }else if(action.intent.type==='natural-recovery'){
      if(!calendar||!life||life.mortality!=='alive'||life.actionRestriction!=='none'||life.hpSettlement!=='settled'||life.currentHp===null||life.currentHp<1)throw new Error('Natural recovery requires a living character with settled positive HP and a campaign calendar.');
      if(!action.intent.reason.trim()||!action.intent.locationId.trim())throw new Error('Natural recovery requires a factual rest reason and location.');
      if(!Number.isSafeInteger(action.intent.restStartDay)||action.intent.restStartDay<1||!Number.isSafeInteger(action.intent.restEndDayExclusive)||action.intent.restEndDayExclusive<=action.intent.restStartDay)throw new Error('Natural recovery requires a positive campaign-day interval.');
      if(!Number.isSafeInteger(action.intent.priorContinuousRestDays)||action.intent.priorContinuousRestDays<0)throw new Error('Prior continuous rest days must be a non-negative fact.');
      if(action.intent.continuity==='continuous'){
        if(!naturalRecovery||naturalRecovery.routeId!==action.intent.routeId||naturalRecovery.lastRestEndDay!==action.intent.restStartDay||naturalRecovery.continuousRestDays!==action.intent.priorContinuousRestDays)throw new Error('The claimed continuous recovery interval does not follow the recorded route and prior interval.');
      }else if(action.intent.priorContinuousRestDays!==0)throw new Error('A new recovery interval must start at zero continuous rest days.');
      if(!action.intent.routeId)throw new Error('PHB 105 and DMG 82 recovery routes conflict; explicitly select one or record a campaign ruling.');
      const restInterval:DayInterval={startDay:action.intent.restStartDay,endDayExclusive:action.intent.restEndDayExclusive};
      const activeCalendar=calendar;
      const overlappingActivities:TimedActivity[]=activeCalendar.activities.filter(item=>item.actorId===runtime.transaction.characterId).map(item=>({id:item.id,actorId:item.actorId,kind:item.kind,interval:{startDay:Math.floor(item.startMinute/activeCalendar.minutesPerDay)+1,endDayExclusive:Math.ceil(effectiveCoreActivityEnd(activeCalendar,item)/activeCalendar.minutesPerDay)+1}}));
      const settled=settleNaturalRecovery({routeId:action.intent.routeId,currentHp:life.currentHp,maximumHp:life.maximumHp,restInterval,priorContinuousRestDays:action.intent.priorContinuousRestDays,constitutionHealingAdjustment:action.intent.constitutionHealingAdjustment,overlappingActivities,actorId:runtime.transaction.characterId,...action.intent.dmAwardHp===undefined?{}:{dmAwardHp:action.intent.dmAwardHp},...action.intent.rulingId===undefined?{}:{rulingId:action.intent.rulingId}});
      if(settled.status!=='settled'&&settled.status!=='settled-by-ruling')throw new Error('Natural recovery was not settled: '+('reason' in settled?settled.reason:'source route requires explicit adoption.'));
      const activity:CalendarActivity={id:`${action.id}:natural-recovery`,actorId:runtime.transaction.characterId,kind:'rest',startMinute:(action.intent.restStartDay-1)*activeCalendar.minutesPerDay,endMinuteExclusive:(action.intent.restEndDayExclusive-1)*activeCalendar.minutesPerDay,locationId:action.intent.locationId,sourceIds:[...settled.sourceIds,'dmg:37:time-in-campaign']};
      calendar=scheduleCoreActivity(activeCalendar,activity,action.intent.rulings);
      life=validateCoreLifeState({...life,currentHp:settled.newHp});
      naturalRecovery={routeId:action.intent.routeId,continuousRestDays:settled.continuousRestDaysAfter,lastRestEndDay:action.intent.restEndDayExclusive};
      settled.sourceIds.forEach(id=>sources.add(id));sources.add('dmg:37:time-in-campaign');
    }else if(action.intent.type==='initialize-life'){
      if(life)throw new Error('Life state already initialized.');
      if(initial.initialHp===null||!action.intent.reason?.trim())throw new Error('Initialization requires recorded initial HP and an explicit DM current-HP confirmation.');
      const earned=state.history.filter(item=>item.type==='advancement.awarded').reduce((sum,item)=>sum+Number((item.hp as {actualAward:number}).actualAward),0);
      life=createCoreLifeState({actorId:runtime.transaction.characterId,currentHp:action.intent.currentHp,maximumHp:initial.initialHp+earned,initialConstitution:state.constitution});
      sources.add('project:life-state-initialization');
    }else if(action.intent.type==='damage'){
      if(!life)throw new Error('Confirm current HP before damage.');
      const result=applyHitPointLoss(life,{damage:action.intent.amount,cause:action.intent.cause,episodeId:`${action.id}:zero`,deathId:`${action.id}:death`,sameBlowEntryRule:action.intent.sameBlowEntryRule});
      if(result.status==='needs-dm')throw new Error(result.reason);life=result.state;result.sourceIds.forEach(id=>sources.add(id));
    }else if(action.intent.type==='record-defense'){
      const selected=defenseSelectionSchema.parse(action.intent.selection);
      const candidate=parseCoreCreation(initial.genesis.runtime.transaction.facts.modules[0].data).candidate!;
      const calculated=coreDefense({classId:state.classId,level:state.level,dexterity:evaluateCoreEligibility(candidate).adjustedScores.DEX,inventory,selection:selected});
      if(calculated.status!=='calculated')throw new Error(calculated.reason);
      defense=selected;calculated.sourceIds.forEach(id=>sources.add(id));
    }else if(action.intent.type==='actual-healing'){
      if(!life)throw new Error('Confirm current HP before actual healing.');
      const healed=applyActualHealing(life,action.intent);life=healed.state;healed.sourceIds.forEach(id=>sources.add(id));
    }else if(action.intent.type==='zero-hp-round'){
      if(!life)throw new Error('Life state is not initialized.');
      life=advanceZeroHpRound(life,{deathId:`${action.id}:death`,cause:action.intent.cause}).state;sources.add('dmg:82:zero-hit-points');
    }else if(action.intent.type==='friendly-aid'){
      if(!life)throw new Error('Life state is not initialized.');
      life=administerFriendlyAid(life).state;sources.add('dmg:82:zero-hit-points');
    }else if(action.intent.type==='settle-current-hp'){
      if(!life||life.hpSettlement!=='needs-dm'||!action.intent.reason?.trim())throw new Error('Only unresolved current HP may be settled with a DM reason.');
      if(life.mortality!=='alive'||action.intent.currentHp<1)throw new Error('HP settlement does not replace damage, revival or zero-HP state transitions.');
      life=validateCoreLifeState({...life,currentHp:action.intent.currentHp,hpSettlement:'settled'});sources.add('project:hp-settlement');
    }else if(action.intent.type==='learn-weapon'){
      if(!initial.initialWeaponIds)throw new Error('Recorded initial weapon identities are required before proficiency growth.');
      if(!action.intent.reason?.trim())throw new Error('Weapon acquisition requires a DM confirmation reason.');
      const requestedWeaponId=action.intent.weaponId;
      const choice=coreWeaponChoices.find(item=>item.id===requestedWeaponId);if(!choice)throw new Error('Weapon identity is not in the classified choice catalog.');
      const existing:{weaponId:string;level:number;actorId:string;reason:string;sourceIds:string[]}[]=weaponProficiencies??initial.initialWeaponIds.map(weaponId=>({weaponId,level:1,actorId:'creation-record',reason:'Recorded at creation',sourceIds:['phb:37:weapon-proficiency']}));
      const slots=validateCoreWeaponSelections({classId:state.classId,level:state.level,weaponIds:[...existing.map(item=>item.weaponId),choice.id]});
      const legality=evaluateCoreEquipmentLegality({classId:state.classId,item:{kind:'weapon',id:choice.id,family:choice.family}});
      if(legality.verdict!=='class-permitted')throw new Error('Weapon is prohibited or requires unresolved body-size/context review.');
      const cited=[...slots.sourceIds,...legality.sourceIds];cited.forEach(id=>sources.add(id));
      weaponProficiencies=[...existing,{weaponId:choice.id,level:state.level,actorId:action.actorId,reason:action.intent.reason,sourceIds:cited}];
    }else if(action.intent.type==='configure-calendar'){
      if(calendar)throw new Error('Calendar units are already recorded; migration requires a separate explicit operation.');
      calendar=newCoreCalendar(action.intent);sources.add('dmg:37:time-in-campaign');
    }else if(action.intent.type==='schedule-activity'){
      if(!calendar)throw new Error('Configure campaign calendar units first.');
      if(action.intent.activity.actorId!==runtime.transaction.characterId)throw new Error('Calendar activity belongs to a different character.');
      if(action.intent.activity.kind==='training')throw new Error('Training time must use the scheduled training operation.');
      calendar=scheduleCoreActivity(calendar,action.intent.activity,action.intent.rulings);
      action.intent.activity.sourceIds.forEach(id=>sources.add(id));
      sources.add('dmg:37:time-in-campaign');
    }else if(action.intent.type==='record-training-location-transition'){
      if(!calendar)throw new Error('Training location transition requires recorded calendar intervals.');
      calendar=recordCoreTrainingLocationTransition(calendar,{...action.intent,id:action.id,actorId:action.actorId});
      calendar.locationTransitions!.at(-1)!.sourceIds.forEach(id=>sources.add(id));
    }else if(action.intent.type==='adjudicate-activity-consequence'){
      if(!calendar)throw new Error('A recorded calendar overlap is required.');
      calendar=adjudicateCoreActivityConsequence(calendar,{...action.intent,id:action.id,actorId:action.actorId});
      const ruling=calendar.consequenceRulings!.at(-1)!;ruling.sourceIds.forEach(id=>sources.add(id));
    }else if(action.intent.type==='reconcile-training-segment'){
      if(!calendar||!state.candidate||!['training-active','ready-for-award'].includes(state.status))throw new Error('Reconciliation requires an existing pending course and a configured calendar.');
      if(!action.intent.reason?.trim())throw new Error('DM must explain the actual historical time and location being reconciled.');
      const segmentId=action.intent.segmentId,segment=state.candidate.segments.find(entry=>entry.id===segmentId);
      if(!segment)throw new Error('Unknown recorded training segment; reconciliation cannot invent progress.');
      const minutes=trainingSegmentMinutes(calendar,segment.weeksNumerator,segment.weeksDenominator);
      calendar=scheduleCoreActivity(calendar,{id:`${state.id}:training:${segment.id}`,actorId:runtime.transaction.characterId,kind:'training',startMinute:action.intent.startMinute,endMinuteExclusive:action.intent.startMinute+minutes,locationId:action.intent.locationId,sourceIds:['dmg:86:gaining-levels','dmg:37:time-in-campaign']});
      state={...state,revision:state.revision+1,history:[...state.history,{type:'training.time-reconciled',segmentId:segment.id,startMinute:action.intent.startMinute,locationId:action.intent.locationId,actorId:action.actorId,reason:action.intent.reason}]};
      sources.add('dmg:37:time-in-campaign');
    }else if(action.intent.type==='scheduled-training-segment'){
      if(!calendar)throw new Error('Configure campaign calendar units before scheduled training.');
      const segment=action.intent.segment;
      if(!state.candidate)throw new Error('No training candidate.');
      const prior=state.candidate.segments.at(-1);
      if(prior){const occupied=calendar.activities.find(item=>item.id===`${state.id}:training:${prior.id}`);if(!occupied||occupied.endMinuteExclusive!==action.intent.startMinute)throw new Error('Training segments must be calendar-contiguous; legacy unscheduled progress needs explicit reconciliation.');}
      const minutes=trainingSegmentMinutes(calendar,segment.weeksNumerator,segment.weeksDenominator);
      const proposed=scheduleCoreActivity(calendar,{id:`${state.id}:training:${segment.id}`,actorId:runtime.transaction.characterId,kind:'training',startMinute:action.intent.startMinute,endMinuteExclusive:action.intent.startMinute+minutes,locationId:action.intent.locationId,sourceIds:['dmg:86:gaining-levels','dmg:37:time-in-campaign']});
      const trained=recordTrainingSegment(state,segment);calendar=proposed;state=trained;
      sources.add('dmg:37:time-in-campaign');
    }else if(action.intent.type==='adopt-overrun-basis'){
      state=adoptCoreOverrunTrainingBasis(state,{...action.intent,actorId:action.actorId});
      sources.add('dmg:86:gaining-levels');
    }else if(action.intent.type==='experience'){
      if(!action.intent.assessment.id?.trim()||!['E','S','F','P'].includes(action.intent.assessment.rating))throw new Error('Experience assessment needs an identity and a printed performance rating.');
      if(!Array.isArray(action.intent.assessment.sourceIds)||!action.intent.assessment.sourceIds.length||action.intent.assessment.sourceIds.some(id=>typeof id!=='string'||!id.trim()))throw new Error('Experience assessment needs session sources.');
      action.intent.assessment.sourceIds.forEach(id=>sources.add(id));
      state=awardAdventureXp(state,action.intent.assessment);
    }else if(action.intent.type==='unpack-item'){
      if(!inventory)throw new Error('Verified inventory is required before unpacking.');
      if(!action.intent.sourceId?.trim()||!action.intent.reason?.trim())throw new Error('Unpacking requires a source and explanation.');
      inventory=unpackCoreInventoryBundle({ledger:inventory,itemId:action.intent.itemId,bundleCount:action.intent.bundleCount,pieceInstanceId:action.intent.pieceInstanceId,eventId:action.id,expectedRevision:inventory.revision});sources.add(action.intent.sourceId);
    }else if(action.intent.type==='consume-item'||action.intent.type==='relocate-item'){
      if(!inventory)throw new Error('Verified inventory is required before item operations.');
      if(!action.intent.sourceId?.trim()||!action.intent.reason?.trim())throw new Error('Item operation requires a source and explanation.');
      inventory=action.intent.type==='consume-item'?consumeCoreInventoryItem({ledger:inventory,itemId:action.intent.itemId,quantity:action.intent.quantity,expectedRevision:inventory.revision}):relocateInventoryItem({ledger:inventory,itemId:action.intent.itemId,destinationLocationId:action.intent.destinationLocationId,expectedRevision:inventory.revision});
      sources.add(action.intent.sourceId);
    }else if(action.intent.type==='income'){
      if(!inventory)throw new Error('Verified inventory is required before income.');
      if(!action.intent.sourceId?.trim()||!action.intent.reason?.trim())throw new Error('Income needs a source and a DM explanation.');
      inventory=receiveCoreWallet({ledger:inventory,walletId:action.intent.walletId,coins:action.intent.coins});sources.add(action.intent.sourceId);
    }else if(action.intent.type==='expense'){
      if(!inventory)throw new Error('Verified inventory is required before recording an expense.');
      if(!action.intent.sourceId?.trim()||!action.intent.reason?.trim())throw new Error('Expense needs a source and explanation.');
      if(!Number.isSafeInteger(action.intent.amountCp)||action.intent.amountCp<1)throw new Error('Expense amount must be a positive number of copper pieces.');
      inventory=spendCoreWallet({ledger:inventory,walletId:action.intent.walletId,amountCp:action.intent.amountCp,tender:action.intent.tender,change:action.intent.change});sources.add(action.intent.sourceId);
    }else if(action.intent.type==='open-advancement')state=openAdvancementCandidate(state);
    else if(action.intent.type==='plan-training'){
      const confirmation=action.intent.confirmation;
      if(confirmation){if(confirmation.sameClassProfessionAndAvailabilityConfirmed!==true||(action.intent.route==='tutor'?!confirmation.tutorName?.trim():confirmation.tutorName!==null))throw new Error('实际导师同职业同专业、可用性或自修确认不一致。');sources.add('project:training-plan-confirmation');}
      state=attachTrainingPlan(state,{route:action.intent.route,acceptedCostCp:action.intent.acceptedCostCp,costDecision:action.intent.reason?{actorId:action.actorId,reason:action.intent.reason}:undefined});
    }
    else if(action.intent.type==='plan-name-training')state=attachNameLevelTrainingPlan(state,{costFamily:action.intent.costFamily,acceptedCostCp:action.intent.acceptedCostCp,actorId:action.actorId,reason:action.intent.reason});
    else if(action.intent.type==='pay-training'){
      if(!inventory)throw new Error('Verified inventory is required before training payments.');
      if(state.candidate?.acceptedCostCp!==null&&state.candidate&&state.candidate.paymentsCp.reduce((a,b)=>a+b,0)+action.intent.amountCp>state.candidate.acceptedCostCp!)throw new Error('Payment exceeds the remaining accepted training charge.');
      const paid=payTraining(state,{paymentId:action.id,amountCp:action.intent.amountCp});
      const spent=spendCoreWallet({ledger:inventory,walletId:action.intent.walletId,amountCp:action.intent.amountCp,tender:action.intent.tender,change:action.intent.change});
      state=paid;inventory=spent;
    }else if(action.intent.type==='start-training')state=startTraining(state);
    else if(action.intent.type==='accept-gate')state=acceptAdvancementGate(state,{actorId:action.actorId,reason:action.intent.reason,...action.intent.classification?{classification:action.intent.classification}:{}});
    else if(action.intent.type==='interrupt-training')state=interruptTraining(state,{actorId:action.actorId,reason:action.intent.reason});
    else if(action.intent.type==='restart-training')state=restartInterruptedTraining(state,{actorId:action.actorId,reason:action.intent.reason});
    else if(action.intent.type==='training-segment'){
      if(calendar)throw new Error('Calendar-enabled training requires an occupied time interval.');
      state=recordTrainingSegment(state,action.intent.segment);
    }
    else if(action.intent.type==='award-level-dated'){
      if(action.intent.consequencePolicy!==undefined&&!['v1','v2'].includes(action.intent.consequencePolicy))throw new Error('Unsupported completion consequence policy.');
      if(action.intent.locationPolicy!==undefined&&action.intent.locationPolicy!=='v1')throw new Error('Unsupported training location policy.');
      const coverage=inspectCoreDatedTrainingCourse(state,calendar,runtime.transaction.characterId,{checkConsequences:action.intent.consequencePolicy!==undefined,checkLocations:action.intent.locationPolicy==='v1'});
      if(!Number.isSafeInteger(action.intent.awardMinute)||action.intent.awardMinute<coverage.completedAtMinute)throw new Error('Level award time cannot precede the recorded course completion.');
      state=awardCoreLevel(state,{actorId:action.actorId,hpRolls:action.intent.hpRolls});
      datedLevelAwards=[...(datedLevelAwards??[]),{...coverage,eventId:action.id,actorId:action.actorId,awardMinute:action.intent.awardMinute,...action.intent.consequencePolicy?{consequencePolicy:action.intent.consequencePolicy}:{},...action.intent.locationPolicy?{locationPolicy:action.intent.locationPolicy}:{}}];
      if(life){const award=state.history.at(-1)!.hp as {actualAward:number};life=validateCoreLifeState({...life,maximumHp:life.maximumHp+award.actualAward,currentHp:null,hpSettlement:'needs-dm'});}
      sources.add('dmg:37:time-in-campaign');
    }
    else if(action.intent.type==='award-level'){
      state=awardCoreLevel(state,{actorId:action.actorId,hpRolls:action.intent.hpRolls});
      if(life){const award=state.history.at(-1)!.hp as {actualAward:number};life=validateCoreLifeState({...life,maximumHp:life.maximumHp+award.actualAward,currentHp:null,hpSettlement:'needs-dm'});}
    }
    else throw new Error('Unsupported campaign action; original history must be preserved.');
    sources.add('dmg:86:gaining-levels');
    if(calendar&&spellPreparationCourses)assertPreparationHistoryCoherent(calendar,spellPreparationCourses,spellCastingTimes??[]);
 runtime=commitCharacter(runtime,{id:action.id,type:'character.module.replace',characterId:runtime.transaction.characterId,branchId:runtime.transaction.branchId,expectedRevision:action.expectedRevision,actorId:action.actorId,at:action.at,payload:{id:'core-advancement',kind:'adnd1e-core-advancement',schemaVersion:state.schemaVersion,visibility:'player',sourceIds:[...sources],data:asJson({...state,inventory,...calendar?{calendar}:{},...datedLevelAwards?{datedLevelAwards}:{},...weaponProficiencies?{weaponProficiencies}:{},...life?{life}:{},...lifeRecovery?{lifeRecovery}:{},...naturalRecovery?{naturalRecovery}:{},...publicRelationships?{relationships:publicRelationshipProjectionToModule(publicRelationships)}:{},...spells?{spells}:{},...defense?{defense}:{},...spellPreparationCourses?{spellPreparationCourses}:{},...spellCastingTimes?{spellCastingTimes}:{}})}},characterRegistry(sources)).runtime;
  }
  return {format:'adnd1e-core-campaign-runtime',schemaVersion:1,genesis:initial.genesis,actions:structuredClone(actions),runtime};
}
export const CORE_CAMPAIGN_ACTION_LIMIT=10000;
export function parseCoreCampaignArchive(value:unknown):CoreCampaignArchive{
  const raw=asJson(value) as unknown as CoreCampaignArchive;
  if(raw?.format!=='adnd1e-core-campaign-runtime'||raw.schemaVersion!==1||!Array.isArray(raw.actions)||raw.actions.length>CORE_CAMPAIGN_ACTION_LIMIT)throw new Error('Unsupported campaign archive.');
  const rebuilt=replayCoreCampaignActions(raw.genesis,raw.actions);
  if(canonical(asJson(raw))!==canonical(asJson(rebuilt)))throw new Error('Campaign snapshot differs from replayed rule actions.');
  return rebuilt;
}
export function commitCoreCampaignAction(archive:CoreCampaignArchive,action:CampaignAction):CoreCampaignArchive{
  const current=parseCoreCampaignArchive(archive);
  const module=current.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')?.data as unknown as {calendar?:CoreCampaignCalendar}|undefined;
  if(action.intent.type==='cast-prepared'&&module?.calendar&&action.intent.atMinute===undefined)throw new Error('已启用战役日历；新施法须记录战役时间，不能只用电脑时间。');
  assertCoreCampaignAppendCapacity(current.actions.length);
  if(action.intent.type==='training-segment')throw new Error('New training requires an occupied campaign calendar interval; legacy training-segment is replay-only.');
  if(action.intent.type==='award-level')throw new Error('Legacy award-level is replay-only; new awards require dated training and an explicit game-time award.');
  if(action.intent.type==='award-level-dated'&&action.intent.locationPolicy!=='v1')throw new Error('New training awards require explicit locationPolicy v1; older actions are replay-only.');
  if((action.intent.type==='award-level-dated'||action.intent.type==='complete-zero-hp-rest')&&action.intent.consequencePolicy!=='v2')throw new Error('New completion operations require explicit consequencePolicy v2; earlier policies are replay-only.');
  return replayCoreCampaignActions(current.genesis,[...current.actions,structuredClone(action)]);
}
/** Successful writes must remain readable under this archive version's limit. */
export function assertCoreCampaignAppendCapacity(count:number):void{
  if(!Number.isSafeInteger(count)||count<0||count>=CORE_CAMPAIGN_ACTION_LIMIT)throw new Error('Campaign action capacity reached; preserve and export the archive. No action was appended.');
}
