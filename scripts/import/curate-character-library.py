"""Extract only entry-specific character rules from the already translated local books.
Re-runnable: generic HTML repairs and race/class table projections are idempotent.
Run after complete-library.py when regenerating the library.
"""
from pathlib import Path
import json,re,html
ROOT=Path(__file__).resolve().parents[2]
NAMES=json.loads((ROOT/'scripts/import/regional-names.json').read_text(encoding='utf8'))

def plain(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def repair(body):
 # These headings were introduced inside sentences by the old heading recognizer.
 body=re.sub(r'<p\b([^>]*)>(.*?)</p>',lambda m:'<p'+m[1]+'>'+re.sub(r'<h[1-6]\b[^>]*>(.*?)</h[1-6]>',r'<strong>\1</strong>',m[2],flags=re.S)+'</p>',body,flags=re.S)
 def pipe(m):
  lines=m[1].strip().splitlines()
  if len(lines)<2 or not all(x.strip().startswith('|') for x in lines):return m[0]
  cells=[[c.strip() for c in x.strip().strip('|').split('|')] for x in lines]
  if not all(re.fullmatch(r':?-{2,}:?',c) for c in cells[1]):return m[0]
  width=len(cells[0]);rows=[]
  for row in cells[2:]:rows.append('<tr>'+''.join('<td>'+c+'</td>' for c in (row+['']*width)[:width])+'</tr>')
  return '<table><thead><tr>'+''.join('<th>'+c+'</th>' for c in cells[0])+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table>'
 body=re.sub(r'<p>(\s*\|.*?)</p>',pipe,body,flags=re.S)
 body=re.sub(r'\n{3,}','\n\n',body)
 body=re.sub(r'<p>\s*(?:[、，,；;`]|（续下页）|.*?……（续下页）)\s*</p>','',body)
 # Remove production notes and translate personal names in prose, retaining originals at first mention.
 body=re.sub(r'<p>\s*<(?:strong|b)>插图记录[：:]</(?:strong|b)>.*?</p>','',body,flags=re.S)
 seen=set();heading=False;pieces=[]
 pattern=re.compile(r'(?<![A-Za-z])('+'|'.join(re.escape(n) for n in sorted(NAMES,key=len,reverse=True))+r')(?![A-Za-z])')
 for token in re.split(r'(<[^>]+>)',body):
  if token.startswith('<'):
   if re.match(r'<h[1-6]\b',token):heading=True
   if re.match(r'</h[1-6]>',token):heading=False
   pieces.append(token);continue
  if heading:pieces.append(token);continue
  def translated(m):
   n=m[0]
   if m.start()>0 and token[m.start()-1] in '（(':return n
   first=n not in seen;seen.add(n)
   return NAMES[n]+('（'+n+'）' if first else '')
  pieces.append(pattern.sub(translated,token))
 return ''.join(pieces).strip()
def section(body,pattern,level=2):
 heads=list(re.finditer(r'<h([1-6])\b[^>]*>(.*?)</h\1>',body,re.S))
 for i,h in enumerate(heads):
  if re.search(pattern,plain(h[2]),re.I):
   end=next((n.start() for n in heads[i+1:] if int(n[1])<=int(h[1])),len(body))
   return body[h.start():end]
 return ''
def tables(body,col=None,row=None):
 out=[]
 for table in re.findall(r'<table\b[^>]*>.*?</table>',body,re.S):
  trs=re.findall(r'<tr\b[^>]*>(.*?)</tr>',table,re.S)
  if not trs:continue
  headers=re.findall(r'<t[hd]\b[^>]*>(.*?)</t[hd]>',trs[0],re.S)
  keep=list(range(len(headers))) if col is None else [i for i,h in enumerate(headers) if i==0 or col(plain(h))]
  if len(keep)<2:continue
  rows=[]
  for tr in trs[1:]:
   cells=re.findall(r'<t[hd]\b[^>]*>(.*?)</t[hd]>',tr,re.S)
   if row is not None and (not cells or not row(plain(cells[0]))):continue
   rows.append('<tr>'+''.join('<td>'+(cells[i] if i<len(cells) else '')+'</td>' for i in keep)+'</tr>')
  if rows:out.append('<table><thead><tr>'+''.join('<th>'+headers[i]+'</th>' for i in keep)+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table>')
 return '\n'.join(out)
def paragraphs(body,predicate):return '\n'.join(p for p in re.findall(r'<p\b[^>]*>.*?</p>',body,re.S) if predicate(plain(p)))
def save(name,data):(ROOT/f'src/data/public/{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
races=json.loads((ROOT/'src/data/public/race-details.json').read_text(encoding='utf8'))
classes=json.loads((ROOT/'src/data/public/class-details.json').read_text(encoding='utf8'))
for records in [races,classes]:
 for entry in records.values():
  for d in entry['details']:d['html']=repair(d['html'])
labels={'human':'人类','dwarf':'矮人','elf':'精灵','gnome':'侏儒','half-elf':'半精灵','halfling':'半身人','half-orc':'半兽人','korobokuru':'Korobokuru','hengeyokai':'Hengeyokai','spirit-folk':'灵族'}
def race_column(cid,text):
 label=labels[cid]
 return label in text and not(cid=='elf' and '半精灵' in text)
for cid,entry in races.items():
 ds=[]
 for d in entry['details']:
  body=d['html'];title=d['title']
  if title=='UA · 职业等级与属性上限表':
   if cid=='human':continue # Human advancement has no racial cap; no unrelated demihuman tables.
   intro=section(body,r'^本表用法')
   specific=section(body,r'^表 II\.[A-F][：:]'+labels[cid]+r'\s')
   assert specific,(cid,title)
   d['html']=intro+'\n'+specific
  elif title=='UA · 可选职业表':
   d['html']='<p>“可”表示允许选择，“不可”表示不允许；种族亚种分别列出。表下注释与特殊条件以所选规则书为准。</p>'+tables(body,col=lambda text:race_column(cid,text))
   # Keep only notes that name this race; the table's original labels and values are unchanged.
   d['html']+='\n'+paragraphs(body,lambda text:text.startswith(labels[cid]) or (text.startswith('半人类') and cid!='human'))
  elif title=='DMG · 种族倾向与扮演':
   d['html']=paragraphs(body,lambda text:text.startswith(labels[cid]+' '))
   if not d['html']:continue
  elif title.startswith('职业与种族组合'):
   d['html']=tables(body,col=lambda text:race_column(cid,text) or text=='阵营')+'<p>U 表示等级不受此表限制；数字表示该职业的种族等级上限。</p>'
  elif title.startswith('种族属性值限制'):
   d['html']=tables(body,col=lambda text:race_column(cid,text))
  if cid=='dla-silvanesti-elf' or cid=='elf' and title.startswith('西尔瓦内斯提'):
   d['html']=re.split(r'<h[1-6][^>]*>奎利内斯提',d['html'])[0]
  # Keep paragraphs plus real tables, never empty source stubs.
  if len(plain(d['html']))>15:ds.append(d)
 entry['details']=ds
for cid,entry in classes.items():
 ds=[]
 for d in entry['details']:
  body=d['html'];title=d['title']
  if d['source']['book'] in ['WSG','DSG'] and '熟练项' in title:
   # OA's barbarian is a different career; the western class row is not its rule.
   if cid.startswith('oa-'):continue
   labels={'ranger':['巡林客','游侠'],'thief-acrobat':['盗贼中的杂技师','盗贼（杂技士）'],'barbarian':['野蛮人']}
   names=labels.get(cid,[])
   projected=tables(body,row=lambda text:text in names)
   if not projected:continue
   d['title']=d['source']['book']+' · 本职业熟练项（可选）'
   d['html']='<p>仅在战役采用本书非武器熟练项规则时使用。下表只列本职业；完整技能目录、检定与学习规则见出处。</p>'+projected
   d['html']+='<p>斜线左／右分别为武器／非武器栏位。新增频率从第 1 级起计；武器栏位可改用于非武器熟练项，反向转换不允许。</p>'
   ds.append(d);continue
  if title.startswith('可接受职业的特殊限制'):
   if cid in ['cleric','druid']:
    body=paragraphs(body,lambda text:text.startswith(('牧师与德鲁伊：','只有找到')))
   elif cid in ['cavalier','paladin']:
    body=paragraphs(body,lambda text:text.startswith(('骑士与圣武士：','其中一名角色')))
   else:continue
   d['html']=body
  if title.startswith('克莱恩的一般限制'):
   d['html']=paragraphs(body,lambda text: not text.startswith('如果骑士或圣武士'))
  if title.startswith('OA · 职业选择'):
   names={'oa-barbarian':'野蛮人','oa-bushi':'兵士','oa-kensai':'剑士','oa-monk':'武僧','oa-ninja':'忍者','oa-samurai':'武士','oa-shukenja':'修贤者','oa-sohei':'僧兵','oa-wu-jen':'巫师','oa-yakuza':'义侠'}
   body=tables(body,row=lambda text:text==names[cid] or text=={'oa-kensai':'剑圣','oa-wu-jen':'巫人'}.get(cid,''))
   assert body,(cid,title)
   d['html']=body+'<p>U 表示等级不受此表限制；数字为该种族在本职业中的等级上限。其余资格与能力见本条目的 OA 职业正文。</p>'
  if title=='DLA · 克莱恩的神圣教团与施法':
   # Deity monster statistics and the entire pantheon belong to the rules book, not the career entry.
   stop=re.search(r'<h[1-6][^>]*>善良诸神',body)
   if stop:d['html']=body[:stop.start()]+section(body,r'^异教徒')
  if title=='DLA · 克莱恩的高等法术与月相规则':
   stop=re.search(r'<h[1-6][^>]*>高等法术法术',body)
   if stop:d['html']=body[:stop.start()]
  if 'PHB · 吟游诗人能力与等级表'==title and len(plain(body))<30:continue
  if cid=='cavalier' and title=='骑士的随从、部属与侍从':
   d['html']=re.split(r'<h[1-6][^>]*>圣武士侍从',body)[0]
  if len(plain(d['html']))>15:ds.append(d)
 entry['details']=ds
# Repair reference-only regional careers too, keeping them separate from PHB selectable classes.
for name in ['class-additions','race-additions']:
 entries=json.loads((ROOT/f'src/data/public/{name}.json').read_text(encoding='utf8'))
 for entry in entries:
  for d in entry.get('details',[]):
   d['html']=repair(d['html'])
   if entry['id']=='dla-knight-solamnia':
    start=re.search(r'<h[1-6][^>]*>你的阵营是什么',d['html'])
    if start:
     intro=paragraphs(d['html'][:start.start()],lambda text:text.startswith('索兰尼亚骑士'))
     d['html']=intro+d['html'][start.start():]
 save(name,entries)
save('race-details',races);save('class-details',classes)
print('Curated',len(races),'race entries and',len(classes),'class entries from local translated source sections.')
