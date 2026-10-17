import {parseCoreCampaignArchive,type CoreCampaignArchive} from '../workflows/core-campaign-runtime';
import {parseCoreCreation} from '../workflows/core-create';
import {moneyValueCp,type CoreInventoryLedger} from '../engine/core-inventory';
import type {CoreLifeState} from '../engine/core-life-state';
import type {CoreAdvancementState} from '../workflows/core-advancement';
import {evaluateCoreEligibility} from '../engine/core-eligibility';
import {coreCombatBase} from '../engine/core-combat';
import {coreDefense,type CoreDefenseView,type DefenseSelection} from '../engine/core-defense';
import type {InitialCoreClassId} from '../rules/core-progression';
import {campaignSpellView,type CampaignSpellView} from './campaign-spell-view';
import type {CampaignSpellLedger,PreparationCourse} from '../workflows/core-campaign-preparation';
import type {CoreCampaignCalendar} from '../workflows/core-calendar';
import {formatCampaignMinute} from './campaign-time';
import {projectCapabilitiesForPlayer, reviewCoreClassCapabilities, type CapabilityAtLevel} from '../engine/core-class-capabilities';

export interface CampaignSheet {
  name:string;race:string;career:string;level:number;xp:number;maximumHp:number|null;
  life:CoreLifeState|null;inventory:CoreInventoryLedger|null;wealthCp:number;
  prepared:{id:string;name:string;level:number;status:string}[];
  history:{label:string;at:string;gameTime:string|null}[];revision:number;
  combat:ReturnType<typeof coreCombatBase>;defense:CoreDefenseView;defenseSelection:DefenseSelection|null;
  abilities:{label:string;initial:number;adjusted:number;recordedCurrent:number|null}[];
  capabilities:readonly CapabilityAtLevel[];
  spells:CampaignSpellView|null;calendar:{minutesPerDay:number;daysPerWeek:number}|null;
}
export const careerLabels:Record<string,string>={fighter:'战士','magic-user':'魔法师',cleric:'牧师',druid:'德鲁伊',paladin:'圣武士',ranger:'游侠',illusionist:'幻术师',thief:'盗贼',assassin:'刺客',monk:'武僧'};
const raceLabels:Record<string,string>={human:'人类',elf:'精灵',dwarf:'矮人',gnome:'侏儒','half-elf':'半精灵',halfling:'半身人','half-orc':'半兽人'};
export const actionLabels:Record<string,string>={'initialize-life':'确认当前生命','damage':'受到伤害','consume-item':'使用物品','cast-prepared':'消耗准备副本','experience':'冒险经验结算','award-level-dated':'正式授级','income':'财富入账','expense':'财富支出','relocate-item':'物品位置变化','unpack-item':'拆分同质整包','friendly-aid':'友方援助'};
export const lifeLabels:Record<string,string>={alive:'清醒存活','unconscious-bleeding':'昏迷、失血中','unconscious-stabilized':'昏迷、已稳定',dead:'死亡','forever-dead':'无法按普通手段复活',none:'无',unconscious:'昏迷','zero-hp-convalescence':'零HP恢复期','raise-dead-bed-rest':'复活后卧床期','reincarnation-rebuild-pending':'转生人物重建待办','dm-defined':'战役裁定限制'};
actionLabels['actual-healing']='接受实际治疗';
actionLabels['record-defense']='确认实际穿戴';
actionLabels['prepare-spells']='完成法术学习／祈祷';
/** A whitelist view-model. Never pass whole archive/module JSON to a player UI. */
export function campaignSheet(input:CoreCampaignArchive):CampaignSheet{
  const archive=parseCoreCampaignArchive(input),origin=parseCoreCreation(archive.genesis.runtime.transaction.facts.modules[0].data);
  const state=archive.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')?.data as unknown as (CoreAdvancementState&{life?:CoreLifeState;inventory:CoreInventoryLedger|null;spells?:CampaignSpellLedger;defense?:DefenseSelection;calendar?:CoreCampaignCalendar;spellPreparationCourses?:PreparationCourse[]})|undefined;
  const candidate=origin.candidate!,classId=candidate.classIds[0];
  const initialHp=origin.tasks.find(t=>t.id==='hp')?.facts?.actualAward;
  const earned=state?.history.filter(e=>e.type==='advancement.awarded').reduce((sum,e)=>sum+Number((e.hp as {actualAward:number}).actualAward),0)??0;
  const inventory=state?state.inventory:(origin.tasks.find(t=>t.id==='equipment')?.facts?.ledger as CoreInventoryLedger|undefined)??null;
  const initialSpells=origin.tasks.find(t=>t.id==='initial-spells')?.facts?.ledger as CampaignSpellLedger|undefined;
  const initialCopies=initialSpells&&['adnd1e.spell-ledger-player-projection','adnd1e.spell-ledger-player-portable'].includes(initialSpells.schema??'')?initialSpells.preparedCopies:[];
  const copies=state?.spells?.preparedCopies??initialCopies??[];
  const adjusted=evaluateCoreEligibility(candidate).adjustedScores,level=state?.level??1;
  const labels={STR:'力量',INT:'智力',WIS:'感知',DEX:'敏捷',CON:'体质',CHA:'魅力'};
  const abilities=(Object.keys(labels) as (keyof typeof labels)[]).map(id=>({label:labels[id],initial:candidate.initialScores[id],adjusted:adjusted[id],recordedCurrent:id==='CON'?(state?.life?.currentConstitution??state?.constitution??null):null}));
  const defenseSelection=state?.defense??null;
  const ledger=state?.spells??(initialSpells&&['adnd1e.spell-ledger-player-projection','adnd1e.spell-ledger-player-portable'].includes(initialSpells.schema??'')?initialSpells as CampaignSpellLedger:null);
  const spells=ledger?campaignSpellView(ledger,{classId:classId as InitialCoreClassId,level,intelligence:adjusted.INT,wisdom:adjusted.WIS,characterId:archive.runtime.transaction.characterId},state?.calendar??null,state?.spellPreparationCourses??[],state?.life??null):null;
  const prepared=Array.isArray(copies)?copies.flatMap(value=>{
    if(!value||typeof value!=='object')return[];const c=value as {id?:unknown;status?:unknown;spell?:{displayName?:unknown;level?:unknown}};
    return typeof c.id==='string'&&typeof c.status==='string'&&typeof c.spell?.displayName==='string'&&typeof c.spell.level==='number'?[{id:c.id,name:c.spell.displayName,level:c.spell.level,status:c.status}]:[];
  }):[];
  const capabilityReview=reviewCoreClassCapabilities(classId as InitialCoreClassId,level);
  const playerCapabilities=Object.freeze([...projectCapabilitiesForPlayer(classId as InitialCoreClassId,level),...capabilityReview.locked.filter(item=>item.visibility==='player')]);
  return {name:origin.name,race:raceLabels[candidate.raceId]??'待核种族',career:careerLabels[classId]??'待核职业',level:state?.level??1,xp:state?.xp??0,
    maximumHp:state?.life?.maximumHp??(typeof initialHp==='number'?initialHp+earned:null),life:state?.life?structuredClone(state.life):null,
    inventory:inventory?structuredClone(inventory):null,wealthCp:inventory?.wallets.reduce((sum,w)=>sum+moneyValueCp(w.coins),0)??0,prepared,
    history:archive.actions.map(a=>({label:actionLabels[a.intent.type]??'战役活动',at:a.at,gameTime:state?.calendar?(a.intent.type==='cast-prepared'&&a.intent.atMinute!==undefined?formatCampaignMinute(a.intent.atMinute,state.calendar.minutesPerDay):a.intent.type==='prepare-spells'?`${formatCampaignMinute(a.intent.facts.restStartMinute,state.calendar.minutesPerDay)} → ${formatCampaignMinute(a.intent.facts.studyEndMinute,state.calendar.minutesPerDay)}`:null):null})),revision:archive.runtime.transaction.revision,
    combat:coreCombatBase(classId as InitialCoreClassId,level),defense:coreDefense({classId:classId as InitialCoreClassId,level,dexterity:adjusted.DEX,inventory,selection:defenseSelection}),defenseSelection,abilities,capabilities:playerCapabilities,spells,calendar:state?.calendar?{minutesPerDay:state.calendar.minutesPerDay,daysPerWeek:state.calendar.daysPerWeek}:null};
}
