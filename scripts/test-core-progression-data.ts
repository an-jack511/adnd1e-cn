import assert from 'node:assert/strict';
import {
  coreProgressionPack as pack, coreClassIds, getCoreProgressionRow,
  type CoreClassId, type ProgressionRow,
} from '../src/character/rules/core-progression';

// Independent manual boundary fixtures from PHB page images, NOT JSON imports,
// NOT generated from the pack, and NOT expectations computed by a rules engine.
// [level, XP min, XP max, total HD, new HD, sides, total fixed HP, new fixed HP]
type Golden = readonly [number, number, number | null, number, number, number, number, number];
const gold: Record<CoreClassId, readonly Golden[]> = {
  cleric: [
    [1,0,1500,1,1,8,0,0], [2,1501,3000,2,1,8,0,0],
    [9,225001,450000,9,1,8,0,0], [10,450001,675000,9,0,8,2,2], [11,675001,900000,9,0,8,4,2],
  ],
  druid: [
    [1,0,2000,1,1,8,0,0], [2,2001,4000,2,1,8,0,0],
    [12,300001,750000,12,1,8,0,0], [13,750001,1500000,13,1,8,0,0], [14,1500001,null,14,1,8,0,0],
  ],
  fighter: [
    [1,0,2000,1,1,10,0,0], [2,2001,4000,2,1,10,0,0],
    [9,250001,500000,9,1,10,0,0], [10,500001,750000,9,0,10,3,3], [11,750001,1000000,9,0,10,6,3],
  ],
  paladin: [
    [1,0,2750,1,1,10,0,0], [2,2751,5500,2,1,10,0,0],
    [9,350001,700000,9,1,10,0,0], [10,700001,1050000,9,0,10,3,3], [11,1050001,1400000,9,0,10,6,3],
  ],
  ranger: [
    [1,0,2250,2,2,8,0,0], [2,2251,4500,3,1,8,0,0],
    [10,325001,650000,11,1,8,0,0], [11,650001,975000,11,0,8,2,2], [12,975001,1300000,11,0,8,4,2],
  ],
  'magic-user': [
    [1,0,2500,1,1,4,0,0], [2,2501,5000,2,1,4,0,0],
    [11,375001,750000,11,1,4,0,0], [12,750001,1125000,11,0,4,1,1],
    [13,1125001,1500000,11,0,4,2,1], [18,3000001,3375000,11,0,4,7,1],
  ],
  illusionist: [
    [1,0,2250,1,1,4,0,0], [2,2251,4500,2,1,4,0,0],
    [10,220001,440000,10,1,4,0,0], [11,440001,660000,10,0,4,1,1], [12,660001,880000,10,0,4,2,1],
  ],
  thief: [
    [1,0,1250,1,1,6,0,0], [2,1251,2500,2,1,6,0,0],
    [10,160001,220000,10,1,6,0,0], [11,220001,440000,10,0,6,2,2], [12,440001,660000,10,0,6,4,2],
  ],
  assassin: [
    [1,0,1500,1,1,6,0,0], [2,1501,3000,2,1,6,0,0],
    [13,750001,1000000,13,1,6,0,0], [14,1000001,1500000,14,1,6,0,0], [15,1500001,null,15,1,6,0,0],
  ],
  monk: [
    [1,0,2250,2,2,4,0,0], [2,2251,4750,3,1,4,0,0],
    [7,98001,200000,8,1,4,0,0], [8,200001,350000,9,1,4,0,0],
    [16,2750001,3250000,17,1,4,0,0], [17,3250001,null,18,1,4,0,0],
  ],
  bard: [
    [1,0,2000,0,0,6,0,0], [2,2001,4000,1,1,6,0,0],
    [11,150001,200000,10,1,6,0,0], [12,200001,400000,10,0,6,1,1],
    [21,2000001,2200000,10,0,6,10,1], [22,2200001,3000000,10,0,6,11,1], [23,3000001,null,10,0,6,12,1],
  ],
};

// All XP lower bounds were separately reread from the page images. This guards
// transcription errors in interior rows as well as the selected HP boundaries.
const xpGold: Record<CoreClassId, readonly number[]> = {
  cleric:[0,1501,3001,6001,13001,27501,55001,110001,225001,450001,675001],
  druid:[0,2001,4001,7501,12501,20001,35001,60001,90001,125001,200001,300001,750001,1500001],
  fighter:[0,2001,4001,8001,18001,35001,70001,125001,250001,500001,750001],
  paladin:[0,2751,5501,12001,24001,45001,95001,175001,350001,700001,1050001],
  ranger:[0,2251,4501,10001,20001,40001,90001,150001,225001,325001,650001,975001],
  'magic-user':[0,2501,5001,10001,22501,40001,60001,90001,135001,250001,375001,750001,1125001,1500001,1875001,2250001,2625001,3000001],
  illusionist:[0,2251,4501,9001,18001,35001,60001,95001,145001,220001,440001,660001],
  thief:[0,1251,2501,5001,10001,20001,42501,70001,110001,160001,220001,440001],
  assassin:[0,1501,3001,6001,12001,25001,50001,100001,200001,300001,425001,575001,750001,1000001,1500001],
  monk:[0,2251,4751,10001,22501,47501,98001,200001,350001,500001,700001,950001,1250001,1750001,2250001,2750001,3250001],
  bard:[0,2001,4001,8001,16001,25001,40001,60001,85001,110001,150001,200001,400001,600001,800001,1000001,1200001,1400001,1600001,1800001,2000001,2200001,3000001],
};

const allTables = [...Object.values(pack.classes), pack.paths.bard.progression];
assert.equal(pack.version, '1.0.0');
assert.equal(pack.verified, true);
assert.equal(pack.status, 'verified-printed-tables-with-open-issues');
assert.deepEqual([...coreClassIds].sort(), Object.keys(gold).sort());
assert.equal(allTables.length, 11);
assert.equal(new Set(allTables.map(t => t.id)).size, 11);
assert.equal('bard' in pack.classes, false);
assert.equal(Object.keys(pack.classes).length, 10);

let goldenCases = 0;
let tableRows = 0;
for (const t of allTables) {
  assert.equal(t.status, 'verified');
  assert.equal(t.verified, true);
  assert.deepEqual(t.rows.map(r => r.xpMin), xpGold[t.id], `${t.id}: all printed XP minima`);
  assert.equal(t.continuation.autoExpand, false);
  assert.equal(t.beyondPrintedRows.status, 'unknown');
  assert.equal(t.beyondPrintedRows.blocksAutomaticCalculation, true);
  const unknown = getCoreProgressionRow(t.id, t.rows.length + 1);
  assert.equal(unknown.status, 'unknown', `${t.id}: no extrapolated row`);
  if (unknown.status === 'unknown') assert.equal(unknown.blocksAutomaticCalculation, true);

  for (const fixture of gold[t.id]) {
    const [level,xpMin,xpMax,totalHD,newHD,sides,totalFixed,newFixed] = fixture;
    const result = getCoreProgressionRow(t.id, level);
    assert.notEqual(result.status, 'unknown');
    if (result.status === 'unknown') throw new Error(`${t.id}/${level} missing`);
    const r = result.row;
    assert.deepEqual(
      [r.level,r.xpMin,r.xpMax,r.hitDiceTotal,r.hitDiceGained,r.hitDieSides,r.fixedHpTotal,r.fixedHpGained],
      fixture, `${t.id}/${level}: independent manual golden boundary`,
    );
    assert.equal(r.conEligibleHitDice, newHD, `${t.id}/${level}: PHB12 each new HD`);
    assert.equal(r.conScope, newHD > 0 ? 'new-hit-dice-only' : 'no-new-hit-dice');
    assert.equal(r.verified, true);
    assert.ok(r.citationIds.length > 0);
    // Numeric XP interval checks are data checks, not actual level-award simulation.
    const at = (xp:number):ProgressionRow|undefined => t.rows.find(row => xp >= row.xpMin && (row.xpMax === null || xp <= row.xpMax));
    assert.equal(at(xpMin)?.level, level);
    if (level > 1) assert.equal(at(xpMin-1)?.level, level-1);
    if (xpMax !== null) assert.equal(at(xpMax)?.level, level);
    if (xpMax !== null && level < t.rows.length) assert.equal(at(xpMax+1)?.level, level+1);
    // The fixtures retain all fields even where the derived gain is zero.
    assert.ok(totalHD >= 0 && sides >= 4 && totalFixed >= 0 && newFixed >= 0);
    goldenCases++;
  }
  for (const [i,r] of t.rows.entries()) {
    tableRows++;
    assert.equal(r.level, i+1);
    assert.ok(Number.isSafeInteger(r.xpMin));
    assert.ok(r.xpMin >= 0 && r.fixedHpGained >= 0 && r.hitDiceGained >= 0);
    if (r.xpMax === null) assert.equal(i, t.rows.length-1);
    else assert.ok(Number.isSafeInteger(r.xpMax) && r.xpMax >= r.xpMin);
    if (i > 0) {
      const previous = t.rows[i-1];
      assert.equal(previous.xpMax!+1, r.xpMin, `${t.id}: contiguous inclusive intervals`);
      assert.equal(previous.hitDiceTotal+r.hitDiceGained, r.hitDiceTotal);
      assert.equal(previous.fixedHpTotal+r.fixedHpGained, r.fixedHpTotal);
    }
    for (const id of r.citationIds) {
      const c = pack.citations[id];
      assert.ok(c, `missing citation ${id}`);
      assert.equal(c.verified, true);
      assert.equal(c.verification, 'page-image-and-embedded-text');
      assert.equal(c.ocrFile, null);
      assert.deepEqual(c.pdfPages, c.printedPages.map(p => p+1));
      assert.deepEqual(c.pdfIndices0, c.pdfPages.map(p => p-1));
    }
  }
}
assert.equal(tableRows, 156);

// Seven fixed-HP transitions and the actual table continuation footnotes.
const fixedNotes = [
  ['cleric',9,10,2,11,225000], ['fighter',9,10,3,11,250000],
  ['paladin',9,10,3,11,350000], ['ranger',10,11,2,12,325000],
  ['magic-user',11,12,1,18,375000], ['illusionist',10,11,1,12,220000],
  ['thief',10,11,2,12,220000],
] as const;
for (const [id,lastHD,firstFixed,fixed,after,xpStep] of fixedNotes) {
  const t = pack.classes[id];
  assert.ok(t.rows[lastHD-1].hitDiceGained > 0);
  assert.equal(t.rows[firstFixed-1].hitDiceGained, 0);
  assert.equal(t.rows[firstFixed-1].fixedHpGained, fixed);
  assert.equal(t.rows[firstFixed-1].conEligibleHitDice, 0);
  assert.equal(t.continuation.status, 'verified-rule-not-expanded');
  assert.equal(t.continuation.afterLevel, after);
  assert.equal(t.continuation.xpStep, xpStep);
  assert.equal(t.continuation.fixedHpPerLevel, fixed);
}
for (const id of ['druid','assassin','monk'] as const) {
  assert.equal(pack.classes[id].rows.some(r => r.fixedHpGained > 0), false, `${id}: no invented fixed-HP phase`);
}

assert.equal(pack.classes.ranger.rows[0].conEligibleHitDice, 2);
assert.equal(pack.classes.monk.rows[0].conEligibleHitDice, 2);
assert.equal(pack.classes.monk.rows[16].hitDiceTotal, 18);
assert.equal(pack.classes.druid.rows.length, 14);
assert.equal(pack.classes.monk.rows.length, 17);
assert.equal(pack.classes.assassin.rows.length, 15);
assert.equal(getCoreProgressionRow('assassin',15).status, 'needs-dm');
const assassinConflict = pack.classes.assassin.advancementGates.find(g => g.kind === 'source-conflict');
assert.deepEqual(assassinConflict?.citationIds, ['phb:19:classes','phb:30:assassin']);
assert.equal(pack.classes.druid.advancementGates[0].fromLevel, 12);
assert.equal(pack.classes.monk.advancementGates[0].fromLevel, 8);
assert.equal(pack.classes.assassin.advancementGates[0].fromLevel, 14);

const bard = pack.paths.bard;
assert.equal(bard.initialSelectable, false);
assert.equal(bard.campaignPermissionRequired, true);
assert.equal(bard.entryMode, 'staged-bard-path');
assert.deepEqual(bard.stages.slice(0,2), [
  {classId:'fighter',minExitLevel:5,maxExitLevel:7},
  {classId:'thief',minExitLevel:5,maxExitLevel:8},
]);
assert.match(bard.xpScope, /bard-only/);
assert.match(bard.firstLevelAsterisk, /not zero character HP/);
assert.match(bard.retainedHp, /retain fighter HP/);
assert.equal(bard.progression.hpBasis, 'bard-additions-to-retained-history');
assert.equal(bard.progression.rows[0].hitDiceGained, 0);
assert.equal(bard.progression.rows[1].hitDiceGained, 1);
assert.equal(bard.progression.rows[10].hitDiceTotal, 10);
assert.equal(bard.progression.rows[11].fixedHpGained, 1);
assert.equal(bard.progression.rows[11].conEligibleHitDice, 0);
assert.equal(bard.progression.rows.length, 23);
assert.equal(bard.progression.continuation.status, 'not-applicable');

// PHB12 column and footnote, including monk ordinary CON and double-HD scope.
assert.deepEqual(pack.constitution.ordinaryAdjustment, {3:-2,4:-1,5:-1,6:-1,7:0,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:1,16:2,17:2,18:2});
assert.equal(pack.constitution.fighterAdjustment[17], 3);
assert.equal(pack.constitution.fighterAdjustment[18], 4);
assert.deepEqual(pack.constitution.fighterCareerIds, ['fighter','paladin','ranger']);
assert.equal(pack.constitution.minimumAdjustedHpPerDie, 1);
assert.equal(pack.constitution.fixedHpAdjustment, 0);
for (const t of allTables) {
  assert.equal(t.constitution.maxBonusPerHitDie, ['fighter','paladin','ranger'].includes(t.id) ? 4 : 2);
  assert.equal(t.constitution.fixedHpAdjustment, 0);
}
assert.equal(pack.constitution.outsideScoreRange.status, 'unknown');
assert.equal(pack.constitution.outsideScoreRange.blocksAutomaticCalculation, true);
for (const unresolved of Object.values(pack.unresolved)) {
  assert.equal(unresolved.status, 'unknown');
  assert.equal(unresolved.blocksAutomaticCalculation, true);
}
assert.equal(pack.unresolved.attackMatrices.data, null);
assert.equal(pack.unresolved.savingThrowMatrices.data, null);
for (const id of ['bard-ish','__proto__','constructor','']) assert.equal(getCoreProgressionRow(id,1).status, 'unknown');
for (const level of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.equal(getCoreProgressionRow('fighter',level).status, 'unknown');

console.log(`PASS: 11 careers, ${tableRows} explicit rows, ${goldenCases} independent HP/XP golden boundaries, all XP minima, footnotes, CON scope, Bard path, source conflict and unknown-data guards. Data verification only; no full-site build or lifecycle certification.`);
