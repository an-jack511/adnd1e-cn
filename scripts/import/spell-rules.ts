/** Preserve complete spell prose, lists and tables; summaries are only for searching. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {bilingualName} from './bilingual-name';
import {normalizeMarkdownTables} from './markdown-tables';
import topics from '../../src/data/published/books.json';
import type {Spell,LibraryDetail} from '../../src/schemas';
const require=createRequire(import.meta.resolve('astro/package.json'));
const {createMarkdownProcessor}=await import(pathToFileURL(require.resolve('@astrojs/markdown-remark')).href);
const processor=await createMarkdownProcessor({syntaxHighlight:false});
const normalize=(text:string)=>text.toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]/g,'');
const entries=new Map<string,{details:LibraryDetail[];level?:number;className:string}[]>();
for(const topic of topics.filter(topic=>['phb','ua'].includes(topic.book)&&/spell|cantrip/.test(topic.slug))){
 const raw=readFileSync(`src/published/books/${topic.book}/${topic.slug}.md`,'utf8');
 const heads=[...raw.matchAll(/^(#{2,6})\s+(.+)$/gm)];
 for(let i=0;i<heads.length;i++){
  const head=heads[i],title=head[2].replace(/\*/g,'').replace(/<[^>]+>/g,'');
  const name=bilingualName(head[2].match(/^\*([^*]+)\*/)?.[1]??title.replace(/（[^（）]*）$/,'').trim());
  if(!name)continue;
  const end=heads.slice(i+1).find(next=>next[1].length<=head[1].length)?.index??raw.length;
  const chunk=raw.slice(head.index!+head[0].length,end);
  const meta=chunk.match(/<div\s+class="spell-meta"\s*>[\s\S]*?<\/div>/i);
  if(!meta&&!(/cantrip/.test(topic.slug)&&/施法时间/.test(chunk)))continue;
  if(meta&&/^\s*#{2,6}/m.test(chunk.slice(0,meta.index)))continue;
  const body=(meta?chunk.slice(meta.index!+meta[0].length):chunk).trim();
  if(!body)continue;
  const level=meta?Number(meta[0].match(/(?:等级|环级)[^：:]*[：:]<\/strong>\s*(\d+)/)?.[1]??NaN):0;
  const className=/illusionist/.test(topic.slug)?'Illusionist':/cleric/.test(topic.slug)?'Cleric':/druid/.test(topic.slug)?'Druid':/magic-user/.test(topic.slug)?'Magic-User':'';
  const detail:LibraryDetail={title:`${topic.book.toUpperCase()} · ${name.nameZh}`,html:(await processor.render(normalizeMarkdownTables(body))).code,source:{book:topic.book.toUpperCase(),section:title},href:`/books/${topic.book}/${topic.slug}/`};
  const key=topic.book+':'+normalize(name.nameEn),previous=entries.get(key)??[];
  previous.push({details:[detail],level:Number.isFinite(level)?level:undefined,className});entries.set(key,previous);
 }
}
let count=0;const missing:string[]=[];
for(const filename of ['spells-imported','ua-spells-imported']){
 const path=`src/data/public/${filename}.json`,data=JSON.parse(readFileSync(path,'utf8')) as Spell[];
 for(const spell of data){
  const book=filename==='spells-imported'?'phb':'ua';
  const matches=(entries.get(book+':'+normalize(spell.nameEn))??[]).filter(entry=>(entry.level===undefined||entry.level===spell.level)&&(!entry.className||spell.classes.includes(entry.className)));
  if(matches.length){spell.details=matches.flatMap(entry=>entry.details);count++;}
  else missing.push(spell.id);
 }
 writeFileSync(path,JSON.stringify(data,null,2)+'\n');
}
if(missing.length)throw Error(`Missing full spell rules: ${missing.join(', ')}`);
console.log(`Preserved complete rules for ${count} PHB/UA spells, including all effect tables.`);
