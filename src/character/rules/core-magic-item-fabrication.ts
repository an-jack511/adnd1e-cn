/**
 * AD&D 1e core magic-item fabrication facts.
 *
 * This pack deliberately does not contain recipes. DMG 116 and PHB 84 say
 * that the DM determines the spells, ingredients, and other particulars.
 */

export const CORE_PHB_SHA256 =
  'e3dba4ee08af2ae88a6596422baec5f8138ee40aeb7d5946f64438396d3b3213';
export const CORE_DMG_SHA256 =
  '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669';

export const coreMagicItemFabricationSources = Object.freeze({
  'phb:21:druid-level-title': Object.freeze({
    book: 'PHB',
    printing: 'TSR 2010',
    printedPages: [21],
    pdfPages: [22],
    section: 'Druids (Clerics) Table I: Archdruid is 13th level',
    sha256: CORE_PHB_SHA256,
    verification: 'page-image-and-text',
  }),
  'phb:83-84:enchant-an-item': Object.freeze({
    book: 'PHB',
    printing: 'TSR 2010',
    printedPages: [83, 84],
    pdfPages: [84, 85],
    section: 'Magic-user spell: Enchant An Item',
    sha256: CORE_PHB_SHA256,
    verification: 'page-image-and-text',
  }),
  'phb:91:permanency': Object.freeze({
    book: 'PHB',
    printing: 'TSR 2010',
    printedPages: [91],
    pdfPages: [92],
    section: 'Magic-user spell: Permanency',
    sha256: CORE_PHB_SHA256,
    verification: 'page-image-and-text',
  }),
  'dmg:116:fabrication-and-potions': Object.freeze({
    book: 'DMG',
    printing: 'TSR 2011',
    printedPages: [116],
    pdfPages: [117],
    section: 'Fabrication of Magic Items; Manufacture of Potions',
    sha256: CORE_DMG_SHA256,
    verification: 'page-image-and-text',
  }),
  'dmg:117:potions-and-scrolls': Object.freeze({
    book: 'DMG',
    printing: 'TSR 2011',
    printedPages: [117],
    pdfPages: [118],
    section: 'Suggested potion ingredients; Manufacture of Scrolls',
    sha256: CORE_DMG_SHA256,
    verification: 'page-image-and-text',
  }),
  'dmg:118:other-items': Object.freeze({
    book: 'DMG',
    printing: 'TSR 2011',
    printedPages: [118],
    pdfPages: [119],
    section:
      'Fabrication of Other Magic Items; clerics/druids; illusionists; compelled makers',
    sha256: CORE_DMG_SHA256,
    verification: 'page-image-and-text',
  }),
} as const);

export type CoreMagicItemFabricationSourceId =
  keyof typeof coreMagicItemFabricationSources;

export const coreMagicItemFabricationRule = Object.freeze({
  id: 'adnd1e-core-magic-item-fabrication',
  version: '1.0.0',
  scope: 'PHB+DMG-core-only',
  makerThresholds: Object.freeze({
    potionMagicUser: 7,
    potionMagicUserWithoutMandatoryAlchemist: 12,
    poisonAssassin: 9,
    scrollSpellCaster: 7,
    otherCleric: 11,
    otherDruid: 13,
    otherMagicUser: 12,
    illusionistTemporaryOrCharged: 11,
    illusionistPermanent: 14,
  }),
  potion: Object.freeze({
    oneAtATime: true,
    laboratoryInitialGp: Object.freeze({ minimum: 200, maximum: 1_000 }),
    laboratoryMonthlyUpkeepPercent: 10,
    unlistedXpValue: 200,
    gpPerXpAward: 1,
    daysPerStartedHundredXp: 1,
    alchemistReductionPercent: 50,
    optionalDelusionFailurePercent: Object.freeze({ minimum: 5, maximum: 20 }),
  }),
  scroll: Object.freeze({
    maximumSpells: 7,
    daysPerSpellLevel: 1,
    baseFailurePercent: 20,
    failurePercentPerSpellLevel: 1,
    surfaces: Object.freeze({
      papyrus: Object.freeze({ minimumGpPerSheet: 2, failureAdjustmentPercent: 5 }),
      parchment: Object.freeze({ minimumGpPerSheet: 4, failureAdjustmentPercent: 0 }),
      vellum: Object.freeze({ minimumGpPerSheet: 8, failureAdjustmentPercent: -5 }),
    }),
  }),
  otherItem: Object.freeze({
    clericDruidRetreatDays: 14,
    clericDruidFastDays: 7,
    clericDruidPurificationDays: 1,
    clericDruidDivineFavorPercentPerDay: 1,
    illusionistInitialDweomerHours: 16,
    permanentIllusionistGemExampleGp: 10_000,
    convalescenceDaysPer100XpValue: 1,
    enchantItemBaseHours: 16,
    enchantItemAdditionalHours: Object.freeze({ minimum: 8, maximum: 64 }),
    maximumWorkHoursPerDay: 8,
    itemMaximumSavingThrowBonus: 3,
    firstDweomerDeadlineHours: 24,
    successiveDweomerBaseHours: 4,
    successiveDweomerAdditionalHoursPerSpellLevel: Object.freeze({
      minimum: 4,
      maximum: 8,
    }),
  }),
  nonPlayerManufacturable: Object.freeze([
    'books-tomes-librams-manuals',
    'artifacts',
    'relics',
    'special-dwarven-or-elven-items',
  ]),
  sourceIds: Object.freeze([
    'phb:21:druid-level-title',
    'phb:83-84:enchant-an-item',
    'phb:91:permanency',
    'dmg:116:fabrication-and-potions',
    'dmg:117:potions-and-scrolls',
    'dmg:118:other-items',
  ] satisfies readonly CoreMagicItemFabricationSourceId[]),
  dmReserved: Object.freeze([
    'exact formula and required spells',
    'special ingredients and their availability',
    'exact laboratory price within or beyond the printed guideline',
    'whether a proposed item is proper to a profession and alignment',
    'non-standard item balance and campaign portability',
    'optional potion failure rule and percentage',
    'results of unknown successive enchantments and compelled fabrication',
  ]),
});

