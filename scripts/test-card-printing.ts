import assert from 'node:assert/strict';
import {fitPrintScale} from '../src/character/ref2/printing';

assert.equal(fitPrintScale(()=>900),1);
let finalScale=0;
const fitted=fitPrintScale(scale=>{finalScale=scale;return 1100+300*scale;});
assert.equal(finalScale,fitted,'Keep the width used by the final measurement');
assert.ok((1100+300*fitted)*fitted<=280*96/25.4);
assert.ok(fitted>.747,'Reflowing wider must recover space compared with shrinking a fixed-width page');
assert.ok(Math.abs((194/fitted)*fitted-194)<.001,'The printed card must still occupy the full paper width');
assert.equal(fitPrintScale(scale=>{finalScale=scale;return 3000;}),1,'Long records continue at readable size');
assert.equal(finalScale,1,'Continuation pages restore the full-size layout');
console.log('PASS: full-width A4 fitting, final measurement and readable continuation pages.');
