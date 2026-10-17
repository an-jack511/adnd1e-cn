import type { CampaignJournalView } from '../application/campaign-journal';

const esc = (value: unknown): string => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

const categoryLabels: Record<string, string> = {
  experience: '冒险结算', xp: '冒险结算', income: '财富记录', wealth: '财富记录',
  training: '训练', advancement: '角色成长', growth: '角色成长',
  life: '生命状态', combat: '战斗记录', inventory: '物资记录', equipment: '装备记录',
  spell: '法术记录', spells: '法术记录', calendar: '战役日历', other: '战役活动',
};

/** Render only the public projection; loading, actions and saving belong to the workspace controller. */
export function renderCampaignJournal(view: CampaignJournalView): string {
  const entries = [...view.entries].reverse();
  const calendar = view.calendar
    ? `本战役每天 ${esc(view.calendar.minutesPerDay)} 分钟，每周 ${esc(view.calendar.daysPerWeek)} 天。`
    : '尚未确认本战役日历单位。';

  return `<div class="journal-panel">
    <div class="page-heading">
      <p class="eyebrow">战役记录 · 已发生的活动</p>
      <h1>${esc(view.name)}的战役记录</h1>
      <p>已取得 ${esc(view.level)} 级 · ${entries.length} 条公开活动</p>
    </div>
    <section class="journal-toolbar" aria-label="记录实际活动">
      <div class="journal-actions">
        <button type="button" data-operation="journal-activity"${view.calendar ? '' : ' disabled'} aria-describedby="journal-activity-note">登记已发生活动时段</button>
        <button type="button" data-operation="growth-xp">录入已确认经验结算</button>
        <button type="button" data-operation="growth-income">记录实际收入</button>
        <a data-workspace-link href="/character/growth/">训练与正式授级 →</a>
        <a data-workspace-link href="/character/sheet/">人物卡与法术准备 →</a>
      </div>
      <p>只登记实际占用；活动收益另行结算。</p>
      <details>
        <summary>操作条件与裁定边界</summary>
        <p id="journal-activity-note">只登记旅行、冒险、休整、学习、研究、制造等已发生的实际时间占用，不核定收益、不授予成果、不计算费用；提交时仍须通过现有活动重叠检查。训练请使用成长页。${view.calendar ? '' : '请先在成长页确认战役日历，再登记活动时段。'}</p>
        <p>经验与财富分别登记，确认后才写入档案；可用条件仍由现有规则检查。本地 DM 声明不是身份认证。</p>
      </details>
      <div class="journal-save" data-save-state><span>保存状态</span><strong>待核</strong><small>读取现有角色库</small></div>
    </section>
    <div class="work-columns">
      <section class="paper-section journal-history" aria-label="公开活动时间线">
        <div class="section-title"><h2>活动时间线</h2><small>最近追加的记录在前</small></div>
        <p class="journal-time-note">按档案追加顺序展示，不按电脑时间重排。记录时间是录入时刻；战役时间是团桌记录的实际时间，未记录时不作推算。</p>
        ${entries.length ? `<ol class="timeline journal-timeline" reversed>${entries.map(entry => {
          const category = categoryLabels[entry.category] ?? (/^[\u3400-\u9fff、／与·\s]+$/.test(entry.category) ? entry.category : '战役活动');
          return `<li value="${esc(entry.ordinal)}">
            <div class="timeline-date">第 ${esc(entry.ordinal)} 条</div>
            <article>
              <div class="journal-entry-heading"><h3>${esc(entry.title)}</h3><small class="badge">${esc(category)}</small></div>
              <dl class="journal-times">
                <div><dt>战役时间</dt><dd>${entry.gameTime === null ? '未记录' : esc(entry.gameTime)}</dd></div>
                <div><dt>记录时间</dt><dd>${esc(entry.recordedAt)}</dd></div>
              </dl>
              ${entry.details.length ? `<details class="journal-details"><summary>查看公开详情</summary><ul>${entry.details.map(detail => `<li>${esc(detail)}</li>`).join('')}</ul></details>` : ''}
            </article>
          </li>`;
        }).join('')}</ol>` : '<div class="empty-state"><h3>尚无公开活动记录</h3><p>完成实际操作后，相应公开记录会出现在这里；不会补造冒险或训练进度。</p></div>'}
      </section>
      <aside class="context-panel journal-context">
        <h2>时间与范围</h2>
        <p>${calendar}</p>
        <p>条目编号仅表示追加顺序。补录的过去活动仍保留其录入位置，不改写已有历史。</p>
        <h3>长期活动尚未完整接入</h3>
        <p>研究、制造、经营据点及随从等活动仍需团桌处理。本页不提供模拟完成按钮，不根据经过天数自动获得法术、物品、经验或收入。</p>
        <details><summary>公开记录与完整导出</summary><p>这里只展示公开投影提供的标题、时间和详情。完整运营档案可能包含审核信息，导出后仅分享给有权查看的人。</p></details>
      </aside>
    </div>
  </div>`;
}
