/**
 * Oriental Adventures character-foundation facts.
 *
 * This is an independent expansion pack.  “Bushi”, “monk”, “barbarian”,
 * split-class ninja, seven-ability generation, family and honor are the OA
 * mechanisms described below; no same-named PHB/UA mechanism is imported.
 */

export type OaVerification = 'verified' | 'needs-dm' | 'delegated';
export type OaAbilityId = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | 'COM';
export type OaCoreAbilityId = Exclude<OaAbilityId, 'COM'>;
export type OaRaceId = 'human' | 'korobokuru' | 'hengeyokai' | 'spirit-folk';
export type OaClassId = 'samurai' | 'shukenja' | 'sohei' | 'barbarian' | 'kensai' | 'bushi' | 'wu-jen' | 'monk' | 'ninja' | 'yakuza';
export type OaAlignmentId = 'LG' | 'LN' | 'LE' | 'NG' | 'TN' | 'NE' | 'CG' | 'CN' | 'CE';
export type OaAbilityMethodId = 'OA-I' | 'OA-II' | 'OA-III' | 'OA-IV';

export interface OaSource {
  readonly id: string;
  readonly printedPages: readonly number[];
  readonly pdfPages: readonly number[];
  readonly section: string;
  readonly scope: string;
  readonly verification: 'page-image-and-embedded-text';
}

const source = (id: string, printedPages: readonly number[], section: string, scope: string): OaSource => ({
  id, printedPages, pdfPages: printedPages.map(page => page + 1), section, scope,
  verification: 'page-image-and-embedded-text',
});

export const oaFoundationSources = Object.freeze({
  'oa:6-10:abilities': source('oa:6-10:abilities', [6, 7, 8, 9, 10], 'Creating the Player Character / Character Abilities',
    'Seven abilities; OA methods I-IV for the first six; separate 3d6 Comeliness and Charisma/racial adjustments.'),
  'oa:11-13:races': source('oa:11-13:races', [11, 12, 13], 'Character Classes and Races / Oriental Races',
    'Ten OA classes, four races, race/class limits, racial ability limits, korobokuru and hengeyokai adjustment timing.'),
  'oa:14-30:classes': source('oa:14-30:classes', [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], 'Oriental Classes',
    'OA class minima, alignments, class identity, monk detachment, ninja split-class rule and class-specific social exceptions.'),
  'oa:31-34:family': source('oa:31-34:family', [31, 32, 33, 34], 'Families, Clans, and Caste',
    'Birth requirements, 2d10 birth rank, family structure, lineage/birth-order rolls, ancestry and birthrights.'),
  'oa:35-37:honor': source('oa:35-37:honor', [35, 36, 37], 'Honor',
    'Starting honor, family and personal honor, DM awards, zero-honor consequence and replacement-character legacy.'),
  'oa:38:money': source('oa:38:money', [38], 'Money and Equipment / Starting Money',
    'Class-specific initial funds; ninja funds are additional to the cover class.'),
} as const satisfies Readonly<Record<string, OaSource>>);

export type OaSourceId = keyof typeof oaFoundationSources;

export const oaCoreAbilityIds = Object.freeze(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const);

export const oaAbilityMethods = Object.freeze({
  'OA-I': Object.freeze({ rolls: 'six 4d6 groups; discard the lowest die in each; assign six totals as desired', sourceIds: ['oa:6-10:abilities'] as const }),
  'OA-II': Object.freeze({ rolls: 'twelve 3d6 totals; retain and assign any six', sourceIds: ['oa:6-10:abilities'] as const }),
  'OA-III': Object.freeze({ rolls: 'six 3d6 totals in STR, DEX, CON, INT, WIS, CHA order', sourceIds: ['oa:6-10:abilities'] as const }),
  'OA-IV': Object.freeze({ rolls: 'twelve complete six-score characters, each 3d6 in fixed order; retain one character', sourceIds: ['oa:6-10:abilities'] as const }),
});

export interface OaRaceRule {
  readonly id: OaRaceId;
  readonly ranges: Readonly<Record<OaCoreAbilityId, readonly [number, number]>>;
  readonly preQualificationAdjustments: Partial<Readonly<Record<OaCoreAbilityId, number>>>;
  readonly subtypeAdjustmentTiming: 'none' | 'after-racial-qualification';
  readonly sourceIds: readonly OaSourceId[];
}

const humanRanges = Object.freeze(Object.fromEntries(oaCoreAbilityIds.map(id => [id, [3, 18] as const])) as unknown as Readonly<Record<OaCoreAbilityId, readonly [number, number]>>);
export const oaRaceRules: Readonly<Record<OaRaceId, OaRaceRule>> = Object.freeze({
  human: { id: 'human', ranges: humanRanges, preQualificationAdjustments: {}, subtypeAdjustmentTiming: 'none', sourceIds: ['oa:6-10:abilities', 'oa:11-13:races'] },
  korobokuru: { id: 'korobokuru', ranges: { STR: [8, 18], DEX: [6, 18], CON: [12, 19], INT: [3, 15], WIS: [3, 17], CHA: [3, 16] },
    preQualificationAdjustments: { STR: 1, CON: 1, INT: -2 }, subtypeAdjustmentTiming: 'none', sourceIds: ['oa:11-13:races'] },
  hengeyokai: { id: 'hengeyokai', ranges: { STR: [12, 18], DEX: [9, 18], CON: [12, 18], INT: [12, 18], WIS: [12, 18], CHA: [12, 17] },
    preQualificationAdjustments: {}, subtypeAdjustmentTiming: 'after-racial-qualification', sourceIds: ['oa:11-13:races'] },
  'spirit-folk': { id: 'spirit-folk', ranges: { STR: [6, 18], DEX: [12, 18], CON: [6, 14], INT: [12, 18], WIS: [9, 18], CHA: [14, 18] },
    preQualificationAdjustments: {}, subtypeAdjustmentTiming: 'none', sourceIds: ['oa:11-13:races'] },
});

type AlignmentRule = 'any' | 'lawful' | 'good' | 'non-lawful' | 'non-good';
interface Requirement { readonly minimum?: number; readonly maximum?: number; readonly xpBonusMinimum?: number }
export interface OaClassRule {
  readonly id: OaClassId;
  readonly abilityRequirements: Partial<Readonly<Record<OaCoreAbilityId, Requirement>>>;
  readonly alignment: AlignmentRule;
  readonly raceLevelCaps: Readonly<Record<OaRaceId, number | 'unlimited' | null>>;
  readonly ninjaCoverClasses?: readonly OaClassId[];
  readonly sourceIds: readonly OaSourceId[];
}

const caps = (korobokuru: number | 'unlimited' | null, hengeyokai: number | 'unlimited' | null,
  human: number | 'unlimited' | null, spiritFolk: number | 'unlimited' | null): Readonly<Record<OaRaceId, number | 'unlimited' | null>> =>
  Object.freeze({ korobokuru, hengeyokai, human, 'spirit-folk': spiritFolk });

export const oaClassRules: Readonly<Record<OaClassId, OaClassRule>> = Object.freeze({
  samurai: { id: 'samurai', abilityRequirements: { STR: { minimum: 13 }, CON: { minimum: 13 }, INT: { minimum: 14 }, WIS: { minimum: 13 } }, alignment: 'lawful', raceLevelCaps: caps(6, null, 'unlimited', 12), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  shukenja: { id: 'shukenja', abilityRequirements: { STR: { minimum: 9 }, CON: { minimum: 9, xpBonusMinimum: 15 }, WIS: { minimum: 12, xpBonusMinimum: 15 } }, alignment: 'good', raceLevelCaps: caps(null, 8, 'unlimited', null), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  sohei: { id: 'sohei', abilityRequirements: { STR: { minimum: 13, xpBonusMinimum: 15 }, CON: { minimum: 10 }, WIS: { minimum: 10, xpBonusMinimum: 15 } }, alignment: 'lawful', raceLevelCaps: caps(null, null, 'unlimited', null), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  barbarian: { id: 'barbarian', abilityRequirements: { STR: { minimum: 15 }, DEX: { minimum: 14 }, CON: { minimum: 15 }, WIS: { maximum: 16 } }, alignment: 'non-lawful', raceLevelCaps: caps(10, null, 'unlimited', null), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  kensai: { id: 'kensai', abilityRequirements: { STR: { minimum: 12 }, DEX: { minimum: 14 }, WIS: { minimum: 12, xpBonusMinimum: 14 } }, alignment: 'lawful', raceLevelCaps: caps(null, 6, 'unlimited', 9), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  bushi: { id: 'bushi', abilityRequirements: { STR: { minimum: 9, xpBonusMinimum: 15 }, DEX: { minimum: 8 }, CON: { minimum: 8 } }, alignment: 'any', raceLevelCaps: caps('unlimited', 'unlimited', 'unlimited', 'unlimited'), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  'wu-jen': { id: 'wu-jen', abilityRequirements: { INT: { minimum: 13, xpBonusMinimum: 15 } }, alignment: 'non-lawful', raceLevelCaps: caps(7, 9, 'unlimited', null), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  monk: { id: 'monk', abilityRequirements: { STR: { minimum: 15 }, DEX: { minimum: 15 }, CON: { minimum: 11 }, WIS: { minimum: 15 } }, alignment: 'lawful', raceLevelCaps: caps(null, null, 17, 17), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  ninja: { id: 'ninja', abilityRequirements: { DEX: { minimum: 14 }, INT: { minimum: 15 }, CHA: { minimum: 14 } }, alignment: 'non-good', raceLevelCaps: caps(null, null, 'unlimited', null), ninjaCoverClasses: ['bushi', 'sohei', 'wu-jen', 'yakuza'], sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
  yakuza: { id: 'yakuza', abilityRequirements: { STR: { minimum: 11 }, DEX: { minimum: 15 }, INT: { minimum: 15 }, CHA: { minimum: 16 } }, alignment: 'lawful', raceLevelCaps: caps(10, null, 'unlimited', null), sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] },
});

export const oaFamilyRules = Object.freeze({
  monk: Object.freeze({ birthTable: false, familyRequired: false, honor: 'none' as const, sourceIds: ['oa:14-30:classes'] as const }),
  byClass: Object.freeze({
    samurai: { birthTable: true, modifier: 10, familyRequired: true },
    shukenja: { birthTable: false, modifier: 0, familyRequired: false },
    sohei: { birthTable: false, modifier: 0, familyRequired: false },
    barbarian: { birthTable: true, modifier: 0, familyRequired: true },
    kensai: { birthTable: true, modifier: 0, familyRequired: true },
    bushi: { birthTable: true, modifier: 0, familyRequired: true },
    'wu-jen': { birthTable: false, modifier: 0, familyRequired: false },
    ninja: { birthTable: false, modifier: 0, familyRequired: true, clan: 'ninja-clan' as const },
    yakuza: { birthTable: false, modifier: null, familyRequired: true, clan: 'yakuza-organization' as const },
  }),
  yakuzaModifierConflict: Object.freeze({ table37: -10, classDescription: -5, status: 'needs-dm' as const, sourceIds: ['oa:31-34:family', 'oa:14-30:classes'] as const }),
  familyChart: Object.freeze({ rows: 3, spacesPerRow: 8, spacesRoll: '1d8', maleChancePercent: 70, childrenPerSpace: '1d8-2', sourceIds: ['oa:31-34:family'] as const }),
  ancestryTable: Object.freeze({ status: 'delegated' as const, table: 39, sourceIds: ['oa:31-34:family'] as const }),
  birthrightsTable: Object.freeze({ status: 'delegated' as const, table: 40, sourceIds: ['oa:31-34:family'] as const }),
});

export interface BirthRankBand {
  readonly minimum: number; readonly maximum: number; readonly label: string;
  readonly reactionPercent: number; readonly ancestry: readonly [number, number];
  readonly birthright: readonly [number, number]; readonly familyHonor: number;
}
export const oaBirthRankBands: readonly BirthRankBand[] = Object.freeze([
  { minimum: 2, maximum: 2, label: 'outcast', reactionPercent: 5, ancestry: [6, 1], birthright: [4, 1], familyHonor: 0 },
  { minimum: 3, maximum: 3, label: 'lower-class', reactionPercent: 10, ancestry: [6, 1], birthright: [4, 2], familyHonor: 1 },
  { minimum: 4, maximum: 5, label: 'lower-middle-class', reactionPercent: 15, ancestry: [6, 2], birthright: [6, 1], familyHonor: 5 },
  { minimum: 6, maximum: 8, label: 'middle-class', reactionPercent: 20, ancestry: [10, 1], birthright: [8, 2], familyHonor: 8 },
  { minimum: 9, maximum: 10, label: 'upper-middle-class', reactionPercent: 25, ancestry: [20, 2], birthright: [20, 2], familyHonor: 10 },
  { minimum: 11, maximum: 12, label: 'lower-upper-class', reactionPercent: 30, ancestry: [100, 2], birthright: [20, 4], familyHonor: 15 },
  { minimum: 13, maximum: 14, label: 'upper-class', reactionPercent: 35, ancestry: [100, 4], birthright: [100, 3], familyHonor: 17 },
  { minimum: 15, maximum: 16, label: '10th-rank', reactionPercent: 40, ancestry: [100, 5], birthright: [100, 4], familyHonor: 20 },
  { minimum: 17, maximum: 18, label: '9th-rank', reactionPercent: 45, ancestry: [100, 6], birthright: [100, 5], familyHonor: 22 },
  { minimum: 19, maximum: 20, label: '8th-rank', reactionPercent: 50, ancestry: [100, 7], birthright: [100, 6], familyHonor: 24 },
  { minimum: 21, maximum: 22, label: '7th-rank', reactionPercent: 55, ancestry: [100, 7], birthright: [100, 7], familyHonor: 25 },
  { minimum: 23, maximum: 24, label: '6th-rank', reactionPercent: 60, ancestry: [100, 7], birthright: [100, 8], familyHonor: 26 },
  { minimum: 25, maximum: 26, label: '5th-rank', reactionPercent: 65, ancestry: [100, 8], birthright: [100, 9], familyHonor: 27 },
  { minimum: 27, maximum: 27, label: '4th-rank', reactionPercent: 70, ancestry: [100, 8], birthright: [100, 10], familyHonor: 28 },
  { minimum: 28, maximum: 28, label: '3rd-rank', reactionPercent: 75, ancestry: [100, 9], birthright: [100, 10], familyHonor: 29 },
  { minimum: 29, maximum: 29, label: '2nd-rank', reactionPercent: 80, ancestry: [100, 9], birthright: [100, 10], familyHonor: 30 },
  { minimum: 30, maximum: 30, label: '1st-rank', reactionPercent: 90, ancestry: [100, 10], birthright: [100, 10], familyHonor: 35 },
]);

export type OaCurrencyId = 'chien' | 'tael' | 'yuan' | 'fen';
export interface OaFundsComponent { readonly currency: OaCurrencyId; readonly dice: readonly [number, number] }
export const oaStartingFunds: Readonly<Record<OaClassId, readonly OaFundsComponent[]>> = Object.freeze({
  samurai: [{ currency: 'chien', dice: [2, 6] }, { currency: 'tael', dice: [1, 10] }],
  shukenja: [{ currency: 'tael', dice: [1, 5] }, { currency: 'yuan', dice: [2, 10] }, { currency: 'fen', dice: [1, 100] }],
  monk: [{ currency: 'yuan', dice: [4, 10] }, { currency: 'fen', dice: [2, 100] }],
  sohei: [{ currency: 'tael', dice: [1, 10] }, { currency: 'yuan', dice: [4, 10] }],
  kensai: [{ currency: 'chien', dice: [1, 4] }, { currency: 'tael', dice: [1, 10] }],
  barbarian: [{ currency: 'tael', dice: [1, 6] }, { currency: 'yuan', dice: [1, 100] }],
  bushi: [{ currency: 'tael', dice: [1, 4] }, { currency: 'yuan', dice: [4, 10] }, { currency: 'fen', dice: [2, 100] }],
  'wu-jen': [{ currency: 'chien', dice: [1, 3] }, { currency: 'tael', dice: [2, 10] }],
  ninja: [{ currency: 'chien', dice: [1, 2] }],
  yakuza: [{ currency: 'chien', dice: [1, 3] }, { currency: 'tael', dice: [2, 10] }],
});

export const oaInitialHonorBases = Object.freeze({
  shukenja: 20, sohei: 15, kensai: 25, bushi: 10, hengeyokai: 10, 'wu-jen': 15,
  yakuza: '1d20+20' as const,
});

export const oaCreationStages = Object.freeze([
  { id: 'abilities', rule: 'OA methods generate STR-CHA; COM is a separate 3d6 roll adjusted by CHA and race.', status: 'verified' as const, sourceIds: ['oa:6-10:abilities'] as const },
  { id: 'race-class', rule: 'Apply OA racial timing, class minima, race caps and alignment; ninja also needs a legal cover class.', status: 'verified' as const, sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] as const },
  { id: 'family-caste', rule: 'Apply class-specific birth/family rule; if used, resolve birth rank, family structure, ancestry and birthrights.', status: 'verified' as const, sourceIds: ['oa:31-34:family'] as const },
  { id: 'honor', rule: 'Resolve family or no-family starting honor; monk has no honor score.', status: 'verified' as const, sourceIds: ['oa:35-37:honor', 'oa:14-30:classes'] as const },
  { id: 'funds', rule: 'Roll the OA class fund package; ninja money is added to its cover-class money.', status: 'verified' as const, sourceIds: ['oa:38:money'] as const },
  { id: 'skills-equipment', rule: 'Complete proficiency, martial-art, spell and equipment selections in their dedicated packs.', status: 'delegated' as const, sourceIds: ['oa:14-30:classes', 'oa:38:money'] as const },
]);

export const oaCharacterFoundationPack = Object.freeze({
  id: 'adnd1e-oa-character-foundation', version: '1.0.0', verifiedAt: '2026-10-15',
  sourceFile: '__RESOURCES/Extensions/TSR Inc - AD&D 1st Edition - Oriental Adventures.pdf',
  sourceSha256: 'DCFE6F59F4791DD51CC227DA425B745C7E259ADC3B96A917FB30CA237DB541EB',
  independence: 'OA names and mechanisms are not aliases for PHB or UA rules.',
  sources: oaFoundationSources, abilityMethods: oaAbilityMethods, races: oaRaceRules, classes: oaClassRules,
  family: oaFamilyRules, birthRanks: oaBirthRankBands, initialHonorBases: oaInitialHonorBases,
  startingFunds: oaStartingFunds, stages: oaCreationStages,
  delegated: Object.freeze([
    { id: 'hengeyokai-creature-table', status: 'delegated' as const, reason: 'Table 11 animal forms/alignment/stat modifiers require a dedicated row-by-row pack.', sourceIds: ['oa:11-13:races'] as const },
    { id: 'class-advancement-and-capability-tables', status: 'delegated' as const, reason: 'Tables 14-36 are outside this creation-foundation pack.', sourceIds: ['oa:14-30:classes'] as const },
    { id: 'martial-arts-and-proficiencies', status: 'delegated' as const, reason: 'Large skill and martial-art tables have not been imported row by row.', sourceIds: ['oa:14-30:classes'] as const },
    { id: 'ancestry-and-birthright-rows', status: 'delegated' as const, reason: 'Tables 39-40 remain event inputs; no OCR-derived result is fabricated.', sourceIds: ['oa:31-34:family'] as const },
  ]),
});
