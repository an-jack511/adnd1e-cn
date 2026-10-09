import type { Monster } from '../../schemas';
import imported from './monsters-imported.json';
import ffImported from './ff-monsters-imported.json';
import mm2Imported from './mm2-monsters-imported.json';
import { oaMonsters } from './oa-monsters';
import { ref3Monsters } from './ref3-monsters';
import { ref4Monsters } from './ref4-monsters';
import { ref5Monsters } from './ref5-monsters';
import { dlaMonsters } from './dla-monsters';
import { ghaMonsters } from './gha-monsters';

const examples: Monster[] = [
  { id: 'owlbear', nameZh: '枭熊', nameEn: 'Owlbear', frequency: '罕见', numberAppearing: '1d4', armorClass: 5, movement: '12"', hitDice: '5+2', inLair: '20%', treasureType: '无', attacks: '2 爪 / 1 咬', damage: '1d6/1d6/1d6', specialAttacks: '拥抱', specialDefenses: '无', magicResistance: '标准', intelligence: '动物', alignment: '中立', size: '大型', psionics: '无', environment: '森林', description: '凶猛的混合兽，拥有羽毛、利爪与强大的拥抱攻击。', illustration: { src: '/assets/monsters/owlbear.svg', source: 'Monster Manual', page: 77 }, source: [{ book: 'MM', page: 77 }] },
  { id: 'goblin', nameZh: '哥布林', nameEn: 'Goblin', frequency: '常见', numberAppearing: '40–400', armorClass: 6, movement: '6"', hitDice: '1-1', inLair: '40%', treasureType: 'C', attacks: '1', damage: '1d6 或武器', specialAttacks: '无', specialDefenses: '无', magicResistance: '标准', intelligence: '平均', alignment: '混乱邪恶', size: '小型', psionics: '无', environment: '地下/丘陵', description: '群居的地精类生物，偏好伏击与数量优势。', source: [{ book: 'MM', page: 47 }] },
  { id: 'orc', nameZh: '兽人', nameEn: 'Orc', frequency: '常见', numberAppearing: '30–100', armorClass: 6, movement: '9"', hitDice: '1', inLair: '40%', treasureType: 'D', attacks: '1', damage: '1d8 或武器', specialAttacks: '无', specialDefenses: '无', magicResistance: '标准', intelligence: '平均', alignment: '混乱邪恶', size: '中型', psionics: '无', environment: '任何', description: '好战且组织松散的类人生物，常以部落形式活动。', source: [{ book: 'MM', page: 75 }] },
  { id: 'kobold', nameZh: '狗头人', nameEn: 'Kobold', frequency: '常见', numberAppearing: '40–400', armorClass: 7, movement: '6"', hitDice: '½', inLair: '40%', treasureType: 'J', attacks: '1', damage: '1d4 或武器', specialAttacks: '无', specialDefenses: '无', magicResistance: '标准', intelligence: '平均', alignment: '守序邪恶', size: '小型', psionics: '无', environment: '地下', description: '小型、警觉并擅长利用陷阱的类人生物。', source: [{ book: 'MM', page: 53 }] },
  { id: 'ogre', nameZh: '食人魔', nameEn: 'Ogre', frequency: '常见', numberAppearing: '2d6', armorClass: 5, movement: '9"', hitDice: '4+1', inLair: '30%', treasureType: 'D', attacks: '1', damage: '1d10 或武器', specialAttacks: '无', specialDefenses: '无', magicResistance: '标准', intelligence: '低下', alignment: '混乱邪恶', size: '大型', psionics: '无', environment: '任何', description: '体型巨大的类人生物，通常携带粗重武器与杂物。', source: [{ book: 'MM', page: 75 }] },
  { id: 'skeleton', nameZh: '骷髅', nameEn: 'Skeleton', frequency: '常见', numberAppearing: '3–30', armorClass: 7, movement: '12"', hitDice: '1', inLair: '无', treasureType: '无', attacks: '1', damage: '1d6 或武器', specialAttacks: '无', specialDefenses: '免疫睡眠、魅惑', magicResistance: '标准', intelligence: '无', alignment: '中立邪恶', size: '中型', psionics: '无', environment: '任何', description: '由死灵力量驱动的无生命骨骼，执行简单命令。', source: [{ book: 'MM', page: 88 }] },
  { id: 'zombie', nameZh: '僵尸', nameEn: 'Zombie', frequency: '常见', numberAppearing: '2–24', armorClass: 8, movement: '6"', hitDice: '2', inLair: '无', treasureType: '无', attacks: '1', damage: '1d8', specialAttacks: '无', specialDefenses: '免疫睡眠、魅惑', magicResistance: '标准', intelligence: '无', alignment: '中立邪恶', size: '中型', psionics: '无', environment: '任何', description: '缓慢而顽强的无生命生物，常被用于守卫与劳役。', source: [{ book: 'MM', page: 100 }] },
  { id: 'giant-rat', nameZh: '巨鼠', nameEn: 'Giant Rat', frequency: '常见', numberAppearing: '3–30', armorClass: 7, movement: '12"', hitDice: '½', inLair: '10%', treasureType: '无', attacks: '1', damage: '1d3', specialAttacks: '疾病', specialDefenses: '无', magicResistance: '标准', intelligence: '动物', alignment: '中立', size: '小型', psionics: '无', environment: '地下/城市', description: '适应阴暗环境的啮齿动物，咬伤可能传播疾病。', source: [{ book: 'MM', page: 82 }] },
  { id: 'giant-spider', nameZh: '巨型蜘蛛', nameEn: 'Giant Spider', frequency: '不常见', numberAppearing: '1–4', armorClass: 4, movement: '18"', hitDice: '2+2', inLair: '30%', treasureType: 'J', attacks: '1', damage: '1d6 + 毒', specialAttacks: '毒、蛛网', specialDefenses: '无', magicResistance: '标准', intelligence: '动物', alignment: '中立', size: '大型', psionics: '无', environment: '森林/地下', description: '会结网并使用毒素捕食的巨型节肢动物。', source: [{ book: 'MM', page: 91 }] },
  { id: 'young-red-dragon', nameZh: '幼年红龙', nameEn: 'Young Red Dragon', frequency: '极罕见', numberAppearing: '1', armorClass: 0, movement: '9"/24"', hitDice: '10', inLair: '25%', treasureType: 'H', attacks: '2 爪 / 1 咬', damage: '1d8/1d8/2d10', specialAttacks: '吐息、法术', specialDefenses: '免疫火焰', magicResistance: '标准', intelligence: '卓越', alignment: '混乱邪恶', size: '大型', psionics: '无', environment: '山地', description: '拥有炽热吐息的年轻红龙示例；完整龙类成长阶段另行整理。', illustration: { src: '/assets/monsters/dragon.svg', source: 'Monster Manual', page: 30 }, source: [{ book: 'MM', page: 30 }] }
];

const importedMonsters = imported as Monster[];
const ffMonsters = ffImported as Monster[];
const mm2Monsters = mm2Imported as Monster[];
const importedIds = new Set(importedMonsters.map((monster) => monster.id));
const oaIds = new Set(oaMonsters.map((monster) => monster.id));
export const monsters: Monster[] = [
  ...importedMonsters.map((monster) => ({ ...monster, illustration: examples.find((entry) => entry.id === monster.id)?.illustration ?? monster.illustration })),
  ...ffMonsters.filter((monster) => !importedIds.has(monster.id)),
  ...mm2Monsters.filter((monster) => !importedIds.has(monster.id) && !ffMonsters.some((entry) => entry.id === monster.id)),
  ...oaMonsters.filter((monster) => !importedIds.has(monster.id)),
  ...ref3Monsters,
  ...ref4Monsters,
  ...ref5Monsters,
  ...dlaMonsters,
  ...ghaMonsters,
  ...examples.filter((monster) => !importedIds.has(monster.id) && !oaIds.has(monster.id) && !ffMonsters.some((entry) => entry.id === monster.id))
];
