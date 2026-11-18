import {itemSelectionKind} from '../../utils/item-selection';
import {cardName} from './labels';
import {currentItemLabel,findNamedEntry} from '../../utils/terminology';
import {installCardPrinting} from './printing';
import abilityTables from '../../data/public/ability-tables.json';
import options from '../../data/public/character-options.json';
import classTables from '../../data/public/class-tables.json';
import type {ClassEntry,RaceEntry} from '../../schemas';
const classes=options.classes as ClassEntry[],races=options.races as RaceEntry[];
import { itemIndex as items } from '../../data/public/item-index';
import { spells } from '../../data/public/spell-index';
import spellbookCatalog from '../../data/character-spellbooks.json';
import { abilityAdjustment } from '../../rules-engine/abilities';
import { checkEligibility, checkEquipment, computeArmorClass, computeEncumbrance, computeMovement, type Ability } from '../../rules-engine/character';
import { blankCard, blankRow, collectionNames, normalizeCard, selectPrepared, selectInventory, type Card, type CollectionName, type Row } from './model';
import {fillWeapon,selectWeapons,weaponWithBase,enhancement} from './weapons';
import {updateCardSpellSlots} from './spell-capacity';

import {acceptsItem,type ItemRole} from './item-roles';
import {automateSaves,combatProfile,generated,strengthScore,abilityBonus} from './automation';
import {resolveItem,syncEquipped,carriedItems,selectAmmunition} from './inventory';
import {monkCombat} from './monk';
import {proficiencyBudget,combatProficiencyAdjustment} from './proficiencies';
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
    card.rows[key] = [...hiddenMagic,...[...repeater(key).querySelectorAll<HTMLElement>('[data-card-row]')].map(row=>{const values={...previous.get(row.dataset.rowId!),...Object.fromEntries([...row.querySelectorAll<Control>('[data-cell]')].map(control=>[control.dataset.cell!,control instanceof HTMLInputElement&&control.type==='checkbox'?(control.checked?'1':''):control.value]))};if(key==='ammunition'){const boxes=[...row.querySelectorAll<HTMLInputElement>('[data-cell^="box_"]')];values.count=String(boxes.length);values.used=String(boxes.filter(box=>box.checked).length);}return{id:row.dataset.rowId!,values};})];
    if(key==='ammunition')for(const row of card.rows.ammunition){const item=items.find(i=>i.id===row.values.itemId);if(item&&row.values.name!==cardName(item.nameZh)){delete row.values.itemId;delete row.values.ammoPickerId;}}
    if(key==='weapons')for(const row of card.rows.weapons){const old=previous.get(row.id)?.name,item=items.find(i=>i.id===old);if(item&&row.values.name===cardName(item.nameZh))row.values.name=item.id;if(row.values.name?.endsWith('::missile')){row.values.name=row.values.name.slice(0,-9);row.values.mode='missile';}}
  }
  return card;
}
function renderRows(key:CollectionName) {
  const section=repeater(key), table=section.querySelector<HTMLElement>('[data-row-table]')!, template=section.querySelector<HTMLTemplateElement>('[data-row-template]')!;
  table.querySelectorAll('[data-card-row]').forEach(row=>row.remove());
  card.rows[key].filter(record=>key!=='gear'||!items.some(item=>item.id===record.values.itemId&&itemSelectionKind(item)==='magic')||!!record.values.equippedSlot).forEach((record,index)=>{
    const row=template.content.querySelector<HTMLElement>('[data-card-row]')!.cloneNode(true) as HTMLElement;
    row.dataset.rowId=record.id;
    if(key==='ammunition'){
      const boxes=row.querySelector<HTMLElement>('.ammunition-boxes')!,capacity=index===0?20:5,used=Math.max(0,Number(record.values.used)||0),hasBoxState=Object.keys(record.values).some(keyName=>keyName.startsWith('box_'));row.classList.toggle('ammunition-primary',index===0);
      boxes.replaceChildren(...Array.from({length:capacity},(_,boxIndex)=>{const input=document.createElement('input');input.type='checkbox';input.dataset.cell=`box_${boxIndex}`;input.setAttribute('aria-label',`第 ${boxIndex+1} 发已用`);input.checked=hasBoxState?record.values[`box_${boxIndex}`]==='1':boxIndex<used;return input;}));
    }
    for (const control of row.querySelectorAll<Control>('[data-cell]')) {
      const keyName=control.dataset.cell!;
      let entry=record.values[keyName] ?? '';
      if (key==='weapons' && keyName==='name') {const item=findNamedEntry(items,'item',entry);entry=item?.id??entry;entry=item?cardName(item.nameZh):entry;}
      if (control instanceof HTMLSelectElement && entry && ![...control.options].some(option=>option.value===entry)) control.add(new Option(entry,entry));
      if(control instanceof HTMLInputElement&&control.type==='checkbox')control.checked=entry==='1';else control.value=entry;
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
function update(editSource='') {
  collect();
  const magicAdjustments=magicItemAdjustments(card,Number(value('DEX'))||0,value('class'));
  const xpClass=String(value('class')),xpTable=(classTables as Record<string,{rows:string[][]}>)[xpClass];
  if(xpTable&&['xp','level','class'].includes(editSource)){
    const rows=xpTable.rows.map(row=>({level:Number(row[1]),minimum:Number(row[0].match(/[\d,]+/)?.[0]?.replaceAll(',','')??NaN)})).filter(row=>Number.isFinite(row.minimum)&&Number.isFinite(row.level)).sort((a,b)=>a.level-b.level);
    const currentLevel=Math.max(1,Number(value('level'))||1),currentXp=Math.max(0,Number(value('xp'))||0);
    if(editSource==='level'||(editSource==='class'&&!String(value('xp')).trim())){const row=rows.find(entry=>entry.level===currentLevel);if(row){set('xp',row.minimum);card.fields.auto_xp=String(row.minimum);}}
    else {const row=[...rows].reverse().find(entry=>currentXp>=entry.minimum);if(row){set('level',row.level);card.fields.auto_level=String(row.level);}}
  }
  const capacityFields={...card.fields,INT:/^\d+$/.test(value('INT'))?String(Math.min(25,Number(value('INT'))+magicAdjustments.INT)):value('INT'),WIS:/^\d+$/.test(value('WIS'))?String(Math.min(25,Number(value('WIS'))+magicAdjustments.WIS)):value('WIS')};
  const spellCapacity=updateCardSpellSlots(capacityFields);
  if(!checked('manual_spell_slots'))for(let level=0;level<=9;level++)card.fields[`spell_slots_${level}`]=String(capacityFields[`spell_slots_${level}`]??'');
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
  let strength=magicAdjustments.strengthOverride||strengthScore(value('STR'),value('exceptional_strength'));
  if(!magicAdjustments.strengthOverride&&/^(?:[3-9]|1\d|2[0-5])$/.test(strength))strength=String(Math.max(3,Math.min(25,Number(strength)+magicAdjustments.STR)));
  const effectiveDexterity=/^\d+$/.test(value('DEX'))?String(Math.max(3,Math.min(25,Number(value('DEX'))+magicAdjustments.DEX))):value('DEX');
  for (const ability of abilities) {
    const raw=ability==='STR'?strength:ability==='DEX'?effectiveDexterity:/^\d+$/.test(value(ability))?String(Math.max(3,Math.min(25,Number(value(ability))+magicAdjustments[ability]))):value(ability);
    const result=abilityAdjustment(ability,raw);
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
  const protectionBonus=magicAdjustments.save;
  const saveNote=automateSaves(card.fields);
  if(!checked('manual_saves')&&protectionBonus)for(let i=0;i<5;i++){const rawBase=String(card.fields[`auto_save_${i}`]??'').trim();const base=Number(rawBase);if(rawBase!==''&&Number.isFinite(base))card.fields[`save_${i}`]=String(base-protectionBonus);}
  document.querySelector('#save-breakdown')!.textContent=saveNote+(protectionBonus?`；防护魔法物品豁免 +${protectionBonus} 已计入。`: '');
  for(let i=0;i<5;i++){set(`save_${i}`,String(card.fields[`save_${i}`]??''));(field(`save_${i}`) as HTMLInputElement).readOnly=false;}
  document.querySelector('#proficiency-budget')!.textContent=proficiencyBudget(card);
  for(const key of ['weapon_slots','nonweapon_slots','shared_slots'])set(key,String(card.fields[key]??''));
  updateCombat(strength);
  const monk=value('class')==='monk'?monkCombat(Number(value('level'))):null;
  const dexterity=['monk','oa-kensai'].includes(value('class'))?'':effectiveDexterity;
  const ac=computeArmorClass(armor,shield,dexterity,Number(value('ac_modifier'))||0);
  if(monk&&!armor&&!shield){ac.value=monk.ac+(Number(value('ac_modifier'))||0);ac.notes.push('PHB p.31 武僧表 II；不叠加敏捷防御。');}
  if(value('class')==='barbarian'&&Number(effectiveDexterity)>14){const dexPart=ac.components.find(p=>p.label.startsWith('DEX'));const old=dexPart?.value??0,next=-(Number(effectiveDexterity)-14)*(armor&&/链|带|板|鳞/.test(armor.nameZh)?1:2);ac.value+=next-old;ac.notes.push('UA 野蛮人敏捷防御：笨重护甲每点−1，其余每点−2。');}
  if(value('class')==='oa-kensai'&&!armor&&!shield&&Number(effectiveDexterity)>0){ac.value=23-Number(effectiveDexterity)-Math.floor(Number(value('level'))/3)+(Number(value('ac_modifier'))||0);ac.notes.push('OA 剑圣：23−DEX，每3级改善1；不另加敏捷防御调整。');}
  const magicAcBonus=magicAdjustments.ac;
  if(magicAcBonus){ac.value-=magicAcBonus;ac.components.push({label:'防护魔法物品',value:-magicAcBonus,source:'DMG Ring of Protection／手动物品修正'});}
  (field('ac') as HTMLInputElement).readOnly=!checked('manual_ac');
  if (!checked('manual_ac')) set('ac',ac.value);
  for(const [key,entry] of [['ac_shieldless',computeArmorClass(armor,undefined,dexterity,Number(value('ac_modifier'))||0).value-magicAcBonus],['ac_surprised',computeArmorClass(armor,shield,'',Number(value('ac_modifier'))||0).value-magicAcBonus],['ac_rear',computeArmorClass(armor,undefined,'',Number(value('ac_modifier'))||0).value-magicAcBonus]] as const){if(!['monk','oa-kensai','barbarian'].includes(value('class'))){generated(card.fields,key,String(entry));set(key,String(card.fields[key]??''));}}
  document.querySelector('#ac-breakdown')!.textContent=ac.components.map(part=>`${part.label} ${part.value}`).join('；')+'。'+ac.notes.join(' ');
  const weaponItems=card.rows.weapons.map(row=>items.find(item=>item.id===row.values.name)).filter(Boolean) as typeof items;
  const encumbrance=computeEncumbrance(carriedItems(card,items).map(entry=>({...entry,item:weaponWithBase(entry.item,items)})));
  const race=races.find(race=>race.id===value('race'));
  if(race){for(const [key,text] of [['languages',race.languages],['senses',race.abilities.filter(a=>/视觉|视力/.test(a)).join('；')],['detections',race.detection],['resistances',race.savingThrows],['special_abilities',race.abilities.join('；')]] as const){generated(card.fields,key,text);set(key,String(card.fields[key]??''));}}
  const coins=['gp','sp','cp','ep','pp','dl_steel'].reduce((sum,denom)=>sum+Math.max(0,Number(value(`coins_${denom}`))||0),0)+Math.max(0,Number(value('coins_other_count'))||0);
  if(field('coins_carried'))set('coins_carried',coins);
  const customCoins=Math.max(0,Number(value('coins_other_count'))||0);
  const coinWeight=(coins-customCoins)/10+customCoins*Math.max(0,Number(value('coins_other_weight_per_10'))||1)/10;
  const totalWeight=encumbrance.value+coinWeight;
  const movement=computeMovement({base:monk?.move??(['barbarian','oa-barbarian'].includes(value('class')) ? 15 : Number(race?.movement.match(/\d+/)?.[0] ?? 12)),weightPounds:totalWeight,strength,bulky:checked('move_bulky'),difficultTerrain:checked('move_terrain'),otherAdjustment:Number(value('move_adjustment'))||0});
  set('move_base',`${movement.base}″`);
  (field('move_loaded') as HTMLInputElement).readOnly=!checked('manual_movement');
  if (!checked('manual_movement')) set('move_loaded',`${movement.effective}″`);
  for (const [key,factor] of Object.entries({hvy:.75,load:.5,max:.25,run_rate:10,normal_rate:5,crawl:.5,hidden:2/3})) set(`move_${key}`,`${Math.round(movement.base*factor*10)/10}″`);
  document.querySelector('#movement-breakdown')!.textContent=`已知装备 ${encumbrance.value.toFixed(1)} 磅；${value('coins_other_name')||'标准钱币'} ${coinWeight.toFixed(1)} 磅（标准币按 10 枚／磅）。${race&&!/\d/.test(race.movement)?'种族未提供固定地面移动率，当前按12寸暂算，请手动核对。 ':''}${movement.notes.join(' ')}`;
  document.querySelector('#encumbrance-result')!.textContent=`已知负重 ${totalWeight.toFixed(1)} 磅${encumbrance.unknown.length ? '；另有未列重量的物品' : ''}。`;
  renderOwnedMagic();
  const classEntry=classes.find(entry=>entry.id===value('class'));
  const issues=[...checkEligibility({raceId:value('race'),classId:value('class'),alignment:value('alignment'),abilities:card.fields as Record<Ability,string>},classes,races),...weaponItems.flatMap((weapon,index)=>checkEquipment(value('class'),weapon,index===0 ? armor : undefined,index===0 ? shield : undefined))];
  const messages=issues.map(issue=>`错误：${issue.message}（${issue.source}）`);
  if(classEntry?.referenceOnly)messages.push('警告：该职业来自扩展规则。请确认战役启用该规则。');
  if(classEntry?.characterEligible===false)messages.push('警告：该职业标记为 NPC 职业。');
  if(classEntry?.id==='cavalier'&&!/贵族|王族/.test(String(value('social_status'))))messages.push(value('social_status')?'错误：骑士的社会阶层不符合贵族出身要求。':'提示：骑士要求贵族出身。请填写社会阶层。');
  const levelLimit=race?.eligibleClasses.find(entry=>entry.id===classEntry?.id)?.limit;
  if(levelLimit&&/最高|上限/.test(levelLimit)&&Number(value('level'))>(Number(levelLimit.match(/\d+/)?.[0]??0)))messages.push(`错误：${race?.nameZh}的${classEntry?.nameZh}等级超过种族上限（${levelLimit}）。`);
  if(classEntry&&Number(value('level'))>0&&!xpTable)messages.push('警告：缺少该职业的经验等级表。请核对职业原表。');
  for(const row of card.rows.henchmen){const identity=row.values.raceClass||'',parts=identity.split('/').map(part=>part.trim()).filter(Boolean);if(identity.includes('/')&&parts.length>2)messages.push(`警告：随从“${row.values.name||'未命名'}”请按“种族 / 职业”填写。`);if(row.values.level&&Number(row.values.level)>Number(value('level'))+2)messages.push(`警告：随从“${row.values.name||'未命名'}”高于人物等级两级。请核对 HD 与攻击次数。`);if(parts.length===2){const fr=races.find(entry=>entry.id===parts[0]||entry.nameZh===parts[0]||entry.nameEn.toLowerCase()===parts[0].toLowerCase()),fc=classes.find(entry=>entry.id===parts[1]||entry.nameZh===parts[1]||entry.nameEn.toLowerCase()===parts[1].toLowerCase());if(fr&&fc&&!fc.eligibleRaces.includes(fr.id))messages.push(`错误：随从的${fr.nameZh}不能选择${fc.nameZh}（${fc.source.map(source=>source.book).join('、')}）。`);}}
  for (const prepared of card.preparedSpells) {
    const spell=spells.find(spell=>spell.id===prepared.spellId);
    if (spell && classEntry && !spell.classes.includes(classEntry.nameEn) && !['paladin','ranger','bard'].includes(classEntry.id)) messages.push(`错误：${spell.nameZh}不在${classEntry.nameZh}法术表中。`);
  }
  for (let level=0;level<=9;level++) {
    const limit=value(`spell_slots_${level}`), used=card.preparedSpells.reduce((sum,entry)=>sum+(spells.find(spell=>spell.id===entry.spellId)?.level===level ? entry.count : 0),0);
    if (limit!=='' && used>Number(limit)) messages.push(`错误：${level}环准备 ${used} 次，法术位为 ${limit}。`);
  }
  if (!checked('manual_spell_slots') && spellCapacity.tracks.length>1) for (const track of spellCapacity.tracks) track.daily.forEach((limit,index)=>{
    const used=card.preparedSpells.reduce((sum,entry)=>{
      const spell=spells.find(spell=>spell.id===entry.spellId);
      return sum+(spell?.level===index+1 && spell.classes.includes(track.listId==='druid'?'Druid':'Magic-User')?entry.count:0);
    },0);
    if (used>limit) messages.push(`错误：${track.label} ${index+1}环准备 ${used} 次，法术位为 ${limit}。`);
  });
  const errors=messages.filter(message=>message.startsWith('错误：')).length,warnings=messages.filter(message=>message.startsWith('警告：')).length,hints=messages.length-errors-warnings;
  const ruleStatus=document.querySelector<HTMLElement>('#rule-status')!;
  ruleStatus.textContent=[errors?`错误 ${errors} 项`:'',warnings?`警告 ${warnings} 项`:'',hints?`提示 ${hints} 项`:'' ].filter(Boolean).join(' · ')||'无规则错误。';
  ruleStatus.classList.toggle('has-conflicts',errors>0);ruleStatus.classList.toggle('has-warnings',warnings>0&&!errors);
  document.querySelector('#rule-hints')!.replaceChildren(...messages.map(message=>{const li=document.createElement('li');li.textContent=message;li.className=message.startsWith('错误：')?'error':message.startsWith('警告：')?'warning':'hint';return li;}));
  const social=String(value('social_status')||'未设定社会阶层');
  const followers=card.rows.henchmen.filter(row=>row.values.name||row.values.raceClass||row.values.level).map(row=>{const parts=(row.values.raceClass||'').split('/').map(part=>part.trim()),fc=classes.find(entry=>entry.id===parts[1]||entry.nameZh===parts[1]||entry.nameEn.toLowerCase()===parts[1]?.toLowerCase()),lvl=Number(row.values.level)||Number(value('level'));if(!fc)return `${row.values.name||'随从'}：填写“种族 / 职业”后可建议 HD、攻击次数与 THAC0。`;const profile=combatProfile({...card.fields,class:fc.id,level:String(lvl)}),thac0=profile?.attacks.find(entry=>entry.ac===0)?.target,attacks=profile?.attackFamily==='fighter'?(lvl>=13?'2/1':lvl>=7?'3/2':'1/1'):'1/1';return `${row.values.name||'随从'}：按${fc.nameZh} ${lvl}级暂建议 HD／等级 ${row.values.level||lvl}、攻击 ${attacks}${thac0===undefined?'':`、THAC0 ${thac0}`}；按其职业原表及怪物 HD 复核。`;}).join('\n');
  const socialSuggestion=classEntry?.id==='cavalier'?`社会阶层：${social}。骑士须为贵族出身。`:`社会阶层：${social}。`;
  const suggestion=[classEntry?`${classEntry.nameZh}：护甲 ${classEntry.armor}；武器 ${classEntry.weapons}。`: '提示：选择职业以查看装备建议。',race?`${race.nameZh}：移动 ${race.movement}；等级上限 ${race.levelLimits}。`:'提示：选择种族以查看等级限制。',socialSuggestion,`起始资金：${startingMoneyDice(classEntry?.id||'')}。`,`年龄：按 DMG 种族与职业骰取。身高、体重：查 DMG 人物特征表。`,followers].filter(Boolean).join('\n');
  document.querySelector('#rule-suggestions')!.textContent=suggestion;
  document.querySelector('#spellbook-summary')!.textContent=spellbookSummary(card.fields.spellbook_records);
  document.querySelector('#character-spellbook-summary')!.textContent=spellbookSummary(card.fields.spellbook_records);
}

function startingMoneyDice(classId:string){return ({cleric:'3d6×10 gp',fighter:'5d4×10 gp',paladin:'5d4×10 gp（按战士类别）',ranger:'5d4×10 gp（按战士类别）','magic-user':'2d4×10 gp',illusionist:'2d4×10 gp（按魔法师类别）',thief:'2d6×10 gp',monk:'5d4 gp'} as Record<string,string>)[classId]??'按职业原表掷骰（此职业未映射）';}
type MagicAdjustments=Record<Ability,number>&{ac:number;save:number;hit:number;damage:number;strengthOverride:string};
function magicItemEffectsFor(item:typeof items[number]){return ['magic-ring-of-protection','magic-cloak-of-protection','magic-gauntlets-of-dexterity','magic-gauntlets-of-ogre-power','dragon-117-magic-item-ring-of-the-bards'].includes(item.id);}
function travelBookSpellIds(entry:any){const raw=Array.isArray(entry.spells)?entry.spells:String(entry.spells||'').split(/[，,、\s]+/);return raw.map((token:string)=>spells.find(spell=>spell.id===token||spell.nameZh===token||spell.nameEn.toLowerCase()===token.toLowerCase())?.id).filter(Boolean) as string[];}
function spellbookSummary(raw:unknown){try{const data=JSON.parse(String(raw||'{}'));const books=(data.books||[]).map((entry:any)=>{const book=(spellbookCatalog as {id:string;code:string;title:string}[]).find(candidate=>candidate.id===entry.id),levels=Object.entries(entry.levels||{}).filter(([,v]:[string,any])=>Number(v.chosen||v.adventure||0)||(v.spellIds||[]).length).map(([level,v]:[string,any])=>`${level}环 自选${v.chosen??0}/冒险${v.adventure??0}`);return `${book?.code||entry.id}${levels.length?`：${levels.join('、')}`:''}`;});const travel=(data.travel||[]).map((entry:any)=>`${entry.name||'未命名旅行书'}（${travelBookSpellIds(entry).length}种）`);return books.length||travel.length?`${books.join('； ')}${travel.length?`；旅行书：${travel.join('、')}`:''}`:'暂无记录。';}catch{return '法术书记录无法读取。';}}
function magicItemAdjustments(card:Card,dexterity:number,classId:string):MagicAdjustments{
 const result:MagicAdjustments={STR:0,INT:0,WIS:0,DEX:0,CON:0,CHA:0,ac:0,save:0,hit:0,damage:0,strengthOverride:''};
 for(const row of card.rows.gear){const item=items.find(entry=>entry.id===row.values.itemId);if(!item||Number(row.values.quantity||1)<=0||magicItemEffectsFor(item)&&row.values.magic_effect_active==='0')continue;
  if(['magic-ring-of-protection','magic-cloak-of-protection'].includes(item.id)){
   const fixed=(item.nameEn+' '+item.nameZh).match(/(?:ring|cloak) of protection\s*\+\s*([1-5])|防护(?:戒指|斗篷)[^+]{0,10}\+\s*([1-5])/i),bonus=Number(fixed?.[1]||fixed?.[2]||row.values.protection_bonus)||0;result.ac+=bonus;result.save+=bonus;
  }else if(item.id==='dragon-117-magic-item-ring-of-the-bards'){result.ac+=2;result.save+=classId==='bard'?4:2;}
  else if(item.id==='magic-gauntlets-of-dexterity')result.DEX+=dexterity<=6?4:dexterity<=13?2:1;
  else if(item.id==='magic-gauntlets-of-ogre-power'){result.strengthOverride='18/00';result.hit+=3;result.damage+=6;}
 }
 return result;
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
form.addEventListener('input',event=>{update((event.target as Control).name);modified();});
form.addEventListener('focusout',event=>{if((event.target as HTMLInputElement).name==='STR'){splitStrength();update();}});
form.addEventListener('change',event=>{const control=event.target as HTMLInputElement;if(control.name==='STR')splitStrength();if(control.name==='manual_saves'&&!control.checked){for(let i=0;i<5;i++)set(`save_${i}`,String(card.fields[`auto_save_${i}`]??''));}update(control.name);modified();});
form.addEventListener('submit',event=>event.preventDefault());
document.querySelector<HTMLButtonElement>('#roll-starting-money')!.addEventListener('click',()=>{const id=value('class'),spec:Record<string,[number,number,number]>={cleric:[3,6,10],fighter:[5,4,10],paladin:[5,4,10],ranger:[5,4,10],'magic-user':[2,4,10],illusionist:[2,4,10],thief:[2,6,10],monk:[5,4,1]},roll=spec[id];if(!roll){document.querySelector('#starting-money-result')!.textContent='此职业无核对完成的起始资金骰法，请对照职业原表。';return;}const [n,sides,multiplier]=roll,total=Array.from({length:n},()=>1+Math.floor(Math.random()*sides)).reduce((a,b)=>a+b,0)*multiplier;set('coins_gp',total);update();modified();document.querySelector('#starting-money-result')!.textContent=`${n}d${sides}×${multiplier===1?'1':multiplier} gp = ${total} gp（PHB 金钱表；社会阶层限制仍需依战役核对）。`;});
document.querySelector<HTMLButtonElement>('#roll-age')!.addEventListener('click',()=>{
  const raceId=value('race'),classId=value('class');
  const human:Record<string,[number,number,number]>={cleric:[18,1,4],druid:[18,1,4],fighter:[15,1,4],paladin:[17,1,4],ranger:[20,1,4],'magic-user':[24,2,8],illusionist:[30,1,6],thief:[18,1,4],assassin:[20,1,4],monk:[21,1,4]};
  const nonHuman:Record<string,Record<string,[number,number,number]>>={
    dwarf:{cleric:[250,2,20],fighter:[40,5,4],thief:[75,3,6]},
    elf:{cleric:[500,10,10],fighter:[130,5,6],'magic-user':[150,5,6],thief:[100,5,6]},
    gnome:{cleric:[300,3,12],fighter:[60,5,4],'magic-user':[100,2,12],thief:[80,5,4]},
    'half-elf':{cleric:[40,2,4],fighter:[22,3,4],'magic-user':[30,2,8],thief:[22,3,8]},
    halfling:{fighter:[20,3,4],thief:[40,2,4]},
    'half-orc':{cleric:[20,1,4],fighter:[13,1,4],thief:[20,2,4]}
  };
  const spec=raceId==='human'?human[classId]:nonHuman[raceId]?.[classId];
  if(!spec){notify('DMG 年龄表未列出此种族与职业组合；年龄未更改，请手动填写或查战役规则。');return;}
  const [base,count,sides]=spec,rolls=Array.from({length:count},()=>1+Math.floor(Math.random()*sides)),age=base+rolls.reduce((sum,n)=>sum+n,0);
  set('age',age);update();modified();notify(`按 DMG 年龄表：${base}+${count}d${sides}（${rolls.join('+')}）=${age} 岁。`);
});

function showPanel(panel:string) {
  document.querySelectorAll<HTMLElement>('[data-card-panel]').forEach(section=>section.hidden=panel!=='all' && section.dataset.cardPanel!==panel);
  document.querySelectorAll<HTMLButtonElement>('[data-card-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cardTab===panel)));
}
document.querySelectorAll<HTMLButtonElement>('[data-card-tab]').forEach(button=>button.addEventListener('click',()=>showPanel(button.dataset.cardTab!)));
let abilityRollGroups:number[][]=[];
const abilityNames=['STR','INT','WIS','DEX','CON','CHA'];
const rollDice=(count:number,sides:number)=>Array.from({length:count},()=>1+Math.floor(Math.random()*sides));
const writeAbilityGroup=(scores:number[])=>{abilityNames.forEach((ability,index)=>set(ability,scores[index]));update();modified();};
document.querySelector<HTMLButtonElement>('#roll-abilities')!.addEventListener('click',()=>{
  const method=value('ability_method'),result=document.querySelector<HTMLElement>('#ability-roll-result')!,groupWrap=document.querySelector<HTMLElement>('#ability-roll-group-wrap')!,groupChoice=document.querySelector<HTMLSelectElement>('#ability-roll-group')!;
  groupWrap.hidden=method!=='IV';abilityRollGroups=[];
  if(method==='I'){
    const rolls=abilityNames.map(()=>rollDice(4,6).sort((a,b)=>b-a));
    const scores=rolls.map(dice=>dice.slice(0,3).reduce((sum,n)=>sum+n,0)).sort((a,b)=>b-a);writeAbilityGroup(scores);
    result.textContent=`方法 I：${rolls.map(dice=>`${dice.slice(0,3).join('+')}（去掉${dice[3]}）=${dice.slice(0,3).reduce((s,n)=>s+n,0)}`).join('；')}。六项已按高到低暂填，可自行改分配。`;
  }else if(method==='II'){
    const rolls=Array.from({length:12},()=>rollDice(3,6)),ranked=rolls.map(dice=>({dice,total:dice.reduce((s,n)=>s+n,0)})).sort((a,b)=>b.total-a.total),scores=ranked.slice(0,6).map(entry=>entry.total).sort((a,b)=>b-a);writeAbilityGroup(scores);
    result.textContent=`方法 II：12 组结果 ${ranked.map(entry=>entry.total).join('、')}；已取最高 6 组并按高到低暂填：${scores.join('、')}。`;
  }else if(method==='III'){
    const rolls=abilityNames.map(()=>Array.from({length:6},()=>rollDice(3,6)).map(dice=>({dice,total:dice.reduce((s,n)=>s+n,0)})).sort((a,b)=>b.total-a.total)),scores=rolls.map(entries=>entries[0].total);writeAbilityGroup(scores);
    result.textContent=`方法 III：${rolls.map((entries,index)=>`${abilityNames[index]} ${entries.map(entry=>entry.total).join('、')} → ${entries[0].total}`).join('；')}。每项已保留最高结果。`;
  }else{
    abilityRollGroups=Array.from({length:12},()=>abilityNames.map(()=>rollDice(3,6).reduce((s,n)=>s+n,0)));
    groupChoice.replaceChildren(...abilityRollGroups.map((scores,index)=>new Option(`第 ${index+1} 组：${scores.join(' / ')}（合计 ${scores.reduce((a,b)=>a+b,0)}）`,String(index))));
    const best=abilityRollGroups.reduce((best,scores,index)=>scores.reduce((a,b)=>a+b,0)>abilityRollGroups[best].reduce((a,b)=>a+b,0)?index:best,0);groupChoice.value=String(best);writeAbilityGroup(abilityRollGroups[best]);
    result.textContent='方法 IV：已生成 12 组完整属性。先显示总分最高的一组；可在上方下拉框改选其他组。';
  }
});
document.querySelector<HTMLSelectElement>('#ability-roll-group')!.addEventListener('change',event=>{const index=Number((event.target as HTMLSelectElement).value),scores=abilityRollGroups[index];if(scores){writeAbilityGroup(scores);document.querySelector<HTMLElement>('#ability-roll-result')!.textContent=`已选第 ${index+1} 组：${scores.join(' / ')}。`;}});

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
      const wrap=document.createElement('label'),input=document.createElement('input'),slotValue=String(value(`spell_slots_${spell?.level??0}`)),slotLimit=slotValue===''?9999:Number(slotValue);input.type='number';input.min=key==='count'?'1':'0';input.max=key==='count'?String(Math.max(1,slotLimit-card.preparedSpells.filter(other=>other!==entry&&spells.find(candidate=>candidate.id===other.spellId)?.level===spell?.level).reduce((sum,other)=>sum+other.count,0))):String(entry.count);input.value=String(entry[key]);input.setAttribute('aria-label',`${spell?.nameZh??entry.spellId}${label}次数`);wrap.append(label,input);
      input.addEventListener('input',()=>{
        const otherCopies=key==='count'?card.preparedSpells.filter(other=>other!==entry&&spells.find(candidate=>candidate.id===other.spellId)?.level===spell?.level).reduce((sum,other)=>sum+other.count,0):0,rawLimit=String(value(`spell_slots_${spell?.level??0}`)),available=key==='count'?(rawLimit===''?9999:Number(rawLimit))-otherCopies:9999;
        entry[key]=Math.max(key==='count'?1:0,Math.min(available>0?available:1,Math.floor(Number(input.value)||0)));input.value=String(entry[key]);entry.expended=Math.min(entry.count,entry.expended);
        const used=controls.querySelectorAll<HTMLInputElement>('input')[1];
        if(used){used.max=String(entry.count);if(key==='count')used.value=String(entry.expended);}
        remaining.textContent=`剩余 ${entry.count-entry.expended}`;cast.disabled=entry.expended>=entry.count;
        refreshSpellSummary();update();modified();
      });
      input.addEventListener('change',()=>{input.value=String(entry[key]);});controls.append(wrap);
    }
    const remaining=document.createElement('strong');remaining.textContent=`剩余 ${entry.count-entry.expended}`;controls.append(remaining);
    const cast=document.createElement('button');cast.type='button';cast.textContent='施放一次';cast.disabled=entry.expended>=entry.count;cast.addEventListener('click',()=>{entry.expended++;renderPrepared();update();modified();});controls.append(cast);
    const remove=document.createElement('button');remove.type='button';remove.textContent='撤销准备';remove.addEventListener('click',()=>{card.preparedSpells=card.preparedSpells.filter(item=>item!==entry);renderPrepared();update();modified();});controls.append(remove);
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
const ownedSpellDialog=document.querySelector<HTMLDialogElement>('#owned-spell-library')!,ownedSpellList=document.querySelector<HTMLElement>('#owned-spell-list')!;
function knownBookSpells(){
  let data:{books?:{id?:string;levels?:Record<string,{spellIds?:string[]}>}[];adventure?:string[]}={};
  try{data=JSON.parse(String(card.fields.spellbook_records||'{}'));}catch{}
  const ids=new Set<string>(data.adventure||[]);
  for(const book of data.books||[]){
    const catalog=(spellbookCatalog as {id:string;spells?:{id:string}[]}[]).find(entry=>entry.id===book.id);
    for(const spell of catalog?.spells||[])ids.add(spell.id);
    for(const level of Object.values(book.levels||{}))for(const id of level.spellIds||[])ids.add(id);
  }
  return [...ids].map(id=>spells.find(spell=>spell.id===id)).filter(Boolean).sort((a,b)=>a!.level-b!.level||a!.nameZh.localeCompare(b!.nameZh,'zh-CN')) as typeof spells;
}
function renderKnownBookSpells(){
  const candidates=knownBookSpells();ownedSpellList.replaceChildren();
  if(!candidates.length){const note=document.createElement('p');note.textContent='暂无已知法术。先在法术书页登记。';const link=document.createElement('a');link.href='/character/spellbooks/';link.textContent='打开法术书';ownedSpellList.append(note,link);return;}
  for(let level=0;level<=9;level++){const entries=candidates.filter(spell=>spell.level===level);if(!entries.length)continue;const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=level===0?'小法术':`${level}环`;group.append(legend);for(const spell of entries){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=spell.id;input.checked=card.preparedSpells.some(entry=>entry.spellId===spell.id);label.append(input,document.createTextNode(` ${spell.nameZh} · ${spell.nameEn}`));group.append(label);}ownedSpellList.append(group);}
}
document.querySelector('#open-owned-spells')!.addEventListener('click',()=>{renderKnownBookSpells();ownedSpellDialog.showModal();});
document.querySelector('#close-owned-spells')!.addEventListener('click',()=>ownedSpellDialog.close());
document.querySelector('#add-owned-spells')!.addEventListener('click',()=>{const ids=[...ownedSpellList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map(input=>input.value),status=document.querySelector<HTMLElement>('#owned-spell-status')!;if(!ids.length){status.textContent='提示：未选择法术。';return;}selectPrepared(card,[...card.preparedSpells.map(entry=>entry.spellId),...ids]);renderPrepared();update();modified();ownedSpellDialog.close();status.textContent=`已加入 ${ids.length} 个法术。`;});
const library=document.querySelector<HTMLDialogElement>('#spell-library')!,frame=document.querySelector<HTMLIFrameElement>('#spell-library-frame')!;
const sendSelection=()=>frame.contentWindow?.postMessage({type:'adnd1e-card-selection',ids:card.preparedSpells.map(entry=>entry.spellId),slots:Object.fromEntries(Array.from({length:10},(_,level)=>[level,String(value(`spell_slots_${level}`)||'')])),counts:Object.fromEntries(card.preparedSpells.map(entry=>[entry.spellId,entry.count]))},location.origin);
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
 container.replaceChildren(...owned.map(({item,row})=>{
  const line=document.createElement('div');line.className='owned-magic-row';
  const link=document.createElement('a');link.href=`/equipment/${item.id}/`;link.textContent=cardName(item.nameZh);
  const count=document.createElement('input');count.type='number';count.min='0';count.value=row.values.quantity||'1';count.setAttribute('aria-label',`${item.nameZh}数量`);count.addEventListener('change',()=>{row.values.quantity=String(Math.max(0,Number(count.value)||0));update();modified();});line.append(link,count);
  if(magicItemEffectsFor(item)){
   if(!row.values.magic_effect_active)row.values.magic_effect_active='1';
   const active=document.createElement('label');active.className='magic-effect-toggle';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=row.values.magic_effect_active!=='0';checkbox.setAttribute('aria-label',`${item.nameZh}效果生效`);checkbox.addEventListener('change',()=>{row.values.magic_effect_active=checkbox.checked?'1':'0';magicSignature='';update();modified();});active.append(checkbox,document.createTextNode('生效'));line.append(active);
  }
  if(['magic-ring-of-protection','magic-cloak-of-protection'].includes(item.id)){
   const wrap=document.createElement('label');wrap.className='protection-ring-grade';wrap.textContent='防护';
   const select=document.createElement('select');select.setAttribute('aria-label',`${item.nameZh}防护等级`);
   for(const [level,label] of [['0','选等级'],['1','+1'],['2','+2'],['3','+3'],['4','+4'],['5','+5']]){const option=document.createElement('option');option.value=level;option.textContent=label;select.append(option);}
   select.value=row.values.protection_bonus||'0';select.addEventListener('change',()=>{row.values.protection_bonus=select.value;magicSignature='';update();modified();});wrap.append(select);line.append(wrap);
  }
  return line;
 }));
}
function syncMagicAttacks(){
 const owned=card.rows.gear.flatMap(row=>{const item=items.find(entry=>entry.id===row.values.itemId);if(item?.category!=='魔法物品'||Number(row.values.quantity||1)<=0)return[];const attackable=acceptsItem(item,'weapons')||(/攻击/.test(item.description)&&/伤害/.test(item.description)&&/权杖|手套|龙枪|拳套|棍|杖/.test(item.nameZh));if(!attackable)return[];const modes=acceptsItem(item,'weapons')&&item.weaponCombat?.handHeld&&item.weaponCombat?.missile?['handHeld','missile']:['handHeld'];return modes.map(mode=>({id:item.id,mode,item}));});
 const desired=new Set(owned.map(({id,mode})=>`${id}::${mode}`));
 card.rows.weapons=card.rows.weapons.filter(row=>!row.values.magicAttackItemId||desired.has(`${row.values.magicAttackItemId}::${row.values.magicAttackMode||'handHeld'}`));
 for(const {id,mode,item} of owned){if(card.rows.weapons.some(row=>row.values.magicAttackItemId===id&&row.values.magicAttackMode===mode))continue;
  const row=card.rows.weapons.find(entry=>Object.values(entry.values).every(text=>!text.trim()))??blankRow();
  const hit=enhancement(item)||Number(item.description.match(/(?:命中(?:与伤害)?|攻击骰)\s*\+\s*(\d+)/)?.[1]??item.description.match(/\+(\d)\s*魔法武器/)?.[1]??0);
  const damage=item.description.match(/\((\d+d\d+)(?:\s*[+-]\s*\d+)?\)/i)?.[1]?.replace(/\s+/g,'')??'';
  fillWeapon(row,item,mode,items);
  row.values={...row.values,name:id,mode,attacks:row.values.attacks||'1/1',notes:row.values.notes||'魔法物品攻击；复杂效果见物品条目。',magicAttackItemId:id,magicAttackMode:mode,magicAttackHit:String(hit),sm:damage||row.values.sm||''};
  if(!card.rows.weapons.includes(row))card.rows.weapons.push(row);
 }
 renderRows('weapons');
}
const itemLibrary=document.querySelector<HTMLDialogElement>('#item-library')!,itemFrame=document.querySelector<HTMLIFrameElement>('#item-library-frame')!;
let itemKind:ItemRole='gear';
function sendItems(){const ids=itemKind==='weapons'?card.rows.weapons.map(r=>r.values.name):itemKind==='ammunition'?card.rows.ammunition.map(r=>r.values.itemId):itemKind==='armor'||itemKind==='shield'?[resolveItem(items,value(itemKind+'_item'))?.id]:card.rows.gear.filter(r=>items.some(i=>i.id===r.values.itemId&&acceptsItem(i,itemKind))).map(r=>r.values.itemId),blocked:Record<string,string>={};for(const item of items){if(!acceptsItem(item,itemKind))continue;const issues=itemKind==='weapons'?checkEquipment(value('class'),item,undefined,undefined):itemKind==='armor'?checkEquipment(value('class'),undefined,item,undefined):itemKind==='shield'?checkEquipment(value('class'),undefined,undefined,item):[];if(issues.length)blocked[item.id]=issues[0].message;}itemFrame.contentWindow?.postMessage({type:'adnd1e-item-selection',ids:ids.filter(Boolean),blocked},location.origin);}
document.querySelectorAll<HTMLButtonElement>('[data-open-item-library]').forEach(button=>button.addEventListener('click',()=>{collect();itemKind=button.dataset.openItemLibrary as ItemRole;const label={weapons:'武器（含魔法武器）',magic:'魔法物品',gear:'装备',ammunition:'弹药',armor:'护甲',shield:'盾牌'}[itemKind];itemLibrary.querySelector('h2')!.textContent=`选取${label}`;itemFrame.title=`选取${label}`;if(itemFrame.dataset.kind!==itemKind){itemFrame.src='/character/library/items/?mode=select&use='+itemKind;itemFrame.dataset.kind=itemKind;}itemLibrary.showModal();sendItems();}));

document.querySelector('#close-item-library')!.addEventListener('click',()=>itemLibrary.close());
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==itemFrame.contentWindow||!event.data||typeof event.data!=='object')return;
 if(event.data.type==='adnd1e-item-picker-ready')sendItems();
 if(event.data.type==='adnd1e-item-picker-cancel')itemLibrary.close();
 if(event.data.type==='adnd1e-items-selected'&&Array.isArray(event.data.ids)&&event.data.ids.every((id:unknown)=>typeof id==='string')){collect();if(itemKind==='weapons'){selectWeapons(card,event.data.ids,items);renderRows('weapons');}else if(itemKind==='ammunition'){selectAmmunition(card,event.data.ids,items);renderRows('ammunition');}else if(itemKind==='armor'||itemKind==='shield'){const item=items.find(i=>event.data.ids.includes(i.id)&&acceptsItem(i,itemKind));card.fields[itemKind+'_item_id']=item?.id??'';set(itemKind+'_item',item?cardName(item.nameZh):'');}else{selectInventory(card,event.data.ids,itemKind,items);renderRows('gear');if(itemKind==='magic')syncMagicAttacks();}update();modified();itemLibrary.close();}
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
 const magicItems=magicItemAdjustments(card,Number(value('DEX'))||0,value('class'));
 document.querySelector('#combat-breakdown')!.textContent=profile?'THAC0 按职业等级计算。开启自动调整后，熟练武器不受罚；不熟练惩罚按职业组计算；战士专精加命中 +1、伤害 +2。特殊敌人与情境修正另填。':'当前职业的攻击矩阵尚未核对，请按职业资料手填。';
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
  const magic=enhancement(selected),proficiency=card.rows.proficiencies.find(entry=>entry.values.weaponId===selected.id||entry.values.name.trim().toLocaleLowerCase()===selected.nameZh.trim().toLocaleLowerCase()||entry.values.name.trim().toLocaleLowerCase()===selected.nameEn.trim().toLocaleLowerCase()),rank=proficiency?.values.weaponRank||'',classId=value('class'),className=classes.find(entry=>entry.id===classId)?.nameZh||'',proficiencyAdjustment=combatProficiencyAdjustment(checked('auto_weapon_proficiency'),profile?.attackFamily,className,!proficiency||rank==='untrained'?'untrained':rank),gloveApplies=!ranged||!!weapon.weaponCombat?.handHeld&&!!weapon.weaponCombat?.missile&&/投掷|标枪|矛|飞镖/.test(weapon.nameZh),magicHit=gloveApplies?magicItems.hit:0,magicDamage=gloveApplies?magicItems.damage:0,hit=(value('class')==='monk'||(value('class')==='oa-kensai'&&ranged)?0:abilityBonus(ranged?'DEX':'STR',ranged?String(Math.max(3,Math.min(25,Number(value('DEX'))+magicItems.DEX))):strength,ranged?'投射':'命中'))+magic+(Number(row.values.magicAttackHit)||0)+magicHit+proficiencyAdjustment.hit,damage=(value('class')==='monk'?Math.floor(Number(value('level'))/2):ranged?0:abilityBonus('STR',strength,'伤害'))+magic+(Number(row.values.magicAttackHit)||0)+magicDamage+proficiencyAdjustment.damage;
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
