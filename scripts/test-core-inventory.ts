import assert from 'node:assert/strict';
import {
  coinValueCp,
  coreEquipmentById,
  coreEquipmentCatalog,
  encumbranceGuidelines,
} from '../src/character/rules/core-inventory';
import {
  assessCoreEncumbranceGuideline,
  commitCorePurchase,
  moneyValueCp,
  recordCoreEncumbranceRuling,
  relocateInventoryItem,
  validateCoreInventoryLedger,
  unpackCoreInventoryBundle,
  consumeCoreInventoryItem,
  type CoinCounts,
  type CoreInventoryLedger,
} from '../src/character/engine/core-inventory';

const coins = (partial: Partial<CoinCounts> = {}): CoinCounts => ({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...partial });
assert.deepEqual(coinValueCp, { cp: 1, sp: 10, ep: 100, gp: 200, pp: 1000 });
assert.equal(moneyValueCp(coins({ cp: 200, sp: 20, ep: 2, gp: 1, pp: 1 })), 1800);
assert.deepEqual(encumbranceGuidelines.map((row) => row.movementInches), [[12], [9], [6], [3, 4]]);

// Catalog spot checks come from visually checked PHB pp.35-37.  Unknown weights
// remain unknown when a price package and p.37 weapon row do not match exactly.
assert.ok(coreEquipmentCatalog.length > 140);
assert.equal(new Set(coreEquipmentCatalog.map((entry) => entry.id)).size, coreEquipmentCatalog.length);
assert.equal(coreEquipmentById['rope-fifty-foot'].listPriceCp, 40);
assert.equal(coreEquipmentById.torch.listPriceCp, 1);
assert.equal(coreEquipmentById['rations-iron-week'].listPriceCp, 1000);
assert.equal(coreEquipmentById['skin-water-wine'].listPriceCp, 150);
assert.equal(coreEquipmentById['arrow-normal-dozen'].listPriceCp, 200);
assert.equal(coreEquipmentById['arrow-normal-dozen'].approximateWeightGp, 24);
assert.equal(coreEquipmentById['quarrel-heavy-score'].approximateWeightGp, 40);
assert.equal(coreEquipmentById['axe-battle'].approximateWeightGp, 75);
assert.equal(coreEquipmentById.spear.approximateWeightGp, null, '40-60 must not be collapsed to an invented scalar');
assert.equal(coreEquipmentById.lance.approximateWeightGp, null, 'generic price entry does not choose a lance type');
assert.equal(coreEquipmentById['dagger-scabbard'].approximateWeightGp, null, 'weapon-only weight is not a package weight');
assert.equal(coreEquipmentById['sling-bullets-dozen'].approximateWeightGp, null, 'unlisted sling weight keeps package unknown');

const initial: CoreInventoryLedger = {
  revision: 7,
  locations: [
    { id: 'hero', kind: 'character', label: 'Hero', parentLocationId: null },
    { id: 'pack', kind: 'container', label: 'Leather backpack', parentLocationId: 'hero' },
    { id: 'store', kind: 'storage', label: 'Inn strongbox', parentLocationId: null },
  ],
  items: [],
  wallets: [{ id: 'belt-purse', label: 'Belt purse', locationId: 'hero', coins: coins({ gp: 100 }) }],
};
validateCoreInventoryLedger(initial);
const initialSnapshot = JSON.stringify(initial);

const purchase = commitCorePurchase({
  ledger: initial,
  eventId: 'purchase-1',
  expectedRevision: 7,
  walletId: 'belt-purse',
  lines: [
    {
      instanceId: 'rope-1', definitionId: 'rope-fifty-foot', quantity: 1,
      destinationLocationId: 'pack', agreedUnitPriceCp: 80,
      availability: { status: 'dm-approved', decisionId: 'dm-market-1' },
      bulk: 'unknown', bulkRulingId: null,
    },
    {
      instanceId: 'arrows-1', definitionId: 'arrow-normal-dozen', quantity: 1,
      destinationLocationId: 'pack', agreedUnitPriceCp: 200,
      availability: { status: 'dm-approved', decisionId: 'dm-market-2' },
      bulk: 'ordinary', bulkRulingId: 'dm-bulk-1',
    },
  ],
  tender: coins({ gp: 2 }),
  change: coins({ sp: 12 }),
});
assert.equal(JSON.stringify(initial), initialSnapshot, 'planning/commit must not mutate the caller ledger');
assert.equal(purchase.receipt.actualCostCp, 280);
assert.equal(purchase.receipt.listPriceReferenceCp, 240, 'reference price is reported but did not overwrite the agreed price');
assert.equal(purchase.receipt.tenderCp - purchase.receipt.changeCp, purchase.receipt.actualCostCp);
assert.equal(purchase.next.revision, 8);
assert.deepEqual(purchase.next.wallets[0].coins, coins({ sp: 12, gp: 98 }));
assert.equal(moneyValueCp(purchase.next.wallets[0].coins), moneyValueCp(initial.wallets[0].coins) - 280);
assert.equal(purchase.next.items.find((item) => item.id === 'rope-1')?.weight.kind, 'unknown');
assert.deepEqual(purchase.next.items.find((item) => item.id === 'arrows-1')?.weight, {
  kind: 'approximate', unitWeightGp: 24, sourceId: 'phb:37:weapon-weight',
});

const assessment = assessCoreEncumbranceGuideline({ ledger: purchase.next, carrierLocationId: 'hero' });
const unpacked=unpackCoreInventoryBundle({ledger:purchase.next,itemId:'arrows-1',bundleCount:1,pieceInstanceId:'single-arrows',eventId:'unpack-arrows',expectedRevision:purchase.next.revision});
const arrows=unpacked.items.find(item=>item.id==='single-arrows')!;
assert.equal(arrows.quantity,12);assert.equal(arrows.definitionId,null);assert.equal(arrows.bulk,'unknown');
assert.deepEqual(arrows.weight,{kind:'approximate',unitWeightGp:2,sourceId:'phb:37:weapon-weight'});
assert.equal(assessCoreEncumbranceGuideline({ledger:unpacked,carrierLocationId:'hero'}).knownWeightGp,assessment.knownWeightGp);
const fired=consumeCoreInventoryItem({ledger:unpacked,itemId:'single-arrows',quantity:1,expectedRevision:unpacked.revision});
assert.equal(fired.items.find(item=>item.id==='single-arrows')!.quantity,11);
assert.equal(assessCoreEncumbranceGuideline({ledger:fired,carrierLocationId:'hero'}).knownWeightGp,assessment.knownWeightGp-2);
assert.equal(unpacked.items.find(item=>item.id==='single-arrows')!.quantity,12);
assert.throws(()=>unpackCoreInventoryBundle({ledger:purchase.next,itemId:'rope-1',bundleCount:1,pieceInstanceId:'rope-pieces',eventId:'bad-unpack',expectedRevision:purchase.next.revision}),/homogeneous/);
assert.equal(assessment.status, 'guideline-only-needs-dm');
assert.equal(assessment.knownWeightGp, 134, '110 equal-weight coins plus 24 gp-weight arrows');
assert.deepEqual(assessment.knownWeightPounds, { numerator: 134, denominator: 10 });
assert.deepEqual(assessment.unknownWeightItemIds, ['rope-1']);
assert.deepEqual(assessment.bulkReviewItemIds, ['rope-1']);
assert.equal(assessment.weightOnlyBand, 'normal');
assert.equal(assessment.requiresStrengthReview, true);
const ruling = recordCoreEncumbranceRuling({
  assessment,
  rulingId: 'dm-enc-1',
  movementInches: 9,
  reactionInitiative: 'normal-no-bonuses',
  scope: 'Until equipment or carried coin changes',
});
assert.equal(ruling.status, 'dm-ruled');
assert.deepEqual(ruling.unresolvedWeightItemIds, ['rope-1']);

const moved = relocateInventoryItem({ ledger: purchase.next, itemId: 'arrows-1', destinationLocationId: 'store', expectedRevision: 8 });
assert.equal(moved.revision, 9);
assert.deepEqual(assessCoreEncumbranceGuideline({ ledger: moved, carrierLocationId: 'hero' }).includedItemIds, ['rope-1']);
assert.equal(purchase.next.items.find((item) => item.id === 'arrows-1')?.locationId, 'pack', 'relocation must not mutate the source ledger');

assert.throws(() => commitCorePurchase({
  ledger: initial, eventId: 'purchase-unresolved', expectedRevision: 7, walletId: 'belt-purse',
  lines: [{
    instanceId: 'torch-1', definitionId: 'torch', quantity: 1, destinationLocationId: 'pack', agreedUnitPriceCp: 1,
    availability: { status: 'unresolved', decisionId: null }, bulk: 'unknown', bulkRulingId: null,
  }],
  tender: coins({ cp: 1 }), change: coins(),
}), /not DM-approved/);
assert.throws(() => commitCorePurchase({
  ledger: initial, eventId: 'purchase-bad-conservation', expectedRevision: 7, walletId: 'belt-purse',
  lines: [{
    instanceId: 'torch-2', definitionId: 'torch', quantity: 1, destinationLocationId: 'pack', agreedUnitPriceCp: 1,
    availability: { status: 'dm-approved', decisionId: 'dm-market-3' }, bulk: 'unknown', bulkRulingId: null,
  }],
  tender: coins({ gp: 1 }), change: coins(),
}), /conservation failed/);
assert.throws(() => commitCorePurchase({
  ledger: initial, eventId: 'purchase-no-coins', expectedRevision: 7, walletId: 'belt-purse',
  lines: [{
    instanceId: 'plate-1', definitionId: 'armor-plate', quantity: 1, destinationLocationId: 'hero', agreedUnitPriceCp: 80000,
    availability: { status: 'dm-approved', decisionId: 'dm-market-4' }, bulk: 'bulky', bulkRulingId: 'dm-bulk-2',
  }],
  tender: coins({ gp: 400 }), change: coins(),
}), /Insufficient gp/);
assert.throws(() => relocateInventoryItem({ ledger: initial, itemId: 'missing', destinationLocationId: 'hero', expectedRevision: 7 }), /Unknown item/);

const cycle: CoreInventoryLedger = {
  revision: 0,
  locations: [
    { id: 'a', kind: 'container', label: 'A', parentLocationId: 'b' },
    { id: 'b', kind: 'container', label: 'B', parentLocationId: 'a' },
  ],
  items: [], wallets: [],
};
assert.throws(() => validateCoreInventoryLedger(cycle), /cycle/);

const heavy: CoreInventoryLedger = {
  revision: 0,
  locations: [{ id: 'carrier', kind: 'character', label: 'Carrier', parentLocationId: null }],
  items: [{
    id: 'known-load', definitionId: null, label: 'DM-weighed load', quantity: 1, locationId: 'carrier',
    weight: { kind: 'verified', unitWeightGp: 1051, evidenceId: 'table-ruling-1' },
    bulk: 'ordinary', bulkRulingId: 'table-ruling-2', acquiredByEventId: 'grant-1',
  }],
  wallets: [],
};
assert.equal(assessCoreEncumbranceGuideline({ ledger: heavy, carrierLocationId: 'carrier' }).weightOnlyBand, 'encumbered');
assert.deepEqual(assessCoreEncumbranceGuideline({ ledger: heavy, carrierLocationId: 'carrier' }).movementReferenceInches, [3, 4]);

console.log(`PASS: ${coreEquipmentCatalog.length} PHB price entries; integer-cp money, atomic purchase conservation, instances/locations, equal-weight coins, lower-bound burden, 3-4 inch range, and explicit DM supply/bulk/strength rulings.`);
