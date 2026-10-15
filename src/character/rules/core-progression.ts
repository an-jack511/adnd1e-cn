/** PHB 1e printed tables, independently checked against this local scan's page images.
 * This is progression DATA, not an eligibility, XP-award, training or HP engine.
 * No runtime import of public/class-tables.json and no inferred high-level rows.
 */
export const coreClassIds = [
  'cleric', 'druid', 'fighter', 'paladin', 'ranger', 'magic-user',
  'illusionist', 'thief', 'assassin', 'monk', 'bard',
] as const;
export type CoreClassId = typeof coreClassIds[number];
export type InitialCoreClassId = Exclude<CoreClassId, 'bard'>;
export type CitationId = keyof typeof citations;

const phbSource = {
  book: 'PHB',
  sourceFile: "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf",
  sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
  verification: 'page-image-and-embedded-text',
  verified: true,
  ocrFile: null,
  ocrStatus: 'no-independent-ocr-file; embedded recognition text is not page-image evidence',
} as const;

function source(printedPages: readonly number[], section: string) {
  return Object.freeze({
    ...phbSource, printedPages: Object.freeze([...printedPages]),
    pdfPages: Object.freeze(printedPages.map(page => page + 1)),
    pdfIndices0: Object.freeze([...printedPages]), section,
  });
}

const citations = {
  'phb:12:constitution': source([12], 'Constitution Table; Hit Point Adjustment; fighter-only asterisk'),
  'phb:19:classes': source([19], 'Character Classes Table I; ranger/monk two-dice footnote; level limits'),
  'phb:20:cleric': source([20], 'Clerics Table I; +2 HP after 9; +225000 XP beyond 11'),
  'phb:21:druid': source([21], 'Druids (Clerics) Table I; limited upper-level positions'),
  'phb:22:fighter': source([22], 'Fighters Table; +3 HP after 9; +250000 XP beyond 11'),
  'phb:24:paladin': source([24], 'Paladins (Fighters) Table I; +3 HP after 9; +350000 XP above 11'),
  'phb:24-25:ranger': source([24, 25], 'Ranger first-level 2d8; Rangers Table I; +2 HP after 10; +325000 XP above 12'),
  'phb:25-26:magic-user': source([25, 26], 'Magic-Users Table I across both pages; +1 HP after 11; +375000 XP beyond 18'),
  'phb:26:illusionist': source([26], 'Illusionists Table I; +1 HP after 10; +220000 XP beyond 12'),
  'phb:27:thief': source([27], 'Thieves Table I; +2 HP after 10; +220000 XP beyond 12'),
  'phb:30:assassin': source([30], 'Assassins (Thieves) Table through 15; Guildmaster/Grandfather advancement requirements'),
  'phb:30-32:monk': source([30, 31, 32], 'Monks Table I; 18d4 at 17; restricted upper-level positions and combat'),
  'phb:117-118:bard': source([117, 118], 'Appendix II; Bards Table I; 0* retained HP, bard-only XP, maximum level 23'),
} as const;

export interface ProgressionRow {
  readonly level: number;
  /** Inclusive printed lower bound: e.g. fighter level 2 starts at 2001, not 2000. */
  readonly xpMin: number;
  /** null means no printed upper bound on this last row; NOT a further level. */
  readonly xpMax: number | null;
  /** Cumulative career dice, or Bard-only additions to pre-existing dice. */
  readonly hitDiceTotal: number;
  /** New dice at this level, obtained by subtraction of the two printed totals. */
  readonly hitDiceGained: number;
  readonly hitDieSides: 4 | 6 | 8 | 10;
  readonly fixedHpTotal: number;
  readonly fixedHpGained: number;
  /** PHB12 adjusts each HD; fixed increments do not create CON-eligible dice. */
  readonly conEligibleHitDice: number;
  readonly conScope: 'new-hit-dice-only' | 'no-new-hit-dice';
  readonly verified: true;
  readonly status: 'verified';
  readonly citationIds: readonly CitationId[];
}

export interface ProgressionTable {
  readonly id: CoreClassId;
  readonly verified: true;
  readonly status: 'verified';
  readonly verificationScope: 'printed-xp-hd-fixed-hp-rows; not automatic level awards';
  readonly entryMode: 'initial-class' | 'staged-bard-path';
  readonly hpBasis: 'career-cumulative' | 'bard-additions-to-retained-history';
  readonly rows: readonly ProgressionRow[];
  readonly citationIds: readonly CitationId[];
  readonly constitution: {
    readonly maxBonusPerHitDie: 2 | 4;
    readonly eligibleScope: 'new-hit-dice-only';
    readonly fixedHpAdjustment: 0;
    readonly citationIds: readonly CitationId[];
  };
  readonly continuation: {
    readonly status: 'verified-rule-not-expanded' | 'not-applicable' | 'unknown';
    readonly afterLevel: number;
    readonly xpStep: number | null;
    readonly fixedHpPerLevel: number | null;
    readonly autoExpand: false;
    readonly citationIds: readonly CitationId[];
  };
  readonly advancementGates: readonly {
    readonly fromLevel: number;
    readonly kind: 'limited-position' | 'challenge' | 'source-conflict';
    readonly status: 'needs-dm';
    readonly note: string;
    readonly citationIds: readonly CitationId[];
  }[];
  readonly beyondPrintedRows: { readonly status: 'unknown'; readonly blocksAutomaticCalculation: true };
}

// Each tuple was transcribed from the page image: xpMin, xpMax, cumulative HD, cumulative fixed HP.
// The helper only normalizes existing rows; it never creates an unprinted level.
type PrintedRow = readonly [number, number | null, number, number];
function table(
  id: CoreClassId, sides: ProgressionRow['hitDieSides'], maxCon: 2 | 4,
  citationIds: readonly CitationId[], printed: readonly PrintedRow[],
  continuation: ProgressionTable['continuation'],
  advancementGates: ProgressionTable['advancementGates'] = [],
): ProgressionTable {
  const bard = id === 'bard';
  const rows = printed.map(([xpMin, xpMax, hitDiceTotal, fixedHpTotal], i): ProgressionRow => {
    const hitDiceGained = hitDiceTotal - (i === 0 ? 0 : printed[i - 1][2]);
    const fixedHpGained = fixedHpTotal - (i === 0 ? 0 : printed[i - 1][3]);
    return Object.freeze({
      level: i + 1, xpMin, xpMax, hitDiceTotal, hitDiceGained, hitDieSides: sides,
      fixedHpTotal, fixedHpGained, conEligibleHitDice: hitDiceGained,
      conScope: hitDiceGained > 0 ? 'new-hit-dice-only' : 'no-new-hit-dice',
      verified: true, status: 'verified',
      citationIds: Object.freeze([...citationIds, 'phb:12:constitution' as const]),
    });
  });
  return Object.freeze({
    id, verified: true, status: 'verified',
    verificationScope: 'printed-xp-hd-fixed-hp-rows; not automatic level awards',
    entryMode: bard ? 'staged-bard-path' : 'initial-class',
    hpBasis: bard ? 'bard-additions-to-retained-history' : 'career-cumulative',
    rows: Object.freeze(rows), citationIds: Object.freeze([...citationIds]),
    constitution: Object.freeze({
      maxBonusPerHitDie: maxCon, eligibleScope: 'new-hit-dice-only', fixedHpAdjustment: 0,
      citationIds: Object.freeze(['phb:12:constitution'] as const),
    }),
    continuation: Object.freeze(continuation), advancementGates: Object.freeze([...advancementGates]),
    beyondPrintedRows: Object.freeze({ status: 'unknown', blocksAutomaticCalculation: true }),
  });
}

function continuation(afterLevel: number, xpStep: number, fixedHpPerLevel: number, citationId: CitationId): ProgressionTable['continuation'] {
  return { status: 'verified-rule-not-expanded', afterLevel, xpStep, fixedHpPerLevel,
    autoExpand: false, citationIds: [citationId] };
}
function terminal(afterLevel: number, citationId: CitationId): ProgressionTable['continuation'] {
  return { status: 'not-applicable', afterLevel, xpStep: null, fixedHpPerLevel: null,
    autoExpand: false, citationIds: [citationId] };
}

const cleric = table('cleric', 8, 2, ['phb:20:cleric'], [
  [0,1500,1,0], [1501,3000,2,0], [3001,6000,3,0], [6001,13000,4,0],
  [13001,27500,5,0], [27501,55000,6,0], [55001,110000,7,0],
  [110001,225000,8,0], [225001,450000,9,0], [450001,675000,9,2], [675001,900000,9,4],
], continuation(11,225000,2,'phb:20:cleric'));

const druid = table('druid', 8, 2, ['phb:21:druid','phb:19:classes'], [
  [0,2000,1,0], [2001,4000,2,0], [4001,7500,3,0], [7501,12500,4,0],
  [12501,20000,5,0], [20001,35000,6,0], [35001,60000,7,0], [60001,90000,8,0],
  [90001,125000,9,0], [125001,200000,10,0], [200001,300000,11,0],
  [300001,750000,12,0], [750001,1500000,13,0], [1500001,null,14,0],
], terminal(14,'phb:19:classes'), [{fromLevel:12,kind:'limited-position',status:'needs-dm',
  note:'Nine Druids, three Archdruids, one Great Druid; vacancy or required contest, not XP alone.',citationIds:['phb:21:druid']}]);

const fighter = table('fighter', 10, 4, ['phb:22:fighter'], [
  [0,2000,1,0], [2001,4000,2,0], [4001,8000,3,0], [8001,18000,4,0],
  [18001,35000,5,0], [35001,70000,6,0], [70001,125000,7,0], [125001,250000,8,0],
  [250001,500000,9,0], [500001,750000,9,3], [750001,1000000,9,6],
], continuation(11,250000,3,'phb:22:fighter'));

const paladin = table('paladin', 10, 4, ['phb:24:paladin'], [
  [0,2750,1,0], [2751,5500,2,0], [5501,12000,3,0], [12001,24000,4,0],
  [24001,45000,5,0], [45001,95000,6,0], [95001,175000,7,0], [175001,350000,8,0],
  [350001,700000,9,0], [700001,1050000,9,3], [1050001,1400000,9,6],
], continuation(11,350000,3,'phb:24:paladin'));

const ranger = table('ranger', 8, 4, ['phb:24-25:ranger','phb:19:classes'], [
  [0,2250,2,0], [2251,4500,3,0], [4501,10000,4,0], [10001,20000,5,0],
  [20001,40000,6,0], [40001,90000,7,0], [90001,150000,8,0], [150001,225000,9,0],
  [225001,325000,10,0], [325001,650000,11,0], [650001,975000,11,2], [975001,1300000,11,4],
], continuation(12,325000,2,'phb:24-25:ranger'));

const magicUser = table('magic-user', 4, 2, ['phb:25-26:magic-user'], [
  [0,2500,1,0], [2501,5000,2,0], [5001,10000,3,0], [10001,22500,4,0],
  [22501,40000,5,0], [40001,60000,6,0], [60001,90000,7,0], [90001,135000,8,0],
  [135001,250000,9,0], [250001,375000,10,0], [375001,750000,11,0],
  [750001,1125000,11,1], [1125001,1500000,11,2], [1500001,1875000,11,3],
  [1875001,2250000,11,4], [2250001,2625000,11,5], [2625001,3000000,11,6], [3000001,3375000,11,7],
], continuation(18,375000,1,'phb:25-26:magic-user'));

const illusionist = table('illusionist', 4, 2, ['phb:26:illusionist'], [
  [0,2250,1,0], [2251,4500,2,0], [4501,9000,3,0], [9001,18000,4,0],
  [18001,35000,5,0], [35001,60000,6,0], [60001,95000,7,0], [95001,145000,8,0],
  [145001,220000,9,0], [220001,440000,10,0], [440001,660000,10,1], [660001,880000,10,2],
], continuation(12,220000,1,'phb:26:illusionist'));

const thief = table('thief', 6, 2, ['phb:27:thief'], [
  [0,1250,1,0], [1251,2500,2,0], [2501,5000,3,0], [5001,10000,4,0],
  [10001,20000,5,0], [20001,42500,6,0], [42501,70000,7,0], [70001,110000,8,0],
  [110001,160000,9,0], [160001,220000,10,0], [220001,440000,10,2], [440001,660000,10,4],
], continuation(12,220000,2,'phb:27:thief'));

const assassin = table('assassin', 6, 2, ['phb:30:assassin'], [
  [0,1500,1,0], [1501,3000,2,0], [3001,6000,3,0], [6001,12000,4,0],
  [12001,25000,5,0], [25001,50000,6,0], [50001,100000,7,0], [100001,200000,8,0],
  [200001,300000,9,0], [300001,425000,10,0], [425001,575000,11,0],
  [575001,750000,12,0], [750001,1000000,13,0], [1000001,1500000,14,0], [1500001,null,15,0],
], {status:'unknown',afterLevel:15,xpStep:null,fixedHpPerLevel:null,autoExpand:false,citationIds:['phb:19:classes','phb:30:assassin']}, [
  {fromLevel:14,kind:'challenge',status:'needs-dm',note:'Guildmaster and Grandfather require the stated assassination/duel conditions.',citationIds:['phb:30:assassin']},
  {fromLevel:15,kind:'source-conflict',status:'needs-dm',note:'PHB19 says limit 14 (Master of Assassins); PHB30 explicitly prints level 15 and its advancement. Keep both; no silent correction.',citationIds:['phb:19:classes','phb:30:assassin']},
]);

const monk = table('monk', 4, 2, ['phb:30-32:monk','phb:19:classes'], [
  [0,2250,2,0], [2251,4750,3,0], [4751,10000,4,0], [10001,22500,5,0],
  [22501,47500,6,0], [47501,98000,7,0], [98001,200000,8,0], [200001,350000,9,0],
  [350001,500000,10,0], [500001,700000,11,0], [700001,950000,12,0],
  [950001,1250000,13,0], [1250001,1750000,14,0], [1750001,2250000,15,0],
  [2250001,2750000,16,0], [2750001,3250000,17,0], [3250001,null,18,0],
], terminal(17,'phb:19:classes'), [{fromLevel:8,kind:'challenge',status:'needs-dm',
  note:'Limited upper-level monks; hand-to-hand contest without weapons or magic items. XP eligibility is not permanent level award.',citationIds:['phb:30-32:monk']}]);

const bardProgression = table('bard', 6, 2, ['phb:117-118:bard'], [
  [0,2000,0,0], [2001,4000,1,0], [4001,8000,2,0], [8001,16000,3,0],
  [16001,25000,4,0], [25001,40000,5,0], [40001,60000,6,0], [60001,85000,7,0],
  [85001,110000,8,0], [110001,150000,9,0], [150001,200000,10,0],
  [200001,400000,10,1], [400001,600000,10,2], [600001,800000,10,3],
  [800001,1000000,10,4], [1000001,1200000,10,5], [1200001,1400000,10,6],
  [1400001,1600000,10,7], [1600001,1800000,10,8], [1800001,2000000,10,9],
  [2000001,2200000,10,10], [2200001,3000000,10,11], [3000001,null,10,12],
], terminal(23,'phb:117-118:bard'));

/** Includes only the ten careers that have their own normal starting progression.
 * Initial-class membership is not race, attribute or campaign eligibility approval.
 */
const classes: Readonly<Record<InitialCoreClassId, ProgressionTable>> = Object.freeze({
  cleric, druid, fighter, paladin, ranger, 'magic-user': magicUser, illusionist, thief, assassin, monk,
});

export const coreProgressionPack = Object.freeze({
  id: 'adnd1e:phb:core-progression', version: '1.0.0', verifiedAt: '2026-10-14',
  verified: true, status: 'verified-printed-tables-with-open-issues',
  verificationScope: 'XP/HD/fixed-HP tables and their cited notes; not full character legality or lifecycle',
  citations: Object.freeze(citations), coreClassIds, classes,
  paths: Object.freeze({
    bard: Object.freeze({
      id: 'bard', pathId: 'phb:bard:fighter-thief-druid-tutelage',
      entryMode: 'staged-bard-path', initialSelectable: false, campaignPermissionRequired: true,
      stages: Object.freeze([
        {classId:'fighter',minExitLevel:5,maxExitLevel:7},
        {classId:'thief',minExitLevel:5,maxExitLevel:8},
        {classId:'bard',study:'druid-tutelage; actual career is bard, not a separate druid XP track'},
      ] as const),
      xpScope: 'bard-only; exclude all previously earned fighter/thief XP',
      retainedHp: 'retain fighter HP and any thief HP earned after thief exceeded fighter; bard rows add to that history',
      firstLevelAsterisk: '0* is zero NEW bard dice, not zero character HP; no dice are lost on entry',
      citationIds: Object.freeze(['phb:117-118:bard'] as const), progression: bardProgression,
    }),
  }),
  constitution: Object.freeze({
    status: 'verified', verified: true, scoreMin: 3, scoreMax: 18,
    ordinaryAdjustment: Object.freeze({3:-2,4:-1,5:-1,6:-1,7:0,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:1,16:2,17:2,18:2}),
    fighterAdjustment: Object.freeze({3:-2,4:-1,5:-1,6:-1,7:0,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:1,16:2,17:3,18:4}),
    fighterCareerIds: Object.freeze(['fighter','paladin','ranger'] as const),
    minimumAdjustedHpPerDie: 1, fixedHpAdjustment: 0,
    application: 'each newly gained HD; no new CON adjustment on fixed HP; do not recompute historical awards here',
    derivation: 'PHB12 says each hit die; fixed-HP rows retain HD total and therefore add no eligible dice',
    outsideScoreRange: Object.freeze({status:'unknown',blocksAutomaticCalculation:true}),
    citationIds: Object.freeze(['phb:12:constitution'] as const),
  }),
  unresolved: Object.freeze({
    multiclassAsyncHpAndCon: {status:'unknown',blocksAutomaticCalculation:true,reason:'Batch boundaries and mixed fighter CON attribution are not closed by these single-career tables.'},
    multiclassTrainingXpScope: {status:'unknown',blocksAutomaticCalculation:true,reason:'Whole-character versus per-career pending-training XP requires an adopted interpretation.'},
    attackMatrices: {status:'unknown',blocksAutomaticCalculation:true,data:null,expectedSource:'DMG74-75; complete matrices, repeated 20s and notes require separate verification.'},
    savingThrowMatrices: {status:'unknown',blocksAutomaticCalculation:true,data:null,expectedSource:'DMG79-81; full matrices and multiclass/bard/context notes require separate verification.'},
  }),
} as const);

export type ProgressionLookup =
  | {readonly status:'verified';readonly row:ProgressionRow}
  | {readonly status:'needs-dm';readonly row:ProgressionRow;readonly reason:string}
  | {readonly status:'unknown';readonly blocksAutomaticCalculation:true;readonly reason:string};

/** Explicit-row lookup only. Never extrapolates, clamps, or converts XP into a granted level. */
export function getCoreProgressionRow(classId: string, level: number): ProgressionLookup {
  if (!Number.isSafeInteger(level) || level < 1) {
    return {status:'unknown',blocksAutomaticCalculation:true,reason:'Invalid level; no coercion or default to level 1.'};
  }
  if (!(coreClassIds as readonly string[]).includes(classId)) {
    return {status:'unknown',blocksAutomaticCalculation:true,reason:'Unknown core career ID.'};
  }
  const progression = classId === 'bard' ? bardProgression : classes[classId as InitialCoreClassId];
  const row = progression.rows.find(candidate => candidate.level === level);
  if (!row) {
    return {status:'unknown',blocksAutomaticCalculation:true,reason:'No verified explicit row at this level; continuation notes are not expanded.'};
  }
  const conflict = progression.advancementGates.find(gate => gate.kind === 'source-conflict' && level >= gate.fromLevel);
  if (conflict) return {status:'needs-dm',row,reason:conflict.note};
  return {status:'verified',row};
}
