import assert from 'node:assert/strict';
import {items,bookItems} from '../src/data/public/items';
import raw from '../src/data/public/dragon-items.json';
import links from '../src/data/public/dragon-item-versions.json';
import {mergeDragonItems} from '../src/utils/merge-dragon-items';
import type {Item} from '../src/schemas';

for(const [id,link] of Object.entries(links)){
 const primary=items.find(item=>item.id===link.targetId)!;
 const original=bookItems.find(item=>item.id===link.targetId)!;
 const version=raw.find(item=>item.id===id)!;
 assert.ok(primary&&original&&version,id);
 assert.ok(!items.some(item=>item.id===id),`One catalog entry: ${id}`);
 for(const key of Object.keys(original) as (keyof Item)[]){
  if(!['source','details','tags','aliases'].includes(key))assert.deepEqual(primary[key],original[key],`Preserve book values: ${id} ${key}`);
 }
 assert.ok(original.details?.every(detail=>primary.details?.some(merged=>merged.html===detail.html)),`Retain book text: ${id}`);
 assert.ok(version.details?.every(detail=>primary.details?.some(merged=>merged.html.endsWith(detail.html)&&merged.html.includes(link.note))),`Retain variant and distinction: ${id}`);
 assert.ok(primary.source.some(source=>source.book===version.source[0].book&&source.page===version.source[0].page),id);
 assert.equal(new Set(primary.source.map(source=>JSON.stringify(source))).size,primary.source.length,id);
 assert.ok(primary.aliases?.includes(version.nameEn),`Variant can be searched: ${id}`);
}
assert.equal(items.length,bookItems.length+raw.length-Object.keys(links).length);
assert.ok(items.some(item=>item.id==='dragon-061-equipment-hooked-net'),'An ordinary combat net is not a magic net');
assert.ok(items.some(item=>item.id==='dragon-117-magic-item-ring-of-command'),'Command is not elemental command');
const original=structuredClone(bookItems.find(item=>item.id==='magic-ring-of-regeneration')!);
const version=structuredClone(raw.find(item=>item.id==='dragon-120-magic-item-ring-of-rapid-regeneration')!) as Item;
const before=JSON.stringify([original,version]);
mergeDragonItems([original],[version],{[version.id]:{targetId:original.id,note:'版本差异'}});
assert.equal(JSON.stringify([original,version]),before);
assert.throws(()=>mergeDragonItems([original],[version],{[version.id]:{targetId:'missing',note:''}}),/Missing Dragon item target/);
console.log(`PASS: ${Object.keys(links).length} item variants merged; book values, complete prose, citations and search aliases preserved.`);
