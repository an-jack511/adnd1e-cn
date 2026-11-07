import type {Item} from '../../schemas';
import {itemSelectionKind} from '../../utils/item-selection';
export type ItemRole='gear'|'magic'|'weapons'|'ammunition'|'armor'|'shield';
type Entry=Pick<Item,'category'|'subCategory'|'nameZh'|'nameEn'>;
export function itemRoles(item:Entry):ItemRole[]{
 const name=`${item.nameZh} ${item.nameEn}`, roles:ItemRole[]=[itemSelectionKind(item)];
 const ammo=/箭|弩矢|投石索.*(弹|石)|子弹|arrow|bolt|sling bullet/i.test(name)&&! /箭袋|箭筒|quiver|arrow catching|吸箭/i.test(name);
 if(ammo)roles.push('ammunition');
 if(!ammo&&(item.category==='武器'||item.subCategory==='武器'||item.category==='魔法物品'&&/剑|斧|矛|戟|弓|弩|匕首|飞镖|三叉|战锤|硬头锤|连枷|sword|dagger|spear|javelin|crossbow|longbow|shortbow|scimitar|mace|flail|trident|battle axe|war hammer/i.test(name)))roles.push('weapons');
 if(/盾|shield/i.test(name)&&/护甲|盾牌|魔法物品/.test(item.category))roles.push('shield');
 else if(/护甲|甲胄|armor|armour|mail/i.test(name)&&/护甲|盾牌|魔法物品/.test(item.category)&&! /头盔|helmet|披风|bracers/i.test(name))roles.push('armor');
 return [...new Set(roles)];
}
export const acceptsItem=(item:Entry,role:ItemRole)=>itemRoles(item).includes(role);
