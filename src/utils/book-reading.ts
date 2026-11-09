import original from '../data/public/book-reading.json';
import outlines from '../data/public/book-outlines.json';
import phbPlan from '../data/public/phb-reading-plan.json';

export type SourceChapter={title:string;href:string;sections:number};
export type ReadingPart=SourceChapter & {parentSource?:{title:string;href:string}};
export type ReadingChapter=SourceChapter & {parts:ReadingPart[];parentHref?:string;showParts?:boolean;introduction?:string};
export type ReadingGroup={title:string;chapters:ReadingChapter[]};
export const chapterId=(href:string)=>href.split('/').pop()!.replace(/^(?:chapter|read)-/,'').replace('.html','');
export const readingHref=(book:string,href:string)=>`/read/${book}/${chapterId(href)}/`;
export const isOverview=(title:string)=>/章节导读|Chapter Overview/.test(title);
const cleanContinuationLabel=(title:string)=>title.replace(/[（(]续[）)]/g,'');
type Outline={title:string;href:string;children:Outline[]};
const parentSources=new Map<string,{title:string;href:string}>();
function visit(node:Outline){
 for(const child of node.children){
  if(isOverview(child.title))parentSources.set(chapterId(child.href),{title:node.title,href:`/archive/phb/${node.href}`});
  visit(child);
 }
}
for(const node of outlines.phb)visit(node);
const phbSources=new Map(original.phb.flatMap(group=>group.chapters).map(chapter=>[chapterId(chapter.href),chapter]));
const phb:ReadingGroup[]=phbPlan.map(group=>({title:cleanContinuationLabel(group.title),chapters:group.chapters.map(spec=>{
 const parts=spec.parts.map(id=>{
  const source=phbSources.get(id);
  if(!source)throw new Error(`PHB reading plan references missing chapter ${id}`);
  return {...source,parentSource:parentSources.get(id)};
 });
 const options=spec as typeof spec & {parent?:string;showParts?:boolean;introduction?:string};
 return {title:cleanContinuationLabel(spec.title),href:parts[0].href,sections:parts.reduce((sum,part)=>sum+part.sections,0),parts:parts.map(part=>({...part,title:cleanContinuationLabel(part.title),parentSource:part.parentSource&&{...part.parentSource,title:cleanContinuationLabel(part.parentSource.title)}})),
  parentHref:options.parent?`/archive/phb/chapter-${options.parent}.html`:undefined,
  showParts:options.showParts,introduction:options.introduction};
})}));

export const reading:Record<string,ReadingGroup[]>=Object.fromEntries(Object.entries(original).map(([book,groups])=>[book,book==='phb'?phb:groups.map(group=>({...group,title:cleanContinuationLabel(group.title),chapters:group.chapters.map(chapter=>({...chapter,title:cleanContinuationLabel(chapter.title),parts:[{...chapter,title:cleanContinuationLabel(chapter.title)}]}))}))]));

/** Old chapter routes render the same combined unit, opening at the original section.
 * Both namespaced citation fragments and legacy files remain valid.
 */
export function readingRoutes(){
 return Object.entries(reading).flatMap(([book,groups])=>groups.flatMap(group=>group.chapters.flatMap(chapter=>{
  const starts=new Map(chapter.parts.map(part=>[chapterId(part.href),`read-${chapterId(part.href)}`]));
  for(const part of chapter.parts)if(part.parentSource)starts.set(chapterId(part.parentSource.href),`read-${chapterId(part.parentSource.href)}`);
  if(chapter.introduction)starts.set(chapter.introduction,`read-${chapter.introduction}`);
  return [...starts].map(([id,start])=>({params:{book,chapter:id},props:{book,chapter,start:id===chapterId(chapter.href)?undefined:start}}));
 })));
}
