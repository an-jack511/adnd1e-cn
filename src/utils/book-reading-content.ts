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

/** Keep image descriptions useful to readers without exposing production-process notes. */
function normalizeIllustrationMetadata(content:string) {
 return content
  .replace(/(<img\b[^>]*\balt=")([^"]*)("[^>]*>)/gi,(_all,prefix:string,alt:string,suffix:string)=>{
   const cleaned=alt
    .replace(/\s*imagegen\s*/gi,' ')
    .replace(/生成式清晰化版本|清晰化版本|保形清晰化|进一步清晰化|扫描清晰化|进一步清晰修复版|清晰修复版|清晰修复图|修复版|修复图|清晰版|清晰化|插图裁片|地图裁片|裁片/gi,'')
    .replace(/\s{2,}/g,' ')
    .replace(/\s*，\s*$/,'')
    .replace(/\s*的\s*$/,'')
    .trim();
   return `${prefix}${cleaned}${suffix}`;
  })
  .replace(/待逐页图像清晰化汉化后同步网站。/g,'相关页面保留原书图像与版权信息。')
  .replace(/待索引内容单独裁切、清晰化并汉化后再加入阅读版。/g,'索引内容按原书版式保留在对应页面中。');
}
/** Remove duplicated transliterations accidentally inserted between a translated spell name and its English original. */
function normalizeNamedSpellDisplay(content:string) {
 return content
  .replaceAll('德罗米吉的即时召唤 卓姆吉（Drawmij）\'s Instant Summons','卓姆吉的即时召唤 Drawmij\'s Instant Summons')
  .replaceAll('魔邓肯的猎犬 魔邓肯（Mordenkainen）\'s Hound','魔邓肯的猎犬 Mordenkainen\'s Hound')
  .replaceAll('魔邓肯豪宅术 魔邓肯\'s Magnificent Mansion','魔邓肯豪宅术 Mordenkainen\'s Magnificent Mansion')
  .replaceAll('魔邓肯的解离术 魔邓肯\'s Disjunction','魔邓肯的解离术 Mordenkainen\'s Disjunction')
  .replaceAll('欧提路克的冻寒球 欧提路克（Otiluke）\'s Freezing Sphere','欧提路克的冻寒球 Otiluke\'s Freezing Sphere')
  .replaceAll('欧提路克的抗性球 欧提路克\'s Resilient Sphere','欧提路克的抗性球 Otiluke\'s Resilient Sphere')
  .replaceAll('欧提路克的传送球 欧提路克\'s Telekinetic Sphere','欧提路克的传送球 Otiluke\'s Telekinetic Sphere')
  .replaceAll('拉瑞的记忆增强 拉瑞（Rary）\'s Mnemonic Enhancer','拉瑞的记忆增强 Rary\'s Mnemonic Enhancer')
  .replaceAll('拉瑞的记忆增强 拉瑞\'s Mnemonic Enhancer','拉瑞的记忆增强 Rary\'s Mnemonic Enhancer')
  .replaceAll('谭森的变身 谭森（Tenser）\'s Transformation','谭森的变身 Tenser\'s Transformation')
  .replaceAll('谭森的变身 谭森\'s Transformation','谭森的变身 Tenser\'s Transformation')
  .replaceAll('奈斯图的魔法灵光 涅斯图（Nystul）\'s Magic Aura','涅斯图的魔法灵光 Nystul\'s Magic Aura');
}
/** Remove spaces left between adjacent Chinese text after bilingual source cleanup. */
function normalizeChineseSpacing(content:string) {
 return content
  .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g,'$1')
  .replace(/([\u3400-\u9fff])\s+(?=[，。；：！？、）】》』”’])/g,'$1')
  .replace(/([（【《『“‘])\s+(?=[\u3400-\u9fff])/g,'$1');
}
function normalizeReadingTerminology(book:string,content:string) {
 return content
  .replaceAll('游侠','巡林客')
  .replaceAll('魔法使用者与附魔生物','施法生物与附魔生物')
  .replaceAll('魔法使用者','魔法师')
  .replaceAll('非武器专长','非武器熟练项')
  .replaceAll('武器专长','武器熟练项')
  .replaceAll('角色专长','角色熟练项')
  .replaceAll('改进专长','改进熟练项')
  .replaceAll('初始专长','初始熟练项')
  .replaceAll('获得的专长','获得的熟练项')
  .replaceAll('额外专长','额外熟练项')
  .replaceAll('一项新专长','一项新熟练项')
  .replaceAll('已有专长','已有熟练项')
  .replaceAll('该专长','该熟练项')
  .replaceAll('所用专长','所用熟练项')
  .replaceAll('专长相关','熟练项相关')
  .replaceAll('专长支配','熟练项支配')
  .replaceAll('专长检定','熟练项检定')
  .replaceAll('专长栏位','熟练项栏位')
  .replaceAll('专长 Proficiency','熟练项 Proficiency')
  .replaceAll('THACO','THAC0');
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
 if(book!=='phb')return formatRuleHtml(normalizeChineseSpacing(normalizeReadingTerminology(book,normalizeNamedSpellDisplay(normalizeIllustrationMetadata(normalizeIllustrationPairs(article(read(chapter.href))))))));
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
 return formatRuleHtml(normalizeChineseSpacing(normalizeReadingTerminology(book,normalizeNamedSpellDisplay(normalizeIllustrationMetadata(normalizeIllustrationPairs(phbHeadings(parts.join('\n'),chapter.title,parts.length>1)))))));
}

export function readerTitle(title:string){
 const [chinese,...english]=title.split(' · ');
 return `<h1>${escape(chinese)}${english.length?`<small lang="en">${escape(english.join(' · '))}</small>`:''}</h1>`;
}
