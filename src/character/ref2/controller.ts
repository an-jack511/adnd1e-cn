import abilityTables from '../../data/public/ability-tables.json';
import { classes } from '../../data/public/classes-base';
import { races } from '../../data/public/races-base';
import { itemIndex as items } from '../../data/public/item-index';
import { spells } from '../../data/public/spells';
import { abilityAdjustment } from '../../rules-engine/abilities';
import { checkEligibility, checkEquipment, computeArmorClass, computeEncumbrance, computeMovement, type Ability } from '../../rules-engine/character';
import { blankCard, blankRow, collectionNames, normalizeCard, selectPrepared, selectInventory, type Card, type CollectionName, type Row } from './model';
import {fillWeapon,selectWeapons,isWeapon} from './weapons';

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
    card.rows[key] = [...repeater(key).querySelectorAll<HTMLElement>('[data-card-row]')].map(row=>({id:row.dataset.rowId!,values:{...previous.get(row.dataset.rowId!),...Object.fromEntries([...row.querySelectorAll<Control>('[data-cell]')].map(control=>[control.dataset.cell!,control.value]))}}));
    if(key==='weapons')for(const row of card.rows.weapons){if(row.values.name?.endsWith('::missile')){row.values.name=row.values.name.slice(0,-9);row.values.mode='missile';}}
  }
  return card;
}
function renderRows(key:CollectionName) {
  const section=repeater(key), table=section.querySelector<HTMLTableElement>('[data-row-table]')!, template=section.querySelector<HTMLTemplateElement>('[data-row-template]')!;
  table.querySelectorAll('[data-card-row]').forEach(row=>row.remove());
  card.rows[key].forEach((record,index)=>{
    const row=template.content.querySelector('tbody')!.cloneNode(true) as HTMLTableSectionElement;
    row.dataset.rowId=record.id;
    for (const control of row.querySelectorAll<Control>('[data-cell]')) {
      const keyName=control.dataset.cell!;
      let entry=record.values[keyName] ?? '';
      if (key==='weapons' && keyName==='name') {const item=items.find(item=>item.id===entry || item.nameZh===entry);entry=item?.id??entry;if(item?.weaponCombat?.handHeld&&item.weaponCombat?.missile&&record.values.mode==='missile')entry+='::missile';}
      if (control instanceof HTMLSelectElement && entry && ![...control.options].some(option=>option.value===entry)) control.add(new Option(entry,entry));
      control.value=entry;
      if(key==='weapons'&&keyName==='notes')control.title=entry;
      control.setAttribute('aria-label',`${section.querySelector('h3')!.childNodes[0].textContent!.trim()}第 ${index+1} 条 ${control.getAttribute('aria-label')}`);
    }
    table.append(row);
  });
}
function applyCard(next:Card) {
  card=next; form.reset();
  undo=undefined;undoButton.hidden=true;
  for (const control of form.querySelectorAll<Control>('[name]')) {
    const entry=card.fields[control.name];
    if (control instanceof HTMLInputElement && control.type==='checkbox') control.checked=entry===true;
    else if (typeof entry==='string') {
      if (control instanceof HTMLSelectElement && entry && ![...control.options].some(option=>option.value===entry)) control.add(new Option(`${entry}（原记录）`,entry));
      control.value=entry;
    }
  }
  collectionNames.forEach(renderRows); update(); renderPrepared(); dirty=false;
}
function update() {
  collect();
  form.querySelectorAll<HTMLInputElement>(".row-note input").forEach(input=>input.toggleAttribute("data-filled",!!input.value.trim()));
  const abilities=['STR','INT','WIS','DEX','CON','CHA'] as Ability[];
  const exceptional=value('STR')==='18' && ['fighter','paladin','ranger','cavalier','barbarian'].includes(value('class'));
  document.querySelector<HTMLElement>('#exceptional-row')!.hidden=!exceptional;
  const strength=exceptional && value('exceptional_strength') ? `18/${value('exceptional_strength')==='00' ? '00' : value('exceptional_strength').split('–')[0]}` : value('STR');
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
  const armor=items.find(item=>item.id===value('armor_item')), shield=items.find(item=>item.id===value('shield_item'));
  const ac=computeArmorClass(armor,shield,value('DEX'),Number(value('ac_modifier'))||0);
  (field('ac') as HTMLInputElement).readOnly=!checked('manual_ac');
  if (!checked('manual_ac')) set('ac',ac.value);
  document.querySelector('#ac-breakdown')!.textContent=ac.components.map(part=>`${part.label} ${part.value}`).join('；')+'。'+ac.notes.join(' ');
  const weaponItems=card.rows.weapons.map(row=>items.find(item=>item.id===row.values.name)).filter(Boolean) as typeof items;
  const equipped=[armor,shield,...weaponItems].filter(Boolean) as typeof items;
  const carried=card.rows.gear.map(row=>({item:items.find(item=>item.id===row.values.itemId || item.id===row.values.item || item.nameZh===row.values.item),quantity:row.values.quantity==='' || !row.values.quantity ? 1 : Number(row.values.quantity)}));
  const encumbrance=computeEncumbrance([...equipped.map(item=>({item,quantity:1})),...carried.filter(entry=>entry.item) as {item:typeof items[number];quantity:number}[]]);
  const race=races.find(race=>race.id===value('race'));
  const coins=Math.max(0,Number(value('coins_carried'))||0);
  const movement=computeMovement({base:value('class')==='barbarian' ? 15 : Number(race?.movement.match(/\d+/)?.[0] ?? 12),weightPounds:encumbrance.value+coins/10,strength,bulky:checked('move_bulky'),difficultTerrain:checked('move_terrain'),otherAdjustment:Number(value('move_adjustment'))||0});
  set('move_base',`${movement.base}″`);
  (field('move_loaded') as HTMLInputElement).readOnly=!checked('manual_movement');
  if (!checked('manual_movement')) set('move_loaded',`${movement.effective}″`);
  for (const [key,factor] of Object.entries({hvy:.75,load:.5,max:.25,run_rate:10,normal_rate:5,crawl:.5,hidden:2/3})) set(`move_${key}`,`${Math.round(movement.base*factor*10)/10}″`);
  document.querySelector('#movement-breakdown')!.textContent=`已知装备 ${encumbrance.value.toFixed(1)} 磅；钱币 ${coins/10} 磅。${movement.notes.join(' ')}`;
  document.querySelector('#encumbrance-result')!.textContent=`已知负重 ${(encumbrance.value+coins/10).toFixed(1)} 磅${encumbrance.unknown.length ? '；另有未列重量的物品' : ''}。`;
  renderOwnedMagic();
  const classEntry=classes.find(entry=>entry.id===value('class'));
  const issues=[...checkEligibility({raceId:value('race'),classId:value('class'),alignment:value('alignment'),abilities:card.fields as Record<Ability,string>},classes,races),...weaponItems.flatMap((weapon,index)=>checkEquipment(value('class'),weapon,index===0 ? armor : undefined,index===0 ? shield : undefined))];
  const messages=issues.map(issue=>`${issue.message}（${issue.source}）`);
  for (const prepared of card.preparedSpells) {
    const spell=spells.find(spell=>spell.id===prepared.spellId);
    if (spell && classEntry && !spell.classes.includes(classEntry.nameEn) && !['paladin','ranger','bard'].includes(classEntry.id)) messages.push(`${spell.nameZh}不在所选职业法术表中。`);
  }
  for (let level=0;level<=9;level++) {
    const limit=value(`spell_slots_${level}`), used=card.preparedSpells.reduce((sum,entry)=>sum+(spells.find(spell=>spell.id===entry.spellId)?.level===level ? entry.count : 0),0);
    if (limit!=='' && used>Number(limit)) messages.push(`${level}环准备 ${used} 次，超过填写的 ${limit} 个法术位。`);
  }
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
      if(row&&item&&control.value!==item.nameZh)delete row.values.itemId;
    }
    if (key!=='weapons' || control.dataset.cell!=='name') return;
    const selection=control.value,missile=selection.endsWith('::missile'),id=missile?selection.slice(0,-9):selection;
    collect();const row=card.rows.weapons.find(row=>row.id===control.closest<HTMLElement>('[data-card-row]')!.dataset.rowId)!;
    if(row.values.weaponPickerId!==id)delete row.values.weaponPickerId;
    const item=items.find(item=>item.id===id);if (!item){delete row.values.weaponDataSource;return;}
    fillWeapon(row,item,missile?'missile':undefined);renderRows('weapons');update();modified();
  });
}
form.addEventListener('input',()=>{update();modified();});
form.addEventListener('change',()=>{update();modified();});
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
    const english=document.createElement('small');english.textContent=spell?.nameEn??'原记录中的法术';heading.append(english);
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
  if (!frame.getAttribute('src')) {
    const className=classes.find(entry=>entry.id===value('class'))?.nameEn;
    const url=new URL('/spells/',location.origin);url.searchParams.set('mode','prepare');
    const spellClasses:Record<string,string[]>={Ranger:['Druid','Magic-User'],Paladin:['Cleric'],Bard:['Druid']};
    (className ? spellClasses[className] ?? [className] : []).forEach(name=>{if(spells.some(spell=>spell.classes.includes(name)))url.searchParams.append('class',name);});
    frame.src=url.href;
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

function renderOwnedMagic(){
 const container=document.querySelector('#owned-magic-items');if(!container)return;
 const owned=card.rows.gear.flatMap(row=>{const item=items.find(item=>item.id===row.values.itemId);return item?.category==='魔法物品'?[{item,row}]:[];});
 container.replaceChildren(...owned.map(({item,row})=>{const link=document.createElement('a');link.href=`/equipment/${item.id}/`;link.textContent=`${item.nameZh} × ${row.values.quantity||'1'}`;return link;}));
}
const itemLibrary=document.querySelector<HTMLDialogElement>('#item-library')!,itemFrame=document.querySelector<HTMLIFrameElement>('#item-library-frame')!;
let itemKind:'gear'|'magic'|'weapons'='gear';
function sendItems(){const ids=itemKind==='weapons'?card.rows.weapons.filter(row=>items.some(item=>item.id===row.values.name&&isWeapon(item))).map(row=>row.values.name):card.rows.gear.filter(row=>items.some(item=>item.id===row.values.itemId&&(item.category==='魔法物品')===(itemKind==='magic'))).map(row=>row.values.itemId);itemFrame.contentWindow?.postMessage({type:'adnd1e-item-selection',ids},location.origin);}
document.querySelectorAll<HTMLButtonElement>('[data-open-item-library]').forEach(button=>button.addEventListener('click',()=>{collect();itemKind=button.dataset.openItemLibrary==='weapons'?'weapons':button.dataset.openItemLibrary==='magic'?'magic':'gear';const path=itemKind==='magic'?'/equipment/magic-items/':'/equipment/';if(itemFrame.dataset.kind!==itemKind){itemFrame.src=path+'?mode=select'+(itemKind==='weapons'?'&use=weapons&category=武器':'');itemFrame.dataset.kind=itemKind;}itemLibrary.showModal();sendItems();}));
document.querySelector('#close-item-library')!.addEventListener('click',()=>itemLibrary.close());
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==itemFrame.contentWindow||!event.data||typeof event.data!=='object')return;
 if(event.data.type==='adnd1e-item-picker-ready')sendItems();
 if(event.data.type==='adnd1e-item-picker-cancel')itemLibrary.close();
 if(event.data.type==='adnd1e-items-selected'&&Array.isArray(event.data.ids)&&event.data.ids.every((id:unknown)=>typeof id==='string')){collect();if(itemKind==='weapons'){selectWeapons(card,event.data.ids,items);renderRows('weapons');}else{selectInventory(card,event.data.ids,itemKind,items);renderRows('gear');}update();modified();itemLibrary.close();}
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
document.querySelector('#print-character')!.addEventListener('click',()=>window.print());
applyCard(card);
try{refreshSaved();}catch(error){notify(error instanceof Error?error.message:'人物库无法读取，原记录已保留。');}
