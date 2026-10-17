/** Presentation only: existing controllers own validation, drafts, task writes and persistence. */
export function startCreationStepNavigation(): void {
  const root = document.querySelector<HTMLElement>('[data-creation-navigation]');
  if (!root || root.dataset.navigationReady === 'true') return;
  root.dataset.navigationReady = 'true';
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-create-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-create-panel]')];
  if (!tabs.length || tabs.length !== panels.length) return;
  let selected = 0, scheduled = false, restoredName = '';
  const core = document.body.dataset.createStage === 'core';
  const get = (id: string) => document.getElementById(id);
  const field = (id: string) => get(id) as HTMLInputElement | HTMLSelectElement | null;
  const option = (id: string) => (get(id) as HTMLSelectElement | null)?.selectedOptions[0]?.textContent?.trim() ?? '';
  const put = (selector: string, text: string) => root.querySelectorAll<HTMLElement>(selector).forEach(node => {
    if (node.textContent !== text) node.textContent = text;
  });
  const taskLabels: Record<string, string> = {
    hp: '一级生命值', money: '起始资金', languages: '语言', proficiencies: '武器熟练',
    equipment: '装备采购', 'initial-spells': '初始法术', psionics: '灵能检查', 'admission-context': '入场约定',
  };
  const statusLabels: Record<string, string> = {
    pending: '待完成', complete: '已记录完成', 'not-applicable': '已记录不适用', 'needs-dm': '待战役确认',
  };
  const stepTasks: Record<string, string[]> = {
    resources: ['hp', 'money'], languages: ['languages'], proficiencies: ['proficiencies'],
    equipment: ['equipment'], spells: ['initial-spells'], admission: ['psionics', 'admission-context'],
  };
  const setTextList = (selector: string, items: string[], className = '') => {
    root.querySelectorAll<HTMLElement>(selector).forEach(host => {
      const nodes = items.map(text => {
        const item = document.createElement(selector === '[data-create-scores]' ? 'div' : 'li');
        item.textContent = text;
        if (className) item.className = className;
        return item;
      });
      host.replaceChildren(...nodes);
    });
  };

  function select(index: number, focus = false): void {
    selected = Math.max(0, Math.min(index, tabs.length - 1));
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === selected));
      tab.tabIndex = i === selected ? 0 : -1;
      if (i === selected) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    });
    // Only the wrappers are hidden here. Business hosts keep their own hidden/required/disabled states.
    panels.forEach((panel, i) => { panel.hidden = i !== selected; });
    const prev = root!.querySelector<HTMLButtonElement>('[data-create-prev]');
    const next = root!.querySelector<HTMLButtonElement>('[data-create-next]');
    if (prev) prev.disabled = selected === 0;
    if (next) {
      next.hidden = selected === tabs.length - 1;
      const label = tabs[selected + 1]?.dataset.stepLabel;
      next.textContent = label ? `下一步：${label}` : '下一步';
    }
    put('[data-create-position]', `第 ${selected + 1} / ${tabs.length} 步 · 浏览步骤不代表完成`);
    if (focus) panels[selected].querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }

  tabs.forEach((tab, index) => {
    // Keep a plain label before adding the status badge; labels never include a completion claim from inputs.
    tab.dataset.stepLabel = tab.textContent?.replace(/^\s*\d+\s*/, '').trim() ?? '';
    const badge = document.createElement('small');
    badge.className = 'create-step-state';
    tab.append(badge);
    tab.addEventListener('click', () => select(index, true));
    tab.addEventListener('keydown', event => {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % tabs.length
        : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + tabs.length - 1) % tabs.length : null;
      if (target === null) return;
      event.preventDefault(); select(target); tabs[target].focus();
    });
  });
  root.querySelector('[data-create-prev]')?.addEventListener('click', () => select(selected - 1, true));
  root.querySelector('[data-create-next]')?.addEventListener('click', () => select(selected + 1, true));
  root.querySelector('[data-create-save]')?.addEventListener('click', () => get('core-save-local')?.click());
  const narrow = window.matchMedia('(max-width:640px)');
  const orient = () => root.querySelector('[role=tablist]')?.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
  narrow.addEventListener('change', orient); orient();

  function refresh(): void {
    scheduled = false;
    const draft = option('core-draft');
    const restore = get('core-status')?.textContent?.match(/^已恢复 (.*?) · 修订 /);
    if (restore) restoredName = restore[1];
    const name = core
      ? ((field('core-draft')?.disabled ? restoredName : '') || (field('core-draft')?.value ? draft.split(' · ')[0] : '') || '尚未选择属性草稿')
      : field('draft-name')?.value.trim() || '未命名草稿';
    put('[data-create-name]', name);
    const classes = [...root!.querySelectorAll<HTMLInputElement>('input[name=core-class]:checked')]
      .map(input => input.parentElement?.textContent?.trim() ?? '').filter(Boolean);
    put('[data-create-identity]', core
      ? `${option('core-race') || '种族待选'} · ${classes.join('／') || '职业待选'} · ${option('core-alignment') || '阵营待选'}`
      : '第一阶段 · 原始属性草稿');
    const evaluated = core && !(get('core-export') as HTMLButtonElement | null)?.disabled;
    const scores = [...(get(core ? 'core-results' : 'ability-results')?.children ?? [])].map(node => node.textContent?.trim() ?? '');
    setTextList('[data-create-scores]', core && !evaluated ? ['尚未检查调整后属性'] : scores.length ? scores : ['六项属性待确认']);
    if (!core) {
      put('[data-create-method]', get('current-method')?.textContent || '尚未生成属性');
      const state = get('draft-revision')?.textContent ?? '';
      put('[data-create-draft-state]', state.includes('未保存') ? '当前有未保存修改；请确认分配后保存，再进入核心创建。' : '保存状态请查看上方操作反馈；进入下一阶段前，确认六项属性已保存。');
    }
    const tasks = [...(get('core-task-summary')?.children ?? [])].flatMap(node => {
      const match = node.textContent?.match(/^([^：]+)：(pending|complete|not-applicable|needs-dm) · ([\s\S]*)$/);
      return match ? [{ id: match[1], status: match[2], note: match[3] }] : [];
    });
    const completed = tasks.filter(task => ['complete', 'not-applicable'].includes(task.status)).length;
    put('[data-create-task-count]', tasks.length ? `已记录完成或不适用 ${completed} / ${tasks.length} 项；其余仍待完成或裁定。` : '尚无任务记录；先检查核心资格。');
    setTextList('[data-create-tasks]', tasks.map(task => `${taskLabels[task.id] ?? '创建事项'} · ${statusLabels[task.status]}${task.note ? `：${task.note}` : ''}`));
    tabs.forEach(tab => {
      const ids = stepTasks[tab.dataset.createTab ?? ''];
      const matched = tasks.filter(task => ids?.includes(task.id));
      const text = matched.length && matched.length === ids?.length
        ? matched.every(task => ['complete', 'not-applicable'].includes(task.status)) ? '已记录' : matched.some(task => task.status === 'needs-dm') ? '待裁定' : '待完成'
        : '';
      const badge = tab.querySelector('small');
      if (badge && badge.textContent !== text) badge.textContent = text;
    });
    root!.querySelectorAll<HTMLElement>('[data-create-empty]').forEach(note => {
      const host = get(note.dataset.createEmpty!);
      note.hidden = Boolean(host && !host.hidden && host.childElementCount);
    });
  }
  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }
  root.addEventListener('input', schedule);
  root.addEventListener('change', schedule);
  root.addEventListener('click', schedule);
  // Watch only business output, never our own summary or navigation, to avoid observer feedback loops.
  const observer = new MutationObserver(schedule);
  for (const id of ['ability-results', 'current-method', 'draft-revision', 'creation-status', 'core-results', 'core-status', 'core-task-summary', 'core-resources', 'core-languages', 'core-proficiencies', 'core-initial-spells', 'core-starting-equipment', 'core-campaign-admission', 'core-export']) {
    const target = get(id);
    if (target) observer.observe(target, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
  }
  select(0); refresh();
}
