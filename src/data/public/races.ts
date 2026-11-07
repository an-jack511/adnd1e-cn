import dragon from './dragon-races.json';
import additions from './race-additions.json';
import libraryDetails from './race-details.json';
import type {LibraryDetail,RaceEntry} from '../../schemas';
import {races as base} from './races-base';
import versions from './dragon-race-versions.json';
import {mergeDragonIdentities} from '../../utils/merge-dragon-identities';
export const bookRaces:RaceEntry[]=[...base,...additions as RaceEntry[]].map(entry=>({...entry,source:[...entry.source]}));

for (const entry of bookRaces) {
 entry.details=(libraryDetails as Record<string,{details:LibraryDetail[]}>)[entry.id]?.details??entry.details??[];
 const sources=[...entry.source,...entry.details.map(detail=>detail.source)];
 entry.source=sources.filter((source,index)=>sources.findIndex(other=>other.book===source.book&&other.section===source.section)===index);
}
export const races=mergeDragonIdentities(bookRaces,dragon as RaceEntry[],versions);
const halfOgre=races.find(entry=>entry.id==='dragon-029-race-half-ogre-smiting-him-hip-and-thigh-the');
if(halfOgre){halfOgre.aliases=[...(halfOgre.aliases??[]),halfOgre.nameZh,halfOgre.nameEn];halfOgre.nameZh='半食人魔';halfOgre.nameEn='Half-Ogre';}
