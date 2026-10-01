import type { ClassEntry } from '../../schemas';

export const classes: ClassEntry[] = [
  { id: 'fighter', nameZh: '战士', nameEn: 'Fighter', primeRequisite: 'STR', hitDie: 'd10', alignment: '任意', weapons: '所有', armor: '所有护甲与盾牌', description: '专精武器与近战的基础职业。战士的价值在于稳定的战斗能力、广泛的装备选择与高等级后的战斗成长。', abilities: [{ name: '武器专精（示例）', description: '可按采用的规则扩展处理武器专精。', href: '/combat/weapon-proficiency' }, { name: '多重攻击', description: '高等级战士可以获得额外攻击机会。', href: '/combat/multiple-attacks' }, { name: 'Stronghold', description: '达到适当等级后可建立据点。', href: '/rules/strongholds' }], source: [{ book: 'PHB', page: 22, section: 'Fighter' }] },
  { id: 'magic-user', nameZh: '魔法使用者', nameEn: 'Magic-User', primeRequisite: 'INT', hitDie: 'd4', alignment: '任意', weapons: '有限', armor: '无', description: '以研究法术为核心的施法职业。法术书、准备与施法时机是该职业在战场上的关键。', abilities: [{ name: '法术书', description: '魔法使用者依靠法术书准备可用法术。', href: '/rules/spell-casting' }, { name: '法术进阶', description: '等级表与法术数量应按采用的具体版本维护。', href: '/spells' }], source: [{ book: 'PHB', page: 26, section: 'Magic-User' }] }
];
