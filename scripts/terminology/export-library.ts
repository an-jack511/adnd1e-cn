import {writeFileSync,mkdirSync} from 'node:fs';
import {spells} from '../../src/data/public/spells';
import {items} from '../../src/data/public/items';
import {monsters} from '../../src/data/public/monsters';
import {classes} from '../../src/data/public/classes';
import {races} from '../../src/data/public/races';
mkdirSync('.git/terminology',{recursive:true});
writeFileSync('.git/terminology/library.json',JSON.stringify({spells,items,monsters,classes,races}));
console.log('Exported current library for terminology audit.');
