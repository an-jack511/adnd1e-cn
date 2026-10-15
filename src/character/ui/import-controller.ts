import { inspectArchive, exportOriginalBytes, type ArchivePreview } from '../interchange/archive';
import { preserveOriginal, listOriginals, loadOriginal } from '../persistence/quarantine';

export function archiveDiagnosticRows(preview: ArchivePreview): string[][] {
  if (!preview.diagnostics.length) {
    return [['', '', '已完成此格式支持的结构检查；未执行完整规则判定。']];
  }
  return preview.diagnostics.map((item) => [
    item.severity === 'error' ? '错误' : '提示',
    item.path || '根节点',
    item.message,
  ]);
}

function renderDiagnostics(rows: HTMLTableSectionElement, preview: ArchivePreview) {
  rows.replaceChildren();
  for (const values of archiveDiagnosticRows(preview)) {
    const row = document.createElement('tr');
    if (!values[0] && !values[1]) {
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = values[2];
      row.append(cell);
    } else {
      for (const text of values) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      }
    }
    rows.append(row);
  }
}

export function startArchiveImport(){
  const input=document.querySelector<HTMLInputElement>('#archive-file')!;
  const status=document.querySelector<HTMLElement>('#archive-status')!;
  const rows=document.querySelector<HTMLTableSectionElement>('#archive-diagnostics')!;
  const original=document.querySelector<HTMLButtonElement>('#archive-original')!;
  const preserve=document.querySelector<HTMLButtonElement>('#archive-preserve')!;
  const saved=document.querySelector<HTMLSelectElement>('#archive-saved')!;
  let staged:ArchivePreview|null=null;let fileName='original.json';let selection=0;
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;const thisSelection=++selection;
    original.disabled=true;preserve.disabled=true;status.textContent='正在隔离检查；浏览器角色库不会改变。';rows.replaceChildren();
    try{
      if(file.size>2*1024*1024){staged=null;status.textContent='文件超过 2 MB。未读取、未改变角色库；原文件仍保存在你选择的位置。';return;}
      const bytes=new Uint8Array(await file.arrayBuffer());if(selection!==thisSelection)return;
      staged=inspectArchive(bytes);fileName=file.name;original.disabled=false;preserve.disabled=false;
      const labels:Record<ArchivePreview['kind'],string>={'full-candidate':'完整档案候选','projection':'公开摘要','creation-draft':'属性创建草稿','legacy-assertions':'旧档断言','unknown-major':'未知主要版本','unsupported-version':'未支持的版本','unknown':'未知格式','invalid':'无法解析'};
      status.textContent=`${labels[staged.kind]} · ${staged.summary.name??'姓名未知'}。这是只读预览：不导入角色库、不重放事件、不认可规则合法。`;
      renderDiagnostics(rows,staged);
    }catch{staged=null;status.textContent='检查未完成，未改变角色库。原文件仍在本地，可重新选择。';}
  });
  original.addEventListener('click',()=>{
    if(!staged)return;
    const bytes=exportOriginalBytes(staged);const blob=new Blob([bytes as BlobPart],{type:'application/octet-stream'});const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='preserved-'+fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    status.textContent+=' 已请求下载原字节副本，请确认实际保存。';
  });
  async function refresh(){
    try{const list=await listOriginals();saved.replaceChildren(new Option('选择已保全原件',''),...list.map(row=>new Option(`${row.name} · ${row.size} 字节`,row.id)));}
    catch{status.textContent+=' 本地原件库不可用；仍可下载当前原件。';}
  }
  preserve.addEventListener('click',async()=>{
    if(!staged)return;const snapshot=staged;const snapshotName=fileName;preserve.disabled=true;
    try{await preserveOriginal(snapshotName,exportOriginalBytes(snapshot));await refresh();status.textContent='原字节已保全到此浏览器的隔离区，没有写入角色事实。独立备份仍请下载原件。';}
    catch{status.textContent='原件保全失败，没有部分写入。当前预览仍在，请下载原字节副本。';}
    finally{preserve.disabled=!staged;}
  });
  document.querySelector('#archive-load')!.addEventListener('click',async()=>{
    const id=saved.value;if(!id){status.textContent='请选择已保全原件。';return;}const thisSelection=++selection;
    try{const row=await loadOriginal(id);if(selection!==thisSelection)return;staged=inspectArchive(row.bytes);fileName=row.name;original.disabled=false;preserve.disabled=false;
      renderDiagnostics(rows,staged);
      status.textContent=`已从隔离区读取 ${row.name}，字节摘要核对通过；仍是只读原件，没有认可或重放角色事实。`;
    }catch{status.textContent='原件读取或摘要核对失败；存储未覆盖，可继续下载当前预览原件。';}
  });
  refresh();
}
