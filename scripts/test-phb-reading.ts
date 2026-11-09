import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import original from '../src/data/public/book-reading.json';
import {reading,readingRoutes,chapterId,isOverview} from '../src/utils/book-reading';
import {readingContent,readerTitle,phbHeadings} from '../src/utils/book-reading-content';

const chapters=reading.phb.flatMap(group=>group.chapters);
const sources=original.phb.flatMap(group=>group.chapters);
assert.deepEqual(chapters.flatMap(chapter=>chapter.parts.map(part=>part.href)).sort(),sources.map(chapter=>chapter.href).sort(),'Every source chapter is included exactly once');
assert.ok(chapters.length<sources.length*.65,'Related short sections reduce page turns');
assert.ok(chapters.every(chapter=>!isOverview(chapter.title)&&!/表.*注释/.test(chapter.title)),'No overview/table-note chapters');
const routes=readingRoutes(),routeKeys=routes.map(route=>`${route.params.book}/${route.params.chapter}`);
assert.equal(new Set(routeKeys).size,routeKeys.length,'No ambiguous routes');
for(const source of sources)assert.ok(routes.some(route=>route.params.book==='phb'&&route.params.chapter===chapterId(source.href)),source.href);
let tables=0;
for(const chapter of chapters){
 const html=readerTitle(chapter.title)+readingContent('phb',chapter);
 assert.equal((html.match(/<h1\b/gi)??[]).length,1,chapter.title);
 assert.ok(!/<h[1-6]\b[^>]*>[^<]*(?:章节导读|Chapter Overview)/i.test(html),chapter.title);
 assert.ok(!/<h[1-6]\b[^>]*>[^<]*(?:Notes Regarding .*Table|表.*注释)/i.test(html),'Notes are annotations, not section headings: '+chapter.title);
 assert.ok(!/class="table-caption"/i.test(html),'No duplicate figure captions');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,new Set(ids).size,'Unique anchors: '+chapter.title);
 for(const part of chapter.parts){
  const raw=readFileSync('public'+part.href,'utf8');
  const body=raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)![1];
  for(const [,id] of body.matchAll(/\bid="([^"]+)"/g))assert.ok(ids.includes(id),'Preserved citation '+id);
  assert.equal((html.match(new RegExp(`id="read-${chapterId(part.href)}"`,'g'))??[]).length,1);
 }
 tables+=(html.match(/<table\b/gi)??[]).length;
 if(chapter.parentHref)assert.ok(chapters.some(parent=>parent.href===chapter.parentHref),'Subclass parent exists');
}
const races=chapters.find(chapter=>chapter.title.startsWith('种族选择'))!;
const raceText=readingContent('phb',races);
assert.ok(raceText.includes('确定角色的各项属性后'),'Restore omitted parent prose');
assert.ok(raceText.includes('read-51b9df0279ca32d8-table-1'),'Restore race table I, with namespaced citations');
const classText=readingContent('phb',chapters.find(chapter=>chapter.title.startsWith('职业选择'))!);
assert.ok(classText.includes('角色职业就是玩家角色所从事的行当'),'Restore class parent prose');
assert.ok(classText.includes('read-13680a5ee3418b77-table-1'),'Restore class table I');
const vision=chapters.find(chapter=>chapter.title.startsWith('光照与视觉'))!;
assert.equal(vision.parts.length,3);
assert.ok(readingContent('phb',vision).includes('红外视觉'));
const dexterity=sources.find(chapter=>chapter.title.startsWith('敏捷'))!;
assert.ok(routes.find(route=>route.params.book==='phb'&&route.params.chapter===chapterId(dexterity.href))!.props.start,'Old URLs open at the original section');
assert.ok(chapters.find(chapter=>chapter.title.startsWith('德鲁伊'))!.parentHref,'Subclasses stay under their base class');
const mock='<h1 id="root">主题</h1><h2 id="notes">力量表 II 注释 Notes Regarding Strength Table II</h2><p>不可丢失的规则</p>';
assert.ok(phbHeadings(mock,'主题',false).includes('<p id="notes" class="table-note-heading">'));
for(const [book,groups] of Object.entries(original))if(book!=='phb')assert.deepEqual(reading[book].flatMap(group=>group.chapters).map(({parts,...chapter})=>chapter),groups.flatMap(group=>group.chapters));
console.log(`PASS: PHB ${sources.length} source chapters -> ${chapters.length} related units, ${tables} tables, restored parent rules, nested classes and preserved routes/citation anchors; other books unchanged.`);
