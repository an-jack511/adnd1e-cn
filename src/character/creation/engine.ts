import { abilities, batchSchema, draftSchema, type Batch, type Draft, type Method } from './model';

const counts: Record<Method, number> = { 'DMG:I': 6, 'DMG:II': 12, 'DMG:III': 36, 'DMG:IV': 72 };
export function cryptoD6(): number {
  const value = new Uint32Array(1);
  // Rejection sampling avoids modulo bias, while remaining a local, editable record.
  do { crypto.getRandomValues(value); } while (value[0] >= 4294967292);
  return value[0] % 6 + 1;
}
export function totals(batch: Batch): number[] {
  return batch.candidates.map(row => [...row].sort((a,b) => b-a).slice(0,3).reduce((a,b) => a+b,0));
}
export function validateBatch(value: unknown): Batch {
  const batch = batchSchema.parse(value);
  if (batch.candidates.length !== counts[batch.method] || batch.candidates.some(row => row.length !== (batch.method === 'DMG:I' ? 4 : 3))) {
    throw new Error('骰组数量或每组骰子数不符合所选 DMG 方法。');
  }
  return batch;
}
export function generate(method: Method, die = cryptoD6, id: string = crypto.randomUUID(), at = new Date().toISOString()): Batch {
  const batch = { id, method, createdAt: at, candidates: Array.from({length: counts[method]}, () => Array.from({length: method === 'DMG:I' ? 4 : 3}, die)) };
  return validateBatch(batch);
}
export function deterministicChoices(batch: Batch): number[] | null {
  if (batch.method !== 'DMG:III') return null;
  const values = totals(batch);
  return abilities.map((_,a) => {
    const start = a*6;
    return Array.from({length:6},(_,i) => start+i).sort((i,j) => values[j]-values[i] || i-j)[0];
  });
}
export function evaluate(batch: Batch, choices: number[]): Record<string, number> {
  validateBatch(batch);
  if (choices.length !== 6 || choices.some(i => !Number.isInteger(i) || i < 0 || i >= batch.candidates.length) || new Set(choices).size !== 6) {
    throw new Error('每项属性需要选择一个不同的有效骰组。');
  }
  const values = totals(batch);
  if (batch.method === 'DMG:II') {
    const chosen = choices.map(i => values[i]).sort((a,b) => b-a);
    const best = [...values].sort((a,b) => b-a).slice(0,6);
    if (chosen.some((v,i) => v !== best[i])) throw new Error('DMG 方法 II 必须保留十二组中最高的六项；并列值可以互换。');
  }
  if (batch.method === 'DMG:III' && choices.some((i,a) => Math.floor(i/6) !== a || values[i] !== Math.max(...values.slice(a*6,a*6+6)))) {
    throw new Error('DMG 方法 III 只能保留每项属性自己六次结果中的最高项。');
  }
  if (batch.method === 'DMG:IV' && choices.some(i => Math.floor(i/6) !== Math.floor(choices[0]/6)) || batch.method === 'DMG:IV' && choices.some((i,a) => i%6 !== a)) {
    throw new Error('DMG 方法 IV 必须选择一个完整人物组，不能混组或改变属性顺序。');
  }
  return Object.fromEntries(abilities.map((a,i) => [a,values[choices[i]]]));
}
function checkSnapshot(batch: Batch | null, choices: number[] | null, scores: Record<string, number> | null) {
  if (!batch) { if (choices || scores) throw new Error('尚未生成骰组的草稿不能含分配结果。'); return; }
  validateBatch(batch);
  if (!choices) { if (scores) throw new Error('未确认分配的草稿不能含最终属性。'); return; }
  const expected = evaluate(batch, choices);
  if (!scores || abilities.some(a => scores[a] !== expected[a])) throw new Error('导入属性与原骰、分配不一致。');
}
export function parseDraft(value: unknown): Draft {
  const draft = draftSchema.parse(value);
  checkSnapshot(draft.activeBatch,draft.choices,draft.scores);
  if (draft.activeBatch && draft.activeBatch.method !== draft.profile.abilityMethod) throw new Error('当前方法与当前骰组来源不一致。');
  for (const entry of draft.history) checkSnapshot(entry.batch,entry.choices,entry.scores);
  const ids = [...draft.history.map(x => x.batch.id), ...(draft.activeBatch ? [draft.activeBatch.id] : [])];
  if (new Set(ids).size !== ids.length) throw new Error('骰组记录 ID 重复。');
  if (draft.audit.some(e => e.batchId !== null && !ids.includes(e.batchId))) throw new Error('修改记录指向不存在的骰组。');
  return draft;
}
export function newDraft(id: string = crypto.randomUUID()): Draft {
  return { format:'adnd1e-creation-draft',schemaVersion:'1.0.0',id,revision:0,name:'',profile:{books:['PHB','DMG','MM'],abilityMethod:'DMG:I',algorithm:'dmg-ability-generation-v1',source:{book:'DMG',printedPage:11,section:'Generation of Ability Scores'}},activeBatch:null,choices:null,scores:null,history:[],audit:[] };
}
export function withBatch(draft: Draft, batch: Batch): Draft {
  const copy = structuredClone(draft);
  if (copy.activeBatch) copy.history.push({batch:copy.activeBatch,choices:copy.choices,scores:copy.scores});
  copy.activeBatch = batch; copy.profile.abilityMethod = batch.method;
  copy.choices = deterministicChoices(batch); copy.scores = copy.choices ? evaluate(batch,copy.choices) : null;
  copy.revision++; copy.audit.push({at:new Date().toISOString(),action:'generated',batchId:batch.id});
  return parseDraft(copy);
}
export function assign(draft: Draft, choices: number[]): Draft {
  if (!draft.activeBatch) throw new Error('请先生成属性骰组。');
  const copy=structuredClone(draft); copy.choices=choices; copy.scores=evaluate(copy.activeBatch!,choices); copy.revision++;
  copy.audit.push({at:new Date().toISOString(),action:'assigned',batchId:copy.activeBatch!.id});
  return parseDraft(copy);
}
