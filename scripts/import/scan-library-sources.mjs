// @ts-nocheck
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.resolve('astro/package.json'));
const {createMarkdownProcessor}=await import(pathToFileURL(require.resolve('@astrojs/markdown-remark')).href);
const processor=await createMarkdownProcessor({syntaxHighlight:false});
const topics=JSON.parse(readFileSync('src/data/published/books.json','utf8'));
const books=new Set(['phb','dmg','ua','oa','dla','gha','greyhawk-adventures','dsg','wsg','fr','ilh','gh-boxed','gh-folio','ref5','motp']);
const out=[];
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g,' ').trim();
for(const topic of topics){
 if(!books.has(topic.book)||/spell-explanations|spells-\d|monster|creature|npcs|appendix-[abc][^-]/.test(topic.slug))continue;
 if(topic.book==='dmg' && /^treasure-continuation/.test(topic.slug))continue;
 let raw=readFileSync(`src/published/books/${topic.book}/${topic.slug}.md`,'utf8');
 if(topic.book==='dmg' && topic.slug==='dmg-treasure') {
  const continuations=topics.filter(t=>t.book==='dmg' && /^treasure-continuation/.test(t.slug)).sort((a,b)=>(+(a.slug.match(/-(\d+)$/)?.[1]??1))-(+(b.slug.match(/-(\d+)$/)?.[1]??1)));
  raw=[raw,...continuations.map(t=>`<!-- library-topic=${t.slug} -->\n`+readFileSync(`src/published/books/dmg/${t.slug}.md`,'utf8'))].join('\n\n');
 }
 const rendered=(await processor.render(raw)).code.replace(/<h[1-6]\b[^>]*>第\s*\d+\s*页[^<]*<\/h[1-6]>/g,'');
 // Older translations use bold bilingual labels in place of headings.
 const structured=rendered.replace(/<p>\s*<(?:strong|b)>([^<]{2,100})<\/(?:strong|b)>\s*<\/p>/gi,(tag,label)=> /[\u3400-\u9fff].*?[A-Z][a-z]/.test(label) && !/[;；，:：]/.test(label) && !/XP|AC|DMG|PHB/.test(label) ? `<h4>${label.replace(/[。.:：]$/,'')}</h4>` : tag);
 const heads=[...structured.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g)].map(m=>({level:+m[1],start:m.index,end:m.index+m[0].length,title:text(m[3]),anchor:m[2].match(/id="([^"]+)"/)?.[1]??''}));
 const blocks=heads.map((h,i)=>({...h,origin:[...structured.slice(0,h.start).matchAll(/<!-- library-topic=([^ ]+) -->/g)].at(-1)?.[1]??topic.slug,html:structured.slice(h.end,heads.slice(i+1).find(n=>n.level<=h.level)?.start??structured.length)}));
 out.push({book:topic.book,slug:topic.slug,title:topic.title,sourceFile:topic.sourceFile,html:structured,blocks});
}
writeFileSync('.git/library-sources.json',JSON.stringify(out));console.log(`${out.length} chapters, ${out.reduce((n,x)=>n+x.blocks.length,0)} headings`);
