/** Rebuild reading text from complete Markdown; never reuse flattened summaries. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import type {Monster} from '../../src/schemas';
import ruleText from '../rehype-rule-text';
import {normalizeMarkdownTables} from './markdown-tables';
import ffChapters from '../../src/data/public/ff-monster-chapters.json';
import mm2Chapters from '../../src/data/public/mm2-monster-chapters.json';
import topics from '../../src/data/published/books.json';
const require=createRequire(import.meta.resolve('astro/package.json'));
const {createMarkdownProcessor}=await import(pathToFileURL(require.resolve('@astrojs/markdown-remark')).href);
const processor=await createMarkdownProcessor({syntaxHighlight:false,rehypePlugins:[ruleText]});
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
type Reading={html:string;headings:{id:string;title:string}[];collection:boolean;href:string};
const output:Record<string,Reading>={};
for(const [book,file,chapters] of [['mm','monsters-imported',{}],['ff','ff-monsters-imported',ffChapters],['mm2','mm2-monsters-imported',mm2Chapters]] as const){
 const monsters=JSON.parse(readFileSync(`src/data/public/${file}.json`,'utf8')) as Monster[];
 for(const monster of monsters){
  let topic=(chapters as Record<string,string>)[monster.id]??`mm/mm-${monster.id}`;
  if(monster.id==='rat-giant')topic='mm/mm-giant-rat';
  if(!existsSync(`src/published/books/${topic}.md`)&&book==='mm'){
   const alternate=monster.id.endsWith('-giant')?`mm/mm-giant-${monster.id.slice(0,-6)}-retranslation`:`mm/mm-${monster.id==='elf'?'elves':monster.id}-retranslation`;
   if(existsSync(`src/published/books/${alternate}.md`))topic=alternate;
   else {const match=topics.find(entry=>entry.book==='mm'&&normalize(entry.titleEn)===normalize(monster.nameEn));if(match)topic=`mm/${match.slug}`;}
  }
  const path=`src/published/books/${topic}.md`;
  if(!existsSync(path))continue;
  let body=readFileSync(path,'utf8');
  if(book!=='mm'){
   const headings=[...body.matchAll(/^(#{1,6})\s+(.+)$/gm)];
   const name=normalize(monster.nameEn);
   const matches=headings.filter(head=>normalize(head[2]).includes(name));
   const head=matches.sort((a,b)=>normalize(a[2]).length-normalize(b[2]).length)[0];
   if(head){
    const end=headings.find(next=>next.index!>head.index!&&next[1].length<=head[1].length)?.index??body.length;
    body=body.slice(head.index!+head[0].length,end);
   }else if(Object.values(chapters).filter(value=>value===topic).length!==1)continue;
  }else{
   // Single-creature chapters may repeat the entry title. Preserve subsection titles.
   body=body.replace(/^#\s+[^\n]+\r?\n/,'');
  }
  const collection=(body.match(/^\|\s*项目\s*\|\s*(?:数据|数值)\s*\|/gm)??[]).length>1;
  const result=await processor.render(normalizeMarkdownTables(body));
  const headings=[...result.code.matchAll(/<h([2-6])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)].map(head=>({id:head[2],title:head[3].replace(/<[^>]*>/g,'')}));
  output[monster.id]={html:result.code,headings,collection,href:`/books/${topic}/`};
 }
}
writeFileSync('src/data/public/monster-reading.json',JSON.stringify(output,null,2)+'\n');
console.log(`Preserved complete reading text for ${Object.keys(output).length} monsters; ${Object.values(output).filter(value=>value.collection).length} collections retain individual stat blocks.`);
