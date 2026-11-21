// @ts-nocheck -- standalone browser module; input JSON is checked at the boundary.
export {};
const permanent=document.documentElement.dataset.style==='permanent';
const style=permanent?'permanent':'ref2';
const assetBase=permanent?'../ref2/':'./';
const STORE=`adnd1e-${style}-facsimile.v1`, TRANSFER='adnd1e-ref2-print-record';
const $=s=>document.querySelector(s), pt=v=>`${v*25.4/72}mm`;
const spec=await fetch('fields.json').then(r=>{if(!r.ok)throw Error('版面数据载入失败');return r.json()});
const params=new URLSearchParams(location.search), spellsOnly=params.get('spells')==='only';let source=null,values={},unmapped=[],persistent=true;
try{if(params.get('from')==='character'){source=JSON.parse(sessionStorage.getItem(TRANSFER)||'null');persistent=false;}else values=JSON.parse(localStorage.getItem(STORE)||'{}');}catch{$('#status').textContent='已有填写数据无法读取，未覆盖原数据。';persistent=false;}
function migrateUnarmed(values){
 for(let line=0;line<4;line++){
  const key=`p3.unarmed.${line}`;
  const old=values[key+'.hit_damage'];
  if(typeof old!=='string')continue;
  const [hit,...damage]=old.split(/[/／]/);
  values[key+'.hit']??=hit.trim();
  values[key+'.damage_adj']??=damage.join('/').trim();
  delete values[key+'.hit_damage'];
 }
}
function migrateFields(values){
 if(!permanent){migrateUnarmed(values);return;}
 if(typeof values['p1.line028']==='string'){
  const [attack,...defense]=values['p1.line028'].split(/[/／]/);
  values['p1.psionic_attack']??=attack.trim();
  values['p1.psionic_defense']??=defense.join('/').trim();
  delete values['p1.line028'];
 }
 if(typeof values['p1.line070']==='string'){
  if(!values['p1.hit_die'])values['p1.hit_die']=values['p1.line070'];
  delete values['p1.line070'];
 }
}
migrateFields(values);
function translatedValue(key){
 const fields=source?.fields||{},rows=source?.rows||{};
 if(permanent){
  if(key==='vision')return fields.senses||'';
  if(key==='detection')return fields.detections||'';
  if(key==='STR'&&fields.STR==='18'&&fields.exceptional_strength)return `18/${fields.exceptional_strength}`;
  const relation=/^relations\.(\d+)\.(\w+)$/.exec(key);
  if(relation){
   const [,index,column]=relation;
   const row=[...(rows.family||[]),...(rows.henchmen||[])].filter(r=>r.values.name)[Number(index)]?.values;
   if(!row)return '';
   if(column==='number')return String(Number(index)+1);
   return row[column]||(column==='relationship'?row.reaction:column==='class'?row.profession||row.raceClass:'')||'';
  }
 }
 if(key.startsWith('derived.')){const [,r,c]=key.split('.');const col=Number(r)===3?[0,0,1][Number(c)]:Number(c);return source.derived?.[Number(r)]?.[col]||'';}
 const row=key.match(/^(weapons|unarmed|gear|family|henchmen|proficiencies)\.(\d+)\.(.+)$/);
 if(row){const [,group,index,column]=row,v=rows[group]?.[Number(index)]?.values||{};
  if(permanent&&group==='weapons'&&column==='damage')return [v.sm,v.large].filter(Boolean).join(' / ');
  if(permanent&&group==='weapons'&&column==='magic')return v.magical||'';
  if(column==='hit_damage')return [v.hit,v.damage_adj].filter(Boolean).join(' / ');
  if(column==='damage'&&group==='weapons')return [v.sm,v.large].filter(Boolean).join(' / ');
  if(column==='item'&&v.quantity&&v.quantity!=='1')return `${v.item||''} ×${v.quantity}`;
  return v[column]||'';
 }
 if(key.startsWith('ammunition_')&&!key.includes('notes')){
  const i=Number(key.slice(11));return source.ammunitionBoxes?.[i]||false;
 }
 if(key==='STR'&&fields.exceptional_strength&&String(fields.STR)==='18')return `18/${fields.exceptional_strength}`;
 if(key==='hp_max'&&fields.hp_current)return `${fields.hp_current} / ${fields.hp_max||''}`;
 const line=key.match(/^(.*)_line(\d+)(?:_part(\d+))?$/);
 if(line){const [,base,n,part]=line;let text=String(fields[base]||'');
  if(base==='coins')text=['gp','sp','cp','ep','pp','dl_steel'].filter(k=>Number(fields[`coins_${k}`])).map(k=>`${fields[`coins_${k}`]} ${k}`).join('；');
  if(base==='gems')text=(rows.valuables||[]).map(r=>[r.values.name,r.values.quantity,r.values.worth].filter(Boolean).join(' ')).join('\n');
  return text.split(/\r?\n/)[Number(n)+(part?Number(part):0)]||'';
 }
 return fields[key]??'';
}
const all=spec.flat();if(source)for(const f of all)values[f.id]=translatedValue(f.bind);
function updateMovement(raw){
 const match=/^\s*(\d+(?:\.\d+)?)\s*(["″]?)\s*$/.exec(raw);
 for(const field of all.filter(f=>f.movementFactor!==undefined)){
  const value=match?String(Math.round(Number(match[1])*field.movementFactor*100)/100)+match[2]:'';
  values[field.id]=value;
  document.getElementById(field.id).value=value;
 }
}
for(let page=0;page<spec.length;page++){
 const pageNumber=page+(permanent?1:3);
 const sheet=document.createElement('section');sheet.className='sheet';sheet.dataset.page=String(pageNumber);sheet.setAttribute('aria-label',page?'人物表背面':'人物表正面');
 // Inline vectors avoid Chromium rounding an external SVG image's intrinsic
 // viewport to whole pixels before printing. Namespaced clips remain page-local.
 const vector=await fetch(`p${pageNumber}.svg`).then(r=>r.text());
 const art=new DOMParser().parseFromString(vector,'image/svg+xml').documentElement;
 art.setAttribute('class','art');art.setAttribute('aria-hidden','true');
 for(const node of art.querySelectorAll('[id]'))node.id=`p${pageNumber}-${node.id}`;
 for(const node of art.querySelectorAll('[clip-path]'))node.setAttribute('clip-path',node.getAttribute('clip-path').replace('url(#',`url(#p${pageNumber}-`));
 sheet.append(document.importNode(art,true));
 for(const f of spec[page]){
  const control=document.createElement(f.rect[3]-f.rect[1]>25?'textarea':'input');
  if(control instanceof HTMLInputElement)control.type=f.type==='checkbox'?'checkbox':'text';
  control.id=f.id;control.name=f.id;control.className='field';control.dataset.bind=f.bind;control.setAttribute('aria-label',f.label);control.title=f.label;control.autocomplete='off';control.spellcheck=false;
  const [x,y,right,bottom]=f.rect;Object.assign(control.style,{left:pt(x),top:pt(y),width:pt(right-x),height:pt(bottom-y),fontSize:`${f.fontSize}pt`,textAlign:f.textAlign||'left'});
  if(f.type==='checkbox')control.checked=values[f.id]===true;else control.value=String(values[f.id]??'');
  control.addEventListener('input',()=>{
   values[f.id]=f.type==='checkbox'?control.checked:control.value;
   if(f.id==='p3.move_base')updateMovement(control.value);
   // The name on the back mirrors the front; no geometric reflow.
   if(f.bind==='name')for(const peer of document.querySelectorAll('[data-bind="name"]'))if(peer!==control){peer.value=control.value;values[peer.id]=control.value;}
   try{if(persistent)localStorage.setItem(STORE,JSON.stringify(values));$('#status').textContent=persistent?'填写已自动保存于此浏览器。':'自动卡打印副本已修改；点击“保存填写”可单独保存。';}catch{$('#status').textContent='浏览器保存失败，请导出数据备份。';}
   check();
  });sheet.append(control);
 }$('#sheets').append(sheet);
}
const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
function check(){
 const warnings=[...unmapped];
 for(const f of all){const c=document.getElementById(f.id);if(f.type==='checkbox')continue;ctx.font=`${f.fontSize*96/72}px Ref2Entry`;const width=(f.rect[2]-f.rect[0]-.8)*96/72;let fontSize=f.fontSize;
 if(f.fitScore){const measured=ctx.measureText(c.value).width;if(measured>width)fontSize=Math.max(3,Math.floor(fontSize*width/measured*10)/10);c.style.fontSize=pt(fontSize);c.dataset.printFontSize=fontSize;ctx.font=fontSize*96/72+'px Ref2Entry';}
 const lines=c.value.split(/\r?\n/);const rows=Math.max(1,Math.floor((f.rect[3]-f.rect[1])/(f.fontSize*1.1)));const over=lines.some(t=>ctx.measureText(t).width>width+.5)||lines.length>rows;c.dataset.overflow=String(over);if(over)warnings.push(`${f.label}（${f.id}）：内容超出原表填写范围，请精简或另附记录。`);}
 $('#warnings').replaceChildren(...warnings.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));$('#overflow').hidden=!warnings.length;$('#overflow').open=!!warnings.length;return warnings;
}
if(source&&!permanent){
 const capacities={weapons:6,unarmed:4,gear:30,family:12,henchmen:3,proficiencies:22};
 for(const [key,limit] of Object.entries(capacities)){const rows=source.rows?.[key]||[];if(rows.slice(limit).some(r=>Object.values(r.values||{}).some(v=>String(v).trim())))unmapped.push(`${key} 超过原表 ${limit} 行，超出部分仍保存在自动人物卡中，未压缩排入。`);}
 const supported=new Set(all.map(f=>f.bind.replace(/_line\d+(?:_part\d+)?$/,'')));
 // Surface notes and newer fields that have no original cell instead of silently dropping them.
 const notes=['family_notes','henchmen','height_weight','hair_eyes','treasure_valuables','proficiencies','hp_current','move_loaded'];
 for(const key of notes)if(source.fields?.[key]&&!supported.has(key)&&key!=='hp_current'&&!(key==='move_loaded'&&source.fields.move_loaded===source.fields.move_base))unmapped.push(`${key} 无对应原版栏目，请另存附页；原始数据未改动。`);

}
await document.fonts.load('9pt Ref2Entry','人物卡 ABC').catch(()=>{});await document.fonts.ready;await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;})));
if(source&&permanent){
 const possessions=all.filter(f=>f.id.startsWith('p3.line')&&f.rect[1]<240);
 const entries=(source.rows?.gear||[]).map(r=>r.values).filter(v=>v.item).map(v=>[v.item,v.quantity&&v.quantity!=='1'?`×${v.quantity}`:'',v.location].filter(Boolean).join(' · '));
 const events=all.filter(f=>f.id.startsWith('p4.line')&&f.rect[1]<580&&f.rect[2]-f.rect[0]>300);
 const notes=String(source.fields?.noteworthy_events||'').split(/\r?\n/).filter(Boolean);
 for(const [destinations,items,label] of [[possessions,entries,'物品'],[events,notes,'事件']]){
  for(let i=0;i<Math.min(destinations.length,items.length);i++){
   const id=destinations[i].id;values[id]=items[i];document.getElementById(id).value=items[i];
  }
  if(items.length>destinations.length)unmapped.push(`${label}超出原表行数，其余保留在自动人物卡。`);
 }
}
// Flow notes only through the original pre-existing writing rules. This changes
// neither their number nor their geometry, and retains overflow explicitly.
if(source){
 for(const base of ['reactionHonor','resistances','senses','detections','languages','move_special','special_attacks','ammunition_notes','magic_items','special_abilities','personality','history','noteworthy_events','coins','gems']){
  const targets=all.filter(f=>f.bind===base||f.bind.startsWith(base+'_line')).sort((a,b)=>a.rect[1]-b.rect[1]||a.rect[0]-b.rect[0]);if(!targets.length)continue;
  let text=String(source.fields?.[base]||'');
  if(base==='coins')text=['gp','sp','cp','ep','pp','dl_steel'].filter(k=>Number(source.fields?.[`coins_${k}`])).map(k=>`${source.fields[`coins_${k}`]} ${k}`).join('；');
  if(base==='gems')text=(source.rows?.valuables||[]).map(r=>[r.values.name,r.values.quantity,r.values.worth].filter(Boolean).join(' ')).join('\n');
  let remaining=[...text];
  for(const f of targets){ctx.font=`${f.fontSize*96/72}px Ref2Entry`;const width=(f.rect[2]-f.rect[0]-.8)*96/72;let line='';while(remaining.length){const ch=remaining[0];if(ch==='\n'){remaining.shift();break;}if(ctx.measureText(line+ch).width>width+.1)break;line+=remaining.shift();}values[f.id]=line;document.getElementById(f.id).value=line;}
  if(remaining.length)unmapped.push(`${base} 超过原表的 ${targets.length} 条填写横线，末尾内容请另附记录：${remaining.join('')}`);
 }
}
const spells=source?.preparedSpells??[];
const notes=source?.spellFields?.spellbook_notes??'';
if(spellsOnly||(spells.length||notes)){
 const sheets=$('#sheets'), appendix=document.createElement('section');
 appendix.className='spell-appendix';
 const add=(parent,tag,value)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 add(appendix,'h2','准备法术 · 补充记录');
 add(appendix,'p',String(source?.fields?.name??''));
 const slots=Array.from({length:10},(_,i)=>[i,source?.spellFields?.['spell_slots_'+i]]).filter(([,v])=>v!==undefined&&v!=='');
 if(slots.length)add(appendix,'p',slots.map(([i,v])=>(i?i+' 环':'小法术')+' '+v).join('　'));
 for(const spell of spells){
  const entry=document.createElement('article');appendix.append(entry);
  add(entry,'h3',spell.name);
  add(entry,'p',spell.rules);
  add(entry,'p','准备 '+spell.counts[0]+'　已用 '+spell.counts[1]+'　剩余 '+(Number(spell.counts[0])-Number(spell.counts[1]))).className='spell-entry-values';
  if(spell.source)add(entry,'p',spell.source);
 }
 if(!spells.length)add(appendix,'p','暂无准备法术。');
 if(notes){add(appendix,'h3','法术书／祈祷记录');add(appendix,'p',notes).className='spell-entry-values';}
 sheets.append(appendix);
 if(spellsOnly){
  for(const sheet of sheets.querySelectorAll('.sheet'))sheet.hidden=true;
  for(const id of ['download-pdf','save','blank','export','import'])if($('#'+id))$('#'+id).disabled=true;
 }
}
check();document.documentElement.dataset.ready='true';$('#status').textContent=source?'已载入自动人物卡计算结果；原版固定尺寸未缩放。':'已载入两页原版固定尺寸，可直接填写。';
$('#save').onclick=()=>{try{localStorage.setItem(STORE,JSON.stringify(values));persistent=true;$('#status').textContent='已保存此份复刻表填写数据。';}catch{$('#status').textContent='保存失败，请导出数据备份。';}};
$('#print').onclick=()=>{if(!spellsOnly&&check().length){$('#status').textContent='请先处理填写范围检查，避免打印时遗漏内容。';return;}window.print();};
$('#download-pdf').onclick=async()=>{
 if(check().length){$('#status').textContent='请先处理填写范围检查，避免 PDF 遗漏内容。';return;}
 const button=$('#download-pdf');button.disabled=true;$('#status').textContent='正在生成精确 A4 可填写 PDF，首次需载入中文字体……';
 try{
  const script=(file,key)=>window[key]?Promise.resolve(window[key]):new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=file;el.onload=()=>window[key]?resolve(window[key]):reject(Error('PDF 组件初始化失败'));el.onerror=()=>reject(Error('PDF 组件载入失败'));document.head.append(el);});
  const [{PDFDocument},fontkit,template,fontBytes]=await Promise.all([script(assetBase+'pdf-lib.min.js','PDFLib'),script(assetBase+'fontkit.umd.min.js','fontkit'),fetch(`${style}-fillable.pdf`).then(r=>{if(!r.ok)throw Error('PDF 模板载入失败');return r.arrayBuffer();}),fetch(assetBase+'ref2-entry.ttf').then(r=>{if(!r.ok)throw Error('中文字体载入失败');return r.arrayBuffer();})]);
  const pdf=await PDFDocument.load(template);pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:false}),form=pdf.getForm();
  for(const f of all){if(f.type==='checkbox'){const field=form.getCheckBox(f.id);if(document.getElementById(f.id).checked)field.check();else field.uncheck();}else{const field=form.getTextField(f.id);field.setText(document.getElementById(f.id).value);field.setFontSize(Number(document.getElementById(f.id).dataset.printFontSize||f.fontSize));}}
  form.updateFieldAppearances(font);const data=await pdf.save({updateFieldAppearances:false}),url=URL.createObjectURL(new Blob([data],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=style+'-中文人物表-已填写.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#status').textContent='已生成精确 A4 PDF；填写数据和可编辑字段均已保留。';
 }catch(error){$('#status').textContent=`PDF 生成失败：${error.message}。填写内容仍在，可导出数据备份。`;}
 finally{button.disabled=false;}
};
$('#zoom').onchange=e=>$('#sheets').style.setProperty('--preview',e.target.value);
$('#blank').onclick=()=>window.open('./?blank=1','_blank');
if(params.has('blank')){for(const f of all){values[f.id]=f.type==='checkbox'?false:'';const c=document.getElementById(f.id);if(f.type==='checkbox')c.checked=false;else c.value='';}persistent=false;check();}
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({format:`adnd1e-${style}-facsimile`,version:1,values},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=style+'-人物表填写.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;const data=JSON.parse(await file.text());if(data.format!==`adnd1e-${style}-facsimile`||data.version!==1||!data.values||typeof data.values!=='object'||Array.isArray(data.values))throw Error('文件格式不符');migrateFields(data.values);for(const f of all)if(f.id in data.values&&!(typeof data.values[f.id]==='string'||typeof data.values[f.id]==='boolean'))throw Error('字段值格式不符');for(const f of all){values[f.id]=data.values[f.id]??'';const c=document.getElementById(f.id);if(f.type==='checkbox')c.checked=values[f.id]===true;else c.value=String(values[f.id]);}unmapped=[];source=null;persistent=false;check();$('#status').textContent='导入完成；检查后可保存。';}catch(err){$('#status').textContent=`导入失败：${err.message}。现有填写未改动。`;}};
window.ref2Facsimile={spec,check,values};
if(params.get('mode')==='print')$('#print').click();
