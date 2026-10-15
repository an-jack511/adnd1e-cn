import {
  charismaRelationshipTable,
  loyaltyModifierRules,
  moraleFailureBands,
  moraleRollModifiers,
  moraleTriggers,
  type LoyaltyModifierGroup,
  type RelationshipKind,
} from '../rules/core-relationships';

const charismaRow = (score: number) => {
  if (!Number.isSafeInteger(score) || score < 3 || score > 18) throw new Error('Charisma must be an integer from 3 through 18.');
  return charismaRelationshipTable.find(row => row.score === score)!;
};
const d100 = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new Error('A percentile roll must be an integer from 1 through 100 (00 = 100).');
  return value;
};

export interface HenchmanCapacityResult {
  readonly maximum: number;
  readonly current: number;
  readonly remaining: number;
  readonly status: 'available' | 'at-capacity' | 'over-capacity';
  readonly sourceIds: readonly ['phb:13:charisma'];
}
/** PHB13 limits henchmen only. Hirelings and troops must never call this check. */
export function checkHenchmanCapacity(charismaScore: number, currentHenchmen: number): HenchmanCapacityResult {
  if (!Number.isSafeInteger(currentHenchmen) || currentHenchmen < 0) throw new Error('Current henchman count must be a non-negative integer.');
  const maximum = charismaRow(charismaScore).maximumHenchmen;
  return Object.freeze({ maximum, current: currentHenchmen, remaining: Math.max(0, maximum - currentHenchmen),
    status: currentHenchmen < maximum ? 'available' : currentHenchmen === maximum ? 'at-capacity' : 'over-capacity',
    sourceIds: ['phb:13:charisma'] as const });
}

export interface HenchmanOfferInput {
  readonly applicantLevel: number;
  readonly initialPaymentGp: number;
  readonly usableMagicItemsOffered: number;
  readonly quartersAndSupportPromised: boolean;
  readonly charismaScore: number;
  /** Kept private by the caller; omit to calculate the chance without adjudicating acceptance. */
  readonly acceptanceRoll?: number;
}
export interface HenchmanOfferResult {
  readonly status: 'invalid-offer' | 'chance-calculated' | 'accepted' | 'rejected';
  readonly paymentInterest: number;
  readonly magicItemInterest: number;
  readonly supportInterest: number;
  readonly charismaReaction: number;
  readonly acceptanceTarget: number;
  readonly reasons: readonly string[];
  readonly sourceIds: readonly ['phb:13:charisma', 'dmg:34-36:henchmen'];
  /** DM-private. It is intentionally absent when the caller did not submit a roll. */
  readonly privateRoll?: number;
}

export function evaluateHenchmanOffer(input: HenchmanOfferInput): HenchmanOfferResult {
  if (!Number.isSafeInteger(input.applicantLevel) || input.applicantLevel < 1) throw new Error('Applicant level must be a positive integer.');
  if (!Number.isSafeInteger(input.initialPaymentGp) || input.initialPaymentGp < 0) throw new Error('Initial payment must be a non-negative integer number of gp.');
  if (!Number.isSafeInteger(input.usableMagicItemsOffered) || input.usableMagicItemsOffered < 0) throw new Error('Usable magic-item count must be a non-negative integer.');
  const minimum = input.applicantLevel * 100;
  const row = charismaRow(input.charismaScore);
  if (input.initialPaymentGp < minimum) return Object.freeze({
    status: 'invalid-offer', paymentInterest: 0, magicItemInterest: input.usableMagicItemsOffered * 15,
    supportInterest: input.quartersAndSupportPromised ? 5 : -25, charismaReaction: row.reactionAdjustment,
    acceptanceTarget: 0, reasons: [`Initial payment is below ${minimum} gp (100 gp per applicant level).`],
    sourceIds: ['phb:13:charisma', 'dmg:34-36:henchmen'] as const,
  });
  const additionalHundreds = Math.floor((input.initialPaymentGp - minimum) / 100);
  const paymentInterest = Math.min(55, 25 + additionalHundreds * 10);
  const magicItemInterest = input.usableMagicItemsOffered * 15;
  const supportInterest = input.quartersAndSupportPromised ? 5 : -25;
  const acceptanceTarget = paymentInterest + magicItemInterest + supportInterest + row.reactionAdjustment;
  const base = { paymentInterest, magicItemInterest, supportInterest, charismaReaction: row.reactionAdjustment,
    acceptanceTarget, reasons: [] as readonly string[],
    sourceIds: ['phb:13:charisma', 'dmg:34-36:henchmen'] as const };
  if (input.acceptanceRoll === undefined) return Object.freeze({ status: 'chance-calculated', ...base });
  const roll = d100(input.acceptanceRoll);
  return Object.freeze({ status: roll <= acceptanceTarget ? 'accepted' : 'rejected', ...base, privateRoll: roll });
}

export interface LoyaltySelection { readonly id: string; readonly count?: number }
export interface LoyaltyManualAdjustment {
  readonly value: number;
  readonly reason: string;
  readonly authority: 'dm-ruling';
}
export interface LoyaltyCalculationInput {
  readonly charismaScore: number;
  readonly selections: readonly LoyaltySelection[];
  /** Required only when the cruel/domineering row is selected: -10 absent, +10 present/in power, 0 otherwise. */
  readonly cruelTreatmentResolved?: -10 | 0 | 10;
  readonly manualAdjustments?: readonly LoyaltyManualAdjustment[];
}
export type LoyaltyBand = 'none' | 'disloyal' | 'little' | 'fair' | 'loyal' | 'fanatical';
export interface LoyaltyCalculation {
  readonly status: 'calculated' | 'needs-dm';
  readonly score: number | null;
  readonly band: LoyaltyBand | null;
  readonly charismaAdjustment: number;
  readonly applied: readonly { id: string; count: number; subtotal: number }[];
  readonly manualAdjustments: readonly LoyaltyManualAdjustment[];
  readonly reasons: readonly string[];
  readonly sourceIds: readonly ['phb:13:charisma', 'dmg:36-37:loyalty'];
}

const singletonGroups = new Set<LoyaltyModifierGroup>([
  'association', 'service-length', 'training-status', 'pay-share', 'discipline-activity', 'treatment',
  'racial-liege', 'racial-group', 'alignment-distance-liege', 'alignment-distance-group', 'liege-alignment',
]);
const loyaltyBand = (score: number): LoyaltyBand => score < 1 ? 'none' : score <= 25 ? 'disloyal'
  : score <= 50 ? 'little' : score <= 75 ? 'fair' : score <= 100 ? 'loyal' : 'fanatical';

/**
 * Calculates a DM-private loyalty score. Special penalties and bonuses obey the
 * DMG37 one-of-each maximum rule; situation entries can be counted.
 */
export function calculatePrivateLoyalty(input: LoyaltyCalculationInput): LoyaltyCalculation {
  const charismaAdjustment = charismaRow(input.charismaScore).loyaltyBaseAdjustment;
  const byGroup = new Map<LoyaltyModifierGroup, { id: string; count: number; subtotal: number }[]>();
  for (const selection of input.selections) {
    const rule = loyaltyModifierRules.find(candidate => candidate.id === selection.id);
    if (!rule) throw new Error(`Unknown loyalty modifier: ${selection.id}`);
    const count = selection.count ?? 1;
    if (!Number.isSafeInteger(count) || count < 1) throw new Error(`Invalid count for loyalty modifier: ${selection.id}`);
    if (!rule.repeatable && count !== 1) throw new Error(`Loyalty modifier is not repeatable: ${selection.id}`);
    const entries = byGroup.get(rule.group) ?? [];
    entries.push({ id: rule.id, count, subtotal: rule.value * count });
    byGroup.set(rule.group, entries);
  }
  for (const group of singletonGroups) {
    if ((byGroup.get(group)?.length ?? 0) > 1) throw new Error(`Only one loyalty selection is allowed for group: ${group}`);
  }
  const reasons: string[] = [];
  if ((byGroup.get('treatment') ?? []).some(entry => entry.id === 'treatment-cruel') && input.cruelTreatmentResolved === undefined) {
    reasons.push('Cruel/domineering treatment changes sign according to the liege presence-and-power note; DM resolution is required.');
  }
  const applied: { id: string; count: number; subtotal: number }[] = [];
  for (const [group, entries] of byGroup) {
    if (group === 'special-negative') {
      const chosen = [...entries].sort((a, b) => a.subtotal - b.subtotal)[0];
      if (chosen) applied.push(chosen);
    } else if (group === 'special-positive') {
      const chosen = [...entries].sort((a, b) => b.subtotal - a.subtotal)[0];
      if (chosen) applied.push(chosen);
    } else if (group === 'treatment' && entries[0]?.id === 'treatment-cruel' && input.cruelTreatmentResolved !== undefined) {
      applied.push({ id: entries[0].id, count: 1, subtotal: input.cruelTreatmentResolved });
    } else applied.push(...entries);
  }
  const manual = [...(input.manualAdjustments ?? [])];
  for (const adjustment of manual) {
    if (!Number.isSafeInteger(adjustment.value) || !adjustment.reason.trim() || adjustment.authority !== 'dm-ruling') {
      throw new Error('Manual loyalty adjustments require an integer value, reason and dm-ruling authority.');
    }
  }
  if (reasons.length) return Object.freeze({ status: 'needs-dm', score: null, band: null, charismaAdjustment,
    applied: Object.freeze(applied), manualAdjustments: Object.freeze(manual), reasons: Object.freeze(reasons),
    sourceIds: ['phb:13:charisma', 'dmg:36-37:loyalty'] as const });
  const score = 50 + charismaAdjustment + applied.reduce((sum, entry) => sum + entry.subtotal, 0)
    + manual.reduce((sum, entry) => sum + entry.value, 0);
  return Object.freeze({ status: 'calculated', score, band: loyaltyBand(score), charismaAdjustment,
    applied: Object.freeze(applied), manualAdjustments: Object.freeze(manual), reasons: Object.freeze([]),
    sourceIds: ['phb:13:charisma', 'dmg:36-37:loyalty'] as const });
}

export interface MoraleRollSelection { readonly id: string; readonly count?: number }
export interface PrivateMoraleResult {
  readonly passed: boolean;
  readonly loyaltyScore: number;
  readonly privateRoll: number;
  readonly rollModifier: number;
  readonly adjustedRoll: number;
  readonly failureMargin: number;
  readonly outcome: 'holds' | 'fall-back-fighting' | 'disengage-retreat' | 'flee-in-panic' | 'surrender';
  readonly sourceIds: readonly ['dmg:67:morale'];
}

/** DM-only combat morale resolution. Positive modifiers worsen the percentile roll. */
export function resolvePrivateMorale(input: {
  readonly loyaltyScore: number;
  readonly roll: number;
  readonly triggerId: string;
  readonly modifiers?: readonly MoraleRollSelection[];
}): PrivateMoraleResult {
  if (!Number.isSafeInteger(input.loyaltyScore)) throw new Error('Loyalty score must be an integer percentage-point total.');
  const roll = d100(input.roll);
  const trigger = moraleTriggers.find(candidate => candidate.id === input.triggerId);
  if (!trigger) throw new Error(`Unknown morale trigger: ${input.triggerId}`);
  let rollModifier = trigger.rollModifier;
  for (const selection of input.modifiers ?? []) {
    const rule = moraleRollModifiers.find(candidate => candidate.id === selection.id);
    if (!rule) throw new Error(`Unknown morale roll modifier: ${selection.id}`);
    const count = selection.count ?? 1;
    if (!Number.isSafeInteger(count) || count < 1) throw new Error(`Invalid count for morale modifier: ${selection.id}`);
    if (!rule.repeatable && count !== 1) throw new Error(`Morale modifier is not repeatable: ${selection.id}`);
    rollModifier += rule.value * count;
  }
  const adjustedRoll = roll + rollModifier;
  const failureMargin = Math.max(0, adjustedRoll - input.loyaltyScore);
  const band = moraleFailureBands.find(candidate => failureMargin >= candidate.min && (candidate.max === null || failureMargin <= candidate.max));
  return Object.freeze({ passed: failureMargin === 0, loyaltyScore: input.loyaltyScore, privateRoll: roll,
    rollModifier, adjustedRoll, failureMargin, outcome: failureMargin === 0 ? 'holds' : band!.outcome,
    sourceIds: ['dmg:67:morale'] as const });
}

export interface PublicRelationshipContract {
  readonly startedOn: string;
  readonly endsOn: string | null;
  readonly payGpPerPeriod: number | null;
  readonly payPeriod: 'day' | 'week' | 'month' | 'year' | 'adventure-share' | 'special';
  readonly treasureShare: string | null;
  readonly duties: readonly string[];
  readonly quartersProvided: boolean;
  readonly foodAndClothingProvided: boolean;
  readonly employerProvidedEquipment: readonly string[];
}
export interface PrivateRelationshipRecord {
  readonly id: string;
  readonly kind: RelationshipKind;
  readonly displayName: string;
  readonly status: 'prospective' | 'active' | 'missing' | 'dismissed' | 'dead' | 'departed';
  readonly contract: PublicRelationshipContract;
  readonly observedHistory: readonly { at: string; summary: string }[];
  readonly secret: {
    readonly npcCharacterId: string | null;
    readonly trueAlignment: string | null;
    readonly trueReligion: string | null;
    readonly personalityNotes: string | null;
    readonly loyalty: LoyaltyCalculation | null;
    readonly moraleHistory: readonly PrivateMoraleResult[];
    readonly dmNotes: readonly string[];
  };
}
export interface PlayerRelationshipProjection {
  readonly schema: 'adnd1e.relationship-player-projection';
  readonly schemaVersion: 1;
  readonly relationshipId: string;
  readonly kind: RelationshipKind;
  readonly displayName: string;
  readonly status: PrivateRelationshipRecord['status'];
  readonly contract: PublicRelationshipContract;
  readonly observedHistory: readonly { at: string; summary: string }[];
  readonly disclosure: 'public-facts-only';
}

/** Allowlists public fields; it never copies then deletes secret keys. */
export function projectRelationshipForPlayer(record: PrivateRelationshipRecord): PlayerRelationshipProjection {
  const contract: PublicRelationshipContract = Object.freeze({
    startedOn: record.contract.startedOn, endsOn: record.contract.endsOn,
    payGpPerPeriod: record.contract.payGpPerPeriod, payPeriod: record.contract.payPeriod,
    treasureShare: record.contract.treasureShare,
    duties: Object.freeze([...record.contract.duties]), quartersProvided: record.contract.quartersProvided,
    foodAndClothingProvided: record.contract.foodAndClothingProvided,
    employerProvidedEquipment: Object.freeze([...record.contract.employerProvidedEquipment]),
  });
  return Object.freeze({ schema: 'adnd1e.relationship-player-projection', schemaVersion: 1,
    relationshipId: record.id, kind: record.kind, displayName: record.displayName, status: record.status,
    contract, observedHistory: Object.freeze(record.observedHistory.map(event => Object.freeze({ at: event.at, summary: event.summary }))),
    disclosure: 'public-facts-only' });
}
