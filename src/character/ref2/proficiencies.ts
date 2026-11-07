import {generated} from './automation';
import {references} from './references';
import type {Card} from './model';
// PHB p.37; WSG table 1 / DSG character proficiencies; OA table 56.
const western:Record<string,[number,number,number,number]>={cleric:[2,3,4,1],druid:[2,3,5,1],fighter:[4,2,3,1],paladin:[3,2,2,1],ranger:[3,2,3,1],'magic-user':[1,3,6,2],illusionist:[1,3,6,2],thief:[2,3,4,1],assassin:[3,2,4,1],monk:[1,1,2,1],cavalier:[3,2,2,1],barbarian:[6,3,2,1],'thief-acrobat':[2,3,4,1]};
const oriental:Record<string,[number,number]>={'oa-samurai':[5,1],'oa-shukenja':[6,2],'oa-sohei':[4,3],'oa-kensai':[3,2],'oa-barbarian':[9,3],'oa-bushi':[4,2],'oa-wu-jen':[6,2],'oa-ninja':[2,3]};
export function proficiencyBudget(card:Card){
 const f=card.fields,id=String(f.class??''),level=Number(f.level),choice=String(f.proficiency_rules||'auto'),mode=choice==='auto'?(id.startsWith('oa-')?'oa':'wsg'):choice;
 let weapon='',nonweapon='',shared='',source='';
 if(Number.isSafeInteger(level)&&level>=1){
  if(mode==='oa'&&oriental[id]){const [initial,step]=oriental[id];shared=String(initial+Math.floor((level-1)/step));source='OA 表56：共用栏位；各职业必修、专精及忍者独立武器池另按正文。';}
  else if(mode!=='oa'&&western[id]){const [w,n,step,gain]=western[id],interval=mode==='phb'&&id==='paladin'?3:step,steps=Math.floor((level-1)/interval);weapon=String(w+steps);nonweapon=mode==='phb'?'':String(n+steps*gain);source=mode==='phb'?'PHB p.37：只计算武器熟练。':'WSG 表1／DSG：可选非武器熟练规则；武器栏可转为非武器栏，不能反向转换。';}
 }
 for(const [key,v] of Object.entries({weapon_slots:weapon,nonweapon_slots:nonweapon,shared_slots:shared}))generated(f,key,v);
 let usedW=0,usedN=0,unknown=0;
 for(const row of card.rows.proficiencies){if(!row.values.name?.trim())continue;const ref=references.find(r=>r.id===row.values.referenceId),raw=row.values.slots||ref?.values.slots||(row.values.ability==='武器'?'1':'');if(!/^\d+$/.test(raw)){unknown++;continue;}if(row.values.ability==='武器')usedW+=Number(raw);else usedN+=Number(raw);}
 const transfer=Math.max(0,Number(f.weapon_slots_to_nonweapon)||0),w=Number(f.weapon_slots)-transfer,n=Number(f.nonweapon_slots)+transfer;
 const summary=mode==='oa'?`共用已用 ${usedW+usedN}／总计 ${f.shared_slots||'待定'}，剩余 ${f.shared_slots===''?'待定':Number(f.shared_slots)-usedW-usedN}`:`武器已用 ${usedW}／${f.weapon_slots===''?'待定':w}，剩余 ${f.weapon_slots===''?'待定':w-usedW}；非武器已用 ${usedN}／${f.nonweapon_slots===''?'未启用':n}，剩余 ${f.nonweapon_slots===''?'未启用':n-usedN}`;
 return `${summary}。${unknown?`${unknown} 项未填占用栏位；` :''}${source||'此职业尚无核对完成的栏位表，请手填总栏位。'}额外投入、专精和背景奖励请改写占用或总栏位；不因属性高而默认增加栏位。`;
}
