/**
 * AD&D 1e core spell-ledger rule data.
 *
 * This pack is intentionally a ledger contract, not a spell-slot table. Career
 * level/capacity facts are supplied by the verified progression rules. It also
 * keeps arcane learning and divine bestowal as different procedures.
 */

const phbSourceFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";
const dmgSourceFile =
  "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";

export const coreSpellLedgerSources = Object.freeze({
  'phb:10:intelligence-spell-knowledge': Object.freeze({
    book: 'PHB', printedPages: [10] as const, pdfPages: [11] as const,
    section: 'Intelligence Table II; chance, minimum and maximum spells known',
    sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text-plus-shared-visual-evidence-E02',
  }),
  'phb:40:character-spells': Object.freeze({
    book: 'PHB', printedPages: [40] as const, pdfPages: [41] as const,
    section: 'Character Spells', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text',
  }),
  'dmg:38:cleric-spell-acquisition': Object.freeze({
    book: 'DMG', printedPages: [38] as const, pdfPages: [39] as const,
    section: 'Day-to-Day Acquisition of Cleric Spells', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-page-text',
  }),
  'dmg:39:arcane-spell-acquisition': Object.freeze({
    book: 'DMG', printedPages: [39] as const, pdfPages: [40] as const,
    section: 'Acquisition of Magic-User and Illusionist Spells', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-page-text-plus-shared-visual-evidence-E03',
  }),
  'dmg:40:spell-recovery-and-casting': Object.freeze({
    book: 'DMG', printedPages: [40] as const, pdfPages: [41] as const,
    section: 'Recovery of Spells; Spell Casting', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-page-text-plus-round-review-C40-A18-B11',
  }),
} as const);

export type CoreSpellLedgerSourceId = keyof typeof coreSpellLedgerSources;
export type CoreSpellTradition = 'magic-user' | 'illusionist' | 'cleric' | 'druid';
export type ArcaneTradition = Extract<CoreSpellTradition, 'magic-user' | 'illusionist'>;
export type DivineTradition = Extract<CoreSpellTradition, 'cleric' | 'druid'>;
export type CoreSpellListId = 'magic-user' | 'illusionist' | 'cleric' | 'druid';

/** Names are labels. This stable, source-scoped identity is the join key. */
export interface CoreSpellDefinitionRef {
  readonly definitionId: string;
  readonly rulesetId: string;
  readonly listId: CoreSpellListId;
  readonly level: number;
  readonly displayName: string;
  readonly sourceIds: readonly string[];
}

export const spellIdentityRule = Object.freeze({
  identityField: 'definitionId',
  displayNameIsUnique: false,
  rule: 'Never join, de-duplicate or migrate spells by display name; list, level and ruleset are also explicit facts.',
});

export const traditionRules = Object.freeze({
  'magic-user': Object.freeze({
    kind: 'arcane', listId: 'magic-user', requiresSpellbookForPreparation: true,
    usesChanceToKnow: true, sourceIds: ['phb:10:intelligence-spell-knowledge', 'phb:40:character-spells', 'dmg:39:arcane-spell-acquisition'] as const,
  }),
  illusionist: Object.freeze({
    kind: 'arcane', listId: 'illusionist', requiresSpellbookForPreparation: true,
    usesChanceToKnow: true, sourceIds: ['phb:10:intelligence-spell-knowledge', 'phb:40:character-spells', 'dmg:39:arcane-spell-acquisition'] as const,
  }),
  cleric: Object.freeze({
    kind: 'divine', listId: 'cleric', requiresSpellbookForPreparation: false,
    usesChanceToKnow: false, sourceIds: ['phb:40:character-spells', 'dmg:38:cleric-spell-acquisition'] as const,
  }),
  druid: Object.freeze({
    kind: 'divine', listId: 'druid', requiresSpellbookForPreparation: false,
    usesChanceToKnow: false, sourceIds: ['phb:40:character-spells', 'dmg:38:cleric-spell-acquisition'] as const,
  }),
} as const);

export const spellRecoveryRestHours = Object.freeze([
  Object.freeze({ minimumLevel: 1, maximumLevel: 2, hours: 4 }),
  Object.freeze({ minimumLevel: 3, maximumLevel: 4, hours: 6 }),
  Object.freeze({ minimumLevel: 5, maximumLevel: 6, hours: 8 }),
  Object.freeze({ minimumLevel: 7, maximumLevel: 8, hours: 10 }),
  Object.freeze({ minimumLevel: 9, maximumLevel: 9, hours: 12 }),
]);

export const spellRecoveryRule = Object.freeze({
  restBasedOnHighestSpellLevel: true,
  studyOrPrayerMinutesPerSpellLevel: 15,
  interruptionsCanMakeRecoveryImpossible: true,
  elapsedRealTimeNeverAutoCompletesRecovery: true,
  sourceIds: ['phb:40:character-spells', 'dmg:40:spell-recovery-and-casting'] as const,
});

export const divineBestowalRule = Object.freeze({
  separateFromArcaneTranscription: true,
  dmMaySubstituteOrWithholdRequestedSpell: true,
  sourceIds: ['phb:40:character-spells', 'dmg:38:cleric-spell-acquisition'] as const,
  sourceRelationship: Object.freeze({
    status: 'needs-campaign-adoption',
    reason: 'PHB 40 and DMG 38 describe different level bands for intermediary/direct bestowal; this ledger records the actual adjudicated authority and does not silently merge them.',
  }),
});

export const arcaneTranscriptionRule = Object.freeze({
  chanceToKnowReusedFrom: '../engine/core-spell-acquisition',
  successfulScrollLearningConsumesSource: true,
  spellbookEntryRequiredForPreparation: true,
  costs: Object.freeze({ status: 'unknown', reason: 'No copying cost was certified in the bounded PHB 10 / DMG 39 evidence.' }),
  duration: Object.freeze({ status: 'unknown', reason: 'No transcription duration was certified in the bounded PHB 10 / DMG 39 evidence.' }),
  sourceIds: ['phb:10:intelligence-spell-knowledge', 'dmg:39:arcane-spell-acquisition'] as const,
});

export const coreSpellLedgerRulePack = Object.freeze({
  id: 'adnd1e:core:spell-ledger', version: '1.0.0', verifiedAt: '2026-10-14',
  scope: 'spell identity, eligibility boundary, physical arcane sources, spellbooks, transcription records, divine grants, prepared copies, casting consumption, recovery sessions and safe player projection',
  sources: coreSpellLedgerSources,
  identity: spellIdentityRule,
  traditions: traditionRules,
  recovery: spellRecoveryRule,
  divineBestowal: divineBestowalRule,
  transcription: arcaneTranscriptionRule,
  unresolved: Object.freeze({
    transcriptionCostAndDuration: 'unknown; not inferred from later editions',
    completeCareerCapacityTables: 'supplied by a separately verified career/progression pack',
    materialComponentInventoryEffects: 'needs the inventory/action transaction layer and spell-specific data',
    interruptionConsequences: 'needs DM adjudication; no automatic completion or refund',
    phbDmgDivineAgencyBands: 'requires explicit campaign adoption or case ruling',
  }),
});
