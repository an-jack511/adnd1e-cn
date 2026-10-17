import {campaignPreparationCapacity,divinePreparationChoices,type CampaignSpellLedger,type PreparationContext,type PreparationCourse} from '../workflows/core-campaign-preparation';
import type {CoreCampaignCalendar} from '../workflows/core-calendar';
import type {CoreLifeState} from '../engine/core-life-state';

export interface CampaignSpellView {
  tradition:string;isDivine:boolean;enabled:boolean;reason:string;
  choices:{id:string;kind:'spellbook-entry'|'divine-spell';name:string;level:number}[];
  capacity:{level:number;ready:number;maximum:number}[];
  calendar:{minutesPerDay:number;daysPerWeek:number}|null;
  latestCourse:PreparationCourse|null;latestCastingId:string|null;
}
/** Strict allowlist; no source provenance, divine authority or private adjudication fields. */
export function campaignSpellView(ledger:CampaignSpellLedger,context:PreparationContext,calendar:CoreCampaignCalendar|null,courses:readonly PreparationCourse[],life:CoreLifeState|null):CampaignSpellView{
  const isDivine=['cleric','druid'].includes(ledger.tradition),latestCastingId=ledger.castings.at(-1)?.id??null;
  const view:CampaignSpellView={tradition:ledger.tradition,isDivine,enabled:false,reason:'',choices:[],capacity:[],calendar:calendar?{minutesPerDay:calendar.minutesPerDay,daysPerWeek:calendar.daysPerWeek}:null,latestCourse:null,latestCastingId};
  try{
    const track=campaignPreparationCapacity(ledger,context);
    view.capacity=track.levels.filter(row=>row.preparedCapacity>0).map(row=>({level:row.spellLevel,maximum:row.preparedCapacity,ready:ledger.preparedCopies.filter(c=>c.status==='ready'&&c.spell.level===row.spellLevel).length}));
    view.choices=isDivine?divinePreparationChoices(ledger).map(s=>({id:s.definitionId,kind:'divine-spell',name:s.displayName,level:s.level})):ledger.spellbookEntries.filter(e=>e.status==='present').map(e=>({id:e.id,kind:'spellbook-entry',name:e.spell.displayName,level:e.spell.level}));
    view.choices=view.choices.filter(s=>track.levels.some(row=>row.spellLevel===s.level&&row.preparedCapacity>0));
    const latest=courses.at(-1);view.latestCourse=latest&&latest.lastCastingId===latestCastingId?structuredClone(latest):null;
    view.enabled=Boolean(life?.mortality==='alive'&&life.actionRestriction==='none'&&life.hpSettlement==='settled');
    view.reason=view.enabled?'先选择本次需要的份数，再记录实际休息与学习／祈祷；不会覆盖尚可用的准备。':'先确认生命状态；普通准备不能代替苏醒、复活卧床或零HP休养。';
  }catch(error){view.reason=(error as Error).message;}
  return view;
}
