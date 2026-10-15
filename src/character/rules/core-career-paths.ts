/**
 * AD&D 1e core career-path facts. This pack deliberately keeps three unlike
 * mechanisms separate: simultaneous multi-classing, a human character with
 * two successive classes, and the optional Appendix II bard path.
 *
 * `verified` means the stated assertion was checked against the named page;
 * it does not turn an unstated edge case into a rule.
 */
import { coreEligibilityPack, type CoreAbilityId, type CoreRaceId } from './core-eligibility';
import type { CoreClassId } from './core-progression';

export type CareerPathStatus = 'verified' | 'needs-dm';

export interface CareerPathSource {
  readonly id: string;
  readonly book: 'PHB';
  readonly printedPages: readonly number[];
  readonly pdfPages: readonly number[];
  readonly section: string;
  readonly scope: string;
  readonly verification: 'page-image-and-embedded-text';
}

const phb = (id: string, printedPages: readonly number[], section: string, scope: string): CareerPathSource => ({
  id,
  book: 'PHB',
  printedPages,
  pdfPages: printedPages.map(page => page + 1),
  section,
  scope,
  verification: 'page-image-and-embedded-text',
});

export const coreCareerPathSources = Object.freeze({
  'phb:12:constitution': phb(
    'phb:12:constitution', [12], 'Constitution Table',
    'Per-hit-die constitution adjustments, including the fighter versus other-class ceiling already certified by the core progression pack.',
  ),
  'phb:16-17:racial-multiclass-xp': phb(
    'phb:16-17:racial-multiclass-xp', [16, 17], 'Character Races',
    'Explicit racial combinations and equal XP division, including advancement-capped classes.',
  ),
  'phb:19:multiclass-hp': phb(
    'phb:19:multiclass-hp', [19], 'Character Classes Table I notes',
    'Roll each professed class die due at the level increase, total, apply CON, divide by two or three, round halves upward.',
  ),
  'phb:32-33:career-paths': phb(
    'phb:32-33:career-paths', [32, 33], 'The Multi-Classed Character / The Character With Two Classes',
    'Simultaneous nonhuman combinations; human class switch; principal scores; retained HP; former-function XP consequence; exceed-old-level release.',
  ),
  'phb:34:campaign-entry': phb(
    'phb:34:campaign-entry', [34], 'Character Hit Points / Establishing the Character',
    'HP meaning and DM custody variants; character enters a persistent campaign rather than existing as a detached build.',
  ),
  'phb:117-119:bard-path': phb(
    'phb:117-119:bard-path', [117, 118, 119], 'Appendix II: Bards',
    'DM option, abilities/races, fighter-thief-bard stages, bard-only XP, retained dice/HP, former-class functions and cap.',
  ),
} as const satisfies Readonly<Record<string, CareerPathSource>>);

export type CareerPathSourceId = keyof typeof coreCareerPathSources;

export interface PrincipalAbilityRule {
  readonly classId: CoreClassId;
  readonly abilityIds: readonly CoreAbilityId[] | null;
  readonly status: CareerPathStatus;
  readonly sourceIds: readonly CareerPathSourceId[];
}

const principalAbilities: readonly PrincipalAbilityRule[] = Object.freeze([
  { classId: 'cleric', abilityIds: ['WIS'], status: 'verified', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'fighter', abilityIds: ['STR'], status: 'verified', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'magic-user', abilityIds: ['INT'], status: 'verified', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'thief', abilityIds: ['DEX'], status: 'verified', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'druid', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'paladin', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'ranger', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'illusionist', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'assassin', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'monk', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:32-33:career-paths'] },
  { classId: 'bard', abilityIds: null, status: 'needs-dm', sourceIds: ['phb:117-119:bard-path'] },
]);

export const coreCareerPathPack = Object.freeze({
  id: 'adnd1e-core-career-paths',
  version: '1.0.0',
  verifiedAt: '2026-10-14',
  sourceFile: "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf",
  sources: coreCareerPathSources,
  kinds: Object.freeze(['multi-class', 'character-with-two-classes', 'bard-staged-path'] as const),
  multiClass: Object.freeze({
    id: 'phb-simultaneous-multiclass',
    kind: 'multi-class' as const,
    raceRule: 'non-or-semi-human-only' as const,
    humanAllowed: false,
    combinations: coreEligibilityPack.multiClassCombinations,
    xp: Object.freeze({
      divideEarnedXpEqually: true,
      includeClassesAtRacialCap: true,
      integerRemainder: 'needs-dm' as const,
      sourceIds: ['phb:16-17:racial-multiclass-xp'] as const,
    }),
    hp: Object.freeze({
      rollDueDiceForEachProfessedClass: true,
      applyConstitutionBeforeDivision: true,
      divideByAllProfessedClasses: true,
      fractionsBelowHalfRoundDown: true,
      fractionsHalfOrAboveRoundUp: true,
      fixedPostDieAwards: 'needs-dm' as const,
      sourceIds: ['phb:12:constitution', 'phb:19:multiclass-hp'] as const,
    }),
    sourceIds: ['phb:16-17:racial-multiclass-xp', 'phb:19:multiclass-hp', 'phb:32-33:career-paths'] as const,
  }),
  characterWithTwoClasses: Object.freeze({
    id: 'phb-human-successive-two-classes',
    kind: 'character-with-two-classes' as const,
    raceIds: ['human'] as readonly CoreRaceId[],
    simultaneous: false,
    originalClassProgressionAfterSwitch: false,
    oldPrincipalMinimum: 15,
    newPrincipalMinimum: 17,
    pairRule: 'nearly-any-but-not-an-unconditional-whitelist' as const,
    pairPermission: 'needs-dm' as const,
    principalAbilities,
    switchEffects: Object.freeze({
      retainOriginalHitDiceAndHitPoints: true,
      newClassFunctionsBeginAtLevel: 1,
      useFormerFunctionsBeforeExceedingOldLevel: 'forfeit-adventure-xp' as const,
      unlockWhenNewClassLevelStrictlyExceedsOldLevel: true,
      oldClassAdvancementResumes: false,
      armorShieldWeaponRestrictionsStillApplyByFunction: true,
    }),
    sourceIds: ['phb:32-33:career-paths'] as const,
  }),
  bard: Object.freeze({
    id: 'phb-appendix-ii-bard',
    kind: 'bard-staged-path' as const,
    campaignPermission: 'needs-dm' as const,
    raceIds: ['human', 'half-elf'] as readonly CoreRaceId[],
    abilityMinimums: Object.freeze({ STR: 15, INT: 12, WIS: 15, DEX: 15, CON: 10, CHA: 15 }),
    alignmentIds: Object.freeze(['NG', 'LN', 'TN', 'CN', 'NE'] as const),
    stages: Object.freeze([
      Object.freeze({ id: 'fighter', classId: 'fighter' as const, minimumExitLevel: 5, maximumExitLevel: 7, exclusive: true }),
      Object.freeze({ id: 'thief', classId: 'thief' as const, minimumExitLevel: 5, maximumExitLevel: 8, exclusive: true }),
      Object.freeze({ id: 'bard', classId: 'bard' as const, beginsUnderDruidicTutelage: true, maximumLevel: 23 }),
    ]),
    ordinaryTwoClassMinimaApplication: 'needs-dm' as const,
    xp: Object.freeze({ bardLevelsUseBardOnlyXp: true, priorXpExcluded: true }),
    hp: Object.freeze({
      retainAllFighterHitDiceAndHp: true,
      retainThiefHitDiceAndHpOnlyForThiefLevelsAboveFighterLevel: true,
      bardHitDiceAndAdditionalHpAreAdditive: true,
      losePriorHitDiceOnBecomingBard: false,
    }),
    functions: Object.freeze({
      combatAtFormerFighterLevel: true,
      thiefFunctionsAtFormerThiefLevel: true,
      savesUseMostFavorableTableWithBardLevelAsDruidLevel: true,
    }),
    sourceIds: ['phb:117-119:bard-path'] as const,
  }),
  unresolved: Object.freeze([
    Object.freeze({ id: 'multiclass-xp-integer-remainder', status: 'needs-dm' as const, sourceIds: ['phb:16-17:racial-multiclass-xp'] as const,
      issue: 'The checked text says equally/evenly but does not assign indivisible integer XP remainders.' }),
    Object.freeze({ id: 'multiclass-fixed-hp-division', status: 'needs-dm' as const, sourceIds: ['phb:19:multiclass-hp'] as const,
      issue: 'The checked four-step formula speaks in hit dice; it does not expressly close later fixed-HP award handling.' }),
    Object.freeze({ id: 'two-class-pair-and-subclass-principals', status: 'needs-dm' as const, sourceIds: ['phb:32-33:career-paths'] as const,
      issue: '“Nearly any” is not a complete pair whitelist, and this bounded pack certifies only the four explicit base-class principal attributes.' }),
    Object.freeze({ id: 'bard-versus-ordinary-two-class-minima', status: 'needs-dm' as const, sourceIds: ['phb:32-33:career-paths', 'phb:117-119:bard-path'] as const,
      issue: 'Appendix II gives a special half-elf-capable path and its own minima while also requiring the above classes; it does not explicitly resolve ordinary human-only 15/17 application.' }),
  ]),
});

export function getCareerPrincipalRule(classId: CoreClassId): PrincipalAbilityRule {
  const rule = principalAbilities.find(item => item.classId === classId);
  if (!rule) throw new Error(`Unknown core class: ${classId}`);
  return rule;
}
