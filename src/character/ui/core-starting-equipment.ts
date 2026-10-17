import { createCorePlayerStartingInventory, type PurchaseLine } from '../engine/core-inventory';
import { coinValueCp, coreEquipmentById, coreEquipmentCatalog, type CoreEquipmentCategory } from '../rules/core-inventory';
import { recordCreationTask, type CoreCreation } from '../workflows/core-create';
import { equipmentLabel, equipmentUnitLabel } from './character-labels';

type CartLine = { definitionId: string; quantity: number; agreedUnitPriceCp: number };

const categoryLabels: Record<CoreEquipmentCategory | 'all', string> = {
  all: '全部装备', armor: '护甲与盾牌', arms: '武器与弹药', clothing: '衣物', herbs: '药草',
  livestock: '牲畜', miscellaneous: '杂项工具', provisions: '食物与饮料', religious: '宗教用品',
  'tack-harness': '马具', transport: '运输工具',
};

const priceText = (cp: number): string => {
  if (cp >= coinValueCp.pp && cp % coinValueCp.pp === 0) return `${cp / coinValueCp.pp} 铂金币`;
  if (cp >= coinValueCp.gp && cp % coinValueCp.gp === 0) return `${cp / coinValueCp.gp} 金币`;
  if (cp >= coinValueCp.ep && cp % coinValueCp.ep === 0) return `${cp / coinValueCp.ep} 电子币`;
  if (cp >= coinValueCp.sp && cp % coinValueCp.sp === 0) return `${cp / coinValueCp.sp} 银币`;
  return `${cp} 铜币`;
};

const inputNumber = (value: number, min = 0): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'number'; input.min = String(min); input.step = '1'; input.value = String(value);
  return input;
};

export function renderStartingEquipment(host: HTMLElement, read: () => CoreCreation | null, write: (value: CoreCreation) => void) {
  host.replaceChildren();
  const creation = read();
  const title = document.createElement('h2'); title.textContent = '初始装备仓库'; host.append(title);
  const description = document.createElement('p'); description.textContent = '像逛装备仓库一样挑选物品。数量、价格、总额和找零会自动计算；PHB 价目只是参考，实际价格仍由战役决定。'; host.append(description);

  const toolbar = document.createElement('div'); toolbar.className = 'equipment-warehouse-toolbar';
  const searchLabel = document.createElement('label'); searchLabel.textContent = '搜索装备';
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = '例如：长剑、口粮、绳子'; searchLabel.append(search);
  const categoryLabel = document.createElement('label'); categoryLabel.textContent = '分类';
  const category = document.createElement('select'); category.append(...(['all', 'armor', 'arms', 'clothing', 'miscellaneous', 'provisions', 'religious', 'livestock', 'tack-harness', 'transport', 'herbs'] as const).map(id => new Option(categoryLabels[id], id))); categoryLabel.append(category);
  toolbar.append(searchLabel, categoryLabel); host.append(toolbar);

  const layout = document.createElement('div'); layout.className = 'equipment-warehouse';
  const catalogPanel = document.createElement('section'); catalogPanel.className = 'equipment-catalog';
  const catalogHeading = document.createElement('h3'); catalogHeading.textContent = '装备仓库';
  const catalogHint = document.createElement('p'); catalogHint.className = 'muted'; catalogHint.textContent = '点击“加入”或使用数量按钮；已经加入的物品会出现在右侧清单。';
  const catalogList = document.createElement('div'); catalogList.className = 'equipment-catalog-list'; catalogPanel.append(catalogHeading, catalogHint, catalogList);

  const cartPanel = document.createElement('section'); cartPanel.className = 'equipment-cart';
  const cartHeading = document.createElement('h3'); cartHeading.textContent = '已选装备';
  const cartList = document.createElement('div'); cartList.className = 'equipment-cart-list';
  const total = document.createElement('p'); total.className = 'equipment-total';
  const moneyTask = creation?.tasks.find(task => task.id === 'money');
  const startingMoneyGp = typeof moneyTask?.facts?.gp === 'number' ? moneyTask.facts.gp : 0;
  const savedPlan = creation?.tasks.find(task => task.id === 'equipment')?.facts?.purchasePlan;
  const selected = new Map<string, CartLine>();
  if (savedPlan && typeof savedPlan === 'object' && 'lines' in savedPlan && Array.isArray(savedPlan.lines)) {
    for (const raw of savedPlan.lines) {
      if (!raw || typeof raw !== 'object') continue;
      const line = raw as { definitionId?: unknown; quantity?: unknown; agreedUnitPriceCp?: unknown };
      if (typeof line.definitionId === 'string' && coreEquipmentById[line.definitionId] && Number.isSafeInteger(line.quantity) && Number(line.quantity) > 0 && Number.isSafeInteger(line.agreedUnitPriceCp) && Number(line.agreedUnitPriceCp) >= 0) {
        selected.set(line.definitionId, { definitionId: line.definitionId, quantity: Number(line.quantity), agreedUnitPriceCp: Number(line.agreedUnitPriceCp) });
      }
    }
  }

  const payment = document.createElement('fieldset'); payment.className = 'equipment-payment';
  const paymentLegend = document.createElement('legend'); paymentLegend.textContent = '结算'; payment.append(paymentLegend);
  const paymentGrid = document.createElement('div'); paymentGrid.className = 'equipment-payment-grid';
  const tenderLabel = document.createElement('label'); tenderLabel.textContent = '交付金币';
  const tender = inputNumber(0); tenderLabel.append(tender);
  const changeLabel = document.createElement('label'); changeLabel.textContent = '自动找零（铜币）';
  const change = inputNumber(0); change.readOnly = true; change.setAttribute('aria-readonly', 'true'); changeLabel.append(change);
  paymentGrid.append(tenderLabel, changeLabel); payment.append(paymentGrid);
  const record = document.createElement('button'); record.type = 'button'; record.className = 'primary'; record.textContent = '记录初始装备';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  cartPanel.append(cartHeading, cartList, total, payment, record, status);
  layout.append(catalogPanel, cartPanel); host.append(layout);

  let tenderTouched = false;
  const add = (definitionId: string, amount = 1) => {
    const existing = selected.get(definitionId); const definition = coreEquipmentById[definitionId];
    if (!definition) return;
    selected.set(definitionId, existing ? { ...existing, quantity: existing.quantity + amount } : { definitionId, quantity: amount, agreedUnitPriceCp: definition.listPriceCp });
    refreshCart();
  };
  const remove = (definitionId: string) => { selected.delete(definitionId); refreshCart(); };

  function refreshCatalog() {
    const query = search.value.trim().toLocaleLowerCase(); const selectedCategory = category.value;
    catalogList.replaceChildren();
    const visible = coreEquipmentCatalog.filter(item => (selectedCategory === 'all' || item.category === selectedCategory) && (!query || `${equipmentLabel(item.printedName, item.id)} ${item.printedName}`.toLocaleLowerCase().includes(query)));
    if (!visible.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = '没有匹配的装备。'; catalogList.append(empty); return; }
    for (const item of visible) {
      const row = document.createElement('div'); row.className = 'equipment-item';
      const name = document.createElement('div'); name.className = 'equipment-item-name';
      const strong = document.createElement('strong'); strong.textContent = equipmentLabel(item.printedName, item.id);
      const meta = document.createElement('small'); meta.textContent = `${priceText(item.listPriceCp)} / ${equipmentUnitLabel(item.purchaseUnit)}${item.approximateWeightGp === null ? '' : ` · 约 ${item.approximateWeightGp} 重量单位`}`;
      name.append(strong, meta);
      const controls = document.createElement('div'); controls.className = 'equipment-quick-add';
      const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.title = '减少一件';
      const count = document.createElement('span'); count.textContent = String(selected.get(item.id)?.quantity ?? 0);
      const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '＋'; plus.title = '加入一件';
      const addButton = document.createElement('button'); addButton.type = 'button'; addButton.textContent = '加入';
      minus.addEventListener('click', () => { const current = selected.get(item.id); if (!current) return; current.quantity > 1 ? selected.set(item.id, { ...current, quantity: current.quantity - 1 }) : selected.delete(item.id); refreshCatalog(); refreshCart(); });
      plus.addEventListener('click', () => add(item.id)); addButton.addEventListener('click', () => add(item.id));
      controls.append(minus, count, plus, addButton); row.append(name, controls); catalogList.append(row);
    }
  }

  function refreshCart() {
    cartList.replaceChildren();
    for (const line of selected.values()) {
      const definition = coreEquipmentById[line.definitionId]; if (!definition) continue;
      const row = document.createElement('div'); row.className = 'equipment-cart-row';
      const name = document.createElement('strong'); name.textContent = equipmentLabel(definition.printedName, definition.id);
      const quantity = inputNumber(line.quantity, 1); quantity.className = 'equipment-quantity';
      const price = inputNumber(line.agreedUnitPriceCp); price.className = 'equipment-price';
      const unit = document.createElement('span'); unit.textContent = '数量';
      const priceLabel = document.createElement('span'); priceLabel.textContent = '实际单价（铜币）';
      const removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.textContent = '移除';
      quantity.addEventListener('input', () => { const next = Math.floor(Number(quantity.value)); if (Number.isSafeInteger(next) && next > 0) selected.set(line.definitionId, { ...line, quantity: next }); refreshCatalog(); updateTotals(); });
      price.addEventListener('input', () => { const next = Math.floor(Number(price.value)); if (Number.isSafeInteger(next) && next >= 0) selected.set(line.definitionId, { ...line, agreedUnitPriceCp: next }); updateTotals(); });
      removeButton.addEventListener('click', () => remove(line.definitionId));
      const quantityWrap = document.createElement('label'); quantityWrap.append(unit, quantity);
      const priceWrap = document.createElement('label'); priceWrap.append(priceLabel, price);
      row.append(name, quantityWrap, priceWrap, removeButton); cartList.append(row);
    }
    if (!selected.size) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = '还没有选择装备。'; cartList.append(empty); }
    updateTotals(); refreshCatalog();
  }

  function actualCostCp() { return [...selected.values()].reduce((sum, line) => sum + line.quantity * line.agreedUnitPriceCp, 0); }
  function updateTotals() {
    const cost = actualCostCp();
    if (!tenderTouched) tender.value = String(Math.ceil(cost / coinValueCp.gp));
    const tenderGp = Math.max(0, Math.floor(Number(tender.value) || 0)); const changeCp = tenderGp * coinValueCp.gp - cost;
    change.value = String(Math.max(0, changeCp));
    total.textContent = `合计：${priceText(cost)} · 起始金钱：${startingMoneyGp} 金币 · ${changeCp >= 0 ? `找零 ${changeCp} 铜币` : `还差 ${Math.abs(changeCp)} 铜币`}`;
    record.disabled = !selected.size || cost <= 0 || changeCp < 0 || tenderGp > startingMoneyGp;
  }

  search.addEventListener('input', refreshCatalog); category.addEventListener('change', refreshCatalog); tender.addEventListener('input', () => { tenderTouched = true; updateTotals(); });
  record.addEventListener('click', () => {
    try {
      const current = read(); if (!current) throw new Error('请先完成核心资格检查。');
      const money = current.tasks.find(task => task.id === 'money'); const gp = money?.facts?.gp;
      if (money?.status !== 'complete' || typeof gp !== 'number' || !Number.isSafeInteger(gp)) throw new Error('请先记录可用的起始金钱。');
      const eventId = crypto.randomUUID(); const lines: PurchaseLine[] = [...selected.values()].map((line, index) => ({ instanceId: `${eventId}:${index}`, definitionId: line.definitionId, quantity: line.quantity, destinationLocationId: 'character', agreedUnitPriceCp: line.agreedUnitPriceCp, availability: { status: 'unresolved', decisionId: null }, bulk: 'unknown', bulkRulingId: null }));
      const actual = actualCostCp(); const tenderGp = Math.floor(Number(tender.value)); const changeCp = tenderGp * coinValueCp.gp - actual;
      const ledger = createCorePlayerStartingInventory({ eventId, startingMoneyGp: gp, tenderGp, changeCp, lines });
      write(recordCreationTask(current, 'equipment', { status: 'complete', sourceIds: ['phb:35:money-equipment', 'phb:36:equipment-armor', 'phb:37:weapon-weight'], note: '已将玩家记录的初始物品与剩余钱币写入人物卡；供应、负重和携带细节仍保留原始事实，不在本站伪造 DM 审核。', facts: { purchasePlan: { lines, tenderGp, changeCp, actualCostCp: actual }, ledger, startingMoneyRevision: current.revision } }));
      status.textContent = `已记录 ${lines.length} 类初始装备，共 ${priceText(actual)}；人物卡会直接显示这些物品。`;
    } catch (error) { status.textContent = (error as Error).message; }
  });
  refreshCart();
}
