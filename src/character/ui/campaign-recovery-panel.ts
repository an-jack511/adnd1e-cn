import type { CoreCampaignArchive } from '../workflows/core-campaign-runtime';

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));

export interface CampaignRecoverySnapshot {
  generation: number;
  archive: CoreCampaignArchive;
}

/**
 * Recovery is deliberately an exportable conflict artifact, never an in-place
 * rollback. The UI therefore exposes history without exposing event payloads.
 */
export function renderCampaignRecovery(history: readonly CampaignRecoverySnapshot[]) {
  return `<section class="paper-section recovery-panel" aria-labelledby="recovery-heading">
    <div class="section-title"><h2 id="recovery-heading">历史快照与恢复副本</h2><span class="muted">只读</span></div>
    <p class="muted">选择旧版本只会导出恢复副本，不会覆盖当前角色，也不会删除较新的事件。导出后请另存，再由 DM 明确决定是否作为新分支使用。</p>
    <ul class="recovery-list">${history.map(snapshot => `<li><div><strong>存档第 ${snapshot.generation} 代</strong><small>修订 ${snapshot.archive.runtime.transaction.revision} · ${snapshot.archive.actions.length} 个已记录动作</small></div><button type="button" data-recovery-generation="${snapshot.generation}">导出恢复副本</button></li>`).join('')}</ul>
  </section>`;
}

