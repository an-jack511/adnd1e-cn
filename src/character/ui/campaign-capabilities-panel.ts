import type { CampaignSheet } from '../application/campaign-sheet';
import type { CapabilityAtLevel } from '../engine/core-class-capabilities';
import { resolveDisplayRuleSource } from '../rules/source-directory';
import { characterLabel } from './character-labels';

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));

function sourceLinks(ids: readonly string[]) {
  return ids.map(id => {
    const source = resolveDisplayRuleSource(id);
    if (!source) return '<span class="source-missing">原书来源待补充</span>';
    return `<a href="${esc(source.directoryUrl)}">${esc(source.book)} 原书 p.${source.printedPages.join('、')}</a>`;
  }).join(' · ');
}

function valueText(capability: CapabilityAtLevel) {
  if (!capability.value) return '';
  const value = capability.value.kind === 'dice'
    ? capability.value.dice
    : capability.value.kind === 'percent'
      ? `${capability.value.value}%`
      : `${capability.value.value}`;
  return ` · ${esc(capability.value.label)}：${esc(value)}`;
}

function capabilityRow(capability: CapabilityAtLevel, locked = false) {
  const status = capability.status === 'verified' ? '已核验' : capability.status === 'needs-dm' ? '待补充' : '未接入';
  return `<li class="capability-row ${locked ? 'is-locked' : ''}">
    <div><strong>${esc(capability.label)}</strong><small>${locked ? `${capability.minimumLevel}级后开放 · ` : ''}${esc(status)}${valueText(capability)}</small></div>
    <details><summary>规则说明与依据</summary><p>${esc(capability.rule)}</p><p class="source-line">${sourceLinks(capability.sourceIds)}</p>${capability.delegatedTo ? `<p class="muted">具体分表：${esc(capability.delegatedTo)}。本页不替团桌决定世界状态。</p>` : ''}</details>
  </li>`;
}

function renderThiefFunctions(sheet: CampaignSheet) {
  if (!sheet.thiefFunctions || !sheet.backstab) return '';
  return `<section class="thief-functions" aria-labelledby="thief-functions-heading"><div class="section-title"><h3 id="thief-functions-heading">盗贼技能目标</h3><span class="muted">当前等级的百分比</span></div>
    <p class="muted">PHB 盗贼表与敏捷／种族调整后的目标值。玩家看目标百分比；实际掷骰、目标修正、暗骰与是否有机会尝试仍由 DM 判断。</p>
    <table class="ability-facts"><thead><tr><th scope="col">能力</th><th scope="col">基础</th><th scope="col">敏捷</th><th scope="col">种族</th><th scope="col">目标</th></tr></thead><tbody>${sheet.thiefFunctions.map(skill=>`<tr><th>${esc(skill.label)}</th><td>${skill.base===null?'—':esc(skill.base+'%')}</td><td>${skill.dexterityAdjustment?esc((skill.dexterityAdjustment>0?'+':'')+skill.dexterityAdjustment+'%'):'0%'}</td><td>${skill.racialAdjustment?esc((skill.racialAdjustment>0?'+':'')+skill.racialAdjustment+'%'):'0%'}</td><td>${skill.target===null?'—':`<strong>${esc(skill.target+'%')}</strong>`}</td></tr>`).join('')}</tbody></table>
    <p class="inline-note">背后偷袭：命中骰 +4，伤害为 ${sheet.backstab.multiplier} 倍（具体目标、位置与是否可偷袭由 DM 裁定）。</p>
    <details><summary>查看盗贼技能操作边界</summary><ul><li>开锁、发现／拆除陷阱：同一等级对同一目标通常只能尝试一次；升级后才可重试。</li><li>无声移动、藏于阴影：失败与观察者、光线、红外视觉等情境由 DM 处理。</li><li>聆听声响：一次完整近战轮；成功只说明门后有某人或某物。</li><li>${sheet.career==='武僧'?'武僧不获得扒窃；其余列按同级盗贼处理。':sheet.career==='刺客'?'刺客的盗贼技能按刺客等级低两级处理，1–2级尚无对应等级。':'盗贼按自身等级使用该表；背后偷袭另见上方说明。'}</li></ul><p class="source-line">${sourceLinks(['phb:26-27:thief-functions','phb:11:dex-thief-adjustment'])}</p></details>
  </section>`;
}

/** Player-safe projection: DM-secret turning/follower tables never enter this HTML. */
export function renderCampaignCapabilities(sheet: CampaignSheet) {
  const active = sheet.capabilities.filter(capability => capability.availability === 'active');
  const locked = sheet.capabilities.filter(capability => capability.availability === 'locked');
  return `<section id="sheet-capabilities" class="paper-section capability-panel" aria-labelledby="capability-heading">
    <div class="section-title"><h2 id="capability-heading">职业能力与戒律</h2><span class="muted">${esc(characterLabel(sheet.career))} · ${sheet.level}级</span></div>
    <p class="muted">这里显示当前职业的玩家可见能力、限制与待确认事项。秘密矩阵、追随者构成和未核分表不会被自动展开。</p>
    <ul class="capability-list">${active.map(capability => capabilityRow(capability)).join('') || '<li>当前没有已核验的玩家可见职业能力。</li>'}</ul>
    ${renderThiefFunctions(sheet)}
    ${locked.length ? `<details class="capability-locked"><summary>后续等级能力（${locked.length}项）</summary><ul class="capability-list">${locked.map(capability => capabilityRow(capability, true)).join('')}</ul></details>` : ''}
  </section>`;
}
