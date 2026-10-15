import {
  uaCavalierStartingPackages,
  uaFoundationClassRequirements,
  uaMethodVDiceByClass,
  uaMethodVRule,
  uaProgressionFoundations,
  uaStartingHitPointFloors,
  uaThiefAcrobatTransitionEquipment,
  type UaAbilityId,
  type UaAbilityScores,
  type UaAlignment,
  type UaCavalierSocialPackageId,
  type UaFoundationClassId,
  type UaMethodVClassId,
  type UaRaceStock,
  type UaRuleStatus,
} from '../rules/ua-character-foundation';

const abilityIds: readonly UaAbilityId[] = Object.freeze(['strength','intelligence','wisdom','dexterity','constitution','charisma','comeliness']);

export interface UaMethodVRequest {
  readonly classId: UaMethodVClassId;
  readonly raceStock: UaRaceStock;
  readonly dmApprovedClass: boolean;
  readonly rolls: Readonly<Record<UaAbilityId, readonly number[]>>;
  readonly classMinimums?: Partial<Record<UaAbilityId, number>>;
  readonly classMaximums?: Partial<Record<UaAbilityId, number>>;
}

export interface UaMethodVResult {
  readonly status: UaRuleStatus;
  readonly legal: boolean;
  readonly scores: Readonly<Record<UaAbilityId, number>> | null;
  readonly rawBestThree: Readonly<Record<UaAbilityId, number>> | null;
  readonly issues: readonly string[];
  readonly audit: readonly string[];
}

function validateD6Pool(pool: readonly number[], expected: number, ability: UaAbilityId): void {
  if (pool.length !== expected) throw new Error(`${ability} requires exactly ${expected}d6 for Method V.`);
  if (pool.some(value => !Number.isSafeInteger(value) || value < 1 || value > 6)) throw new Error(`${ability} Method V rolls must all be integer d6 results.`);
}

export function evaluateUaMethodV(request: UaMethodVRequest): UaMethodVResult {
  const issues: string[] = [];
  const audit: string[] = [];
  if (request.raceStock !== 'human') issues.push('UA Method V can only create human player characters.');
  if (!request.dmApprovedClass) issues.push('The desired class requires DM approval before Method V is used.');
  const raw = {} as Record<UaAbilityId, number>;
  const scores = {} as Record<UaAbilityId, number>;
  for (const ability of abilityIds) {
    const expected = uaMethodVDiceByClass[request.classId][ability];
    const pool = request.rolls[ability];
    validateD6Pool(pool, expected, ability);
    const bestThree = [...pool].sort((a,b) => b-a).slice(0, uaMethodVRule.keepHighestDice).reduce((a,b) => a+b, 0);
    raw[ability] = bestThree;
    const minimum = request.classMinimums?.[ability];
    const maximum = request.classMaximums?.[ability];
    scores[ability] = Math.min(maximum ?? Number.POSITIVE_INFINITY, Math.max(minimum ?? Number.NEGATIVE_INFINITY, bestThree));
    if (scores[ability] !== bestThree) audit.push(`${ability}: ${bestThree} clamped to ${scores[ability]}.`);
  }
  const legal = issues.length === 0;
  return Object.freeze({
    status: legal ? 'verified' : 'needs-dm', legal,
    scores: Object.freeze(scores), rawBestThree: Object.freeze(raw),
    issues: Object.freeze(issues), audit: Object.freeze(audit),
  });
}

export interface UaEligibilityRequest {
  readonly classId: UaFoundationClassId;
  readonly raceStock: UaRaceStock;
  readonly alignment: UaAlignment;
  readonly abilities: UaAbilityScores;
  readonly uaEnabled: boolean;
  readonly dmApproved: boolean;
  readonly socialStandingResolved?: boolean;
  readonly nobleSponsorshipApproved?: boolean;
  readonly nativeTerritoryApproved?: boolean;
  readonly currentClass?: 'thief' | string;
  readonly currentLevel?: number;
  readonly trainerLevel?: number;
  readonly trainingWeeksCommitted?: number;
}

export interface UaEligibilityResult {
  readonly classId: UaFoundationClassId;
  readonly status: UaRuleStatus;
  readonly mechanicallyEligible: boolean;
  readonly readyToEnter: boolean;
  readonly blockers: readonly string[];
  readonly dmGates: readonly string[];
  readonly nextState: 'disabled' | 'ineligible' | 'awaiting-dm' | 'awaiting-training' | 'ready';
}

function abilityValue(scores: UaAbilityScores, id: keyof UaAbilityScores): number | undefined { return scores[id]; }

export function reviewUaFoundationEligibility(request: UaEligibilityRequest): UaEligibilityResult {
  const blockers: string[] = [];
  const dmGates: string[] = [];
  if (!request.uaEnabled) blockers.push('Unearthed Arcana character foundation is not enabled for this campaign.');
  const rule = uaFoundationClassRequirements[request.classId];
  if (!(rule.raceStocks as readonly UaRaceStock[]).includes(request.raceStock)) blockers.push(`${request.raceStock} is not permitted for ${request.classId} by UA Character Race Table I.`);
  if (!(rule.alignments as readonly UaAlignment[]).includes(request.alignment)) blockers.push(`${request.alignment} is not permitted for ${request.classId}.`);
  for (const [id, minimum] of Object.entries(rule.minimums) as [keyof UaAbilityScores, number][]) {
    if ((abilityValue(request.abilities, id) ?? Number.NEGATIVE_INFINITY) < minimum) blockers.push(`${id} must be at least ${minimum}.`);
  }
  if ('maximums' in rule) for (const [id, maximum] of Object.entries(rule.maximums) as [keyof UaAbilityScores, number][]) {
    if ((abilityValue(request.abilities, id) ?? Number.POSITIVE_INFINITY) > maximum) blockers.push(`${id} must be no greater than ${maximum}.`);
  }

  if (request.classId === 'cavalier' || request.classId === 'paladin') {
    if (!request.socialStandingResolved && !request.nobleSponsorshipApproved) dmGates.push('DM must resolve qualifying social standing or approve noble sponsorship and the 0-level route.');
    if (request.raceStock === 'half-elf' && !request.nobleSponsorshipApproved) dmGates.push('Half-elf stock/sponsorship condition must be recorded; the summary table does not encode ancestry detail.');
  }
  if (request.classId === 'barbarian' && !request.nativeTerritoryApproved) dmGates.push('DM must approve a native barbaric territory/background and its initial weapon context.');
  if (request.classId === 'thief-acrobat') {
    if (request.currentClass !== 'thief') blockers.push('Thief-acrobat must transition from thief.');
    if ((request.currentLevel ?? 0) !== 5) blockers.push('The transition is taken after completing 5th-level thief and qualifying for 6th-level ability.');
    if ((request.trainerLevel ?? 0) < 10) dmGates.push('An established thief-acrobat trainer of at least 10th level is required.');
    if ((request.trainingWeeksCommitted ?? 0) < 6) dmGates.push('Six full weeks of transition training must be committed and resolved.');
  }
  if (!request.dmApproved) dmGates.push('DM approval has not been recorded.');

  const mechanicallyEligible = blockers.length === 0;
  const readyToEnter = mechanicallyEligible && dmGates.length === 0;
  const nextState = !request.uaEnabled ? 'disabled' : !mechanicallyEligible ? 'ineligible' : dmGates.length > 0
    ? (request.classId === 'thief-acrobat' ? 'awaiting-training' : 'awaiting-dm') : 'ready';
  return Object.freeze({
    classId: request.classId, status: readyToEnter ? 'verified' : 'needs-dm', mechanicallyEligible, readyToEnter,
    blockers: Object.freeze(blockers), dmGates: Object.freeze(dmGates), nextState,
  });
}

export function getUaProgressionAtXp(classId: UaFoundationClassId, xp: number) {
  if (!Number.isSafeInteger(xp)) throw new Error('XP must be a safe integer.');
  const data = uaProgressionFoundations[classId];
  if (!('rows' in data)) return Object.freeze({classId, status:'needs-dm' as const, row:null, note:data.note});
  const row = [...data.rows].reverse().find(item => xp >= item.minimumXp) ?? null;
  return Object.freeze({classId, status:data.status, row, note:'note' in data ? data.note : null});
}

export function applyUaStartingHitPointFloor(classId: UaMethodVClassId, rolledHp: number, constitutionAdjustment = 0) {
  if (!Number.isSafeInteger(rolledHp) || !Number.isSafeInteger(constitutionAdjustment)) throw new Error('HP values must be safe integers.');
  const floor = uaStartingHitPointFloors[classId];
  const flooredRoll = Math.max(rolledHp, floor);
  return Object.freeze({classId, rolledHp, floor, flooredRoll, finalHp:flooredRoll + constitutionAdjustment, floorApplied:flooredRoll !== rolledHp});
}

export function reviewUaCavalierStartingPackage(packageId: UaCavalierSocialPackageId, rolledGp: number) {
  if (!Number.isSafeInteger(rolledGp)) throw new Error('Starting gp must be a safe integer.');
  const pack = uaCavalierStartingPackages[packageId];
  return Object.freeze({
    packageId, package:pack, legal:rolledGp >= pack.gpMin && rolledGp <= pack.gpMax,
    issues:Object.freeze(rolledGp < pack.gpMin || rolledGp > pack.gpMax ? [`Starting gp must be between ${pack.gpMin} and ${pack.gpMax}.`] : []),
  });
}

export function reviewUaThiefAcrobatTransitionEquipment(totalGp: number) {
  if (!Number.isSafeInteger(totalGp) || totalGp < 0) throw new Error('Equipment total must be a non-negative safe integer.');
  return Object.freeze({
    totalGp, maximumGp:uaThiefAcrobatTransitionEquipment.maximumTotalGpAtLevel6,
    legal:totalGp <= uaThiefAcrobatTransitionEquipment.maximumTotalGpAtLevel6,
  });
}
