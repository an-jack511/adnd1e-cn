"""Build sourced detail records; never truncate an item's rules to its treasure-table row."""
from pathlib import Path
import json,re,html,collections
ROOT=Path(__file__).resolve().parents[2]
SOURCES=json.loads((ROOT/'.git/library-sources.json').read_text(encoding='utf8'))
CAT=json.loads((ROOT/'.git/library-catalog.json').read_text(encoding='utf8'))
TOPICS=json.loads((ROOT/'src/data/published/books.json').read_text(encoding='utf8'))
TOPIC={(t['book'],t['slug']):t for t in TOPICS}
def plain(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def norm(s):return re.sub(r'[^a-z0-9+\-\u3400-\u9fff]','',html.unescape(s).lower().replace('’',"'").replace('−','-'))
def en(s):
 s=html.unescape(s);m=re.search(r'[A-Za-z][A-Za-z0-9\s,\-+’\'&/().]*$',s)
 return m[0].strip(' .') if m else ''
def zh(s):return re.sub(r'[A-Za-z].*','',s).strip(' ·。:：')
def loose(s):return norm(re.sub(r'\b(the|of|a|an|potion|oil|philter|elixir|ring|wand|staff|rod|scroll)\b','',s.lower()))
def family(s):
 for word in ['potion','oil','philter','elixir','ring','wand','staff','rod','scroll','sword','shield','armor']:
  if re.search(r'\b'+word+r'\b',s.lower()):return word
 return ''
def safe_html(content,t):
 content=re.sub(r'<h([1-6])\b[^>]*>([^<]+)</h\1>\s*(?=<h[1-6]\b[^>]*>\2</h[1-6]>)','',content)
 content=re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>','',content,flags=re.S|re.I)
 content=re.sub(r'<img\b[^>]*>','',content,flags=re.I)
 content=re.sub(r'<!--.*?-->','',content,flags=re.S)
 def link(m):
  target=html.unescape(m[1])
  if target.startswith(('http:','https:','/','#')):return m[0]
  filename=target.split('#')[0].split('/')[-1].replace('.html','').replace('.md','')
  matches=[x for x in TOPICS if x['book']==t['book'] and (x['slug']==filename or x.get('sourceFile','').split('/')[-1].removesuffix('.md')==filename)]
  return 'href="/books/'+t['book']+'/'+matches[0]['slug']+'/"' if matches else 'href="/books/'+t['book']+'/"'
 content=re.sub(r'href="([^\"]+)"',link,content)
 return content.strip()
def detail(t,h=None,title=None):
 body=h['html'] if h else t['html']
 origin=h.get('origin',t['slug']) if h else t['slug']
 return {'title':title or (h['title'] if h else t['title']), 'html':safe_html(body,t),'source':{'book':t['book'].upper(),'section':h['title'] if h else t['title']},'href':f"/books/{t['book']}/{origin}/"}
def get(book,slug):return next((t for t in SOURCES if t['book']==book and t['slug']==slug),None)
def addwhole(ds,book,slug,title=None):
 t=get(book,slug)
 if t:ds.append(detail(t,title=title))
def addheads(ds,book,slug,pattern):
 t=get(book,slug)
 if not t:return
 matches=[h for h in t['blocks'] if re.search(pattern,h['title'],re.I)]
 for h in matches:
  if len(plain(h['html']))>20:ds.append(detail(t,h))
def unique(ds):
 seen=set();out=[]
 for d in ds:
  key=(d['source']['book'],d['title'],d['html'][:120])
  if key not in seen and not any(d['html'] in previous['html'] and d['source']['book']==previous['source']['book'] for previous in out):seen.add(key);out.append(d)
 return out
magic_blocks=[];ordinary_blocks=[]
for t in SOURCES:
 magic_scope=(t['book']=='dmg' and t['slug']=='dmg-treasure') or (t['book']=='ua' and re.search(r'ua-dm-.*descriptions',t['slug'])) or (t['book']=='oa' and t['slug']=='oa-treasure-magic') or (t['book']=='dla' and t['slug']=='dla-magical-items') or (t['book']=='gha' and 'magical-items' in t['slug']) or (t['book']=='ref5' and t['slug']=='ref5-night-gallery')
 ordinary_scope=any(w in t['slug'] for w in ['equipment','weapon','armor','pole-arm','light','encumbrance','survival','clothing','food','drink','water','rope','fire']) and not magic_scope and 'spell' not in t['slug']
 for h in t['blocks']:
  if len(plain(h['html']))<18:continue
  if magic_scope and h['level']>=2:magic_blocks.append((t,h))
  elif ordinary_scope:ordinary_blocks.append((t,h))
def match(item,blocks):
 scored=[]
 for t,h in blocks:
  if t['book'].upper() not in [s['book'] for s in item['source']]:continue
  title=h['title'];english=en(title);chinese=zh(title)
  a,b=norm(item['nameEn']),norm(english);c,d=norm(item['nameZh']),norm(chinese)
  score=100 if a and a==b else 95 if c and c==d else 0
  if not score and english and family(item['nameEn'])==family(english) and loose(item['nameEn']) and loose(item['nameEn'])==loose(english):score=85
  if not score and c and norm(re.sub('药水|油剂|滤剂|卷轴','',item['nameZh']))==norm(re.sub('药水|油剂|滤剂|卷轴','',chinese)):score=80
  if score:scored.append((score,t,h))
 if not scored:return []
 best=max(x[0] for x in scored)
 return [(t,h) for score,t,h in scored if score==best]
items={};unmatched=[]
for item in CAT['items']:
 magic=bool(re.search('魔法|神器',item['category'])) or item['source'][0]['book']=='REF5'
 blocks=match(item,magic_blocks if magic else ordinary_blocks)
 ds=[detail(t,h) for t,h in blocks]
 if not ds and magic:unmatched.append(item['id'])
 if ds:items[item['id']]={'details':unique(ds),'description':plain(re.search(r'<p\b[^>]*>(.*?)</p>',ds[0]['html'],re.S|re.I)[1]) if re.search(r'<p\b[^>]*>(.*?)</p>',ds[0]['html'],re.S|re.I) else item['description']}
# A healing potion example predates the imported stable DMG record.
healing=items.get('magic-healing')
if healing:items['healing-potion']=json.loads(json.dumps(healing))
classes={}
for cls in CAT['classes']:
 ds=[];cid=cls['id'];english=cls['nameEn']
 if cid.startswith('oa-'):
  addheads(ds,'oa','oa-oriental-classes',r'^'+re.escape(cls['nameZh'])+r'\s+'+re.escape(english)+r'$')
  if cid=='oa-samurai':addheads(ds,'oa','oa-oriental-classes',r'^武士 Samurai')
  addwhole(ds,'oa','oa-classes-races','OA · 职业选择、属性与种族限制')
 else:
  addwhole(ds,'phb',cid if cid!='bard' else 'bard-class','PHB · 职业完整规则')
  addwhole(ds,'ua','ua-'+cid,'UA · 补充与变更')
  if cid=='bard':addwhole(ds,'phb','bard-abilities','PHB · 吟游诗人能力与等级表')
  if cid in ('cleric','fighter','ranger','thief','assassin'):
   # The original DMG labels follower classes in bold rather than heading tags.
   addheads(ds,'dmg','dmg-character-classes',r'^'+re.escape(cls['nameZh'])+r'\s+'+re.escape(english)+r's?$')
  if cid=='paladin':addwhole(ds,'dmg','dmg-paladins-warhorse')
  if cid=='thief':addwhole(ds,'dmg','dmg-thief-abilities')
  if cid=='assassin':addheads(ds,'dmg','dmg-character-classes',r'刺客|刺杀|Spying')
  if cid=='cavalier':addwhole(ds,'ua','ua-dm-cavalier-followers')
  if cid in ('fighter','ranger','paladin','cavalier','barbarian'):addwhole(ds,'ua','ua-weapon-specialization','UA · 武器专精规则与适用职业')
  if cid in ('magic-user','illusionist'):
   addwhole(ds,'ua','ua-dm-magic-user-spellbooks','UA · 法术书与学习规则')
   addwhole(ds,'dla','dla-wizards-high-sorcery','DLA · 克莱恩的高等法术与月相规则')
  if cid in ('cleric','druid'):addwhole(ds,'dla','dla-holy-orders-stars','DLA · 克莱恩的神圣教团与施法')
  addheads(ds,'dla','dla-characters-krynn',r'可接受职业的特殊限制|克莱恩的一般限制')
 if cid in ('ranger','thief-acrobat','barbarian','oa-barbarian'):
  for book,slug in [('wsg','wsg-proficiencies'),('dsg','dsg-proficiencies')]:addwhole(ds,book,slug,f'{book.upper()} · 非武器熟练项的可选扩展')
 classes[cid]={'details':unique(ds)}
races={}
slugs={'dwarf':'dwarves','elf':'elves','gnome':'gnomes','half-elf':'half-elves','halfling':'halflings','half-orc':'half-orcs','human':'humans'}
for race in CAT['races']:
 ds=[];rid=race['id']
 if rid in slugs:
  addwhole(ds,'phb',slugs[rid],'PHB · 种族完整规则')
  addwhole(ds,'ua','ua-race-'+slugs[rid],'UA · 亚种、能力与调整')
  addwhole(ds,'ua','ua-race-class-limitations','UA · 可选职业表')
  addwhole(ds,'ua','ua-race-level-limitations','UA · 职业等级与属性上限表')
  addwhole(ds,'dmg','dmg-player-character-racial-tendencies','DMG · 种族倾向与扮演')
  if rid=='elf':addheads(ds,'dla','dla-races-krynn',r'精灵 Elves|Silvanesti|Qualinesti|Kagonesti|Dargonesti|Dimernesti')
  if rid=='dwarf':addheads(ds,'dla','dla-races-krynn',r'矮人 Dwarves|Hill Dwarves|Mountain Dwarves')
 elif rid in ('korobokuru','hengeyokai','spirit-folk'):
  addheads(ds,'oa','oa-classes-races',re.escape(race['nameEn'])+r'$')
  if rid=='hengeyokai':addheads(ds,'oa','oa-classes-races',r'^表 11')
  addheads(ds,'oa','oa-classes-races',r'^职业与种族组合|^种族属性值限制')
 elif rid.startswith('dla-'):
  patterns={'dla-kender':r'\bKender$','dla-gully-dwarf':r'沟谷矮人|Gully Dwar','dla-krynn-minotaur':r'^牛头怪|^牛头人|Minotaur','dla-silvanesti-elf':r'Silvanesti','dla-qualinesti-elf':r'Qualinesti'}
  addheads(ds,'dla','dla-races-krynn',patterns[rid])
 races[rid]={'details':unique(ds)}
for name,data in [('item-details',items),('class-details',classes),('race-details',races)]:
 (ROOT/f'src/data/public/{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'.git/library-unmatched.json').write_text(json.dumps(unmatched,indent=2),encoding='utf8')
print(json.dumps({'itemsWithRules':len(items),'unmatchedMagic':len(unmatched),'classes':{k:len(v['details']) for k,v in classes.items()},'races':{k:len(v['details']) for k,v in races.items()}}))
