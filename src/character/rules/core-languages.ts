/**
 * Verified AD&D 1e core language entitlements.
 *
 * This module describes capacity and timing only.  A capacity entry is not
 * evidence that the character already knows a player-named language.
 */

const phbSourceFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";
const dmgSourceFile =
  "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";

export const coreLanguageSources = Object.freeze({
  'phb:10:intelligence-languages': Object.freeze({
    book: 'PHB', printedPages: [10] as const, pdfPages: [11] as const,
    section: 'Character Abilities — Intelligence; Intelligence Table I', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-pdf-page-text',
  }),
  'phb:15-17:racial-languages': Object.freeze({
    book: 'PHB', printedPages: [15, 16, 17] as const, pdfPages: [16, 17, 18] as const,
    section: 'Character Race Descriptions', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-pdf-page-text',
  }),
  'phb:21:druid-languages': Object.freeze({
    book: 'PHB', printedPages: [21] as const, pdfPages: [22] as const,
    section: 'Character Classes — Druids', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-pdf-page-text',
  }),
  'phb:27:thieves-cant': Object.freeze({
    book: 'PHB', printedPages: [27] as const, pdfPages: [28] as const,
    section: 'Character Classes — Thief; Additional Abilities', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-pdf-page-text',
  }),
  'phb:29:assassin-alignment-tongues': Object.freeze({
    book: 'PHB', printedPages: [29] as const, pdfPages: [30] as const,
    section: 'Character Classes — Assassin; Alignment Languages', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-pdf-page-text',
  }),
  'phb:34-35:character-languages': Object.freeze({
    book: 'PHB', printedPages: [34, 35] as const, pdfPages: [35, 36] as const,
    section: 'Character Languages', sourceFile: phbSourceFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-pdf-page-text',
  }),
  'dmg:24:language-scope': Object.freeze({
    book: 'DMG', printedPages: [24] as const, pdfPages: [25] as const,
    section: 'Alignment Language', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-pdf-page-text',
  }),
  'dmg:37:campaign-time': Object.freeze({
    book: 'DMG', printedPages: [37] as const, pdfPages: [38] as const,
    section: 'Game Time', sourceFile: dmgSourceFile,
    sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
    verification: 'local-pdf-page-text',
  }),
} as const);

export type CoreLanguageSourceId = keyof typeof coreLanguageSources;
export type CoreRaceId = 'human' | 'dwarf' | 'elf' | 'gnome' | 'half-elf' | 'halfling' | 'half-orc';
export type CoreAlignmentId = 'lawful-good' | 'lawful-neutral' | 'lawful-evil' | 'neutral-good' | 'true-neutral' |
  'neutral-evil' | 'chaotic-good' | 'chaotic-neutral' | 'chaotic-evil';
export type CoreLanguageCareerId = 'cleric' | 'druid' | 'fighter' | 'paladin' | 'ranger' | 'magic-user' |
  'illusionist' | 'thief' | 'assassin' | 'monk';

export const alignmentLanguageIds: Readonly<Record<CoreAlignmentId, string>> = Object.freeze({
  'lawful-good': 'alignment:lawful-good', 'lawful-neutral': 'alignment:lawful-neutral',
  'lawful-evil': 'alignment:lawful-evil', 'neutral-good': 'alignment:neutral-good',
  'true-neutral': 'alignment:neutrality', 'neutral-evil': 'alignment:neutral-evil',
  'chaotic-good': 'alignment:chaotic-good', 'chaotic-neutral': 'alignment:chaotic-neutral',
  'chaotic-evil': 'alignment:chaotic-evil',
});

export interface RacialLanguageRule {
  readonly automaticLanguageIds: readonly string[];
  readonly automaticCommunicationIds: readonly string[];
  readonly extraLanguageCapacity: 'intelligence-table' | 'intelligence-table-capped-2' | 'above-15' | 'above-16';
}

export const coreRacialLanguageRules: Readonly<Record<CoreRaceId, RacialLanguageRule>> = Object.freeze({
  human: Object.freeze({ automaticLanguageIds: ['common'], automaticCommunicationIds: [], extraLanguageCapacity: 'intelligence-table' }),
  // Canonical ids normalize the book's noun/adjective variants (for example
  // dwarf/dwarven/dwarvish and gnome/gnomish) so duplicate checks are sound.
  dwarf: Object.freeze({ automaticLanguageIds: ['common', 'dwarvish', 'gnomish', 'goblin', 'kobold', 'orcish'], automaticCommunicationIds: [], extraLanguageCapacity: 'intelligence-table-capped-2' }),
  elf: Object.freeze({ automaticLanguageIds: ['common', 'elvish', 'gnomish', 'halfling', 'goblin', 'hobgoblin', 'orcish', 'gnoll'], automaticCommunicationIds: [], extraLanguageCapacity: 'above-15' }),
  gnome: Object.freeze({ automaticLanguageIds: ['common', 'dwarvish', 'gnomish', 'halfling', 'goblin', 'kobold'], automaticCommunicationIds: ['communicate:burrowing-mammals'], extraLanguageCapacity: 'intelligence-table-capped-2' }),
  'half-elf': Object.freeze({ automaticLanguageIds: ['common', 'elvish', 'gnomish', 'halfling', 'goblin', 'hobgoblin', 'orcish', 'gnoll'], automaticCommunicationIds: [], extraLanguageCapacity: 'above-16' }),
  halfling: Object.freeze({ automaticLanguageIds: ['common', 'dwarvish', 'elvish', 'gnomish', 'goblin', 'halfling', 'orcish'], automaticCommunicationIds: [], extraLanguageCapacity: 'above-16' }),
  'half-orc': Object.freeze({ automaticLanguageIds: ['common', 'orcish'], automaticCommunicationIds: [], extraLanguageCapacity: 'intelligence-table-capped-2' }),
});

/** PHB Intelligence Table I, scores 3 through 18. */
export const intelligenceAdditionalLanguageCapacity: Readonly<Record<number, number>> = Object.freeze({
  3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1, 9: 1, 10: 2, 11: 2, 12: 3, 13: 3, 14: 4, 15: 4, 16: 5, 17: 6, 18: 7,
});

export const druidLevelLanguageChoices = Object.freeze([
  'centaur', 'dryad', 'elvish', 'faun', 'gnomish', 'green-dragon', 'hill-giant', 'lizardman',
  'manticore', 'nixie', 'pixie', 'sprite', 'treantish',
] as const);

export const assassinSpecialLanguageChoices = Object.freeze([
  ...Object.values(alignmentLanguageIds), 'druidic', 'thieves-cant',
] as const);

export const coreLanguageInterpretation = Object.freeze({
  factsVersusChoices: 'Automatic racial/class languages are facts; extra-language counts are unfilled entitlements until a particular language and its DM approval/acquisition are recorded.',
  racialOverrides: 'The explicit elf, half-elf and halfling thresholds replace the general Intelligence Table count; dwarf, gnome and half-orc retain the table count but cap it at two.',
  commonDialect: 'The campaign may contain a different common tongue; the DM identifies the actual dialect.',
  campaignAvailability: 'Which languages are knowable is strictly the DM’s decision; the PHB list is illustrative, not a universal selectable catalogue.',
  study: 'Ordinary additional-language study requires an instructor, proximity, campaign time, and permits only one language under study at once.',
  specialLanguages: 'Druidic and Thieves’ Cant are class grants and do not consume Intelligence-derived slots. Assassin level-granted tongues are a separate entitlement.',
  communicationNotLanguage: 'Gnome communication with burrowing mammals is represented separately and does not consume or masquerade as a language slot.',
  noModernProficiencies: true,
});

export const coreLanguageRulePack = Object.freeze({
  id: 'adnd1e:core:languages', version: '1.0.0', verifiedAt: '2026-10-15',
  scope: 'PHB/DMG core racial, Intelligence-derived, Druid, Thief and Assassin language entitlements and study boundaries',
  sources: coreLanguageSources, races: coreRacialLanguageRules,
  intelligenceAdditionalLanguageCapacity, interpretation: coreLanguageInterpretation,
  unresolved: Object.freeze({
    initialExtraLanguageTiming: 'PHB gives capacity and a study procedure but does not explicitly say whether every Intelligence slot is pre-filled at first-level creation; campaign/DM policy must record pre-existing knowledge or require study.',
    commonDialectIdentity: 'The concrete common tongue/dialect is campaign-defined.',
    languageAvailability: 'No universal candidate list is encoded; the DM supplies languages available in the campaign and an instructor where study is required.',
    literacy: 'Speaking/conversation entitlement is not silently converted into reading/writing proficiency.',
    bardAndExpansionLanguages: 'Bard, UA, OA and survival-guide additions are outside this core-only module.',
  }),
});
