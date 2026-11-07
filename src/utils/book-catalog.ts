export const isDragonIssue = (book:{id:string}) => /^dragon-\d+$/i.test(book.id);
export function groupBookCatalog<T extends {id:string}>(catalog:T[]) {
  return {books:catalog.filter(book=>!isDragonIssue(book)),dragon:catalog.filter(isDragonIssue).sort((a,b)=>Number(a.id.split('-')[1])-Number(b.id.split('-')[1]))};
}
