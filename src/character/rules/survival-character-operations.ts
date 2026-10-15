/**
 * AD&D 1e DSG/WSG optional character-operations sidecar.
 *
 * The two books are never silently treated as core rules.  Callers must name
 * the enabled books and, where their check procedures differ, the adopted
 * procedure.  This file intentionally omits the many encounter, movement,
 * weather-generation, hunting, and foraging tables that are not character
 * state.
 */

const dsgFile = "__RESOURCES/Extensions/TSR Inc - AD&D 1st Edition - Dungeoneer's Survival Guide.pdf";
const wsgFile = '__RESOURCES/Extensions/TSR Inc - AD&D 1st Edition - Wilderness Survival Guide.pdf';

export const survivalOperationSources = Object.freeze({
  'dsg:12:ability-proficiency-checks': Object.freeze({
    book: 'DSG', printedPages: [12] as const, pdfPages: [13] as const,
    section: 'Ability Checks; Proficiency Checks', sourceFile: dsgFile,
    sha256: '6181174882A904761DB64887185AC4619E443A71D23B728E848E9C5A69D2B5BF',
    verification: 'local-page-image-and-text',
  }),
  'dsg:21-23:fatigue-proficiencies': Object.freeze({
    book: 'DSG', printedPages: [21, 22, 23] as const, pdfPages: [22, 23, 24] as const,
    section: 'Fatigue and Exhaustion; Proficiencies', sourceFile: dsgFile,
    sha256: '6181174882A904761DB64887185AC4619E443A71D23B728E848E9C5A69D2B5BF',
    verification: 'local-page-image-and-text',
  }),
  'wsg:11-12:wilderness-proficiencies': Object.freeze({
    book: 'WSG', printedPages: [11, 12] as const, pdfPages: [12, 13] as const,
    section: 'Wilderness Proficiencies; Character Proficiencies', sourceFile: wsgFile,
    sha256: 'AAEC28C3F75F751A89C230AFD4437F5434A3D5AA9BCE173BF05C88C57753593F',
    verification: 'local-page-image-and-text',
  }),
  'wsg:18-28:temperature-exposure': Object.freeze({
    book: 'WSG', printedPages: [18, 19, 20, 21, 26, 27, 28] as const,
    pdfPages: [19, 20, 21, 22, 27, 28, 29] as const,
    section: 'Personal Temperature; Damage from Heat and Cold', sourceFile: wsgFile,
    sha256: 'AAEC28C3F75F751A89C230AFD4437F5434A3D5AA9BCE173BF05C88C57753593F',
    verification: 'local-page-image-and-text',
  }),
  'wsg:30-31:activity-movement': Object.freeze({
    book: 'WSG', printedPages: [30, 31] as const, pdfPages: [31, 32] as const,
    section: 'Encumbrance and Movement; Large-scale Overland Movement', sourceFile: wsgFile,
    sha256: 'AAEC28C3F75F751A89C230AFD4437F5434A3D5AA9BCE173BF05C88C57753593F',
    verification: 'local-page-image-and-text',
  }),
  'wsg:50-53:food-water': Object.freeze({
    book: 'WSG', printedPages: [50, 51, 52, 53] as const, pdfPages: [51, 53, 54] as const,
    section: 'Going Without Food; Going Without Water; Daily Requirements', sourceFile: wsgFile,
    sha256: 'AAEC28C3F75F751A89C230AFD4437F5434A3D5AA9BCE173BF05C88C57753593F',
    verification: 'local-page-image-and-text; PDF page 52 is a plate without printed page number',
  }),
  'wsg:64-65:sleep': Object.freeze({
    book: 'WSG', printedPages: [64, 65] as const, pdfPages: [65, 66] as const,
    section: 'Rest and Comfort; How Much Sleep?; Effects of Lack of Sleep', sourceFile: wsgFile,
    sha256: 'AAEC28C3F75F751A89C230AFD4437F5434A3D5AA9BCE173BF05C88C57753593F',
    verification: 'local-page-image-and-text',
  }),
  'wsg:88-89:fatigue': Object.freeze({
    book: 'WSG', printedPages: [88, 89] as const, pdfPages: [89, 90] as const,
    section: 'Fatigue and Exhaustion', sourceFile: wsgFile,
    sha256: 'AAEC28C3F75F751A89C230AFD4437F5434A3D5AA9BCE173BF05C88C57753593F',
    verification: 'local-page-image-and-text',
  }),
} as const);

export type SurvivalSourceId = keyof typeof survivalOperationSources;
export type SurvivalBookId = 'dsg' | 'wsg';
export type SurvivalCheckPolicy = 'dsg' | 'wsg';

export interface SurvivalRuleProfile {
  readonly enabledBooks: readonly SurvivalBookId[];
  readonly proficiencyCheckPolicy?: SurvivalCheckPolicy;
  readonly wsgExpandedFirstLevelSlot?: boolean;
}

export type SurvivalClassId =
  | 'cavalier' | 'paladin' | 'cleric' | 'druid' | 'fighter' | 'barbarian' | 'ranger'
  | 'magic-user' | 'illusionist' | 'thief' | 'acrobat' | 'assassin' | 'monk' | 'bard';

export interface ProficiencySlotSchedule {
  readonly initialWeapon: number | 'as-other-classes';
  readonly initialNonweapon: number | 'as-other-classes';
  readonly levelsPerWeaponSlot: number;
  readonly levelsPerNonweaponSlot: number;
  readonly sourceIds: readonly SurvivalSourceId[];
}

const proficiencySourceIds = [
  'dsg:21-23:fatigue-proficiencies', 'wsg:11-12:wilderness-proficiencies',
] as const;

export const survivalProficiencySlotSchedules: Readonly<Record<SurvivalClassId, ProficiencySlotSchedule>> = Object.freeze({
  cavalier: { initialWeapon: 3, initialNonweapon: 2, levelsPerWeaponSlot: 2, levelsPerNonweaponSlot: 2, sourceIds: proficiencySourceIds },
  paladin: { initialWeapon: 3, initialNonweapon: 2, levelsPerWeaponSlot: 2, levelsPerNonweaponSlot: 2, sourceIds: proficiencySourceIds },
  cleric: { initialWeapon: 2, initialNonweapon: 3, levelsPerWeaponSlot: 4, levelsPerNonweaponSlot: 4, sourceIds: proficiencySourceIds },
  druid: { initialWeapon: 2, initialNonweapon: 3, levelsPerWeaponSlot: 5, levelsPerNonweaponSlot: 5, sourceIds: proficiencySourceIds },
  fighter: { initialWeapon: 4, initialNonweapon: 2, levelsPerWeaponSlot: 3, levelsPerNonweaponSlot: 3, sourceIds: proficiencySourceIds },
  barbarian: { initialWeapon: 6, initialNonweapon: 3, levelsPerWeaponSlot: 2, levelsPerNonweaponSlot: 2, sourceIds: proficiencySourceIds },
  ranger: { initialWeapon: 3, initialNonweapon: 2, levelsPerWeaponSlot: 3, levelsPerNonweaponSlot: 3, sourceIds: proficiencySourceIds },
  'magic-user': { initialWeapon: 1, initialNonweapon: 3, levelsPerWeaponSlot: 6, levelsPerNonweaponSlot: 6, sourceIds: proficiencySourceIds },
  illusionist: { initialWeapon: 1, initialNonweapon: 3, levelsPerWeaponSlot: 6, levelsPerNonweaponSlot: 6, sourceIds: proficiencySourceIds },
  thief: { initialWeapon: 2, initialNonweapon: 3, levelsPerWeaponSlot: 4, levelsPerNonweaponSlot: 4, sourceIds: proficiencySourceIds },
  acrobat: { initialWeapon: 2, initialNonweapon: 3, levelsPerWeaponSlot: 4, levelsPerNonweaponSlot: 4, sourceIds: proficiencySourceIds },
  assassin: { initialWeapon: 3, initialNonweapon: 2, levelsPerWeaponSlot: 4, levelsPerNonweaponSlot: 4, sourceIds: proficiencySourceIds },
  monk: { initialWeapon: 1, initialNonweapon: 1, levelsPerWeaponSlot: 2, levelsPerNonweaponSlot: 2, sourceIds: proficiencySourceIds },
  bard: { initialWeapon: 'as-other-classes', initialNonweapon: 'as-other-classes', levelsPerWeaponSlot: 1, levelsPerNonweaponSlot: 1, sourceIds: proficiencySourceIds },
});

export const proficiencyAllocationRules = Object.freeze({
  optionalSystem: true,
  dmApprovalRequired: true,
  unusedSlotsMayBeSaved: true,
  weaponSlotMayBuyNonweapon: true,
  nonweaponSlotMayBuyWeapon: false,
  purchasedChoiceIsPermanent: true,
  improvementCostSlots: 1,
  improvementDieModifierPerSlot: -2,
  wsgAutomaticFailureRolls: [19, 20] as const,
  wsgAbilityForChecksCappedAt: 18,
  dsgModifiedResultThreeOrLessFails: true,
  extraWsgSlotWhenBothBooksEnabled: Object.freeze({
    optional: true, amount: 1, level: 1, mustBeFilledImmediately: true, lostIfDeferred: true,
  }),
  sourceIds: proficiencySourceIds,
});

export type SurvivalAbility = 'strength' | 'intelligence' | 'wisdom' | 'dexterity' | 'constitution' | 'charisma' | 'comeliness';

export const fatigueRules = Object.freeze({
  strenuousTurnsBeforeRestDue: 4,
  preventativeRestTurns: 2,
  firstCheckAfterContinuousTurns: 6,
  nextCheckAfterFirstSuccessTurns: 5,
  minimumCheckIntervalTurns: 1,
  fatiguedRecoveryTurns: 2,
  exhaustedRecoveryTurnsBeforeCheck: 6,
  fatiguedAbilityPenalty: -2,
  fatiguedAttackDamageSavePenalty: -2,
  exhaustedAdditionalAbilityPenalty: -2,
  exhaustedAdditionalAttackSavePenalty: -2,
  exhaustedVoluntaryPhysicalActivity: false,
  sourceIds: ['dsg:21-23:fatigue-proficiencies', 'wsg:88-89:fatigue'] as const,
  conflictNotes: Object.freeze([
    'DSG describes later Constitution checks every turn after the initial sequence; WSG explicitly shortens the next interval after each success to a minimum of one turn.',
    'WSG expressly excludes Comeliness from fatigue ability-score reduction; DSG says all attributes but protects Charisma-derived social relations from temporary loss.',
    'A campaign must retain its adopted narration where these details matter; the engine exposes the WSG interval procedure and never silently rewrites DSG.',
  ]),
});

export type DeprivationCondition = 'normal' | 'weakened' | 'distressed' | 'incapacitated';

export const foodToleranceByCombinedStrengthConstitution = Object.freeze([
  Object.freeze({ maximum: 15, days: 4 }),
  Object.freeze({ maximum: 19, days: 5 }),
  Object.freeze({ maximum: 24, days: 6 }),
  Object.freeze({ maximum: 30, days: 7 }),
  Object.freeze({ maximum: 35, days: 8 }),
  Object.freeze({ maximum: Number.POSITIVE_INFINITY, days: 10 }),
] as const);

export const deprivationRules = Object.freeze({
  foodCheckIntervalHours: 12,
  foodInitialCheckModifier: 0,
  foodSubsequentCheckModifierStep: 1,
  foodChecksAfterFirstFailureModifierStep: 2,
  incapacitatedFoodHpLossDelayHours: 12,
  incapacitatedFoodHpLossPerHour: '1d6',
  incapacitatedNoNourishmentHpRecoveryPerHour: '1d4',
  baseWaterToleranceDays: 3,
  minimumWaterToleranceDays: 1,
  incapacitatedNoFoodAndWaterHpLossDelayHours: 12,
  incapacitatedNoFoodAndWaterHpLossPerHour: '1d8',
  halfRationsToleranceMultiplier: 1.5,
  sourceIds: ['wsg:50-53:food-water'] as const,
});

export type WaterActivity = 'inactive' | 'light' | 'moderate' | 'heavy';
export type WaterTemperatureBand = 'below-50' | '50-70' | '71-90' | 'above-90';
export const dailyWaterPints: Readonly<Record<WaterActivity, Readonly<Record<WaterTemperatureBand, number>>>> = Object.freeze({
  inactive: Object.freeze({ 'below-50': 5, '50-70': 6, '71-90': 7, 'above-90': 8 }),
  light: Object.freeze({ 'below-50': 6, '50-70': 7, '71-90': 8, 'above-90': 10 }),
  moderate: Object.freeze({ 'below-50': 8, '50-70': 9, '71-90': 10, 'above-90': 12 }),
  heavy: Object.freeze({ 'below-50': 9, '50-70': 10, '71-90': 12, 'above-90': 16 }),
});

export const waterRacialRequirement = Object.freeze({
  human: Object.freeze({ numerator: 1, denominator: 1, roundingPints: 0.5 }),
  'half-elf': Object.freeze({ numerator: 1, denominator: 1, roundingPints: 0.5 }),
  'half-orc': Object.freeze({ numerator: 1, denominator: 1, roundingPints: 0.5 }),
  elf: Object.freeze({ numerator: 3, denominator: 4, roundingPints: 0.5 }),
  dwarf: Object.freeze({ numerator: 2, denominator: 3, roundingPints: 0.5 }),
  gnome: Object.freeze({ numerator: 2, denominator: 3, roundingPints: 0.5 }),
  halfling: Object.freeze({ numerator: 2, denominator: 3, roundingPints: 0.5 }),
});
export type WaterRaceId = keyof typeof waterRacialRequirement;

export const sleepPenaltyBands = Object.freeze([
  Object.freeze({ lessThanHours: 1, dexterityCheck: 5, strengthCheck: 4, wisdomCheck: 3, constitutionCheck: 2, attack: -3, climbingPercent: -30, movementPercent: -50, weightAllowancePerStrength: -100 }),
  Object.freeze({ lessThanHours: 2, dexterityCheck: 4, strengthCheck: 3, wisdomCheck: 2, constitutionCheck: 1, attack: -2, climbingPercent: -20, movementPercent: -33, weightAllowancePerStrength: -50 }),
  Object.freeze({ lessThanHours: 3, dexterityCheck: 3, strengthCheck: 2, wisdomCheck: 1, constitutionCheck: 0, attack: -1, climbingPercent: -10, movementPercent: -25, weightAllowancePerStrength: 0 }),
  Object.freeze({ lessThanHours: 4, dexterityCheck: 2, strengthCheck: 1, wisdomCheck: 0, constitutionCheck: 0, attack: -1, climbingPercent: 0, movementPercent: 0, weightAllowancePerStrength: 0 }),
  Object.freeze({ lessThanHours: 5, dexterityCheck: 1, strengthCheck: 0, wisdomCheck: 0, constitutionCheck: 0, attack: 0, climbingPercent: 0, movementPercent: 0, weightAllowancePerStrength: 0 }),
] as const);

export const sleepRules = Object.freeze({
  sleepNeededPer24Hours: 5,
  penaltyStartsAfterConsecutiveDays: 2,
  resetSleepHoursInSingleDay: 5,
  sourceIds: ['wsg:64-65:sleep'] as const,
});

export type ThermalCondition = 'none' | 'cold-damage' | 'frostbite' | 'hypothermia' | 'heat-exhaustion' | 'heatstroke';
export const thermalConditionRules = Object.freeze({
  hypothermiaFailedChecksUnprotected: 3,
  hypothermiaFailedChecksProtected: 6,
  hypothermiaPhysicalAbilityLossPerTurn: 1,
  hypothermiaWisdomLossEveryTurns: 2,
  hypothermiaMinimumAbility: 3,
  heatstrokeTrigger: 'character is exhausted while heat damage requires a Constitution Check',
  heatstrokeTreatmentDeadlineTurns: 3,
  thermalHpRecoveryPerHourInTolerableRest: 1,
  sourceIds: ['wsg:18-28:temperature-exposure'] as const,
});

export const survivalCharacterOperationsRulePack = Object.freeze({
  id: 'adnd1e:survival-guides:character-operations',
  version: '1.0.0',
  verifiedAt: '2026-10-15',
  status: 'optional-sidecar',
  activation: 'No rule in this pack applies unless its source book is explicitly enabled in the campaign profile.',
  sources: survivalOperationSources,
  proficiencySlots: survivalProficiencySlotSchedules,
  proficiencyAllocation: proficiencyAllocationRules,
  fatigue: fatigueRules,
  deprivation: deprivationRules,
  water: Object.freeze({ dailyPints: dailyWaterPints, racialRequirement: waterRacialRequirement }),
  sleep: Object.freeze({ rules: sleepRules, penaltyBands: sleepPenaltyBands }),
  thermalConditions: thermalConditionRules,
  unresolved: Object.freeze({
    coreConflict: 'DSG/WSG are optional additions; core PHB weapon proficiency remains authoritative when this sidecar is disabled.',
    dsgWsgCheckDifference: 'Campaign must adopt DSG or WSG proficiency-check policy; no silent hybrid default.',
    proficiencyEligibility: 'Concrete skill choice remains subject to campaign history and DM approval.',
    outdoorTables: 'Weather, foraging, hunting, mounts, terrain, shelter damage, and encounter procedures are intentionally outside this character-state pack.',
    thermalRolls: 'The DM determines protection, effective/personal temperature, activity adjustment, secret Constitution checks, and actual random damage.',
    fractionalFood: 'Food composition and ration equivalence require campaign facts; this pack records consumed facts rather than guessing nutritional value.',
  }),
});
