/** Display list prices consistently, preserving ranges, denominations and units. */
export function formatItemPrice(value:string):string {
 const text=value.replace(/([gscpe])\.p\./gi,'$1p').replace(/ch’ien/g,"ch'ien").replace(/参考售价|[（(]参考售价[）)]/g,'').replace(/[（(]\s*[）)]/g,'').replace(/\*/g,'').trim();
 const amount=text.match(/\d[\d,./／–—−\-\s]*\s*(?:gp|sp|cp|ep|pp|ch'ien|tael|yuan|fen)/i)?.[0].trim();
 if(!amount)return '/';
 const per=text.match(/每([^\d\s]+)\s*\d/)?.[1];
 const suffix=text.slice(text.indexOf(amount)+amount.length).trim();
 const condition=/用尽后/.test(suffix)?'/用尽后':'';
 return amount.replace(/\s+/g,' ')+(per?'/'+per:suffix.startsWith('/')?suffix:condition);
}

/** PHB coin values; OA table 46 intrinsic values, before local exchange fees. */
export function priceInGold(value:string):number {
 const amount=Number.parseFloat(value.replaceAll(',','').match(/[\d.]+/)?.[0]??'');
 if(!Number.isFinite(amount))return Infinity;
 const rate=/ch['’]ien/i.test(value)?5:/tael|ch['’]ao/i.test(value)?.5:/yuan/i.test(value)?1/40:/fen/i.test(value)?1/200:/c\.?p\.?\b/i.test(value)?1/200:/s\.?p\.?\b/i.test(value)?1/20:/e\.?p\.?\b/i.test(value)?1/2:/p\.?p\.?\b/i.test(value)?5:1;
 return amount*rate;
}
