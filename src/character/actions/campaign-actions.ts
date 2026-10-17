import {z} from 'zod';
import {canonical,type Json} from '../domain/transactions';
import {commitCoreCampaignAction,parseCoreCampaignArchive,type CampaignAction,type CoreCampaignArchive} from '../workflows/core-campaign-runtime';
import {campaignSheet,lifeLabels} from '../application/campaign-sheet';
import {defenseSelectionSchema} from '../engine/core-defense';
import {preparationFactsSchema} from '../workflows/core-campaign-preparation';
import {formatCampaignMinute} from '../application/campaign-time';
import {growthActionSchema,isGrowthAction,buildGrowthIntent} from './growth-actions';
import {campaignGrowth,growthStatusLabels} from '../application/campaign-growth';
import {journalActivitySchema,buildJournalActivity,activityLabels} from './journal-actions';

const text=z.string().trim().min(1).max(500),positive=z.number().int().min(1);
const coins=z.object({cp:z.number().int().min(0),sp:z.number().int().min(0),ep:z.number().int().min(0),gp:z.number().int().min(0),pp:z.number().int().min(0)}).strict();
export const sheetActionSchema=z.discriminatedUnion('type',[
  ...growthActionSchema.options,
  journalActivitySchema,
  z.object({type:z.literal('character.initializeLife'),currentHp:positive,confirmed:z.literal(true)}).strict(),
  z.object({type:z.literal('character.takeDamage'),amount:positive,cause:text,sameBlowEntryRule:z.enum(['strict-zero','allow-minus-three']).optional()}).strict(),
  z.object({type:z.literal('character.heal'),amount:positive,description:text}).strict(),
  z.object({type:z.literal('character.equipDefense'),selection:defenseSelectionSchema}).strict(),
  z.object({type:z.literal('character.prepareSpells'),facts:preparationFactsSchema}).strict(),
  z.object({type:z.literal('character.useItem'),itemId:text,quantity:positive,reason:text}).strict(),
  z.object({type:z.literal('character.receiveWealth'),walletId:text,coins,sourceId:text,reason:text}).strict(),
  z.object({type:z.literal('character.spendWealth'),walletId:text,amountCp:positive,tender:coins,change:coins,sourceId:text,reason:text}).strict(),
  z.object({type:z.literal('character.relocateItem'),itemId:text,destinationLocationId:text,sourceId:text,reason:text}).strict(),
  z.object({type:z.literal('character.unpackItem'),itemId:text,bundleCount:positive,pieceInstanceId:text,sourceId:text,reason:text}).strict(),
  z.object({type:z.literal('character.castSpell'),copyId:text,componentsConfirmed:z.literal(true),outcome:z.string().max(1000),atMinute:z.number().int().nonnegative().optional()}).strict(),
]);
export type SheetAction=z.infer<typeof sheetActionSchema>;
export type ActionContext={id:string;actorId:string;at:string};
export interface SheetActionPlan {readonly status:'ready';readonly title:string;readonly changes:readonly string[];readonly expectedRevision:number}
type StoredPlan={base:string;action:CampaignAction};
const plans=new WeakMap<SheetActionPlan,StoredPlan>();
const fingerprint=(value:CoreCampaignArchive)=>canonical(value as unknown as Json);
export function previewSheetAction(input:CoreCampaignArchive,request:SheetAction,context:ActionContext):SheetActionPlan{
  const archive=parseCoreCampaignArchive(input),action=sheetActionSchema.parse(request);let intent:CampaignAction['intent'],title:string;
  if(isGrowthAction(action)){({title,intent}=buildGrowthIntent(archive,action,context.id));}
  else if(action.type==='character.recordActivity'){title='登记实际活动时段';intent=buildJournalActivity(archive,action,context.id);}
  else if(action.type==='character.initializeLife'){title='确认当前生命';intent={type:'initialize-life',currentHp:action.currentHp,reason:'团桌确认当前实际HP；不是自动治疗或重置。'};}
  else if(action.type==='character.takeDamage'){title='记录伤害';intent={type:'damage',amount:action.amount,cause:action.cause,...action.sameBlowEntryRule?{sameBlowEntryRule:action.sameBlowEntryRule}:{}};}
  else if(action.type==='character.heal'){title='记录实际治疗';intent={type:'actual-healing',amount:action.amount,description:action.description};}
  else if(action.type==='character.equipDefense'){title='确认实际穿戴';intent={type:'record-defense',selection:action.selection};}
  else if(action.type==='character.prepareSpells'){title='完成法术学习／祈祷';intent={type:'prepare-spells',facts:action.facts};}
  else if(action.type==='character.useItem'){title='使用物品';intent={type:'consume-item',itemId:action.itemId,quantity:action.quantity,reason:action.reason,sourceId:'project:sheet-player-item-use'};}
  else if(action.type==='character.receiveWealth'){title='记录财富入账';intent={type:'income',walletId:action.walletId,coins:action.coins,sourceId:action.sourceId,reason:action.reason};}
  else if(action.type==='character.spendWealth'){title='记录财富支出';intent={type:'expense',walletId:action.walletId,amountCp:action.amountCp,tender:action.tender,change:action.change,sourceId:action.sourceId,reason:action.reason};}
  else if(action.type==='character.relocateItem'){title='记录物品位置变化';intent={type:'relocate-item',itemId:action.itemId,destinationLocationId:action.destinationLocationId,sourceId:action.sourceId,reason:action.reason};}
  else if(action.type==='character.unpackItem'){title='拆分同质整包';intent={type:'unpack-item',itemId:action.itemId,bundleCount:action.bundleCount,pieceInstanceId:action.pieceInstanceId,sourceId:action.sourceId,reason:action.reason};}
  else {title='消耗法术准备副本';intent={type:'cast-prepared',copyId:action.copyId,components:'satisfied',observedOutcome:action.outcome,reason:'团桌已确认本次组件与情境；这里只记录实际消费，不自动结算法术效果。',...action.atMinute===undefined?{}:{atMinute:action.atMinute}};}
  const command:CampaignAction={...context,expectedRevision:archive.runtime.transaction.revision,intent};
  const next=commitCoreCampaignAction(archive,command),before=campaignSheet(archive),after=campaignSheet(next);
  const changes=['character.initializeLife','character.takeDamage','character.heal'].includes(action.type)?[`HP：${before.life?.currentHp??'尚未确认'} → ${after.life?.currentHp??'尚未确认'}`]:[];
  if(action.type==='character.useItem')changes.push(`物品：${before.inventory?.items.find(i=>i.id===action.itemId)?.quantity??'未知'} → ${after.inventory?.items.find(i=>i.id===action.itemId)?.quantity??0}`);
  if(action.type==='character.receiveWealth'||action.type==='character.spendWealth')changes.push(`账面财富：${(before.wealthCp/200).toLocaleString()} → ${(after.wealthCp/200).toLocaleString()} gp；钱币重量与具体钱包均保留在档案中。`);
  if(action.type==='character.relocateItem')changes.push(`物品位置：${before.inventory?.locations.find(l=>l.id===before.inventory?.items.find(i=>i.id===action.itemId)?.locationId)?.label??'待核'} → ${after.inventory?.locations.find(l=>l.id===after.inventory?.items.find(i=>i.id===action.itemId)?.locationId)?.label??'待核'}；不自动判断可及性或负重合法性。`);
  if(action.type==='character.unpackItem')changes.push('仅拆分原书定义的同质整包；不擅自推断混合包内容。');
  if(action.type==='character.castSpell'){
    changes.push(`消耗 ${before.prepared.find(c=>c.id===action.copyId)?.name??'所选法术'} 一份；不治疗、造成伤害或自动扣除材料。`);
    if(action.atMinute!==undefined&&before.calendar)changes.push(`施放时间：${formatCampaignMinute(action.atMinute,before.calendar.minutesPerDay)}。`);
  }
  if(action.type==='character.heal')changes.push('恢复不超过最大HP；不决定效果来源、扣除治疗物品或解除休养禁令。');
  if(action.type==='character.recordActivity')changes.push(`${activityLabels[action.kind]}：${formatCampaignMinute(action.startMinute,after.calendar!.minutesPerDay)} → ${formatCampaignMinute(action.endMinuteExclusive,after.calendar!.minutesPerDay)}。只记录实际占用，不核定收益、恢复、训练、费用或经验。`);
  if(action.type==='character.equipDefense')changes.push(`参考AC：${before.defense.ac??'待确认'} → ${after.defense.ac??'待核'}；记录团桌已完成的穿戴，不自动花费时间或占用手部。`);
  if(action.type==='character.prepareSpells'){
    changes.push(`战役时间：${formatCampaignMinute(action.facts.restStartMinute,after.calendar!.minutesPerDay)} → ${formatCampaignMinute(action.facts.studyEndMinute,after.calendar!.minutesPerDay)}。`);
    changes.push(action.facts.choices.map(choice=>`${before.spells?.choices.find(c=>c.kind===choice.kind&&c.id===choice.id)?.name??'待核法术'} × ${choice.quantity}份`).join('、'));
    changes.push(`可用准备：${before.prepared.filter(c=>c.status==='ready').length} → ${after.prepared.filter(c=>c.status==='ready').length}份；未消耗的旧准备保留。`);
    changes.push(`记录完整休息${action.facts.restEndMinute-action.facts.restStartMinute}分钟、学习／祈祷${action.facts.studyEndMinute-action.facts.studyStartMinute}分钟；不恢复HP或自动消耗食物。`);
  }
  if(after.life?.actionRestriction!=='none'&&after.life)changes.push(`行动限制：${lifeLabels[after.life.actionRestriction]??'待核'}；未自动解除。`);
  if(isGrowthAction(action)){
    const b=campaignGrowth(archive),a=campaignGrowth(next);
    changes.push(`等级 ${b.level} → ${a.level}；XP ${b.xp} → ${a.xp}。`);
    if(b.status!==a.status)changes.push(`处理阶段：${growthStatusLabels[b.status]} → ${growthStatusLabels[a.status]}。`);
    if(action.type==='character.growth.calendar')changes.push(`明确采用一天${action.minutesPerDay}分钟、一周${action.daysPerWeek}天；不自动推进日期。`);
    if(action.type==='character.growth.plan')changes.push(`已确认费用 ${(a.candidate!.acceptedCostCp!/200).toLocaleString()}gp；${a.candidate!.weeksNumerator}/${a.candidate!.weeksDenominator}周连续课程。`);
    if(action.type==='character.growth.pay'||action.type==='character.growth.income')changes.push(`账面钱币 ${(before.wealthCp/200).toLocaleString()} → ${(after.wealthCp/200).toLocaleString()}gp；只改变实际钱包，不自动换币或授予XP。`);
    if(action.type==='character.growth.award')changes.push(`最大HP ${b.maximumHp} → ${a.maximumHp}；实际当前HP待另行确认，不把升级或训练当成治疗。`);
    if(action.type==='character.growth.progress')changes.push(`实际已完成连续训练 ${action.weeksNumerator}/${action.weeksDenominator} 周；占用战役日历，不按电脑时间自动完成。`);
    if(action.type==='character.growth.progress'&&a.lastSegmentEndMinute!==null&&a.calendar)changes.push(`${formatCampaignMinute(action.startMinute,a.calendar.minutesPerDay)} → ${formatCampaignMinute(a.lastSegmentEndMinute,a.calendar.minutesPerDay)}。`);
  }
  const plan=Object.freeze({status:'ready' as const,title,changes:Object.freeze(changes),expectedRevision:command.expectedRevision});
  plans.set(plan,{base:fingerprint(archive),action:structuredClone(command)});return plan;
}
export function commitSheetAction(input:CoreCampaignArchive,plan:SheetActionPlan):CoreCampaignArchive{
  const stored=plans.get(plan);if(!stored)throw new Error('Unknown or reconstructed preview; preview again.');
  const archive=parseCoreCampaignArchive(input),already=archive.actions.find(a=>a.id===stored.action.id);
  if(already){if(canonical(already as unknown as Json)!==canonical(stored.action as unknown as Json))throw new Error('Command identity conflict.');return archive;}
  if(fingerprint(archive)!==stored.base)throw new Error('Character changed after preview; preview again.');
  // Re-run the current-policy writer. A preview never grants authority to bypass it.
  return commitCoreCampaignAction(archive,stored.action);
}
