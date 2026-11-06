import additions from './race-additions.json';
import libraryDetails from './race-details.json';
import type {LibraryDetail,RaceEntry} from '../../schemas';
import {races as base} from './races-base';
export const races:RaceEntry[]=[...base,...additions as RaceEntry[]].map(entry=>({...entry,source:[...entry.source]}));

for (const entry of races) {
 entry.details=(libraryDetails as Record<string,{details:LibraryDetail[]}>)[entry.id]?.details??entry.details??[];
 const sources=[...entry.source,...entry.details.map(detail=>detail.source)];
 entry.source=sources.filter((source,index)=>sources.findIndex(other=>other.book===source.book&&other.section===source.section)===index);
}
