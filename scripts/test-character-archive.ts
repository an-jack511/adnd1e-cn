import assert from 'node:assert/strict';
import { ARCHIVE_LIMITS, inspectArchive, exportOriginalText, exportOriginalBytes } from '../src/character/interchange/archive';
import { archiveDiagnosticRows } from '../src/character/ui/import-controller';

// Fixed example-fighter-v1.1 snapshot: test fixture stays inside the repository.
const fixture = JSON.stringify({"format":"adnd1e-character","schemaVersion":"1.1.0","document":{"id":"example-export-v11","characterId":"example-human-fighter-001","revision":2,"parentRevision":1,"branchId":"main","exportedAt":"2026-10-14T14:00:00+08:00","view":"player","archiveGuarantee":"checkpoint-and-audit"},"rules":{"engineContractVersion":"1.0.0","profileId":"core-example","profileRevision":1,"packs":[{"id":"adnd1e.phb-dmg-mm","version":"research-candidate-1","digest":"unsealed-example-not-release"}],"options":{"abilityGeneration":"DMG:I","training":"DMG","psionics":"not-evaluated"},"decisions":[{"id":"example-admission","ruleId":"campaign.admission","choice":"accepted","reason":"虚构示例DM认可背景、年龄、语言和入场；不声称真实DM审批。","actorId":"example-dm","sourceIds":["phb34"]}],"sources":[{"id":"dmg11","book":"DMG","printing":"local TSR 1e scan; see source manifest","printedPages":[11],"pdfPages":[12],"section":"Generation of Ability Scores","status":"verified-text","locator":"local:DMG:printed:11","verificationScope":"Generation of Ability Scores"},{"id":"phb09","book":"PHB","printing":"local TSR 1e scan; see source manifest","printedPages":[9],"pdfPages":[10],"section":"Strength","status":"verified-text","locator":"local:PHB:printed:9","verificationScope":"Strength"},{"id":"phb12","book":"PHB","printing":"local TSR 1e scan; see source manifest","printedPages":[12],"pdfPages":[13],"section":"Constitution","status":"verified-text","locator":"local:PHB:printed:12","verificationScope":"Constitution"},{"id":"phb22","book":"PHB","printing":"local TSR 1e scan; see source manifest","printedPages":[22],"pdfPages":[23],"section":"Fighter","status":"verified-text","locator":"local:PHB:printed:22","verificationScope":"Fighter"},{"id":"phb35","book":"PHB","printing":"local TSR 1e scan; see source manifest","printedPages":[35],"pdfPages":[36],"section":"Starting Money and Equipment","status":"verified-text","locator":"local:PHB:printed:35","verificationScope":"Starting Money and Equipment"},{"id":"phb36","book":"PHB","printing":"local TSR 1e scan; see source manifest","printedPages":[36],"pdfPages":[37],"section":"Equipment","status":"verified-visual","locator":"local:PHB:printed:36","verificationScope":"example equipment price entries and headings"},{"id":"phb36-armor","book":"PHB","printing":"local TSR 1e scan; see source manifest","printedPages":[36],"pdfPages":[37],"section":"Armor","status":"verified-visual","locator":"local:PHB:printed:36","verificationScope":"Armor"},{"id":"dmg74","book":"DMG","printing":"local TSR 1e scan; see source manifest","printedPages":[74],"pdfPages":[75],"section":"Attack Matrices","status":"verified-visual","locator":"local:DMG:printed:74","verificationScope":"fighter level 1-2 row and headers; not all levels"},{"id":"dmg79","book":"DMG","printing":"local TSR 1e scan; see source manifest","printedPages":[79],"pdfPages":[80],"section":"Saving Throws","status":"verified-visual","locator":"local:DMG:printed:79","verificationScope":"fighter level 1-2 row and headers; not all levels"},{"id":"phb37","book":"PHB","printing":"local TSR 1e scan","printedPages":[37],"pdfPages":[38],"section":"Weapon Proficiency and Weapon Damage","status":"verified-text","locator":"local:PHB:printed:37","verificationScope":"Weapon Proficiency and Weapon Damage"},{"id":"phb34","book":"PHB","printing":"local TSR 1e scan","printedPages":[34],"pdfPages":[35],"section":"Languages","status":"verified-text","locator":"local:PHB:printed:34","verificationScope":"Languages"}],"definitions":[{"id":"PHB:armor:leather","kind":"item","facts":{"unitPriceGp":5,"quantityUnit":"each","weightStatus":"pending-verification"},"sourceIds":["phb35"]},{"id":"PHB:weapon:long-sword","kind":"item","facts":{"unitPriceGp":15,"quantityUnit":"each","weightStatus":"pending-verification"},"sourceIds":["phb35"]},{"id":"PHB:gear:backpack","kind":"item","facts":{"unitPriceGp":2,"quantityUnit":"each","weightStatus":"pending-verification"},"sourceIds":["phb36"]},{"id":"PHB:gear:waterskin","kind":"item","facts":{"unitPriceGp":0.75,"quantityUnit":"each","weightStatus":"pending-verification"},"sourceIds":["phb36"]},{"id":"PHB:gear:iron-rations-week","kind":"item","facts":{"unitPriceGp":5,"quantityUnit":"week","weightStatus":"pending-verification"},"sourceIds":["phb36"]},{"id":"PHB:gear:torch","kind":"item","facts":{"unitPriceGp":0.005,"quantityUnit":"each","weightStatus":"pending-verification"},"sourceIds":["phb36"]},{"id":"PHB:gear:rope-50ft","kind":"item","facts":{"unitPriceGp":0.2,"quantityUnit":"each","weightStatus":"pending-verification"},"sourceIds":["phb36"]}],"embeddedBundles":[]},"checkpoint":{"atSequence":6,"facts":{"identity":{"name":"艾伦（格式示例）","raceId":"PHB:human","sex":"male","alignment":"NG","ageYears":20,"languages":["common","neutral-good","dwarvish"],"description":"格式完整的虚构示例：NG一级人类战士，已在示例战役中获DM认可；不是实际玩家人物。"},"abilities":{"base":{"STR":16,"INT":10,"WIS":12,"DEX":14,"CON":15,"CHA":11},"exceptionalStrength":null,"generation":{"methodId":"DMG:I","rollIds":["r1","r2","r3","r4","r5","r6"],"assignment":{"STR":"r1","INT":"r2","WIS":"r3","DEX":"r4","CON":"r5","CHA":"r6"}},"changes":[]},"careers":[{"id":"career-fighter","classId":"PHB:fighter","variantId":"PHB:core","level":1,"xp":0,"status":"active","levelHistory":[{"level":1,"eventId":"e2","hpDice":[8],"hpAward":9,"sourceIds":["phb12","phb22"],"basis":{"kind":"accepted-rule-result","rulesDigest":"unsealed-example-not-release","conAtAward":15,"components":{"die":8,"constitution":1,"rounding":"not-applicable"},"decisionId":null},"awardId":"hp-award-1"}],"training":[],"choices":{"weaponProficiencies":["PHB:weapon:long-sword","PHB:weapon:spear","PHB:weapon:dagger","PHB:weapon:short-bow"],"additionalLanguage":{"status":"dm-attested-example","language":"dwarvish","count":1}}}],"resources":{"hp":{"damage":0,"temporary":0},"wallets":[{"id":"purse","locationId":"belt","coins":{"pp":0,"gp":72,"ep":0,"sp":0,"cp":4}}],"inventory":[{"id":"leather","definitionId":"PHB:armor:leather","label":"leather","quantity":1,"locationId":"worn","equipped":true,"customFacts":{}},{"id":"sword","definitionId":"PHB:weapon:long-sword","label":"sword","quantity":1,"locationId":"belt","equipped":true,"customFacts":{}},{"id":"pack","definitionId":"PHB:gear:backpack","label":"pack","quantity":1,"locationId":"back","equipped":false,"customFacts":{}},{"id":"skin","definitionId":"PHB:gear:waterskin","label":"skin","quantity":1,"locationId":"backpack","equipped":false,"customFacts":{"contents":{"kind":"water","amount":null,"unit":"pint","status":"unknown"}}},{"id":"rations","definitionId":"PHB:gear:iron-rations-week","label":"rations","quantity":1,"locationId":"backpack","equipped":false,"customFacts":{}},{"id":"torch","definitionId":"PHB:gear:torch","label":"torch","quantity":6,"locationId":"backpack","equipped":false,"customFacts":{}},{"id":"rope","definitionId":"PHB:gear:rope-50ft","label":"rope","quantity":1,"locationId":"backpack","equipped":false,"customFacts":{}}],"conditions":[],"abilitiesUsed":{},"locations":[{"id":"body","kind":"person","parentId":null,"containerInstanceId":null,"entityId":"example-human-fighter-001"},{"id":"belt","kind":"body-slot","parentId":"body","containerInstanceId":null,"entityId":null},{"id":"back","kind":"body-slot","parentId":"body","containerInstanceId":null,"entityId":null},{"id":"worn","kind":"body-slot","parentId":"body","containerInstanceId":null,"entityId":null},{"id":"backpack","kind":"container","parentId":"back","containerInstanceId":"pack","entityId":null}]},"magic":{"understanding":[],"books":[],"memory":[],"research":[],"qualificationRounds":[]},"campaign":{"time":"Y1-M1-D1","status":"active","relationships":[],"properties":[],"activities":[],"goals":["护送商队并寻找失落的石堡。"],"admission":{"status":"accepted","decisionId":"example-admission","acceptedScopes":["identity","single-career","hp-award","languages","purchased-equipment"],"outstanding":["weights-and-volume","waterskin-content","loaded-movement"]},"lifeState":"alive","actionRestrictions":[]},"careerPath":{"mode":"single","careerIds":["career-fighter"],"phases":[]},"hpAwards":[{"id":"hp-award-1","grantKind":"accepted-rule-result","careerEventIds":["e2"],"dieRollIds":["r7"],"algorithmId":"PHB:single-fighter-initial-hp","contributions":[{"careerId":"career-fighter","diceTotal":8,"conAtAward":15,"conContribution":1}],"divisor":1,"unrounded":9,"rounding":"none","actualAward":9,"sourceIds":["phb12","phb22"],"decisionId":null}],"advancement":{"adventureAssessments":[],"xpBatches":[],"pending":[]}}},"events":[{"id":"e1","sequence":1,"parentId":null,"type":"creation.abilities-generated","actorId":"example-player","authority":"system","recordedAt":"2026-10-13T23:40:00+08:00","campaignTime":"Y1-M1-D1","status":"committed","payload":{"method":"DMG:I","assignment":{"STR":"r1","INT":"r2","WIS":"r3","DEX":"r4","CON":"r5","CHA":"r6"}},"sourceIds":["dmg11"],"rollIds":["r1","r2","r3","r4","r5","r6"],"supersedesId":null},{"id":"e2","sequence":2,"parentId":"e1","type":"career.initialized","actorId":"example-player","authority":"system","recordedAt":"2026-10-13T23:40:00+08:00","campaignTime":"Y1-M1-D1","status":"committed","payload":{"careerId":"career-fighter","level":1,"hpRoll":8,"conBonus":1,"hpAward":9},"sourceIds":["phb22","phb12"],"rollIds":["r7"],"supersedesId":null},{"id":"e3","sequence":3,"parentId":"e2","type":"funds.granted","actorId":"example-player","authority":"system","recordedAt":"2026-10-13T23:40:00+08:00","campaignTime":"Y1-M1-D1","status":"committed","payload":{"walletId":"purse","coins":{"pp":0,"gp":100,"ep":0,"sp":0,"cp":0}},"sourceIds":["phb35"],"rollIds":["r8"],"supersedesId":null},{"id":"e4","sequence":4,"parentId":"e3","type":"inventory.purchased","actorId":"example-player","authority":"system","recordedAt":"2026-10-13T23:40:00+08:00","campaignTime":"Y1-M1-D1","status":"committed","payload":{"walletId":"purse","items":[{"id":"leather","definitionId":"PHB:armor:leather","quantity":1,"locationId":"worn","equipped":true,"costCp":1000},{"id":"sword","definitionId":"PHB:weapon:long-sword","quantity":1,"locationId":"belt","equipped":true,"costCp":3000},{"id":"pack","definitionId":"PHB:gear:backpack","quantity":1,"locationId":"back","equipped":false,"costCp":400},{"id":"skin","definitionId":"PHB:gear:waterskin","quantity":1,"locationId":"backpack","equipped":false,"costCp":150},{"id":"rations","definitionId":"PHB:gear:iron-rations-week","quantity":1,"locationId":"backpack","equipped":false,"costCp":1000},{"id":"torch","definitionId":"PHB:gear:torch","quantity":6,"locationId":"backpack","equipped":false,"costCp":6},{"id":"rope","definitionId":"PHB:gear:rope-50ft","quantity":1,"locationId":"backpack","equipped":false,"costCp":40}],"totalCp":5596,"change":{"pp":0,"gp":72,"ep":0,"sp":0,"cp":4}},"sourceIds":["phb35","phb36"],"rollIds":[],"supersedesId":null},{"id":"e5","sequence":5,"parentId":"e4","type":"creation.review-requested","actorId":"example-player","authority":"player","recordedAt":"2026-10-13T23:40:00+08:00","campaignTime":"Y1-M1-D1","status":"committed","payload":{"pending":["weights-and-volume","waterskin-content","loaded-movement"]},"sourceIds":["phb37"],"rollIds":[],"supersedesId":null},{"id":"e6","sequence":6,"parentId":"e5","type":"campaign.admitted","actorId":"example-dm","authority":"dm-attested","recordedAt":"2026-10-13T23:40:00+08:00","campaignTime":"Y1-M1-D1","status":"committed","payload":{"decisionId":"example-admission","language":"dwarvish","ageYears":20,"acceptedScopes":["identity","single-career","hp-award","languages","purchased-equipment"]},"sourceIds":["phb34"],"rollIds":[],"supersedesId":null}],"rolls":[{"id":"r1","eventId":"e1","expression":"4d6 keep highest 3","faces":[6,6,4,1],"keptIndices":[0,1,2],"total":16,"method":"physical","sourceIds":["dmg11"]},{"id":"r2","eventId":"e1","expression":"4d6 keep highest 3","faces":[4,3,3,1],"keptIndices":[0,1,2],"total":10,"method":"physical","sourceIds":["dmg11"]},{"id":"r3","eventId":"e1","expression":"4d6 keep highest 3","faces":[4,4,4,2],"keptIndices":[0,1,2],"total":12,"method":"physical","sourceIds":["dmg11"]},{"id":"r4","eventId":"e1","expression":"4d6 keep highest 3","faces":[5,5,4,1],"keptIndices":[0,1,2],"total":14,"method":"physical","sourceIds":["dmg11"]},{"id":"r5","eventId":"e1","expression":"4d6 keep highest 3","faces":[6,5,4,2],"keptIndices":[0,1,2],"total":15,"method":"physical","sourceIds":["dmg11"]},{"id":"r6","eventId":"e1","expression":"4d6 keep highest 3","faces":[4,4,3,1],"keptIndices":[0,1,2],"total":11,"method":"physical","sourceIds":["dmg11"]},{"id":"r7","eventId":"e2","expression":"1d10","faces":[8],"keptIndices":[0],"total":8,"method":"physical","sourceIds":["phb22"]},{"id":"r8","eventId":"e3","expression":"5d4 * 10 gp","faces":[2,2,2,2,2],"keptIndices":[0,1,2,3,4],"total":100,"method":"physical","sourceIds":["phb35"]}],"overrides":[],"cache":{"engineVersion":"spec-only","rulesDigest":"unsealed-example-not-release","throughSequence":6,"values":{"hpMax":9,"hpCurrent":9,"armorClass":8,"baseMovementInches":12,"xpBonusPercent":10,"savingThrows":{"paralyzationPoisonDeath":14,"petrificationPolymorph":15,"rodStaffWand":16,"breath":17,"spell":17},"attackMatrix":{"sourceId":"dmg74","levels":[1,2],"targetsByAC":{"0":20,"1":19,"2":18,"3":17,"4":16,"5":15,"6":14,"7":13,"8":12,"9":11,"10":10,"-10":25,"-9":24,"-8":23,"-7":22,"-6":21,"-5":20,"-4":20,"-3":20,"-2":20,"-1":20},"adjustmentsNotApplied":true},"longSword":{"sourceIds":["phb09","phb37"],"damageSM":"1d8+1","damageL":"1d12+1","strengthHitAdjustment":0,"ordinaryAttacksPerRound":1,"conditionalAttacks":"PHB fighter vs <1 HD exception; depends on target"},"movementLoaded":null},"warnings":["示例使用人工核验缓存，没有声称已经运行角色引擎。","装备重量及体积未逐件核验，负重和实际移动保持unknown；不能用基础12寸保证实际移动。","dm-attested仅为虚构示例记录，不构成真实身份验证。","物品价格Gp用于人类阅读；事件costCp/totalCp是币值守恒核验的整数金额。","入场认可不包括负重及实际移动判定，相关未完事项保存在admission.outstanding。"]},"provenance":{"creator":"research-example","importedFrom":null,"migrations":[{"from":"1.0.0","to":"1.1.0","at":"2026-10-14T14:00:00+08:00","warnings":["补充生命状态/待办分轴与事件payload；旧检查点前仍为摘要审计，不伪称完整回放。"]}],"unmappedLegacy":{}},"extensions":{"archiveGuarantee":{"level":"readable-checkpoint-and-historical-cache","preCheckpointAudit":"summary-not-full-replay","automaticRecalculation":"requires-missing-rule-definitions"}},"proposals":[]}, null, 2);
const card = JSON.parse(fixture);
const codes = (text: string) => inspectArchive(text).diagnostics.map(d => d.code);
const modified = (change: (v: any) => void) => { const v = structuredClone(card); change(v); return JSON.stringify(v); };
const fails = (text: string, code?: string) => {
  const result = inspectArchive(text); assert.equal(result.canStage, false);
  if (code) assert.ok(result.diagnostics.some(d => d.code === code), JSON.stringify(result.diagnostics));
  assert.equal(exportOriginalText(result), text); return result;
};

const good = inspectArchive(fixture);
assert.equal(good.kind, 'full-candidate');
assert.equal(good.canStage, true, JSON.stringify(good.diagnostics));
assert.equal(good.validation.structure, 'passed'); assert.equal(good.validation.references, 'passed');
assert.equal(good.validation.fullSchemaValidated, false); assert.equal(good.validation.rulesValidated, false);
assert.equal(good.validation.admissionValidated, false); assert.equal(good.readOnly, true);
assert.equal(good.replay?.executable, false);
assert.ok(good.diagnostics.some(d => d.code === 'RULES_NOT_RESOLVED'));
assert.equal(exportOriginalText(good), fixture);
assert.deepEqual(exportOriginalBytes(good), new TextEncoder().encode(fixture));
assert.deepEqual(inspectArchive(fixture).diagnostics, good.diagnostics, 'stable preview without clocks/randomness');

for (const text of ['{', '{"name":', 'null', '[]', '42', '"name"']) fails(text);
fails(' {"name":"partial"} ', 'UNKNOWN_FORMAT');
fails(' {"STR": 1e999} ', 'NON_FINITE');
fails('{"STR":9007199254740993}', 'NON_FINITE');
fails('{"class":"fighter","__proto__":{"polluted":true}}', 'UNSAFE_KEY');
assert.equal(({} as any).polluted, undefined);
fails(' '.repeat(ARCHIVE_LIMITS.bytes + 1), 'SIZE_LIMIT');
fails('['.repeat(65) + '0' + ']'.repeat(65), 'DEPTH_LIMIT');
fails(JSON.stringify({ class: 'fighter', list: Array(ARCHIVE_LIMITS.nodes).fill(null) }), 'NODE_LIMIT');
assert.equal(inspectArchive(JSON.stringify({ class: 'fighter', text: '{'.repeat(100) })).kind, 'legacy-assertions', 'brackets in strings are not depth');
const bom = '\ufeff  ' + fixture + '\r\n'; assert.equal(exportOriginalText(inspectArchive(bom)), bom);
const validBytes = new TextEncoder().encode(bom); assert.deepEqual(exportOriginalBytes(inspectArchive(validBytes)), validBytes);
assert.equal(exportOriginalText(inspectArchive(validBytes)), bom);
const badBytes = new Uint8Array([0xc3, 0x28]); const badUtf8 = inspectArchive(badBytes);
assert.equal(badUtf8.canStage, false); assert.ok(badUtf8.diagnostics.some(d => d.code === 'INVALID_UTF8'));
assert.deepEqual(exportOriginalBytes(badUtf8), badBytes); assert.throws(() => exportOriginalText(badUtf8));
badBytes[0] = 0; assert.equal(exportOriginalBytes(badUtf8)[0], 0xc3, 'input bytes were copied');
const nodeBytes = Buffer.from(fixture, 'utf8'); const fromBuffer = inspectArchive(nodeBytes);
nodeBytes[0] = 0; assert.equal(exportOriginalBytes(fromBuffer)[0], 123, 'Buffer input must not share preserved memory');
const returned = exportOriginalBytes(good); returned[0] = 0; assert.equal(exportOriginalBytes(good)[0], 123);
good.data = null; good.originalText = 'mutated'; assert.equal(exportOriginalText(good), fixture, 'recovery independent of mutable UI preview');

fails(modified(v => delete v.checkpoint.facts.campaign.lifeState), 'STRUCTURE');
fails(modified(v => v.document.revision = -1), 'STRUCTURE');
fails(modified(v => v.events[1].payload.hpAward = 0), 'STRUCTURE');
fails(modified(v => v.events[1].payload.unregistered = true), 'STRUCTURE');
fails(modified(v => v.events[0].id = v.events[1].id), 'DUPLICATE_OR_EMPTY_ID');
fails(modified(v => v.events[1].sequence = v.events[0].sequence), 'EVENT_SEQUENCE');
fails(modified(v => v.events[0].parentId = v.events[1].id), 'EVENT_SEQUENCE');
fails(modified(v => v.rolls[0].eventId = 'missing'), 'MISSING_REFERENCE');
fails(modified(v => v.events[0].payload.assignment.STR = 'missing'), 'MISSING_REFERENCE');
fails(modified(v => v.rolls[0].eventId = 'e2'), 'MISSING_REFERENCE');
fails(modified(v => v.rolls[0].keptIndices = [0, 0, 99]), 'ROLL_INDICES');
fails(modified(v => v.events[0].sourceIds = ['missing']), 'MISSING_REFERENCE');
fails(modified(v => v.checkpoint.facts.careers[0].levelHistory[0].awardId = 'missing'), 'MISSING_REFERENCE');
fails(modified(v => v.checkpoint.facts.resources.inventory[0].quantity = -1), 'STRUCTURE');
fails(modified(v => v.checkpoint.facts.resources.inventory[0].locationId = 'missing'), 'MISSING_REFERENCE');
fails(modified(v => v.checkpoint.facts.resources.locations[0].parentId = 'backpack'), 'LOCATION_CYCLE');
fails(modified(v => v.cache.throughSequence = 100), 'CACHE_SEQUENCE');

const future = inspectArchive(modified(v => { v.schemaVersion = '2.0.0'; delete v.checkpoint; }));
assert.equal(future.kind, 'unknown-major'); assert.equal(future.canStage, false); assert.equal(future.validation.structure, 'not-run');
assert.equal(inspectArchive(modified(v => v.schemaVersion = '1.2.0')).kind, 'unsupported-version');
assert.equal(inspectArchive(modified(v => v.schemaVersion = '1.0.0')).kind, 'unsupported-version');
const tailText = modified(v => {
  v.events.push({ ...v.events[5], id: 'future-event', sequence: 7, parentId: 'e6', type: 'future.event', payload: { opaque: 1 } });
});
const tail = inspectArchive(tailText); assert.equal(tail.canStage, true); assert.equal(tail.replay?.hasUnknownTail, true);
assert.equal(tail.validation.registeredPayloads, 'partial');
assert.equal(tail.replay?.lastInspectableSequence, 6); assert.equal(tail.replay?.executable, false);
assert.equal((tail.data as any).events[6].type, 'future.event'); assert.equal(exportOriginalText(tail), tailText);
fails(modified(v => { v.events[5].type = 'future.event'; delete v.events[5].payload; }), 'STRUCTURE');

const publicCard = {
  format: 'adnd1e-character-projection', schemaVersion: '1.0.0',
  projection: { id: 'projection', characterId: 'c', revision: 100, exportedAt: 'test', view: 'player', purpose: 'readable-public-exchange', restoresPrivateArchive: false },
  identity: { name: 'Public', race: 'Human', careers: [{ label: 'Fighter', level: 1 }], alignment: 'NG' },
  health: { disclosure: 'qualitative', description: '疲倦', publicConditions: [] },
  resources: { items: [], coins: [] }, capabilities: [], publicActivities: [], publicHistory: [], warnings: [],
};
const pub = inspectArchive(JSON.stringify(publicCard)); assert.equal(pub.kind, 'projection'); assert.equal(pub.canStage, true);
assert.equal(pub.restoresPrivateArchive, false); assert.equal(pub.summary.characterId, 'c');
fails(JSON.stringify({ ...publicCard, format: 'adnd1e-character', schemaVersion: '1.1.0' }), 'STRUCTURE');
fails(JSON.stringify({ ...publicCard, health: { ...publicCard.health, damage: 4 } }), 'STRUCTURE');
fails(JSON.stringify({ ...publicCard, checkpoint: card.checkpoint }), 'STRUCTURE');

const rawLegacy = ' { "name":"旧卡", "STR":"19", "level":"6", "hp_max":"26", "hp_current":"7", "spell_0":"Sleep", "gear_0_item":"未知袋", "gear_0_quantity":"", "campaign_sources":"[\\"UA\\"]", "futureField": {"x":4} }\r\n';
const legacy = inspectArchive(rawLegacy); assert.equal(legacy.kind, 'legacy-assertions'); assert.equal(legacy.canStage, true);
assert.equal(legacy.validation.structure, 'not-run');
assert.equal(legacy.legacy?.assertions.find(a => a.path === '/STR')?.value, '19');
assert.equal(legacy.legacy?.assertions.find(a => a.path === '/hp_current')?.value, '7');
assert.equal(legacy.legacy?.inferredMoney, null); assert.equal(legacy.legacy?.inferredInventory, null);
assert.equal(legacy.legacy?.originalRolls, null); assert.equal(legacy.legacy?.inferredMemory, null);
assert.ok(legacy.legacy?.unresolved.some(a => a.path === '/spell_0'));
assert.deepEqual(legacy.legacy?.unmappedLegacy.futureField, { x: 4 });
assert.equal(exportOriginalText(legacy), rawLegacy);
assert.deepEqual(inspectArchive(rawLegacy).legacy, legacy.legacy);
assert.equal(inspectArchive('{"STR":18,"schemaVersion":"5.0.0"}').kind, 'unknown', 'versioned objects do not fall back to legacy');

const batch = { id: 'batch', method: 'DMG:I', createdAt: 'test', candidates: Array.from({ length: 6 }, () => [6, 5, 4, 1]) };
const draft = {
  format: 'adnd1e-creation-draft', schemaVersion: '1.0.0', id: 'draft', revision: 1, name: '草稿',
  profile: { books: ['PHB', 'DMG', 'MM'], abilityMethod: 'DMG:I', algorithm: 'dmg-ability-generation-v1', source: { book: 'DMG', printedPage: 11, section: 'Generation of Ability Scores' } },
  activeBatch: batch, choices: [0, 1, 2, 3, 4, 5], scores: { STR: 15, INT: 15, WIS: 15, DEX: 15, CON: 15, CHA: 15 }, history: [], audit: [],
};
const dp = inspectArchive(JSON.stringify(draft)); assert.equal(dp.kind, 'creation-draft'); assert.equal(dp.canStage, true); assert.equal(dp.restoresPrivateArchive, false);
assert.deepEqual(archiveDiagnosticRows(dp), [['', '', '已完成此格式支持的结构检查；未执行完整规则判定。']], 'clean previews retain a visible result after quarantine reload');
assert.equal(archiveDiagnosticRows(good).length, good.diagnostics.length, 'diagnostic previews render every diagnostic');
fails(JSON.stringify({ ...draft, scores: { ...draft.scores, STR: 18 } }), 'DRAFT_INTEGRITY');
fails(JSON.stringify({ ...draft, choices: [0, 0, 2, 3, 4, 5] }), 'DRAFT_INTEGRITY');
for (const m of ['DMG:II', 'DMG:III', 'DMG:IV']) {
  const counts: Record<string, number> = { 'DMG:II': 12, 'DMG:III': 36, 'DMG:IV': 72 };
  const d: any = structuredClone(draft); d.profile.abilityMethod = m; d.activeBatch.method = m;
  d.activeBatch.candidates = Array.from({ length: counts[m] }, () => [3, 4, 5]);
  d.scores = Object.fromEntries(Object.keys(draft.scores).map(k => [k, 12]));
  d.choices = m === 'DMG:III' ? [0, 6, 12, 18, 24, 30] : [0, 1, 2, 3, 4, 5];
  assert.equal(inspectArchive(JSON.stringify(d)).canStage, true);
  if (m === 'DMG:IV') { d.choices = [0, 1, 2, 3, 4, 11]; fails(JSON.stringify(d), 'DRAFT_INTEGRITY'); }
  if (m === 'DMG:III') { d.choices = [6, 0, 12, 18, 24, 30]; fails(JSON.stringify(d), 'DRAFT_INTEGRITY'); }
  if (m === 'DMG:II') { d.activeBatch.candidates[11] = [6, 6, 6]; fails(JSON.stringify(d), 'DRAFT_INTEGRITY'); }
}
assert.equal(inspectArchive(JSON.stringify({ ...draft, schemaVersion: '3.0.0' })).kind, 'unknown-major');
assert.equal(exportOriginalText(dp), JSON.stringify(draft));
assert.ok(codes(fixture).includes('PARTIAL_VALIDATION'));
console.log('PASS: archive classification, candidate/payload/reference negatives, limits, lossless originals, projection isolation, legacy non-invention, draft integrity and unknown-version/tail recovery.');
