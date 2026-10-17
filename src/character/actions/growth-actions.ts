import {z} from 'zod';
import type {CampaignAction,CoreCampaignArchive} from '../workflows/core-campaign-runtime';
import {campaignGrowthState,growthTrainingFormula,printedTrainingCostCp} from '../application/campaign-growth';
import {resolveCoreTrainingStage} from '../engine/core-training-stage';
import {campaignSheet} from '../application/campaign-sheet';
import {coinValueCp,type CoinDenomination} from '../rules/core-inventory';
import {emptyCoins,moneyValueCp,type CoinCounts} from '../engine/core-inventory';
import {previousCoreCourseAssessments} from '../workflows/core-overrun-training';

const text=z.string().trim().min(1).max(500),natural=z.number().int().nonnegative(),positive=z.number().int().positive();
export const coinsSchema=z.object({cp:natural,sp:natural,ep:natural,gp:natural,pp:natural}).strict();
export const growthActionSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('character.growth.experience'),xp:natural,rating:z.enum(['E','S','F','P']),finalAwardConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.income'),walletId:text,coins:coinsSchema,actualIncomeConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.open')}).strict(),
  z.object({type:z.literal('character.growth.plan'),route:z.enum(['tutor','self']),tutorName:z.string().trim().max(200),actualInstructionConfirmed:z.literal(true),costFamily:z.enum(['cleric','fighter','magic-user','thief']).optional(),acceptedCostCp:natural.optional(),overrideReason:text.optional()}).strict(),
  z.object({type:z.literal('character.growth.pay'),walletId:text,amountCp:positive.optional(),exactCoinsConfirmed:z.literal(true),tender:coinsSchema.optional(),change:coinsSchema.optional()}).strict(),
  z.object({type:z.literal('character.growth.start'),actualStartConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.calendar'),minutesPerDay:positive,daysPerWeek:positive,adoptedConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.progress'),weeksNumerator:positive,weeksDenominator:positive,startMinute:natural,location:text,actualContinuousConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.award'),hpRolls:z.array(positive).max(2),awardMinute:natural,dmAwardConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.settleHp'),currentHp:positive,actualHpConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.gate'),reason:text,classification:z.enum(['factual-confirmation','campaign-exception']),dmDecisionConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.adoptRatings'),reason:text,campaignAdoptionConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.interrupt'),reason:text,seriousInterruptionConfirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.growth.restart'),reason:text,dmRestartConfirmed:z.literal(true)}).strict(),
]);
export type GrowthAction=z.infer<typeof growthActionSchema>;
export function isGrowthAction(action:{type:string}):action is GrowthAction{return action.type.startsWith('character.growth.');}
/** Exact existing denominations only. Never silently exchange coins or borrow another wallet. */
export function exactTrainingTender(coins:CoinCounts,costCp:number):CoinCounts{
  coinsSchema.parse(coins);natural.parse(costCp);const tender={...emptyCoins()};let remaining=costCp;
  for(const denomination of ['pp','gp','ep','sp','cp'] as CoinDenomination[]){const n=Math.min(coins[denomination],Math.floor(remaining/coinValueCp[denomination]));tender[denomination]=n;remaining-=n*coinValueCp[denomination];}
  if(remaining)throw new Error('该钱包没有可直接付清的面额；不能自动换币、找零或挪用其他钱包，请记录真实付款与找零。');
  return tender;
}
export function buildGrowthIntent(input:CoreCampaignArchive,request:GrowthAction,eventId:string):{title:string;intent:CampaignAction['intent']}{
  const action=growthActionSchema.parse(request),{state}=campaignGrowthState(input),sheet=campaignSheet(input);
  if(['character.growth.start','character.growth.progress','character.growth.award'].includes(action.type)&&(!sheet.life||sheet.life.mortality!=='alive'||sheet.life.actionRestriction!=='none'||sheet.life.hpSettlement!=='settled'))throw new Error('先确认当前人物生命与可行动状态；昏迷、休养禁令或待结算HP不能直接进行普通训练。');
  switch(action.type){
    case 'character.growth.experience':return {title:'录入已确认经验结算',intent:{type:'experience',assessment:{id:`${eventId}:assessment`,xp:action.xp,rating:action.rating,sourceIds:['dmg:86:gaining-levels','project:confirmed-final-xp-award']}}};
    case 'character.growth.income':if(moneyValueCp(action.coins)<=0)throw new Error('实际收入至少有一枚钱币。');return {title:'记录实际钱币收入',intent:{type:'income',walletId:action.walletId,coins:action.coins,sourceId:'project:actual-coin-income',reason:'团桌已确认的实际收入；不自动换算或重复授予XP。'}};
    case 'character.growth.open':return {title:'开启升级候选',intent:{type:'open-advancement'}};
    case 'character.growth.calendar':return {title:'明确战役日历',intent:{type:'configure-calendar',minutesPerDay:action.minutesPerDay,daysPerWeek:action.daysPerWeek}};
    case 'character.growth.plan':{
      const stage=resolveCoreTrainingStage(state.classId,state.level),formula=growthTrainingFormula(state,action.route,action.costFamily),exact=printedTrainingCostCp(formula),acceptedCostCp=action.acceptedCostCp??exact;
      if(stage.stage==='name-level'&&action.route!=='self')throw new Error('名号后采用自行训练阶段；不能把导师路线默默转换成自修。');
      if(acceptedCostCp===null)throw new Error('原式含不足一cp的余数，须DM明确舍入金额与理由，工具不会自动四舍五入。');
      if((stage.stage==='below-name'&&action.route==='tutor')&&!action.tutorName.trim())throw new Error('请记录实际导师；同职业同专业与可用性不能由程序假定。');
      if((acceptedCostCp!==exact||stage.printedCostFamily===null&&stage.stage==='name-level')&&!action.overrideReason)throw new Error('非原式金额或原书未列的收费族须明确DM采用理由。');
      const confirmation={tutorName:action.route==='tutor'?action.tutorName:null,sameClassProfessionAndAvailabilityConfirmed:true as const};
      return stage.stage==='below-name'?{title:'确认训练课程',intent:{type:'plan-training',route:action.route,acceptedCostCp,...action.overrideReason?{reason:action.overrideReason}:{},confirmation}}:{title:'确认名号后自修',intent:{type:'plan-name-training',costFamily:stage.printedCostFamily??action.costFamily!,acceptedCostCp,reason:action.overrideReason??'按DMG已明确的职业收费族与原式金额确认实际自修。'}};
    }
    case 'character.growth.pay':{
      const remaining=(state.candidate?.acceptedCostCp??0)-(state.candidate?.paymentsCp.reduce((a,b)=>a+b,0)??0),wallet=sheet.inventory?.wallets.find(w=>w.id===action.walletId);
      if(remaining<=0||!wallet)throw new Error('尚无应付课程余额或已核钱包。');
      const amountCp=action.amountCp??remaining;
      if(amountCp>remaining)throw new Error('本次付款不能超过课程应付余额。');
      if(moneyValueCp(wallet.coins)<amountCp)throw new Error('所选钱包余额不足；请先处理实际收入或约定费用，不自动借款。');
      if((action.tender===undefined)!==(action.change===undefined))throw new Error('实际交付与找零必须同时记录。');
      return {title:'记录实际训练付款',intent:{type:'pay-training',amountCp,walletId:wallet.id,tender:action.tender??exactTrainingTender(wallet.coins,amountCp),change:action.change??emptyCoins()}};
    }
    case 'character.growth.start':return {title:'开始实际训练课程',intent:{type:'start-training'}};
    case 'character.growth.progress':return {title:'登记已完成连续训练',intent:{type:'scheduled-training-segment',segment:{id:`${eventId}:segment`,weeksNumerator:action.weeksNumerator,weeksDenominator:action.weeksDenominator,dmConfirmedContinuous:true},startMinute:action.startMinute,locationId:action.location}};
    case 'character.growth.award':return {title:'确认正式授级',intent:{type:'award-level-dated',hpRolls:action.hpRolls,awardMinute:action.awardMinute,consequencePolicy:'v2',locationPolicy:'v1'}};
    case 'character.growth.settleHp':return {title:'确认授级后实际当前HP',intent:{type:'settle-current-hp',currentHp:action.currentHp,reason:'记录团桌确认的实际当前HP；升级与训练未自动当成治疗。'}};
    case 'character.growth.gate':return {title:'记录升级前DM裁定',intent:{type:'accept-gate',reason:action.reason,classification:action.classification}};
    case 'character.growth.adoptRatings':return {title:'明确跨门槛下一课程的评定采用',intent:{type:'adopt-overrun-basis',interpretation:'reuse-recorded-adventure-ratings',assessmentIds:previousCoreCourseAssessments(state).map(a=>a.id),reason:action.reason}};
    case 'character.growth.interrupt':return {title:'记录严重训练中断',intent:{type:'interrupt-training',reason:action.reason}};
    case 'character.growth.restart':return {title:'重新开始中断课程',intent:{type:'restart-training',reason:action.reason}};
  }
}
