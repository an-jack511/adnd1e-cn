import { inspectArchive } from './archive';

type Obj = Record<string, any>;

const object = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const numberOrNull = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

const careerLabels: Record<string, string> = {
  fighter: '战士', 'magic-user': '魔法师', cleric: '牧师', druid: '德鲁伊',
  paladin: '圣武士', ranger: '游侠', illusionist: '幻术师', thief: '盗贼',
  assassin: '刺客', monk: '武僧', bard: '吟游诗人',
};
const raceLabels: Record<string, string> = {
  human: '人类', elf: '精灵', dwarf: '矮人', gnome: '侏儒',
  'half-elf': '半精灵', halfling: '半身人', 'half-orc': '半兽人', kender: '肯德',
};
const abilityLabels: Record<string, string> = { STR: '力量', INT: '智力', WIS: '感知', DEX: '敏捷', CON: '体质', CHA: '魅力' };

export interface ImportedCharacterCard {
  sourceFormat: 'adnd1e-character';
  schemaVersion: string;
  characterId: string;
  branchId: string;
  name: string;
  race: string;
  career: string;
  level: number | null;
  experience: number | null;
  alignment: string;
  sex: string;
  languages: string[];
  description: string;
  abilities: { label: string; value: number | null }[];
  maximumHp: number | null;
  currentHp: number | null;
  armorClass: number | null;
  inventory: { label: string; quantity: number; equipped: boolean; acquisition: string; costCp: number | null }[];
  currency: { label: string; amount: number }[];
  dailySpellCapacity: unknown;
  spellbooks: string[];
  memorizedSpells: string[];
  outstanding: string[];
  goals: string[];
  sourceProfile: string;
  sources: { book: string; pages: number[]; section: string }[];
  originalText: string;
}

/**
 * Opens a v1.1 character archive for player-side viewing only.
 * It deliberately does not turn a source profile into a replayed core runtime.
 */
export function parseImportedCharacterCard(input: string | unknown): ImportedCharacterCard {
  const originalText = typeof input === 'string' ? input : JSON.stringify(input);
  const preview = inspectArchive(originalText);
  if (preview.kind !== 'full-candidate' || !preview.canStage || !object(preview.data)) {
    throw new Error('来源人物档案未通过结构和引用检查。');
  }
  const root = preview.data;
  const facts = object(root.checkpoint?.facts) ? root.checkpoint.facts : {};
  const identity = object(facts.identity) ? facts.identity : {};
  const abilities = object(facts.abilities?.base) ? facts.abilities.base : {};
  const career = Array.isArray(facts.careers) ? facts.careers.find((row: Obj) => row?.status === 'active') ?? facts.careers[0] : {};
  const resources = object(facts.resources) ? facts.resources : {};
  const hp = object(resources.hp) ? resources.hp : {};
  const levelHistory = Array.isArray(career?.levelHistory) ? career.levelHistory : [];
  const hpAward = levelHistory.reduce((max: number | null, row: Obj) => {
    const value = numberOrNull(row?.hpAward);
    return value === null ? max : max === null ? value : Math.max(max, value);
  }, null);
  const extension = object(root.extensions?.dragonlance) ? root.extensions.dragonlance : {};
  const campaign = object(facts.campaign) ? facts.campaign : {};
  const currency = object(extension.currency) ? extension.currency : {};
  const inventory = Array.isArray(resources.inventory) ? resources.inventory.map((item: Obj) => ({
    label: text(item.label, '未命名物品'), quantity: numberOrNull(item.quantity) ?? 0, equipped: item.equipped === true,
    acquisition: text(item.customFacts?.acquisition, '来源未注明'), costCp: numberOrNull(item.customFacts?.costCp),
  })) : [];
  const walletAmount = numberOrNull(currency.emas);
  const sources = Array.isArray(root.rules?.sources) ? root.rules.sources.map((source: Obj) => ({
    book: text(source.book, '未命名来源'), pages: Array.isArray(source.printedPages) ? source.printedPages.filter((p: unknown): p is number => typeof p === 'number') : [],
    section: text(source.section),
  })) : [];
  const books = Array.isArray(facts.magic?.books) ? facts.magic.books.map((book: Obj) => text(book.title || book.name)).filter(Boolean) : [];
  const memory = Array.isArray(facts.magic?.memory) ? facts.magic.memory.map((spell: Obj) => text(spell.displayName || spell.name || spell.id)).filter(Boolean) : [];
  const originalLevel = numberOrNull(career?.level);
  return {
    sourceFormat: 'adnd1e-character', schemaVersion: text(root.schemaVersion, '1.1.0'),
    characterId: text(root.document?.characterId, text(root.characterId, 'imported-character')),
    branchId: text(root.document?.branchId, 'main'), name: text(identity.name, preview.summary.name ?? '未命名人物'),
    race: raceLabels[text(identity.raceId)] ?? text(identity.raceId, '种族未注明'),
    career: careerLabels[text(career?.classId)] ?? text(career?.classId, '职业未注明'), level: originalLevel,
    experience: numberOrNull(career?.xp), alignment: text(identity.alignment, '未注明'), sex: text(identity.sex, '未注明'),
    languages: Array.isArray(identity.languages) ? identity.languages.filter((value: unknown): value is string => typeof value === 'string') : [],
    description: text(identity.description), abilities: Object.keys(abilityLabels).map(key => ({ label: abilityLabels[key], value: numberOrNull(abilities[key]) })),
    maximumHp: hpAward, currentHp: hp.damage === 0 && hpAward !== null ? hpAward : hpAward === null ? null : Math.max(0, hpAward - (numberOrNull(hp.damage) ?? 0)),
    armorClass: numberOrNull(facts.combat?.armorClass), inventory,
    currency: walletAmount === null ? [] : [{ label: text(currency.system, '战役货币'), amount: walletAmount }],
    dailySpellCapacity: extension.dailySpellCapacity ?? null, spellbooks: books, memorizedSpells: memory,
    outstanding: Array.isArray(campaign.admission?.outstanding) ? campaign.admission.outstanding.filter((value: unknown): value is string => typeof value === 'string') : [],
    goals: Array.isArray(campaign.goals) ? campaign.goals.filter((value: unknown): value is string => typeof value === 'string') : [],
    sourceProfile: text(root.rules?.profileId, '来源档案'), sources, originalText,
  };
}
