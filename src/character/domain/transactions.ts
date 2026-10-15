/** Transport-neutral atomic command envelope. This does not certify any AD&D rule. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Event<P extends Json = Json> {
  id: string; type: string; commandId: string; sequence: number;
  actorId: string; at: string; sourceIds: string[]; payload: P;
}
export interface Receipt {
  commandId: string; request: string; revision: number; eventIds: string[];
}
export interface TransactionState<F extends Json> {
  characterId: string; branchId: string; revision: number; throughSequence: number;
  facts: F; events: Event[]; receipts: Receipt[];
  /** An unexplained event tail makes committing dependent world facts unsafe. */
  unexplainedTail: boolean;
}
export interface Command<P extends Json = Json> {
  id: string; type: string; characterId: string; branchId: string;
  expectedRevision: number; actorId: string; at: string; payload: P;
}
export interface PlannedEvent { id: string; type: string; sourceIds: string[]; payload: Json }
export interface Handler<F extends Json> {
  validate(payload: Json): void;
  plan(facts: Readonly<F>, command: Readonly<Command>): PlannedEvent[];
}
export interface Reducer<F extends Json> { validate(payload: Json): void; apply(facts: F, event: Readonly<Event>): F }
export interface Registry<F extends Json> {
  commands: Record<string, Handler<F>>; events: Record<string, Reducer<F>>;
  sourceIds: ReadonlySet<string>; validateFacts(facts: F): void;
}
export type Result<F extends Json> = { state: TransactionState<F>; receipt: Receipt; duplicate: boolean };

/** Canonical semantic request, not a signature or proof of DM identity. */
export function canonical(value: Json): string {
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isSafeInteger(value))throw new Error('Only safe integer facts are supported.');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  const keys=Object.keys(value).sort();
  if(keys.some(k=>['__proto__','prototype','constructor'].includes(k)))throw new Error('Unsafe object key.');
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
function nonempty(value:string){if(typeof value!=='string'||!value.trim())throw new Error('Missing stable identity.');}
function requestKey(c: Command): string {
  // expectedRevision intentionally excluded: a retry may carry a fresher public/local baseline.
  return canonical({type:c.type,characterId:c.characterId,branchId:c.branchId,actorId:c.actorId,at:c.at,payload:c.payload});
}
export function commit<F extends Json>(original: TransactionState<F>, command: Command, registry: Registry<F>): Result<F> {
  nonempty(command.id);nonempty(command.actorId);nonempty(command.at);
  if(command.characterId!==original.characterId||command.branchId!==original.branchId)throw new Error('Character or branch mismatch.');
  const request=requestKey(command);const previous=original.receipts.find(r=>r.commandId===command.id);
  if(previous){if(previous.request!==request)throw new Error('Command identity reused for different intent.');return {state:original,receipt:previous,duplicate:true};}
  if(original.unexplainedTail)throw new Error('Unexplained event tail: keep intent as proposal, not committed fact.');
  if(!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision!==original.revision)throw new Error('Revision conflict.');
  const handler=Object.hasOwn(registry.commands,command.type)?registry.commands[command.type]:undefined;
  if(!handler)throw new Error('Unsupported command.');
  handler.validate(command.payload);
  // Handlers/reducers only receive isolated data. Failure leaves the input untouched.
  const plans=handler.plan(structuredClone(original.facts),structuredClone(command));
  if(!plans.length)throw new Error('Command produced no facts.');
  let facts=structuredClone(original.facts);
  const used=new Set(original.events.map(e=>e.id));const events:Event[]=[];
  for(const p of plans){
    nonempty(p.id);if(used.has(p.id))throw new Error('Duplicate event identity.');used.add(p.id);
    const reducer=Object.hasOwn(registry.events,p.type)?registry.events[p.type]:undefined;
    if(!reducer)throw new Error('Unsupported event.');
    if(!p.sourceIds.length||p.sourceIds.some(id=>!registry.sourceIds.has(id)))throw new Error('Missing or unresolved event source.');
    reducer.validate(p.payload);
    const event:Event={...structuredClone(p),commandId:command.id,sequence:original.throughSequence+events.length+1,actorId:command.actorId,at:command.at};
    facts=reducer.apply(facts,structuredClone(event));registry.validateFacts(facts);events.push(event);
  }
  const revision=original.revision+1;const receipt:Receipt={commandId:command.id,request,revision,eventIds:events.map(e=>e.id)};
  const state:TransactionState<F>={...structuredClone(original),revision,throughSequence:original.throughSequence+events.length,facts,events:[...structuredClone(original.events),...events],receipts:[...structuredClone(original.receipts),receipt]};
  canonical(state as unknown as Json);
  return {state,receipt,duplicate:false};
}
