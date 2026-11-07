import dragon from './dragon-classes.json';
import additions from './class-additions.json';
import libraryDetails from './class-details.json';
import type {LibraryDetail,ClassEntry} from '../../schemas';
import {classes as base} from './classes-base';
import versions from './dragon-class-versions.json';
import {mergeDragonIdentities} from '../../utils/merge-dragon-identities';
export const bookClasses:ClassEntry[]=[...base,...additions as ClassEntry[]].map(entry=>({...entry,source:[...entry.source]}));

for (const entry of bookClasses) {
 entry.details=(libraryDetails as Record<string,{details:LibraryDetail[]}>)[entry.id]?.details??entry.details??[];
 const sources=[...entry.source,...entry.details.map(detail=>detail.source)];
 entry.source=sources.filter((source,index)=>sources.findIndex(other=>other.book===source.book&&other.section===source.section)===index);
}
export const classes=mergeDragonIdentities(bookClasses,dragon as ClassEntry[],versions);
const alchemist=classes.find(entry=>entry.id==='dragon-045-class-alchemist-npc');
if(alchemist){alchemist.aliases=[...(alchemist.aliases??[]),alchemist.nameZh,alchemist.nameEn];alchemist.nameZh='炼金师';alchemist.nameEn='Alchemist';}
