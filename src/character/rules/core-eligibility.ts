/** PHB core PC eligibility, independently read from the local first-edition PDFs.
 * This is declarative evidence data, not admission, an advancement engine, or UA.
 * null means unknown/not numeric; consult kind and verification before using it.
 */
export const coreAbilityIds = ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'] as const;
export type CoreAbilityId = typeof coreAbilityIds[number];
export const coreRaceIds = ['dwarf', 'elf', 'gnome', 'half-elf', 'halfling', 'half-orc', 'human'] as const;
export type CoreRaceId = typeof coreRaceIds[number];
export const coreClassIds = ['cleric', 'druid', 'fighter', 'paladin', 'ranger', 'magic-user', 'illusionist', 'thief', 'assassin', 'monk', 'bard'] as const;
export type CoreClassId = typeof coreClassIds[number];
export const coreAlignmentIds = ['LG', 'NG', 'CG', 'LN', 'TN', 'CN', 'LE', 'NE', 'CE'] as const;
export type CoreAlignmentId = typeof coreAlignmentIds[number];
export type CorePermission = boolean | 'needs-dm';
export type CoreVerification = 'T' | 'V' | 'P';
export interface CoreEvidence {
  sourceIds: readonly string[];
  verification: CoreVerification;
}
export interface CoreEligibilitySource {
  id: string;
  book: 'PHB' | 'DMG';
  printedPage: number;
  pdfPage: number;
  pdfIndex: number;
  section: string;
  verification: CoreVerification;
  scope: string;
}
export type CorePredicate =
  | { ability: CoreAbilityId; op: 'lt' | 'eq' | 'gte'; value: number }
  | { subraceId: string }
  | { all: readonly CorePredicate[] }
  | { any: readonly CorePredicate[] };
export interface CoreLevelLimit extends CoreEvidence {
  kind: 'unlimited' | 'fixed' | 'conditional' | 'ineligible' | 'unknown';
  /** Only a fixed limit is directly usable. Conditional entries must be selected. */
  value: number | null;
  cases: readonly { id: string; when: CorePredicate; value: number }[];
  otherwise: number | null;
  pendingIds: readonly string[];
}
export interface CoreAbilityRange extends CoreEvidence {
  min: number;
  maleMax: number | null;
  femaleMax: number | null;
  scope: 'creation-after-racial-adjustment' | 'non-own-race-interactions';
  pendingIds: readonly string[];
}
export interface CoreRaceRule extends CoreEvidence {
  id: CoreRaceId;
  label: string;
  pcClasses: Record<CoreClassId, CorePermission>;
  /** Racial caps only: also apply the class's intrinsic limit and progression gates. */
  classLevelLimits: Record<CoreClassId, CoreLevelLimit>;
  abilityRanges: Record<CoreAbilityId, CoreAbilityRange>;
  abilityAdjustments: Record<CoreAbilityId, number>;
  adjustmentsEvidence: CoreEvidence;
  exceptionalStrength: CoreEvidence & {
    /** null here is inapplicable at normal creation (STR cap below18), not 0%. */
    maleMaxPercent: number | null;
    femaleMaxPercent: number | null;
    maleAtCreation: boolean;
    femaleAtCreation: boolean;
    eligibleClassIds: readonly CoreClassId[];
    unavailableReason: string | null;
  };
  contextualCharisma: null | (CoreEvidence & {
    preserveUnadjusted: true;
    ownRaceIds: readonly CoreRaceId[];
    unaffectedNpcSpeciesIds: readonly string[];
    usesOriginalScoreForOwnRace: true;
  });
  /** Explicit core subraces; no UA expansion implied. */
  subraceIds: readonly string[];
}
export interface CoreProgressionGate extends CoreEvidence {
  id: string;
  fromLevel: number;
  throughLevel: number | null;
  seats: number | null;
  resolution: 'needs-dm';
  requirement: string;
}
export interface CoreClassRule extends CoreEvidence {
  id: CoreClassId;
  label: string;
  parentClassId: CoreClassId | null;
  /** Sparse, complete list of class-specific numeric entry minima, not zero-fill. */
  minimumAbilities: Partial<Record<CoreAbilityId, number>>;
  minimumAbilitiesComplete: true;
  alignmentIds: readonly CoreAlignmentId[];
  alignmentEvidence: CoreEvidence;
  freshLevelOneEntry: CorePermission;
  intrinsicLevelLimit: CoreLevelLimit;
  progressionGates: readonly CoreProgressionGate[];
  pendingIds: readonly string[];
}
export interface CoreMultiClassRule extends CoreEvidence {
  id: string;
  classIds: readonly CoreClassId[];
  raceIds: readonly CoreRaceId[];
  permission: true;
  additionalMinima: readonly {
    raceId: CoreRaceId; classId: CoreClassId; ability: CoreAbilityId; min: number;
    sourceIds: readonly string[]; verification: CoreVerification;
  }[];
}
export interface CorePendingRule extends CoreEvidence {
  id: string;
  resolution: 'needs-dm';
  value: null;
  issue: string;
  alternatives: readonly { value: number | null; sourceIds: readonly string[]; meaning: string }[];
}

const phb = (page: number, section: string, scope: string): CoreEligibilitySource => ({
  id: `phb-${page}`, book: 'PHB', printedPage: page, pdfPage: page + 1,
  pdfIndex: page, section, verification: 'V', scope,
});
const sources: readonly CoreEligibilitySource[] = [
  phb(9, 'Strength Table I', 'Low STR restriction, initial range, exceptional STR sex/race maxima; not combat adjustments.'),
  phb(10, 'Intelligence Table I', 'Low INT restriction; not a spell-understanding data pack.'),
  phb(11, 'Wisdom Table I / Dexterity Table I', 'Low WIS/DEX restrictions; half-orc DEX14 assertion.'),
  phb(12, 'Constitution Table', 'Low CON restriction; not HP/shock/resurrection tables.'),
  phb(13, 'Character Race Table I / Charisma', 'All 70 ordinary PC permission cells, alignment legend, low CHA restriction.'),
  phb(14, 'Character Race Table II and nine footnotes / Penalties and Bonuses', 'All 70 racial limit cells, U/no/NPC parentheses and nine footnotes; four racial adjustment rows.'),
  phb(15, 'Character Race Table III and notes / Dwarves', 'All 72 nonhuman min/max cells, sex legend, adjustment ordering, dwarf fighter/thief.'),
  phb(16, 'Dwarves / Elves / Gnomes', 'Contextual dwarf CHA; high elf PC stock; elf and gnome combinations.'),
  phb(17, 'Half-Elves / Halflings / Half-Orcs / Humans', 'Combination lists, adjustments, contextual half-orc CHA, human base.'),
  phb(18, 'Humans continuation / Character Classes', 'Human racial limit distinct from intrinsic class limit; no preference table certification.'),
  phb(19, 'Character Classes Table I', 'Intrinsic limits only; no certification of the armor/weapon or HP tables.'),
  phb(20, 'Cleric / Druid entry paragraphs', 'Entry WIS, half-elf multiclass WIS13, normal single-class clerics; druid WIS/CHA.'),
  phb(21, 'Druid higher levels', 'Druid seats 9/3/1 at levels12/13/14; vacancy or challenge; class cap14.'),
  phb(22, 'Fighter / Paladin entry paragraphs', 'STR/CON fighter minima and five paladin minima, human/LG.'),
  phb(24, 'Ranger entry paragraph', 'Four entry minima and good alignment.'),
  phb(25, 'Magic-User entry paragraph', 'INT9/DEX6; no XP or spell progression certification.'),
  phb(26, 'Illusionist / Thief entry paragraphs', 'INT15/DEX16 illusionist and DEX9 thief minima.'),
  phb(28, 'Assassin entry paragraph', 'STR12/INT11/DEX12 and evil alignment.'),
  phb(30, 'Assassin advancement and table / Monk entry', 'Assassin levels14/15 challenge; monk four minima and lawful alignment.'),
  phb(32, 'Monk restriction6 / The Multi-Classed Character', 'Monk seats/challenge, six combination entries and nonhuman restriction.'),
  phb(33, 'Multi-Classed continuation / Character With Two Classes', 'Remaining combinations, human sequential class change15/17 and strict exceed condition.'),
  phb(117, 'Appendix II: Bards / Bard Abilities / Bard Race / The Class', 'DM opt-in, six minima, human/half-elf, fighter5–7 then thief5–8 and druid tutelage; neutral axis.'),
  phb(118, 'Notes Regarding Bards Table I', 'Intrinsic bard maximum23; not full bard ability/spell tables.'),
  { id: 'phb-27', book: 'PHB', printedPage: 27, pdfPage: 28, pdfIndex: 27,
    section: 'Thief entry continuation', verification: 'T',
    scope: 'Neutral or evil thieves; rare neutral-good explicitly allowed. Text read, no page image viewed this task.' },
  { id: 'dmg-11', book: 'DMG', printedPage: 11, pdfPage: 12, pdfIndex: 11,
    section: 'Generation of Ability Scores / NPCs / Wishes', verification: 'V',
    scope: 'PC/NPC generation separation and changes from wishes; eligibility pack does not implement these.' },
  { id: 'dmg-21', book: 'DMG', printedPage: 21, pdfPage: 22, pdfIndex: 21,
    section: 'The Monster as a Player Character', verification: 'V',
    scope: 'Humanocentric design and DM discretion for monster PCs; no invented monster PC classes.' },
];
const ev = (sourceIds: readonly string[], verification: CoreVerification = 'V'): CoreEvidence => ({ sourceIds, verification });
const limit = (kind: CoreLevelLimit['kind'], value: number | null,
  sourceIds: readonly string[] = ['phb-14'], verification: CoreVerification = 'V',
  pendingIds: readonly string[] = []): CoreLevelLimit => ({
  kind, value, ...ev(sourceIds, verification), cases: [], otherwise: null, pendingIds,
});
const band = (ability: CoreAbilityId, low: number, middle: number, high: number): CoreLevelLimit => ({
  ...limit('conditional', null), cases: [
    { id: `${ability.toLowerCase()}-below-17`, when: { ability, op: 'lt', value: 17 }, value: low },
    { id: `${ability.toLowerCase()}-17`, when: { ability, op: 'eq', value: 17 }, value: middle },
  ], otherwise: high,
});
const gnomeIllusionist: CoreLevelLimit = {
  ...limit('conditional', null), cases: [
    { id: 'either-below-17', when: { any: [{ ability: 'INT', op: 'lt', value: 17 }, { ability: 'DEX', op: 'lt', value: 17 }] }, value: 5 },
    { id: 'both-17', when: { all: [{ ability: 'INT', op: 'eq', value: 17 }, { ability: 'DEX', op: 'eq', value: 17 }] }, value: 6 },
    { id: 'both-18', when: { all: [{ ability: 'INT', op: 'eq', value: 18 }, { ability: 'DEX', op: 'eq', value: 18 }] }, value: 7 },
  ], otherwise: null, pendingIds: ['gnome-illusionist-mixed-17-18'],
};
const halflingFighter: CoreLevelLimit = {
  ...limit('conditional', null), cases: [
    { id: 'hairfoot', when: { subraceId: 'hairfoot' }, value: 4 },
    { id: 'all-below-17', when: { ability: 'STR', op: 'lt', value: 17 }, value: 4 },
    { id: 'tallfellow-17', when: { all: [{ subraceId: 'tallfellow' }, { ability: 'STR', op: 'eq', value: 17 }] }, value: 5 },
    { id: 'stout-18', when: { all: [{ subraceId: 'stout' }, { ability: 'STR', op: 'eq', value: 18 }] }, value: 5 },
    { id: 'tallfellow-18', when: { all: [{ subraceId: 'tallfellow' }, { ability: 'STR', op: 'eq', value: 18 }] }, value: 6 },
  ], otherwise: null, pendingIds: ['halfling-exceptional-origin'],
};

type RangeRow = readonly [min: number, maleMax: number | null, femaleMax: number | null];
const rangeRows: Record<CoreRaceId, readonly RangeRow[]> = {
  dwarf: [[8,18,17],[3,18,18],[3,18,18],[3,17,17],[12,19,19],[3,16,16]],
  elf: [[3,18,16],[8,18,18],[3,18,18],[7,19,19],[6,18,18],[8,18,18]],
  gnome: [[6,18,15],[7,18,18],[3,18,18],[3,18,18],[8,18,18],[3,18,18]],
  'half-elf': [[3,18,17],[4,18,18],[3,18,18],[6,18,18],[6,18,18],[3,18,18]],
  halfling: [[6,17,14],[6,18,18],[3,17,17],[8,18,18],[10,19,19],[3,18,18]],
  // PHB15 prints17; PHB11 prints14. Keep both in pendingRules, not a chosen max.
  'half-orc': [[6,18,18],[3,17,17],[3,14,14],[3,null,null],[13,19,19],[3,12,12]],
  human: [[3,18,18],[3,18,18],[3,18,18],[3,18,18],[3,18,18],[3,18,18]],
};
const permitted: Record<CoreRaceId, readonly CoreClassId[]> = {
  dwarf: ['fighter','thief','assassin'],
  elf: ['fighter','magic-user','thief','assassin'],
  gnome: ['fighter','illusionist','thief','assassin'],
  'half-elf': ['cleric','druid','fighter','ranger','magic-user','thief','assassin'],
  halfling: ['fighter','thief'],
  'half-orc': ['cleric','fighter','thief','assassin'],
  human: coreClassIds.filter(id => id !== 'bard'),
};
const racialLimits: Record<CoreRaceId, Partial<Record<CoreClassId, number | 'U' | CoreLevelLimit>>> = {
  dwarf: { fighter: band('STR',7,8,9), thief:'U', assassin:9 },
  elf: { fighter:band('STR',5,6,7), 'magic-user':band('INT',9,10,11), thief:'U', assassin:10 },
  gnome: { fighter:{...limit('conditional',null), cases:[{id:'str-below-18',when:{ability:'STR',op:'lt',value:18},value:5}],otherwise:6},
    illusionist:gnomeIllusionist, thief:'U', assassin:8 },
  'half-elf': { cleric:5, druid:'U', fighter:band('STR',6,7,8), ranger:band('STR',6,7,8),
    'magic-user':band('INT',6,7,8), thief:'U', assassin:11,
    bard:limit('unlimited',null,['phb-117','phb-118']) },
  halfling: { fighter:halflingFighter, thief:'U' },
  'half-orc': { cleric:4, fighter:10, thief:band('DEX',6,7,8), assassin:'U' },
  human: Object.fromEntries(coreClassIds.map(id => [id,'U'])),
};
const adjustments: Record<CoreRaceId, readonly number[]> = {
  dwarf:[0,0,0,0,1,-1], elf:[0,0,0,1,-1,0], gnome:[0,0,0,0,0,0],
  'half-elf':[0,0,0,0,0,0], halfling:[-1,0,0,1,0,0],
  'half-orc':[1,0,0,0,1,-2], human:[0,0,0,0,0,0],
};
const exceptionalCaps: Record<CoreRaceId, readonly [number | null, number | null]> = {
  dwarf:[99,null], elf:[75,null], gnome:[50,null], 'half-elf':[90,null],
  halfling:[null,null], 'half-orc':[99,75], human:[100,50],
};
const raceLabels: Record<CoreRaceId,string> = {dwarf:'矮人',elf:'精灵',gnome:'侏儒','half-elf':'半精灵',halfling:'半身人','half-orc':'半兽人',human:'人类'};
function abilityRecord<T>(value:(ability:CoreAbilityId,index:number)=>T):Record<CoreAbilityId,T> {
  return {STR:value('STR',0),INT:value('INT',1),WIS:value('WIS',2),DEX:value('DEX',3),CON:value('CON',4),CHA:value('CHA',5)};
}
const races: readonly CoreRaceRule[] = coreRaceIds.map(id => ({
  id, label:raceLabels[id], ...ev(['phb-13','phb-14','phb-15','phb-117']),
  pcClasses:Object.fromEntries(coreClassIds.map(classId => [classId,
    classId === 'bard' && (id === 'human' || id === 'half-elf') ? 'needs-dm' : permitted[id].includes(classId)])) as Record<CoreClassId,CorePermission>,
  classLevelLimits:Object.fromEntries(coreClassIds.map(classId => {
    const entry=racialLimits[id][classId];
    return [classId, entry === undefined ? limit('ineligible',null) : entry === 'U'
      ? limit('unlimited',null,classId === 'bard' ? ['phb-117','phb-118'] : ['phb-14'])
      : typeof entry === 'number' ? limit('fixed',entry) : entry];
  })) as Record<CoreClassId,CoreLevelLimit>,
  abilityRanges:abilityRecord<CoreAbilityRange>((ability,index) => {
    const [min,maleMax,femaleMax]=rangeRows[id][index];
    const conflict=id === 'half-orc' && ability === 'DEX';
    return {min,maleMax,femaleMax,
      scope:ability === 'CHA' && (id === 'dwarf' || id === 'half-orc') ? 'non-own-race-interactions' : 'creation-after-racial-adjustment',
      ...ev(conflict ? ['phb-11','phb-15'] : id === 'human' ? ['phb-9','phb-17'] : ['phb-15'], conflict ? 'P' : 'V'),
      pendingIds:conflict ? ['half-orc-dex-maximum'] : []};
  }),
  abilityAdjustments:abilityRecord((_ability,index) => adjustments[id][index]),
  adjustmentsEvidence:ev(['phb-14','phb-17']),
  exceptionalStrength:{...ev(['phb-9']), maleMaxPercent:exceptionalCaps[id][0], femaleMaxPercent:exceptionalCaps[id][1],
    maleAtCreation:exceptionalCaps[id][0] !== null,femaleAtCreation:exceptionalCaps[id][1] !== null,
    eligibleClassIds:['fighter','paladin','ranger'],
    unavailableReason:id === 'halfling' ? 'creation-strength-maximum-below-18' : null},
  contextualCharisma:id === 'dwarf' || id === 'half-orc' ? {
    ...ev(id === 'dwarf' ? ['phb-13','phb-16'] : ['phb-13','phb-17']), preserveUnadjusted:true,
    ownRaceIds:id === 'dwarf' ? ['dwarf'] : ['half-orc'], usesOriginalScoreForOwnRace:true,
    unaffectedNpcSpeciesIds:id === 'dwarf' ? ['dwarf'] : ['orc','half-orc'],
  } : null,
  subraceIds:id === 'elf' ? ['high-elf'] : id === 'dwarf' ? ['hill-dwarf','mountain-dwarf']
    : id === 'halfling' ? ['hairfoot','tallfellow','stout'] : [],
}));

const gate = (id:string, fromLevel:number, throughLevel:number|null, seats:number|null,
  requirement:string, sourceId:string):CoreProgressionGate => ({id,fromLevel,throughLevel,seats,
  resolution:'needs-dm',requirement,...ev([sourceId])});
const classRule = (id:CoreClassId,label:string,parentClassId:CoreClassId|null,
  minimumAbilities:Partial<Record<CoreAbilityId,number>>,alignmentIds:readonly CoreAlignmentId[],page:number,
  intrinsicLevelLimit=limit('unlimited',null,['phb-19']),progressionGates:readonly CoreProgressionGate[]=[],
  pendingIds:readonly string[]=[]):CoreClassRule => ({id,label,parentClassId,minimumAbilities,
  minimumAbilitiesComplete:true,alignmentIds,alignmentEvidence:ev(['phb-13',`phb-${page}`]),
  freshLevelOneEntry:id === 'bard' ? false : true,intrinsicLevelLimit,progressionGates,pendingIds,...ev([`phb-${page}`])});
const classes:readonly CoreClassRule[] = [
  classRule('cleric','牧师',null,{WIS:9},coreAlignmentIds.filter(id=>id!=='TN'),20),
  classRule('druid','德鲁伊','cleric',{WIS:12,CHA:15},['TN'],20,limit('fixed',14,['phb-19','phb-21']),[
    gate('druid-12-seat',12,12,9,'Vacant seat OR defeat a current level12 druid; ordinary XP alone does not grant the powers.','phb-21'),
    gate('druid-13-seat',13,13,3,'Vacancy/challenge process repeated for Archdruid.','phb-21'),
    gate('druid-14-seat',14,14,1,'Vacancy/challenge process repeated for Great Druid.','phb-21'),
  ]),
  classRule('fighter','战士',null,{STR:9,CON:7},coreAlignmentIds,22),
  classRule('paladin','圣武士','fighter',{STR:12,INT:9,WIS:13,CON:9,CHA:17},['LG'],22),
  classRule('ranger','游侠','fighter',{STR:13,INT:13,WIS:14,CON:14},['LG','NG','CG'],24),
  classRule('magic-user','魔法师',null,{INT:9,DEX:6},coreAlignmentIds,25),
  classRule('illusionist','幻术师','magic-user',{INT:15,DEX:16},coreAlignmentIds,26),
  {...classRule('thief','盗贼',null,{DEX:9},['NG','LN','TN','CN','LE','NE','CE'],26),
    alignmentEvidence:ev(['phb-13','phb-27'],'T')},
  classRule('assassin','刺客','thief',{STR:12,INT:11,DEX:12},['LE','NE','CE'],28,
    limit('unknown',null,['phb-19','phb-30'],'P',['assassin-intrinsic-maximum']),[
      gate('assassin-14-challenge',14,14,1,'Kill or defeat the local Guildmaster; seat scope is local guild.','phb-30'),
      gate('assassin-15-challenge',15,15,1,'Slay Grandfather of Assassins; conflicts with PHB19 maximum14.','phb-30'),
    ],['assassin-intrinsic-maximum']),
  classRule('monk','武僧',null,{STR:15,WIS:15,DEX:15,CON:11},['LG','LN','LE'],30,
    limit('fixed',17,['phb-19','phb-32']),[
      gate('monk-8-seat',8,8,3,'Defeat one of White/Green/Red Masters of Dragons in single unarmed combat, without magic.','phb-32'),
      gate('monk-9-plus-seat',9,17,1,'One seat per higher level; required challenge, temporary abilities before victory.','phb-32'),
    ]),
  classRule('bard','吟游诗人',null,{STR:15,INT:12,WIS:15,DEX:15,CON:10,CHA:15},['NG','LN','TN','CN','NE'],117,
    limit('fixed',23,['phb-118']),[],['bard-versus-ordinary-dual-minima']),
];
const combo=(classIds:readonly CoreClassId[],raceIds:readonly CoreRaceId[],sourceIds:readonly string[]):CoreMultiClassRule => ({
  id:`multi-${classIds.join('-')}`,classIds,raceIds,permission:true,...ev(sourceIds),
  additionalMinima:classIds.includes('cleric') && raceIds.includes('half-elf')
    ? [{raceId:'half-elf',classId:'cleric',ability:'WIS',min:13,...ev(['phb-11','phb-20'])}] : [],
});
const multiClassCombinations:readonly CoreMultiClassRule[] = [
  combo(['cleric','fighter'],['half-elf','half-orc'],['phb-32']),
  combo(['cleric','fighter','magic-user'],['half-elf'],['phb-32']),
  combo(['cleric','ranger'],['half-elf'],['phb-32']),
  combo(['cleric','magic-user'],['half-elf'],['phb-32']),
  combo(['cleric','thief'],['half-orc'],['phb-32']),
  combo(['cleric','assassin'],['half-orc'],['phb-32']),
  combo(['fighter','magic-user'],['elf','half-elf'],['phb-33']),
  combo(['fighter','illusionist'],['gnome'],['phb-33']),
  combo(['fighter','thief'],['dwarf','elf','gnome','half-elf','halfling','half-orc'],['phb-33']),
  combo(['fighter','assassin'],['half-orc'],['phb-33']),
  combo(['fighter','magic-user','thief'],['elf','half-elf'],['phb-33']),
  combo(['magic-user','thief'],['elf','half-elf'],['phb-33']),
  combo(['illusionist','thief'],['gnome'],['phb-33']),
  combo(['fighter','illusionist','thief'],['gnome'],['phb-16']),
];

export const coreEligibilityPack = {
  id:'adnd1e-core-eligibility', version:'1.0.0', verifiedAt:'2026-10-14',
  scope:'PHB core player characters; no UA/OA, admission or full advancement certification',
  verification:'V' as CoreVerification,
  verificationMeaning:'V refers only to each listed source scope. P decisions are unresolved even when both original assertions were viewed.',
  bookFiles:{ PHB:"__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf",
    DMG:"__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf" },
  sources,races,classes,multiClassCombinations,
  scoreProcessing:{id:'phb-creation-racial-order',...ev(['phb-14','phb-15']),
    steps:['preserve-initial-scores','apply-racial-adjustments','check-racial-minima-with-bonuses','lower-to-known-racial-maxima','check-class-and-low-score-rules'],
    unknownMaximum:'needs-dm', negativeAdjustmentAtMinimum:'needs-dm',
    scope:'Initial generation only; not a permanent clamp on later age, magic or ability changes.'},
  lowAbilityRestrictions:[
    {id:'low-str',ability:'STR',maximum:5,onlyClassId:'magic-user',...ev(['phb-9'])},
    {id:'low-int',ability:'INT',maximum:5,onlyClassId:'fighter',...ev(['phb-10'])},
    {id:'low-wis',ability:'WIS',maximum:5,onlyClassId:'thief',...ev(['phb-11'])},
    {id:'low-dex',ability:'DEX',maximum:5,onlyClassId:'cleric',...ev(['phb-11'])},
    {id:'low-con',ability:'CON',maximum:5,onlyClassId:'illusionist',...ev(['phb-12'])},
    {id:'low-cha',ability:'CHA',maximum:5,onlyClassId:'assassin',...ev(['phb-13'])},
  ] as const,
  normalSingleClassCleric:{id:'normal-human-single-cleric',...ev(['phb-20']),
    human:true,nonhuman:'needs-dm',note:'PHB20 says normally only humans are single-class clerics; tableI permission is not a blanket single-class ban.'},
  npcOnlyClassLimits:[
    {id:'npc-dwarf-cleric',raceId:'dwarf',classId:'cleric',level:8,...ev(['phb-14'])},
    {id:'npc-elf-cleric',raceId:'elf',classId:'cleric',level:7,...ev(['phb-14'])},
    {id:'npc-gnome-cleric',raceId:'gnome',classId:'cleric',level:7,...ev(['phb-14'])},
    {id:'npc-halfling-druid',raceId:'halfling',classId:'druid',level:6,...ev(['phb-14'])},
  ] as const,
  combinationPolicy:{id:'phb-explicit-multiclass',...ev(['phb-16','phb-17','phb-32','phb-33']),
    humanSimultaneous:false,unlistedCoreCombination:false,subclassSubstitution:'needs-dm',
    note:'Check all component minima and intersection of alignments. No automatic druid-for-cleric or assassin-for-thief substitution.'},
  dualClass:{id:'phb-human-two-classes',...ev(['phb-33']),raceIds:['human'] as readonly CoreRaceId[],
    oldPrincipalMinimum:15,newPrincipalMinimum:17,newClassMustExceedOldLevel:true,
    originalClassProgression:false,pairPermission:'needs-dm',
    principalAbilities:[
      {classId:'cleric',abilityIds:['WIS'],...ev(['phb-20'])},
      {classId:'fighter',abilityIds:['STR'],...ev(['phb-22'])},
      {classId:'magic-user',abilityIds:['INT'],...ev(['phb-25'])},
      {classId:'thief',abilityIds:['DEX'],...ev(['phb-26'])},
    ],
    otherPrincipalAbilities:null,
    note:'Near-any combination is not a whitelist of all pairs; alignment, entry minima and subclass interpretation remain separate.'},
  bardPath:{id:'phb-bard-path',...ev(['phb-117','phb-118']),permission:'needs-dm',
    raceIds:['human','half-elf'] as readonly CoreRaceId[],freshBardEntry:false,
    fighterStage:{classId:'fighter',minimumLevel:5,maximumLevel:7,mustRemainExclusive:true},
    thiefStage:{classId:'thief',minimumLevel:5,maximumLevel:8},
    finalStage:{classId:'bard',tutelage:'druid',isOrdinaryDruidCareer:false},
    applyOrdinaryDualMinima:null,pendingIds:['bard-versus-ordinary-dual-minima'],
    note:'Special appendix path includes half-elves and neutral-axis alignments. Do not apply human-only dual-class or ordinary TN-druid restrictions automatically.'},
  campaignChoices:[
    {id:'campaign-core-races',kind:'book-authorized-dm-option',permission:'needs-dm',...ev(['phb-13']),note:'DM may restrict listed races for the campaign milieu.'},
    {id:'campaign-bard',kind:'book-authorized-dm-option',permission:'needs-dm',...ev(['phb-117']),note:'Appendix bard inclusion is decided by the DM.'},
    {id:'campaign-monster-pc',kind:'book-authorized-dm-discretion',permission:'needs-dm',...ev(['dmg-21']),note:'No monster PC eligibility data supplied here.'},
  ],
  pendingRules:[
    {id:'half-orc-dex-maximum',...ev(['phb-11','phb-15'],'P'),resolution:'needs-dm',value:null,
      issue:'Dexterity TableI says14; Race TableIII says17. Both assertions visually checked; no erratum verified.',
      alternatives:[{value:14,sourceIds:['phb-11'],meaning:'Dexterity general information'}, {value:17,sourceIds:['phb-15'],meaning:'Race TableIII both sexes'}]},
    {id:'assassin-intrinsic-maximum',...ev(['phb-19','phb-30'],'P'),resolution:'needs-dm',value:null,
      issue:'Summary maximum14 conflicts with the level15 table and explicit Grandfather challenge.',
      alternatives:[{value:14,sourceIds:['phb-19'],meaning:'Summary intrinsic limit'}, {value:15,sourceIds:['phb-30'],meaning:'Detailed table and prose'}]},
    {id:'halfling-exceptional-origin',...ev(['phb-14','phb-15'],'P'),resolution:'needs-dm',value:null,
      issue:'Race maximumSTR17 coexists with footnote outcomes for stout/tallfellow STR18 obtained somehow. Creation must not synthesize18.',alternatives:[]},
    {id:'gnome-illusionist-mixed-17-18',...ev(['phb-14'],'P'),resolution:'needs-dm',value:null,
      issue:'Footnote8 explicitly addresses either below17 and both17; mixed17/18 not separately stated. Do not silently choose6 or7.',alternatives:[]},
    {id:'bard-versus-ordinary-dual-minima',...ev(['phb-33','phb-117'],'P'),resolution:'needs-dm',value:null,
      issue:'Special bard path versus ordinary17 new-principal gate, half-elf exception and neutrality; do not silently combine.',alternatives:[]},
    {id:'other-dual-principal-abilities',...ev(['phb-33'],'P'),resolution:'needs-dm',value:null,
      issue:'Principal attribute mapping for subclasses/assassin/monk/bard not fully certified by this pack.',alternatives:[]},
    {id:'racial-negative-at-minimum',...ev(['phb-15'],'P'),resolution:'needs-dm',value:null,
      issue:'Opening says minimum generated or considering bonuses; table notes say racial changes precede max adjustment. Marginal penalty cases need an adopted reading.',alternatives:[]},
  ] satisfies readonly CorePendingRule[],
} as const;
