import {coreCombatBase} from '../engine/core-combat';
import type {InitialCoreClassId} from '../rules/core-progression';
import {abilityAdjustment} from '../../rules-engine/abilities';
import type {Fields,Row} from './model';

/** Values edited by the player remain personal overrides; derived values follow identity changes. */
export function generated(values:Fields|Row['values'],key:string,next:string){
 const marker=`auto_${key}`,old=values[key];
 if(old===undefined||old===''||old===values[marker])values[key]=next;
 values[marker]=next;
}
export function strengthScore(raw:string,percent=''){
 const text=raw.normalize('NFKC').replace(/\s/g,'').replace(/[（(](\d{1,3})[）)]/,'/$1');
 const match=text.match(/^18\/(\d{1,3})$/), extra=match?.[1]??(text==='18'?percent.split(/[–-]/)[0]:'');
 if(extra&&/^\d{1,3}$/.test(extra)&&Number(extra)<=100)return `18/${Number(extra)===100||Number(extra)===0?'00':String(Number(extra)).padStart(2,'0')}`;
 return text;
}
const core=new Set(['cleric','druid','fighter','paladin','ranger','magic-user','illusionist','thief','assassin','monk']);
// These UA careers explicitly use the fighter matrices. Article variants need their own rules.
const verified:Record<string,InitialCoreClassId>={cavalier:'fighter',barbarian:'fighter','thief-acrobat':'thief',
 'oa-barbarian':'fighter','oa-bushi':'fighter','oa-kensai':'fighter','oa-samurai':'fighter',
 'oa-shukenja':'cleric','oa-sohei':'cleric','oa-wu-jen':'magic-user','oa-yakuza':'thief','oa-monk':'thief','dragon-045-class-archer':'fighter'};
export function combatProfile(fields:Fields){
 const id=String(fields.class??''),level=Number(fields.level),career=core.has(id)?id as InitialCoreClassId:verified[id];
 if(id==='dragon-068-class-cloistered-cleric'&&Number.isSafeInteger(level)&&level>=1){const attack=coreCombatBase('magic-user',level),save=coreCombatBase('cleric',level);return {...attack,savingFamily:save.savingFamily,saves:save.saves.map(s=>({...s,target:s.target+2}))};}
 if(!career||!Number.isSafeInteger(level)||level<1)return null;
 return coreCombatBase(career,level);
}
export function automateSaves(fields:Fields){
 const base=combatProfile(fields),notes:string[]=[],race=String(fields.race??''),con=Number(fields.CON);
 const racial=['dwarf','gnome','halfling'].includes(race)?Math.floor(con/3.5):race==='korobokuru'?Math.floor(con/4.5):0;
 if(fields.manual_saves)return '手动豁免；取消勾选可恢复自动值。';
 if(!base){for(let i=0;i<5;i++)generated(fields,`save_${i}`,'');return '此职业尚无核对完成的豁免矩阵，请按职业条目填写；不套用其他职业。';}
 for(let i=0;i<5;i++){
  const modifier=Number(fields[`save_modifier_${i}`])||0;
  const bonus=fields.class==='paladin'?2:fields.class==='oa-kensai'?1:fields.class==='barbarian'?[3,3,2,2,Math.floor(Number(fields.level)/4)][i]:0;
  generated(fields,`save_${i}`,String(base.saves[i].target-bonus-modifier-([2,4].includes(i)&&con>=3?racial:0)));
 }

 if(['dwarf','gnome','halfling'].includes(race)&&con>=3){const bonus=Math.floor(con/3.5);notes.push(`种族条件加值 +${bonus}：对魔杖／法杖／权杖及法术；${race==='gnome'?'侏儒不含毒素':'毒素亦适用，但不扩大至麻痹或死亡魔法'}。杖与法术栏已计入；${race==='gnome'?'侏儒没有该毒素加值。':'毒素请在第一栏目标值另减此加值。'}PHB 种族说明。`);}
 if(race==='korobokuru'&&con>=3)notes.push(`OA：对魔法与毒素豁免 +${Math.floor(con/4.5)}（体质每 4.5 点）；杖与法术栏已计入，毒素在第一栏另减。`);
 if(fields.class==='druid')notes.push('德鲁伊对火、电豁免 +2，仅相应攻击适用。');
 if(fields.class==='barbarian')notes.push('已计 UA 麻痹／死亡 +3、石化／变形 +3、杖与吐息 +2、每 4 级法术 +1；毒素另比第一栏好 1。');
 if(fields.class==='cavalier')notes.push('UA：恐惧免疫；幻术豁免 +2；心智抗性另行判定。');
 return `DMG p.79 职业等级矩阵${fields.class==='paladin'?'；已计入圣武士全部豁免 +2':''}${fields.class==='dragon-068-class-cloistered-cleric'?'；Dragon #68：修院牧师豁免骰 −2 已计入':''}；调整栏正数为豁免骰加值。${notes.join(' ')}`;
}
export function abilityBonus(ability:'STR'|'DEX',score:string,label:string){
 const entry=abilityAdjustment(ability,score).values.find(v=>v.label.includes(label));
 return Number((entry?.value??'0').replace(/−/g,'-'))||0;
}
