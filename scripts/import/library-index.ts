import {writeFileSync} from 'node:fs';
import {items} from '../../src/data/public/items';
writeFileSync('src/data/public/item-index.json',JSON.stringify(items.map(({details,...item})=>item))+'\n');
console.log(`Wrote ${items.length} lightweight equipment records.`);
