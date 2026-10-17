import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectArchive } from '../src/character/interchange/archive';

type Character = {
  slug: string;
  name: string;
  raceId: string;
  raceLabel: string;
  classId: string;
  classLabel: string;
  level: number;
  hp: number;
  ac: number;
  alignment: string;
  abilities: { STR: number; INT: number; WIS: number; DEX: number; CON: number; CHA: number };
  exceptionalStrength: number | null;
  languages: string[];
  equipment: string[];
  equipmentNotes: string[];
  spellcaster: boolean;
  background: string;
  startingMoneyEmas: number;
  spellbook?: { level: number; spells: string[] }[];
  dailySpellCapacity?: string;
  thiefSkills?: Record<string, number>;
};

const sourceId = 'dl01:character-cards';
const currencySourceId = 'dl01:krynn-currency';
const source = {
  id: sourceId,
  book: 'DL1《龙枪：绝望之龙》',
  printing: '本地 TSR 1e PDF；PC 卡片扫描页',
  printedPages: [17, 18],
  pdfPages: [17, 18],
  section: 'Player Character Cards',
  status: 'verified-text',
  locator: 'local:Dragonlance:DL01:pdf:17-18',
  verificationScope: '首次出现版本的属性、阵营、HP、AC、职业等级、装备、法术书/每日法术能力、盗贼技能和背景。',
};
const currencySource = {
  id: currencySourceId,
  book: 'DL1《龙枪：绝望之龙》',
  printing: '本地 TSR 1e PDF；附录一',
  printedPages: [31],
  pdfPages: [31],
  section: 'Rates of Exchange',
  status: 'verified-text',
  locator: 'local:Dragonlance:DL01:pdf:31',
  verificationScope: 'Krynn 七种金属货币、Seeker Lands 的 Emas（钢币）及兑换关系。',
};

// DL01 写作“pack（由玩家选择）”。这里给出一套明确、可替换的索拉斯出发冒险包，
// 作为战役设置而不是冒充 DL01 的逐件原文装备表。
const commonPack = ['背包', '睡袋', '水袋', '燧石与钢', '7 日口粮', '50 尺麻绳', '6 支火把', '旅行斗篷'];

const characters: Character[] = [
  {
    slug: 'tanis-half-elf-fighter-5', name: '坦尼斯', raceId: 'half-elf', raceLabel: '半精灵', classId: 'fighter', classLabel: '战士', level: 5, hp: 35, ac: 4, alignment: '中立善良',
    abilities: { STR: 16, INT: 12, WIS: 13, DEX: 16, CON: 12, CHA: 15 }, exceptionalStrength: null,
    languages: ['通用语', '奎利内斯提语', '山地矮人语', '平原人语'],
    equipment: [...commonPack, '+2 皮甲', '+2 长剑', '弓', '20 支箭', '匕首 ×2'], equipmentNotes: [], spellcaster: false, startingMoneyEmas: 20,
    background: '五年前，坦尼斯随基蒂亚拉穿越北方；分别后，他一边寻找神职者，一边追寻自己的身世。他只知道母亲带着父亲留下的剑和戒指离开，也因此试图找回索兰尼亚骑士传统。',
  },
  {
    slug: 'sturm-human-fighter-6', name: '斯特姆·布莱特布雷德', raceId: 'human', raceLabel: '人类', classId: 'fighter', classLabel: '战士', level: 6, hp: 29, ac: 5, alignment: '守序善良',
    abilities: { STR: 17, INT: 14, WIS: 11, DEX: 12, CON: 16, CHA: 12 }, exceptionalStrength: null,
    languages: ['通用语', '奎利内斯提语', '索拉姆尼亚语'],
    equipment: [...commonPack, '锁子甲', '+3 双手剑', '匕首'], equipmentNotes: [], spellcaster: false, startingMoneyEmas: 20,
    background: '斯特姆护送基蒂亚拉越过北方海域，随后东西分行。他寻找一位圣人，也寻找自己的出身：母亲留下父亲的剑和戒指，而父亲据说曾是索兰尼亚骑士。',
  },
  {
    slug: 'caramon-human-fighter-6', name: '卡拉蒙', raceId: 'human', raceLabel: '人类', classId: 'fighter', classLabel: '战士', level: 6, hp: 36, ac: 6, alignment: '守序善良',
    abilities: { STR: 18, INT: 12, WIS: 10, DEX: 11, CON: 17, CHA: 15 }, exceptionalStrength: 63,
    languages: ['通用语', '平原人语'],
    equipment: [...commonPack, '环甲', '小盾', '长剑', '矛', '匕首'], equipmentNotes: [], spellcaster: false, startingMoneyEmas: 20,
    background: '卡拉蒙与雷斯林是双胞胎。他一路陪着弟弟走过高等魔法塔的试炼；两兄弟性格截然不同，但卡拉蒙始终是那个保护弟弟的人。',
  },
  {
    slug: 'raistlin-human-magic-user-3', name: '雷斯林', raceId: 'human', raceLabel: '人类', classId: 'magic-user', classLabel: '魔法师', level: 3, hp: 8, ac: 5, alignment: '中立',
    abilities: { STR: 10, INT: 17, WIS: 14, DEX: 16, CON: 10, CHA: 10 }, exceptionalStrength: null,
    languages: ['通用语', '魔吉斯语', '奎利内斯提语'],
    equipment: [...commonPack, '魔吉斯法杖（+3 防护；+2 命中；持续光明，每日 1 次；羽落术，每日 1 次）'], equipmentNotes: [], spellcaster: true, startingMoneyEmas: 15, dailySpellCapacity: '每天 2 个一级法术、1 个二级法术',
    spellbook: [{ level: 1, spells: ['燃烧之手', '魅惑人类', '通晓语言', '侦测魔法', '封门', '魔法飞弹', '推力术', '睡眠术', '邓肯浮碟'] }, { level: 2, spells: ['可听幻术', '黑暗术（15尺）', '侦测隐形', 'ESP心灵感应', '隐形术', '镜影术', '蛛网术'] }],
    background: '雷斯林与卡拉蒙曾在高等魔法塔接受亡灵贤者的试炼。试炼严重损害了他的健康，也让他获得了强大的魔法；他如今以沙漏般的眼睛看待世界，准备在即将到来的时代使用力量。',
  },
  {
    slug: 'goldmoon-human-cleric-5', name: '金月', raceId: 'human', raceLabel: '人类', classId: 'cleric', classLabel: '牧师', level: 5, hp: 19, ac: 6, alignment: '守序善良',
    abilities: { STR: 12, INT: 12, WIS: 16, DEX: 14, CON: 12, CHA: 17 }, exceptionalStrength: null,
    languages: ['通用语', '奎利内斯提语', '山地矮人语', '平原人语'],
    equipment: [...commonPack, '米沙凯尔蓝晶法杖（可触摸治疗；作为武器有额外伤害）', '皮甲', '+1 投石索'], equipmentNotes: ['首次出现时仍在寻找真正的神祇；不要把后续获得的信仰徽章或牧师能力提前填入。'], spellcaster: true, startingMoneyEmas: 15,
    background: '金月是奎舒部落的公主，河风是她的守护者和未婚夫。父亲要求河风从被遗忘之地带回魔法作为婚约证明；父亲后来否认法杖的力量并下令将河风石刑，金月冲到他身边时，法杖发光，把他们带到了村外平原。',
  },
  {
    slug: 'riverwind-human-ranger-5', name: '河风', raceId: 'human', raceLabel: '人类', classId: 'ranger', classLabel: '游侠', level: 5, hp: 34, ac: 5, alignment: '守序善良',
    abilities: { STR: 18, INT: 13, WIS: 14, DEX: 16, CON: 13, CHA: 13 }, exceptionalStrength: 35,
    languages: ['通用语', '平原人语', '山地矮人语', '奎利内斯提语'],
    equipment: [...commonPack, '皮甲', '小盾', '+2 长剑', '短弓和箭袋', '+1 猎刀'], equipmentNotes: [], spellcaster: false, startingMoneyEmas: 20,
    background: '河风是奎舒部落的战士，爱着金月。他带着她父亲要求的任务进入被遗忘之地；归来后却被指责法杖并不神奇，还被下令处死。濒死之际法杖将他和金月带走。',
  },
  {
    slug: 'flint-dwarf-fighter-4', name: '弗林特·火炉锻', raceId: 'dwarf', raceLabel: '矮人', classId: 'fighter', classLabel: '战士', level: 4, hp: 42, ac: 6, alignment: '中立善良',
    abilities: { STR: 17, INT: 7, WIS: 12, DEX: 10, CON: 18, CHA: 13 }, exceptionalStrength: null,
    languages: ['通用语', '山地矮人语'],
    equipment: [...commonPack, '铆钉皮甲', '小盾', '+1 双手斧 ×2', '匕首'], equipmentNotes: [], spellcaster: false, startingMoneyEmas: 20,
    background: '弗林特寻找着通往山地矮人地下王国的大门。灾变时山地矮人曾被关在门外；他后来被苦力矮人抓住又逃脱，对山地矮人和苦力矮人都怀有强烈怨气。',
  },
  {
    slug: 'tasslehoff-kender-thief-4', name: '塔斯勒霍夫·伯特福特', raceId: 'kender', raceLabel: '克林', classId: 'thief', classLabel: '盗贼', level: 4, hp: 15, ac: 5, alignment: '中立',
    abilities: { STR: 13, INT: 9, WIS: 12, DEX: 16, CON: 14, CHA: 11 }, exceptionalStrength: null,
    languages: ['通用语', '克林语'],
    equipment: [...commonPack, '皮甲', '小盾', '呼啦克（弹丸投石索与 +2 短棍组合）', '匕首'], equipmentNotes: [], spellcaster: false, startingMoneyEmas: 10,
    thiefSkills: { '开锁': 50, '寻找陷阱': 47, '静默移动': 43, '藏身': 40, '听声': 20, '攀爬': 73, '读语言': 15 },
    background: '塔斯在五年旅行中几乎忘记了去过的地方。他本想给旅程绘制地图，却总是更专注于继续上路；回到索拉斯时，发现故乡已被寻道者神权统治。',
  },
];

const base = JSON.parse(readFileSync(new URL('../docs/character-redesign/example-fighter-v1.1.json', import.meta.url), 'utf8')) as any;
const outputDir = fileURLToPath(new URL('../public/character/dragonlance/', import.meta.url));
mkdirSync(outputDir, { recursive: true });

function definitionId(character: Character, index: number) { return `DL01:${character.slug}:item:${index + 1}`; }

function makeCard(character: Character) {
  const card = structuredClone(base);
  const characterId = `dragonlance-${character.slug}`;
  const careerId = `${characterId}:career`;
  const itemDefinitions = character.equipment.map((label, index) => {
    const carriedAtAppearance = label.includes('蓝晶法杖');
    return { id: definitionId(character, index), kind: carriedAtAppearance ? 'source-magic-item' : 'source-or-campaign-equipment', facts: { label, suppliedBySource: carriedAtAppearance, acquisition: carriedAtAppearance ? 'first-appearance-carried' : 'source-listed-or-campaign-loadout', price: carriedAtAppearance ? 0 : null, weight: null }, sourceIds: [sourceId] };
  });
  const inventory = character.equipment.map((label, index) => { const carriedAtAppearance = label.includes('蓝晶法杖'); return { id: `${characterId}:item:${index + 1}`, definitionId: definitionId(character, index), label, quantity: 1, locationId: 'worn', equipped: true, customFacts: { sourceText: label, acquisition: carriedAtAppearance ? 'first-appearance-carried' : 'source-listed-or-campaign-loadout', costCp: carriedAtAppearance ? 0 : null } }; });
  const locations = [
    { id: 'body', kind: 'person', parentId: null, containerInstanceId: null, entityId: characterId },
    { id: 'worn', kind: 'body-slot', parentId: 'body', containerInstanceId: null, entityId: null },
  ];
  const event1 = `${characterId}:source-profile`;
  const event2 = `${characterId}:source-equipment`;
  const event3 = `${characterId}:open-items`;
  const sources = [source, currencySource];
  const outstanding = [
    'DL01 人物卡没有为个人列出钱包；本档案采用“索拉斯开局钱包”战役设置：按 DL01 的 Seeker Emas 货币记录。',
    '人物卡中的“pack（由玩家选择）”已经落实为一个通用冒险背包；如战役有不同携行物，可直接替换。',
    '等级和 HP 是 DL01 首次出现人物卡的来源事实，不是本网站从一级逐级重放的结果。',
  ];
  if (character.spellcaster && !character.spellbook) outstanding.push('DL01 只给出每日施法容量，没有给出完整的已记忆法术；本档案不擅自填入。');
  outstanding.push(...character.equipmentNotes);

  card.document = { id: `${characterId}:export`, characterId, revision: 1, parentRevision: null, branchId: 'main', exportedAt: '2026-10-17T00:00:00+08:00', view: 'player', archiveGuarantee: 'checkpoint-and-audit' };
  card.rules = {
    engineContractVersion: '1.0.0', profileId: 'dragonlance-dl01-first-appearance', profileRevision: 1,
    packs: [
      { id: 'adnd1e.phb-dmg-mm', version: '1e-source-compatible', digest: 'source-backed-profile-not-replayed' },
      { id: 'adnd1e.dragonlance-dl01', version: '9130-local', digest: 'dl01-pdf-pages-17-18-31' },
    ],
    options: { abilityGeneration: 'DL01:预生成人物卡', levelAndHp: 'DL01:预生成人物卡', experience: '原表未提供', money: 'Seeker Emas：战役设置 10–20 em', ordinaryEquipment: 'pack：按人物卡“由玩家选择”落实为冒险背包' },
    decisions: [{ id: `${characterId}:source-import`, ruleId: 'dragonlance.pre-generated-character', choice: 'imported-first-appearance-profile', reason: '从 DL01 首次出现人物卡导入来源事实；钱币采用明确标注的索拉斯开局战役设置，不冒充 DL01 个人钱包规则；金月的蓝晶法杖按出场携带物收入，费用为 0。', actorId: 'local-source-import', sourceIds: [sourceId, currencySourceId] }],
    sources,
    definitions: itemDefinitions,
    embeddedBundles: [],
  };
  card.checkpoint = {
    atSequence: 3,
    facts: {
      identity: { name: character.name, raceId: character.raceId, sex: '未提供', alignment: character.alignment, ageYears: null, languages: character.languages, description: `DL01 首次出现人物卡：${character.background}` },
      abilities: { base: character.abilities, exceptionalStrength: character.exceptionalStrength, generation: { methodId: 'DL01:预生成人物卡', rollIds: [], assignment: {} }, changes: [] },
      careers: [{ id: careerId, classId: character.classId, variantId: 'DL01:first-appearance', level: character.level, xp: 0, status: 'active', levelHistory: [{ level: character.level, eventId: event1, hpDice: [], hpAward: character.hp, sourceIds: [sourceId] }], training: [], choices: { sourceImported: true, weaponAndClassChoices: 'DL01人物卡来源事实；原卡没有完整熟练记录', ...character.thiefSkills ? { thiefSkills: character.thiefSkills } : {} } }],
      resources: { hp: { damage: 0, temporary: 0 }, wallets: [{ id: `${characterId}:purse`, locationId: 'body', coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 } }], inventory, conditions: [], abilitiesUsed: {}, locations },
      magic: { understanding: character.spellbook?.flatMap((group) => group.spells.map((spell) => ({ spellId: `DL01:${spell}`, level: group.level, status: 'understood', basis: 'DL01角色卡直接列出法术书', checkEventIds: [event1] }))) ?? [], books: character.spellbook ? [{ id: `${characterId}:spellbook`, label: '雷斯林的法术书', locationId: 'body', entries: character.spellbook.flatMap((group) => group.spells.map((spell) => ({ spellId: `DL01:${spell}`, acquiredBy: 'DL01角色卡', eventId: event1 }))) }] : [], memory: [], research: [], qualificationRounds: [] },
      campaign: { time: '未设定', status: 'draft', relationships: [], properties: [{ id: `${characterId}:purse`, label: '索拉斯开局钱包', locationId: 'body', ownership: 'character', details: { currencySystem: 'Seeker Emas', emas: character.startingMoneyEmas, campaignSetup: true } }], activities: [], goals: ['在龙枪战役中继续运营人物。'], admission: { status: 'pending', decisionId: null, acceptedScopes: ['source-profile'], outstanding }, lifeState: 'alive', actionRestrictions: [] },
      careerPath: { mode: 'single', careerIds: [careerId], phases: [] }, hpAwards: [], advancement: { adventureAssessments: [], xpBatches: [], pending: [] },
    },
  };
  card.events = [
    { id: event1, sequence: 1, parentId: null, type: 'creation.review-requested', actorId: 'local-source-import', authority: 'system', recordedAt: '2026-10-17T00:00:00+08:00', campaignTime: '未设定', status: 'committed', payload: { pending: ['source-profile-import'] }, sourceIds: [sourceId], rollIds: [], supersedesId: null },
    { id: event2, sequence: 2, parentId: event1, type: 'creation.review-requested', actorId: 'local-source-import', authority: 'system', recordedAt: '2026-10-17T00:00:00+08:00', campaignTime: '未设定', status: 'committed', payload: { pending: ['source-listed-equipment', 'campaign-pack-selection', 'campaign-starting-purse'] }, sourceIds: [sourceId, currencySourceId], rollIds: [], supersedesId: null },
    { id: event3, sequence: 3, parentId: event2, type: 'creation.review-requested', actorId: 'local-source-import', authority: 'player', recordedAt: '2026-10-17T00:00:00+08:00', campaignTime: '未设定', status: 'committed', payload: { pending: outstanding }, sourceIds: [sourceId], rollIds: [], supersedesId: null },
  ];
  card.rolls = [];
  card.overrides = [];
  card.cache = { engineVersion: 'source-profile-cache', rulesDigest: 'dl01-pdf-pages-17-18-31', throughSequence: 3, values: { hpMax: character.hp, hpCurrent: character.hp, armorClass: character.ac, sourceProfile: true, currency: { system: 'Seeker Emas', emas: character.startingMoneyEmas } }, warnings: ['这是 DL01 首次出现人物卡的来源档案；等级、HP 与 AC 未由一级创建过程重放。', ...outstanding] };
  card.provenance = { creator: 'dragonlance-first-appearance-roster', importedFrom: 'DL01:Player Character Cards:PDF pages 17-18; Rates of Exchange:PDF page 31', migrations: [], unmappedLegacy: {} };
  card.extensions = { dragonlance: { source: sourceId, nameChinese: character.name, classChinese: character.classLabel, raceChinese: character.raceLabel, firstAppearance: 'DL01', background: character.background, currency: { system: 'Seeker Emas', emas: character.startingMoneyEmas, isCampaignSetup: true, conversionSource: currencySourceId }, dailySpellCapacity: character.dailySpellCapacity ?? null, spellbook: character.spellbook ?? [], thiefSkills: character.thiefSkills ?? null, sourceEquipmentOnly: false, originalLanguagesIncludeCommon: true } };
  card.proposals = [];
  return card;
}

for (const character of characters) {
  const card = makeCard(character);
  const preview = inspectArchive(JSON.stringify(card));
  if (preview.validation.structure !== 'passed' || preview.validation.references !== 'passed') {
    throw new Error(`${character.name} archive invalid: ${JSON.stringify(preview.diagnostics.slice(0, 8))}`);
  }
  writeFileSync(join(outputDir, `${character.slug}.adnd1e-character.json`), `${JSON.stringify(card, null, 2)}\n`, 'utf8');
}

writeFileSync(join(outputDir, 'manifest.json'), `${JSON.stringify({
  format: 'adnd1e-dragonlance-roster', schemaVersion: '1.0.0', title: '龙枪八人 · DL01首次出现版', source: { id: sourceId, book: source.book, pdfPages: [17, 18], currencySource: { id: currencySourceId, pdfPage: 31 }, note: 'DL01 PC 卡片给出首次出现时的八人属性、等级、HP、AC、装备和背景；人物卡中的 pack 由玩家选择，本批采用通用冒险背包。' },
  characters: characters.map(({ slug, name, raceLabel, classLabel, level, hp, ac, startingMoneyEmas, background }) => ({ slug, name, raceLabel, classLabel, level, hp, ac, startingMoney: `${startingMoneyEmas} Emas`, background, file: `${slug}.adnd1e-character.json` })),
  limitations: ['DL01没有为每个角色写个人钱包；10–20 Emas 是明确标记的索拉斯开局战役设置，不是冒充原卡原文。', 'DL01的 pack 写作“由玩家选择”，本批落实为通用冒险背包；之后可按实际战役替换。', '等级和HP是首次出现预生成人物卡的事实，不能当作网站重放得到的升级历史。'],
}, null, 2)}\n`, 'utf8');

console.log(`Generated ${characters.length} Dragonlance source-backed character archives.`);
