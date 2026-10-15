import assert from 'node:assert/strict';
import { prepareOriginal } from '../src/character/persistence/quarantine';
async function test(){
  const empty=await prepareOriginal('empty.json',new Uint8Array());
  assert.equal(empty.id,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const bytes=new Uint8Array([0,255,17]);const first=await prepareOriginal('invalid-utf8.bin',bytes);bytes[0]=1;
  assert.deepEqual(Array.from(first.bytes),[0,255,17]);
  const second=await prepareOriginal('another-name',new Uint8Array([0,255,17]));assert.equal(first.id,second.id);
  await assert.rejects(prepareOriginal('too-big',new Uint8Array(2*1024*1024+1)));
  await assert.rejects(prepareOriginal('',new Uint8Array()));
  console.log('PASS: bounded original bytes, copy isolation, digest identity and invalid-text preservation. Browser transaction tests still required.');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
