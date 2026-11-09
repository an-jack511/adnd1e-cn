import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chapterId,isOverview,type ReadingChapter} from './book-reading';
import {formatRuleHtml} from './rule-text';

const article=(raw:string)=>raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)![1];
const read=(href:string)=>readFileSync(resolve('public',href.replace(/^\//,'')),'utf8');
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');

/** Prefer a curated/repaired illustration when a page embeds its source crop beside it. */
function normalizeIllustrationPairs(content:string) {
 return content.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi,(_all,attrs:string,body:string)=>{
  const tags=[...body.matchAll(/<img\b[^>]*>/gi)].map(match=>match[0]);
  if(tags.length<2||!tags.some(tag=>/清晰修复版|进一步清晰修复版|修复版/i.test(tag))) return _all;
  const seen=new Set<string>();
  const cleaned=body.replace(/<img\b[^>]*>/gi,(tag:string)=>{
   const src=tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]??tag;
   const repaired=/清晰修复版|进一步清晰修复版|修复版/i.test(tag);
   const original=/原图|原书插图/i.test(tag);
   if((original&&!repaired)||seen.has(src)) return '';
   seen.add(src);
   return tag;
  });
  return `<p${attrs}>${cleaned}</p>`;
 });
}
function normalizeReadingTerminology(book:string,content:string) {
 return content.replaceAll('游侠','巡林客');
}
export const headingLabel=(html:string)=>html.replace(/<[^>]+>/g,'').split(/\s+·\s+|\s+(?=[A-Z])/)[0].replace(/[\s：:·（）()]/g,'');

/** Parent text used to be omitted when the original outline had child pages. */
function parentContent(href:string){
 const prefix=`read-${chapterId(href)}`;
 let content=article(read(href))
  .replace(/<p\b[^>]*class="(?:breadcrumbs|reading-order)"[^>]*>[\s\S]*?<\/p>/gi,'')
  .replace(/<div\b[^>]*class="section-contents"[^>]*>[\s\S]*?<\/div>/gi,'')
  .replace(/<p\b[^>]*>\s*本目录下的子页面分别说明各项属性及其对应表格。\s*<\/p>/gi,'');
 content=content.replace(/\bid="([^"]+)"/g,(_all,id)=>`id="${prefix}-${id}"`)
  .replace(/href="#([^"]+)"/g,(_all,id)=>`href="#${prefix}-${id}"`);
 const prose=content.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi,'').replace(/<[^>]+>/g,'').trim();
 if(!prose&&!/<(?:table|img)\b/i.test(content))content=content.replace(/<h[1-6]\b([^>]*)>[\s\S]*?<\/h[1-6]>/gi,'<span$1 class="heading-anchor"></span>');
 return `<section class="chapter-section" id="${prefix}">${content}</section>`;
}

/** Captions and table notes stay with the table, rather than becoming chapters. */
export function phbHeadings(html:string,chapterTitle:string,merged:boolean):string {
 const seen=new Set([headingLabel(chapterTitle)]);
 const englishRoot=chapterTitle.split(' · ')[1]?.toLowerCase();
 let omittedRoot=false;
 html=html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,(_all,level,attrs,body)=>{
  const label=headingLabel(body);
  const sameRoot=Number(level)===1&&!!englishRoot&&body.replace(/<[^>]+>/g,'').split(' · ')[1]?.toLowerCase()===englishRoot;
  if(Number(level)===1)omittedRoot=isOverview(body)||seen.has(label)||sameRoot;
  if(isOverview(body)||seen.has(label)||sameRoot)return `<span${attrs} class="heading-anchor"></span>`;
  seen.add(label);
  if(/(?:表.*(?:注释|说明)|Notes (?:Regarding|on) .*Table)/i.test(body))return `<p${attrs} class="table-note-heading"><strong>${body}</strong></p>`;
  // The page owns h1. Combined source sections begin at h2.
  const depth=Number(level)===1?2:Math.min(6,Number(level)+(merged&&!omittedRoot?1:0));
  return `<h${depth}${attrs}>${body}</h${depth}>`;
 });
 // The generated figure already has its caption and citation link.
 return html.replace(/<p\b[^>]*class="table-caption"[^>]*>[\s\S]*?<\/p>(\s*<figure\b)/gi,'$1');
}

export function readingContent(book:string,chapter:ReadingChapter):string {
 if(book!=='phb')return formatRuleHtml(normalizeReadingTerminology(book,normalizeIllustrationPairs(article(read(chapter.href)))));
 const parts=chapter.parts.map(part=>{
  let content=article(read(part.href));
  if(chapter.parts.length===1&&!part.parentSource&&!chapter.introduction)content=content.replace(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i,'<span$1 class="heading-anchor"></span>');
  if(part.parentSource){
   // Keep legacy anchors/illustrations but drop the editorial placeholder sentence.
   content=content.replace(/<p\b[^>]*>\s*本(?:章|目录|节)[\s\S]*?<\/p>/gi,'');
   content=parentContent(part.parentSource.href)+content;
  }
  return content;
 });
 if(chapter.introduction)parts.unshift(parentContent(`/archive/phb/read-${chapter.introduction}.html`));
 return formatRuleHtml(normalizeReadingTerminology(book,normalizeIllustrationPairs(phbHeadings(parts.join('\n'),chapter.title,parts.length>1))));
}

export function readerTitle(title:string){
 const [chinese,...english]=title.split(' · ');
 return `<h1>${escape(chinese)}${english.length?`<small lang="en">${escape(english.join(' · '))}</small>`:''}</h1>`;
}
