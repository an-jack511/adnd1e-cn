import {
  oaAbilityMethods,
  oaBirthRankBands,
  oaClassRules,
  oaCoreAbilityIds,
  oaFamilyRules,
  oaInitialHonorBases,
  oaRaceRules,
  oaStartingFunds,
  type OaAbilityMethodId,
  type OaAlignmentId,
  type OaClassId,
  type OaCoreAbilityId,
  type OaCurrencyId,
  type OaRaceId,
  type OaSourceId,
} from '../rules/oa-character-foundation';

export type OaDecision = 'allowed' | 'forbidden' | 'needs-dm';
export interface OaIssue { readonly id: string; readonly message: string; readonly sourceIds: readonly OaSourceId[] }
export type OaScores = Readonly<Record<OaCoreAbilityId, number>>;
const issue = (id: string, message: string, ...sourceIds: OaSourceId[]): OaIssue => ({ id, message, sourceIds });

function die(value: number, sides: number, label = 'die'): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > sides) throw new Error(`${label} must be an integer from 1 through ${sides}.`);
}
function group(values: readonly number[], count: number, sides: number, label: string): number {
  if (values.length !== count) throw new Error(`${label} must contain ${count} dice.`);
  values.forEach((value, index) => die(value, sides, `${label}[${index}]`));
  return values.reduce((sum, value) => sum + value, 0);
}
function assignment(values: readonly number[], ids: readonly OaCoreAbilityId[]): OaScores {
  if (ids.length !== 6 || new Set(ids).size !== 6 || oaCoreAbilityIds.some(id => !ids.includes(id))) throw new Error('assignment must contain each first-six OA ability exactly once.');
  return Object.freeze(Object.fromEntries(ids.map((id, index) => [id, values[index]])) as unknown as OaScores);
}
function chaComelinessAdjustment(charisma: number): number {
  if (charisma <= 2) return -8;
  if (charisma === 3) return -5;
  if (charisma <= 5) return -3;
  if (charisma <= 8) return -1;
  if (charisma <= 12) return 0;
  if (charisma <= 15) return 1;
  if (charisma <= 17) return 2;
  if (charisma === 18) return 3;
  return 5;
}

export interface OaAbilityGenerationResult {
  readonly methodId: OaAbilityMethodId; readonly scores: OaScores;
  readonly rawComeliness: number; readonly finalComeliness: number;
  readonly selectedIndexes: readonly number[]; readonly sourceIds: readonly OaSourceId[];
}

/** Resolves recorded dice. Randomness stays outside the engine so every result remains auditable. */
export function resolveOaAbilities(input: {
  methodId: OaAbilityMethodId;
  rolls: readonly (readonly number[])[] | readonly (readonly (readonly number[])[])[];
  assignTo?: readonly OaCoreAbilityId[];
  selectedIndexes?: readonly number[];
  selectedCharacterIndex?: number;
  comelinessDice: readonly number[];
  raceId: OaRaceId;
}): OaAbilityGenerationResult {
  if (!oaAbilityMethods[input.methodId]) throw new Error('Unknown OA ability method.');
  let totals: number[];
  let selectedIndexes: number[] = [];
  if (input.methodId === 'OA-IV') {
    const characters = input.rolls as readonly (readonly (readonly number[])[])[];
    if (characters.length !== 12) throw new Error('OA-IV requires twelve complete candidate characters.');
    const all = characters.map((character, ci) => {
      if (character.length !== 6) throw new Error(`OA-IV character ${ci} must contain six ability groups.`);
      return character.map((dice, ai) => group(dice, 3, 6, `character[${ci}][${ai}]`));
    });
    const selected = input.selectedCharacterIndex;
    if (!Number.isSafeInteger(selected) || selected! < 0 || selected! >= 12) throw new Error('OA-IV selectedCharacterIndex must be 0-11.');
    totals = all[selected!];
    selectedIndexes = [selected!];
  } else {
    const rolls = input.rolls as readonly (readonly number[])[];
    const expected = input.methodId === 'OA-II' ? 12 : 6;
    if (rolls.length !== expected) throw new Error(`${input.methodId} requires ${expected} roll groups.`);
    const all = rolls.map((dice, index) => input.methodId === 'OA-I'
      ? (group(dice, 4, 6, `rolls[${index}]`), [...dice].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0))
      : group(dice, 3, 6, `rolls[${index}]`));
    if (input.methodId === 'OA-II') {
      const picks = input.selectedIndexes;
      if (!picks || picks.length !== 6 || new Set(picks).size !== 6 || picks.some(index => !Number.isSafeInteger(index) || index < 0 || index >= 12)) {
        throw new Error('OA-II requires six distinct selectedIndexes from 0 through 11.');
      }
      totals = picks.map(index => all[index]); selectedIndexes = [...picks];
    } else { totals = all; selectedIndexes = [0, 1, 2, 3, 4, 5]; }
  }
  const ids = input.methodId === 'OA-III' || input.methodId === 'OA-IV' ? oaCoreAbilityIds : input.assignTo;
  if (!ids) throw new Error(`${input.methodId} requires assignTo.`);
  const scores = assignment(totals, ids);
  const rawComeliness = group(input.comelinessDice, 3, 6, 'comelinessDice');
  const raceAdjustment = input.raceId === 'korobokuru' ? -2 : input.raceId === 'hengeyokai' ? -1 : input.raceId === 'spirit-folk' ? 1 : 0;
  return { methodId: input.methodId, scores, rawComeliness,
    finalComeliness: rawComeliness + chaComelinessAdjustment(scores.CHA) + raceAdjustment,
    selectedIndexes, sourceIds: ['oa:6-10:abilities'] };
}

function alignmentMatches(rule: string, alignment: OaAlignmentId): boolean {
  if (rule === 'any') return true;
  if (rule === 'lawful') return alignment.startsWith('L');
  if (rule === 'good') return alignment.endsWith('G');
  if (rule === 'non-lawful') return !alignment.startsWith('L');
  return !alignment.endsWith('G');
}
function checkClass(classId: OaClassId, raceId: OaRaceId, alignmentId: OaAlignmentId, scores: OaScores, issues: OaIssue[]): void {
  const rule = oaClassRules[classId];
  if (rule.raceLevelCaps[raceId] === null) issues.push(issue(`race-class-${classId}`, `${raceId} cannot enter OA ${classId}.`, 'oa:11-13:races'));
  if (!alignmentMatches(rule.alignment, alignmentId)) issues.push(issue(`alignment-${classId}`, `${alignmentId} violates the OA ${classId} alignment rule.`, 'oa:11-13:races', 'oa:14-30:classes'));
  for (const [ability, requirement] of Object.entries(rule.abilityRequirements) as [OaCoreAbilityId, { minimum?: number; maximum?: number }][]) {
    if (requirement.minimum !== undefined && scores[ability] < requirement.minimum) issues.push(issue(`${classId}-${ability}-minimum`, `${ability} must be at least ${requirement.minimum}.`, 'oa:14-30:classes'));
    if (requirement.maximum !== undefined && scores[ability] > requirement.maximum) issues.push(issue(`${classId}-${ability}-maximum`, `${ability} must be no more than ${requirement.maximum}.`, 'oa:14-30:classes'));
  }
}

export interface OaQualificationReview {
  readonly status: OaDecision; readonly adjustedScores: OaScores; readonly levelCap: number | 'unlimited' | null;
  readonly coverClassId: OaClassId | null; readonly issues: readonly OaIssue[]; readonly sourceIds: readonly OaSourceId[];
}

export function reviewOaQualification(input: {
  raceId: OaRaceId; classId: OaClassId; alignmentId: OaAlignmentId; rawScores: OaScores;
  coverClassId?: OaClassId | null;
  hengeyokaiSubtypeAdjustments?: Partial<Readonly<Record<OaCoreAbilityId, number>>> | null;
}): OaQualificationReview {
  for (const id of oaCoreAbilityIds) if (!Number.isSafeInteger(input.rawScores[id]) || input.rawScores[id] < 3 || input.rawScores[id] > 18) throw new Error(`${id} must be an integer from 3 through 18 before racial adjustment.`);
  const race = oaRaceRules[input.raceId];
  const pre = Object.fromEntries(oaCoreAbilityIds.map(id => [id, input.rawScores[id] + (race.preQualificationAdjustments[id] ?? 0)])) as unknown as OaScores;
  const issues: OaIssue[] = [];
  for (const id of oaCoreAbilityIds) {
    const [minimum, maximum] = race.ranges[id];
    if (pre[id] < minimum || pre[id] > maximum) issues.push(issue(`race-${id}`, `${input.raceId} requires ${id} ${minimum}-${maximum} at its OA qualification step.`, 'oa:11-13:races'));
  }
  let adjusted: OaScores = pre;
  if (input.raceId === 'hengeyokai') {
    if (input.hengeyokaiSubtypeAdjustments === null || input.hengeyokaiSubtypeAdjustments === undefined) {
      issues.push(issue('hengeyokai-subtype-delegated', 'Hengeyokai creature type and Table 11 modifiers remain delegated.', 'oa:11-13:races'));
    } else {
      adjusted = Object.fromEntries(oaCoreAbilityIds.map(id => [id, pre[id] + (input.hengeyokaiSubtypeAdjustments?.[id] ?? 0)])) as unknown as OaScores;
      for (const id of oaCoreAbilityIds) if (adjusted[id] > race.ranges[id][1]) issues.push(issue(`hengeyokai-${id}-maximum`, `Post-choice ${id} exceeds the racial maximum; OA permits falling below a minimum, not rising above a maximum.`, 'oa:11-13:races'));
    }
  }
  checkClass(input.classId, input.raceId, input.alignmentId, adjusted, issues);
  let coverClassId: OaClassId | null = input.coverClassId ?? null;
  if (input.classId === 'ninja') {
    const allowed = oaClassRules.ninja.ninjaCoverClasses!;
    if (!coverClassId || !allowed.includes(coverClassId)) issues.push(issue('ninja-cover-class', 'OA ninja is not independent and must also qualify as bushi, sohei, wu jen, or yakuza.', 'oa:14-30:classes'));
    else checkClass(coverClassId, input.raceId, input.alignmentId, adjusted, issues);
  } else if (coverClassId !== null) throw new Error('coverClassId is only valid for the OA ninja track.');
  const dmOnly = issues.some(item => item.id === 'hengeyokai-subtype-delegated');
  const forbidden = issues.some(item => item.id !== 'hengeyokai-subtype-delegated');
  return { status: forbidden ? 'forbidden' : dmOnly ? 'needs-dm' : 'allowed', adjustedScores: adjusted,
    levelCap: oaClassRules[input.classId].raceLevelCaps[input.raceId], coverClassId, issues,
    sourceIds: ['oa:11-13:races', 'oa:14-30:classes'] };
}

export interface OaBirthPlan {
  readonly status: 'not-used' | 'roll-required' | 'needs-dm'; readonly familyRequired: boolean;
  readonly modifier: number | null; readonly clan: string | null; readonly issues: readonly OaIssue[];
}
export function planOaBirth(classId: OaClassId, yakuzaModifierRuling: -10 | -5 | null = null): OaBirthPlan {
  if (classId === 'monk') return { status: 'not-used', familyRequired: false, modifier: 0, clan: null, issues: [] };
  const rule = oaFamilyRules.byClass[classId];
  if (classId === 'yakuza' && yakuzaModifierRuling === null) return { status: 'needs-dm', familyRequired: true, modifier: null, clan: 'yakuza-organization',
    issues: [issue('yakuza-birth-modifier-conflict', 'Table 37 says -10 while the yakuza class text says -5; record the campaign ruling.', 'oa:31-34:family', 'oa:14-30:classes')] };
  return { status: rule.birthTable ? 'roll-required' : 'not-used', familyRequired: rule.familyRequired,
    modifier: classId === 'yakuza' ? yakuzaModifierRuling : rule.modifier, clan: 'clan' in rule ? rule.clan : null, issues: [] };
}

export function resolveOaBirthRank(input: { dice: readonly [number, number]; modifier: number }): { status: 'resolved' | 'needs-dm'; total: number; band: (typeof oaBirthRankBands)[number] | null; issues: readonly OaIssue[] } {
  die(input.dice[0], 10, 'birth die 1'); die(input.dice[1], 10, 'birth die 2');
  if (!Number.isSafeInteger(input.modifier)) throw new Error('birth modifier must be an integer.');
  const total = input.dice[0] + input.dice[1] + input.modifier;
  const band = oaBirthRankBands.find(item => total >= item.minimum && total <= item.maximum) ?? null;
  return band ? { status: 'resolved', total, band, issues: [] } : { status: 'needs-dm', total, band: null,
    issues: [issue('birth-total-outside-table', `Modified birth total ${total} is outside Table 38's 2-30 rows; OA gives no clamping rule here.`, 'oa:31-34:family')] };
}

/** Resolves the PC's place among siblings after the family row size is known. */
export function resolveOaBirthOrder(input: { siblingSpaces: number; dieSides: 4 | 6 | 8; roll: number }): { status: 'resolved' | 'reroll'; birthOrder: number | null } {
  if (!Number.isSafeInteger(input.siblingSpaces) || input.siblingSpaces < 1 || input.siblingSpaces > 8) throw new Error('siblingSpaces must be 1-8.');
  const expectedSides = input.siblingSpaces <= 4 ? 4 : input.siblingSpaces <= 6 ? 6 : 8;
  if (input.dieSides !== expectedSides) throw new Error(`Use d${expectedSides}, the die that most closely covers ${input.siblingSpaces} spaces without being smaller.`);
  die(input.roll, input.dieSides, 'birth-order roll');
  return input.roll > input.siblingSpaces ? { status: 'reroll', birthOrder: null } : { status: 'resolved', birthOrder: input.roll };
}

export function calculateOaStartingHonor(input: {
  classId: OaClassId; raceId: OaRaceId; scores: OaScores;
  familyBaseHonor?: number | null; ancestryHonorAdjustments?: readonly number[];
  birthrightPersonalHonor?: readonly number[]; noFamilyBaseChoice?: 'class' | 'race' | null;
  yakuzaD20?: number | null;
}): { status: 'calculated' | 'not-recorded' | 'needs-dm'; characterHonor: number | null; familyHonor: number | null; issues: readonly OaIssue[] } {
  if (input.classId === 'monk') return { status: 'not-recorded', characterHonor: null, familyHonor: null, issues: [] };
  const lowest = Math.min(...oaCoreAbilityIds.map(id => input.scores[id]));
  if (input.familyBaseHonor !== undefined && input.familyBaseHonor !== null) {
    const ancestry = (input.ancestryHonorAdjustments ?? []).reduce((a, b) => a + b, 0);
    const familyHonor = Math.max(0, input.familyBaseHonor + ancestry);
    const birthright = (input.birthrightPersonalHonor ?? []).reduce((a, b) => a + b, 0);
    return { status: 'calculated', familyHonor, characterHonor: familyHonor + birthright + lowest, issues: [] };
  }
  const classBase = input.classId in oaInitialHonorBases ? oaInitialHonorBases[input.classId as keyof typeof oaInitialHonorBases] : undefined;
  const raceBase = input.raceId === 'hengeyokai' ? oaInitialHonorBases.hengeyokai : undefined;
  if (classBase !== undefined && raceBase !== undefined && classBase !== raceBase && input.noFamilyBaseChoice === null) return { status: 'needs-dm', characterHonor: null, familyHonor: null,
    issues: [issue('race-class-honor-base-choice', 'Table 41 supplies different race and class bases but does not state priority; record the DM choice.', 'oa:35-37:honor')] };
  let base = input.noFamilyBaseChoice === 'race' ? raceBase : classBase ?? raceBase;
  if (base === '1d20+20') {
    if (input.yakuzaD20 === null || input.yakuzaD20 === undefined) return { status: 'needs-dm', characterHonor: null, familyHonor: null, issues: [issue('yakuza-honor-roll', 'Yakuza base honor requires the recorded 1d20 roll.', 'oa:35-37:honor')] };
    die(input.yakuzaD20, 20, 'yakuza honor die'); base = input.yakuzaD20 + 20;
  }
  if (typeof base !== 'number') return { status: 'needs-dm', characterHonor: null, familyHonor: null,
    issues: [issue('missing-honor-path', 'No verified no-family base applies; supply the family base or a DM ruling.', 'oa:35-37:honor')] };
  return { status: 'calculated', familyHonor: null, characterHonor: base + lowest, issues: [] };
}

export function calculateOaStartingFunds(input: {
  classId: OaClassId; rolls: readonly (readonly number[])[];
  coverClass?: { classId: Exclude<OaClassId, 'ninja'>; rolls: readonly (readonly number[])[] } | null;
}): { totals: Readonly<Partial<Record<OaCurrencyId, number>>>; sourceIds: readonly OaSourceId[] } {
  const totals: Partial<Record<OaCurrencyId, number>> = {};
  const add = (classId: OaClassId, rolls: readonly (readonly number[])[]) => {
    const components = oaStartingFunds[classId];
    if (rolls.length !== components.length) throw new Error(`${classId} requires ${components.length} fund roll groups.`);
    components.forEach((component, index) => {
      const amount = group(rolls[index], component.dice[0], component.dice[1], `${classId} funds[${index}]`);
      totals[component.currency] = (totals[component.currency] ?? 0) + amount;
    });
  };
  if (input.classId === 'ninja') {
    if (!input.coverClass || !oaClassRules.ninja.ninjaCoverClasses!.includes(input.coverClass.classId)) throw new Error('Ninja funds require a legal cover-class fund package.');
    add(input.coverClass.classId, input.coverClass.rolls); add('ninja', input.rolls);
  } else {
    if (input.coverClass) throw new Error('coverClass funds are only valid for ninja.');
    add(input.classId, input.rolls);
  }
  return { totals: Object.freeze(totals), sourceIds: ['oa:38:money'] };
}

export type OaFoundationStage = 'abilities' | 'race-class' | 'family-caste' | 'honor' | 'funds' | 'skills-equipment' | 'complete';
const stageOrder: readonly OaFoundationStage[] = ['abilities', 'race-class', 'family-caste', 'honor', 'funds', 'skills-equipment', 'complete'];
export function advanceOaFoundationStage(current: OaFoundationStage, completed: OaFoundationStage, hasUnresolvedDecision: boolean): { stage: OaFoundationStage; status: 'advanced' | 'needs-dm' } {
  const index = stageOrder.indexOf(current);
  if (index < 0 || completed !== current || current === 'complete') throw new Error('Only the current incomplete OA stage can advance.');
  if (hasUnresolvedDecision) return { stage: current, status: 'needs-dm' };
  return { stage: stageOrder[index + 1], status: 'advanced' };
}
