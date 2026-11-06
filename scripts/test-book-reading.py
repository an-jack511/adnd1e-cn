"""Check every consolidated citation anchor and every preserved source page."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'src/data/public/book-reading.json').read_text(encoding='utf8'))
chapters={ch['href'] for groups in manifest.values() for group in groups for ch in group['chapters']}
ids={};sources=set();failures=[]
for href in chapters:
 path=root/'public'/href.lstrip('/');text=path.read_text(encoding='utf8')
 found=re.findall(r'\bid="([^"]+)"',text)
 if len(found)!=len(set(found)):failures.append('Duplicate anchors: '+href)
 canonical=href.replace('/archive/','/read/').replace('/chapter-','/').replace('.html','/')
 ids[canonical]=set(found)
 for name in re.findall(r'<section class="chapter-section" id="([^"]+)"',text):
  source=path.with_name(name+'.html');sources.add(str(source))
  if not source.is_file():failures.append('Missing original: '+str(source))
lookup=json.loads((root/'public/archive/lookup.json').read_text(encoding='utf8'))
for entry in lookup['entries']:
 page,_,anchor=entry['href'].partition('#')
 if page in ids and anchor not in ids[page]:failures.append('Broken citation: '+entry['href'])
 if 'originalHref' in entry and not (root/'public'/entry['originalHref'].split('#')[0].lstrip('/')).is_file():failures.append('Lost legacy URL: '+entry['originalHref'])
assert not failures,'\n'.join(failures[:30])
assert len(manifest)==20 and len(sources)>6500
print(f'PASS: {len(manifest)} books, {len(chapters)} chapters, {len(sources)} preserved source pages; every indexed consolidated citation anchor resolves.')
