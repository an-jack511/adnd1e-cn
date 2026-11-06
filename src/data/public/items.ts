import regional from './regional-items.json';
import type {Item} from '../../schemas';
import {baseItems} from './items-base';
import details from './item-details.json';
import additions from './item-additions.json';
import {classifyItem,isMagicItem} from '../../utils/item-classification';
const enrichment=details as Record<string,Partial<Item>>;
export const items:Item[]=[...baseItems,...additions as Item[],...regional as Item[]].map(item=>{
 const extra=enrichment[item.id]??{};
 const xpValue=item.description.match(/XP[：:]\s*([^；。]+)/)?.[1];
 const next={...item,...extra,...(xpValue?{xpValue}:{})};
 const taxonomy=classifyItem(next);
 const sources=[...next.source,...(next.details??[]).map(detail=>detail.source)];
 return {...next,...taxonomy,nameZh:next.nameZh.replace(/[（(]$/,'').trim(),source:sources.filter((source,i)=>sources.findIndex(other=>other.book===source.book&&other.section===source.section&&other.page===source.page)===i)};
});
export {isMagicItem};
