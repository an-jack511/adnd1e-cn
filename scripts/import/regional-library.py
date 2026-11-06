"""Import actual translated regional rules, keeping existing IDs and complete rule text."""
from pathlib import Path
import re,json,html,sys
ROOT=Path(__file__).resolve().parents[2]
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def save(name,value):(ROOT/f'src/data/public/{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
SOURCES=read('.git/regional-sources.json');BASE=read('.git/full-library-audit.json');NAMES=read('scripts/import/regional-names.json');MANIFEST=read('scripts/import/gha-spell-names.json')
def plain(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def norm(s):return re.sub(r'[^a-z0-9\u3400-\u9fff]','',s.lower())
def slug(s):return re.sub(r'[^a-z0-9]+','-',s.lower().replace("'",'').replace('’','')).strip('-')
def translate(s):
 for en,zh in sorted(NAMES.items(),key=lambda pair:-len(pair[0])):s=re.sub(r'(?<![A-Za-z])'+re.escape(en)+r'(?![A-Za-z])',zh,s)
 return re.sub(r'(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])','',s).strip(' *（(·')
def sections(t):
 hs=list(re.finditer(r'<h([1-6])\b[^>]*>(.*?)</h\1>',t['html'],re.S))
 for i,h in enumerate(hs):
  end=next((n.start() for n in hs[i+1:] if int(n[1])<=int(h[1])),len(t['html']))
  yield plain(h[2]),t['html'][h.end():end],int(h[1])
def nameparts(title):
 title=title.strip(' *');paren=re.search(r'（([^）]+)）',title);outside=title[:paren.start()].strip() if paren else title
 if re.fullmatch(r"[A-Za-z0-9 ’',\-]+",outside):
  en=outside;zh=paren[1].split('，')[0].split('；')[0] if paren else NAMES.get(en,en)
 else:
  m=re.search(r"([A-Za-z][A-Za-z0-9 ’',\-]+)$",outside)
  if not m:return None
  en=m[1].strip();zh=outside[:m.start()].strip()
 return translate(zh),en
LABELS=[('level',r'^(?:等级|环级|Level)'),('range',r'^(?:距离|射程|Range)'),('duration',r'^(?:持续时间|Duration)'),('areaOfEffect',r'^(?:影响范围|作用范围|Area of Effect)'),('components',r'^(?:法术成分|成分|Components)'),('castingTime',r'^(?:施法时间|Casting Time)'),('savingThrow',r'^(?:豁免|Saving Throw)'),('school',r'^(?:学派|School)')]
def params(meta):
 out={}
 labels=list(re.finditer(r'<strong>(.*?)</strong>',meta,re.S))
 for i,label in enumerate(labels):
  k=next((key for key,pattern in LABELS if re.search(pattern,plain(label[1]),re.I)),None)
  if k:out[k]=plain(meta[label.end():labels[i+1].start() if i+1<len(labels) else len(meta)]).strip('。 ')
 return out
# Locate exact original English GHA names by translated spell suffix, rather than guessing translations.
GHA={norm(translate(re.sub(r'^\w+\s*的','',re.sub(r'（.*','',m['title'])))):m for m in MANIFEST}
def reference(t,title):return {'book':t['book'].upper(),'section':title}
def detail(t,title,body):
 body=re.sub(r'<img\b[^>]*>','',body);body=re.sub(r'<p>\s*出处：.*?</p>','',body,flags=re.S)
 return {'title':t['book'].upper()+' · '+title,'html':body,'source':reference(t,title),'href':f"/books/{t['book']}/{t['slug']}/"}
def oldmatch(kind,book,en,zh):
 candidates=[e for e in BASE[kind] if any(s['book']==book for s in e['source'])]
 return next((e for e in candidates if norm(e['nameEn'])==norm(en)),None) or next((e for e in candidates if norm(re.sub(r'^[A-Za-z]+\s*的','',e['nameZh']))==norm(re.sub(r'^.+?的','',zh))),None)
def firstparagraph(body):
 paragraphs=re.findall(r'<p\b[^>]*>(.*?)</p>',body,re.S)
 return next((plain(p) for p in paragraphs if len(plain(p))>20 and not plain(p).startswith(('出处：','原书 PDF','经验值'))),'')
spells=[];unparsed=[]
cantrips={'Catfeet','Snatch','Spark','Horn','Listen','Scorch','Gallop','Sting'}
for t in SOURCES:
 for title,body,level in sections(t):
  meta=re.search(r'<div class="spell-meta">(.*?)</div>',body,re.S)
  if not meta:continue
  child=re.search(r'<h[1-6]\b',body)
  if child and child.start()<meta.start():continue
  if len(plain(body[:meta.start()]))>100:continue
  fields=params(meta[1]);parts=nameparts(title)
  if not parts:unparsed.append((t['slug'],title));continue
  zh,en=parts
  if t['book']=='gha' and 'magical-spells' in t['slug']:
   key=norm(re.sub(r'^.+?的','',zh));m=GHA.get(key)
   if not m:unparsed.append((t['slug'],title));continue
   en=m['nameEn']
  if 'level' not in fields and en not in cantrips:continue
  n=re.search(r'\d+',fields.get('level','0'))
  if not n:unparsed.append((t['slug'],title));continue
  book=t['book'].upper();existing=oldmatch('spells',book,en,zh)
  # Old six-entry sample used two incorrect English aliases; preserve saved-card IDs.
  if book=='GHA':
   compat={'Feeling Fingers':'gha-bigby-sensing-fingers','Master of Arms':'gha-tenser-weaponmaster'}
   existing=next((e for e in BASE['spells'] if e['id']==next((v for k,v in compat.items() if en.endswith(k)),'')),existing)
  school=fields.get('school')
  if not school:
   paren=re.search(r'（([^）]+)）',title) or re.search(r'（([^）]+)）',plain(body[:meta.start()]))
   pieces=re.split('[，；]',paren[1]) if paren else []
   school=next((piece for piece in pieces if re.search(r'防护|变化|咒法|召唤|预言|惑控|附魔|魅惑|幻术|幻象|心灵创造|塑能|祈唤|死灵|Abjuration|Alteration|Conjuration|Divination|Enchantment|Illusion|Evocation|Necromancy',piece,re.I)), '原书未列')
  school=school.replace('系','').replace('－','／').replace('附魔／魅惑','惑控').replace('附魔','惑控').replace('召唤','咒法').replace('咒法／咒法','咒法')
  canonical=[('防护',r'防护|Abjuration'),('变化',r'变化|Alteration'),('咒法／召唤',r'咒法|召唤|Conjuration|Summoning'),('预言',r'预言|Divination'),('惑控／魅惑',r'惑控|附魔|魅惑|Enchantment|Charm'),('幻术／幻影',r'幻术|幻象|心灵创造|Illusion|Phantasm'),('祈唤／塑能',r'塑能|祈唤|Evocation|Invocation'),('死灵',r'死灵|Necromancy')]
  school='、'.join(label for label,pattern in canonical if re.search(pattern,school,re.I)) or school
  classes=['Magic-User']
  if book=='GHA' and 'magical-spells' not in t['slug']:classes=['Cleric']
  if book=='DLA' and en=='Mindspin':classes=['Magic-User','Illusionist']
  if book=='FR' and en in ['Briartangle','Thorn spray','Death chariot']:classes=['Druid']
  if book=='FR' and en in ['Holy Flail','Reveal','Bladebless','Sacred Link']:classes=['Cleric']
  content=body[:meta.start()]+body[meta.end():]
  content=re.sub(r'<p><strong>(?:解释／描述|说明／描述)[：:]</strong>\s*','<p>',content)
  record={'id':existing['id'] if existing else t['book']+'-'+slug(en),'nameZh':zh,'nameEn':en,'classes':classes,'level':int(n[0]),'school':school,'components':[c for c in ['V','S','M'] if c in fields.get('components','') or {'V':'言语','S':'姿势','M':'材料'}[c] in fields.get('components','')],'castingTime':fields.get('castingTime','原书未列'),'range':fields.get('range','原书未列'),'duration':fields.get('duration','原书未列'),'areaOfEffect':fields.get('areaOfEffect','原书未列'),'savingThrow':fields.get('savingThrow','原书未列'),'reversible':'可逆' in title or '反向法术' in plain(content) or '逆转法术' in plain(content),'description':firstparagraph(content),'tags':[book],'source':[reference(t,title)],'details':[detail(t,zh,content)]}
  if existing and existing.get('source',[{}])[0].get('page'):record['source'][0]['page']=existing['source'][0]['page']
  spells.append(record)
# A spell across a chapter boundary is one record, with both source sections available.
for record in spells:
 if record['nameEn']=='Stealspell':
  extra=next(t for t in SOURCES if t['slug']=='fr-books-forgotten-realms-10');record['details'].append(detail(extra,record['nameZh']+'（续）',extra['html']))
print('Parsed spells by source:',{b:sum(s['source'][0]['book']==b for s in spells) for b in ['GHA','DLA','FR']});print('Unparsed:',unparsed)
assert sum(s['source'][0]['book']=='GHA' and 'magical-spells' in s['details'][0]['href'] for s in spells)==106
assert not unparsed,unparsed
save('regional-spells',spells)

# Monster entries: retain full stat tables (including morale and THAC0) and all combat/ecology prose.
def tablevalues(body):
 table=re.search(r'<table\b[^>]*>.*?</table>',body,re.S);values={}
 if table:
  for tr in re.findall(r'<tr\b[^>]*>(.*?)</tr>',table[0],re.S):
   cells=re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',tr,re.S)
   if len(cells)==2:values[plain(cells[0])]=plain(cells[1])
 if not values:
  labels=list(re.finditer(r'<strong>(.*?)</strong>',body,re.S))
  for i,label in enumerate(labels):
   value=plain(body[label.end():labels[i+1].start() if i+1<len(labels) else len(body)]).split('。')[0]
   values[plain(label[1]).strip('：: ')]=value
 return values
keys={'frequency':r'出现频率|^频率|FREQUENCY','numberAppearing':r'出现数量|APPEARING','movement':r'^移动|MOVE','hitDice':r'生命骰|HIT DICE','inLair':r'巢穴|IN LAIR','treasureType':r'宝物|宝藏|TREASURE','attacks':r'攻击次数|ATTACKS','damage':r'每次攻击伤害|^伤害|DAMAGE','specialAttacks':r'特殊攻击|SPECIAL ATTACKS','specialDefenses':r'特殊防御|SPECIAL DEFENSES','magicResistance':r'魔法抗性|MAGIC RESISTANCE','intelligence':r'智力|INTELLIGENCE','alignment':r'阵营|ALIGNMENT','size':r'体型|SIZE','psionics':r'灵能|PSIONIC','environment':r'气候|地形|环境'}
monsters=[]
for t in SOURCES:
 if t['book']=='gha' and not any(k in t['slug'] for k in ['monsters-intro','vampire-cactus','camprat','changecat','crystalmist','dragon-greyhawk','grung','ingundi','nimbus','sea-sprite','swordwraith','mist-wolf','sea-zombie']):continue
 if t['book']=='dla' and t['slug']!='dla-creatures-krynn':continue
 if t['book']=='fr' and t['slug']!='fr-books-forgotten-realms-9':continue
 candidates=list(sections(t))
 for title,body,level in candidates:
  if '生物数据' in title:continue
  values=tablevalues(body)
  dreamshadow=t['book']=='dla' and title.startswith('梦影 ')
  if not dreamshadow and (not any(re.search('护甲等级|ARMOR CLASS',k,re.I) for k in values) or not any(re.search('生命骰|HIT DICE',k,re.I) for k in values)):continue
  if t['book']=='gha' and level!=2:continue
  if t['book']=='dla' and not ('Aurak' in title or 'Baaz' in title or 'Bozak' in title or 'Kapak' in title or 'Sivak' in title or any(k in title for k in ['梦影 ','梦魇 ','摄魂怪 ','冰熊 ','血海牛头怪 ','影民 ','巨海象 ','Thanoi','塔诺伊'])):continue
  if t['book']=='fr' and not title.startswith('Scalamagdrion'):continue
  parts=nameparts(title)
  if not parts:continue
  zh,en=parts
  if t['book']=='gha' and en=='Beastman':zh='兽人形变者'
  if t['book']=='fr':zh,en='书之守护者','Scalamagdrion'
  existing=next((e for e in BASE['monsters'] if any(s['book']==t['book'].upper() for s in e['source']) and (norm(e['nameEn']).startswith(norm(en)) or norm(en).startswith(norm(e['nameEn'])))),None)
  if t['book']=='dla' and en=='Shadowpeople':existing=next(e for e in BASE['monsters'] if e['id']=='dla-shadowperson')
  record={key:next((v for k,v in values.items() if re.search(pattern,k,re.I)),'与被模仿者相同' if dreamshadow else '原书未列') for key,pattern in keys.items()}
  ac=next((v for k,v in values.items() if re.search('护甲等级|ARMOR CLASS',k,re.I)),'与被模仿者相同');number=re.search(r'-?\d+',ac)
  record.update({'id':existing['id'] if existing else t['book']+'-'+slug(en),'nameZh':zh,'nameEn':en,'armorClass':int(number[0]) if number else None,'armorClassText':ac,'description':firstparagraph(re.sub(r'<table\b[^>]*>.*?</table>','',body,flags=re.S)),'source':[reference(t,title)],'details':[detail(t,zh,body)]})
  if existing:record['source']=existing['source']
  monsters.append(record)
save('regional-monsters',monsters)
# FR magic books and poisons were entirely absent from the equipment library.
booknames=[('Nchaser 的《Eiyromancia》','恩彻瑟的《预兆术》',"Nchaser's Eiyromancia"),('银爪之书','银爪之书','The Book of the Silver Talon'),('Chambeeleon','钱比利昂之书','Chambeeleon'),('Seven Fingers','七指之书','Seven Fingers'),('纳斯勒姆 Nathlum','纳斯勒姆','Nathlum'),('法师的工作册','巫师工作册',"The Wizards' Workbook"),('Bowgentle 的书','鲍金特尔之书',"Bowgentle's Book"),('Daimos 的法术书','戴莫斯的法术书',"Daimos' Spellbook"),('Num 的祷告书','努姆的祷告书',"Num's Prayerbook"),('Briel 的暗影之书','布里埃尔的暗影之书',"Briel's Book of Shadows"),('Sabirine 的《Specular》','萨比琳的《镜鉴》',"Sabirine's Specular"),('Glanvyl 的工作册','格兰维尔的工作册',"Glanvyl's Workbook"),('《战争之红书》','战争之红书','The Red Book of War'),('The Alcaister','阿尔凯斯特之书','The Alcaister'),('Aubayreer 的工作册','奥贝雷尔的工作册',"Aubayreer's Workbook"),('Orjalun 的《Arbatel》','奥贾伦的《阿尔巴特尔》',"Orjalun's Arbatel"),('The Scalamagdrion','斯卡拉玛格德里昂之书','The Scalamagdrion'),('《契约之书》','契约之书','The Tome of the Covenant'),('《独角兽之书》','独角兽之书','The Tome of the Unicorn')]
items=[]
for prefix,zh,en in booknames:
 ds=[]
 for t in SOURCES:
  if t['book']!='fr':continue
  for title,body,level in sections(t):
   if level==2 and ((en=='The Book of the Silver Talon' and '银爪之书' in title) or (en=='Nathlum' and ('Nathlum' in title or '纳斯勒姆' in title)) or (en=="The Wizards' Workbook" and ('Tulrun' in title or 'Tusirin' in title or '图尔伦' in title or '图西林' in title)) or (en=="Sabirine's Specular" and ('独有戏法' in title)) or title.startswith(prefix) or translate(title).startswith(translate(prefix)) or prefix=='《战争之红书》' and title.startswith(prefix)):
    ds.append(detail(t,zh+('（续）' if ds else ''),body))
 # The first few paragraphs of the wizard spellbooks can be continued on the next page.
 if not ds:raise AssertionError(prefix)
 items.append({'id':'fr-book-'+slug(en),'nameZh':zh,'nameEn':en,'category':'魔法物品','subCategory':'魔法书','price':'原书未列','weight':'原书未列','description':firstparagraph(ds[0]['html']),'tags':['FR','魔法书'],'source':[d['source'] for d in ds],'details':ds})
for t in SOURCES:
 if t['book']!='fr' or t['slug'] not in ['fr-books-forgotten-realms-2','fr-books-forgotten-realms-3']:continue
 for title,body,level in sections(t):
  en=next((word for word in ['Lhurdas','Varrakas','Prespra','Belpren','Orvas','Huld','Jeteye','Ulcrun','Dwarfbane'] if word in title),None)
  if not en:continue
  poisonnames={'Lhurdas':'黄死毒药','Varrakas':'瓦拉卡斯毒药','Prespra':'母亲之祸毒药','Belpren':'贝尔普伦毒药','Orvas':'奥瓦斯毒药',**NAMES};zh=poisonnames[en]
  items.append({'id':'fr-poison-'+slug(en),'nameZh':zh,'nameEn':en,'category':'装备','subCategory':'毒物','price':'原书未列','weight':'原书未列','description':firstparagraph(body),'tags':['FR','毒物'],'source':[reference(t,title)],'details':[detail(t,zh,body)]})
save('regional-items',items)
print('Regional records:',len(spells),'spells,',len(monsters),'monsters,',len(items),'FR items.')

