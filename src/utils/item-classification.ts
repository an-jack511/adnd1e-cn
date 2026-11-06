import type {Item} from '../schemas';
export function isMagicItem(item:Pick<Item,'category'|'tags'|'id'>):boolean {
 return /魔法|神器/.test(item.category)||item.tags.some(tag=>/^(魔法|神器|魔法物品)$/.test(tag))||item.id.startsWith('ref5-');
}
export function classifyItem(item:Item):{category:string;subCategory:string} {
 const text=[item.nameZh,item.nameEn].join(' ');
 if(isMagicItem(item)) {
  const type=/神器|artifact|relic/i.test(item.category+' '+item.tags.join(' '))?'神器与遗物'
   :/药水|油剂|灵药|媚药|滤剂|药剂|药膏|\b(potion|oil|elixir|philter|ointment)\b/i.test(text)?'药水与油剂'
   :/卷轴|\bscroll\b/i.test(text)?'卷轴'
   :/护甲|龙甲|板甲|链甲|盾牌|\b(armor|armour|mail|shield)\b/i.test(text)&&! /\bWarlord Blade\b/i.test(item.nameEn)?'护甲与盾牌'
   :/戒指|之戒|\bring\b/i.test(text)?'戒指'
   :/权杖|\brod\b/i.test(text)?'权杖'
   :/法杖|蛇杖|\bstaff\b/i.test(text)?'法杖'
   :/魔杖|\bwand\b/i.test(text)?'魔杖'
   :/魔法武器/.test(item.category)||/\b(sword|axe|mace|dagger|arrow|bolt|spear|javelin|hammer|flail|scimitar|dragonlance|bow|crossbow|morning star|military pick|trident|sling|dart|knife|quarterstaff|hornblade|blade|whip|razor claws|equalizer)\b/i.test(text)&&!/^Arrow of Direction$/i.test(item.nameEn)?'武器'
   :/靴|鞋|斗篷|长袍|腰带|手套|头环|头盔|护腕|冠|\b(boots?|cloak|robe|girdle|gloves?|hat|helm|bracers?|crown)\b/i.test(text)?'穿戴物品'
   :/圣徽|护符|印|\b(amulet|talisman|symbol|seal)\b|^Charm of /i.test(text)?'护符与圣徽':'奇物';
  return {category:'魔法物品',subCategory:type};
 }
 const category=item.category==='武器'?'武器':item.category==='护甲'?'护甲与盾牌'
  :/动物|牲畜/.test(item.category)?'动物与坐骑'
  :/交通|运输|马具|挽具/.test(item.category)?'运输与骑乘'
  :/食物|补给|药草|消耗品/.test(item.category)&&!/容器/.test(item.category)?'补给与消耗品'
  :/衣物/.test(item.category)?'衣物'
  :/宗教/.test(item.category)?'宗教与施法用品':'冒险装备';
 const subCategory=category==='武器'?(/\b(arrow|quarrel|bolt|bullet)\b/i.test(text)?'弹药':/\b(bow|crossbow|sling|shuriken|dart)\b/i.test(text)?'远程与投掷武器':/长柄|\b(pike|pole|glaive|guisarme|bardiche|halberd|voulge)\b/i.test(text)?'长柄武器':'近战武器')
 :category==='护甲与盾牌'?(/盾|\bshield\b/i.test(text)?'盾牌':/盔|胄|\bhelm/i.test(text)?'头盔与部件':'护甲')
 :/容器|背包|袋|瓶|壶|桶|箱|\b(backpack|sack|flask|bottle|chest|box)\b/i.test(text)?'容器'
 :/光照|灯|火把|蜡烛|\b(lantern|torch|candle)\b/i.test(text)?'照明'
 :/攀爬|绳|钩|\b(rope|grapnel|piton)\b/i.test(text)?'攀爬与绳具'
 :item.category==='工具/武器'?'工具':item.category;
 return {category,subCategory};
}
