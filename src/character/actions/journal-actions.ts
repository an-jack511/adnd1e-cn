import {z} from 'zod';
import type {CampaignAction,CoreCampaignArchive} from '../workflows/core-campaign-runtime';
import {campaignGrowthState} from '../application/campaign-growth';

export const activityLabels={travel:'旅行',adventuring:'冒险',rest:'休整',study:'学习','language-study':'语言学习','spell-research':'法术研究','magic-item-manufacture':'魔法物品制造',other:'其他活动'} as const;
export const journalActivitySchema=z.object({
  type:z.literal('character.recordActivity'),
  kind:z.enum(['travel','adventuring','rest','study','language-study','spell-research','magic-item-manufacture','other']),
  startMinute:z.number().int().nonnegative(),endMinuteExclusive:z.number().int().positive(),
  location:z.string().trim().min(1).max(300),actualIntervalConfirmed:z.literal(true),
}).strict();
export type JournalActivityAction=z.infer<typeof journalActivitySchema>;
/** Record actual occupation only. No outcomes, costs, rest benefits or training progress. */
export function buildJournalActivity(input:CoreCampaignArchive,request:JournalActivityAction,eventId:string):CampaignAction['intent']{
  const action=journalActivitySchema.parse(request),{archive,calendar}=campaignGrowthState(input);
  if(!calendar)throw new Error('先明确采用战役日历，再登记实际活动时段。');
  if(action.endMinuteExclusive<=action.startMinute)throw new Error('实际结束必须晚于开始；不接受零时长或倒置时段。');
  return {type:'schedule-activity',activity:{id:`${eventId}:actual-activity`,actorId:archive.runtime.transaction.characterId,kind:action.kind,startMinute:action.startMinute,endMinuteExclusive:action.endMinuteExclusive,locationId:action.location,sourceIds:['project:confirmed-actual-activity-interval']}};
}
