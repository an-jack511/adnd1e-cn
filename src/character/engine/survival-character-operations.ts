import {
  dailyWaterPints,
  deprivationRules,
  fatigueRules,
  foodToleranceByCombinedStrengthConstitution,
  proficiencyAllocationRules,
  sleepPenaltyBands,
  sleepRules,
  survivalProficiencySlotSchedules,
  waterRacialRequirement,
  type DeprivationCondition,
  type SurvivalAbility,
  type SurvivalCheckPolicy,
  type SurvivalClassId,
  type SurvivalRuleProfile,
  type ThermalCondition,
  type WaterActivity,
  type WaterRaceId,
  type WaterTemperatureBand,
} from '../rules/survival-character-operations';

function positiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} must be a positive safe integer.`);
}

function abilityScore(value: number, label = 'abilityScore'): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} must be a positive safe integer.`);
}

function hasBook(profile: SurvivalRuleProfile, book: 'dsg' | 'wsg'): boolean {
  return profile.enabledBooks.includes(book);
}

export function validateSurvivalRuleProfile(profile: SurvivalRuleProfile) {
  const unique = [...new Set(profile.enabledBooks)];
  if (unique.length !== profile.enabledBooks.length) throw new Error('Enabled survival books must be unique.');
  if (unique.length === 0) {
    return Object.freeze({ status: 'disabled' as const, enabledBooks: [] as const, executable: false });
  }
  if (!profile.proficiencyCheckPolicy) {
    return Object.freeze({
      status: 'needs-campaign-adoption' as const,
      enabledBooks: unique,
      executable: false,
      reason: 'An enabled survival proficiency system must explicitly adopt the DSG or WSG check procedure.',
    });
  }
  if (!unique.includes(profile.proficiencyCheckPolicy)) {
    throw new Error('The adopted proficiency-check policy must name an enabled book.');
  }
  if (profile.wsgExpandedFirstLevelSlot && !(hasBook(profile, 'dsg') && hasBook(profile, 'wsg'))) {
    throw new Error('The optional expanded first-level slot requires both DSG and WSG.');
  }
  return Object.freeze({ status: 'ready' as const, enabledBooks: unique, executable: true, checkPolicy: profile.proficiencyCheckPolicy });
}

export function calculateSurvivalProficiencySlots(input: {
  readonly profile: SurvivalRuleProfile;
  readonly classId: SurvivalClassId;
  readonly level: number;
  readonly bardInherited?: { readonly weapon: number; readonly nonweapon: number };
}) {
  const profile = validateSurvivalRuleProfile(input.profile);
  if (profile.status !== 'ready') return profile;
  positiveInteger(input.level, 'level');
  const schedule = survivalProficiencySlotSchedules[input.classId];
  let initialWeapon = schedule.initialWeapon;
  let initialNonweapon = schedule.initialNonweapon;
  if (input.classId === 'bard') {
    if (!input.bardInherited) {
      return Object.freeze({ status: 'needs-dm' as const, reason: 'Bard initial slots depend on its prior classes.', sourceIds: schedule.sourceIds });
    }
    initialWeapon = input.bardInherited.weapon;
    initialNonweapon = input.bardInherited.nonweapon;
  }
  if (typeof initialWeapon !== 'number' || typeof initialNonweapon !== 'number') throw new Error('Unresolved proficiency slot schedule.');
  const addedWeapon = Math.floor((input.level - 1) / schedule.levelsPerWeaponSlot);
  const addedNonweapon = Math.floor((input.level - 1) / schedule.levelsPerNonweaponSlot);
  const expanded = input.profile.wsgExpandedFirstLevelSlot ? 1 : 0;
  return Object.freeze({
    status: 'calculated' as const,
    classId: input.classId,
    level: input.level,
    weaponSlots: initialWeapon + addedWeapon,
    nonweaponSlots: initialNonweapon + addedNonweapon + expanded,
    expandedFirstLevelSlot: expanded,
    expandedSlotMustBeFilledImmediately: expanded === 1,
    weaponSlotMayBuyNonweapon: true,
    nonweaponSlotMayBuyWeapon: false,
    sourceIds: schedule.sourceIds,
  });
}

export function resolveSurvivalAbilityCheck(input: {
  readonly ability: SurvivalAbility;
  readonly score: number;
  readonly roll: number;
  readonly scoreModifier?: number;
}) {
  abilityScore(input.score);
  positiveInteger(input.roll, 'roll');
  if (input.roll > 20) throw new Error('A standard Ability Check roll must be 1 through 20.');
  const target = input.score + (input.scoreModifier ?? 0);
  return Object.freeze({
    status: input.roll <= target ? 'success' as const : 'failure' as const,
    ability: input.ability, roll: input.roll, target,
    sourceIds: ['dsg:12:ability-proficiency-checks'] as const,
  });
}

export function resolveSurvivalProficiencyCheck(input: {
  readonly policy: SurvivalCheckPolicy;
  readonly abilityScore: number;
  readonly dieRoll: number;
  readonly printedDieModifier?: number;
  readonly improvementSlots?: number;
}) {
  abilityScore(input.abilityScore);
  positiveInteger(input.dieRoll, 'dieRoll');
  if (input.dieRoll > 20) throw new Error('A Proficiency Check roll must be 1 through 20.');
  const improvementSlots = input.improvementSlots ?? 0;
  if (!Number.isSafeInteger(improvementSlots) || improvementSlots < 0) throw new Error('improvementSlots must be a non-negative safe integer.');
  const modifier = (input.printedDieModifier ?? 0) + improvementSlots * proficiencyAllocationRules.improvementDieModifierPerSlot;
  const modifiedRoll = input.dieRoll + modifier;
  const target = input.policy === 'wsg' ? Math.min(18, input.abilityScore) : input.abilityScore;
  const automaticFailure = input.policy === 'wsg'
    ? input.dieRoll === 19 || input.dieRoll === 20
    : modifiedRoll <= 3;
  return Object.freeze({
    status: !automaticFailure && modifiedRoll <= target ? 'success' as const : 'failure' as const,
    policy: input.policy, dieRoll: input.dieRoll, modifier, modifiedRoll, target, automaticFailure,
    sourceIds: input.policy === 'wsg'
      ? ['wsg:11-12:wilderness-proficiencies'] as const
      : ['dsg:21-23:fatigue-proficiencies'] as const,
  });
}

export type FatigueState = 'normal' | 'fatigued' | 'exhausted';

export function nextWsgFatigueCheckAfterTurns(successfulChecks: number): number {
  if (!Number.isSafeInteger(successfulChecks) || successfulChecks < 0) throw new Error('successfulChecks must be a non-negative safe integer.');
  if (successfulChecks === 0) return fatigueRules.firstCheckAfterContinuousTurns;
  return Math.max(fatigueRules.minimumCheckIntervalTurns, fatigueRules.nextCheckAfterFirstSuccessTurns - (successfulChecks - 1));
}

export function resolveFatigueCheck(input: {
  readonly state: FatigueState;
  readonly currentConstitution: number;
  readonly roll: number;
  readonly mode: 'exertion' | 'exhaustion-recovery';
}) {
  abilityScore(input.currentConstitution, 'currentConstitution');
  positiveInteger(input.roll, 'roll');
  if (input.roll > 20) throw new Error('Constitution Check roll must be 1 through 20.');
  const success = input.roll <= input.currentConstitution;
  if (input.mode === 'exhaustion-recovery') {
    if (input.state !== 'exhausted') throw new Error('Only an exhausted character makes an exhaustion-recovery check.');
    return Object.freeze({
      status: success ? 'fatigued' as const : 'exhausted' as const,
      prerequisiteRestTurns: fatigueRules.exhaustedRecoveryTurnsBeforeCheck,
      success, sourceIds: fatigueRules.sourceIds,
    });
  }
  const next: FatigueState = success ? input.state : input.state === 'normal' ? 'fatigued' : 'exhausted';
  return Object.freeze({ status: next, success, sourceIds: fatigueRules.sourceIds });
}

export function fatigueEffects(state: FatigueState) {
  if (state === 'normal') return Object.freeze({ abilityPenalty: 0, attackDamageSavePenalty: 0, voluntaryPhysicalActivity: true });
  if (state === 'fatigued') return Object.freeze({
    abilityPenalty: fatigueRules.fatiguedAbilityPenalty,
    attackDamageSavePenalty: fatigueRules.fatiguedAttackDamageSavePenalty,
    voluntaryPhysicalActivity: true,
  });
  return Object.freeze({
    abilityPenalty: fatigueRules.fatiguedAbilityPenalty + fatigueRules.exhaustedAdditionalAbilityPenalty,
    attackDamageSavePenalty: fatigueRules.fatiguedAttackDamageSavePenalty + fatigueRules.exhaustedAdditionalAttackSavePenalty,
    voluntaryPhysicalActivity: false,
  });
}

export function recoverFatigue(input: { readonly state: FatigueState; readonly uninterruptedRestTurns: number }) {
  if (!Number.isSafeInteger(input.uninterruptedRestTurns) || input.uninterruptedRestTurns < 0) throw new Error('Rest turns must be a non-negative safe integer.');
  if (input.state === 'normal') return Object.freeze({ status: 'normal' as const, checkRequired: false });
  if (input.state === 'fatigued') return Object.freeze({
    status: input.uninterruptedRestTurns >= fatigueRules.fatiguedRecoveryTurns ? 'normal' as const : 'fatigued' as const,
    checkRequired: false,
  });
  return Object.freeze({
    status: 'exhausted' as const,
    checkRequired: input.uninterruptedRestTurns >= fatigueRules.exhaustedRecoveryTurnsBeforeCheck,
    reason: 'After one uninterrupted hour, resolve a Constitution Check against the revised score; success changes exhausted to fatigued.',
  });
}

export function foodToleranceDays(strength: number, constitution: number): number {
  abilityScore(strength, 'strength');
  abilityScore(constitution, 'constitution');
  const combined = strength + constitution;
  return foodToleranceByCombinedStrengthConstitution.find(row => combined <= row.maximum)!.days;
}

export function waterToleranceDays(input: {
  readonly highWaterFood?: boolean;
  readonly heavyOrShortForRace?: boolean;
  readonly female?: boolean;
  readonly noStrenuousActivity?: boolean;
  readonly reachedNinetyDegrees?: boolean;
  readonly ateAtLeastOneMealDaily?: boolean;
  readonly strength: number;
  readonly constitution: number;
}) {
  abilityScore(input.strength, 'strength');
  abilityScore(input.constitution, 'constitution');
  let days = deprivationRules.baseWaterToleranceDays;
  if (input.highWaterFood) days += 2;
  if (input.heavyOrShortForRace) days += 1;
  if (input.female) days += 1;
  if (input.noStrenuousActivity) days += 1;
  if (input.reachedNinetyDegrees) days -= 1;
  if (input.ateAtLeastOneMealDaily === false) days -= 1;
  if (input.strength < 8 || input.constitution < 8) days -= 1;
  return Math.max(deprivationRules.minimumWaterToleranceDays, days);
}

export function resolveDeprivationCheck(input: {
  readonly condition: DeprivationCondition;
  readonly roll: number;
  readonly strength: number;
  readonly constitution: number;
  readonly checkModifier: number;
  readonly deprivedOf: 'food' | 'water' | 'food-and-water';
}) {
  abilityScore(input.strength, 'strength');
  abilityScore(input.constitution, 'constitution');
  positiveInteger(input.roll, 'roll');
  if (input.roll > 20 || !Number.isSafeInteger(input.checkModifier)) throw new Error('Invalid deprivation check.');
  const target = Math.max(input.strength, input.constitution);
  const success = input.roll + input.checkModifier <= target;
  let condition = input.condition;
  if (!success) {
    if (input.deprivedOf === 'food-and-water' && condition === 'weakened') condition = 'incapacitated';
    else if (condition === 'normal') condition = 'weakened';
    else if (condition === 'weakened') condition = 'distressed';
    else condition = 'incapacitated';
  }
  return Object.freeze({ status: condition, success, roll: input.roll, modifiedRoll: input.roll + input.checkModifier, target, sourceIds: deprivationRules.sourceIds });
}

function roundUpToIncrement(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

export function dailyWaterRequirementPints(input: {
  readonly activity: WaterActivity;
  readonly temperature: WaterTemperatureBand;
  readonly race: WaterRaceId;
}) {
  const base = dailyWaterPints[input.activity][input.temperature];
  const race = waterRacialRequirement[input.race];
  return Object.freeze({
    pints: roundUpToIncrement(base * race.numerator / race.denominator, race.roundingPints),
    sourceIds: ['wsg:50-53:food-water'] as const,
  });
}

export function sleepDebtEffects(lastTwoDaysSleepHours: readonly [number, number]) {
  for (const hours of lastTwoDaysSleepHours) {
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) throw new Error('Sleep hours must be from 0 through 24.');
  }
  if (lastTwoDaysSleepHours.some(hours => hours >= sleepRules.resetSleepHoursInSingleDay)) {
    return Object.freeze({ status: 'rested' as const, averageHours: (lastTwoDaysSleepHours[0] + lastTwoDaysSleepHours[1]) / 2, penalties: null });
  }
  const averageHours = (lastTwoDaysSleepHours[0] + lastTwoDaysSleepHours[1]) / 2;
  const penalties = sleepPenaltyBands.find(band => averageHours < band.lessThanHours) ?? null;
  return Object.freeze({ status: penalties ? 'sleep-deprived' as const : 'rested' as const, averageHours, penalties, sourceIds: sleepRules.sourceIds });
}

export interface ThermalExposureState {
  readonly condition: ThermalCondition;
  readonly consecutiveFailedColdChecks: number;
  readonly constitutionLost: number;
  readonly physicalAbilityPointsLost: number;
  readonly wisdomPointsLost: number;
}

export function recordThermalExposure(input: {
  readonly prior: ThermalExposureState;
  readonly protected: boolean;
  readonly coldCheckFailed?: boolean;
  readonly coldDamageTaken?: number;
  readonly exhausted?: boolean;
  readonly heatConstitutionCheckRequired?: boolean;
  readonly dmRulingId?: string;
}) {
  if (!input.dmRulingId?.trim()) {
    return Object.freeze({
      status: 'needs-dm' as const,
      reason: 'Protection, personal temperature, activity adjustment, secret checks, and damage must be established by the DM before committing exposure state.',
      prior: input.prior,
    });
  }
  if (!Number.isSafeInteger(input.coldDamageTaken ?? 0) || (input.coldDamageTaken ?? 0) < 0) throw new Error('coldDamageTaken must be a non-negative safe integer.');
  const failed = input.coldCheckFailed ? input.prior.consecutiveFailedColdChecks + 1 : 0;
  const threshold = input.protected ? 6 : 3;
  let condition: ThermalCondition = input.prior.condition;
  if ((input.coldDamageTaken ?? 0) > 0 && condition === 'none') condition = 'cold-damage';
  if (failed >= threshold) condition = 'hypothermia';
  if (input.exhausted && input.heatConstitutionCheckRequired) condition = 'heatstroke';
  return Object.freeze({
    status: 'committed' as const,
    rulingId: input.dmRulingId,
    state: Object.freeze({ ...input.prior, condition, consecutiveFailedColdChecks: failed }),
    sourceIds: ['wsg:18-28:temperature-exposure'] as const,
  });
}
