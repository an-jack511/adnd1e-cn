/** Catalogue-owned card labels use Chinese; source English remains in the library. */
export function cardName(name:string):string {
 return name.replace(/[A-Za-z][A-Za-z’'_.-]*(?:\s+[A-Za-z][A-Za-z’'_.-]*)*/g,'').replace(/\(\s*\)|（\s*）|\[\s*\]/g,'').replace(/\s+/g,' ').trim();
}
