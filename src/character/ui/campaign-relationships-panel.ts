import type { CampaignSheet } from '../application/campaign-sheet';

const esc = (value: unknown): string => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

const kindLabels: Record<string, string> = {
  henchman: '随从', 'standard-hireling': '普通雇员', 'expert-hireling': '专家雇员', mercenary: '佣兵',
};
const statusLabels: Record<string, string> = {
  prospective: '候选', active: '在职', missing: '失联', dismissed: '已解雇', dead: '死亡', departed: '已离开',
};
const periodLabels: Record<string, string> = { day: '日', week: '周', month: '月', year: '年', 'adventure-share': '冒险分成', special: '特别约定' };

/** Public-only relationship view. Private loyalty, morale and DM notes never reach this renderer. */
export function renderCampaignRelationships(sheet: CampaignSheet): string {
  const projection = sheet.relationships;
  if (!projection) return `<section class="paper-section relationship-panel" id="sheet-relationships">
    <div class="section-title"><h2>随从与雇佣</h2><span class="badge">暂无公开记录</span></div>
    <p>这里显示已导入的公开关系。将来从 DM Studio 导出公开投影后，可在人物卡中查看合同、薪酬和公开历史；本站不记录私密忠诚或士气信息。</p>
  </section>`;
  const paymentByRelationship = new Map<string, typeof projection.payments[number][]>();
  for (const payment of projection.payments) paymentByRelationship.set(payment.relationshipId, [...paymentByRelationship.get(payment.relationshipId) ?? [], payment]);
  const records = projection.relationships.map(record => {
    const contract = record.contract;
    const pay = contract.payGpPerPeriod === null ? '薪酬未列' : `${contract.payGpPerPeriod} gp / ${periodLabels[contract.payPeriod] ?? contract.payPeriod}`;
    const duties = record.contract.duties.length ? record.contract.duties.map(item => esc(item)).join('、') : '未列职责';
    const equipment = record.contract.employerProvidedEquipment.length ? record.contract.employerProvidedEquipment.map(item => esc(item)).join('、') : '无列明装备';
    const payments = paymentByRelationship.get(record.relationshipId) ?? [];
    return `<article class="relationship-row"><div class="relationship-heading"><h3>${esc(record.displayName)}</h3><span class="badge">${esc(kindLabels[record.kind] ?? record.kind)} · ${esc(statusLabels[record.status] ?? record.status)}</span></div>
      <dl class="relationship-facts"><div><dt>合同起始</dt><dd>${esc(contract.startedOn)}</dd></div><div><dt>薪酬</dt><dd>${esc(pay)}</dd></div><div><dt>职责</dt><dd>${duties}</dd></div><div><dt>供给</dt><dd>${contract.quartersProvided ? '提供住所' : '住所自理'}；${contract.foodAndClothingProvided ? '提供衣食' : '衣食自理'}</dd></div><div><dt>雇主装备</dt><dd>${equipment}</dd></div></dl>
      ${payments.length ? `<details><summary>已记录的公开支付（${payments.length}）</summary><ul>${payments.map(payment => `<li>${esc(payment.at)} · ${esc(payment.amountGp)} gp · ${esc(payment.purpose)}${payment.periodLabel ? ` · ${esc(payment.periodLabel)}` : ''}</li>`).join('')}</ul></details>` : ''}
      ${record.observedHistory.length ? `<details><summary>公开历史（${record.observedHistory.length}）</summary><ul>${record.observedHistory.map(event => `<li>${esc(event.at)} · ${esc(event.summary)}</li>`).join('')}</ul></details>` : ''}
    </article>`;
  }).join('');
  return `<section class="paper-section relationship-panel" id="sheet-relationships">
    <div class="section-title"><h2>随从与雇佣</h2><span class="badge">公开投影 · ${projection.revision}版</span></div>
    <p>只显示公开合同事实、公开支付和公开历史。忠诚、士气、真实阵营、个人秘密及主持人备注不会进入此人物卡。</p>
    <div class="relationship-list">${records || '<p>公开投影没有关系条目。</p>'}</div>
  </section>`;
}
