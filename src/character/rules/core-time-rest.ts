/**
 * AD&D 1e core campaign-time and recovery rule data.
 *
 * This pack deliberately keeps PHB 105 and DMG 82 natural recovery as
 * separate, selectable routes.  It does not claim that combining them is RAW.
 */

const dmgSourceFile =
  "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";
const phbSourceFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";

export const coreTimeRestSources = Object.freeze({
  'dmg:37:time-in-campaign': Object.freeze({
    book: 'DMG',
    printedPages: [37] as const,
    pdfPages: [38] as const,
    section: 'Time in the Campaign',
    sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-page-text-plus-shared-visual-evidence',
  }),
  'dmg:82:recovery-hit-points': Object.freeze({
    book: 'DMG',
    printedPages: [82] as const,
    pdfPages: [83] as const,
    section: 'Recovery of Hit Points; Zero Hit Points',
    sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-page-text-plus-shared-visual-evidence-E08-RC07',
  }),
  'phb:34:character-languages': Object.freeze({
    book: 'PHB',
    printedPages: [34] as const,
    pdfPages: [35] as const,
    section: 'Character Languages',
    sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text-plus-round-review',
  }),
  'phb:105:healing': Object.freeze({
    book: 'PHB',
    printedPages: [105] as const,
    pdfPages: [106] as const,
    section: 'Healing',
    sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text-plus-round-review',
  }),
} as const);

export type CoreTimeRestSourceId = keyof typeof coreTimeRestSources;

export const campaignTimeRule = Object.freeze({
  id: 'adnd1e:dmg:campaign-time',
  actorScope: 'each-player-character-and-henchman',
  requiredFacts: ['game-day', 'activity', 'whereabouts'] as const,
  calendarPolicy: 'campaign-defined',
  implementationConvention: 'positive-integer ordinal days; intervals are [startDay,endDayExclusive)',
  realDayRecommendationIsNotMandatoryCalendar: true,
  sourceIds: ['dmg:37:time-in-campaign'] as const,
});
export type CoreActivityKind =
  | 'rest'
  | 'adventuring'
  | 'combat'
  | 'spell-use'
  | 'travel'
  | 'training'
  | 'language-study'
  | 'study'
  | 'spell-research'
  | 'magic-item-manufacture'
  | 'other';

export type DmgRecoveryRestEffect = 'qualifies' | 'breaks' | 'needs-dm';

export interface CoreActivityRule {
  readonly kind: CoreActivityKind;
  readonly dmgRecoveryRestEffect: DmgRecoveryRestEffect;
  readonly sourceIds: readonly CoreTimeRestSourceId[];
  readonly note: string;
}

/**
 * Only combat and spell use are verbatim examples on DMG 82. Adventuring is
 * necessarily non-rest in the DMG 37 example. Other work is not silently
 * equated with either rest or interruption; the DM decides its actual facts.
 */
export const coreActivityRules: Readonly<Record<CoreActivityKind, CoreActivityRule>> = Object.freeze({
  rest: Object.freeze({
    kind: 'rest', dmgRecoveryRestEffect: 'qualifies',
    sourceIds: ['dmg:82:recovery-hit-points'] as const,
    note: 'Declared recuperative rest; still subject to overlapping events and DM confirmation of actual conditions.',
  }),
  adventuring: Object.freeze({
    kind: 'adventuring', dmgRecoveryRestEffect: 'breaks',
    sourceIds: ['dmg:37:time-in-campaign', 'dmg:82:recovery-hit-points'] as const,
    note: 'Adventuring consumes campaign time and is not recuperative rest.',
  }),
  combat: Object.freeze({
    kind: 'combat', dmgRecoveryRestEffect: 'breaks',
    sourceIds: ['dmg:82:recovery-hit-points'] as const,
    note: 'DMG 82 expressly says combat does not constitute rest.',
  }),
  'spell-use': Object.freeze({
    kind: 'spell-use', dmgRecoveryRestEffect: 'breaks',
    sourceIds: ['dmg:82:recovery-hit-points'] as const,
    note: 'DMG 82 expressly says spell using does not constitute rest.',
  }),
  travel: Object.freeze({
    kind: 'travel', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:37:time-in-campaign', 'dmg:82:recovery-hit-points'] as const,
    note: 'Travel duration and whereabouts are tracked, but this pack does not invent a universal recovery result for every mode of travel.',
  }),
  training: Object.freeze({
    kind: 'training', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:37:time-in-campaign', 'dmg:82:recovery-hit-points'] as const,
    note: 'Training occupies game time; whether a particular day also meets recuperative-rest conditions is not auto-inferred here.',
  }),
  'language-study': Object.freeze({
    kind: 'language-study', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:37:time-in-campaign', 'phb:34:character-languages', 'dmg:82:recovery-hit-points'] as const,
    note: 'Requires an instructor, proximity, elapsed campaign months, and only one new language may be studied at a time.',
  }),
  study: Object.freeze({
    kind: 'study', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:82:recovery-hit-points'] as const,
    note: 'The zero-hit-point restriction names study, but this page does not establish that every ordinary study day always breaks every natural-recovery route.',
  }),
  'spell-research': Object.freeze({
    kind: 'spell-research', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:37:time-in-campaign', 'dmg:82:recovery-hit-points'] as const,
    note: 'Research is tracked as occupied campaign time; project-specific interruption consequences belong to its own sourced rule module.',
  }),
  'magic-item-manufacture': Object.freeze({
    kind: 'magic-item-manufacture', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:37:time-in-campaign', 'dmg:82:recovery-hit-points'] as const,
    note: 'DMG 37 expressly forbids adventuring during manufacture; this pack does not silently add an HP-recovery ruling.',
  }),
  other: Object.freeze({
    kind: 'other', dmgRecoveryRestEffect: 'needs-dm',
    sourceIds: ['dmg:82:recovery-hit-points'] as const,
    note: 'The DM decides whether the concrete activity is the “similar activity” that prevents rest.',
  }),
});

export const knownActivityOverlapConflicts = Object.freeze([
  Object.freeze({
    kinds: ['adventuring', 'magic-item-manufacture'] as const,
    reason: 'DMG 37 states that no adventuring can be done during magic-item manufacture.',
    sourceIds: ['dmg:37:time-in-campaign'] as const,
  }),
  Object.freeze({
    kinds: ['language-study', 'language-study'] as const,
    reason: 'PHB 34 permits only one new language to be studied at a time.',
    sourceIds: ['phb:34:character-languages'] as const,
  }),
]);

export const languageStudyRule = Object.freeze({
  baseMonths: 12,
  oneMonthReductionPerIntPointAbove: 12,
  standardMinimumMonthsAtInt18: 6,
  instructorRequired: true,
  closeProximityRequired: true,
  simultaneousNewLanguages: 1,
  calendarConversion: 'DM supplies campaign month boundaries; do not assume Gregorian month lengths.',
  sourceIds: ['phb:34:character-languages'] as const,
});

export type NaturalRecoveryRouteId =
  | 'phb-105-natural'
  | 'dmg-82-natural'
  | 'campaign-adopted-ruling';

export const naturalRecoveryRoutes = Object.freeze({
  'phb-105-natural': Object.freeze({
    id: 'phb-105-natural',
    status: 'source-text-route',
    summary: '1 HP per rest day; after 30 game days, 5 HP per day.',
    sourceIds: ['phb:105:healing'] as const,
  }),
  'dmg-82-natural': Object.freeze({
    id: 'dmg-82-natural',
    status: 'source-text-route',
    summary: 'Daily recovery with weekly CON adjustment; after four weeks of continuous rest, full strength.',
    sourceIds: ['dmg:82:recovery-hit-points'] as const,
  }),
  'campaign-adopted-ruling': Object.freeze({
    id: 'campaign-adopted-ruling',
    status: 'explicit-ruling-not-raw-merge',
    summary: 'A DM-recorded campaign interpretation or house rule. It must not masquerade as either printed route.',
    sourceIds: ['phb:105:healing', 'dmg:82:recovery-hit-points'] as const,
  }),
} as const);

export const naturalRecoveryConflict = Object.freeze({
  id: 'core:natural-recovery:phb105-vs-dmg82',
  status: 'source-conflict-needs-adoption',
  forbiddenDefault: 'silent-merge',
  routeIds: ['phb-105-natural', 'dmg-82-natural'] as const,
  sourceIds: ['phb:105:healing', 'dmg:82:recovery-hit-points'] as const,
  note: 'The PHB 30-day acceleration and DMG weekly/CON/four-week procedure remain distinct until a campaign explicitly adopts a route or ruling.',
});

export const zeroHitPointConvalescenceRule = Object.freeze({
  comaTurnsRoll: '1d6',
  minimumRestDaysAfterComa: 7,
  prohibitedActions: [
    'attack', 'defend', 'cast-spell', 'use-magic-device', 'carry-burden',
    'run', 'study', 'research', 'activity-beyond-slow-movement-eating-sleeping',
  ] as const,
  cureSpellOrPotionEndsRestriction: false,
  healSpellEndsRestriction: true,
  hpTotalDoesNotEndRestriction: true,
  sourceIds: ['dmg:82:recovery-hit-points'] as const,
});

export const coreTimeRestRulePack = Object.freeze({
  id: 'adnd1e:core:time-rest',
  version: '1.0.0',
  verifiedAt: '2026-10-14',
  scope: 'core campaign time, activity overlap skeleton, natural recovery routes, and zero-HP convalescence restrictions',
  sources: coreTimeRestSources,
  campaignTime: campaignTimeRule,
  activities: coreActivityRules,
  overlapConflicts: knownActivityOverlapConflicts,
  languageStudy: languageStudyRule,
  recoveryRoutes: naturalRecoveryRoutes,
  recoveryConflict: naturalRecoveryConflict,
  zeroHitPointConvalescence: zeroHitPointConvalescenceRule,
  unresolved: Object.freeze({
    phbDmgRecoveryRelationship: 'requires explicit campaign adoption; no default precedence or merge',
    partialWeekConBonusNarration: 'engine posts the DMG high-CON bonus at completed post-first-week boundaries; a different allocation requires an explicit ruling',
    genericWorkCountsAsRest: 'needs DM facts; not inferred from an activity label alone',
    calendarMonthLengths: 'campaign-defined; language-study months are not silently converted to 30-day months',
    severeInterruptionConsequences: 'activity-specific and DM adjudicated; this pack never auto-refunds or erases elapsed time',
  }),
});
