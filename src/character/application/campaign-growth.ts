import {parseCoreCampaignArchive,type CoreCampaignArchive} from '../workflows/core-campaign-runtime';
import {parseCoreCreation} from '../workflows/core-create';
import {newCoreAdvancement,type CoreAdvancementState} from '../workflows/core-advancement';
import {evaluateCoreEligibility} from '../engine/core-eligibility';
import {checkCoreAdvancement} from '../engine/core-progression';
import {getCoreProgressionRow,type InitialCoreClassId} from '../rules/core-progression';
import {resolveCoreTrainingStage} from '../engine/core-training-stage';
import {planBelowNameTraining,planNameLevelTraining} from '../engine/core-training';
import {coreCombatBase} from '../engine/core-combat';
import {projectCapabilitiesForPlayer} from '../engine/core-class-capabilities';
import {campaignSheet} from './campaign-sheet';
import {trainingSegmentMinutes,type CoreCampaignCalendar} from '../workflows/core-calendar';
import {inspectCoreDatedTrainingCourse} from '../workflows/core-dated-training';
import {previousCoreCourseAssessments} from '../workflows/core-overrun-training';
export const growthStatusLabels:Record<CoreAdvancementState['status'],string>={adventuring:'冒险中','eligible-needs-dm':'资格待DM裁定','training-planned':'课程筹备','training-active':'实际训练中','ready-for-award':'训练完成，待正式授级','training-interrupted':'严重中断，须重新开课'};

export function campaignGrowthState(input:CoreCampaignArchive){
  const archive=parseCoreCampaignArchive(input),creation=parseCoreCreation(archive.genesis.runtime.transaction.facts.modules[0].data),candidate=creation.candidate!,classId=candidate.classIds[0] as InitialCoreClassId,scores=evaluateCoreEligibility(candidate);
  const module=archive.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')?.data as unknown as (CoreAdvancementState&{calendar?:CoreCampaignCalendar})|undefined;
  return {archive,creation,state:module??newCoreAdvancement({id:`${creation.id}:advancement`,classId,level:1,xp:0,constitution:scores.adjustedScores.CON,levelCap:scores.classLevelCaps[classId]}),calendar:module?.calendar??null};
}
export function growthTrainingFormula(state:CoreAdvancementState,route:'tutor'|'self',family?:'cleric'|'fighter'|'magic-user'|'thief'){
  const stage=resolveCoreTrainingStage(state.classId,state.level);
  if(stage.stage==='below-name')return planBelowNameTraining({currentLevel:state.level,ratings:state.assessments.map(a=>a.rating),route});
  const selected=stage.printedCostFamily??family;
  if(!selected)throw new Error('该职业名号后费用未由DMG列为四个明确族之一，须DM明确采用，不得自动套战士。');
  if(stage.printedCostFamily&&family&&family!==stage.printedCostFamily)throw new Error('不能替换原书已明确的名号后收费族。');
  return planNameLevelTraining({currentLevel:state.level,ratings:state.assessments.map(a=>a.rating),costFamily:selected});
}
export function printedTrainingCostCp(plan:ReturnType<typeof growthTrainingFormula>):number|null{
  const numerator=BigInt(plan.totalCostGpNumerator)*200n,denominator=BigInt(plan.totalCostGpDenominator);
  if(numerator%denominator!==0n)return null;const value=Number(numerator/denominator);if(!Number.isSafeInteger(value))throw new Error('训练费用超出精确记账范围。');return value;
}
export function remainingTrainingWeeks(state:CoreAdvancementState){
  const training=state.candidate?.training;if(!training)return {numerator:0,denominator:1};
  let n=BigInt(training.weeksNumerator),d=BigInt(training.weeksDenominator);
  for(const segment of state.candidate!.segments){n=n*BigInt(segment.weeksDenominator)-BigInt(segment.weeksNumerator)*d;d*=BigInt(segment.weeksDenominator);let a=n<0n?-n:n,b=d;while(b){const c=a%b;a=b;b=c;}if(a){n/=a;d/=a;}}
  if(n<=0n)return {numerator:0,denominator:1};if(n>BigInt(Number.MAX_SAFE_INTEGER)||d>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('剩余训练周数超出精确范围，不能近似显示。');return {numerator:Number(n),denominator:Number(d)};
}
export function campaignGrowth(input:CoreCampaignArchive){
  const {archive,state,calendar}=campaignGrowthState(input),sheet=campaignSheet(archive),check=checkCoreAdvancement({classId:state.classId,currentLevel:state.level,xp:state.xp,levelCap:state.levelCap}),stage=resolveCoreTrainingStage(state.classId,state.level),next=getCoreProgressionRow(state.classId,state.level+1);
  const options=(!state.assessments.length?[]:(stage.stage==='below-name'?['tutor','self'] as const:['self'] as const)).map(route=>{
    try{const plan=growthTrainingFormula(state,route);return {route,available:true,reason:'',weeksNumerator:plan.weeksNumerator,weeksDenominator:plan.weeksDenominator,costCp:printedTrainingCostCp(plan),costGpNumerator:plan.totalCostGpNumerator,costGpDenominator:plan.totalCostGpDenominator};}
    catch(error){return {route,available:false,reason:stage.stage==='below-name'&&route==='self'?'本轮平均评定不低于2；名号前不能直接自行训练，须寻找实际导师。':(error as Error).message,weeksNumerator:0,weeksDenominator:1,costCp:null,costGpNumerator:0,costGpDenominator:1};}
  });
  const currentAbilities=projectCapabilitiesForPlayer(state.classId,state.level),prospectiveAbilities=projectCapabilitiesForPlayer(state.classId,state.level+1);
  let coverage:ReturnType<typeof inspectCoreDatedTrainingCourse>|null=null,coverageIssue='';
  if(state.status==='ready-for-award')try{coverage=inspectCoreDatedTrainingCourse(state,calendar,archive.runtime.transaction.characterId);}catch(error){coverageIssue=(error as Error).message;}
  const training=state.candidate?.training??null,paidCp=state.candidate?.paymentsCp.reduce((a,b)=>a+b,0)??0;
  let requiredMinutes:number|null=null;if(calendar&&training)try{requiredMinutes=trainingSegmentMinutes(calendar,training.weeksNumerator,training.weeksDenominator);}catch{ /* Preserve rational time; never round. */ }
  return {name:sheet.name,career:sheet.career,level:state.level,xp:state.xp,status:state.status,requiresCampaignException:typeof state.levelCap==='number'&&check.targetLevel>state.levelCap,check:{status:check.status,targetLevel:check.targetLevel,threshold:check.row?.xpMin??null,reasons:[...check.reasons],sourceIds:[...check.sourceIds]},stage,options,
    assessments:state.assessments.map(a=>({xp:a.xp,rating:a.rating})),candidate:state.candidate?{targetLevel:state.candidate.targetLevel,planned:Boolean(training),acceptedCostCp:state.candidate.acceptedCostCp,paidCp,remainingCp:Math.max(0,(state.candidate.acceptedCostCp??0)-paidCp),weeksNumerator:training?.weeksNumerator??0,weeksDenominator:training?.weeksDenominator??1,segments:state.candidate.segments.map(s=>({weeksNumerator:s.weeksNumerator,weeksDenominator:s.weeksDenominator})),requiredMinutes}:null,
    hp:next.status==='unknown'?null:{dice:next.row.hitDiceGained,sides:next.row.hitDieSides,fixed:next.row.fixedHpGained},maximumHp:sheet.maximumHp,life:sheet.life,calendar:sheet.calendar,wallets:sheet.inventory?.wallets.map(w=>({id:w.id,label:w.label,coins:{...w.coins}}))??[],
    combatBefore:coreCombatBase(state.classId,state.level),combatAfter:next.status==='unknown'?null:coreCombatBase(state.classId,state.level+1),
    abilityChanges:prospectiveAbilities.filter(a=>!currentAbilities.some(before=>before.id===a.id&&JSON.stringify(before.value)===JSON.stringify(a.value))).map(a=>({label:a.label,rule:a.rule,status:a.status,value:a.value,sourceIds:[...a.sourceIds]})),coverage,coverageIssue,
    hasPriorRatingHistory:state.history.some(e=>e.type==='experience.awarded'),priorCourseRatings:previousCoreCourseAssessments(state).map(a=>({xp:a.xp,rating:a.rating})),remainingWeeks:remainingTrainingWeeks(state),lastSegmentEndMinute:calendar&&state.candidate?.segments.length?calendar.activities.find(a=>a.id===`${state.id}:training:${state.candidate!.segments.at(-1)!.id}`)?.endMinuteExclusive??null:null};
}
export type CampaignGrowthView=ReturnType<typeof campaignGrowth>;
export function formatCpAsGp(cp:number):string{
  if(!Number.isSafeInteger(cp)||cp<0)throw new Error('钱币数值超出精确范围。');
  const n=BigInt(cp),fraction=((n%200n)*5n).toString().padStart(3,'0').replace(/0+$/,'');
  return `${n/200n}${fraction?'.'+fraction:''}`;
}
export function parseGpToCp(value:string):number{
  const text=value.trim();if(!/^\d+(?:\.\d{1,3})?$/.test(text)||text.length>24)throw new Error('请填写精确gp金额，最小单位为0.005gp（1cp）。');
  const [whole,fraction='']=text.split('.'),scaled=BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'));
  if(scaled%5n!==0n)throw new Error('金额不足整cp，不能自动舍入。');
  const cp=Number(scaled/5n);if(!Number.isSafeInteger(cp)||cp<=0)throw new Error('付款须为精确的正数金额。');return cp;
}
export function parseTrainingWeeks(value:string):{numerator:number;denominator:number}{
  const text=value.trim();if(text.length>40||!/^\d+(?:\.\d{1,8}|\/\d+)?$/.test(text))throw new Error('请填正周数，例如1.5或3/2；不使用近似舍入。');
  let n:bigint,d:bigint;
  if(text.includes('/')){const parts=text.split('/');n=BigInt(parts[0]);d=BigInt(parts[1]);}
  else{const [whole,fraction='']=text.split('.');d=10n**BigInt(fraction.length);n=BigInt(whole)*d+BigInt(fraction||'0');}
  if(n<=0n||d<=0n)throw new Error('已完成训练周数必须大于零。');let a=n,b=d;while(b){const next=a%b;a=b;b=next;}n/=a;d/=a;
  if(n>BigInt(Number.MAX_SAFE_INTEGER)||d>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('训练周数超出精确范围。');return {numerator:Number(n),denominator:Number(d)};
}
