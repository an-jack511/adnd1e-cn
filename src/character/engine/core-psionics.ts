import {
  attackModeCountBands, defenseModeCountBands, disciplineCountBands,
  psionicRacePolicy, type CorePsionicRaceId,
} from '../rules/core-psionics';

export interface UnmodifiedMentalScores { readonly intelligence: number; readonly wisdom: number; readonly charisma: number }
export interface PsionicGenerationInput {
  readonly enabled: boolean;
  readonly raceId: CorePsionicRaceId;
  readonly demiHumanEnabledByDm?: boolean;
  readonly scores: UnmodifiedMentalScores;
  readonly potentialPercentile?: number;
  readonly strengthPercentile?: number;
  readonly attackModePercentile?: number;
  readonly defenseModePercentile?: number;
  readonly disciplinePercentile?: number;
}

const score = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value < 3 || value > 25) throw new Error(`${label} must be an unmodified integer score from 3 to 25.`);
};
const percentile = (value: number | undefined, label: string) => {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new Error(`${label} must be 1–100 (00 is recorded as 100).`);
};
const band = <T extends { min: number; max: number }>(rows: readonly T[], roll: number) => rows.find(row => roll >= row.min && roll <= row.max)!;

/** Half-point representation preserves the printed 2½/1½/½ coefficients before one final truncation. */
export function psionicPotentialBonus(scores: UnmodifiedMentalScores) {
  score(scores.intelligence, 'INT'); score(scores.wisdom, 'WIS'); score(scores.charisma, 'CHA');
  const halfPoints = Math.max(0, scores.intelligence - 16) * 5
    + Math.max(0, scores.wisdom - 16) * 3
    + Math.max(0, scores.charisma - 16);
  return Object.freeze({ halfPoints, exactBonus: halfPoints / 2, appliedBonus: Math.floor(halfPoints / 2),
    policy: 'sum-fractions-then-drop-remainder' as const });
}

export function generateCorePsionics(input: PsionicGenerationInput) {
  score(input.scores.intelligence, 'INT'); score(input.scores.wisdom, 'WIS'); score(input.scores.charisma, 'CHA');
  for (const [value, label] of [[input.potentialPercentile, 'potential percentile'], [input.strengthPercentile, 'strength percentile'],
    [input.attackModePercentile, 'attack-mode percentile'], [input.defenseModePercentile, 'defense-mode percentile'],
    [input.disciplinePercentile, 'discipline percentile']] as const) percentile(value, label);
  const sources = ['phb:110:psionic-potential', 'phb:110-111:psionic-modes-disciplines'] as const;
  if (!input.enabled) return Object.freeze({ status: 'disabled' as const, reason: 'The campaign has not enabled PHB Appendix I psionics.', sourceIds: sources });
  const racePolicy = psionicRacePolicy[input.raceId];
  if (racePolicy === 'ineligible') return Object.freeze({ status: 'ineligible' as const, reason: 'This race is not included by the verified PHB core eligibility statement.', sourceIds: sources });
  if (racePolicy === 'needs-dm' && input.demiHumanEnabledByDm !== true) return Object.freeze({ status: 'needs-dm' as const, reason: 'Dwarf and halfling eligibility is a campaign choice and requires an explicit DM ruling.', sourceIds: sources });
  if (Math.max(input.scores.intelligence, input.scores.wisdom, input.scores.charisma) < 16) return Object.freeze({ status: 'ineligible' as const, reason: 'No unmodified INT, WIS or CHA score reaches 16.', sourceIds: sources });
  const bonus = psionicPotentialBonus(input.scores);
  if (input.potentialPercentile === undefined) return Object.freeze({ status: 'awaiting-potential-roll' as const, bonus, sourceIds: sources });
  const adjustedPotential = input.potentialPercentile + bonus.appliedBonus;
  if (adjustedPotential < 100) return Object.freeze({ status: 'no-potential' as const, potentialRoll: input.potentialPercentile, adjustedPotential, bonus, sourceIds: sources });
  if ([input.strengthPercentile, input.attackModePercentile, input.defenseModePercentile, input.disciplinePercentile].some(value => value === undefined)) {
    return Object.freeze({ status: 'awaiting-generation-rolls' as const, potentialRoll: input.potentialPercentile, adjustedPotential, bonus, sourceIds: sources });
  }
  const values = Object.values(input.scores);
  const rawAbilityBonus = values.reduce((sum, value) => sum + Math.max(0, value - 12), 0);
  const aboveSixteen = values.filter(value => value > 16).length;
  const multiplier = aboveSixteen === 3 ? 4 : aboveSixteen === 2 ? 2 : 1;
  const abilityBonus = rawAbilityBonus * multiplier;
  const poolMaximum = input.strengthPercentile! + abilityBonus;
  const disciplines = band(disciplineCountBands, input.disciplinePercentile!);
  return Object.freeze({
    status: 'generated' as const, potentialRoll: input.potentialPercentile, adjustedPotential, bonus,
    strengthRoll: input.strengthPercentile!, rawAbilityBonus, abilityBonusMultiplier: multiplier, abilityBonus,
    psionicStrength: poolMaximum, psionicAbility: poolMaximum * 2,
    maximumAttackPoints: poolMaximum, maximumDefensePoints: poolMaximum,
    attackModeCount: band(attackModeCountBands, input.attackModePercentile!).count,
    defenseModeCount: band(defenseModeCountBands, input.defenseModePercentile!).count,
    disciplineCounts: Object.freeze({ minor: disciplines.minor, major: disciplines.major }),
    identityAndAcquisition: 'requires-separate-random-and-dm-reviewed-workflow' as const,
    sourceIds: sources,
  });
}
