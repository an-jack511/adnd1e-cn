import additions from './class-additions.json';
import libraryDetails from './class-details.json';
import type {LibraryDetail,ClassEntry} from '../../schemas';
import {classes as base} from './classes-base';
export const classes:ClassEntry[]=[...base,...additions as ClassEntry[]].map(entry=>({...entry,source:[...entry.source]}));

for (const entry of classes) {
 entry.details=(libraryDetails as Record<string,{details:LibraryDetail[]}>)[entry.id]?.details??entry.details??[];
 const sources=[...entry.source,...entry.details.map(detail=>detail.source)];
 entry.source=sources.filter((source,index)=>sources.findIndex(other=>other.book===source.book&&other.section===source.section)===index);
}
