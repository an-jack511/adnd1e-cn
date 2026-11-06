"""Give every spell parameter block the PHB layout, preserving its original values."""
from pathlib import Path
import json,re,html
ROOT=Path(__file__).resolve().parents[2]
FIELDS=[('level','等级 Level'),('range','距离 Range'),('duration','持续时间 Duration'),('area','影响范围 Area of Effect'),('components','成分 Components'),('casting','施法时间 Casting Time'),('save','豁免检定 Saving Throw')]
def key(label):
 label=re.sub('<[^>]+>','',label).strip(' *：:。 ')
 for pattern,k in [(r'^(?:等级|环级|Level)', 'level'),(r'^(?:射程|距离|范围|Range)','range'),(r'^(?:持续时间|Duration)','duration'),(r'^(?:作用范围|影响范围|作用区域|Area of Effect)','area'),(r'^(?:法术成分|成分|Components)','components'),(r'^(?:施法时间|Casting Time)','casting'),(r'^(?:豁免|Saving Throw)','save'),(r'^(?:学派|School)','school')]:
  if re.match(pattern,label,re.I):return k
 return None
def block(values):
 if not all(k in values for k in ['range','components','casting']):return None
 return '<div class="spell-meta">\n'+'<br>\n'.join('<strong>'+label+'：</strong>'+values[k] for k,label in FIELDS if k in values)+('</div>\n' if 'school' not in values else '<br>\n<strong>学派 School：</strong>'+values['school']+'</div>\n')
names=json.loads((ROOT/'scripts/import/regional-names.json').read_text(encoding='utf8'))
manifest=json.loads((ROOT/'scripts/import/gha-spell-names.json').read_text(encoding='utf8'))
changed=[];count=0
for path in (ROOT/'src/published/books').glob('*/*.md'):
 s=path.read_text(encoding='utf8');old=s
 # Only tables with actual spell statistics qualify; effects/cost/monster tables remain intact.
 def table(m):
  global count
  values={}
  for line in m[0].splitlines():
   cells=[c.strip() for c in line.strip().strip('|').split('|')]
   for i in range(0,len(cells)-1,2):
    k=key(cells[i])
    if k:values[k]=cells[i+1]
  formatted=block(values)
  if formatted:count+=1;return formatted
  return m[0]
 s=re.sub(r'(?m)^\|[^\n]*\n\|[\s:|\-]+\n(?:\|[^\n]*(?:\n|$))+',table,s)
 # FR and several supplements print statistics in one long bold-labelled paragraph.
 def paragraph(m):
  global count
  text=m[0]
  if '<div' in text or text.startswith('#') or '<br' in text:return text
  labels=list(re.finditer(r'<strong>([^<]+)</strong>',text));values={}
  for i,label in enumerate(labels):
   k=key(label[1]);value=text[label.end():labels[i+1].start() if i+1<len(labels) else len(text)].strip(' 。\n')
   if k:values[k]=value
   else:return text
  formatted=block(values)
  if not formatted and path.parent.name=='fr' and set(values)=={'area','casting'}:
   values={'level':'0',**values};formatted='<div class="spell-meta">\n'+'<br>\n'.join('<strong>'+label+'：</strong>'+values[k] for k,label in FIELDS if k in values)+'</div>\n'
  if formatted:count+=1;return formatted
  return text
 s=re.sub(r'(?m)^(?:<strong>[^\n]+(?:\n(?=\S)[^\n]+)*)',paragraph,s)
 if path.parent.name in ['gha','dla','fr']:
  # Translate naked regional proper names; preserve full original names in bilingual headings.
  for item in manifest:
   if path.stem==item['slug']:
    title=item['title'];caster=title.split(' ')[0];zh=title.replace(caster,names[caster],1)
    zh=re.sub(r'（([^）]+)）$',lambda m:' '+item['nameEn']+'（'+m[1]+'）',zh)
    s=s.replace('### '+title+'\n','### '+zh+'\n')
  for line in s.splitlines():
   if not line.startswith('#'):continue
   # Add a Chinese heading to untranslated person/title labels, without rewriting original English subtitles.
   label=re.sub(r'^#+\s*','',line)
   if label in names:s=s.replace(line,re.match(r'^#+',line)[0]+' '+names[label]+' '+label)
   else:
    for en,zh in names.items():
     if label.startswith(en+' 的'):
      suffix='' if re.search(re.escape(en)+r'[’\']',label) else ' '+en
      s=s.replace(line,line.replace(en+' 的',zh+'的',1)+suffix);break
  s=re.sub(r'(?<=[\u3400-\u9fff])\s+(?=的)', '',s)
  # A small, explicit glossary also covers the named characters and gods in prose.
  seen=set()
  pattern=re.compile(r'(?<![A-Za-z])('+ '|'.join(re.escape(n) for n in sorted(names,key=len,reverse=True))+r')(?![A-Za-z])')
  lines=[]
  for line in s.splitlines():
   if line.startswith(('#','![','<!--','<div','|')) or bool(re.match(r'<strong>(?:等级|距离|持续时间|影响范围|成分|施法时间|豁免检定|学派)',line)) or 'href=' in line:lines.append(line);continue
   def replace(m):
    n=m[0]
    if m.start()>0 and line[m.start()-1] in '（(':return n
    first=n not in seen;seen.add(n)
    return names[n]+('（'+n+'）' if first else '')
   lines.append(pattern.sub(replace,line))
  s='\n'.join(lines)+'\n'
  s=re.sub(r'(?m)^原书 PDF ([^；\n]+)；(?:保留|完整保留|整理|挂载)[^\n]+$',r'出处：原书 PDF \1。',s)
 if s!=old:path.write_text(s,encoding='utf8');changed.append(str(path.relative_to(ROOT)))
print('Normalized',count,'spell parameter blocks in',len(changed),'source chapters.')

# Keep directory titles and the full-text search cache consistent with translated chapters.
metadata_path=ROOT/'src/data/published/books.json'
metadata=json.loads(metadata_path.read_text(encoding='utf8'))
for entry in metadata:
 if entry['book'] not in ['gha','dla','fr']:continue
 for field in ['title','excerpt']:
  text=entry[field]
  for en,zh in sorted(names.items(),key=lambda pair:-len(pair[0])):
   text=re.sub(r'(?<![A-Za-z])'+re.escape(en)+r'(?![A-Za-z])',zh,text)
  entry[field]=text
metadata_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
search_path=ROOT/'src/data/published/book-search.json'
search=json.loads(search_path.read_text(encoding='utf8'))
for entry in search:
 if entry['book'] not in ['gha','dla','fr']:continue
 path=ROOT/f"src/published/books/{entry['book']}/{entry['slug']}.md"
 if path.exists():
  text=re.sub(r'!\[[^\]]*\]\([^)]*\)','',path.read_text(encoding='utf8'))
  entry['text']=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',text))).strip()
search_path.write_text(json.dumps(search,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
