import {writeFileSync} from 'node:fs';
import {baseItems as items} from '../../src/data/public/items-base';
import {classes} from '../../src/data/public/classes-base';
import {races} from '../../src/data/public/races-base';
writeFileSync('.git/library-catalog.json',JSON.stringify({items,classes,races}));
