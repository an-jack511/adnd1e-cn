import type { CampaignSheet } from '../application/campaign-sheet';
import type { CapabilityAtLevel } from '../engine/core-class-capabilities';
import { resolveDisplayRuleSource } from '../rules/source-directory';

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));

function sourceLinks(ids: readonly string[]) {
  return ids.map(id => {
    const source = resolveDisplayRuleSource(id);
    if (!source) return `<span class="source-missing">待解析来源：${esc(id)}</span>`;
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
  const status = capability.status === 'verified' ? '已核验' : capability.status === 'needs-dm' ? '待战役确认' : '未接入';
  return `<li class="capability-row ${locked ? 'is-locked' : ''}">
    <div><strong>${esc(capability.label)}</strong><small>${locked ? `${capability.minimumLevel}级后开放 · ` : ''}${esc(status)}${valueText(capability)}</small></div>
    <details><summary>规则说明与依据</summary><p>${esc(capability.rule)}</p><p class="source-line">${sourceLinks(capability.sourceIds)}</p>${capability.delegatedTo ? `<p class="muted">具体分表：${esc(capability.delegatedTo)}。本页不代替DM裁定。</p>` : ''}</details>
  </li>`;
}

/** Player-safe projection: DM-secret turning/follower tables never enter this HTML. */
export function renderCampaignCapabilities(sheet: CampaignSheet) {
  const active = sheet.capabilities.filter(capability => capability.availability === 'active');
  const locked = sheet.capabilities.filter(capability => capability.availability === 'locked');
  return `<section id="sheet-capabilities" class="paper-section capability-panel" aria-labelledby="capability-heading">
    <div class="section-title"><h2 id="capability-heading">职业能力与戒律</h2><span class="muted">${esc(sheet.career)} · ${sheet.level}级</span></div>
    <p class="muted">这里显示当前职业的玩家可见能力、限制与待确认事项。秘密矩阵、追随者构成和未核分表不会被自动展开。</p>
    <ul class="capability-list">${active.map(capability => capabilityRow(capability)).join('') || '<li>当前没有已核验的玩家可见职业能力。</li>'}</ul>
    ${locked.length ? `<details class="capability-locked"><summary>后续等级能力（${locked.length}项）</summary><ul class="capability-list">${locked.map(capability => capabilityRow(capability, true)).join('')}</ul></details>` : ''}
  </section>`;
}
