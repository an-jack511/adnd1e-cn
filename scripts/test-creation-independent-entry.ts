import assert from 'node:assert/strict';
import {newCoreCreation, selectCoreCandidate, parseCoreCreation, recordCreationTask} from '../src/character/workflows/core-create';
import {coreArcaneCreationChoices, recordCoreArcaneCreation, assertArcaneCreationLedger, type CoreArcaneCreationInput} from '../src/character/workflows/core-arcane-creation';
import {enterCreatedCharacter, campaignFromCreatedCharacter} from '../src/character/workflows/core-creation-entry';
import {saveCoreCampaign, type CoreCampaignStoragePort} from '../src/character/workflows/core-campaign-storage';
import {renderInitialSpells} from '../src/character/ui/core-initial-spells';
import {startCoreReview} from '../src/character/ui/core-review-controller';
import {admittedCoreCharacter} from './fixtures/admitted-core-character';
import {admittedCaster} from './fixtures/admitted-caster';

// Narrow DOM/event double: executes production renderers and registered handlers.
// No browser layout, IndexedDB implementation, or native event conformance claim.
class Element {
  children: Element[] = [];
  private ownText = '';
  private selected = '';
  listeners = new Map<string, ((event: any) => unknown)[]>();
  attrs: Record<string,string> = {};
  checked = false;
  disabled = false;
  files: unknown[] = [];
  type = '';
  onclick: null | (() => unknown) = null;
  constructor(public tagName: string) {}
  set textContent(value: string) { this.ownText = value; this.children = []; }
  get textContent(): string { return this.ownText + this.children.map(c => c.textContent).join(''); }
  set value(value: string) { this.selected = value; }
  get value(): string { return this.selected || (this.tagName === 'select' ? this.children[0]?.value ?? '' : ''); }
  append(...nodes: Element[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: Element[]) { this.children = []; this.ownText = ''; this.append(...nodes); }
  setAttribute(key: string, value: string) { this.attrs[key] = value; }
  addEventListener(kind: string, handler: (event: any) => unknown) {
    this.listeners.set(kind, [...this.listeners.get(kind) ?? [], handler]);
  }
  async dispatch(kind: string) {
    for (const handler of this.listeners.get(kind) ?? []) await handler({target: this});
    if (kind === 'click') await this.onclick?.();
  }
}
class OptionElement extends Element {
  constructor(text: string, value: string) { super('option'); this.textContent = text; this.value = value; }
}
function descendants(root: Element): Element[] { return root.children.flatMap(c => [c, ...descendants(c)]); }
function named(root: Element, tag: string, text: string) {
  const found = descendants(root).find(c => c.tagName === tag && c.textContent === text);
  assert.ok(found, `Missing ${tag}: ${text}`); return found;
}
function labelField(root: Element, text: string) {
  const label = descendants(root).find(c => c.tagName === 'label' && c.textContent.startsWith(text));
  assert.ok(label, `Missing label: ${text}`); return label.children[0];
}
const elements = new Map<string,Element>();
Object.defineProperty(globalThis, 'document', {configurable: true, value: {
  createElement: (tag: string) => new Element(tag),
  getElementById: (id: string) => { if (!elements.has(id)) elements.set(id, new Element('div')); return elements.get(id)!; },
}});
Object.defineProperty(globalThis, 'Option', {configurable: true, value: OptionElement});
Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '', assign: () => { throw new Error('Unexpected navigation in failure-path test'); }}});

function creation() {
  const scores = {STR:12, INT:9, WIS:12, DEX:12, CON:12, CHA:12};
  return selectCoreCandidate(newCoreCreation({id:'independent-entry-mu', name:'Independent MU', generation:{draftId:'test-only', draftRevision:1, batchId:'test-only', method:'DMG:I', scores}}), {
    raceId:'human', subraceId:null, sex:'male', alignmentId:'NG', initialScores:scores, classIds:['magic-user'], mode:'single', campaign:{allowedRaceIds:['human'], bardEnabled:false},
  });
}
function request(): CoreArcaneCreationInput {
  const catalog = coreArcaneCreationChoices('magic-user');
  const planned = ['read-magic','magic-missile','shield','detect-magic'].map(slug => catalog.find(s => s.definitionId.endsWith(`:${slug}`))!.definitionId);
  return {
    initialPlan:{classId:'magic-user', input:{rolls:{offensive:6, defensive:7, miscellaneous:2}}}, rollMethod:'physical-or-external',
    chanceToKnow:{spellIds:catalog.map(s => s.definitionId), attempts:catalog.map(s => ({spellId:s.definitionId, percentile:planned.includes(s.definitionId) ? 23 : 100})), rollMethod:'physical-or-external'},
    adoption:{policy:'require-successful-checks', actorId:'test-dm', at:'test-time', reason:'Explicit test campaign adoption only', sourceIds:['campaign:independent-adoption']},
    spellbookId:'test-original-book',
    acquisitions:planned.map((spellId,i) => ({spellId, sourceEntityId:`original-source-${i}`, transcriptionId:`original-copy-${i}`, sourceLabel:'Test apprenticeship source', sourceAccessConfirmed:true, outcome:'success', actualCostGp:2, actualDurationMinutes:30, rulingId:'test-actual-copy-ruling'})),
  };
}
const facts = (doc: ReturnType<typeof creation>) => doc.tasks.find(t => t.id === 'initial-spells')!.facts!;
let failures = 0;
async function check(name: string, run: () => unknown) {
  try { await run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${(error as Error).message}`); }
}

await check('independent new-writer boundary, immutable input, actual history, partial JSON roundtrip, no preparation', () => {
  const doc = creation(), input = request(), original = JSON.stringify({doc,input});
  const result = recordCoreArcaneCreation(doc,input);
  assertArcaneCreationLedger(result.document);
  assert.equal(JSON.stringify({doc,input}), original);
  assert.deepEqual(result.dmLedger.preparedCopies, []);
  assert.equal(result.dmLedger.spellbookEntries.length, 4);
  const partial = structuredClone(input); partial.chanceToKnow.attempts = partial.chanceToKnow.attempts.slice(0,1); partial.acquisitions = [];
  const saved = recordCoreArcaneCreation(doc, partial).document;
  const restored = parseCoreCreation(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(facts(restored).input, partial);
  assert.equal(restored.tasks.find(t => t.id === 'initial-spells')!.status,'pending');
  assert.throws(() => assertArcaneCreationLedger(restored));
  const planOnly = recordCreationTask(doc,'initial-spells',{status:'needs-dm', sourceIds:['dmg:39:initial-magic-user-spells'], note:'Test old plan', facts:{spells:['read-magic']}});
  assert.doesNotThrow(() => parseCoreCreation(planOnly));
  assert.throws(() => assertArcaneCreationLedger(planOnly));
  const legacy = admittedCaster('magic-user');
  const oldDoc = parseCoreCreation(legacy.genesis.runtime.transaction.facts.modules[0].data);
  assert.doesNotThrow(() => parseCoreCreation(JSON.parse(JSON.stringify(oldDoc))));
  assert.throws(() => campaignFromCreatedCharacter(oldDoc));
});

await check('same campaign slot uses expected null and rejects replacement without changing source or stored bytes', async () => {
  const source = admittedCoreCharacter('fighter');
  const doc = parseCoreCreation(source.genesis.runtime.transaction.facts.modules[0].data);
  const bytes = JSON.stringify(doc), data = new Map<string,string>();
  const port: CoreCampaignStoragePort = {getItem:key => data.get(key) ?? null, compareAndSet:(key,expected,value) => {
    if ((data.get(key) ?? null) !== expected) return false; data.set(key,value); return true;
  }};
  const writer = async (slot: any, archive: any, expected: null) => { assert.equal(expected,null); return saveCoreCampaign(port,slot,archive,expected); };
  await enterCreatedCharacter(doc,writer); const before = [...data];
  await assert.rejects(() => enterCreatedCharacter(doc,writer), /未覆盖/);
  assert.deepEqual([...data],before); assert.equal(JSON.stringify(doc),bytes);
});

await check('renderer restores failed actual dice history and checkpoints it without inventing sources or outcomes', async () => {
  const input = request(); input.chanceToKnow.attempts = [{spellId:input.chanceToKnow.spellIds[0], percentile:100}]; input.acquisitions = [];
  let current = recordCoreArcaneCreation(creation(),input).document;
  const host = new Element('div');
  renderInitialSpells(host as any,() => current,value => { current = value; });
  assert.ok(descendants(host).some(c => c.tagName === 'li' && c.textContent.includes('d100=100') && c.textContent.includes('失败')));
  await named(host,'button','保留当前骰史与取得进度').dispatch('click');
  const after = facts(current).input as CoreArcaneCreationInput;
  assert.deepEqual(after.chanceToKnow,input.chanceToKnow);
  assert.deepEqual(after.acquisitions,[]);
  assert.equal(current.tasks.find(t => t.id === 'initial-spells')!.status,'pending');
  const before = JSON.stringify(current);
  await named(host,'button','计算并记录初始授予').dispatch('click');
  assert.equal(JSON.stringify(current),before,'Recalculation must not replace recorded Ctk history');
});

await check('checkpoint must preserve an already valid imported acquisition including IDs, cost, duration and ruling', async () => {
  const input = request(); let current = recordCoreArcaneCreation(creation(),input).document;
  const host = new Element('div');
  renderInitialSpells(host as any,() => current,value => { current = value; });
  await named(host,'button','保留当前骰史与取得进度').dispatch('click');
  const after = facts(current).input as CoreArcaneCreationInput;
  console.log('OBSERVED acquisition before/after:', JSON.stringify({before:input.acquisitions[0], after:after.acquisitions[0]}));
  assert.deepEqual(after.acquisitions,input.acquisitions,'Checkpoint changed confirmed original acquisition evidence');
});

await check('partial checkpoint must retain a confirmed source label while its outcome is still undecided', async () => {
  const input = request(); input.chanceToKnow.attempts = []; input.acquisitions = [];
  let current = recordCoreArcaneCreation(creation(),input).document;
  const host = new Element('div');
  renderInitialSpells(host as any,() => current,value => { current = value; });
  const row = descendants(host).find(c => c.tagName === 'details' && c.textContent.includes('实际来源与取得结果'))!;
  labelField(row,'实际可用的导师／书页来源名称').value = 'Entered actual teacher';
  labelField(row,'已确认实际来源访问条件').checked = true;
  await named(host,'button','保留当前骰史与取得进度').dispatch('click');
  // Re-render only the saved document, as after export/import or local reload.
  const restored = new Element('div');
  renderInitialSpells(restored as any,() => current,value => { current = value; });
  const restoredRow = descendants(restored).find(c => c.tagName === 'details' && c.textContent.includes('实际来源与取得结果'))!;
  assert.equal(labelField(restoredRow,'实际可用的导师／书页来源名称').value,'Entered actual teacher');
  assert.equal(labelField(restoredRow,'已确认实际来源访问条件').checked,true);
});

await check('file read begun before entry must not replace current or re-enable entry while campaign save is pending', async () => {
  elements.clear(); startCoreReview();
  const source = admittedCoreCharacter('fighter');
  const a = parseCoreCreation(source.genesis.runtime.transaction.facts.modules[0].data);
  const other = admittedCoreCharacter('thief');
  const b = {...parseCoreCreation(other.genesis.runtime.transaction.facts.modules[0].data), name:'Slow incoming B'};
  assert.notEqual(a.id,b.id);
  const file = elements.get('review-file')!, summary = elements.get('review-summary')!, enter = elements.get('review-enter')!;
  file.files = [{size:100, text:async () => JSON.stringify(a)}]; await file.dispatch('change');
  let release!: (value: string) => void;
  file.files = [{size:100, text:() => new Promise<string>(resolve => { release = resolve; })}];
  const importing = file.dispatch('change');
  let request: any;
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open:() => { request = {}; return request; }}});
  const saving = enter.dispatch('click');
  assert.equal(enter.disabled,true);
  // New imports started during saving ARE rejected; the older in-flight read is the hole.
  await file.dispatch('change');
  assert.match(elements.get('review-status')!.textContent,/正在保存/);
  release(JSON.stringify(b)); await importing;
  const replacedDuringSave = summary.textContent, enabledDuringSave = !enter.disabled;
  request.error = new Error('Controlled database failure after observation'); request.onerror(); await saving;
  console.log('OBSERVED during held save:', JSON.stringify({summary:replacedDuringSave, entryEnabled:enabledDuringSave}));
  assert.ok(!replacedDuringSave.includes('Slow incoming B'),'Late file continuation replaced A with B during A save');
  assert.equal(enabledDuringSave,false);
});

console.log(`Independent checks finished: ${failures} failure(s). FAIL assertions describe required behavior, not expected-bug success.`);
if (failures) process.exitCode = 1;
