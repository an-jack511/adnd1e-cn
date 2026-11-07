import {itemSelectionKind} from '../../utils/item-selection';
import {cardName} from './labels';
import {canonicalItemId} from '../../utils/merge-ua-equipment';
export const CARD_FORMAT = 'adnd1e-ref2-card';
export type Fields = Record<string, string | boolean>;
export type Row = { id: string; values: Record<string, string> };
export type PreparedSpell = { spellId: string; count: number; expended: number };
export const collectionNames = ['weapons', 'unarmed', 'gear', 'family', 'henchmen', 'ammunition', 'proficiencies', 'valuables'] as const;
export type CollectionName = typeof collectionNames[number];
export type Card = { format: typeof CARD_FORMAT; version: 1; fields: Fields; rows: Record<CollectionName, Row[]>; preparedSpells: PreparedSpell[]; [key: string]: unknown };
export const initialRows: Record<CollectionName, number> = { weapons: 6, unarmed: 3, gear: 30, family: 12, henchmen: 3, ammunition: 3, proficiencies: 22, valuables: 3 };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, fallback: number) => Math.max(0, Math.min(9999, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback));
export const blankRow = (): Row => ({ id: crypto.randomUUID(), values: {} });
export function blankCard(): Card {
  return { format: CARD_FORMAT, version: 1, fields: { level: '1', manual_spell_slots:false,manual_saves:false }, rows: Object.fromEntries(collectionNames.map(key => [key, Array.from({length: initialRows[key]}, blankRow)])) as Card['rows'], preparedSpells: [] };
}
export function normalizeCard(value: unknown): Card {
  if (!object(value)) throw new Error('文件内容不是人物卡。');
  if (value.format && value.format !== CARD_FORMAT) throw new Error('请在“战役人物档案”中打开此类文件。');
  const current = value.format === CARD_FORMAT;
  if (current && value.version !== 1) throw new Error('此人物卡版本暂不能读取，请保留原文件。');
  const fields = current ? value.fields : value;
  if (!object(fields) || (!current && !['name','race','class','STR','character_id'].some(key => key in fields))) throw new Error('这不是人物卡文件，请检查文件类型。');
  const card = blankCard();
  // Retain unknown top-level fields so a round trip does not discard extensions.
  if (current) Object.assign(card, value);
  card.fields = Object.fromEntries(Object.entries(fields).filter(([,entry]) => typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean').map(([key,entry]) => [key,typeof entry === 'boolean' ? entry : String(entry)]));
  if (!('manual_spell_slots' in card.fields) && Object.entries(card.fields).some(([key,entry])=>/^spell_slots_\d$/.test(key) && String(entry).trim()!=='')) card.fields.manual_spell_slots=true;
  if (!('manual_saves' in card.fields) && Object.entries(card.fields).some(([key,entry])=>/^save_\d$/.test(key) && String(entry).trim()!=='')) card.fields.manual_saves=true;
  card.rows = {} as Card['rows'];
  for (const key of collectionNames) {
    if (current) {
      const rows = object(value.rows) ? value.rows[key] : undefined;
      if (!Array.isArray(rows) || rows.some(row => !object(row) || !object(row.values))) throw new Error('人物卡记录行损坏；原文件未改动。');
      card.rows[key] = rows.map((row,index) => ({id: typeof row.id === 'string' ? row.id : `${key}-${index}`, values: Object.fromEntries(Object.entries(row.values).filter(([,entry]) => typeof entry === 'string' || typeof entry === 'number').map(([field,entry]) => [field,String(entry)]))}));
    } else {
      const prefix = key === 'weapons' ? 'weapon' : key === 'gear' ? 'gear' : '';
      const indices = prefix ? [...new Set(Object.keys(fields).flatMap(field => { const match=field.match(new RegExp(`^${prefix}_(\\d+)_`)); return match ? [Number(match[1])] : []; }))].sort((a,b)=>a-b) : [];
      card.rows[key] = indices.map(index => ({id:`legacy-${prefix}-${index}`,values:Object.fromEntries(Object.entries(card.fields).filter(([field])=>field.startsWith(`${prefix}_${index}_`)).map(([field,entry])=>[field.slice(`${prefix}_${index}_`.length),String(entry)]))}));
      while (card.rows[key].length < initialRows[key]) card.rows[key].push(blankRow());
    }
  }
  if (current) {
    if (!Array.isArray(value.preparedSpells)) throw new Error('准备法术记录损坏；原文件未改动。');
    card.preparedSpells = value.preparedSpells.map(entry => {
      if (!object(entry) || typeof entry.spellId !== 'string') throw new Error('准备法术记录损坏。');
      const count=Math.max(1,integer(entry.count,1)); return {spellId:entry.spellId,count,expended:Math.min(count,integer(entry.expended,0))};
    });
  } else {
    const legacyUnarmed: Record<string,string> = {unarmed_style:'style',unarmed_form:'form',unarmed_adjustment:'hit',unarmed_effect:'damage'};
    for (const [old,key] of Object.entries(legacyUnarmed)) if (typeof fields[old] === 'string') card.rows.unarmed[0].values[key]=String(fields[old]);
    const prepared = new Map<string, number>();
    for (const [key,entry] of Object.entries(card.fields)) if (/^spell_\d+$/.test(key) && typeof entry === 'string' && entry) prepared.set(entry,(prepared.get(entry) ?? 0)+1);
    card.preparedSpells = [...prepared].map(([spellId,count])=>({spellId,count,expended:0}));
    if (card.fields.ac && !('manual_ac' in card.fields) && !card.fields.armor_item) card.fields.manual_ac=true;
  }
  for(const name of ['armor_item','shield_item']) if(typeof card.fields[name]==='string')card.fields[name]=canonicalItemId(card.fields[name] as string);
  for(const row of [...card.rows.weapons,...card.rows.gear])for(const key of ['name','item','itemId','weaponPickerId','weaponDataSource'])if(row.values[key]) {
    const missile=row.values[key].endsWith('::missile'), id=missile?row.values[key].slice(0,-9):row.values[key];
    row.values[key]=canonicalItemId(id)+(missile?'::missile':'');
  }
  return card;
}
export function selectPrepared(card: Card, ids: string[]) {
  card.preparedSpells = [...new Set(ids)].map(spellId => card.preparedSpells.find(entry=>entry.spellId===spellId) ?? {spellId,count:1,expended:0});
}

/** Only replace rows managed by this picker; retain custom gear and unknown future IDs. */
export function selectInventory(card:Card,ids:string[],kind:'gear'|'magic',catalog:readonly {id:string;nameZh:string;category:string}[]) {
 const eligible=new Map(catalog.filter(item=>itemSelectionKind(item)===kind).map(item=>[item.id,item]));
 const selected=new Set(ids.filter(id=>eligible.has(id)));
 card.rows.gear=card.rows.gear.filter(row=>!eligible.has(row.values.itemId)||selected.has(row.values.itemId));
 const existing=new Set(card.rows.gear.map(row=>row.values.itemId));
 for(const id of selected)if(!existing.has(id)){
  const item=eligible.get(id)!;
  const empty=card.rows.gear.find(row=>Object.values(row.values).every(value=>!value.trim()));
  const row=empty??blankRow();row.values={...row.values,itemId:id,item:cardName(item.nameZh),quantity:'1'};
  if(!empty)card.rows.gear.push(row);
 }
}
