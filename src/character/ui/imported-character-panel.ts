import type { ImportedCharacterCard } from '../interchange/player-card-import';

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const value = (item: unknown, fallback = '未记录') => item === null || item === undefined || item === '' ? fallback : esc(item);
const list = (items: string[], fallback: string) => items.length ? `<ul class="plain-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : `<p class="muted-note">${fallback}</p>`;

export function renderImportedCharacterPanel(card: ImportedCharacterCard): string {
  const abilities = card.abilities.map(item => `<tr><th scope="row">${esc(item.label)}</th><td>${value(item.value)}</td></tr>`).join('');
  const inventory = card.inventory.length ? `<table class="compact-table"><thead><tr><th>物品</th><th>数量</th><th>状态</th><th>来源</th></tr></thead><tbody>${card.inventory.map(item => `<tr><td>${esc(item.label)}</td><td>${item.quantity}</td><td>${item.equipped ? '已携带' : '未装备'}</td><td>${esc(item.acquisition)}${item.costCp === 0 ? ' · 免费收入' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted-note">没有记录装备。</p>';
  const sources = card.sources.map(source => `<li>${esc(source.book)}${source.pages.length ? ` · 第 ${source.pages.join('、')} 页` : ''}${source.section ? ` · ${esc(source.section)}` : ''}</li>`).join('');
  return `<div class="imported-profile">
    <div class="page-heading"><p class="eyebrow">来源人物档案 · 只读</p><h1>${esc(card.name)}</h1><p>${esc(card.race)} · ${esc(card.career)}${card.level === null ? '' : ` · ${card.level}级`} · ${esc(card.alignment)}</p></div>
    <div class="source-banner"><strong>这是已核验的来源档案</strong><span>不经过 DM Studio 审卡，也不把来源卡伪装成本站逐级重放的核心运营档案。原文件可随时导出。</span></div>
    <section class="vitals"><div><span>生命值</span><strong>${value(card.currentHp)}<small> / ${value(card.maximumHp)}</small></strong></div><div><span>经验值</span><strong>${value(card.experience)}</strong></div><div><span>护甲等级</span><strong>${value(card.armorClass)}</strong><small>来源卡未记录</small></div><div><span>档案版本</span><strong>${esc(card.schemaVersion)}</strong><small>${esc(card.sourceProfile)}</small></div></section>
    <nav class="sheet-quicknav" aria-label="来源人物卡分区"><a href="#imported-abilities">属性</a><a href="#imported-equipment">装备</a><a href="#imported-magic">法术</a><a href="#imported-background">背景</a><a href="#imported-sources">出处</a></nav>
    <div class="work-columns"><section class="paper-section">
      <section id="imported-abilities"><h2>属性</h2><table class="compact-table"><tbody>${abilities}</tbody></table></section>
      <section id="imported-equipment"><h2>装备与财富</h2>${inventory}${card.currency.length ? `<p class="inline-note">${card.currency.map(item => `${esc(item.label)}：${item.amount}`).join('；')}（来源档案记录）</p>` : '<p class="muted-note">没有个人钱币记录。</p>'}</section>
      <section id="imported-magic"><h2>法术</h2>${card.dailySpellCapacity === null ? '<p class="muted-note">未记录每日法术容量。</p>' : `<p>每日法术容量：${esc(JSON.stringify(card.dailySpellCapacity))}</p>`}<h3>法术书</h3>${list(card.spellbooks, '没有记录法术书。')}<h3>已记忆法术</h3>${list(card.memorizedSpells, '没有记录已记忆法术；系统不会擅自补入。')}</section>
      <section id="imported-background"><h2>背景与战役状态</h2><p>${value(card.description, '没有背景说明。')}</p>${card.goals.length ? `<h3>长期目标</h3>${list(card.goals, '没有记录目标。')}` : ''}${card.outstanding.length ? `<h3>来源档案的待确认事项</h3>${list(card.outstanding, '没有待确认事项。')}` : ''}</section>
    </section><aside class="context-panel"><h2>人物资料</h2><p><strong>性别：</strong>${esc(card.sex)}</p><p><strong>语言：</strong>${card.languages.length ? card.languages.map(esc).join('、') : '未记录'}</p><p><strong>人物编号：</strong><code>${esc(card.characterId)}</code></p><p><strong>分支：</strong>${esc(card.branchId)}</p><p class="inline-note">来源档案模式只展示档案里确实存在的事实。攻击、豁免、法术施放、训练和升级等需要本站规则引擎重放的操作，不会对这份来源档案伪造计算结果。</p></aside></div>
    <section id="imported-sources" class="paper-section"><h2>规则出处</h2>${sources ? `<ul class="plain-list">${sources}</ul>` : '<p class="muted-note">没有记录出处。</p>'}</section>
  </div>`;
}
