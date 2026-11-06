import {writeFileSync} from 'node:fs';
import {spells} from '../../src/data/public/spells';
import {monsters} from '../../src/data/public/monsters';
import {items} from '../../src/data/public/items';
writeFileSync('.git/full-library-audit.json',JSON.stringify({spells,monsters,items}));
