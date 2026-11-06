import {writeFileSync} from 'node:fs';
import {items} from '../../src/data/public/items';
import {spells} from '../../src/data/public/spells';
writeFileSync('src/data/public/item-index.json',JSON.stringify(items.map(({details,...item})=>item))+'\n');
console.log(`Wrote ${items.length} lightweight equipment records.`);
writeFileSync('src/data/public/spell-index.json',JSON.stringify(spells.map(({details,description,...spell})=>spell))+'\n');
console.log(`Wrote ${spells.length} lightweight spell records.`);
