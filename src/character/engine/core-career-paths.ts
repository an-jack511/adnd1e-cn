import { calculateCoreHpAward } from './core-progression';
import { coreCareerPathPack, getCareerPrincipalRule, type CareerPathSourceId } from '../rules/core-career-paths';
import { coreAbilityIds, type CoreAbilityId, type CoreAlignmentId, type CoreRaceId } from '../rules/core-eligibility';
import type { CoreClassId } from '../rules/core-progression';

export type CareerDecision = 'allowed' | 'forbidden' | 'needs-dm';
export interface CareerIssue { readonly id: string; readonly message: string; readonly sourceIds: readonly CareerPathSourceId[] }
const source = (...sourceIds: CareerPathSourceId[]): readonly CareerPathSourceId[] => sourceIds;
const issue = (id: string, message: string, ...sourceIds: CareerPathSourceId[]): CareerIssue => ({ id, message, sourceIds });
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

function requireInteger(value: number, label: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${label} must be a safe integer >= ${minimum}.`);
}
function sameClassSet(left: readonly CoreClassId[], right: readonly CoreClassId[]): boolean {
  return left.length === right.length && [...left].sort().every((id, index) => id === [...right].sort()[index]);
}
function validateClassSet(classIds: readonly CoreClassId[], minimum: number, maximum: number): void {
  if (classIds.length < minimum || classIds.length > maximum || new Set(classIds).size !== classIds.length) {
    throw new Error(`Expected ${minimum}-${maximum} distinct classes.`);
  }
  if (classIds.includes('bard')) throw new Error('Bard is a staged path, not a simultaneous multi-class component.');
}
function isPermittedMultiClass(raceId: CoreRaceId, classIds: readonly CoreClassId[]): boolean {
  return coreCareerPathPack.multiClass.combinations.some(entry =>
    entry.raceIds.includes(raceId) && sameClassSet(entry.classIds, classIds));
}
function validateAbilityScores(scores: AbilityScores): void {
  for (const ability of coreAbilityIds) {
    const value = scores[ability];
    if (!Number.isSafeInteger(value) || value < 3 || value > 18) throw new Error(`${ability} outside the verified 3-18 range.`);
  }
}

export interface MultiClassXpPlan {
  readonly status: 'calculated' | 'needs-dm' | 'forbidden';
  readonly allocations: Readonly<Record<string, number>>;
  readonly unallocatedRemainder: number;
  readonly issues: readonly CareerIssue[];
  readonly sourceIds: readonly CareerPathSourceId[];
}

/** Equal division includes capped classes. An indivisible integer remainder is not silently assigned. */
export function planMultiClassXp(input: {
  raceId: CoreRaceId;
  classIds: readonly CoreClassId[];
  earnedXp: number;
}): MultiClassXpPlan {
  requireInteger(input.earnedXp, 'earnedXp');
  validateClassSet(input.classIds, 2, 3);
  const sourceIds = source('phb:16-17:racial-multiclass-xp', 'phb:32-33:career-paths');
  if (input.raceId === 'human' || !isPermittedMultiClass(input.raceId, input.classIds)) {
    return { status: 'forbidden', allocations: {}, unallocatedRemainder: input.earnedXp,
      issues: [issue('multiclass-combination', '该种族/职业组合不在核心并行多职业清单中。', ...sourceIds)], sourceIds };
  }
  const share = Math.floor(input.earnedXp / input.classIds.length);
  const remainder = input.earnedXp - share * input.classIds.length;
  const allocations = Object.fromEntries(input.classIds.map(classId => [classId, share]));
  if (remainder !== 0) {
    return { status: 'needs-dm', allocations, unallocatedRemainder: remainder,
      issues: [issue('xp-integer-remainder', `原文要求平均分配，但未说明 ${remainder} 点整数余数归属。`, 'phb:16-17:racial-multiclass-xp')], sourceIds };
  }
  return { status: 'calculated', allocations, unallocatedRemainder: 0, issues: [], sourceIds };
}

export interface MultiClassHpGain {
  readonly classId: CoreClassId;
  readonly targetLevel: number;
  readonly rolls: readonly number[];
}
export interface MultiClassHpPlan {
  readonly status: 'calculated' | 'needs-dm';
  readonly numerator: number | null;
  readonly divisor: number;
  readonly quotient: number | null;
  readonly actualAward: number | null;
  readonly classAwardsBeforeDivision: readonly { classId: CoreClassId; award: number; rolls: readonly number[] }[];
  readonly issues: readonly CareerIssue[];
  readonly sourceIds: readonly CareerPathSourceId[];
}

/** Implements PHB19's four steps only; later fixed-HP increments are not silently folded into its die wording. */
export function calculateMultiClassHpGain(input: {
  raceId: CoreRaceId;
  classIds: readonly CoreClassId[];
  constitution: number;
  gains: readonly MultiClassHpGain[];
}): MultiClassHpPlan {
  validateClassSet(input.classIds, 2, 3);
  if (input.raceId === 'human' || !isPermittedMultiClass(input.raceId, input.classIds)) {
    throw new Error('Race/class set is not a permitted core simultaneous multi-class combination.');
  }
  if (!Number.isSafeInteger(input.constitution) || input.constitution < 3 || input.constitution > 18) {
    throw new Error('constitution must be an integer from 3 through 18.');
  }
  if (input.gains.length === 0) throw new Error('At least one class must gain a level.');
  if (new Set(input.gains.map(gain => gain.classId)).size !== input.gains.length) throw new Error('Duplicate class gain.');
  for (const gain of input.gains) if (!input.classIds.includes(gain.classId)) throw new Error('Gain class is not in the career.');
  const awards = input.gains.map(gain => {
    const award = calculateCoreHpAward({ classId: gain.classId, targetLevel: gain.targetLevel,
      constitution: input.constitution, rolls: gain.rolls });
    return { classId: gain.classId, award: award.actualAward, rolls: [...gain.rolls], fixedHp: award.fixedHp };
  });
  const fixed = awards.filter(award => award.fixedHp !== 0);
  if (fixed.length) {
    return { status: 'needs-dm', numerator: null, divisor: input.classIds.length, quotient: null, actualAward: null,
      classAwardsBeforeDivision: awards.map(({ classId, award, rolls }) => ({ classId, award, rolls })),
      issues: [issue('fixed-hp-division', 'PHB19 的四步公式明确谈 hit dice；固定等级 HP 是否进入同一除法，本包不擅自决定。', 'phb:19:multiclass-hp')],
      sourceIds: source('phb:12:constitution', 'phb:19:multiclass-hp') };
  }
  const numerator = awards.reduce((total, award) => total + award.award, 0);
  const quotient = numerator / input.classIds.length;
  const actualAward = Math.floor(quotient + 0.5);
  return { status: 'calculated', numerator, divisor: input.classIds.length, quotient, actualAward,
    classAwardsBeforeDivision: awards.map(({ classId, award, rolls }) => ({ classId, award, rolls })),
    issues: [], sourceIds: source('phb:12:constitution', 'phb:19:multiclass-hp') };
}

export type AbilityScores = Readonly<Record<CoreAbilityId, number>>;
export interface TwoClassSwitchReview {
  readonly status: CareerDecision;
  readonly oldPrincipalAbilities: readonly CoreAbilityId[];
  readonly newPrincipalAbilities: readonly CoreAbilityId[];
  readonly effects: {
    readonly retainOldHitDiceAndHp: true;
    readonly newClassBeginsAtLevelOne: true;
    readonly oldClassProgressionStops: true;
    readonly formerFunctionsLockedUntilNewClassExceedsOldLevel: true;
  };
  readonly issues: readonly CareerIssue[];
  readonly sourceIds: readonly CareerPathSourceId[];
}

/** Pair approval and entry eligibility are explicit inputs because PHB33's “nearly any” is not a complete whitelist. */
export function reviewTwoClassSwitch(input: {
  raceId: CoreRaceId;
  oldClassId: CoreClassId;
  newClassId: CoreClassId;
  oldLevel: number;
  scores: AbilityScores;
  pairRuling: 'approved' | 'denied' | null;
  alignmentCompatibility: 'compatible' | 'incompatible' | 'needs-dm';
  newClassEntry: 'eligible' | 'ineligible' | 'needs-dm';
}): TwoClassSwitchReview {
  requireInteger(input.oldLevel, 'oldLevel', 1);
  if (input.oldClassId === input.newClassId) throw new Error('The two classes must differ.');
  validateAbilityScores(input.scores);
  const sourceIds = source('phb:32-33:career-paths');
  const issues: CareerIssue[] = [];
  let forbidden = false;
  if (input.raceId !== 'human') {
    forbidden = true;
    issues.push(issue('two-class-human-only', '“Character With Two Classes”只适用于人类；非人类并行多职业是另一机制。', ...sourceIds));
  }
  const oldRule = getCareerPrincipalRule(input.oldClassId);
  const newRule = getCareerPrincipalRule(input.newClassId);
  if (!oldRule.abilityIds) issues.push(issue('old-principal-unresolved', '旧职业主属性映射尚未在本包中封口。', ...sourceIds));
  else for (const ability of oldRule.abilityIds) if (input.scores[ability] < coreCareerPathPack.characterWithTwoClasses.oldPrincipalMinimum) {
    forbidden = true;
    issues.push(issue(`old-principal-${ability}`, `旧职业主属性 ${ability} 必须至少为 15。`, ...sourceIds));
  }
  if (!newRule.abilityIds) issues.push(issue('new-principal-unresolved', '新职业主属性映射尚未在本包中封口。', ...sourceIds));
  else for (const ability of newRule.abilityIds) if (input.scores[ability] < coreCareerPathPack.characterWithTwoClasses.newPrincipalMinimum) {
    forbidden = true;
    issues.push(issue(`new-principal-${ability}`, `新职业主属性 ${ability} 必须为 17 或 18。`, ...sourceIds));
  }
  if (input.pairRuling === 'denied') { forbidden = true; issues.push(issue('pair-denied', 'DM未批准该职业次序。', ...sourceIds)); }
  else if (input.pairRuling === null) issues.push(issue('pair-unresolved', '“Nearly any combination”并非无条件完整白名单，须记录DM对该次序的裁定。', ...sourceIds));
  if (input.alignmentCompatibility === 'incompatible') { forbidden = true; issues.push(issue('alignment-incompatible', '两个职业的阵营要求不相容。', ...sourceIds)); }
  else if (input.alignmentCompatibility === 'needs-dm') issues.push(issue('alignment-unresolved', '阵营兼容性仍待DM裁定。', ...sourceIds));
  if (input.newClassEntry === 'ineligible') { forbidden = true; issues.push(issue('new-entry-ineligible', '不满足新职业的独立入门要求。', ...sourceIds)); }
  else if (input.newClassEntry === 'needs-dm') issues.push(issue('new-entry-unresolved', '新职业独立入门资格仍待裁定。', ...sourceIds));
  return {
    status: forbidden ? 'forbidden' : issues.length ? 'needs-dm' : 'allowed',
    oldPrincipalAbilities: oldRule.abilityIds ? [...oldRule.abilityIds] : [],
    newPrincipalAbilities: newRule.abilityIds ? [...newRule.abilityIds] : [],
    effects: { retainOldHitDiceAndHp: true, newClassBeginsAtLevelOne: true, oldClassProgressionStops: true,
      formerFunctionsLockedUntilNewClassExceedsOldLevel: true },
    issues, sourceIds,
  };
}

export interface TwoClassAdventureReview {
  readonly status: 'xp-eligible' | 'xp-forfeited' | 'needs-dm';
  readonly formerFunctionsAvailable: boolean;
  readonly oldClassProgressionResumes: false;
  readonly issues: readonly CareerIssue[];
  readonly sourceIds: readonly CareerPathSourceId[];
}

export function reviewTwoClassAdventure(input: {
  oldLevel: number;
  newLevel: number;
  usedFormerClassFunction: boolean | null;
}): TwoClassAdventureReview {
  requireInteger(input.oldLevel, 'oldLevel', 1);
  requireInteger(input.newLevel, 'newLevel', 1);
  const sourceIds = source('phb:32-33:career-paths');
  const available = input.newLevel > input.oldLevel;
  if (available) return { status: 'xp-eligible', formerFunctionsAvailable: true, oldClassProgressionResumes: false, issues: [], sourceIds };
  if (input.usedFormerClassFunction === null) return { status: 'needs-dm', formerFunctionsAvailable: false, oldClassProgressionResumes: false,
    issues: [issue('former-function-classification', '是否动用了旧职业能力属于冒险裁定事实，不能由数值自动猜测。', ...sourceIds)], sourceIds };
  if (input.usedFormerClassFunction) return { status: 'xp-forfeited', formerFunctionsAvailable: false, oldClassProgressionResumes: false,
    issues: [issue('former-function-used', '新职业等级尚未严格超过旧职业；本次冒险动用旧职业能力，故无经验。', ...sourceIds)], sourceIds };
  return { status: 'xp-eligible', formerFunctionsAvailable: false, oldClassProgressionResumes: false, issues: [], sourceIds };
}

export type BardTransition = 'fighter-to-thief' | 'thief-to-bard';
export interface BardTransitionReview {
  readonly status: CareerDecision;
  readonly transition: BardTransition;
  readonly issues: readonly CareerIssue[];
  readonly sourceIds: readonly CareerPathSourceId[];
}

export function reviewBardTransition(input: {
  transition: BardTransition;
  bardCampaignApproved: boolean;
  raceId: CoreRaceId;
  alignmentId: CoreAlignmentId;
  scores: AbilityScores;
  fighterLevel: number;
  fighterWasExclusive: boolean;
  thiefLevel: number | null;
  druidicTutorConfirmed: boolean | null;
  ordinaryTwoClassMinimaRuling: 'special-bard-path-controls' | 'apply-ordinary-two-class' | null;
}): BardTransitionReview {
  requireInteger(input.fighterLevel, 'fighterLevel', 1);
  if (input.thiefLevel !== null) requireInteger(input.thiefLevel, 'thiefLevel', 1);
  validateAbilityScores(input.scores);
  const sourceIds = source('phb:117-119:bard-path');
  const issues: CareerIssue[] = [];
  let forbidden = false;
  if (!input.bardCampaignApproved) { forbidden = true; issues.push(issue('bard-not-approved', 'Bard 是附录中的 DM 可选职业，本战役尚未批准。', ...sourceIds)); }
  if (!(coreCareerPathPack.bard.raceIds as readonly string[]).includes(input.raceId)) {
    forbidden = true; issues.push(issue('bard-race', 'Bard 只允许人类或半精灵。', ...sourceIds));
  }
  if (!(coreCareerPathPack.bard.alignmentIds as readonly string[]).includes(input.alignmentId)) {
    forbidden = true; issues.push(issue('bard-alignment', 'Bard 必须在至少一条轴上保持中立。', ...sourceIds));
  }
  for (const [ability, minimum] of Object.entries(coreCareerPathPack.bard.abilityMinimums) as [CoreAbilityId, number][]) {
    if (input.scores[ability] < minimum) { forbidden = true; issues.push(issue(`bard-${ability}`, `Bard 的 ${ability} 至少为 ${minimum}。`, ...sourceIds)); }
  }
  if (!input.fighterWasExclusive) { forbidden = true; issues.push(issue('fighter-not-exclusive', '第一阶段必须始终且仅为战士。', ...sourceIds)); }
  if (input.fighterLevel < 5 || input.fighterLevel > 7) {
    forbidden = true; issues.push(issue('fighter-stage-window', '必须在战士 5-7 级之间转为盗贼；达到 8 级前必须转职。', ...sourceIds));
  }
  if (input.transition === 'fighter-to-thief') {
    if (input.thiefLevel !== null) throw new Error('fighter-to-thief transition must not already have a thief level.');
  } else {
    if (input.thiefLevel === null || input.thiefLevel < 5 || input.thiefLevel > 8) {
      forbidden = true; issues.push(issue('thief-stage-window', '必须在盗贼 5-8 级之间离开盗贼阶段并进入 Bard。', ...sourceIds));
    }
    if (input.druidicTutorConfirmed === false) { forbidden = true; issues.push(issue('no-druidic-tutor', '最终阶段必须处于德鲁伊教导之下。', ...sourceIds)); }
    else if (input.druidicTutorConfirmed === null) issues.push(issue('druidic-tutor-unconfirmed', '德鲁伊导师属于战役事实，必须由DM确认。', ...sourceIds));
  }
  if (input.ordinaryTwoClassMinimaRuling === null) {
    issues.push(issue('bard-two-class-minima-unresolved', 'Appendix II 与普通 two-classes 的 15/17、仅人类规则关系未由原文封口，须记录采用裁定。',
      'phb:32-33:career-paths', 'phb:117-119:bard-path'));
  } else if (input.ordinaryTwoClassMinimaRuling === 'apply-ordinary-two-class') {
    issues.push(issue('bard-two-class-minima-applied', '战役选择把普通 two-classes 门槛叠加到 Bard；须由外层按所采用主属性映射复核。',
      'phb:32-33:career-paths', 'phb:117-119:bard-path'));
  }
  return { status: forbidden ? 'forbidden' : issues.length ? 'needs-dm' : 'allowed', transition: input.transition, issues, sourceIds };
}

export interface BardRetainedHpPlan {
  readonly status: 'calculated' | 'needs-dm';
  readonly retainedHp: number | null;
  readonly totalHpAfterBardAward: number | null;
  readonly issues: readonly CareerIssue[];
  readonly sourceIds: readonly CareerPathSourceId[];
}

/** Uses recorded history; it never reconstructs old rolled HP from levels. */
export function calculateBardRetainedHp(input: {
  fighterLevel: number;
  thiefLevel: number;
  fighterAccumulatedHp: number;
  thiefHpEarnedAboveFighterLevel: number | null;
  bardAdditionalHp: number;
}): BardRetainedHpPlan {
  requireInteger(input.fighterLevel, 'fighterLevel', 1);
  requireInteger(input.thiefLevel, 'thiefLevel', 1);
  requireInteger(input.fighterAccumulatedHp, 'fighterAccumulatedHp', 1);
  requireInteger(input.bardAdditionalHp, 'bardAdditionalHp');
  if (input.thiefHpEarnedAboveFighterLevel !== null) requireInteger(input.thiefHpEarnedAboveFighterLevel, 'thiefHpEarnedAboveFighterLevel');
  const sourceIds = source('phb:117-119:bard-path');
  const thiefCanContribute = input.thiefLevel > input.fighterLevel;
  if (!thiefCanContribute && (input.thiefHpEarnedAboveFighterLevel ?? 0) !== 0) throw new Error('Thief HP cannot be retained when thief level did not exceed fighter level.');
  if (thiefCanContribute && input.thiefHpEarnedAboveFighterLevel === null) {
    return { status: 'needs-dm', retainedHp: null, totalHpAfterBardAward: null,
      issues: [issue('missing-thief-hp-history', '盗贼等级超过战士等级，但档案缺少该超出阶段实际获得的 HP；不得从等级倒推骰值。', ...sourceIds)], sourceIds };
  }
  const retainedHp = input.fighterAccumulatedHp + (input.thiefHpEarnedAboveFighterLevel ?? 0);
  return { status: 'calculated', retainedHp, totalHpAfterBardAward: retainedHp + input.bardAdditionalHp, issues: [], sourceIds };
}

export function collectCareerSourceIds(issues: readonly CareerIssue[]): readonly CareerPathSourceId[] {
  return unique(issues.flatMap(item => item.sourceIds));
}
