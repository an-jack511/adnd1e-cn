/** AD&D 1e MM, Explanatory Notes: S, M (human-sized), and L. */
export const monsterSizeOptions = [
  {value:'S',label:'S（小型）'},
  {value:'M',label:'M（中型）'},
  {value:'L',label:'L（大型）'},
  {value:'variable',label:'可变'},
] as const;
export type MonsterSize = typeof monsterSizeOptions[number]['value'];

export function monsterSize(raw:string):MonsterSize {
  if (/可变|见下文|宿主|原生物|正常身高|不适用|^无$/.test(raw)) return 'variable';
  const sizes = new Set<string>(raw.toUpperCase().match(/\b[SML]\b/g) ?? []);
  if (/小型|微型/.test(raw)) sizes.add('S');
  if (/中型/.test(raw)) sizes.add('M');
  if (/大型|巨型/.test(raw)) sizes.add('L');
  // Aerial Servant gives a height instead of a code; MM puts heights over 7 ft in L.
  if (/^8\s*尺高$/.test(raw.trim())) sizes.add('L');
  return sizes.size === 1 ? [...sizes][0] as MonsterSize : 'variable';
}
export function monsterSizeLabel(raw:string):string {
  return monsterSizeOptions.find(option=>option.value===monsterSize(raw))!.label;
}
