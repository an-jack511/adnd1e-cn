/** Repair blank lines inserted between table rows by page-based transcriptions. */
export function normalizeMarkdownTables(markdown:string):string {
 const lines=markdown.split(/\r?\n/),out:string[]=[];
 const next=(index:number)=>{while(index<lines.length&&!lines[index].trim())index++;return index;};
 const pipe=(index:number)=>/^\s*\|.*\|\s*$/.test(lines[index]??'');
 const separator=(index:number)=>pipe(index)&&lines[index].trim().slice(1,-1).split('|').every(cell=>/^\s*:?-{2,}:?\s*$/.test(cell));
 for(let i=0;i<lines.length;){
  const divider=next(i+1);
  if(!pipe(i)||!separator(divider)){out.push(lines[i++]);continue;}
  const rows=[lines[i],lines[divider]];let end=divider;
  while(true){
   const row=next(end+1);
   if(!pipe(row)||separator(next(row+1)))break;
   rows.push(lines[row]);end=row;
  }
  out.push(rows.join('\n'));i=end+1;
  // Adjacent tables need a boundary, even if a previous importer removed it.
  if(pipe(i)&&separator(next(i+1)))out.push('');
 }
 return out.join('\n');
}
