/**
 * AD&D 1e core money/equipment facts which are safe to expose to the ledger.
 *
 * Prices are reference prices, not a promise that an item is available or that a
 * merchant will accept that price.  Weapon weights are the PHB's approximate
 * gold-piece weights; most other equipment has no weight in the cited pages and
 * therefore remains unknown.
 */
export const coreInventorySources = Object.freeze({
  'phb:35:money-equipment': Object.freeze({
    book: 'PHB', printedPages: [35] as const, pdfPages: [36] as const,
    section: 'Money; Equipping the Character; Basic Equipment and Supplies Costs',
    status: 'verified-text-and-page-image' as const,
  }),
  'phb:36:equipment-armor': Object.freeze({
    book: 'PHB', printedPages: [36] as const, pdfPages: [37] as const,
    section: 'Basic Equipment and Supplies Costs; Armor',
    status: 'verified-text-and-page-image' as const,
  }),
  'phb:37:weapon-weight': Object.freeze({
    book: 'PHB', printedPages: [37] as const, pdfPages: [38] as const,
    section: 'Weight and Damage by Weapon Type',
    status: 'verified-text-and-page-image' as const,
  }),
  'phb:38:weapon-general-data': Object.freeze({
    book: 'PHB', printedPages: [38] as const, pdfPages: [39] as const,
    section: 'Weapon Types, General Data, and To Hit Adjustments',
    status: 'verified-page-image-not-used-for-inventory-calculation' as const,
  }),
  'phb:101-102:encumbrance': Object.freeze({
    book: 'PHB', printedPages: [101, 102] as const, pdfPages: [102, 103] as const,
    section: 'Encumbrance; Movement - Time and Distance Factors',
    status: 'verified-text-and-page-image' as const,
  }),
});

export type CoreInventorySourceId = keyof typeof coreInventorySources;
export type CoinDenomination = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

/** Copper pieces are the indivisible accounting unit. */
export const coinValueCp: Readonly<Record<CoinDenomination, number>> = Object.freeze({
  cp: 1,
  sp: 10,
  ep: 100,
  gp: 200,
  pp: 1000,
});

/** The PHB says coins of every denomination are relatively equal in size/weight. */
export const coinWeightGpPerCoin = 1;

export const encumbranceGuidelines = Object.freeze([
  Object.freeze({ id: 'normal', aboutPounds: 35, aboutWeightGp: 350, movementInches: Object.freeze([12] as const), reactionInitiative: 'normal-or-better' as const }),
  Object.freeze({ id: 'heavy', aboutPounds: 70, aboutWeightGp: 700, movementInches: Object.freeze([9] as const), reactionInitiative: 'normal-no-bonuses' as const }),
  Object.freeze({ id: 'very-heavy', aboutPounds: 105, aboutWeightGp: 1050, movementInches: Object.freeze([6] as const), reactionInitiative: 'slowed' as const }),
  Object.freeze({ id: 'encumbered', overPounds: 105, overWeightGp: 1050, movementInches: Object.freeze([3, 4] as const), reactionInitiative: 'slowed-greatly' as const }),
] as const);

export type CoreEquipmentCategory =
  | 'armor' | 'arms' | 'clothing' | 'herbs' | 'livestock'
  | 'miscellaneous' | 'provisions' | 'religious' | 'tack-harness' | 'transport';

export interface CoreEquipmentDefinition {
  readonly id: string;
  readonly printedName: string;
  readonly category: CoreEquipmentCategory;
  /** Price of one catalog purchase unit, in copper pieces. */
  readonly listPriceCp: number;
  readonly purchaseUnit: string;
  /** Number of physical pieces in one purchase unit, when the listing is a bundle. */
  readonly piecesPerPurchaseUnit: number;
  /** Approximate total weight of one purchase unit in PHB gold-piece weight units. */
  readonly approximateWeightGp: number | null;
  readonly priceSourceId: 'phb:35:money-equipment' | 'phb:36:equipment-armor';
  readonly weightSourceId: 'phb:37:weapon-weight' | null;
}

type PriceUnit = 'cp' | 'sp' | 'gp';
const cp = (amount: number, unit: PriceUnit): number => amount * coinValueCp[unit];
const equipment = (
  id: string,
  printedName: string,
  category: CoreEquipmentCategory,
  amount: number,
  priceUnit: PriceUnit,
  page: 35 | 36,
  options: { purchaseUnit?: string; pieces?: number; pieceWeightGp?: number | null } = {},
): CoreEquipmentDefinition => {
  const pieces = options.pieces ?? 1;
  const pieceWeight = options.pieceWeightGp ?? null;
  return Object.freeze({
    id,
    printedName,
    category,
    listPriceCp: cp(amount, priceUnit),
    purchaseUnit: options.purchaseUnit ?? 'one',
    piecesPerPurchaseUnit: pieces,
    approximateWeightGp: pieceWeight === null ? null : pieceWeight * pieces,
    priceSourceId: page === 35 ? 'phb:35:money-equipment' : 'phb:36:equipment-armor',
    weightSourceId: pieceWeight === null ? null : 'phb:37:weapon-weight',
  });
};

const catalog = [
  // PHB p.35 - armor.
  equipment('armor-banded', 'Banded', 'armor', 90, 'gp', 35),
  equipment('armor-chain', 'Chain', 'armor', 75, 'gp', 35),
  equipment('helmet-great', 'Helmet, great', 'armor', 15, 'gp', 35),
  equipment('helmet-small', 'Helmet, small', 'armor', 10, 'gp', 35),
  equipment('armor-leather', 'Leather', 'armor', 5, 'gp', 35),
  equipment('armor-padded', 'Padded', 'armor', 4, 'gp', 35),
  equipment('armor-plate', 'Plate', 'armor', 400, 'gp', 35),
  equipment('armor-ring', 'Ring', 'armor', 30, 'gp', 35),
  equipment('armor-scale', 'Scale', 'armor', 45, 'gp', 35),
  equipment('shield-large', 'Shield, large', 'armor', 15, 'gp', 35),
  equipment('shield-small', 'Shield, small', 'armor', 10, 'gp', 35),
  equipment('shield-small-wooden', 'Shield, small, wooden', 'armor', 1, 'gp', 35),
  equipment('armor-splinted', 'Splinted', 'armor', 80, 'gp', 35),
  equipment('armor-studded', 'Studded', 'armor', 15, 'gp', 35),

  // PHB p.35 - arms.  Bundled ammunition multiplies the p.37 per-piece weight.
  equipment('arrow-normal-single', 'Arrow, normal, single', 'arms', 2, 'sp', 35, { pieceWeightGp: 2 }),
  equipment('arrow-normal-dozen', 'Arrow, normal, dozen', 'arms', 1, 'gp', 35, { purchaseUnit: 'dozen', pieces: 12, pieceWeightGp: 2 }),
  equipment('arrow-silver-single', 'Arrow, silver, single', 'arms', 1, 'gp', 35, { pieceWeightGp: 2 }),
  equipment('axe-battle', 'Axe, battle', 'arms', 5, 'gp', 35, { pieceWeightGp: 75 }),
  equipment('axe-hand', 'Axe, hand or throwing', 'arms', 1, 'gp', 35, { pieceWeightGp: 50 }),
  equipment('bardiche', 'Bardiche', 'arms', 7, 'gp', 35, { pieceWeightGp: 125 }),
  equipment('bec-de-corbin', 'Bec de corbin', 'arms', 6, 'gp', 35, { pieceWeightGp: 100 }),
  equipment('bill-guisarme', 'Bill-Guisarme', 'arms', 6, 'gp', 35, { pieceWeightGp: 150 }),
  equipment('bow-composite-short', 'Bow, composite short', 'arms', 75, 'gp', 35),
  equipment('bow-composite-long', 'Bow, composite, long', 'arms', 100, 'gp', 35),
  equipment('bow-long', 'Bow, long', 'arms', 60, 'gp', 35),
  equipment('bow-short', 'Bow, short', 'arms', 15, 'gp', 35),
  equipment('crossbow-heavy', 'Crossbow, heavy', 'arms', 20, 'gp', 35),
  equipment('crossbow-light', 'Crossbow, light', 'arms', 12, 'gp', 35),
  // A p.37 weapon-only weight is not promoted to a complete weapon-and-scabbard package weight.
  equipment('dagger-scabbard', 'Dagger and scabbard', 'arms', 2, 'gp', 35),
  equipment('dart', 'Dart', 'arms', 5, 'sp', 35, { pieceWeightGp: 5 }),
  equipment('fauchard', 'Fauchard', 'arms', 3, 'gp', 35, { pieceWeightGp: 60 }),
  equipment('fauchard-fork', 'Fauchard-Fork', 'arms', 8, 'gp', 35, { pieceWeightGp: 80 }),
  equipment('flail-footmans', "Flail, footman's", 'arms', 3, 'gp', 35, { pieceWeightGp: 150 }),
  equipment('flail-horsemans', "Flail, horseman's", 'arms', 8, 'gp', 35, { pieceWeightGp: 35 }),
  equipment('fork-military', 'Fork, Military', 'arms', 4, 'gp', 35, { pieceWeightGp: 75 }),
  equipment('glaive', 'Glaive', 'arms', 6, 'gp', 35, { pieceWeightGp: 75 }),
  equipment('glaive-guisarme', 'Glaive-Guisarme', 'arms', 10, 'gp', 35, { pieceWeightGp: 100 }),
  equipment('guisarme', 'Guisarme', 'arms', 5, 'gp', 35, { pieceWeightGp: 80 }),
  equipment('guisarme-voulge', 'Guisarme-Voulge', 'arms', 7, 'gp', 35, { pieceWeightGp: 150 }),
  equipment('halberd', 'Halberd', 'arms', 9, 'gp', 35, { pieceWeightGp: 175 }),
  equipment('hammer-lucern', 'Hammer, Lucern', 'arms', 7, 'gp', 35, { pieceWeightGp: 150 }),
  equipment('hammer', 'Hammer', 'arms', 1, 'gp', 35, { pieceWeightGp: 50 }),
  equipment('javelin', 'Javelin', 'arms', 10, 'sp', 35, { pieceWeightGp: 20 }),
  // P.37 has three lance weights, while the p.35 price entry does not select a type.
  equipment('lance', 'Lance', 'arms', 6, 'gp', 35),
  equipment('mace-footmans', "Mace, footman's", 'arms', 8, 'gp', 35, { pieceWeightGp: 100 }),
  equipment('mace-horsemans', "Mace, horseman's", 'arms', 4, 'gp', 35, { pieceWeightGp: 50 }),
  equipment('morning-star', 'Morning Star', 'arms', 5, 'gp', 35, { pieceWeightGp: 125 }),
  equipment('partisan', 'Partisan', 'arms', 10, 'gp', 35, { pieceWeightGp: 80 }),
  equipment('pick-military-footmans', "Pick, Military, footman's", 'arms', 8, 'gp', 35, { pieceWeightGp: 60 }),
  equipment('pick-military-horsemans', "Pick, Military, horseman's", 'arms', 5, 'gp', 35, { pieceWeightGp: 40 }),
  equipment('pike-awl', 'Pike, awl', 'arms', 3, 'gp', 35, { pieceWeightGp: 80 }),
  equipment('quarrel-light-single', 'Quarrel (or Bolt), light, single', 'arms', 1, 'sp', 35, { pieceWeightGp: 1 }),
  equipment('quarrel-heavy-score', 'Quarrel (or Bolt), heavy, score', 'arms', 2, 'gp', 35, { purchaseUnit: 'score', pieces: 20, pieceWeightGp: 2 }),
  equipment('ranseur', 'Ranseur', 'arms', 4, 'gp', 35, { pieceWeightGp: 50 }),
  equipment('scimitar', 'Scimitar', 'arms', 15, 'gp', 35, { pieceWeightGp: 40 }),
  // The package includes a sling whose weight is not supplied by the cited weight table.
  equipment('sling-bullets-dozen', 'Sling & Bullets, dozen', 'arms', 15, 'sp', 35, { purchaseUnit: 'sling-and-dozen-bullets', pieces: 12 }),
  equipment('sling-bullets-score', 'Sling Bullets, score', 'arms', 10, 'sp', 35, { purchaseUnit: 'score', pieces: 20, pieceWeightGp: 2 }),
  // P.37 prints a 40-60 range; this scalar field deliberately refuses to collapse it.
  equipment('spear', 'Spear', 'arms', 1, 'gp', 35),
  equipment('spetum', 'Spetum', 'arms', 3, 'gp', 35, { pieceWeightGp: 50 }),
  equipment('sword-bastard-scabbard', 'Sword, bastard, & scabbard', 'arms', 25, 'gp', 35),
  equipment('sword-broad-scabbard', 'Sword, broad, & scabbard', 'arms', 10, 'gp', 35),
  equipment('sword-long-scabbard', 'Sword, long & scabbard', 'arms', 15, 'gp', 35),
  equipment('sword-short-scabbard', 'Sword, short & scabbard', 'arms', 8, 'gp', 35),
  equipment('sword-two-handed', 'Sword, two-handed', 'arms', 30, 'gp', 35, { pieceWeightGp: 250 }),
  equipment('trident', 'Trident', 'arms', 4, 'gp', 35, { pieceWeightGp: 50 }),
  equipment('voulge', 'Voulge', 'arms', 2, 'gp', 35, { pieceWeightGp: 125 }),

  equipment('belt', 'Belt', 'clothing', 3, 'sp', 35),
  equipment('boots-high-hard', 'Boots, high, hard', 'clothing', 2, 'gp', 35),
  equipment('boots-high-soft', 'Boots, high, soft', 'clothing', 1, 'gp', 35),
  equipment('boots-low-hard', 'Boots, low, hard', 'clothing', 1, 'gp', 35),
  equipment('boots-low-soft', 'Boots, low, soft', 'clothing', 8, 'sp', 35),
  equipment('cap', 'Cap', 'clothing', 1, 'sp', 35),
  equipment('cloak', 'Cloak', 'clothing', 5, 'sp', 35),
  equipment('girdle-broad', 'Girdle, broad', 'clothing', 2, 'gp', 35),
  equipment('girdle-normal', 'Girdle, normal', 'clothing', 10, 'sp', 35),
  equipment('hat', 'Hat', 'clothing', 7, 'sp', 35),
  equipment('robe', 'Robe', 'clothing', 6, 'sp', 35),
  equipment('belladonna-sprig', 'Belladonna, sprig', 'herbs', 4, 'sp', 35),
  equipment('garlic-bud', 'Garlic, bud', 'herbs', 5, 'cp', 35),
  equipment('wolvesbane-sprig', 'Wolvesbane, sprig', 'herbs', 10, 'sp', 35),

  // PHB p.36 - livestock, equipment, supplies, religious items, tack, transport.
  equipment('chicken', 'Chicken', 'livestock', 3, 'cp', 36),
  equipment('cow', 'Cow', 'livestock', 10, 'gp', 36),
  equipment('dog-guard', 'Dog, guard', 'livestock', 25, 'gp', 36),
  equipment('dog-hunting', 'Dog, hunting', 'livestock', 17, 'gp', 36),
  equipment('donkey', 'Donkey', 'livestock', 8, 'gp', 36),
  equipment('goat', 'Goat', 'livestock', 1, 'gp', 36),
  equipment('hawk-large', 'Hawk, large', 'livestock', 40, 'gp', 36),
  equipment('hawk-small', 'Hawk, small', 'livestock', 18, 'gp', 36),
  equipment('horse-draft', 'Horse, draft', 'livestock', 30, 'gp', 36),
  equipment('horse-heavy-war', 'Horse, heavy war', 'livestock', 300, 'gp', 36),
  equipment('horse-light-war', 'Horse, light war', 'livestock', 150, 'gp', 36),
  equipment('horse-medium-war', 'Horse, medium war', 'livestock', 225, 'gp', 36),
  equipment('horse-riding-light', 'Horse, riding (light)', 'livestock', 25, 'gp', 36),
  equipment('mule', 'Mule', 'livestock', 20, 'gp', 36),
  equipment('ox', 'Ox', 'livestock', 15, 'gp', 36),
  equipment('pigeon', 'Pigeon', 'livestock', 2, 'cp', 36),
  equipment('piglet', 'Piglet', 'livestock', 1, 'gp', 36),
  equipment('pig', 'Pig', 'livestock', 3, 'gp', 36),
  equipment('pony', 'Pony', 'livestock', 15, 'gp', 36),
  equipment('sheep', 'Sheep', 'livestock', 2, 'gp', 36),
  equipment('songbird', 'Songbird', 'livestock', 4, 'cp', 36),

  equipment('backpack-leather', 'Backpack, leather', 'miscellaneous', 2, 'gp', 36),
  equipment('box-iron-large', 'Box, iron, large', 'miscellaneous', 28, 'gp', 36),
  equipment('box-iron-small', 'Box, iron, small', 'miscellaneous', 9, 'gp', 36),
  equipment('candle-tallow', 'Candle, tallow', 'miscellaneous', 1, 'cp', 36),
  equipment('candle-wax', 'Candle, wax', 'miscellaneous', 1, 'sp', 36),
  equipment('case-bone-map-scroll', 'Case, bone, map or scroll', 'miscellaneous', 5, 'gp', 36),
  equipment('case-leather-map-scroll', 'Case, leather, map or scroll', 'miscellaneous', 15, 'sp', 36),
  equipment('chest-wooden-large', 'Chest, wooden, large', 'miscellaneous', 17, 'sp', 36),
  equipment('chest-wooden-small', 'Chest, wooden, small', 'miscellaneous', 8, 'sp', 36),
  equipment('lantern-bullseye', 'Lantern, bullseye', 'miscellaneous', 12, 'gp', 36),
  equipment('lantern-hooded', 'Lantern, hooded', 'miscellaneous', 7, 'gp', 36),
  equipment('mirror-large-metal', 'Mirror, large metal', 'miscellaneous', 10, 'gp', 36),
  equipment('mirror-small-silver', 'Mirror, small, silver', 'miscellaneous', 20, 'gp', 36),
  equipment('oil-flask', 'Oil, flask of', 'miscellaneous', 1, 'gp', 36),
  equipment('pole-ten-foot', "Pole, 10'", 'miscellaneous', 3, 'cp', 36),
  equipment('pouch-belt-large', 'Pouch, belt, large', 'miscellaneous', 1, 'gp', 36),
  equipment('pouch-belt-small', 'Pouch, belt, small', 'miscellaneous', 15, 'sp', 36),
  equipment('quiver-dozen-arrows', 'Quiver, 1 doz. arrows cap.', 'miscellaneous', 8, 'sp', 36),
  equipment('quiver-score-arrows', 'Quiver, 1 score arrows cap.', 'miscellaneous', 12, 'sp', 36),
  equipment('quiver-score-bolts', 'Quiver, 1 score bolts cap.', 'miscellaneous', 15, 'sp', 36),
  equipment('quiver-two-score-bolts', 'Quiver, 2 score bolts cap.', 'miscellaneous', 1, 'gp', 36),
  equipment('rope-fifty-foot', "Rope, 50'", 'miscellaneous', 4, 'sp', 36),
  equipment('sack-large', 'Sack, large', 'miscellaneous', 16, 'cp', 36),
  equipment('sack-small', 'Sack, small', 'miscellaneous', 10, 'cp', 36),
  equipment('skin-water-wine', 'Skin for water or wine', 'miscellaneous', 15, 'sp', 36),
  equipment('spike-iron-large', 'Spike, iron, large', 'miscellaneous', 1, 'cp', 36),
  equipment('thieves-picks-tools', "Thieves' picks & tools", 'miscellaneous', 30, 'gp', 36),
  equipment('tinder-box', 'Tinder Box, with flint & steel', 'miscellaneous', 1, 'gp', 36),
  equipment('torch', 'Torch', 'miscellaneous', 1, 'cp', 36),

  equipment('ale-pint', 'Ale, pint', 'provisions', 1, 'sp', 36),
  equipment('beer-small-pint', 'Beer, small, pint', 'provisions', 5, 'cp', 36),
  equipment('meal-merchant', "Food, merchant's meal", 'provisions', 1, 'sp', 36),
  equipment('meal-rich', 'Food, rich meal', 'provisions', 1, 'gp', 36),
  equipment('grain-horse-day', 'Grain, horse meal, 1 day', 'provisions', 1, 'sp', 36),
  equipment('mead-pint', 'Mead, pint', 'provisions', 5, 'sp', 36),
  equipment('rations-iron-week', 'Rations, iron, 1 week', 'provisions', 5, 'gp', 36),
  equipment('rations-standard-week', 'Rations, standard, 1 week', 'provisions', 3, 'gp', 36),
  equipment('wine-good-pint', 'Wine, pint, good', 'provisions', 10, 'sp', 36),
  equipment('wine-watered-pint', 'Wine, pint, watered', 'provisions', 5, 'sp', 36),

  equipment('prayer-beads', 'Beads, Prayer', 'religious', 1, 'gp', 36),
  equipment('incense-stick', 'Incense, stick', 'religious', 1, 'gp', 36),
  equipment('holy-symbol-iron', 'Symbol, Holy or Unholy, iron', 'religious', 2, 'gp', 36),
  equipment('holy-symbol-silver', 'Symbol, Holy or Unholy, silver', 'religious', 50, 'gp', 36),
  equipment('holy-symbol-wooden', 'Symbol, Holy or Unholy, wooden', 'religious', 7, 'sp', 36),
  equipment('holy-water-vial', 'Water, Holy or Unholy, vial', 'religious', 25, 'gp', 36),

  equipment('barding-chain', 'Barding, chain', 'tack-harness', 250, 'gp', 36),
  equipment('barding-leather', 'Barding, leather', 'tack-harness', 100, 'gp', 36),
  equipment('barding-plate', 'Barding, plate', 'tack-harness', 500, 'gp', 36),
  equipment('bit-bridle', 'Bit and Bridle', 'tack-harness', 15, 'sp', 36),
  equipment('harness', 'Harness', 'tack-harness', 12, 'sp', 36),
  equipment('saddle', 'Saddle', 'tack-harness', 10, 'gp', 36),
  equipment('saddle-bags-large', 'Saddle Bags, large', 'tack-harness', 4, 'gp', 36),
  equipment('saddle-bags-small', 'Saddle Bags, small', 'tack-harness', 3, 'gp', 36),
  equipment('saddle-blanket', 'Saddle Blanket', 'tack-harness', 3, 'sp', 36),

  equipment('barge-small', 'Barge (or Raft), small', 'transport', 50, 'gp', 36),
  equipment('boat-small', 'Boat, small', 'transport', 75, 'gp', 36),
  equipment('boat-long', 'Boat, long', 'transport', 150, 'gp', 36),
  equipment('cart', 'Cart', 'transport', 50, 'gp', 36),
  equipment('galley-large', 'Galley, large', 'transport', 25000, 'gp', 36),
  equipment('galley-small', 'Galley, small', 'transport', 10000, 'gp', 36),
  equipment('ship-merchant-large', 'Ship, merchant, large', 'transport', 15000, 'gp', 36),
  equipment('ship-merchant-small', 'Ship, merchant, small', 'transport', 5000, 'gp', 36),
  equipment('ship-war', 'Ship, war', 'transport', 20000, 'gp', 36),
  equipment('wagon', 'Wagon', 'transport', 150, 'gp', 36),
] as const satisfies readonly CoreEquipmentDefinition[];

export const coreEquipmentCatalog: readonly CoreEquipmentDefinition[] = Object.freeze(catalog);

export const coreEquipmentById: Readonly<Record<string, CoreEquipmentDefinition>> = Object.freeze(
  Object.fromEntries(coreEquipmentCatalog.map((entry) => [entry.id, entry])),
);
