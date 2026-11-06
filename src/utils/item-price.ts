/** PHB coin values; OA table 46 intrinsic values, before local exchange fees. */
export function priceInGold(value:string):number {
 const amount=Number.parseFloat(value.replaceAll(',','').match(/[\d.]+/)?.[0]??'');
 if(!Number.isFinite(amount))return Infinity;
 const rate=/ch['’]ien/i.test(value)?5:/tael|ch['’]ao/i.test(value)?.5:/yuan/i.test(value)?1/40:/fen/i.test(value)?1/200:/c\.?p\.?\b/i.test(value)?1/200:/s\.?p\.?\b/i.test(value)?1/20:/e\.?p\.?\b/i.test(value)?1/2:/p\.?p\.?\b/i.test(value)?5:1;
 return amount*rate;
}
