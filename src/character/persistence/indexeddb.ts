import { canonical, type Json, type TransactionState } from '../domain/transactions';
const databaseName='adnd1e-character-archives-v1';
type State = TransactionState<Json>;
export function validateState(value: State): void {
  canonical(value as unknown as Json);
  if(!value.characterId?.trim()||!value.branchId?.trim())throw new Error('Missing character or branch identity.');
  for(const n of [value.revision,value.throughSequence])if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid revision or sequence.');
  const ids=new Set<string>();let last=0;
  for(const event of value.events){
    if(!event.id||ids.has(event.id)||!Number.isSafeInteger(event.sequence)||event.sequence<=last||event.sequence>value.throughSequence)throw new Error('Invalid event history.');
    ids.add(event.id);last=event.sequence;
  }
  const commands=new Set<string>();
  for(const r of value.receipts){
    if(!r.commandId||commands.has(r.commandId)||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>value.revision||!r.eventIds.length||r.eventIds.some(id=>!ids.has(id)))throw new Error('Invalid commit receipt.');
    if(r.eventIds.some(id=>value.events.find(e=>e.id===id)?.commandId!==r.commandId))throw new Error('Receipt belongs to another command.');
    commands.add(r.commandId);
  }
}
/** Pure write guard shared by IndexedDB and tests. Full RAW/archive validation is a separate layer. */
export function guardWrite(current: State|undefined, next: State, expectedRevision: number|null): void {
  validateState(next);if(current)validateState(current);
  if((current?.revision??null)!==expectedRevision)throw new Error('Archive revision conflict.');
  if(current&&(current.characterId!==next.characterId||current.branchId!==next.branchId))throw new Error('Archive identity mismatch.');
  if(current&&next.revision!==current.revision+1)throw new Error('Writes must create exactly one new revision.');
}
export function openArchives(factory: IDBFactory|undefined = globalThis.indexedDB): Promise<IDBDatabase> {
  if(!factory)return Promise.reject(new Error('IndexedDB unavailable; use independent file backup.'));
  return new Promise((resolve,reject)=>{
    const request=factory.open(databaseName,2);let blocked=false;
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('current'))db.createObjectStore('current',{keyPath:['characterId','branchId']});
      if(!db.objectStoreNames.contains('history'))db.createObjectStore('history',{keyPath:['characterId','branchId','revision']});
      if(!db.objectStoreNames.contains('quarantine'))db.createObjectStore('quarantine',{keyPath:'id'});
    };
    request.onerror=()=>reject(request.error??new Error('Archive database open failed.'));
    request.onblocked=()=>{blocked=true;reject(new Error('Archive database upgrade blocked by another page. Existing data unchanged.'));};
    request.onsuccess=()=>{const db=request.result;if(blocked){db.close();return;}db.onversionchange=()=>db.close();resolve(db);};
  });
}
/** Both current and immutable history are written in one cross-tab IndexedDB transaction. */
export function saveState(db: IDBDatabase, state: State, expectedRevision: number|null): Promise<void> {
  validateState(state);const next=structuredClone(state);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['current','history'],'readwrite');let failure:Error|undefined;
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure??tx.error??new Error('Archive write aborted; no partial save.'));
    const current=tx.objectStore('current');const request=current.get([next.characterId,next.branchId]);
    request.onsuccess=()=>{
      try{
        guardWrite(request.result as State|undefined,next,expectedRevision);
        // No async work inside the transaction callback; IndexedDB may otherwise close it.
        tx.objectStore('history').add(next);current.put(next);
      }catch(e){failure=e as Error;tx.abort();}
    };
  });
}
export function loadState(db:IDBDatabase,characterId:string,branchId:string):Promise<State|null>{
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('current','readonly');let value:State|null=null;let failure:Error|undefined;
    tx.oncomplete=()=>failure?reject(failure):resolve(value);tx.onabort=()=>reject(tx.error??new Error('Archive read failed.'));
    const request=tx.objectStore('current').get([characterId,branchId]);
    request.onsuccess=()=>{try{if(request.result!==undefined){validateState(request.result);value=structuredClone(request.result);}}catch(e){failure=e as Error;}};
  });
}
