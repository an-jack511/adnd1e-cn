import { abilities, methodLabels, type Draft, type Method } from './model';
import { assign, generate, newDraft, totals, parseDraft } from './engine';
import { exportText, importText, readLibrary, saveDraftLocked, storageKey } from './storage';
import { withBatch } from './engine';

const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
export function startCreation() {
  let draft: Draft=newDraft(); let dirty=false; let savedRevision: number|null=null;
  const status=get('creation-status');
  const name=get<HTMLInputElement>('draft-name');
  const method=get<HTMLSelectElement>('generation-method');
  const list=get<HTMLSelectElement>('draft-library');
  const chooser=get('assignment-choices');
  let pending: string[]|null=null;let editingSession=0;
  chooser.addEventListener('change',()=>{pending=Array.from(chooser.querySelectorAll<HTMLSelectElement>('select')).map(s=>s.value);message('分配选择尚未检查。请先点击“检查并确认分配”，再保存或导出。');});
  function message(text:string,error=false){ status.textContent=text; status.dataset.error=String(error); }
  function library(){
    try {
      const drafts=readLibrary(localStorage);
      list.replaceChildren(new Option('选择浏览器中的草稿',''),...drafts.map(d=>new Option(`${d.name||'未命名草稿'} · 修订 ${d.revision}`,d.id)));
      list.value=draft.id;
    } catch(e){ message((e as Error).message,true); }
  }
  function guard(){return (!dirty&&!pending)||window.confirm('当前草稿或分配选择尚未保存。确认切换？可先取消并确认分配、导出文件。');}
  function render(){
    name.value=draft.name;
    method.value=draft.profile.abilityMethod;
    get('draft-revision').textContent=`修订 ${draft.revision} · ${dirty?'本页有未保存修改':'浏览器保存状态见下方'}；创建草稿，不是完整角色。`;
    get('current-method').textContent=draft.activeBatch?methodLabels[draft.activeBatch.method]:'尚未生成属性';
    const table=get('candidate-body');table.replaceChildren();chooser.replaceChildren();
    const batch=draft.activeBatch;
    const scores=get('ability-results');scores.replaceChildren();
    for(const a of abilities){const cell=document.createElement('div');const label=document.createElement('strong');label.textContent=a;cell.append(label,document.createTextNode(` ${draft.scores?.[a]??'待确认'}`));scores.append(cell);}
    get('history-count').textContent=`保留 ${draft.history.length} 次旧生成批次，${draft.audit.length} 条操作记录；导出包含全部骰点。`;
    get<HTMLButtonElement>('confirm-assignments').disabled=!batch||batch.method==='DMG:III';
    if(!batch)return;
    const values=totals(batch);
    batch.candidates.forEach((dice,i)=>{
      const row=document.createElement('tr');
      const tag=batch.method==='DMG:III'?`${abilities[Math.floor(i/6)]} · 第${i%6+1}次`:batch.method==='DMG:IV'?`人物组${Math.floor(i/6)+1} · ${abilities[i%6]}`:`骰组${i+1}`;
      for(const text of [tag,dice.join(' + '),String(values[i]),draft.choices?.includes(i)?'已采用':'']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}table.append(row);
    });
    if(batch.method==='DMG:III'){chooser.textContent='各属性六次中的最高值已按规则保留，无需自行分配。';return;}
    if(batch.method==='DMG:IV'){
      const label=document.createElement('label');label.textContent='选择一个完整人物组 ';
      const select=document.createElement('select');select.id='complete-set';select.append(new Option('请选择',''));
      for(let g=0;g<12;g++)select.append(new Option(`人物组${g+1}：${values.slice(g*6,g*6+6).join(' / ')}`,String(g)));
      select.value=pending?.[0]??(draft.choices?String(Math.floor(draft.choices[0]/6)):'');label.append(select);chooser.append(label);return;
    }
    const cutoff=batch.method==='DMG:II'?[...values].sort((a,b)=>b-a)[5]:0;
    for(let a=0;a<6;a++){
      const label=document.createElement('label');label.textContent=abilities[a]+' ';
      const select=document.createElement('select');select.dataset.ability=abilities[a];select.append(new Option('请选择',''));
      values.forEach((v,i)=>{if(v>=cutoff)select.append(new Option(`骰组${i+1} · ${v}`,String(i)));});
      select.value=pending?.[a]??(draft.choices?String(draft.choices[a]):'');label.append(select);chooser.append(label);
    }
  }
  get('generate-abilities').addEventListener('click',()=>{
    if(!get<HTMLInputElement>('method-approved').checked){message('请先与 DM 确定允许的属性生成方法，并确认下方选项。',true);return;}
    if(draft.activeBatch&&!window.confirm('重新生成将保留当前骰组和分配为历史，并记录一次新生成。确认本次重掷？'))return;
    try{draft=withBatch(draft,generate(method.value as Method));pending=null;dirty=true;render();message('已生成完整骰池。I / II 请逐项分配，IV 请选择一整组；原骰均已记录。');}catch(e){message((e as Error).message,true);}
  });
  get('confirm-assignments').addEventListener('click',()=>{
    try{
      const choices=draft.activeBatch?.method==='DMG:IV'
        ?(()=>{const value=get<HTMLSelectElement>('complete-set').value;if(value==='')throw new Error('请选择完整人物组。');return abilities.map((_,a)=>Number(value)*6+a);})()
        :Array.from(chooser.querySelectorAll<HTMLSelectElement>('select')).map(s=>{if(s.value==='')throw new Error('请为六项属性全部选择骰组。');return Number(s.value);});
      draft=assign(draft,choices);pending=null;dirty=true;render();message('属性分配已通过本方法检查。种族、职业及完整角色条件尚未处理。');
    }catch(e){message((e as Error).message,true);}
  });
  name.addEventListener('input',()=>{try{draft=parseDraft({...draft,name:name.value,revision:draft.revision+1,audit:[...draft.audit,{at:new Date().toISOString(),action:'named',batchId:draft.activeBatch?.id??null}]});dirty=true;get('draft-revision').textContent=`修订 ${draft.revision} · 本页有未保存修改；创建草稿，不是完整角色。`;}catch(e){name.value=draft.name;message('姓名未改变：'+(e as Error).message,true);}});
  method.addEventListener('change',()=>{get<HTMLInputElement>('method-approved').checked=false;message('已改变待采用方法。已有骰组仍按其原方法保存；重新生成前请确认本次选择。');});
  get('save-draft').addEventListener('click',async()=>{
    if(pending){message('分配选择尚未确认，请先检查分配；当前选择仍保留。',true);return;}
    const saving=draft;const savingSession=editingSession;
    try{
      await saveDraftLocked(localStorage,saving,savedRevision,navigator.locks);
      if(editingSession!==savingSession){library();message('此前编辑会话已保存；当前会话未改变。若重新加载过旧版，保存时将检查冲突。');return;}
      savedRevision=saving.revision;if(draft.revision===saving.revision)dirty=false;
      render();library();message(pending?'已保存此前确认版本；当前暂选仍待检查。':dirty?'较早修订已保存；本页还有新修改，请再次保存。':'已保存到此浏览器。独立备份请导出文件。');
    }catch(e){message((e as Error).message,true);}
  });
  get('load-draft').addEventListener('click',()=>{if(!guard())return;try{const found=readLibrary(localStorage).find(d=>d.id===list.value);if(!found)throw new Error('请选择一个已保存草稿。');editingSession++;draft=found;pending=null;savedRevision=draft.revision;dirty=false;get<HTMLInputElement>('method-approved').checked=false;render();message('已加载浏览器草稿。');}catch(e){message((e as Error).message,true);}});
  get('new-draft').addEventListener('click',()=>{if(!guard())return;editingSession++;draft=newDraft();pending=null;savedRevision=null;dirty=false;render();library();get<HTMLInputElement>('method-approved').checked=false;message('已新建空白属性创建草稿。');});
  get('export-draft').addEventListener('click',()=>{
    if(pending){message('分配选择尚未确认，请先检查分配再导出；当前选择仍保留。',true);return;}
    try{const blob=new Blob([exportText(draft)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=(draft.name||'adnd1e-creation').replace(/[\\/:*?"<>|]/g,'_')+'.adnd1e-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message('已请求下载创建草稿文件；请确认文件实际保存到本地。');}catch(e){message((e as Error).message,true);}
  });
  get<HTMLInputElement>('import-draft').addEventListener('change',async(event)=>{
    const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>1024*1024)throw new Error('草稿文件超过 1 MB 限制。');
      const staged=importText(await file.text());
      if(!window.confirm(`导入“${staged.name||'未命名草稿'}”作为新副本？已验证骰组和属性；当前未保存修改将被切换。浏览器原件不会覆盖。`))return;
      editingSession++;draft=staged;pending=null;savedRevision=null;dirty=true;render();library();get<HTMLInputElement>('method-approved').checked=false;message('已隔离导入为新副本，尚未保存到此浏览器。');
    }catch(e){message('导入未改变当前草稿：'+(e as Error).message,true);}finally{input.value='';}
  });
  window.addEventListener('beforeunload',event=>{if(dirty||pending){event.preventDefault();event.returnValue='';}});
  window.addEventListener('storage',event=>{if(event.key===storageKey){library();message('浏览器草稿库在另一页面发生变化。保存前会检查版本冲突。');}});
  render();library();
}
