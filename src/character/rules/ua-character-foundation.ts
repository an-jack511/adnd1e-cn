/**
 * AD&D 1e Unearthed Arcana character-creation foundation sidecar.
 *
 * This optional pack records only facts verified against the local 1985 UA
 * scan.  It deliberately does not silently replace PHB rules: a campaign
 * must enable the pack, and social standing, sponsorship, trainer identity,
 * and other referee decisions remain explicit gates.
 */

export const uaCharacterFoundationBook = Object.freeze({
  id: 'UA' as const,
  title: 'Unearthed Arcana',
  sourceFile: '__RESOURCES/Extensions/AD&D Unearthed Arcana.pdf',
  sha256: 'E06818CBCCE7E4605837AD767E9930C126F43B08D3CE358E14746C7B73EED4F4',
  edition: 'AD&D 1e, 1985 printing represented by the local scan',
});

const source = (printedPages: readonly number[], section: string, scope: string) => Object.freeze({
  book: 'UA' as const,
  printedPages: Object.freeze([...printedPages]),
  pdfPages: Object.freeze(printedPages.map(page => page + 1)),
  sourceFile: uaCharacterFoundationBook.sourceFile,
  sha256: uaCharacterFoundationBook.sha256,
  section,
  scope,
  verification: 'local-page-image-and-embedded-text' as const,
});

export const uaCharacterFoundationSources = Object.freeze({
  'ua:7:race-class': source([7], 'Character Race Table I: Character Class Limitations', 'Permitted race/class combinations and alignment requirements.'),
  'ua:12-13:class-summary': source([12, 13], 'Character Classes Tables I-II', 'Hit dice, maximum hit dice, spell flag, class limit, armor and weapons.'),
  'ua:14-16:cavalier': source([14, 15, 16], 'The Cavalier / The Paladin', 'Entry requirements, 0-level route, advancement, hit points, training, code, and paladin relationship.'),
  'ua:18-20:barbarian': source([18, 19, 20], 'The Barbarian', 'Entry requirements, progression, hit points, magic restrictions, native territory, and level unlocks.'),
  'ua:23-25:thief-acrobat': source([23, 24, 25], 'The Thief-Acrobat / Money', 'Split-class transition, training, advancement, retained/ended thief functions, encumbrance and equipment cap.'),
  'ua:25:cavalier-money': source([25], 'Starting Money and Equipment for Cavaliers', 'Social-standing packages, coin ranges, equipment, mount, and 0-level fostering.'),
  'ua:74:method-v': source([74], 'Generation of Ability Scores: Method V', 'Human-only, desired-class, DM-approved dice pools, best-three rule, clamping, and minimum starting HP.'),
} as const);

export type UaCharacterFoundationSourceId = keyof typeof uaCharacterFoundationSources;
export type UaRuleStatus = 'verified' | 'needs-dm' | 'unsupported';
export type UaFoundationClassId = 'cavalier' | 'paladin' | 'barbarian' | 'thief-acrobat';
export type UaMethodVClassId = 'cavalier' | 'paladin' | 'cleric' | 'druid' | 'fighter' | 'barbarian' |
  'ranger' | 'magic-user' | 'illusionist' | 'thief' | 'assassin' | 'monk';
export type UaAbilityId = 'strength' | 'intelligence' | 'wisdom' | 'dexterity' | 'constitution' | 'charisma' | 'comeliness';
export type UaAlignment = 'lawful-good' | 'lawful-neutral' | 'lawful-evil' | 'neutral-good' | 'true-neutral' |
  'neutral-evil' | 'chaotic-good' | 'chaotic-neutral' | 'chaotic-evil';
export type UaRaceStock = 'human' | 'half-elf' | 'dwarf-gray' | 'dwarf-hill' | 'dwarf-mountain' |
  'elf-dark' | 'elf-gray' | 'elf-high' | 'elf-valley' | 'elf-wild' | 'elf-wood' |
  'gnome-deep' | 'gnome-surface' | 'halfling' | 'half-orc';

export interface UaAbilityScores {
  readonly strength: number;
  readonly intelligence: number;
  readonly wisdom: number;
  readonly dexterity: number;
  readonly constitution: number;
  readonly charisma: number;
  readonly comeliness?: number;
}

const dice = (strength: number, intelligence: number, wisdom: number, dexterity: number, constitution: number, charisma: number, comeliness: number) =>
  Object.freeze({strength, intelligence, wisdom, dexterity, constitution, charisma, comeliness});

/** Exact dice counts from UA p.74; every score keeps the best three d6. */
export const uaMethodVDiceByClass: Readonly<Record<UaMethodVClassId, Readonly<Record<UaAbilityId, number>>>> = Object.freeze({
  cavalier: dice(8, 6, 4, 7, 9, 3, 5),
  paladin: dice(7, 5, 8, 3, 6, 9, 4),
  cleric: dice(7, 4, 9, 5, 8, 6, 3),
  druid: dice(7, 4, 8, 5, 6, 9, 3),
  fighter: dice(9, 3, 5, 7, 8, 6, 4),
  barbarian: dice(9, 3, 5, 7, 8, 6, 4),
  ranger: dice(7, 6, 8, 5, 9, 4, 3),
  'magic-user': dice(4, 9, 7, 8, 6, 5, 3),
  illusionist: dice(3, 8, 7, 9, 5, 6, 4),
  thief: dice(6, 5, 3, 9, 7, 4, 8),
  assassin: dice(6, 7, 4, 9, 8, 3, 5),
  monk: dice(7, 5, 9, 8, 6, 4, 3),
});

export const uaMethodVRule = Object.freeze({
  id: 'ua-method-v',
  status: 'verified' as UaRuleStatus,
  humanOnly: true,
  requiresDmClassApproval: true,
  keepHighestDice: 3,
  clampBelowClassMinimum: true,
  clampAboveClassMaximum: true,
  sourceIds: Object.freeze(['ua:74:method-v'] as UaCharacterFoundationSourceId[]),
});

export const uaFoundationClassRequirements = Object.freeze({
  cavalier: Object.freeze({
    minimums: Object.freeze({strength:15, intelligence:10, wisdom:10, dexterity:15, constitution:15}),
    alignments: Object.freeze<UaAlignment[]>(['lawful-good','neutral-good','chaotic-good']),
    raceStocks: Object.freeze<UaRaceStock[]>(['human','half-elf','elf-dark','elf-gray','elf-high']),
    socialGate: 'upper-class-immediate-or-dm-approved-sponsorship-and-0-level-route' as const,
    primeRequisiteXpBonus: false,
    sourceIds: Object.freeze(['ua:7:race-class','ua:14-16:cavalier'] as UaCharacterFoundationSourceId[]),
  }),
  paladin: Object.freeze({
    minimums: Object.freeze({strength:15, intelligence:10, wisdom:13, dexterity:15, constitution:15, charisma:17}),
    alignments: Object.freeze<UaAlignment[]>(['lawful-good']),
    raceStocks: Object.freeze<UaRaceStock[]>(['human','half-elf']),
    socialGate: 'proper-station-or-local-noble-sponsorship-and-0-level-route' as const,
    primeRequisiteXpBonus: false,
    relationship: 'UA paladin is a cavalier sub-class; PHB paladin powers and advancement remain, plus UA cavalier abilities.' as const,
    sourceIds: Object.freeze(['ua:7:race-class','ua:14-16:cavalier'] as UaCharacterFoundationSourceId[]),
  }),
  barbarian: Object.freeze({
    minimums: Object.freeze({strength:15, dexterity:14, constitution:15}),
    maximums: Object.freeze({wisdom:16}),
    alignments: Object.freeze<UaAlignment[]>(['neutral-good','true-neutral','neutral-evil','chaotic-good','chaotic-neutral','chaotic-evil']),
    raceStocks: Object.freeze<UaRaceStock[]>(['human']),
    socialGate: 'dm-approved-native-territory-and-cultural-background' as const,
    primeRequisiteXpBonus: false,
    dualClassAllowed: false,
    sourceIds: Object.freeze(['ua:7:race-class','ua:18-20:barbarian'] as UaCharacterFoundationSourceId[]),
  }),
  'thief-acrobat': Object.freeze({
    minimums: Object.freeze({strength:15, dexterity:16}),
    alignments: Object.freeze<UaAlignment[]>(['lawful-neutral','lawful-evil','true-neutral','neutral-evil','chaotic-neutral','chaotic-evil']),
    raceStocks: Object.freeze<UaRaceStock[]>(['human','half-elf','dwarf-gray','dwarf-hill','dwarf-mountain','elf-dark','elf-gray','elf-high','elf-valley','elf-wild','elf-wood','gnome-deep','gnome-surface','halfling','half-orc']),
    transitionFrom: 'thief' as const,
    transitionAtLevel: 6,
    completedThiefLevelsRequired: 5,
    trainerMinimumLevel: 10,
    trainingWeeks: 6,
    bonusXpMinimums: Object.freeze({strength:16, dexterity:16}),
    sourceIds: Object.freeze(['ua:7:race-class','ua:23-25:thief-acrobat'] as UaCharacterFoundationSourceId[]),
  }),
});

export const uaStartingHitPointFloors = Object.freeze<Record<UaMethodVClassId, number>>({
  cavalier: 6, paladin: 6, cleric: 5, druid: 5, fighter: 6, barbarian: 7,
  ranger: 9, 'magic-user': 3, illusionist: 3, thief: 4, assassin: 4, monk: 5,
});

export interface UaProgressionRow {
  readonly level: number;
  readonly minimumXp: number;
  readonly hitDice: string;
  readonly title: string;
}

const progression = (...rows: UaProgressionRow[]) => Object.freeze(rows.map(row => Object.freeze(row)));

export const uaProgressionFoundations = Object.freeze({
  cavalier: Object.freeze({
    rows: progression(
      {level:0,minimumXp:-1500,hitDice:'1d4+1',title:'Horseman'},
      {level:0,minimumXp:-500,hitDice:'2d4+1',title:'Lancer'},
      {level:1,minimumXp:0,hitDice:'3d4+1 or 1d10+3',title:'Armiger'},
      {level:2,minimumXp:2501,hitDice:'2d10+3 route-dependent',title:'Scutifer'},
      {level:3,minimumXp:5001,hitDice:'3d10+3 route-dependent',title:'Esquire'},
      {level:4,minimumXp:10001,hitDice:'4d10+3 route-dependent',title:'Knight Errant'},
      {level:5,minimumXp:18501,hitDice:'5d10+3 route-dependent',title:'Knight Bachelor'},
      {level:6,minimumXp:37001,hitDice:'6d10+3 route-dependent',title:'Knight'},
      {level:7,minimumXp:85001,hitDice:'7d10+3 route-dependent',title:'Grand Knight'},
      {level:8,minimumXp:140001,hitDice:'8d10+3 route-dependent',title:'Banneret'},
      {level:9,minimumXp:220001,hitDice:'9d10+3 route-dependent',title:'Cavalier'},
      {level:10,minimumXp:300001,hitDice:'10d10+3 route-dependent',title:'Cavalier'},
      {level:11,minimumXp:600001,hitDice:'10d10+6 route-dependent',title:'Cavalier, 11th'},
      {level:12,minimumXp:900001,hitDice:'10d10+9 route-dependent',title:'Cavalier, 12th'},
    ),
    beyondLevel: 12, xpPerLevel: 300000, hpPerLevelAfterMaximumDice: 3,
    status: 'needs-dm' as UaRuleStatus,
    note: 'The printed table expresses accumulated dice, but the two 0-level route versus immediate-entry route changes first-level dice; preserve the route as a character fact.',
    sourceIds: Object.freeze(['ua:14-16:cavalier'] as UaCharacterFoundationSourceId[]),
  }),
  paladin: Object.freeze({
    status: 'needs-dm' as UaRuleStatus,
    note: 'UA explicitly leaves PHB paladin level advancement unchanged while making paladin a cavalier sub-class. Delegate XP thresholds to the verified PHB progression pack and retain the UA 0-level social route.',
    sourceIds: Object.freeze(['ua:14-16:cavalier'] as UaCharacterFoundationSourceId[]),
  }),
  barbarian: Object.freeze({
    rows: progression(
      {level:1,minimumXp:0,hitDice:'1d12',title:'Barbarian'}, {level:2,minimumXp:6001,hitDice:'2d12',title:'Barbarian'},
      {level:3,minimumXp:12001,hitDice:'3d12',title:'Barbarian'}, {level:4,minimumXp:24001,hitDice:'4d12',title:'Barbarian'},
      {level:5,minimumXp:48001,hitDice:'5d12',title:'Barbarian'}, {level:6,minimumXp:80001,hitDice:'6d12',title:'Barbarian'},
      {level:7,minimumXp:150001,hitDice:'7d12',title:'Barbarian'}, {level:8,minimumXp:275001,hitDice:'8d12',title:'Barbarian'},
      {level:9,minimumXp:500001,hitDice:'8d12+4',title:'Barbarian'}, {level:10,minimumXp:1000001,hitDice:'8d12+8',title:'Barbarian'},
      {level:11,minimumXp:1500001,hitDice:'8d12+12',title:'Barbarian'},
    ),
    beyondLevel: 11, xpPerLevel: 500000, hpPerLevelAfterMaximumDice: 4,
    status: 'verified' as UaRuleStatus,
    sourceIds: Object.freeze(['ua:18-20:barbarian'] as UaCharacterFoundationSourceId[]),
  }),
  'thief-acrobat': Object.freeze({
    rows: progression(
      {level:6,minimumXp:20001,hitDice:'as thief split class',title:'Burglar-Acrobat'},
      {level:7,minimumXp:45001,hitDice:'as thief split class',title:'Second-Story Thief'},
      {level:8,minimumXp:75001,hitDice:'as thief split class',title:'Cat Burglar'},
      {level:9,minimumXp:125001,hitDice:'as thief split class',title:'Master Cat Burglar'},
      {level:10,minimumXp:180001,hitDice:'as thief split class',title:'Thief-Acrobat'},
      {level:11,minimumXp:250001,hitDice:'as thief split class',title:'Master Thief-Acrobat'},
      {level:12,minimumXp:500001,hitDice:'as thief split class',title:'Master Thief-Acrobat (12th)'},
    ),
    beyondLevel: 12, xpPerLevel: 250000, hpPerLevelAfterMaximumDice: null,
    status: 'needs-dm' as UaRuleStatus,
    note: 'Hit-die progression is inherited from thief and must retain the pre-transition thief history; this foundation does not synthesize a new HP table.',
    sourceIds: Object.freeze(['ua:23-25:thief-acrobat'] as UaCharacterFoundationSourceId[]),
  }),
});

export type UaCavalierSocialPackageId = 'lower-middle-or-lesser' | 'middle-middle' | 'upper-middle' |
  'lower-upper' | 'middle-upper' | 'upper-upper';

export const uaCavalierStartingPackages = Object.freeze({
  'lower-middle-or-lesser': Object.freeze({careerStart:'horseman-0',gpMin:20,gpMax:80,equipment:['shield','sword (any type)','riding horse'],status:'needs-dm' as UaRuleStatus}),
  'middle-middle': Object.freeze({careerStart:'horseman-0',gpMin:20,gpMax:80,equipment:['shield','dagger','sword (broad or long)','light warhorse'],status:'needs-dm' as UaRuleStatus}),
  'upper-middle': Object.freeze({careerStart:'horseman-0',gpMin:20,gpMax:80,equipment:['chain mail','sword (broad or long)','lance','light warhorse'],status:'needs-dm' as UaRuleStatus}),
  'lower-upper': Object.freeze({careerStart:'cavalier-1',gpMin:70,gpMax:180,coinFormula:'(1d12+6)x10 gp',equipment:['shield','plate mail','dagger','sword (long or broad)','lance','medium warhorse'],status:'verified' as UaRuleStatus}),
  'middle-upper': Object.freeze({careerStart:'cavalier-1',gpMin:70,gpMax:180,equipment:['shield','field plate armor','dagger','sword (long or broad)','lance','heavy warhorse'],status:'needs-dm' as UaRuleStatus}),
  'upper-upper': Object.freeze({careerStart:'cavalier-1',gpMin:130,gpMax:180,coinFormula:'(1d6+12)x10 gp',equipment:['shield','full plate armor','dagger','sword (long or broad)','mace','lance','heavy warhorse with leather barding'],status:'verified' as UaRuleStatus}),
} as const);

export const uaThiefAcrobatTransitionEquipment = Object.freeze({
  maximumTotalGpAtLevel6: 450,
  listedKitGp: 288,
  maximumAdditionalEquipmentOrLootGp: 162,
  status: 'verified' as UaRuleStatus,
  sourceIds: Object.freeze(['ua:23-25:thief-acrobat'] as UaCharacterFoundationSourceId[]),
});

export const uaCharacterFoundationPack = Object.freeze({
  id: 'adnd1e:ua:character-foundation',
  version: '1.0.0',
  verifiedAt: '2026-10-15',
  defaultEnabled: false,
  status: 'verified-with-explicit-dm-and-unsupported-boundaries',
  sourceBook: uaCharacterFoundationBook,
  sources: uaCharacterFoundationSources,
  exclusions: Object.freeze([
    'post-1985 errata and later-edition interpretations',
    'complete UA sub-race ability adjustments and level-limit matrices',
    'complete cavalier, barbarian, and thief-acrobat capability tables',
    'social-class generation table on UA p.82',
    'automatic reconciliation of PHB paladin XP with UA cavalier 0-level entry',
  ]),
});
