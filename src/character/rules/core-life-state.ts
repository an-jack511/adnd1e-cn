/**
 * AD&D 1e core death, revival and permanent-life-change rule data.
 *
 * This pack preserves the printed differences between zero-HP revival,
 * raise dead, resurrection and the two reincarnation spells. It also keeps
 * the PHB 12 resurrection-survival procedure separate from DMG 110's
 * conflicting "SYSTEM SHOCK ROLL" terminology.
 */

const dmgSourceFile =
  "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";
const phbSourceFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";

export const coreLifeStateSources = Object.freeze({
  'dmg:82:zero-hit-points': Object.freeze({
    book: 'DMG', printedPages: [82] as const, pdfPages: [83] as const,
    section: 'Zero Hit Points', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-full-page-image-and-text-2026-10-14',
  }),
  'dmg:110:death-and-system-shock-wording': Object.freeze({
    book: 'DMG', printedPages: [110] as const, pdfPages: [111] as const,
    section: 'Conducting the Game - death and the roll to be raised', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-full-page-image-and-text-2026-10-14',
  }),
  'phb:12:constitution-revivification': Object.freeze({
    book: 'PHB', printedPages: [12] as const, pdfPages: [13] as const,
    section: 'Constitution Table; System Shock Survival; Resurrection Survival; revivification limit', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-full-page-image-and-text-2026-10-14',
  }),
  'phb:50:raise-dead': Object.freeze({
    book: 'PHB', printedPages: [50] as const, pdfPages: [51] as const,
    section: 'Cleric spell - Raise Dead', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-full-page-image-and-text-2026-10-14',
  }),
  'phb:53:resurrection': Object.freeze({
    book: 'PHB', printedPages: [53] as const, pdfPages: [54] as const,
    section: 'Cleric spell - Resurrection', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-full-page-image-and-text-2026-10-14',
  }),
  'phb:64:druid-reincarnate': Object.freeze({
    book: 'PHB', printedPages: [64] as const, pdfPages: [65] as const,
    section: 'Druid spell - Reincarnate', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-full-page-image-and-text-2026-10-14',
  }),
  'phb:85-86:magic-user-reincarnation': Object.freeze({
    book: 'PHB', printedPages: [85, 86] as const, pdfPages: [86, 87] as const,
    section: 'Magic-user spell - Reincarnation', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-p85-and-full-page-text-p86-2026-10-14',
  }),
} as const);

export type CoreLifeStateSourceId = keyof typeof coreLifeStateSources;

export const constitutionSurvivalTable = Object.freeze([
  { score: 3, systemShock: 35, resurrection: 40 },
  { score: 4, systemShock: 40, resurrection: 45 },
  { score: 5, systemShock: 45, resurrection: 50 },
  { score: 6, systemShock: 50, resurrection: 55 },
  { score: 7, systemShock: 55, resurrection: 60 },
  { score: 8, systemShock: 60, resurrection: 65 },
  { score: 9, systemShock: 65, resurrection: 70 },
  { score: 10, systemShock: 70, resurrection: 75 },
  { score: 11, systemShock: 75, resurrection: 80 },
  { score: 12, systemShock: 80, resurrection: 85 },
  { score: 13, systemShock: 85, resurrection: 90 },
  { score: 14, systemShock: 88, resurrection: 92 },
  { score: 15, systemShock: 91, resurrection: 94 },
  { score: 16, systemShock: 95, resurrection: 96 },
  { score: 17, systemShock: 97, resurrection: 98 },
  { score: 18, systemShock: 99, resurrection: 100 },
] as const);

export const zeroHitPointRule = Object.freeze({
  defaultUnconsciousAt: 0,
  optionalSameBlowFloor: -3,
  losesPerSucceedingRound: 1,
  deathAt: -10,
  friendlyAidStopsLossImmediately: true,
  aidDoesNotByItselfSetPositiveHp: true,
  comaTurns: '1d6',
  minimumConvalescenceDays: 7,
  ordinaryHealingDoesNotEndRestriction: true,
  healSpellEndsRestriction: true,
  severeNegativeThreshold: -6,
  severeInjuryIsOptionalDmChoice: true,
  sourceIds: ['dmg:82:zero-hit-points'] as const,
});

export type CoreSubjectRaceId =
  | 'dwarf' | 'elf' | 'gnome' | 'half-elf' | 'halfling' | 'half-orc' | 'human'
  | 'other-player-character';

export type CoreRevivalMethodId =
  | 'cleric-raise-dead'
  | 'cleric-resurrection'
  | 'druid-reincarnate'
  | 'magic-user-reincarnation'
  | 'rod-of-resurrection'
  | 'wish-or-other-magic';

export type RevivalSurvivalCheck =
  | 'constitution-route-required'
  | 'none'
  | 'needs-dm';

export interface CoreRevivalMethodRule {
  readonly id: CoreRevivalMethodId;
  readonly subjectEligibility: 'raise-dead-five-races' | 'any-player-character' | 'needs-dm';
  readonly maximumDeathInterval:
    | { readonly unit: 'days'; readonly perCasterLevel: number }
    | { readonly unit: 'years'; readonly perCasterLevel: number }
    | { readonly unit: 'fixed-days'; readonly value: number }
    | { readonly unit: 'needs-dm' };
  readonly bodyRequirement: string;
  readonly survivalCheck: RevivalSurvivalCheck;
  readonly successfulConstitutionLoss: 0 | 1 | 'needs-dm';
  readonly countsAgainstInitialConstitutionLimit: boolean | 'needs-dm';
  readonly targetAftermath: string;
  readonly distinctOutcomeTable: 'none' | 'druid-table' | 'magic-user-table' | 'needs-dm';
  readonly sourceIds: readonly CoreLifeStateSourceId[];
}

const fiveRaiseDeadRaces = Object.freeze(['dwarf', 'gnome', 'half-elf', 'halfling', 'human'] as const);
export const raiseDeadEligibleRaces: readonly CoreSubjectRaceId[] = fiveRaiseDeadRaces;

export const coreRevivalMethods: Readonly<Record<CoreRevivalMethodId, CoreRevivalMethodRule>> = Object.freeze({
  'cleric-raise-dead': Object.freeze({
    id: 'cleric-raise-dead', subjectEligibility: 'raise-dead-five-races',
    maximumDeathInterval: Object.freeze({ unit: 'days', perCasterLevel: 1 }),
    bodyRequirement: 'A corpse must be present; missing parts remain missing after return.',
    survivalCheck: 'constitution-route-required', successfulConstitutionLoss: 1,
    countsAgainstInitialConstitutionLimit: true,
    targetAftermath: 'Weak and helpless; one full day of bed rest for each day dead.',
    distinctOutcomeTable: 'none',
    sourceIds: ['phb:12:constitution-revivification', 'phb:50:raise-dead', 'dmg:110:death-and-system-shock-wording'] as const,
  }),
  'cleric-resurrection': Object.freeze({
    id: 'cleric-resurrection', subjectEligibility: 'raise-dead-five-races',
    maximumDeathInterval: Object.freeze({ unit: 'years', perCasterLevel: 10 }),
    bodyRequirement: 'Bones are sufficient within the stated time limit.',
    survivalCheck: 'constitution-route-required', successfulConstitutionLoss: 1,
    countsAgainstInitialConstitutionLimit: true,
    targetAftermath: 'Target returns with life and complete strength; caster rest is a separate actor obligation.',
    distinctOutcomeTable: 'none',
    sourceIds: ['phb:12:constitution-revivification', 'phb:50:raise-dead', 'phb:53:resurrection', 'dmg:110:death-and-system-shock-wording'] as const,
  }),
  'druid-reincarnate': Object.freeze({
    id: 'druid-reincarnate', subjectEligibility: 'any-player-character',
    maximumDeathInterval: Object.freeze({ unit: 'fixed-days', value: 7 }),
    bodyRequirement: 'The corpse is touched; the new incarnation appears in the area in 1d6 turns.',
    survivalCheck: 'none', successfulConstitutionLoss: 0,
    countsAgainstInitialConstitutionLimit: false,
    targetAftermath: 'Form changes; class may change; abilities and speech often change. Those results require the druid table and adjudication.',
    distinctOutcomeTable: 'druid-table', sourceIds: ['phb:64:druid-reincarnate'] as const,
  }),
  'magic-user-reincarnation': Object.freeze({
    id: 'magic-user-reincarnation', subjectEligibility: 'any-player-character',
    maximumDeathInterval: Object.freeze({ unit: 'days', perCasterLevel: 1 }),
    bodyRequirement: 'The corpse is touched; the new incarnation appears in the area in 1d6 turns.',
    survivalCheck: 'none', successfulConstitutionLoss: 0,
    countsAgainstInitialConstitutionLimit: false,
    targetAftermath: 'Use the distinct magic-user incarnation table and its alignment note; never substitute the druid table.',
    distinctOutcomeTable: 'magic-user-table', sourceIds: ['phb:85-86:magic-user-reincarnation'] as const,
  }),
  'rod-of-resurrection': Object.freeze({
    id: 'rod-of-resurrection', subjectEligibility: 'needs-dm',
    maximumDeathInterval: Object.freeze({ unit: 'needs-dm' }),
    bodyRequirement: 'The item procedure and target eligibility are outside this bounded pack.',
    survivalCheck: 'constitution-route-required', successfulConstitutionLoss: 1,
    countsAgainstInitialConstitutionLimit: true,
    targetAftermath: 'PHB 12 counts the rod as a resurrection spell of the same sort; other effects need its own verified item text.',
    distinctOutcomeTable: 'needs-dm', sourceIds: ['phb:12:constitution-revivification'] as const,
  }),
  'wish-or-other-magic': Object.freeze({
    id: 'wish-or-other-magic', subjectEligibility: 'needs-dm',
    maximumDeathInterval: Object.freeze({ unit: 'needs-dm' }),
    bodyRequirement: 'Method-specific and not inferred.', survivalCheck: 'needs-dm',
    successfulConstitutionLoss: 'needs-dm', countsAgainstInitialConstitutionLimit: 'needs-dm',
    targetAftermath: 'PHB 12 mentions wish only as another magical means after ordinary final death; all concrete consequences require a sourced ruling.',
    distinctOutcomeTable: 'needs-dm', sourceIds: ['phb:12:constitution-revivification'] as const,
  }),
});

export const revivalConstitutionRule = Object.freeze({
  immutableLimitFact: 'initial-constitution-at-character-creation',
  limitCounts: 'successful raise-dead/resurrection revivifications, including a rod treated as the same sort',
  eachSuccessfulOrdinaryRevivificationConstitutionLoss: 1,
  magicalConstitutionRestorationDoesNotIncreaseLimit: true,
  failedSurvivalRoll: 'forever-dead-for-ordinary-raise-or-resurrection',
  rollAuthority: 'player-roll-never-tamper',
  sourceIds: ['phb:12:constitution-revivification', 'dmg:110:death-and-system-shock-wording'] as const,
});

export const revivalCheckSourceConflict = Object.freeze({
  id: 'core:revival-check:phb12-vs-dmg110-terminology',
  status: 'source-conflict-needs-campaign-adoption',
  phbRoute: 'resurrection-survival-column',
  dmgWordingRoute: 'system-shock-column',
  forbiddenDefault: 'silently-treat-the-columns-as-interchangeable',
  note: 'PHB 12 operationally labels and explains Resurrection Survival; DMG 110 emphatically calls the roll SYSTEM SHOCK. Store the adopted interpretation.',
  sourceIds: ['phb:12:constitution-revivification', 'dmg:110:death-and-system-shock-wording'] as const,
});

export const coreLifeStateRulePack = Object.freeze({
  id: 'adnd1e:core:life-state', version: '1.0.0', verifiedAt: '2026-10-14',
  scope: 'core zero-HP decline, death, ordinary revival eligibility/checks, CON loss and permanent-change audit skeleton',
  sources: coreLifeStateSources,
  zeroHitPoints: zeroHitPointRule,
  constitutionSurvival: constitutionSurvivalTable,
  revivalMethods: coreRevivalMethods,
  revivalConstitution: revivalConstitutionRule,
  revivalCheckConflict: revivalCheckSourceConflict,
  unresolved: Object.freeze({
    methodSpellAccess: 'Caster spell access, components and casting transaction belong to spell and campaign modules.',
    rodProcedure: 'Only the PHB 12 revivification-limit relationship is verified here; item details remain needs-dm.',
    reincarnationResults: 'The two printed tables remain distinct; this bounded skeleton does not rebuild race/class/abilities automatically.',
    severeInjury: 'At -6 or worse DMG 82 offers scarring/member loss as DM choice; no random injury table is invented.',
    hpAfterMagic: 'No unsourced HP total is inferred from “weak and helpless” or “complete strength”.',
    nonPlayerCreatures: 'The zero-HP text says creature, but this character module does not infer monster revival eligibility.',
  }),
});
