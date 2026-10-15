import {
  coinValueCp,
  coinWeightGpPerCoin,
  coreEquipmentById,
  type CoinDenomination,
  type CoreInventorySourceId,
} from '../rules/core-inventory';

export interface CoinCounts {
  readonly cp: number;
  readonly sp: number;
  readonly ep: number;
  readonly gp: number;
  readonly pp: number;
}
export interface InventoryLocation {
  readonly id: string;
  readonly kind: 'character' | 'container' | 'worn' | 'mount' | 'companion' | 'storage' | 'other';
  readonly label: string;
  /** A structural containment edge only; it does not prove capacity or accessibility. */
  readonly parentLocationId: string | null;
}

export type ItemWeightFact =
  | { readonly kind: 'approximate'; readonly unitWeightGp: number; readonly sourceId: 'phb:37:weapon-weight' }
  | { readonly kind: 'verified'; readonly unitWeightGp: number; readonly evidenceId: string }
  | { readonly kind: 'magic-armor-negated'; readonly unitWeightGp: 0; readonly rulingId: string; readonly sourceId: 'phb:36:equipment-armor' }
  | { readonly kind: 'unknown' };

export interface InventoryItemInstance {
  readonly id: string;
  readonly definitionId: string | null;
  readonly label: string;
  readonly quantity: number;
  readonly locationId: string;
  readonly weight: ItemWeightFact;
  /** Bulk remains a separate fact because weight alone cannot settle PHB encumbrance. */
  readonly bulk: 'ordinary' | 'bulky' | 'very-bulky' | 'unknown';
  readonly bulkRulingId: string | null;
  readonly acquiredByEventId: string;
}

export interface CoinWallet {
  readonly id: string;
  readonly label: string;
  readonly locationId: string;
  readonly coins: CoinCounts;
}

export interface CoreInventoryLedger {
  readonly revision: number;
  readonly locations: readonly InventoryLocation[];
  readonly items: readonly InventoryItemInstance[];
  readonly wallets: readonly CoinWallet[];
}

export interface PurchaseLine {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly quantity: number;
  readonly destinationLocationId: string;
  /** Actual table agreement, never silently filled from the PHB reference price. */
  readonly agreedUnitPriceCp: number;
  readonly availability: {
    readonly status: 'dm-approved' | 'unresolved' | 'unavailable';
    readonly decisionId: string | null;
  };
  readonly bulk: 'ordinary' | 'bulky' | 'very-bulky' | 'unknown';
  readonly bulkRulingId: string | null;
}

const denominations = Object.freeze(['cp', 'sp', 'ep', 'gp', 'pp'] as const);

function requireId(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must be a non-empty identifier.`);
}

function requireWhole(value: number, label: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be a safe integer >= ${minimum}.`);
  }
}

function safeAdd(left: number, right: number, label: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new Error(`${label} exceeds the safe integer range.`);
  return result;
}

function safeMultiply(left: number, right: number, label: string): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) throw new Error(`${label} exceeds the safe integer range.`);
  return result;
}

export function emptyCoins(): CoinCounts {
  return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
}

export function moneyValueCp(coins: CoinCounts): number {
  let total = 0;
  for (const denomination of denominations) {
    requireWhole(coins[denomination], `${denomination} coin count`);
    total = safeAdd(total, safeMultiply(coins[denomination], coinValueCp[denomination], 'coin value'), 'coin total');
  }
  return total;
}

export function coinCount(coins: CoinCounts): number {
  return denominations.reduce((total, denomination) => {
    requireWhole(coins[denomination], `${denomination} coin count`);
    return safeAdd(total, coins[denomination], 'coin count');
  }, 0);
}

export function validateCoreInventoryLedger(ledger: CoreInventoryLedger): void {
  requireWhole(ledger.revision, 'ledger revision');
  const locationIds = new Set<string>();
  for (const location of ledger.locations) {
    requireId(location.id, 'location id');
    if (locationIds.has(location.id)) throw new Error(`Duplicate location id: ${location.id}.`);
    locationIds.add(location.id);
  }
  for (const location of ledger.locations) {
    if (location.parentLocationId !== null && !locationIds.has(location.parentLocationId)) {
      throw new Error(`Unknown parent location: ${location.parentLocationId}.`);
    }
    const seen = new Set<string>([location.id]);
    let cursor = location.parentLocationId;
    while (cursor !== null) {
      if (seen.has(cursor)) throw new Error(`Location containment cycle involving ${location.id}.`);
      seen.add(cursor);
      cursor = ledger.locations.find((candidate) => candidate.id === cursor)?.parentLocationId ?? null;
    }
  }

  const itemIds = new Set<string>();
  for (const item of ledger.items) {
    requireId(item.id, 'item instance id');
    if (itemIds.has(item.id)) throw new Error(`Duplicate item instance id: ${item.id}.`);
    itemIds.add(item.id);
    requireWhole(item.quantity, `quantity for ${item.id}`, 1);
    if (!locationIds.has(item.locationId)) throw new Error(`Unknown item location: ${item.locationId}.`);
    if (item.definitionId !== null && !coreEquipmentById[item.definitionId]) throw new Error(`Unknown item definition: ${item.definitionId}.`);
    if (item.weight.kind !== 'unknown') requireWhole(item.weight.unitWeightGp, `weight for ${item.id}`);
    if (item.weight.kind === 'verified') requireId(item.weight.evidenceId, `weight evidence for ${item.id}`);
    if (item.weight.kind === 'magic-armor-negated') {
      requireId(item.weight.rulingId, `magic armor ruling for ${item.id}`);
      if (item.definitionId === null || coreEquipmentById[item.definitionId]?.category !== 'armor') {
        throw new Error(`Magic-armor weight exemption cannot be attached to non-armor item ${item.id}.`);
      }
    }
    if (item.bulk !== 'unknown' && item.bulkRulingId === null) {
      throw new Error(`Non-unknown bulk for ${item.id} requires an explicit ruling/evidence id.`);
    }
  }

  const walletIds = new Set<string>();
  for (const wallet of ledger.wallets) {
    requireId(wallet.id, 'wallet id');
    if (walletIds.has(wallet.id)) throw new Error(`Duplicate wallet id: ${wallet.id}.`);
    walletIds.add(wallet.id);
    if (!locationIds.has(wallet.locationId)) throw new Error(`Unknown wallet location: ${wallet.locationId}.`);
    moneyValueCp(wallet.coins);
  }
}

function subtractCoins(wallet: CoinCounts, tender: CoinCounts, change: CoinCounts): CoinCounts {
  const next = emptyCoins() as Record<CoinDenomination, number>;
  for (const denomination of denominations) {
    requireWhole(tender[denomination], `${denomination} tender`);
    requireWhole(change[denomination], `${denomination} change`);
    if (tender[denomination] > wallet[denomination]) throw new Error(`Insufficient ${denomination} coins in the selected wallet.`);
    next[denomination] = safeAdd(wallet[denomination] - tender[denomination], change[denomination], `${denomination} post-purchase balance`);
  }
  return next as unknown as CoinCounts;
}

export function spendCoreWallet(input:{ledger:CoreInventoryLedger;walletId:string;amountCp:number;tender:CoinCounts;change:CoinCounts}):CoreInventoryLedger{
  validateCoreInventoryLedger(input.ledger);requireWhole(input.amountCp,'expense cp',1);
  const wallet=input.ledger.wallets.find(item=>item.id===input.walletId);if(!wallet)throw new Error('Expense wallet not found.');
  if(moneyValueCp(input.tender)-moneyValueCp(input.change)!==input.amountCp)throw new Error('Expense tender and change do not match the payment.');
  const coins=subtractCoins(wallet.coins,input.tender,input.change);
  const next={...structuredClone(input.ledger),revision:input.ledger.revision+1,wallets:input.ledger.wallets.map(item=>item.id===wallet.id?{...structuredClone(item),coins}:structuredClone(item))};
  validateCoreInventoryLedger(next);return next;
}
export function receiveCoreWallet(input:{ledger:CoreInventoryLedger;walletId:string;coins:CoinCounts}):CoreInventoryLedger{
  validateCoreInventoryLedger(input.ledger);if(moneyValueCp(input.coins)<=0)throw new Error('Income must contain positive coin value.');
  const wallet=input.ledger.wallets.find(item=>item.id===input.walletId);if(!wallet)throw new Error('Income wallet not found.');
  const coins=Object.fromEntries(denominations.map(id=>[id,safeAdd(wallet.coins[id],input.coins[id],`${id} income`)])) as unknown as CoinCounts;
  const next={...structuredClone(input.ledger),revision:input.ledger.revision+1,wallets:input.ledger.wallets.map(item=>item.id===wallet.id?{...structuredClone(item),coins}:structuredClone(item))};validateCoreInventoryLedger(next);return next;
}

/**
 * Atomically commits an actual, DM-approved purchase.  PHB list prices are
 * reported for comparison only; agreed prices, availability, tender and change
 * are explicit facts.
 */
export function commitCorePurchase(input: {
  readonly ledger: CoreInventoryLedger;
  readonly eventId: string;
  readonly expectedRevision: number;
  readonly walletId: string;
  readonly lines: readonly PurchaseLine[];
  readonly tender: CoinCounts;
  readonly change: CoinCounts;
}) {
  validateCoreInventoryLedger(input.ledger);
  requireId(input.eventId, 'purchase event id');
  requireWhole(input.expectedRevision, 'expected revision');
  if (input.expectedRevision !== input.ledger.revision) throw new Error('Ledger revision conflict.');
  if (input.lines.length === 0) throw new Error('A purchase requires at least one line.');
  const wallet = input.ledger.wallets.find((candidate) => candidate.id === input.walletId);
  if (!wallet) throw new Error(`Unknown wallet: ${input.walletId}.`);
  const existingItemIds = new Set(input.ledger.items.map((item) => item.id));
  const newItemIds = new Set<string>();
  let actualCostCp = 0;
  let listPriceReferenceCp = 0;
  const priceSourceIds = new Set<CoreInventorySourceId>();
  const createdItems: InventoryItemInstance[] = [];

  for (const line of input.lines) {
    requireId(line.instanceId, 'new item instance id');
    if (existingItemIds.has(line.instanceId) || newItemIds.has(line.instanceId)) throw new Error(`Duplicate item instance id: ${line.instanceId}.`);
    newItemIds.add(line.instanceId);
    const definition = coreEquipmentById[line.definitionId];
    if (!definition) throw new Error(`Unknown core equipment definition: ${line.definitionId}.`);
    requireWhole(line.quantity, `purchase quantity for ${line.instanceId}`, 1);
    requireWhole(line.agreedUnitPriceCp, `agreed price for ${line.instanceId}`);
    if (!input.ledger.locations.some((location) => location.id === line.destinationLocationId)) {
      throw new Error(`Unknown purchase destination: ${line.destinationLocationId}.`);
    }
    if (line.availability.status !== 'dm-approved' || !line.availability.decisionId?.trim()) {
      throw new Error(`Supply for ${line.definitionId} is not DM-approved.`);
    }
    if (line.bulk !== 'unknown' && !line.bulkRulingId?.trim()) {
      throw new Error(`Bulk classification for ${line.instanceId} requires a ruling/evidence id.`);
    }
    actualCostCp = safeAdd(actualCostCp, safeMultiply(line.agreedUnitPriceCp, line.quantity, 'purchase line cost'), 'purchase cost');
    listPriceReferenceCp = safeAdd(listPriceReferenceCp, safeMultiply(definition.listPriceCp, line.quantity, 'list-price reference'), 'list-price reference');
    priceSourceIds.add(definition.priceSourceId);
    createdItems.push({
      id: line.instanceId,
      definitionId: definition.id,
      label: definition.printedName,
      quantity: line.quantity,
      locationId: line.destinationLocationId,
      weight: definition.approximateWeightGp === null
        ? { kind: 'unknown' }
        : { kind: 'approximate', unitWeightGp: definition.approximateWeightGp, sourceId: 'phb:37:weapon-weight' },
      bulk: line.bulk,
      bulkRulingId: line.bulkRulingId,
      acquiredByEventId: input.eventId,
    });
  }

  const tenderCp = moneyValueCp(input.tender);
  const changeCp = moneyValueCp(input.change);
  if (tenderCp - changeCp !== actualCostCp) {
    throw new Error('Purchase conservation failed: tender minus change must equal the agreed line total.');
  }
  const nextCoins = subtractCoins(wallet.coins, input.tender, input.change);
  const next: CoreInventoryLedger = {
    revision: input.ledger.revision + 1,
    locations: input.ledger.locations.map((location) => ({ ...location })),
    items: [...input.ledger.items.map((item) => ({ ...item, weight: { ...item.weight } })), ...createdItems],
    wallets: input.ledger.wallets.map((candidate) => candidate.id === wallet.id
      ? { ...candidate, coins: nextCoins }
      : { ...candidate, coins: { ...candidate.coins } }),
  };
  validateCoreInventoryLedger(next);
  return {
    status: 'committed' as const,
    next,
    receipt: {
      eventId: input.eventId,
      fromRevision: input.ledger.revision,
      toRevision: next.revision,
      walletId: wallet.id,
      actualCostCp,
      listPriceReferenceCp,
      tenderCp,
      changeCp,
      createdItemIds: createdItems.map((item) => item.id),
      sourceIds: [...priceSourceIds],
    },
  };
}

/** Moves one whole instance. Splitting a stack must be a separate, audited event. */
export function relocateInventoryItem(input: {
  readonly ledger: CoreInventoryLedger;
  readonly itemId: string;
  readonly destinationLocationId: string;
  readonly expectedRevision: number;
}) : CoreInventoryLedger {
  validateCoreInventoryLedger(input.ledger);
  if (input.expectedRevision !== input.ledger.revision) throw new Error('Ledger revision conflict.');
  if (!input.ledger.locations.some((location) => location.id === input.destinationLocationId)) throw new Error('Unknown destination location.');
  if (!input.ledger.items.some((item) => item.id === input.itemId)) throw new Error('Unknown item instance.');
  const next: CoreInventoryLedger = {
    revision: input.ledger.revision + 1,
    locations: input.ledger.locations.map((location) => ({ ...location })),
    items: input.ledger.items.map((item) => item.id === input.itemId ? { ...item, locationId: input.destinationLocationId } : { ...item }),
    wallets: input.ledger.wallets.map((wallet) => ({ ...wallet, coins: { ...wallet.coins } })),
  };
  validateCoreInventoryLedger(next);
  return next;
}

function descendantLocationIds(ledger: CoreInventoryLedger, rootLocationId: string): Set<string> {
  if (!ledger.locations.some((location) => location.id === rootLocationId)) throw new Error('Unknown carrier location.');
  const carried = new Set<string>([rootLocationId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const location of ledger.locations) {
      if (location.parentLocationId !== null && carried.has(location.parentLocationId) && !carried.has(location.id)) {
        carried.add(location.id);
        changed = true;
      }
    }
  }
  return carried;
}

export function assessCoreEncumbranceGuideline(input: {
  readonly ledger: CoreInventoryLedger;
  readonly carrierLocationId: string;
}) {
  validateCoreInventoryLedger(input.ledger);
  const carried = descendantLocationIds(input.ledger, input.carrierLocationId);
  let knownWeightGp = 0;
  const unknownWeightItemIds: string[] = [];
  const bulkReviewItemIds: string[] = [];
  const includedItemIds: string[] = [];
  const includedWalletIds: string[] = [];

  for (const item of input.ledger.items) {
    if (!carried.has(item.locationId)) continue;
    includedItemIds.push(item.id);
    if (item.weight.kind === 'unknown') unknownWeightItemIds.push(item.id);
    else knownWeightGp = safeAdd(knownWeightGp, safeMultiply(item.weight.unitWeightGp, item.quantity, `weight for ${item.id}`), 'known carried weight');
    if (item.bulk !== 'ordinary') bulkReviewItemIds.push(item.id);
  }
  for (const wallet of input.ledger.wallets) {
    if (!carried.has(wallet.locationId)) continue;
    includedWalletIds.push(wallet.id);
    knownWeightGp = safeAdd(knownWeightGp, safeMultiply(coinCount(wallet.coins), coinWeightGpPerCoin, 'coin weight'), 'known carried weight');
  }

  const weightOnlyBand = knownWeightGp > 1050
    ? 'encumbered'
    : knownWeightGp > 700
      ? 'very-heavy'
      : knownWeightGp > 350
        ? 'heavy'
        : 'normal';
  const movementReference = weightOnlyBand === 'encumbered' ? [3, 4] : weightOnlyBand === 'very-heavy' ? [6] : weightOnlyBand === 'heavy' ? [9] : [12];
  return {
    status: 'guideline-only-needs-dm' as const,
    carrierLocationId: input.carrierLocationId,
    knownWeightGp,
    knownWeightPounds: { numerator: knownWeightGp, denominator: 10 },
    weightOnlyBand,
    movementReferenceInches: movementReference,
    includedItemIds,
    includedWalletIds,
    unknownWeightItemIds,
    bulkReviewItemIds,
    requiresStrengthReview: true,
    reasons: [
      'PHB thresholds are approximate guidelines rather than exact carrying-capacity cutoffs.',
      'Strength modifies the guidelines, but the cited passage does not supply a universal adjustment algorithm.',
      'Bulk, shape and ready accessibility remain material even when every weight is known.',
      ...(unknownWeightItemIds.length ? ['Known weight is only a lower bound because one or more carried item weights are unknown.'] : []),
    ],
    sourceIds: ['phb:101-102:encumbrance'] as readonly CoreInventorySourceId[],
  };
}

export function recordCoreEncumbranceRuling(input: {
  readonly assessment: ReturnType<typeof assessCoreEncumbranceGuideline>;
  readonly rulingId: string;
  readonly movementInches: number;
  readonly reactionInitiative: 'normal-or-better' | 'normal-no-bonuses' | 'slowed' | 'slowed-greatly' | 'other';
  readonly scope: string;
}) {
  requireId(input.rulingId, 'encumbrance ruling id');
  requireId(input.scope, 'encumbrance ruling scope');
  requireWhole(input.movementInches, 'ruled movement', 1);
  return {
    status: 'dm-ruled' as const,
    rulingId: input.rulingId,
    scope: input.scope,
    movementInches: input.movementInches,
    reactionInitiative: input.reactionInitiative,
    assessedAtKnownWeightGp: input.assessment.knownWeightGp,
    unresolvedWeightItemIds: [...input.assessment.unknownWeightItemIds],
    reviewedBulkItemIds: [...input.assessment.bulkReviewItemIds],
    sourceIds: ['phb:101-102:encumbrance'] as readonly CoreInventorySourceId[],
  };
}
