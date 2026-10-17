import { planIllusionistInitialSpells, planMagicUserInitialSpells } from '../engine/core-spell-acquisition';
import { magicUserInitialCategories, illusionistInitialTable } from '../rules/core-spell-acquisition';
import { recordCreationTask, type CoreCreation } from '../workflows/core-create';
import { renderDivineInitialSpells } from './core-divine-initial-spells';
import {renderArcaneBookCreation,arcaneSpellLabel} from './core-arcane-book';
import type {CoreArcaneCreationInput} from '../workflows/core-arcane-creation';

export function renderInitialSpells(host:HTMLElement,read:()=>CoreCreation|null,write:(value:CoreCreation)=>void){
  host.replaceChildren();const doc=read();if(!doc?.candidate)return;
  const heading=document.createElement('h2');heading.textContent='初始法术';host.append(heading);
  const ids=doc.candidate.classIds,arcane=ids.filter(id=>id==='magic-user'||id==='illusionist');
  const status=document.createElement('p');status.setAttribute('role','status');
  const explanation=document.createElement('p');explanation.textContent='DMG p.39 的初始授予与 PHB p.10 的 Chance to Know 分别记录。初始授予不会自动填满智力最低法术数，也不会等同于已记忆法术。';host.append(explanation);
  if(!arcane.length){
    if(ids.some(id=>id==='cleric'||id==='druid')){if(ids.length===1)renderDivineInitialSpells(host,read,write);else{status.textContent='多职业神术准备仍需对应流程。';host.append(status);}return;}
    const button=document.createElement('button');button.type='button';button.textContent='记录一级无初始施法任务';
    button.addEventListener('click',()=>{try{const current=read();if(!current)throw new Error('请先选择角色。');write(recordCreationTask(current,'initial-spells',{status:'not-applicable',sourceIds:['project:core-first-level-noncasting-task',...ids.flatMap(id=>id==='paladin'?['phb:24:paladin-spell-capacity']:id==='ranger'?['phb:25:ranger-spell-capacity']:[])],note:'所选职业在一级没有初始施法任务；后续等级需重新检查职业法术成长。',facts:{classIds:ids,level:1,initialSpellGrant:false}}));status.textContent='已记录一级不适用；未授予或准备任何法术。';}catch(error){status.textContent=(error as Error).message;}});
    host.append(button,status);return;
  }
  if(ids.length!==1){status.textContent='多职业初始法术需结合各职业流程处理，当前保留待完成。';host.append(status);return;}
  const fields:Record<string,{roll:HTMLInputElement;choice:HTMLSelectElement}>={};
  if(ids[0]==='magic-user'){
    for(const [category,list] of Object.entries(magicUserInitialCategories)){
      const label=document.createElement('label');label.textContent=`${{offensive:'攻击',defensive:'防御',miscellaneous:'杂项'}[category]}：d10 骰面 `;
      const roll=document.createElement('input');roll.type='number';roll.min='1';roll.max='10';roll.setAttribute('aria-label',`${category} d10`);
      const choice=document.createElement('select');choice.setAttribute('aria-label',`${category} 掷出10时的选择`);choice.append(new Option('掷出 10 时选择',''),...list.map(id=>new Option(arcaneSpellLabel(id),id)));
      fields[category]={roll,choice};label.append(roll,choice);host.append(label);
    }
  }
  const illusionRolls=document.createElement('input');
  if(ids[0]==='illusionist'){
    const label=document.createElement('label');label.textContent='依次输入 d12 骰面（逗号分隔，重复结果继续掷）';illusionRolls.placeholder='例如 1, 1, 5, 12';label.append(illusionRolls);host.append(label);
    const table=document.createElement('p');table.textContent=illusionistInitialTable.map((id,index)=>`${index+1} ${id}`).join('；');host.append(table);
  }
  const button=document.createElement('button');button.type='button';button.textContent='计算并记录初始授予';host.append(button,status);
  const savedFacts=doc.tasks.find(task=>task.id==='initial-spells')?.facts;
  const saved=(savedFacts?.plan as Record<string,unknown>|undefined)??savedFacts;
  const bookHost=document.createElement('div');host.append(bookHost);
  if(savedFacts?.input){const recorded=savedFacts.input as CoreArcaneCreationInput;renderArcaneBookCreation(bookHost,read,write,recorded.initialPlan);}
  if(saved){
    if(Array.isArray(saved.rolls))illusionRolls.value=saved.rolls.join(', ');
    else if(saved.rolls&&typeof saved.rolls==='object')for(const [category,field] of Object.entries(fields)){
      const roll=(saved.rolls as Record<string,unknown>)[category];if(typeof roll==='number')field.roll.value=String(roll);
      if(roll===10&&Array.isArray(saved.spells)){const choices=magicUserInitialCategories[category as keyof typeof magicUserInitialCategories] as readonly string[];const chosen=saved.spells.find(id=>typeof id==='string'&&choices.includes(id));if(typeof chosen==='string')field.choice.value=chosen;}
    }
    status.textContent=doc.tasks.find(task=>task.id==='initial-spells')!.note;
  }
  button.addEventListener('click',()=>{try{
    const current=read();if(!current)throw new Error('角色已失效。');
    if(current.tasks.find(t=>t.id==='initial-spells')?.facts?.input)throw new Error('已有实际理解与取得骰史；不能用重新授予按钮静默覆盖。请在下方继续，需改授予时先保留原件并处理明确更正。');
    const plan=ids[0]==='magic-user'?planMagicUserInitialSpells({rolls:{offensive:Number(fields.offensive.roll.value),defensive:Number(fields.defensive.roll.value),miscellaneous:Number(fields.miscellaneous.roll.value)},choices:{offensive:fields.offensive.choice.value,defensive:fields.defensive.choice.value,miscellaneous:fields.miscellaneous.choice.value}}):planIllusionistInitialSpells({rolls:illusionRolls.value.split(/[,，\s]+/).filter(Boolean).map(Number)});
    const incomplete='status' in plan&&plan.status==='incomplete';
    write(recordCreationTask(current,'initial-spells',{status:incomplete?'pending':'needs-dm',sourceIds:[...(plan.sourceIds??['dmg:39:initial-illusionist-spells'])],note:incomplete?'重复骰面已保存，仍需掷到三个不同法术。':'初始授予已计算，待战役确认取得与 Chance to Know 处理。',facts:{...plan,rollMethod:'physical-or-external',campaignChoiceVariant:false}}));
    if(!incomplete){const initialPlan:CoreArcaneCreationInput['initialPlan']=ids[0]==='magic-user'?{classId:'magic-user',input:{rolls:{offensive:Number(fields.offensive.roll.value),defensive:Number(fields.defensive.roll.value),miscellaneous:Number(fields.miscellaneous.roll.value)},choices:{offensive:fields.offensive.choice.value||undefined,defensive:fields.defensive.choice.value||undefined,miscellaneous:fields.miscellaneous.choice.value||undefined}}}:{classId:'illusionist',input:{rolls:illusionRolls.value.split(/[,，\s]+/).filter(Boolean).map(Number)}};renderArcaneBookCreation(bookHost,read,write,initialPlan);}
    status.textContent=`已记录：${plan.spells.join('、')}。${incomplete?'仍需继续掷骰。':'尚未自动准备法术；由战役自行确认。'}`;
  }catch(error){status.textContent=(error as Error).message;}});
}
