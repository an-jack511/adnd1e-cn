import assert from 'node:assert/strict';
import {createCoreEditorIo} from '../src/character/ui/core-editor-io';
async function main(){
  const observed:boolean[]=[];
  const io=createCoreEditorIo(()=>observed.push(io.busy));
  let release!:()=>void,importExecuted=false;
  const wait=new Promise<void>(resolve=>{release=resolve;});
  const load=io.run('加载',async()=>{await wait;return 'loaded';});
  assert.equal(io.busy,true);
  await assert.rejects(io.run('导入',async()=>{importExecuted=true;}),/正在加载/);
  assert.equal(importExecuted,false);assert.equal(io.busy,true);
  release();assert.equal(await load,'loaded');assert.equal(io.busy,false);
  assert.deepEqual(observed,[true,false]);
  await assert.rejects(io.run('失败的读取',async()=>{throw new Error('unavailable');}),/unavailable/);
  assert.equal(io.busy,false);
  assert.equal(await io.run('重试',async()=>42),42);
  // Verify that asynchronous I/O does not itself freeze unrelated in-memory game actions.
  let current={revision:1},acknowledged:typeof current|null=null;
  let finishSave!:()=>void;
  const pending=new Promise<void>(resolve=>{finishSave=resolve;});
  const save=io.run('保存',async()=>{const snapshot=current;await pending;acknowledged=snapshot;});
  current={revision:2};finishSave();await save;
  assert.notEqual(current,acknowledged,'Acknowledging a captured snapshot cannot acknowledge newer edits');
  assert.equal(current.revision,2);assert.equal(io.busy,false);
  console.log('PASS: editor I/O exclusion, concurrent-body refusal, failure release and captured-save/newer-edit separation. Browser event integration remains a separate test.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
