/**
 * Verified AD&D 1e core daily spell-capacity tables.
 *
 * A numeric zero below is a normalized printed dash: the class is not yet
 * entitled to prepare a spell of that level. It is not an unknown value and
 * it does not establish that any particular spell is known, found or granted.
 */

const phbSourceFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";
const dmgSourceFile =
  "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";

export const coreSpellCapacitySources = Object.freeze({
  'phb:10:intelligence-spell-levels': Object.freeze({
    book: 'PHB', printedPages: [10] as const, pdfPages: [11] as const,
    section: 'Intelligence Tables I-II', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text-plus-shared-visual-evidence-E02',
  }),
  'phb:11:wisdom-cleric-adjustments': Object.freeze({
    book: 'PHB', printedPages: [11] as const, pdfPages: [12] as const,
    section: 'Wisdom Tables I-II; Adjustments for Clerics', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'phb:20:cleric-spell-capacity': Object.freeze({
    book: 'PHB', printedPages: [20] as const, pdfPages: [21] as const,
    section: 'Spells Usable by Class and Level - Clerics', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'phb:21:druid-spell-capacity': Object.freeze({
    book: 'PHB', printedPages: [21] as const, pdfPages: [22] as const,
    section: 'Spells Usable by Class and Level - Druids (Clerics)', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'phb:24:paladin-spell-capacity': Object.freeze({
    book: 'PHB', printedPages: [24] as const, pdfPages: [25] as const,
    section: 'Spells Usable by Class and Level - Paladins (Fighters)', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'phb:25:ranger-spell-capacity': Object.freeze({
    book: 'PHB', printedPages: [25] as const, pdfPages: [26] as const,
    section: 'Spells Usable by Class and Level - Rangers (Fighters)', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'phb:26:magic-user-illusionist-capacity': Object.freeze({
    book: 'PHB', printedPages: [26] as const, pdfPages: [27] as const,
    section: 'Spells Usable by Class and Level - Magic-Users and Illusionists', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'phb:117-118:bard-spell-capacity': Object.freeze({
    book: 'PHB', printedPages: [117, 118] as const, pdfPages: [118, 119] as const,
    section: 'Appendix II: Bards; Bards Table I and notes', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-image-and-text',
  }),
  'dmg:39-40:acquisition-and-recovery': Object.freeze({
    book: 'DMG', printedPages: [39, 40] as const, pdfPages: [40, 41] as const,
    section: 'Acquisition and Recovery of Spells', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-page-text-plus-shared-evidence-E03-C40-A18-B11',
  }),
} as const);

export type CoreSpellCapacitySourceId = keyof typeof coreSpellCapacitySources;
export type CoreSpellCastingClassId = 'cleric' | 'druid' | 'paladin' | 'ranger' | 'magic-user' | 'illusionist' | 'bard';
export type CoreSpellCapacityTrackId = 'cleric' | 'druid' | 'paladin-cleric' | 'ranger-druidic' | 'ranger-magic-user' | 'magic-user' | 'illusionist' | 'bard-druidic';
export type CoreSpellListId = 'cleric' | 'druid' | 'magic-user' | 'illusionist';

export interface SpellCapacityRow {
  readonly level: number;
  /** Index 0 is spell level 1. Printed dashes are normalized to integer 0. */
  readonly daily: readonly number[];
}

const rows = (values: readonly (readonly number[])[]): readonly SpellCapacityRow[] => Object.freeze(values.map((daily, index) =>
  Object.freeze({ level: index + 1, daily: Object.freeze([...daily]) })));

export const clericSpellCapacityRows = rows([
  [1,0,0,0,0,0,0],[2,0,0,0,0,0,0],[2,1,0,0,0,0,0],[3,2,0,0,0,0,0],[3,3,1,0,0,0,0],
  [3,3,2,0,0,0,0],[3,3,2,1,0,0,0],[3,3,3,2,0,0,0],[4,4,3,2,1,0,0],[4,4,3,3,2,0,0],
  [5,4,4,3,2,1,0],[6,5,5,3,2,2,0],[6,6,6,4,2,2,0],[6,6,6,5,3,2,0],[7,7,7,5,4,2,0],
  [7,7,7,6,5,3,1],[8,8,8,6,5,3,1],[8,8,8,7,6,4,1],[9,9,9,7,6,4,2],[9,9,9,8,7,5,2],
  [9,9,9,9,8,6,2],[9,9,9,9,9,6,3],[9,9,9,9,9,7,3],[9,9,9,9,9,8,3],[9,9,9,9,9,8,4],
  [9,9,9,9,9,9,4],[9,9,9,9,9,9,5],[9,9,9,9,9,9,6],[9,9,9,9,9,9,7],
]);

export const druidSpellCapacityRows = rows([
  [2,0,0,0,0,0,0],[2,1,0,0,0,0,0],[3,2,1,0,0,0,0],[4,2,2,0,0,0,0],[4,3,2,0,0,0,0],
  [4,3,2,1,0,0,0],[4,4,3,1,0,0,0],[4,4,3,2,0,0,0],[5,4,3,2,1,0,0],[5,4,3,3,2,0,0],
  [5,5,3,3,2,1,0],[5,5,4,4,3,2,1],[6,5,5,5,4,3,2],[6,6,6,6,5,4,3],
]);

export const paladinSpellCapacityRows: readonly SpellCapacityRow[] = Object.freeze([
  [1,0,0,0],[2,0,0,0],[2,1,0,0],[2,2,0,0],[2,2,1,0],[3,2,1,0],
  [3,2,1,1],[3,3,1,1],[3,3,2,1],[3,3,3,1],[3,3,3,2],[3,3,3,3],
].map((daily, index) => Object.freeze({ level: index + 9, daily: Object.freeze(daily) })));

export const rangerDruidicSpellCapacityRows: readonly SpellCapacityRow[] = Object.freeze([
  [1,0,0],[1,0,0],[2,0,0],[2,0,0],[2,1,0],[2,1,0],[2,2,0],[2,2,0],[2,2,1],[2,2,2],
].map((daily, index) => Object.freeze({ level: index + 8, daily: Object.freeze(daily) })));

export const rangerMagicUserSpellCapacityRows: readonly SpellCapacityRow[] = Object.freeze([
  [0,0],[1,0],[1,0],[2,0],[2,0],[2,1],[2,1],[2,2],[2,2],[2,2],
].map((daily, index) => Object.freeze({ level: index + 8, daily: Object.freeze(daily) })));

export const magicUserSpellCapacityRows = rows([
  [1,0,0,0,0,0,0,0,0],[2,0,0,0,0,0,0,0,0],[2,1,0,0,0,0,0,0,0],[3,2,0,0,0,0,0,0,0],[4,2,1,0,0,0,0,0,0],
  [4,2,2,0,0,0,0,0,0],[4,3,2,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,2,1,0,0,0,0],[4,4,3,2,2,0,0,0,0],
  [4,4,4,3,3,0,0,0,0],[4,4,4,4,4,1,0,0,0],[5,5,5,4,4,2,0,0,0],[5,5,5,4,4,2,1,0,0],[5,5,5,5,5,2,1,0,0],
  [5,5,5,5,5,3,2,1,0],[5,5,5,5,5,3,3,2,0],[5,5,5,5,5,3,3,2,1],[5,5,5,5,5,3,3,3,1],[5,5,5,5,5,4,3,3,2],
  [5,5,5,5,5,4,4,4,2],[5,5,5,5,5,5,4,4,3],[5,5,5,5,5,5,5,5,3],[5,5,5,5,5,5,5,5,4],[5,5,5,5,5,5,5,5,5],
  [6,6,6,6,5,5,5,5,5],[6,6,6,6,6,6,6,5,5],[6,6,6,6,6,6,6,6,6],[7,7,7,7,6,6,6,6,6],
]);

export const illusionistSpellCapacityRows = rows([
  [1,0,0,0,0,0,0],[2,0,0,0,0,0,0],[2,1,0,0,0,0,0],[3,2,0,0,0,0,0],[4,2,1,0,0,0,0],
  [4,3,1,0,0,0,0],[4,3,2,0,0,0,0],[4,3,2,1,0,0,0],[5,3,3,2,0,0,0],[5,4,3,2,1,0,0],
  [5,4,3,3,2,0,0],[5,5,4,3,2,1,0],[5,5,4,3,2,2,1],[5,5,4,3,2,2,1],[5,5,4,4,2,2,2],
  [5,5,5,4,3,2,2],[5,5,5,5,3,2,2],[5,5,5,5,3,3,2],[5,5,5,5,4,3,2],[5,5,5,5,4,3,3],
  [5,5,5,5,5,4,3],[5,5,5,5,5,5,4],[5,5,5,5,5,5,5],[6,6,6,6,5,5,5],[6,6,6,6,6,6,6],[7,7,7,7,6,6,6],
]);

export const bardSpellCapacityRows = rows([
  [1,0,0,0,0],[2,0,0,0,0],[3,0,0,0,0],[3,1,0,0,0],[3,2,0,0,0],[3,3,0,0,0],
  [3,3,1,0,0],[3,3,2,0,0],[3,3,3,0,0],[3,3,3,1,0],[3,3,3,2,0],[3,3,3,3,0],
  [3,3,3,3,1],[3,3,3,3,2],[3,3,3,3,3],[4,3,3,3,3],[4,4,3,3,3],[4,4,4,3,3],
  [5,4,4,4,3],[5,4,4,4,4],[5,5,4,4,4],[5,5,5,4,4],[5,5,5,5,5],
]);

export interface SpellCapacityTrackRule {
  readonly id: CoreSpellCapacityTrackId;
  readonly classId: CoreSpellCastingClassId;
  readonly listId: CoreSpellListId;
  readonly maxSpellLevel: number;
  readonly rows: readonly SpellCapacityRow[];
  readonly firstSpellUsingLevel: number;
  readonly beyondLastRow: 'explicit-maximum' | 'unsupported';
  readonly sourceIds: readonly CoreSpellCapacitySourceId[];
  readonly chanceToKnow: boolean;
}

export const coreSpellCapacityTracks: Readonly<Record<CoreSpellCapacityTrackId, SpellCapacityTrackRule>> = Object.freeze({
  cleric: Object.freeze({ id: 'cleric', classId: 'cleric', listId: 'cleric', maxSpellLevel: 7, rows: clericSpellCapacityRows,
    firstSpellUsingLevel: 1, beyondLastRow: 'unsupported', sourceIds: ['phb:20:cleric-spell-capacity'] as const, chanceToKnow: false }),
  druid: Object.freeze({ id: 'druid', classId: 'druid', listId: 'druid', maxSpellLevel: 7, rows: druidSpellCapacityRows,
    firstSpellUsingLevel: 1, beyondLastRow: 'unsupported', sourceIds: ['phb:21:druid-spell-capacity'] as const, chanceToKnow: false }),
  'paladin-cleric': Object.freeze({ id: 'paladin-cleric', classId: 'paladin', listId: 'cleric', maxSpellLevel: 4, rows: paladinSpellCapacityRows,
    firstSpellUsingLevel: 9, beyondLastRow: 'explicit-maximum', sourceIds: ['phb:24:paladin-spell-capacity'] as const, chanceToKnow: false }),
  'ranger-druidic': Object.freeze({ id: 'ranger-druidic', classId: 'ranger', listId: 'druid', maxSpellLevel: 3, rows: rangerDruidicSpellCapacityRows,
    firstSpellUsingLevel: 8, beyondLastRow: 'explicit-maximum', sourceIds: ['phb:25:ranger-spell-capacity'] as const, chanceToKnow: false }),
  'ranger-magic-user': Object.freeze({ id: 'ranger-magic-user', classId: 'ranger', listId: 'magic-user', maxSpellLevel: 2, rows: rangerMagicUserSpellCapacityRows,
    firstSpellUsingLevel: 9, beyondLastRow: 'explicit-maximum', sourceIds: ['phb:25:ranger-spell-capacity'] as const, chanceToKnow: true }),
  'magic-user': Object.freeze({ id: 'magic-user', classId: 'magic-user', listId: 'magic-user', maxSpellLevel: 9, rows: magicUserSpellCapacityRows,
    firstSpellUsingLevel: 1, beyondLastRow: 'unsupported', sourceIds: ['phb:26:magic-user-illusionist-capacity'] as const, chanceToKnow: true }),
  illusionist: Object.freeze({ id: 'illusionist', classId: 'illusionist', listId: 'illusionist', maxSpellLevel: 7, rows: illusionistSpellCapacityRows,
    firstSpellUsingLevel: 1, beyondLastRow: 'unsupported', sourceIds: ['phb:26:magic-user-illusionist-capacity'] as const, chanceToKnow: true }),
  'bard-druidic': Object.freeze({ id: 'bard-druidic', classId: 'bard', listId: 'druid', maxSpellLevel: 5, rows: bardSpellCapacityRows,
    firstSpellUsingLevel: 1, beyondLastRow: 'unsupported', sourceIds: ['phb:117-118:bard-spell-capacity'] as const, chanceToKnow: false }),
});

export const coreClassSpellTracks: Readonly<Record<CoreSpellCastingClassId, readonly CoreSpellCapacityTrackId[]>> = Object.freeze({
  cleric: Object.freeze(['cleric'] as const), druid: Object.freeze(['druid'] as const), paladin: Object.freeze(['paladin-cleric'] as const),
  ranger: Object.freeze(['ranger-druidic', 'ranger-magic-user'] as const), 'magic-user': Object.freeze(['magic-user'] as const),
  illusionist: Object.freeze(['illusionist'] as const), bard: Object.freeze(['bard-druidic'] as const),
});

/** Cumulative bonus entries from PHB Wisdom Table II. */
export const clericWisdomAdjustments = Object.freeze([
  Object.freeze({ minWisdom: 9, maxWisdom: 9, spellFailurePercent: 20, cumulativeBonus: [0,0,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 10, maxWisdom: 10, spellFailurePercent: 15, cumulativeBonus: [0,0,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 11, maxWisdom: 11, spellFailurePercent: 10, cumulativeBonus: [0,0,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 12, maxWisdom: 12, spellFailurePercent: 5, cumulativeBonus: [0,0,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 13, maxWisdom: 13, spellFailurePercent: 0, cumulativeBonus: [1,0,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 14, maxWisdom: 14, spellFailurePercent: 0, cumulativeBonus: [2,0,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 15, maxWisdom: 15, spellFailurePercent: 0, cumulativeBonus: [2,1,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 16, maxWisdom: 16, spellFailurePercent: 0, cumulativeBonus: [2,2,0,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 17, maxWisdom: 17, spellFailurePercent: 0, cumulativeBonus: [2,2,1,0,0,0,0] as const }),
  Object.freeze({ minWisdom: 18, maxWisdom: null, spellFailurePercent: 0, cumulativeBonus: [2,2,1,1,0,0,0] as const }),
]);

export const spellCapacityInterpretation = Object.freeze({
  printedDash: 'normalized-to-zero-not-entitled',
  zeroDoesNotMeanUnknown: true,
  capacityDoesNotProve: Object.freeze(['chance-to-know', 'spell-found', 'spellbook-entry', 'divine-grant', 'prepared-copy'] as const),
  wisdomAdjustmentScope: Object.freeze({
    applies: ['cleric', 'druid'] as const,
    doesNotTransferBySpellListAlone: ['paladin', 'ranger', 'bard'] as const,
    reason: 'PHB 11 grants Adjustments for Clerics; druid is expressly a cleric subclass. Fighter subclasses and Bard use their own exact daily tables.',
  }),
  twoClassAndMulticlass: 'Capacity remains attached to each career and is never pooled; whether a former human class is currently usable is a separate class-ability gate.',
  bard: 'Appendix II is supplemental and requires explicit campaign enablement; prior fighter/thief levels are not bard spell-capacity levels.',
});

export const coreSpellCapacityRulePack = Object.freeze({
  id: 'adnd1e:core:spell-capacity', version: '1.0.0', verifiedAt: '2026-10-14',
  scope: 'PHB core daily capacity for cleric, druid, paladin, ranger, magic-user, illusionist and optional Bard; PHB cleric Wisdom adjustments',
  sources: coreSpellCapacitySources, tracks: coreSpellCapacityTracks, wisdom: clericWisdomAdjustments,
  interpretation: spellCapacityInterpretation,
  unresolved: Object.freeze({
    clericBeyondLevel29: 'unknown; table ends at 29 and no maximum-capacity footnote was found',
    magicUserBeyondLevel29: 'unknown; table ends at 29 and no maximum-capacity footnote was found',
    illusionistBeyondLevel26: 'unknown; table ends at 26 and no maximum-capacity footnote was found',
    expansionClassesAndTables: 'not included; UA/OA and later material must use separate rule packs',
    acquisitionAndPreparation: 'separate ledgers/workflows; daily capacity alone grants no spell identity or prepared copy',
  }),
});
