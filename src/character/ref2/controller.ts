import {itemSelectionKind} from '../../utils/item-selection';
import {cardName} from './labels';
import {currentItemLabel,findNamedEntry} from '../../utils/terminology';
import {installCardPrinting} from './printing';
import abilityTables from '../../data/public/ability-tables.json';
import options from '../../data/public/character-options.json';
import type {ClassEntry,RaceEntry} from '../../schemas';
const classes=options.classes as ClassEntry[],races=options.races as RaceEntry[];
import { itemIndex as items } from '../../data/public/item-index';
import { spells } from '../../data/public/spell-index';
import { abilityAdjustment } from '../../rules-engine/abilities';
import { checkEligibility, checkEquipment, computeArmorClass, computeEncumbrance, computeMovement, type Ability } from '../../rules-engine/character';
import { blankCard, blankRow, collectionNames, normalizeCard, selectPrepared, selectInventory, type Card, type CollectionName, type Row } from './model';
import {fillWeapon,selectWeapons,weaponWithBase,enhancement} from './weapons';
import {updateCardSpellSlots} from './spell-capacity';

import {acceptsItem,type ItemRole} from './item-roles';
import {automateSaves,combatProfile,generated,strengthScore,abilityBonus} from './automation';
import {resolveItem,syncEquipped,carriedItems,selectAmmunition} from './inventory';
import {monkCombat} from './monk';
import {proficiencyBudget} from './proficiencies';
import {selectReferences} from './references';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const form = document.querySelector<HTMLFormElement>('#character-form')!;
const status = document.querySelector<HTMLElement>('#character-status')!;
const field = (name:string) => form.elements.namedItem(name) as Control;
const value = (name:string) => field(name)?.value ?? '';
const checked = (name:string) => (field(name) as HTMLInputElement)?.checked ?? false;
const set = (name:string, entry:string|number) => { if (field(name)) field(name).value=String(entry); };
let card = blankCard();
let dirty = false;
const notify = (message:string) => { status.textContent=message; };
const modified = () => { dirty=true; notify('有未保存的修改。可点击“保存”或导出 JSON。'); };
const repeater = (key:CollectionName) => form.querySelector<HTMLElement>(`[data-repeater="${key}"]`)!;

function collect(): Card {
  for (const control of form.querySelectorAll<Control>('[name]')) card.fields[control.name] = control instanceof HTMLInputElement && control.type==='checkbox' ? control.checked : control.value;
  for (const key of collectionNames) {
    const previous=new Map(card.rows[key].map(row=>[row.id,row.values]));
    const hiddenMagic=key==='gear'?card.rows.gear.filter(row=>items.some(item=>item.id===row.values.itemId&&itemSelectionKind(item)==='magic')&&!row.values.equippedSlot):[];
    card.rows[key] = [...hiddenMagic,...[...repeater(key).querySelectorAll<HTMLElement>('[data-card-row]')].map(row=>({id:row.dataset.rowId!,values:{...previous.get(row.dataset.rowId!),...Object.fromEntries([...row.querySelectorAll<Control>('[data-cell]')].map(control=>[control.dataset.cell!,control.value]))}}))];
    if(key==='ammunition')for(const row of card.rows.ammunition){const item=items.find(i=>i.id===row.values.itemId);if(item&&row.values.name!==cardName(item.nameZh)){delete row.values.itemId;delete row.values.ammoPickerId;}}
    if(key==='weapons')for(const row of card.rows.weapons){const old=previous.get(row.id)?.name,item=items.find(i=>i.id===old);if(item&&row.values.name===cardName(item.nameZh))row.values.name=item.id;if(row.values.name?.endsWith('::missile')){row.values.name=row.values.name.slice(0,-9);row.values.mode='missile';}}
  }
  return card;
}
function renderRows(key:CollectionName) {
  const section=repeater(key), table=section.querySelector<HTMLTableElement>('[data-row-table]')!, template=section.querySelector<HTMLTemplateElement>('[data-row-template]')!;
  table.querySelectorAll('[data-card-row]').forEach(row=>row.remove());
  card.rows[key].filter(record=>key!=='gear'||!items.some(item=>item.id===record.values.itemId&&itemSelectionKind(item)==='magic')||!!record.values.equippedSlot).forEach((record,index)=>{
    const row=template.content.querySelector('tbody')!.cloneNode(true) as HTMLTableSectionElement;
    row.dataset.rowId=record.id;
    for (const control of row.querySelectorAll<Control>('[data-cell]')) {
      const keyName=control.dataset.cell!;
      let entry=record.values[keyName] ?? '';
      if (key==='weapons' && keyName==='name') {const item=findNamedEntry(items,'item',entry);entry=item?.id??entry;entry=item?cardName(item.nameZh):entry;}
      if (control instanceof HTMLSelectElement && entry && ![...control.options].some(option=>option.value===entry)) control.add(new Option(entry,entry));
      control.value=entry;
      if(key==='weapons'&&keyName==='notes')control.title=entry;
      control.setAttribute('aria-label',`${section.querySelector('h3')!.childNodes[0].textContent!.trim()}第 ${index+1} 条 ${control.getAttribute('aria-label')}`);
    }
    table.append(row);
  });
}
function splitStrength(){
  const match=strengthScore(value('STR')).match(/^18\/(\d{2})$/);
  if(match){set('STR','18');set('exceptional_strength',match[1]);}
}
function applyCard(next:Card) {
  card=next; form.reset();
  for(const row of card.rows.gear){
    const item=items.find(item=>item.id===row.values.itemId);
    if(item&&row.values.item){const refreshed=currentItemLabel(item,row.values.item);row.values.item=refreshed===item.nameZh||refreshed===item.nameEn?cardName(item.nameZh):refreshed;}
  }
  undo=undefined;undoButton.hidden=true;
  for (const control of form.querySelectorAll<Control>('[name]')) {
    const entry=card.fields[control.name];
    if (control instanceof HTMLInputElement && control.type==='checkbox') control.checked=entry===true;
    else if (typeof entry==='string') {
      if (control instanceof HTMLSelectElement && entry && ![...control.options].some(option=>option.value===entry)) control.add(new Option(`${entry}（原记录）`,entry));
      if(['armor_item','shield_item'].includes(control.name)){const item=resolveItem(items,entry);if(item){card.fields[control.name+'_id']=item.id;control.value=cardName(item.nameZh);}else control.value=entry;}else control.value=entry;
    }
  }
  splitStrength(); collectionNames.forEach(renderRows); update(); renderPrepared(); dirty=false;
}
function update() {
  collect();
  const spellCapacity=updateCardSpellSlots(card.fields);
  for(let level=0;level<=9;level++) {
    const name=`spell_slots_${level}`;
    set(name,String(card.fields[name]??''));
    (field(name) as HTMLInputElement).readOnly=!checked('manual_spell_slots');
  }
  document.querySelector('#spell-capacity-note')!.textContent=checked('manual_spell_slots')?'已手动填写；取消勾选可恢复按职业等级自动计算。':spellCapacity.note;
  form.querySelectorAll<HTMLInputElement>(".row-note input").forEach(input=>input.toggleAttribute("data-filled",!!input.value.trim()));
  const abilities=['STR','INT','WIS','DEX','CON','CHA'] as Ability[];
  const exceptional=/^18(?:$|[/(（／])/.test(value('STR'));
  document.querySelector<HTMLElement>('#exceptional-row')!.hidden=!exceptional;
  const strength=strengthScore(value('STR'),value('exceptional_strength'));
  for (const ability of abilities) {
    const result=abilityAdjustment(ability,ability==='STR' ? strength : value(ability));
    const target=form.querySelector<HTMLElement>(`[data-derived="${ability}"]`)!;
    target.title=result.source;
    const entries=result.values.length ? result.values : (abilityTables[ability]?.labels ?? []).map(label=>({label,value:"—"}));
    target.replaceChildren(...entries.map(entry=>{
      const span=document.createElement('span'),label=document.createElement('small'),number=document.createElement('strong');
      label.textContent=entry.label; number.textContent=entry.value; span.append(label,number); return span;
    }));
    if (!entries.length) target.textContent=result.display;
  }
  form.querySelectorAll<HTMLElement>('[data-mirror]').forEach(output=>output.textContent=value(output.dataset.mirror!));
  const armor=selectedArmor('armor_item'),shield=selectedArmor('shield_item');
  for(const [slot,item] of [['armor_item',armor],['shield_item',shield]] as const)card.fields[slot]=item?.id??value(slot);
  if(syncEquipped(card,items))renderRows('gear');
  document.querySelector('#save-breakdown')!.textContent=automateSaves(card.fields);
  for(let i=0;i<5;i++){set(`save_${i}`,String(card.fields[`save_${i}`]??''));(field(`save_${i}`) as HTMLInputElement).readOnly=false;}
  document.querySelector('#proficiency-budget')!.textContent=proficiencyBudget(card);
  for(const key of ['weapon_slots','nonweapon_slots','shared_slots'])set(key,String(card.fields[key]??''));
  updateCombat(strength);
  const monk=value('class')==='monk'?monkCombat(Number(value('level'))):null;
  const dexterity=['monk','oa-kensai'].includes(value('class'))?'':value('DEX');
  const ac=computeArmorClass(armor,shield,dexterity,Number(value('ac_modifier'))||0);
  if(monk&&!armor&&!shield){ac.value=monk.ac+(Number(value('ac_modifier'))||0);ac.notes.push('PHB p.31 武僧表 II；不叠加敏捷防御。');}
  if(value('class')==='barbarian'&&Number(value('DEX'))>14){const dexPart=ac.components.find(p=>p.label.startsWith('DEX'));const old=dexPart?.value??0,next=-(Number(value('DEX'))-14)*(armor&&/链|带|板|鳞/.test(armor.nameZh)?1:2);ac.value+=next-old;ac.notes.push('UA 野蛮人敏捷防御：笨重护甲每点−1，其余每点−2。');}
  if(value('class')==='oa-kensai'&&!armor&&!shield&&Number(value('DEX'))>0){ac.value=23-Number(value('DEX'))-Math.floor(Number(value('level'))/3)+(Number(value('ac_modifier'))||0);ac.notes.push('OA 剑圣：23−DEX，每3级改善1；不另加敏捷防御调整。');}
  (field('ac') as HTMLInputElement).readOnly=!checked('manual_ac');
  if (!checked('manual_ac')) set('ac',ac.value);
  for(const [key,entry] of [['ac_shieldless',computeArmorClass(armor,undefined,dexterity,Number(value('ac_modifier'))||0).value],['ac_surprised',computeArmorClass(armor,shield,'',Number(value('ac_modifier'))||0).value],['ac_rear',computeArmorClass(armor,undefined,'',Number(value('ac_modifier'))||0).value]] as const){if(!['monk','oa-kensai','barbarian'].includes(value('class'))){generated(card.fields,key,String(entry));set(key,String(card.fields[key]??''));}}
  document.querySelector('#ac-breakdown')!.textContent=ac.components.map(part=>`${part.label} ${part.value}`).join('；')+'。'+ac.notes.join(' ');
  const weaponItems=card.rows.weapons.map(row=>items.find(item=>item.id===row.values.name)).filter(Boolean) as typeof items;
  const encumbrance=computeEncumbrance(carriedItems(card,items).map(entry=>({...entry,item:weaponWithBase(entry.item,items)})));
  const race=races.find(race=>race.id===value('race'));
  if(race){for(const [key,text] of [['languages',race.languages],['senses',race.abilities.filter(a=>/视觉|视力/.test(a)).join('；')],['detections',race.detection],['resistances',race.savingThrows],['special_abilities',race.abilities.join('；')]] as const){generated(card.fields,key,text);set(key,String(card.fields[key]??''));}}
  const coins=Math.max(0,Number(value('coins_carried'))||0);
  const movement=computeMovement({base:monk?.move??(['barbarian','oa-barbarian'].includes(value('class')) ? 15 : Number(race?.movement.match(/\d+/)?.[0] ?? 12)),weightPounds:encumbrance.value+coins/10,strength,bulky:checked('move_bulky'),difficultTerrain:checked('move_terrain'),otherAdjustment:Number(value('move_adjustment'))||0});
  set('move_base',`${movement.base}″`);
  (field('move_loaded') as HTMLInputElement).readOnly=!checked('manual_movement');
  if (!checked('manual_movement')) set('move_loaded',`${movement.effective}″`);
  for (const [key,factor] of Object.entries({hvy:.75,load:.5,max:.25,run_rate:10,normal_rate:5,crawl:.5,hidden:2/3})) set(`move_${key}`,`${Math.round(movement.base*factor*10)/10}″`);
  document.querySelector('#movement-breakdown')!.textContent=`已知装备 ${encumbrance.value.toFixed(1)} 磅；钱币 ${coins/10} 磅。${race&&!/\d/.test(race.movement)?'种族未提供固定地面移动率，当前按12寸暂算，请手动核对。 ':''}${movement.notes.join(' ')}`;
  document.querySelector('#encumbrance-result')!.textContent=`已知负重 ${(encumbrance.value+coins/10).toFixed(1)} 磅${encumbrance.unknown.length ? '；另有未列重量的物品' : ''}。`;
  renderOwnedMagic();
  const classEntry=classes.find(entry=>entry.id===value('class'));
  const issues=[...checkEligibility({raceId:value('race'),classId:value('class'),alignment:value('alignment'),abilities:card.fields as Record<Ability,string>},classes,races),...weaponItems.flatMap((weapon,index)=>checkEquipment(value('class'),weapon,index===0 ? armor : undefined,index===0 ? shield : undefined))];
  const messages=issues.map(issue=>`${issue.message}（${issue.source}）`);
  if(classEntry?.referenceOnly)messages.push('扩展／NPC 职业请确认战役采用；已核对的矩阵会自动计算，其余保留手填。');
  for (const prepared of card.preparedSpells) {
    const spell=spells.find(spell=>spell.id===prepared.spellId);
    if (spell && classEntry && !spell.classes.includes(classEntry.nameEn) && !['paladin','ranger','bard'].includes(classEntry.id)) messages.push(`${spell.nameZh}不在所选职业法术表中。`);
  }
  for (let level=0;level<=9;level++) {
    const limit=value(`spell_slots_${level}`), used=card.preparedSpells.reduce((sum,entry)=>sum+(spells.find(spell=>spell.id===entry.spellId)?.level===level ? entry.count : 0),0);
    if (limit!=='' && used>Number(limit)) messages.push(`${level}环准备 ${used} 次，超过填写的 ${limit} 个法术位。`);
  }
  if (!checked('manual_spell_slots') && spellCapacity.tracks.length>1) for (const track of spellCapacity.tracks) track.daily.forEach((limit,index)=>{
    const used=card.preparedSpells.reduce((sum,entry)=>{
      const spell=spells.find(spell=>spell.id===entry.spellId);
      return sum+(spell?.level===index+1 && spell.classes.includes(track.listId==='druid'?'Druid':'Magic-User')?entry.count:0);
    },0);
    if (used>limit) messages.push(`${track.label} ${index+1}环准备 ${used} 次，超过该法术表的 ${limit} 个法术位。`);
  });
  document.querySelector('#rule-status')!.textContent=messages.length ? `${checked('dm_override') ? '已手动覆盖资格限制；' : ''}请核对 ${messages.length} 项` : '当前已填写项目未发现规则冲突。';
  document.querySelector('#rule-hints')!.replaceChildren(...messages.map(message=>{const li=document.createElement('li');li.textContent=message;return li;}));
}

let undo: {key:CollectionName;row:Row;index:number}|undefined;
const undoButton=document.createElement('button'); undoButton.type='button';undoButton.textContent='撤销移除';undoButton.hidden=true;undoButton.className='undo-row';status.after(undoButton);
undoButton.addEventListener('click',()=>{if (!undo)return;collect();card.rows[undo.key].splice(undo.index,0,undo.row);renderRows(undo.key);undo=undefined;undoButton.hidden=true;update();modified();});
for (const key of collectionNames) {
  const section=repeater(key);
  section.querySelector('[data-toggle-ac]')?.addEventListener('click',event=>{
    const button=event.currentTarget as HTMLButtonElement;
    const visible=section.classList.toggle('show-ac');button.setAttribute('aria-expanded',String(visible));button.textContent=visible?'收起对 AC 调整':'显示对 AC 调整';
  });
  section.querySelector('[data-add-row]')!.addEventListener('click',()=>{collect();card.rows[key].push(blankRow());renderRows(key);update();modified();section.querySelector<HTMLTableSectionElement>('[data-card-row]:last-child')?.querySelector<HTMLElement>('[data-cell]')?.focus();});
  section.addEventListener('click',event=>{
    const target=(event.target as Element).closest('[data-remove-row]');if (!target)return;
    collect();const id=target.closest<HTMLElement>('[data-card-row]')!.dataset.rowId!,index=card.rows[key].findIndex(row=>row.id===id);
    undo={key,row:card.rows[key][index],index};card.rows[key].splice(index,1);renderRows(key);undoButton.hidden=false;update();modified();
  });
  section.addEventListener('change',event=>{
    const control=event.target as Control;
    if(key==='gear'&&control.dataset.cell==='item'){
      const id=control.closest<HTMLElement>('[data-card-row]')!.dataset.rowId;
      const row=card.rows.gear.find(row=>row.id===id),item=items.find(item=>item.id===row?.values.itemId);
      if(row&&item&&control.value!==cardName(item.nameZh))delete row.values.itemId;
    }
    if(key==='weapons'&&['base_weapon','mode'].includes(control.dataset.cell??'')){collect();const row=card.rows.weapons.find(r=>r.id===control.closest<HTMLElement>('[data-card-row]')!.dataset.rowId)!;const item=resolveItem(items,row.values.name);if(item)fillWeapon(row,item,row.values.mode,items);renderRows('weapons');update();modified();return;}
    if (key!=='weapons' || control.dataset.cell!=='name') return;
    const selection=control.value,missile=selection.endsWith('::missile'),id=resolveItem(items,missile?selection.slice(0,-9):selection)?.id??selection;
    collect();const row=card.rows.weapons.find(row=>row.id===control.closest<HTMLElement>('[data-card-row]')!.dataset.rowId)!;
    if(row.values.weaponPickerId!==id)delete row.values.weaponPickerId;
    const item=items.find(item=>item.id===id);if (!item){delete row.values.weaponDataSource;return;}
    fillWeapon(row,item,missile?'missile':undefined,items);renderRows('weapons');update();modified();
  });
}
form.addEventListener('input',()=>{update();modified();});
form.addEventListener('focusout',event=>{if((event.target as HTMLInputElement).name==='STR'){splitStrength();update();}});
form.addEventListener('change',event=>{const control=event.target as HTMLInputElement;if(control.name==='STR')splitStrength();if(control.name==='manual_saves'&&!control.checked){for(let i=0;i<5;i++)set(`save_${i}`,String(card.fields[`auto_save_${i}`]??''));}update();modified();});
form.addEventListener('submit',event=>event.preventDefault());

function showPanel(panel:string) {
  document.querySelectorAll<HTMLElement>('[data-card-panel]').forEach(section=>section.hidden=panel!=='all' && section.dataset.cardPanel!==panel);
  document.querySelectorAll<HTMLButtonElement>('[data-card-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cardTab===panel)));
}
document.querySelectorAll<HTMLButtonElement>('[data-card-tab]').forEach(button=>button.addEventListener('click',()=>showPanel(button.dataset.cardTab!)));
for(const drop of [false,true])document.querySelector(drop ? '#roll-4d6' : '#roll-3d6')!.addEventListener('click',()=>{for(const ability of ['STR','INT','WIS','DEX','CON','CHA'])set(ability,Array.from({length:drop?4:3},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a).slice(0,3).reduce((sum,n)=>sum+n,0));update();modified();});

function renderPrepared() {
  const container=document.querySelector('#prepared-spells')!,nodes:HTMLElement[]=[];
  const selected=[...card.preparedSpells].sort((a,b)=>(spells.find(s=>s.id===a.spellId)?.level??99)-(spells.find(s=>s.id===b.spellId)?.level??99));
  for(const entry of selected) {
    const spell=spells.find(spell=>spell.id===entry.spellId);
    const article=document.createElement('article');article.className='prepared-spell';
    const heading=document.createElement('h3'),link=document.createElement('a');link.href=`/spells/${encodeURIComponent(entry.spellId)}/`;link.textContent=spell ? `${spell.level}环 · ${spell.nameZh}` : entry.spellId;heading.append(link);

    const rules=document.createElement('p');rules.className='spell-quick-rules';rules.textContent=spell ? `${spell.components.join('/')} · 施法 ${spell.castingTime} · 距离 ${spell.range} · 持续 ${spell.duration} · 范围 ${spell.areaOfEffect} · 豁免 ${spell.savingThrow}` : '此法术暂未收录于资料库；原记录仍保留。';
    const controls=document.createElement('div');controls.className='prepared-controls';
    for(const [key,label] of [['count','准备'],['expended','已用']] as const){
      const wrap=document.createElement('label'),input=document.createElement('input');input.type='number';input.min=key==='count'?'1':'0';input.max=key==='count'?'9999':String(entry.count);input.value=String(entry[key]);input.setAttribute('aria-label',`${spell?.nameZh??entry.spellId}${label}次数`);wrap.append(label,input);
      input.addEventListener('input',()=>{
        entry[key]=Math.max(key==='count'?1:0,Math.min(9999,Math.floor(Number(input.value)||0)));entry.expended=Math.min(entry.count,entry.expended);
        const used=controls.querySelectorAll<HTMLInputElement>('input')[1];
        if(used){used.max=String(entry.count);if(key==='count')used.value=String(entry.expended);}
        remaining.textContent=`剩余 ${entry.count-entry.expended}`;cast.disabled=entry.expended>=entry.count;
        refreshSpellSummary();update();modified();
      });
      input.addEventListener('change',()=>{input.value=String(entry[key]);});controls.append(wrap);
    }
    const remaining=document.createElement('strong');remaining.textContent=`剩余 ${entry.count-entry.expended}`;controls.append(remaining);
    const cast=document.createElement('button');cast.type='button';cast.textContent='施放一次';cast.disabled=entry.expended>=entry.count;cast.addEventListener('click',()=>{entry.expended++;renderPrepared();update();modified();});controls.append(cast);
    const remove=document.createElement('button');remove.type='button';remove.textContent='移除';remove.addEventListener('click',()=>{card.preparedSpells=card.preparedSpells.filter(item=>item!==entry);renderPrepared();update();modified();});controls.append(remove);
    const source=document.createElement('p');source.className='spell-source';source.textContent=spell ? [...new Set(spell.source.map(source=>`${source.book}${source.page?` p.${source.page}`:''}`))].join(' · ') : '';
    article.append(heading,rules,controls,source);nodes.push(article);
  }
  container.replaceChildren(...nodes);
  document.querySelector<HTMLElement>('#prepared-empty')!.hidden=selected.length>0;
  document.querySelector('#prepared-count')!.textContent=String(selected.length);
  refreshSpellSummary();
  document.querySelector<HTMLElement>('[data-card-panel="spells"]')!.dataset.hasSpells=String(selected.length>0);
}
function refreshSpellSummary() {
  const entries=card.preparedSpells,total=entries.reduce((sum,entry)=>sum+entry.count,0),remaining=entries.reduce((sum,entry)=>sum+entry.count-entry.expended,0);
  document.querySelector('#spell-summary')!.textContent=`${entries.length} 种 · 准备 ${total} 次 · 剩余 ${remaining} 次`;
}
document.querySelector('#restore-spells')!.addEventListener('click',()=>{card.preparedSpells.forEach(entry=>entry.expended=0);renderPrepared();modified();});
const library=document.querySelector<HTMLDialogElement>('#spell-library')!,frame=document.querySelector<HTMLIFrameElement>('#spell-library-frame')!;
const sendSelection=()=>frame.contentWindow?.postMessage({type:'adnd1e-card-selection',ids:card.preparedSpells.map(entry=>entry.spellId)},location.origin);
document.querySelector('#open-spell-library')!.addEventListener('click',()=>{
  {
    const className=classes.find(entry=>entry.id===value('class'))?.nameEn;
    const url=new URL('/spells/',location.origin);url.searchParams.set('mode','prepare');
    const spellClasses:Record<string,string[]>={Ranger:['Druid','Magic-User'],Paladin:['Cleric'],Bard:['Druid']};
    (className ? spellClasses[className] ?? [className] : []).forEach(name=>{if(spells.some(spell=>spell.classes.includes(name)))url.searchParams.append('class',name);});
    if(frame.src!==url.href)frame.src=url.href;
  }
  library.showModal();sendSelection();
});
document.querySelector('#close-spell-library')!.addEventListener('click',()=>library.close());
window.addEventListener('message',event=>{
  if(event.origin!==location.origin || event.source!==frame.contentWindow || !event.data || typeof event.data!=='object')return;
  if(event.data.type==='adnd1e-spell-picker-ready')sendSelection();
  if(event.data.type==='adnd1e-spell-picker-cancel')library.close();
  if(event.data.type==='adnd1e-spells-selected' && Array.isArray(event.data.ids) && event.data.ids.every((id:unknown)=>typeof id==='string')){
    const known=new Set(spells.map(spell=>spell.id));
    // Existing unknown IDs survive changes made with a newer/older library.
    const unknown=card.preparedSpells.filter(entry=>!known.has(entry.spellId)).map(entry=>entry.spellId);
    selectPrepared(card,[...event.data.ids.filter((id:string)=>known.has(id)),...unknown]);renderPrepared();update();modified();library.close();
  }
});

let magicSignature='';
function renderOwnedMagic(){
 const container=document.querySelector('#owned-magic-items');if(!container)return;
 const owned=card.rows.gear.flatMap(row=>{const item=items.find(item=>item.id===row.values.itemId);return item?.category==='魔法物品'?[{item,row}]:[];});
 const signature=JSON.stringify(owned.map(({row})=>[row.id,row.values]));if(signature===magicSignature)return;magicSignature=signature;
 container.replaceChildren(...owned.map(({item,row})=>{const line=document.createElement('div');line.className='owned-magic-row';const link=document.createElement('a');link.href=`/equipment/${item.id}/`;link.textContent=cardName(item.nameZh);const count=document.createElement('input');count.type='number';count.min='0';count.value=row.values.quantity||'1';count.setAttribute('aria-label',`${item.nameZh}数量`);count.addEventListener('change',()=>{row.values.quantity=String(Math.max(0,Number(count.value)||0));update();modified();});line.append(link,count);return line;}));
}
const itemLibrary=document.querySelector<HTMLDialogElement>('#item-library')!,itemFrame=document.querySelector<HTMLIFrameElement>('#item-library-frame')!;
let itemKind:ItemRole='gear';
function sendItems(){const ids=itemKind==='weapons'?card.rows.weapons.map(r=>r.values.name):itemKind==='ammunition'?card.rows.ammunition.map(r=>r.values.itemId):itemKind==='armor'||itemKind==='shield'?[resolveItem(items,value(itemKind+'_item'))?.id]:card.rows.gear.filter(r=>items.some(i=>i.id===r.values.itemId&&acceptsItem(i,itemKind))).map(r=>r.values.itemId);itemFrame.contentWindow?.postMessage({type:'adnd1e-item-selection',ids:ids.filter(Boolean)},location.origin);}
document.querySelectorAll<HTMLButtonElement>('[data-open-item-library]').forEach(button=>button.addEventListener('click',()=>{collect();itemKind=button.dataset.openItemLibrary as ItemRole;const label={weapons:'武器（含魔法武器）',magic:'魔法物品',gear:'装备',ammunition:'弹药',armor:'护甲',shield:'盾牌'}[itemKind];itemLibrary.querySelector('h2')!.textContent=`选取${label}`;itemFrame.title=`选取${label}`;if(itemFrame.dataset.kind!==itemKind){itemFrame.src='/character/library/items/?mode=select&use='+itemKind;itemFrame.dataset.kind=itemKind;}itemLibrary.showModal();sendItems();}));

document.querySelector('#close-item-library')!.addEventListener('click',()=>itemLibrary.close());
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==itemFrame.contentWindow||!event.data||typeof event.data!=='object')return;
 if(event.data.type==='adnd1e-item-picker-ready')sendItems();
 if(event.data.type==='adnd1e-item-picker-cancel')itemLibrary.close();
 if(event.data.type==='adnd1e-items-selected'&&Array.isArray(event.data.ids)&&event.data.ids.every((id:unknown)=>typeof id==='string')){collect();if(itemKind==='weapons'){selectWeapons(card,event.data.ids,items);renderRows('weapons');}else if(itemKind==='ammunition'){selectAmmunition(card,event.data.ids,items);renderRows('ammunition');}else if(itemKind==='armor'||itemKind==='shield'){const item=items.find(i=>event.data.ids.includes(i.id)&&acceptsItem(i,itemKind));card.fields[itemKind+'_item_id']=item?.id??'';set(itemKind+'_item',item?cardName(item.nameZh):'');}else{selectInventory(card,event.data.ids,itemKind,items);renderRows('gear');}update();modified();itemLibrary.close();}
});

const identityLibrary=document.querySelector<HTMLDialogElement>('#identity-library')!,identityFrame=document.querySelector<HTMLIFrameElement>('#identity-library-frame')!;
let identityKind:'races'|'classes'='races';
function sendIdentity(){identityFrame.contentWindow?.postMessage({type:'adnd1e-identity-selection',id:value(identityKind==='races'?'race':'class')},location.origin);}
document.querySelectorAll<HTMLButtonElement>('[data-open-identity]').forEach(button=>button.addEventListener('click',()=>{identityKind=button.dataset.openIdentity==='classes'?'classes':'races';const label=identityKind==='races'?'种族':'职业';identityLibrary.querySelector('h2')!.textContent=`选择${label}`;identityFrame.title=`选择${label}`;if(identityFrame.dataset.kind!==identityKind){identityFrame.src=`/${identityKind}/?mode=select`;identityFrame.dataset.kind=identityKind;}identityLibrary.showModal();sendIdentity();}));
document.querySelector('#close-identity-library')!.addEventListener('click',()=>identityLibrary.close());
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==identityFrame.contentWindow||!event.data)return;
 if(event.data.type==='adnd1e-identity-ready')sendIdentity();
 if(event.data.type==='adnd1e-identity-cancel')identityLibrary.close();
 if(event.data.type==='adnd1e-identity-selected'&&event.data.kind===identityKind){const catalog=identityKind==='races'?races:classes;const entry=catalog.find(entry=>entry.id===event.data.id);if(!entry)return;collect();set(identityKind==='races'?'race':'class',entry.id);update();modified();identityLibrary.close();}
});

const savedSelect=document.querySelector<HTMLSelectElement>('#saved-characters')!;
function readSaved():Card[] {
  const raw=localStorage.getItem('adnd1e-characters');if(!raw)return [];
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new Error('浏览器中的人物库无法读取，原记录已保留。请先导出当前人物卡。');}
  if(!Array.isArray(parsed))throw new Error('浏览器中的人物库格式不正确，原记录已保留。');
  return parsed.map(normalizeCard);
}
function refreshSaved(selected='') {
  savedSelect.replaceChildren(new Option('选择已保存的人物',''),...readSaved().map(entry=>new Option(String(entry.fields.name||'未命名人物'),String(entry.fields.character_id||''))));savedSelect.value=selected;
}
function saveCurrent(copy=false) {
  try {
    const saved=readSaved();collect();
    if(copy){card.fields.character_id=crypto.randomUUID();card.fields.name=`${card.fields.name||'未命名人物'}（副本）`;applyCard(card);}
    if(!value('character_id'))set('character_id',crypto.randomUUID());collect();
    const next=saved.filter(entry=>entry.fields.character_id!==card.fields.character_id);next.push(card);
    localStorage.setItem('adnd1e-characters',JSON.stringify(next));localStorage.setItem('adnd1e-character',JSON.stringify(card));refreshSaved(String(card.fields.character_id));dirty=false;notify('已保存到此浏览器。');
  }catch(error){notify(error instanceof Error?error.message:'保存失败，请导出 JSON 备份。');}
}
document.querySelector('#save-character')!.addEventListener('click',()=>saveCurrent());
document.querySelector('#copy-character')!.addEventListener('click',()=>saveCurrent(true));
document.querySelector('#new-character')!.addEventListener('click',()=>{applyCard(blankCard());savedSelect.value='';showPanel('front');notify('已新建空白人物卡；已保存的人物仍在列表中。');});
document.querySelector('#load-character')!.addEventListener('click',()=>{try{const saved=readSaved().find(entry=>entry.fields.character_id===savedSelect.value);const current=saved??normalizeCard(JSON.parse(localStorage.getItem('adnd1e-character')??'null'));applyCard(current);refreshSaved(String(current.fields.character_id||''));notify('已加载人物卡。');}catch(error){notify(error instanceof Error?error.message:'人物卡无法读取，原记录已保留。');}});
document.querySelector('#export-character')!.addEventListener('click',()=>{const data=collect(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${String(card.fields.name||'adnd1e-ref2-card').replace(/[<>:"/\\|?*]/g,'_')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('已导出人物卡 JSON，包含所有追加记录与准备法术。');});
document.querySelector<HTMLInputElement>('#import-character')!.addEventListener('change',async event=>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{const next=normalizeCard(JSON.parse(await file.text()));applyCard(next);dirty=true;notify('已导入人物卡。点击“保存”可存入浏览器。');}catch(error){notify(error instanceof Error?error.message:'文件无法读取；当前人物卡未改动。');}finally{input.value='';}});
installCardPrinting(form,()=>{collect();});
applyCard(card);
try{refreshSaved();}catch(error){notify(error instanceof Error?error.message:'人物库无法读取，原记录已保留。');}

function updateCombat(strength:string){
 const profile=combatProfile(card.fields),base=profile?.attacks.find(a=>a.ac===0)?.target;
 document.querySelector('#combat-breakdown')!.textContent=profile?'DMG p.74 原书攻击矩阵；THAC0 为基础目标值，命中／伤害加值另列。未计入专精、非熟练惩罚、特殊敌人或投掷特例，可改写调整。':'当前职业的攻击矩阵尚未核对，请按职业资料手填。';
 if(checked('manual_combat'))return;
 const monk=value('class')==='monk'?monkCombat(Number(value('level'))):null;
 if(monk){let row=card.rows.unarmed.find(r=>r.values.monkAuto==='yes');if(!row){row=card.rows.unarmed.find(r=>Object.values(r.values).every(v=>!v.trim()))??blankRow();row.values.monkAuto='yes';row.values.style='武僧徒手（PHB）';if(!card.rows.unarmed.includes(row))card.rows.unarmed.push(row);renderRows('unarmed');}for(const [key,entry] of Object.entries({attacks:monk.attacks,damage:monk.damage,thac0:String(base??''),hit:'0',damage_adj:'0'})){generated(row.values,key,entry);const input=repeater('unarmed').querySelector<HTMLInputElement>(`[data-row-id="${row.id}"] [data-cell="${key}"]`);if(input)input.value=row.values[key];}}
 if(!monk)for(const row of card.rows.unarmed.filter(r=>r.values.monkAuto==='yes')){
  for(const key of ['attacks','damage','thac0','hit','damage_adj']){generated(row.values,key,'');const input=repeater('unarmed').querySelector<HTMLInputElement>(`[data-row-id="${row.id}"] [data-cell="${key}"]`);if(input)input.value=row.values[key];}
 }
 for(const row of card.rows.unarmed){
  if(!row.values.style?.trim()||row.values.monkAuto==='yes')continue;
  const simple=row.values.combatRule==='ua-simple';
  if(simple){generated(row.values,'thac0',base===undefined?'':String(base));generated(row.values,'hit',String(value('class')==='monk'?0:abilityBonus('STR',strength,'命中')));}
  // Other procedures have their own percentages, styles or attack sequence; never infer from weapon rate.
  const node=repeater('unarmed').querySelector<HTMLElement>(`[data-row-id="${row.id}"]`);
  for(const key of ['thac0','hit']){const control=node?.querySelector<HTMLInputElement>(`[data-cell="${key}"]`);if(control)control.value=row.values[key]??'';}
 }
 for(const row of card.rows.weapons){
  const selected=resolveItem(items,row.values.name??'');if(!selected)continue;
  const weapon=weaponWithBase(selected,items,row.values.base_weapon),ranged=row.values.mode==='missile'||!weapon.weaponCombat?.handHeld&&!!weapon.weaponCombat?.missile;
  const magic=enhancement(selected),hit=(value('class')==='monk'||(value('class')==='oa-kensai'&&ranged)?0:abilityBonus(ranged?'DEX':'STR',ranged?value('DEX'):strength,ranged?'投射':'命中'))+magic,damage=(value('class')==='monk'?Math.floor(Number(value('level'))/2):ranged?0:abilityBonus('STR',strength,'伤害'))+magic;
  generated(row.values,'thac0',base===undefined?'':String(base));generated(row.values,'hit',String(hit));generated(row.values,'damage_adj',String(damage));
  if(!profile)generated(row.values,'attacks','');
  else if(!ranged&&profile.attackFamily!=='fighter')generated(row.values,'attacks','1/1');
  if(!ranged&&profile?.attackFamily==='fighter')generated(row.values,'attacks',value('class')==='dragon-045-class-archer'?(Number(value('level'))>=16?'2/1':Number(value('level'))>=9?'3/2':'1/1'):Number(value('level'))>=13?'2/1':Number(value('level'))>=7?'3/2':'1/1');
  if(ranged&&value('class')==='dragon-045-class-archer'&&/弓/.test(weapon.nameZh))generated(row.values,'attacks',Number(value('level'))>=7?'3/1':'2/1');
  const node=repeater('weapons').querySelector<HTMLElement>(`[data-row-id="${row.id}"]`);for(const key of ['thac0','hit','damage_adj','attacks']){const control=node?.querySelector<HTMLInputElement>(`[data-cell="${key}"]`);if(control)control.value=row.values[key]??'';}
 }
}
const referenceDialog=document.querySelector<HTMLDialogElement>('#reference-library')!,referenceFrame=document.querySelector<HTMLIFrameElement>('#reference-library-frame')!;
let referenceKind:CollectionName='proficiencies';
const sendReferences=()=>referenceFrame.contentWindow?.postMessage({type:'adnd1e-reference-selection',ids:card.rows[referenceKind].map(r=>r.values.referenceId).filter(Boolean)},location.origin);
document.querySelectorAll<HTMLButtonElement>('[data-open-reference]').forEach(button=>button.addEventListener('click',()=>{collect();referenceKind=button.dataset.openReference as CollectionName;referenceFrame.src='/character/library/references/?kind='+referenceKind;referenceDialog.showModal();}));
document.querySelector('#close-reference-library')!.addEventListener('click',()=>referenceDialog.close());
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==referenceFrame.contentWindow)return;if(event.data?.type==='adnd1e-reference-ready')sendReferences();if(event.data?.type==='adnd1e-references-selected'&&event.data.kind===referenceKind&&Array.isArray(event.data.ids)&&event.data.ids.every((id:unknown)=>typeof id==='string')){collect();selectReferences(card,referenceKind,event.data.ids);renderRows(referenceKind);update();modified();referenceDialog.close();}});

function selectedArmor(slot:string){const item=items.find(i=>i.id===card.fields[slot+'_id']);return item&&[item.id,cardName(item.nameZh)].includes(value(slot))?item:resolveItem(items,value(slot));}
