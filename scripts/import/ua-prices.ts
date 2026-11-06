/** UA p.25 adds prices; unchanged weapons retain the PHB equipment list prices. */
import {readFileSync,writeFileSync} from 'node:fs';
import imported from '../../src/data/public/items-imported.json';
import topics from '../../src/data/published/books.json';
const key=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
type Price={price:string;source:{book:string;page:number;section:string};note?:string};
const prices:Record<string,Price>={};
for(const item of imported)prices[key(item.nameEn)]={price:item.price,source:{book:'PHB',page:35,section:'Equipment'}};
const ua=readFileSync('../manuscript/ua/topics/equipping-character.md','utf8');
const section=topics.find(t=>t.book==='ua'&&t.sourceFile.endsWith('/equipping-character.md'))!.slug;
for(const line of ua.split(/\r?\n/).filter(line=>line.startsWith('|'))){
 const cells=line.split('|').slice(1,-1).map(cell=>cell.trim());
 for(let i=0;i<cells.length-1;i+=2){const name=cells[i].match(/[A-Za-z][\s\S]*$/)?.[0];if(name&&/\d.*\b(?:gp|sp|ep)/.test(cells[i+1]))prices[key(name)]={price:cells[i+1],source:{book:'UA',page:25,section}};}
}
const aliases:Record<string,string>={
 'Bow, Composite, Long':'Bow, Composite Long','Bow, Composite, Short':'Bow, Composite Short',
 'Arrow':'Arrow, Normal, Single','Dagger':'Dagger and Scabbard','Knife':'Knife & scabbard',
 'Lance (light horse)':'Lance','Lance (medium horse)':'Lance','Lance (heavy horse)':'Lance',
 'Quarrel (or Bolt), hand':'Quarrels for same','Quarrel (or Bolt), light':'Quarrel (or Bolt), Light, Single',
 'Sword, Bastard':'Sword, Bastard, & Scabbard','Sword, Broad':'Sword, Broad, & Scabbard',
 'Sword, Long':'Sword, Long, & Scabbard','Sword, Short':'Sword, Short, & Scabbard',
 'Sword, Falchion':'Sword, falchion, and scabbard','Sword, Khopesh':'Sword, khopesh',
};
for(const [name,original] of Object.entries(aliases)){if(!prices[key(original)])throw Error(original);prices[key(name)]=prices[key(original)];}
for(const [name,price,note] of [
 ['Atlatl and javelin','1.5 gp','投枪器 1 gp（UA）＋标枪 10 sp（PHB）。'],
 ['Blowgun and needle','20.05 gp','吹箭筒 20 gp＋针 1 sp（UA）。'],
 ['Quarrel (or Bolt), heavy','2 sp','PHB 每二十支 2 gp，折算为每支。'],
 ['Sling Bullet','5 cp','PHB 每二十颗 10 sp，折算为每颗。'],
 ['Staff Sling Bullet','5 cp','投石索铅弹；PHB 每二十颗 10 sp，折算为每颗。'],
])prices[key(name)]={price,source:{book:note.includes('UA')?'UA':'PHB',page:note.includes('UA')?25:35,section:note.includes('UA')?section:'Equipment'},note};
writeFileSync('src/data/public/ua-equipment-prices.json',JSON.stringify(prices,null,2)+'\n');
console.log(`Indexed ${Object.keys(prices).length} sourced equipment prices.`);
