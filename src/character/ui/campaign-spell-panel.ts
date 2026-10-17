import type {CampaignSheet} from '../application/campaign-sheet';
import type {PreparationFacts} from '../workflows/core-campaign-preparation';
import {spellRecoveryRestHours,spellRecoveryRule} from '../rules/core-spell-ledger';
import {formatCampaignMinute} from '../application/campaign-time';
const esc=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const need=(value:FormDataEntryValue|null)=>{if(value===null||String(value).trim()==='')throw new Error('请补充实际战役日期与时间。');return Number(value);};

export function renderCampaignSpells(sheet:CampaignSheet){
  const view=sheet.spells,ready=sheet.prepared.filter(c=>c.status==='ready'),spent=sheet.prepared.filter(c=>c.status!=='ready');
  return `<section id="sheet-spells" aria-labelledby="sheet-spells-title"><div class="section-title"><h2 id="sheet-spells-title">法术</h2>${view?`<div class="section-actions">${!view.isDivine?'<button data-operation="acquire-spell" class="secondary-action">记录新法术</button>':''}<button data-operation="prepare" ${!view.enabled?'disabled':''}>${view.isDivine?'祈祷与准备':'学习与记忆'}</button></div>`:''}</div>
    ${view?`<p class="muted">${esc(view.reason)}</p><div class="spell-capacity">${view.capacity.map(c=>`<span>${c.level}环 <strong>${c.ready} / ${c.maximum}</strong> 可用</span>`).join('')}</div>`:'<p>没有正式法术账本；不能从职业名称推断已有法术。</p>'}
    <ul class="rule-list">${ready.map(c=>`<li><div>${esc(c.name)}<small>${c.level}环 · 一份可用准备</small></div><button data-operation="cast" data-id="${esc(c.id)}">施放</button></li>`).join('')||'<li>当前没有可用的准备副本。</li>'}</ul>
    ${spent.length?`<details><summary>已消耗记录（${spent.length}份）</summary><ul class="plain-list">${spent.slice(-8).map(c=>`<li>${esc(c.name)} · ${c.level}环 · 已消耗</li>`).join('')}</ul><p>旧副本留在历史中；重新准备会生成新副本，不把施放记录抹掉。</p></details>`:''}
    ${view?`<details><summary>${view.isDivine?'本次可请求的神术与依据':'法术书与准备依据'}</summary><ul class="plain-list">${view.choices.map(c=>`<li>${esc(c.name)} · ${c.level}环</li>`).join('')}</ul>${view.isDivine?'<p>一级清单与档案中已有的公开法术定义可请求；更高环未完整结构化的清单不凭印象补齐。本次授予必须另行确认，历史授予不作永久通行证。</p>':'<p>只列现存书内条目，不把已理解但未取得的法术当成书内法术。实际可接触书本的条件仍须确认。</p>'}<p>DMG印刷40 / PDF41：按本次最高环完整休息，再每份每环15分钟学习／祈祷。PHB40说明书本、精神休息、营养及逐份消耗；容量不等于取得。</p><a href="/books/dmg/">查看 DMG 规则目录 →</a></details>`:''}</section>`;
}

/** The normal player path stays short. The Ctk audit is an expandable detail
 * because it is a real 1e fact, not a hidden modern “known spell” toggle. */
export function arcaneAcquisitionFields(sheet:CampaignSheet):string{
  const tradition=sheet.spells?.tradition??'magic-user';
  return `<p class="muted">只用于魔法师／幻术师。找到、借到或获得法术来源后，记录实际 Chance to Know 与转录结果；成功不会自动准备，也不会凭空扣费。</p>
    <fieldset><legend>法术定义</legend><label>法术定义 ID<input name="spell-definition-id" required placeholder="例如 adnd1e-core:magic-user:2:detect-invisibility"/></label><label>中文或原书名称<input name="spell-name" required placeholder="例如 Detect Invisibility"/></label><div class="input-pair"><label>法术环数<input name="spell-level" type="number" min="1" max="9" step="1" required/></label><label>法术列表<input name="spell-list" value="${tradition}" readonly/></label></div><label>规则来源 ID（可多个，用逗号分隔）<input name="spell-source-ids" required value="dmg:39:spell-acquisition"/></label></fieldset>
    <fieldset><legend>实际来源</legend><div class="input-pair"><label>来源类型<select name="source-kind"><option value="captured-spellbook">找到的法术书</option><option value="borrowed-spellbook">借阅的法术书</option><option value="scroll">卷轴</option><option value="level-advance-grant">升级取得</option><option value="research">研究所得</option><option value="other">其他来源</option></select></label><label>来源名称<input name="source-label" required placeholder="例如 伊斯塔的旧法术书"/></label></div><label>来源记录 ID<input name="source-id" required placeholder="source-2026-session-04"/></label><label>目标法术书 ID<input name="spellbook-id" required value="${tradition}-spellbook"/></label><label>本次转录记录 ID<input name="transcription-id" required placeholder="copy-2026-session-04"/></label><label>来源依据 ID<input name="source-evidence-id" required value="session:spell-source"/></label><label>来源事实备注<input name="source-provenance" required placeholder="团桌确认实际接触并可阅读该来源"/></label></fieldset>
    <details><summary>Chance to Know 记录（必须按实际骰点填写）</summary><p class="muted">每行一个法术定义 ID；骰点按实际检查顺序填写，格式为 <code>法术定义 ID=百分位</code>。系统会按当前智力和 PHB p.10 重放，不接受“已知”勾选代替骰史。</p><label>本组法术定义 ID（每行一个）<textarea name="ctk-spell-ids" rows="4" required></textarea></label><label>实际骰点（每行一条）<textarea name="ctk-rolls" rows="4" required placeholder="adnd1e-core:magic-user:2:detect-invisibility=37"></textarea></label></details>
    <fieldset><legend>转录结果</legend><div class="input-pair"><label>结果<select name="transcription-outcome"><option value="success">成功，写入法术书</option><option value="failure">失败，仅保留失败记录</option></select></label><label>当前智力<input name="ctk-intelligence" type="number" min="9" max="25" step="1" required value="${sheet.abilities.find(a=>a.label==='智力')?.adjusted??9}"/></label></div><p>DMG p.39 的成本、时长及失败来源处置若要写入，必须另有明确裁定；本简化入口不擅自推断。</p></fieldset>`;
}

export function readArcaneAcquisition(form:HTMLFormElement):Extract<import('../actions/campaign-actions').SheetAction,{type:'character.acquireArcaneSpell'}>{
  const data=new FormData(form),required=(name:string)=>{const value=String(data.get(name)??'').trim();if(!value)throw new Error(`请填写${name}。`);return value;};
  const spellIds=required('ctk-spell-ids').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),attempts=required('ctk-rolls').split(/\r?\n/).map(line=>{const [spellId,raw]=line.split('=').map(s=>s.trim());if(!spellId||!raw)throw new Error('Chance to Know 骰点须使用“法术定义 ID=百分位”格式。');return {spellId,percentile:Number(raw)};});
  const sourceIds=required('spell-source-ids').split(',').map(s=>s.trim()).filter(Boolean),spell={definitionId:required('spell-definition-id'),rulesetId:'adnd1e-core@1',listId:required('spell-list') as 'magic-user'|'illusionist',level:Number(data.get('spell-level')),displayName:required('spell-name'),sourceIds};
  return {type:'character.acquireArcaneSpell',spell,sourceEntityId:required('source-id'),sourceKind:required('source-kind') as 'master-grant'|'level-advance-grant'|'captured-spellbook'|'borrowed-spellbook'|'scroll'|'exchange'|'research'|'other',sourceLabel:required('source-label'),sourceProvenance:required('source-provenance'),sourceEvidenceId:required('source-evidence-id'),targetSpellbookId:required('spellbook-id'),transcriptionId:required('transcription-id'),knowability:{intelligence:Number(data.get('ctk-intelligence')),spellIds,attempts},outcome:required('transcription-outcome') as 'success'|'failure'};
}

export function gameTimeFields(prefix:string,minutesPerDay:number,label:string){
  return `<fieldset class="game-time-fields"><legend>${label}</legend><div class="input-pair"><label>战役第几天<input name="${prefix}Day" type="number" min="1" step="1" placeholder="例如 3" required/></label>${minutesPerDay===1440?`<label>战役时刻<input name="${prefix}Clock" type="time" required/></label>`:`<label>当日第几分钟（从0计）<input name="${prefix}Minute" type="number" min="0" max="${minutesPerDay-1}" step="1" required/></label>`}</div></fieldset>`;
}
export function readGameMinute(data:FormData,prefix:string,minutesPerDay:number){
  const day=need(data.get(`${prefix}Day`));let within:number;
  if(minutesPerDay===1440){const clock=String(data.get(`${prefix}Clock`)??'');if(!/^\d{2}:\d{2}$/.test(clock))throw new Error('请填写实际战役时刻。');const [h,m]=clock.split(':').map(Number);if(h>23||m>59)throw new Error('战役时刻超出当天。');within=h*60+m;}
  else within=need(data.get(`${prefix}Minute`));
  if(!Number.isSafeInteger(day)||day<1||!Number.isSafeInteger(within)||within<0||within>=minutesPerDay)throw new Error('战役日期或时刻不合法。');
  const result=(day-1)*minutesPerDay+within;if(!Number.isSafeInteger(result))throw new Error('战役日期超出精度范围。');return result;
}
export function preparationFields(sheet:CampaignSheet){
  const view=sheet.spells;if(!view?.enabled)throw new Error('请先确认人物生命、职业与法术账本。');
  const day=view.calendar?.minutesPerDay??1440;
  return `<p>只登记团桌已经完成的普通准备；不是等待现实时间，也不会恢复生命值。</p>
    <fieldset><legend>${view.isDivine?'本次请求并实际获授的法术':'本次从现存法术书学习的法术'}</legend><div class="preparation-choices">${view.choices.map((c,index)=>`<label><span>${esc(c.name)}<small>${c.level}环</small></span><input data-preparation-choice="${index}" name="copy${index}" aria-label="${esc(c.name)}准备份数" type="number" min="0" max="50" step="1" value="0"/></label>`).join('')}</div></fieldset>
    <p id="preparation-requirements" class="inline-note" aria-live="polite">选择需要的份数；未消耗的旧准备不会被覆盖。</p>
    ${!view.calendar?'<label class="check-row"><input name="calendarConfirmed" type="checkbox" required/>本战役已明确采用24小时一天、7天一周；本次建立该日历，不是系统默认规则</label>':''}
    ${view.latestCourse?`<label class="check-row"><input name="reuseRest" type="checkbox"/>继续上次完整休息后的学习（其后没有施法）：${formatCampaignMinute(view.latestCourse.restStartMinute,day)}至${formatCampaignMinute(view.latestCourse.restEndMinute,day)}，接续学习于${formatCampaignMinute(view.latestCourse.studyEndMinute,day)}</label>`:''}
    <div id="preparation-new-rest">${gameTimeFields('rest',day,'完整休息开始时间')}<label>实际完整休息时数<input name="restHours" type="number" min="0" step="any" placeholder="例如 4" required/></label></div>
    <label>实际连续学习／祈祷分钟数<input name="studyMinutes" type="number" min="1" step="1" placeholder="例如 15" required/></label>
    <label>实际休息与学习地点<input name="location" maxlength="300" required placeholder="例如 村庄旅店" value="${esc(view.latestCourse?.locationId??'')}"/></label>
    <p>此普通流程记录休息结束后立即学习；继续上次休息时接续上一段学习。中断、换地点或其他时间安排须由团桌核对，不能勾选后猜成兼容。</p>
    <label class="check-row"><input name="restConfirmed" type="checkbox" required/>上述确为完整休息、精神恢复且营养条件满足，时间及地点均是实际情况</label>
    <label class="check-row"><input name="afterCastingConfirmed" type="checkbox" required/>本次完整休息在最后一次施法之后，其后没有未记录的施法或干扰</label>
    <label class="check-row"><input name="accessConfirmed" type="checkbox" required/>${view.isDivine?'本次所选法术与份数已经按战役确认实际授予；本地勾选不是身份认证':'学习时可实际接触对应法术书；已处理本次所需条件'}</label>`;
}
export function bindPreparationFields(form:HTMLFormElement,sheet:CampaignSheet){
  const view=sheet.spells!;
  const update=()=>{
    const selected=view.choices.map((choice,i)=>({...choice,quantity:Number((form.elements.namedItem(`copy${i}`) as HTMLInputElement).value)})).filter(c=>c.quantity>0),summary=form.querySelector<HTMLElement>('#preparation-requirements')!;
    if(!selected.length){summary.textContent='选择至少一份法术；不会自动填满。';return;}
    const highest=Math.max(...selected.map(c=>c.level)),hours=spellRecoveryRestHours.find(r=>highest>=r.minimumLevel&&highest<=r.maximumLevel)?.hours;
    const minutes=selected.reduce((n,c)=>n+c.quantity*c.level*spellRecoveryRule.studyOrPrayerMinutesPerSpellLevel,0);
    summary.textContent=`本次${selected.reduce((n,c)=>n+c.quantity,0)}份：至少完整休息${hours??'待核'}小时，再学习／祈祷${minutes}分钟。`;
    for(const row of view.capacity){const requested=selected.filter(c=>c.level===row.level).reduce((n,c)=>n+c.quantity,0);if(row.ready+requested>row.maximum)summary.textContent+=` 第${row.level}环超出容量（已有${row.ready}份，上限${row.maximum}份）。`;}
  };
  form.querySelectorAll<HTMLInputElement>('[data-preparation-choice]').forEach(input=>input.addEventListener('input',update));
  form.querySelector<HTMLInputElement>('[name=reuseRest]')?.addEventListener('change',e=>{const checked=(e.target as HTMLInputElement).checked;form.querySelector<HTMLElement>('#preparation-new-rest')!.hidden=checked;form.querySelectorAll<HTMLInputElement>('#preparation-new-rest input').forEach(i=>i.disabled=checked);});
}
export function readPreparationFacts(form:HTMLFormElement,sheet:CampaignSheet):PreparationFacts{
  const view=sheet.spells!,data=new FormData(form),day=view.calendar?.minutesPerDay??1440;
  for(const name of ['restConfirmed','afterCastingConfirmed','accessConfirmed'])if(data.get(name)!=='on')throw new Error('请先核对实际休息、施法先后与本次学习／授予条件。');
  if(!view.calendar&&data.get('calendarConfirmed')!=='on')throw new Error('先明确战役日历，不能由工具默认。');
  const reuse=data.get('reuseRest')==='on',prior=reuse?view.latestCourse:null;
  if(reuse&&!prior)throw new Error('上次休息已不能直接接续，请重新核对。');
  const restStartMinute=prior?.restStartMinute??readGameMinute(data,'rest',day),restMinutes=prior?prior.restEndMinute-prior.restStartMinute:need(data.get('restHours'))*60;
  if(!Number.isSafeInteger(restMinutes)||restMinutes<0)throw new Error('实际休息时数必须能精确转换为整分钟。');
  const restEndMinute=restStartMinute+restMinutes,studyStartMinute=prior?.studyEndMinute??restEndMinute,studyEndMinute=studyStartMinute+need(data.get('studyMinutes'));
  return {choices:view.choices.flatMap((c,i)=>{const quantity=need(data.get(`copy${i}`));return quantity?[{kind:c.kind,id:c.id,quantity}]:[];}),restStartMinute,restEndMinute,studyStartMinute,studyEndMinute,locationId:String(data.get('location')??'').trim(),completeRestAndNourishmentConfirmed:true,bookAccessOrDivineGrantConfirmed:true,restAfterLatestCastingConfirmed:true,lastCastingId:view.latestCastingId,...view.calendar?{}:{initializeCalendar:{minutesPerDay:1440,daysPerWeek:7,confirmed:true}}};
}
