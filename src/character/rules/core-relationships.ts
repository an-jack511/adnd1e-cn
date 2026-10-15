/**
 * AD&D 1e core relationship rules verified against this workspace's original
 * PHB/DMG page images. This pack deliberately does not turn an NPC into a pet
 * slot: employment, continuing service, loyalty and combat morale are distinct.
 */

export type RelationshipCitationId = keyof typeof relationshipCitations;
export type RelationshipKind = 'henchman' | 'standard-hireling' | 'expert-hireling' | 'mercenary';

const phb = {
  book: 'PHB',
  sourceFile: "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf",
  sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
} as const;
const dmg = {
  book: 'DMG',
  sourceFile: "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf",
  sha256: '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669',
} as const;
const page = (base: typeof phb | typeof dmg, printedPages: readonly number[], section: string) => Object.freeze({
  ...base,
  printedPages: Object.freeze([...printedPages]),
  pdfPages: Object.freeze(printedPages.map(value => value + 1)),
  pdfIndices0: Object.freeze([...printedPages]),
  section,
  verification: 'page-image-and-embedded-text',
  verified: true,
  ocrStatus: 'no-independent-ocr-file; embedded recognition text is not page-image evidence',
} as const);

export const relationshipCitations = Object.freeze({
  'phb:13:charisma': page(phb, [13], 'Charisma Table and notes: henchman maximum, loyalty base and reaction adjustments'),
  'dmg:34:daily-employment': page(dmg, [34], 'Daily employment limits for expert hirelings and soldiers'),
  'dmg:34-36:henchmen': page(dmg, [34, 35, 36], 'Prospective henchmen, recruiting, offers, acceptance, equipment and exceptional henchmen'),
  'dmg:36-37:loyalty': page(dmg, [36, 37], 'Loyalty, obedience and morale checks; loyalty base modifiers'),
  'dmg:67:morale': page(dmg, [67], 'Combat morale triggers, roll modifiers, scores and failure results'),
});
export interface CharismaRelationshipRow {
  readonly score: number;
  readonly maximumHenchmen: number;
  readonly loyaltyBaseAdjustment: number;
  readonly reactionAdjustment: number;
}

export const charismaRelationshipTable: readonly CharismaRelationshipRow[] = Object.freeze([
  [3, 1, -30, -25], [4, 1, -25, -20], [5, 2, -20, -15],
  [6, 2, -15, -10], [7, 3, -10, -5], [8, 3, -5, 0],
  [9, 4, 0, 0], [10, 4, 0, 0], [11, 4, 0, 0], [12, 5, 0, 0],
  [13, 5, 0, 5], [14, 6, 5, 10], [15, 7, 15, 15], [16, 8, 20, 25],
  [17, 10, 30, 30], [18, 15, 40, 35],
].map(([score, maximumHenchmen, loyaltyBaseAdjustment, reactionAdjustment]) => Object.freeze({
  score, maximumHenchmen, loyaltyBaseAdjustment, reactionAdjustment,
} as CharismaRelationshipRow)));

export const relationshipDefinitions = Object.freeze({
  henchman: Object.freeze({
    kind: 'henchman' as const,
    nature: 'long-term NPC retainer with race, class, advancement history and an adventure share',
    charismaCounted: true,
    ordinaryStartingLevel: 1,
    arrivesUnequipped: true,
    minimumInitialPaymentGpPerLevel: 100,
    offerInterest: Object.freeze({ baseAtMinimum: 25, perAdditional100Gp: 10, paymentMaximum: 55,
      perUsableMagicItem: 15, quartersAndSupport: 5, noQuartersAndSupport: -25 }),
    acceptance: 'd100-at-or-below-interest-plus-charisma-reaction',
    privateCandidateFacts: Object.freeze(['exact ability scores', 'alignment', 'religion', 'personality', 'acceptance roll']),
    citationIds: Object.freeze(['phb:13:charisma', 'dmg:34-36:henchmen'] as RelationshipCitationId[]),
  }),
  hireling: Object.freeze({
    kinds: Object.freeze(['standard-hireling', 'expert-hireling', 'mercenary'] as RelationshipKind[]),
    nature: 'paid worker, servant, specialist or soldier under an employment agreement; not a henchman',
    charismaCounted: false,
    numberLimit: 'not-limited-by-charisma',
    loyaltyStillApplies: true,
    negotiation: 'availability, term, duties, pay, quarters, equipment and bonuses remain contract facts and DM adjudication',
    citationIds: Object.freeze(['phb:13:charisma', 'dmg:34:daily-employment', 'dmg:36-37:loyalty'] as RelationshipCitationId[]),
  }),
});

export type LoyaltyModifierGroup =
  | 'association' | 'service-length' | 'training-status' | 'pay-share'
  | 'discipline-activity' | 'treatment' | 'racial-liege' | 'racial-group'
  | 'alignment-distance-liege' | 'alignment-distance-group' | 'liege-alignment'
  | 'special-negative' | 'special-positive' | 'situation';

export interface LoyaltyModifierRule {
  readonly id: string;
  readonly group: LoyaltyModifierGroup;
  readonly value: number;
  readonly label: string;
  readonly repeatable?: boolean;
}
const lm = (id: string, group: LoyaltyModifierGroup, value: number, label: string, repeatable = false): LoyaltyModifierRule =>
  Object.freeze({ id, group, value, label, ...(repeatable ? { repeatable: true } : {}) });

/** Values are percentage-point changes to the 50% normal loyalty base. */
export const loyaltyModifierRules: readonly LoyaltyModifierRule[] = Object.freeze([
  lm('associated-npc', 'association', -10, 'associated non-player character'),
  lm('captured-enlisted', 'association', -15, 'captured and enlisted'),
  lm('henchman', 'association', 5, 'henchman'),
  lm('hired-mercenary', 'association', 0, 'hired mercenary'),
  lm('hired-mercenary-short-term', 'association', -5, 'hired mercenary, short term'),
  lm('slave', 'association', -30, 'slave'),
  lm('service-under-1-month', 'service-length', -5, 'less than 1 month'),
  lm('service-under-1-year', 'service-length', 0, 'less than 1 year'),
  lm('service-1-to-5-years', 'service-length', 10, '1 to 5 years'),
  lm('service-over-5-years', 'service-length', 25, 'more than 5 years'),
  lm('untrained-or-peasant', 'training-status', -25, 'untrained or peasant'),
  lm('little-training-or-levy', 'training-status', -15, 'little training or levied troops'),
  lm('new-regulars', 'training-status', -5, 'newly recruited regulars'),
  lm('trained-regulars', 'training-status', 10, 'trained regulars'),
  lm('elite-subofficer-expert', 'training-status', 20, 'elite, sub-official, minor official or expert hireling'),
  lm('guard-officer-henchman', 'training-status', 30, 'guards, officers, major officials or henchmen'),
  lm('pay-none', 'pay-share', -20, 'no pay or share'),
  lm('pay-partial-late-unfair', 'pay-share', -10, 'partial, late or unfair pay/share'),
  lm('pay-average', 'pay-share', 0, 'average pay/share'),
  lm('pay-above-average', 'pay-share', 5, 'above average pay or fair shares'),
  lm('pay-exceptional', 'pay-share', 10, 'exceptional pay, bonuses or gifts'),
  lm('discipline-none', 'discipline-activity', -10, 'none or almost none'),
  lm('discipline-lax', 'discipline-activity', -5, 'lax or little activity'),
  lm('discipline-harsh', 'discipline-activity', 0, 'firm and harsh or occasional activity'),
  lm('discipline-fair', 'discipline-activity', 10, 'firm and fair or often active'),
  lm('treatment-inhuman', 'treatment', -25, 'inhuman and heartless'),
  lm('treatment-cruel', 'treatment', -10, 'cruel and domineering; sign depends on presence/power note'),
  lm('treatment-indifferent', 'treatment', -5, 'indifferent, uncaring or variable'),
  lm('treatment-just', 'treatment', 10, 'just and invariable'),
  lm('treatment-just-kind', 'treatment', 15, 'just, kind and invariable'),
  lm('racial-antipathy-liege', 'racial-liege', -5, 'racial antipathy toward liege'),
  lm('racial-goodwill-liege', 'racial-liege', 10, 'racial goodwill toward liege'),
  lm('racial-hatred-liege', 'racial-liege', -20, 'racial hatred toward liege'),
  lm('racial-neutral-liege', 'racial-liege', 0, 'racial neutrality toward liege'),
  lm('racial-preferred-liege', 'racial-liege', 20, 'racial preference for liege'),
  lm('racial-tolerance-liege', 'racial-liege', 0, 'racial tolerance toward liege'),
  lm('racial-antipathy-group', 'racial-group', -10, 'racial antipathy toward associated group'),
  lm('racial-goodwill-group', 'racial-group', 5, 'racial goodwill toward associated group'),
  lm('racial-hatred-group', 'racial-group', -15, 'racial hatred toward associated group'),
  lm('racial-neutral-group', 'racial-group', 0, 'racial neutrality toward associated group'),
  lm('racial-preferred-group', 'racial-group', 15, 'racial preference for associated group'),
  lm('racial-tolerance-group', 'racial-group', -5, 'racial tolerance toward associated group'),
  lm('alignment-1-liege', 'alignment-distance-liege', 0, 'liege alignment 1 place removed'),
  lm('alignment-2-liege', 'alignment-distance-liege', -15, 'liege alignment 2 places removed'),
  lm('alignment-3-liege', 'alignment-distance-liege', -35, 'liege alignment 3 places removed'),
  lm('alignment-1-group', 'alignment-distance-group', 0, 'group alignment 1 place removed'),
  lm('alignment-2-group', 'alignment-distance-group', -5, 'group alignment 2 places removed'),
  lm('alignment-3-group', 'alignment-distance-group', -20, 'group alignment 3 places removed'),
  lm('liege-lg', 'liege-alignment', 15, 'lawful good liege'),
  lm('liege-ln', 'liege-alignment', 10, 'lawful neutral liege'),
  lm('liege-le', 'liege-alignment', 5, 'lawful evil liege'),
  lm('liege-ng', 'liege-alignment', 0, 'neutral good liege'),
  lm('liege-tn', 'liege-alignment', 0, 'true neutral liege'),
  lm('liege-cg', 'liege-alignment', -5, 'chaotic good liege'),
  lm('liege-cn', 'liege-alignment', -10, 'chaotic neutral liege'),
  lm('liege-ne', 'liege-alignment', -15, 'neutral evil liege'),
  lm('liege-ce', 'liege-alignment', -20, 'chaotic evil liege'),
  lm('killed-faithful-witnessed', 'special-negative', -40, 'killed faithful henchman/hireling before witnesses'),
  lm('tortured-faithful-witnessed', 'special-negative', -30, 'tortured faithful henchman/hireling before witnesses'),
  lm('reported-killed-or-abandoned', 'special-negative', -20, 'reported killing/abandonment to death'),
  lm('oathbreaker-deserter', 'special-negative', -15, 'forsworn oath breaker or deserter'),
  lm('reported-torture', 'special-negative', -10, 'reported torture of faithful follower/hireling'),
  lm('dismissed-without-cause', 'special-negative', -5, 'dismissed faithful follower/hireling without cause'),
  lm('recent-gift', 'special-positive', 5, 'qualifying recent gift or bonus'),
  lm('liege-risked-life', 'special-positive', 10, 'liege risked life within qualifying period'),
  lm('ransomed-or-rescued', 'special-positive', 15, 'ransomed or rescued within one year'),
  lm('personally-saved-life', 'special-positive', 25, 'personally saved life'),
  lm('spent-own-magic', 'special-positive', 25, 'used and diminished own magic for NPC'),
  lm('restored-from-death', 'special-positive', 50, 'restored from death-like state or raised/resurrected'),
  lm('liege-dead-surrounded', 'situation', -25, 'liege dead or surrounded and outnumbered'),
  lm('liege-incapacitated', 'situation', -15, 'liege hors de combat'),
  lm('henchman-dead', 'situation', -5, 'each henchman dead or hors de combat', true),
  lm('friendly-hd-dead', 'situation', -3, 'each friendly hit die/level dead', true),
  lm('enemy-hd-alive', 'situation', -1, 'each enemy hit die/level alive', true),
  lm('enemy-hd-dead', 'situation', 1, 'each enemy hit die/level dead', true),
  lm('friendly-hd-alive', 'situation', 2, 'each friendly hit die/level alive', true),
  lm('henchman-alive-visible', 'situation', 5, 'each henchman present, in sight and alive', true),
  lm('liege-alive-visible', 'situation', 15, 'liege present, in sight and alive'),
]);

export type MoraleTriggerId = typeof moraleTriggers[number]['id'];
export const moraleTriggers = Object.freeze([
  { id: 'obviously-superior-force', rollModifier: 0, cadence: 'each-round', label: 'faced by obviously superior force' },
  { id: 'party-quarter-eliminated', rollModifier: 5, cadence: 'once-when-triggered', label: '25% of party eliminated or slain' },
  { id: 'leader-unconscious', rollModifier: 10, cadence: 'once-when-triggered', label: 'leader unconscious' },
  { id: 'party-half-eliminated', rollModifier: 15, cadence: 'once-when-triggered', label: '50% or more of party eliminated or slain' },
  { id: 'leader-slain-or-deserts', rollModifier: 30, cadence: 'once-when-triggered', label: 'leader slain or deserts' },
] as const);

export type MoraleModifierId = typeof moraleRollModifiers[number]['id'];
/** Positive values make the percentile roll worse; negative values make it better. */
export const moraleRollModifiers = Object.freeze([
  { id: 'enemy-deserting', value: -5, repeatable: true, label: 'each enemy deserting' },
  { id: 'enemy-slain', value: -10, repeatable: true, label: 'each enemy slain' },
  { id: 'inflicting-casualties-unhurt', value: -20, repeatable: false, label: 'inflicting casualties without receiving any' },
  { id: 'friend-killed', value: 10, repeatable: true, label: 'each friend killed' },
  { id: 'taking-casualties-no-return', value: 10, repeatable: false, label: 'taking casualties without inflicting any' },
  { id: 'friend-deserting', value: 15, repeatable: true, label: 'each friend deserting' },
  { id: 'outnumbered-three-to-one', value: 20, repeatable: false, label: 'outnumbered and outclassed by 3 or more to 1' },
] as const);

export const moraleFailureBands = Object.freeze([
  { min: 1, max: 15, outcome: 'fall-back-fighting' },
  { min: 16, max: 30, outcome: 'disengage-retreat' },
  { min: 31, max: 50, outcome: 'flee-in-panic' },
  { min: 51, max: null, outcome: 'surrender' },
] as const);

export const coreRelationshipsPack = Object.freeze({
  id: 'adnd1e:phb-dmg:core-relationships',
  version: '1.0.0',
  verifiedAt: '2026-10-14',
  status: 'verified-skeleton-with-explicit-unknowns',
  scope: 'PHB13; DMG34-37 and 67 only; no UA/OA, class followers, stronghold population or full occupation-cost tables',
  citations: relationshipCitations,
  charismaRelationshipTable,
  relationshipDefinitions,
  loyalty: Object.freeze({ normalBase: 50, modifierRules: loyaltyModifierRules,
    roll: 'd100; failure when roll exceeds adjusted loyalty score',
    disclosure: 'DM-private score, factors and roll; players receive only adjudicated/observed consequences',
    citationIds: Object.freeze(['dmg:36-37:loyalty'] as RelationshipCitationId[]) }),
  morale: Object.freeze({ triggers: moraleTriggers, rollModifiers: moraleRollModifiers,
    failureBands: moraleFailureBands,
    roll: 'd100 plus combat roll modifiers; compare against current loyalty score',
    citationIds: Object.freeze(['dmg:67:morale'] as RelationshipCitationId[]) }),
  unresolved: Object.freeze({
    fullHirelingAvailabilityAndCosts: Object.freeze({ status: 'unknown', needsDm: true,
      reason: 'This bounded pack did not transcribe or verify every standard/expert hireling occupation and cost table.' }),
    candidateGeneration: Object.freeze({ status: 'needs-dm', needsDm: true,
      reason: 'Locale, population, race, class, personality and what is revealed are campaign facts and/or secret DM generation.' }),
    cruelTreatmentPresenceSign: Object.freeze({ status: 'needs-dm', needsDm: true,
      reason: 'DMG37 changes the cruel/domineering modifier with the liege present and in power; caller must submit the resolved table entry, not guess.' }),
    racialPreferenceSelection: Object.freeze({ status: 'needs-dm', needsDm: true,
      reason: 'The table is verified, but the NPC preference and associated-group selection are DM facts.' }),
    classFollowers: Object.freeze({ status: 'unknown', needsDm: true,
      reason: 'Upper-level class followers are not ordinary henchmen and are outside this pack.' }),
  }),
});
