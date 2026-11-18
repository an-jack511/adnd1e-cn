import catalog from '../../data/character-spellbooks.json';
import spellData from '../../data/public/spell-index.json';
import { cardSpellCapacity } from './spell-capacity';
import { intelligenceSpellRule } from '../engine/core-spell-acquisition';

type Spell = typeof spellData[number];
type BookSpell = typeof catalog[number]['spells'][number] & { characterLevel: number };
type Book = Omit<typeof catalog[number], 'spells'> & { spells: BookSpell[] };
type PickerTarget = { kind: 'elective' | 'adventure' | 'travel'; level: number; entry?: any };
type SpellbookState = { books: any[]; travel: any[]; adventure: string[]; adventureRecords: any[] };

const books = catalog as Book[];
const spellList = spellData as Spell[];
const spellDescriptions = new Map<string, string>(JSON.parse(document.getElementById('spell-descriptions')?.textContent || '[]'));
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const choice = $<HTMLSelectElement>('spellbook-choice');
const characterChoice = $<HTMLSelectElement>('character-choice');
const dialog = $<HTMLDialogElement>('spell-library');
const frame = $<HTMLIFrameElement>('spell-library-frame');
const classLists: Record<string, string[]> = {
  cleric: ['Cleric'], druid: ['Druid'], 'magic-user': ['Magic-User'], illusionist: ['Illusionist'],
  ranger: ['Druid'], paladin: ['Cleric'], bard: ['Druid'], 'oa-shukenja': ['Shukenja', 'Sohei'], 'oa-wu-jen': ['Wu Jen'],
};
const electiveLevels = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
const adventureLevels = new Set([5, 8, 11, 14, 17, 20]);
const maxRingAccess: Record<string, [number, number][]> = {
  'magic-user': [[1, 1], [3, 2], [5, 3], [7, 4], [9, 5], [12, 6], [14, 7], [16, 8], [18, 9]],
  illusionist: [[1, 1], [3, 2], [5, 3], [7, 4], [10, 5], [12, 6], [14, 7]],
};
let card: Record<string, any> | null = null;
let selected: Book | undefined;
let pickerTarget: PickerTarget | null = null;
let pickerSelection: string[] = [];

function readCard() {
  try { const value = JSON.parse(localStorage.getItem('adnd1e-character') || 'null'); return value && value.fields ? value : null; }
  catch { return null; }
}
function savedCards() {
  try { return (JSON.parse(localStorage.getItem('adnd1e-characters') || '[]') as Record<string, any>[]).filter(row => row?.fields); }
  catch { return []; }
}
function records(): SpellbookState {
  try {
    const data = JSON.parse(String(card?.fields?.spellbook_records || '{}'));
    return { books: Array.isArray(data.books) ? data.books : [], travel: Array.isArray(data.travel) ? data.travel : [], adventure: Array.isArray(data.adventure) ? data.adventure : [], adventureRecords: Array.isArray(data.adventureRecords) ? data.adventureRecords : [] };
  } catch { return { books: [], travel: [], adventure: [], adventureRecords: [] }; }
}
function persist(data = records()) {
  if (!card) return;
  card.fields.spellbook_records = JSON.stringify(data);
  saveCharacter();
  $('spellbook-status').textContent = '已保存。';
}
const activeCharacterKey = 'adnd1e-active-character-id';
const workingCopiesKey = 'adnd1e-character-drafts';
function saveCharacter() {
  if (!card) return;
  const id = String(card.fields?.character_id || '');
  localStorage.setItem('adnd1e-character', JSON.stringify(card));
  if (id) {
    let drafts: Record<string, Record<string, any>> = {};
    try { drafts = JSON.parse(localStorage.getItem(workingCopiesKey) || '{}'); } catch {}
    drafts[id] = card;
    localStorage.setItem(workingCopiesKey, JSON.stringify(drafts));
    localStorage.setItem(activeCharacterKey, id);
    const all = savedCards(), index = all.findIndex(row => String(row.fields?.character_id) === id);
    if (index >= 0) { all[index] = card; localStorage.setItem('adnd1e-characters', JSON.stringify(all)); }
  }
}
function characterLevel() { return card ? Math.max(1, Math.min(20, Number(card.fields?.level) || 1)) : 20; }
function classId() { return String(card?.fields?.class || ''); }
function classNames() { return classLists[classId()] ?? []; }
function classCompatible(spell: Spell) {
  const source = spellList.find(entry => entry.id === spell.id);
  return !classId() || !classLists[classId()] || !!source?.classes?.some(name => classNames().includes(name));
}
function maxRingAt(level: number) {
  const map = maxRingAccess[classId()];
  if (map) return Math.max(0, ...map.filter(([at]) => at <= level).map(([, ring]) => ring));
  const daily = card?.fields ? cardSpellCapacity(card.fields).daily : null;
  return daily ? Math.max(0, ...Object.entries(daily).filter(([, count]) => Number(count) > 0).map(([ring]) => Number(ring))) : 9;
}
function preparationLimit(spellLevel: number) {
  if (!card?.fields) return 0;
  const capacity = cardSpellCapacity(card.fields);
  return capacity.daily === null ? 0 : Number(capacity.daily[spellLevel] || 0);
}
function isPrepared(spellId: string) { return (card?.preparedSpells || []).some((entry: any) => entry.spellId === spellId); }
function preparedCountAt(spellLevel: number) {
  return (card?.preparedSpells || []).reduce((total: number, entry: any) => total + (spellList.find(spell => spell.id === entry.spellId)?.level === spellLevel ? Number(entry.count) || 0 : 0), 0);
}
function allBookSpellIds(data = records()) {
  return new Set<string>(data.books.flatMap((entry: any) => {
    const book = books.find(candidate => candidate.id === entry.id);
    const fixed = book?.spells.map(spell => spell.id) || [];
    const old = Object.values(entry.levels || {}).flatMap((row: any) => Array.isArray(row.spellIds) ? row.spellIds : []);
    const progression = Object.values(entry.progression || {}).flatMap((row: any) => Array.isArray(row.spellIds) ? row.spellIds : []);
    return [...fixed, ...old, ...progression];
  }));
}
function learnedIds(data = records()) {
  const level = characterLevel(), ids = new Set<string>();
  for (const entry of data.books) {
    const book = books.find(candidate => candidate.id === entry.id);
    for (const spell of book?.spells || []) if (spell.characterLevel <= level) ids.add(spell.id);
    for (const [at, record] of Object.entries(entry.progression || {}) as [string, any][]) if (Number(at) <= level) for (const id of record.spellIds || []) ids.add(id);
  }
  for (const id of data.adventure) ids.add(id);
  for (const entry of data.adventureRecords) if (entry.success && entry.characterLevel <= level) ids.add(entry.spellId);
  return ids;
}
function spellRow(spell: Spell, action?: { text: string; disabled?: boolean; title?: string; run: () => void }) {
  const item = document.createElement('div'); item.className = 'spell-choice';
  const name = document.createElement('span'); name.className = 'spell-name'; name.tabIndex = 0; name.textContent = `${spell.nameZh} · ${spell.nameEn}`;
  const popup = document.createElement('div'); popup.className = 'spell-tooltip'; popup.setAttribute('role', 'tooltip'); popup.hidden = true;
  const title = document.createElement('strong'); title.textContent = `${spell.nameZh} · ${spell.nameEn}`; popup.append(title);
  const facts: [string, string][] = [['环级', spell.level === 0 ? '小法术' : `${spell.level}环`], ['职业', spell.classes.join('、')], ['学派', spell.school], ['施法时间', spell.castingTime], ['距离', spell.range], ['持续时间', spell.duration], ['作用范围', spell.areaOfEffect], ['豁免', spell.savingThrow], ['成分', spell.components.join('、')], ['来源', spell.source.map(source => `${source.book}${source.page ? ` 第 ${source.page} 页` : ''}`).join('；')]];
  const table = document.createElement('table'); table.className = 'spell-tooltip-facts';
  for (let index = 0; index < facts.length; index += 2) {
    const row = document.createElement('tr');
    for (const [key, value] of facts.slice(index, index + 2)) { const th = document.createElement('th'), td = document.createElement('td'); th.textContent = key; td.textContent = value; row.append(th, td); }
    if (facts.slice(index, index + 2).length === 1) row.append(document.createElement('th'), document.createElement('td'));
    table.append(row);
  }
  popup.append(table);
  const description = spellDescriptions.get(spell.id);
  if (description) { const body = document.createElement('p'); body.className = 'spell-tooltip-description'; body.textContent = description; popup.append(body); }
  const show = () => { popup.hidden = false; }, hide = () => { popup.hidden = true; };
  item.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') show(); }); item.addEventListener('pointerleave', hide);
  item.addEventListener('focusin', show); item.addEventListener('focusout', event => { if (!item.contains(event.relatedTarget as Node | null)) hide(); });
  item.append(name);
  if (action) { const button = document.createElement('button'); button.type = 'button'; button.className = 'spell-prepare-button'; button.textContent = action.text; button.disabled = !!action.disabled; button.title = action.title || ''; button.addEventListener('click', action.run); item.append(button); }
  item.append(popup); return item;
}
function prepareAction(spell: Spell) {
  const already = isPrepared(spell.id), limit = preparationLimit(spell.level), full = limit > 0 && preparedCountAt(spell.level) >= limit;
  return { text: already ? '撤销准备' : '准备', disabled: !already && (!card || !classCompatible(spell) || !limit || full), title: already ? '从人物卡撤销准备' : !card ? '先保存人物卡' : full ? '本环准备次数已满' : !limit ? '当前人物没有此环法术位' : '加入准备法术', run: () => {
    if (!card) return;
    card.preparedSpells = Array.isArray(card.preparedSpells) ? card.preparedSpells : [];
    if (already) card.preparedSpells = card.preparedSpells.filter((entry: any) => entry.spellId !== spell.id);
    else if (!full && limit) card.preparedSpells.push({ spellId: spell.id, count: 1, expended: 0 });
    saveCharacter(); $('spellbook-status').textContent = already ? `已撤销${spell.nameZh}的准备。` : `${spell.nameZh}已加入准备法术。`; render();
  }};
}
function render() {
  const data = records(); selected = books.find(book => book.id === choice.value) || books.find(book => book.id === data.books[0]?.id);
  if (selected) choice.value = selected.id;
  const host = $<HTMLDivElement>('spellbook-levels'); host.replaceChildren();
  if (selected) {
    const owned = data.books.find((entry: any) => entry.id === selected!.id), currentLevel = characterLevel();
    const fixedVisible = selected.spells.filter(spell => spell.characterLevel <= currentLevel && classCompatible(spell));
    $('spellbook-title').textContent = `${selected.code} · ${selected.title}`;
    $('spellbook-meta').textContent = `${String(card?.fields?.name || '当前人物')} · ${String(card?.fields?.class || '未选职业')} ${card ? `${currentLevel}级` : '未选等级'} · 显示至角色 ${currentLevel} 级 · ${fixedVisible.length}/${selected.spells.length} 项`;
    $('spellbook-pdf').setAttribute('href', selected.file); $('spellbook-cover-link').setAttribute('href', selected.file);
    const progressionIds = new Set<string>();
    for (const progression of Object.values(owned?.progression || {}) as any[]) if (progression.attempt?.success) progressionIds.add(progression.attempt.spellId);
    for (const entry of data.adventureRecords) if (entry.bookId === selected.id && entry.success && entry.characterLevel <= currentLevel) progressionIds.add(entry.spellId);
    const knownIds = new Set<string>([...fixedVisible.map(spell => spell.id), ...progressionIds]);
    for (const id of data.adventure) knownIds.add(id);
    for (let ring = 0; ring <= 9; ring++) {
      const spellsAtRing = [...knownIds].map(id => spellList.find(spell => spell.id === id)).filter((spell): spell is Spell => !!spell && spell.level === ring && classCompatible(spell));
      if (!spellsAtRing.length) continue;
      const row = document.createElement('section'); row.className = 'spellbook-level'; row.dataset.spellLevel = String(ring);
      const title = document.createElement('h3'); title.textContent = ring === 0 ? '小法术' : `${ring} 环`;
      const fixedCount = fixedVisible.filter(entry => spellList.find(spell => spell.id === entry.id)?.level === ring).length;
      const meta = document.createElement('p'); meta.className = 'spellbook-level-meta'; meta.textContent = `固定目录 ${fixedCount} 种 · 已知 ${spellsAtRing.length} 种`;
      const list = document.createElement('div'); list.className = 'spellbook-check-list';
      for (const spell of spellsAtRing) list.append(spellRow(spell, prepareAction(spell)));
      row.append(title, meta, list); host.append(row);
    }
    const growth = document.createElement('section'); growth.className = 'spellbook-growth';
    const growthTitle = document.createElement('h3'); growthTitle.textContent = '逐级习得机会'; growth.append(growthTitle);
    const growthRows = document.createElement('div'); growthRows.className = 'spellbook-growth-rows';
    for (let level = 1; level <= currentLevel; level++) {
      const progression = owned?.progression?.[String(level)] || {}, elective = progression.attempt;
      const adventure = data.adventureRecords.find((entry: any) => entry.characterLevel === level && entry.bookId === selected!.id);
      if (!electiveLevels.has(level) && !adventureLevels.has(level)) continue;
      const item = document.createElement('div'); item.className = 'spellbook-growth-row';
      const label = document.createElement('strong'); label.textContent = `角色 ${level} 级`;
      const actions = document.createElement('div'); actions.className = 'spellbook-growth-actions';
      if (electiveLevels.has(level)) {
        if (elective) { const spell = spellList.find(entry => entry.id === elective.spellId), result = document.createElement('span'); result.textContent = `自选：${spell?.nameZh || elective.spellId} · d100 ${elective.percentile}/${elective.chance}% · ${elective.success ? '成功' : '失败'}`; actions.append(result); }
        else { const button = document.createElement('button'); button.type = 'button'; button.textContent = '自选法术'; button.disabled = !card; button.title = card ? '从资料库选取并按智力判定' : '先保存人物卡'; button.addEventListener('click', () => openPicker({ kind: 'elective', level })); actions.append(button); }
      }
      if (adventureLevels.has(level)) {
        if (adventure) { const spell = spellList.find(entry => entry.id === adventure.spellId), result = document.createElement('span'); result.textContent = `冒险所得：${spell?.nameZh || adventure.spellId} · d100 ${adventure.percentile}/${adventure.chance}% · ${adventure.success ? '成功' : '失败'}`; actions.append(result); }
        else { const button = document.createElement('button'); button.type = 'button'; button.textContent = '冒险所得'; button.disabled = !card; button.title = 'DM 启用后登记发现的法术'; button.addEventListener('click', () => openPicker({ kind: 'adventure', level })); actions.append(button); }
      }
      item.append(label, actions); growthRows.append(item);
    }
    if (growthRows.childElementCount) { growth.append(growthRows); host.append(growth); }
    if (!host.childElementCount) { const empty = document.createElement('p'); empty.textContent = '当前等级及之前没有已知法术。'; host.append(empty); }
  } else {
    $('spellbook-title').textContent = '选择一本法术书'; $('spellbook-meta').textContent = '从图书馆收录的法术书中选择目录。';
  }
  renderAdventure(data); renderTravel(data);
}
function renderAdventure(data = records()) {
  const host = $<HTMLDivElement>('adventure-spell-results'); host.replaceChildren();
  const recordsForBook = data.adventureRecords.filter((entry: any) => !selected || !entry.bookId || entry.bookId === selected.id);
  const attempted = new Set(recordsForBook.map((entry: any) => entry.spellId));
  const legacy = data.adventure.filter(id => !attempted.has(id) && !allBookSpellIds(data).has(id));
  $('adventure-spell-status').textContent = `已登记 ${legacy.length} 种；重复法术及法术书目录中的法术不重复显示。`;
  for (const id of legacy) { const spell = spellList.find(item => item.id === id); if (spell) host.append(spellRow(spell, prepareAction(spell))); }
}
function travelSpellIds(entry: any) {
  const raw = Array.isArray(entry.spells) ? entry.spells : String(entry.spells || '').split(/[，,、\s]+/);
  return raw.map((token: string) => spellList.find(spell => spell.id === token || spell.nameZh === token || spell.nameEn.toLowerCase() === token.toLowerCase())?.id).filter(Boolean) as string[];
}
function travelBands() {
  if (classId() === 'magic-user') return [{ name: '小法术', levels: [0], capacity: 9 }, { name: '一至三环', levels: [1, 2, 3], capacity: 6 }, { name: '四至六环', levels: [4, 5, 6], capacity: 4 }, { name: '七至九环', levels: [7, 8, 9], capacity: 2 }];
  if (classId() === 'illusionist') return [{ name: '小法术', levels: [0], capacity: 9 }, { name: '一至二环', levels: [1, 2], capacity: 6 }, { name: '三至四环', levels: [3, 4], capacity: 4 }, { name: '五至七环', levels: [5, 6, 7], capacity: 2 }];
  return [];
}
function renderTravel(data = records()) {
  const host = $<HTMLDivElement>('travel-books'); host.replaceChildren(); const learned = learnedIds(data);
  if (!data.travel.length) { const empty = document.createElement('p'); empty.className = 'spellbook-status-note'; empty.textContent = !card ? '先保存人物卡，再添加旅行法术书。' : !learned.size ? '先选人物法术书或登记已学法术。' : '还没有旅行法术书。'; host.append(empty); }
  for (const entry of data.travel) {
    const row = document.createElement('section'); row.className = 'travel-book-row';
    for (const [key, label] of [['name', '书名'], ['capacity', '备注']] as const) {
      const wrap = document.createElement('label'); wrap.textContent = label; const input = document.createElement('input'); input.value = entry[key] || ''; if (key === 'capacity') input.placeholder = '可选';
      input.addEventListener('change', () => { entry[key] = input.value; persist(data); }); wrap.append(input); row.append(wrap);
    }
    const spellWrap = document.createElement('div'); spellWrap.className = 'travel-spell-picker';
    const ids = travelSpellIds(entry), bands = travelBands(), summary = document.createElement('small');
    summary.textContent = bands.map(band => `${band.name} ${ids.filter(id => band.levels.includes(spellList.find(spell => spell.id === id)?.level ?? -1)).length}/${band.capacity}`).join(' · ') || `已抄 ${ids.length} 种`;
    const picker = document.createElement('button'); picker.type = 'button'; picker.textContent = '从法术库选取'; picker.disabled = !card; picker.title = !card ? '先保存人物卡' : '已知法术及小法术可选'; picker.addEventListener('click', () => openPicker({ kind: 'travel', level: characterLevel(), entry }));
    spellWrap.append(picker, summary);
    const list = document.createElement('div'); list.className = 'travel-spell-picked';
    for (const id of ids) {
      const spell = spellList.find(item => item.id === id); if (!spell) continue;
      const line = spellRow(spell, prepareAction(spell)); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'travel-remove-spell'; remove.textContent = '移除';
      remove.addEventListener('click', () => { entry.spells = ids.filter(value => value !== id); persist(data); renderTravel(data); }); line.append(remove); list.append(line);
    }
    spellWrap.append(list); row.append(spellWrap);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除旅行书'; remove.addEventListener('click', () => { data.travel = data.travel.filter((book: any) => book !== entry); persist(data); renderTravel(data); }); row.append(remove); host.append(row);
  }
}
function canAddSpell(id: string, level: number) {
  const spell = spellList.find(entry => entry.id === id); return !!spell && spell.level <= maxRingAt(level) && classCompatible(spell);
}
function openPicker(target: PickerTarget) {
  if (!card) return;
  pickerTarget = target; const data = records(), url = new URL('/spells/', location.origin), known = learnedIds(data), current = target.kind === 'travel' ? travelSpellIds(target.entry) : [];
  url.searchParams.set('mode', 'prepare');
  for (const name of classNames()) url.searchParams.append('class', name);
  const maximum = maxRingAt(target.level); for (let level = 0; level <= maximum; level++) url.searchParams.append('level', String(level));
  let excluded = new Set<string>(); pickerSelection = [...current];
  if (target.kind === 'elective' || target.kind === 'adventure') {
    excluded = allBookSpellIds(data);
    const knownAdventure = new Set([...data.adventure, ...data.adventureRecords.filter((entry: any) => entry.success).map((entry: any) => entry.spellId)]);
    for (const id of knownAdventure) excluded.add(id);
    if (target.kind === 'elective') {
      const own = data.books.find((entry: any) => entry.id === selected?.id), old = own?.progression?.[String(target.level)]?.attempt?.spellId;
      if (old) excluded.delete(old);
      url.searchParams.set('max-count', '1');
    } else {
      const existing = data.adventureRecords.find((entry: any) => entry.characterLevel === target.level && entry.bookId === selected?.id);
      if (existing?.spellId) excluded.delete(existing.spellId);
      url.searchParams.set('max-count', '1');
    }
  } else {
    const allowed = spellList.filter(spell => spell.level === 0 || known.has(spell.id) || current.includes(spell.id)).filter(spell => spell.level <= maximum && classCompatible(spell));
    for (const spell of allowed) url.searchParams.append('include', spell.id);
    const capacity = travelBands().reduce((sum, band) => sum + band.capacity, 0); if (capacity > 0) url.searchParams.set('max-count', String(capacity));
    for (const band of travelBands()) url.searchParams.append('band', `${band.levels.join(',')}:${band.capacity}`);
  }
  for (const id of excluded) if (!pickerSelection.includes(id)) url.searchParams.append('exclude', id);
  if (frame.src !== url.href) frame.src = url.href;
  $('spell-library-title').textContent = target.kind === 'elective' ? `角色 ${target.level} 级 · 自选习得` : target.kind === 'adventure' ? `角色 ${target.level} 级 · 冒险所得` : '旅行法术书 · 选取法术';
  dialog.showModal(); sendPickerSelection();
}
function sendPickerSelection() {
  frame.contentWindow?.postMessage({ type: 'adnd1e-card-selection', ids: pickerSelection }, location.origin);
}
function recordAcquisition(ids: string[]) {
  if (!card || !pickerTarget || !ids.length) return;
  const data = records(), id = ids[0];
  if (pickerTarget.kind === 'travel') {
    const entry = pickerTarget.entry, existing = new Set(travelSpellIds(entry)), bands = travelBands();
    for (const selectedId of ids) {
      const spell = spellList.find(item => item.id === selectedId); if (!spell) continue;
      const band = bands.find(item => item.levels.includes(spell.level));
      const count = band ? travelSpellIds(entry).filter(value => band.levels.includes(spellList.find(item => item.id === value)?.level ?? -1)).length : 0;
      if (!existing.has(selectedId) && band && count >= band.capacity) continue;
      if (canAddSpell(selectedId, pickerTarget.level) && (spell.level === 0 || learnedIds(data).has(selectedId))) existing.add(selectedId);
    }
    entry.spells = [...existing]; persist(data); renderTravel(data); $('spellbook-status').textContent = '旅行书目录已更新。';
  } else {
    const spell = spellList.find(item => item.id === id); if (!spell || !canAddSpell(id, pickerTarget.level)) return;
    const intelligence = Number(card.fields?.INT) || 0;
    let chance = 0; try { chance = intelligenceSpellRule(intelligence).chancePercent; } catch { $('spellbook-status').textContent = '智力未达到习得法术的判定范围。'; return; }
    const percentile = Math.floor(Math.random() * 100) + 1, success = percentile <= chance;
    if (pickerTarget.kind === 'elective') {
      let book = data.books.find((entry: any) => entry.id === selected?.id);
      if (!book && selected) { book = { id: selected.id, levels: {}, progression: {} }; data.books.push(book); }
      if (book) { book.progression ||= {}; book.progression[String(pickerTarget.level)] = { spellIds: success ? [id] : [], attempt: { spellId: id, percentile, chance, success } }; }
    } else {
      data.adventureRecords.push({ bookId: selected?.id || '', characterLevel: pickerTarget.level, spellId: id, percentile, chance, success });
      if (success && !data.adventure.includes(id)) data.adventure.push(id);
    }
    persist(data); render(); $('spellbook-status').textContent = `${spell.nameZh}：d100 ${percentile}，成功率 ${chance}%，${success ? '习得成功' : '习得失败；本级机会已用'}。`;
  }
  dialog.close(); pickerTarget = null;
}
function selectCard() {
  const saved = savedCards(), id = characterChoice.value;
  card = id ? saved.find(row => String(row.fields?.character_id) === id) ?? null : readCard();
  if (!card && saved.length === 1) card = saved[0];
  $('add-travel-book').toggleAttribute('disabled', !card);
  $('spellbook-status').textContent = card ? '' : id ? '未找到该人物。' : '未保存人物。先保存人物卡。'; render();
}

choice.addEventListener('change', () => {
  selected = books.find(book => book.id === choice.value); if (card && selected) {
    const data = records(); if (!data.books.some((entry: any) => entry.id === selected!.id)) data.books.push({ id: selected.id, levels: {}, progression: {} }); persist(data);
  } else render();
});
characterChoice.addEventListener('change', selectCard);
$('add-travel-book').addEventListener('click', () => { if (!card) return; const data = records(); data.travel.push({ name: '', capacity: '', spells: [] }); persist(data); renderTravel(data); });
$('close-spell-library').addEventListener('click', () => { dialog.close(); pickerTarget = null; });
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'adnd1e-spell-picker-ready') sendPickerSelection();
  if (event.data.type === 'adnd1e-spell-picker-cancel') { dialog.close(); pickerTarget = null; }
  if (event.data.type === 'adnd1e-spells-selected' && Array.isArray(event.data.ids) && event.data.ids.every((id: unknown) => typeof id === 'string')) recordAcquisition(event.data.ids);
});
const stored = savedCards();
for (const entry of stored) if (entry.fields?.character_id) characterChoice.add(new Option(String(entry.fields.name || '未命名人物'), String(entry.fields.character_id)));
selectCard();
