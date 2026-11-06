"""Reconcile named entries against the local 1e translations and supplement table-only gear."""
exec(compile((__import__('pathlib').Path(__file__).with_name('enrich-library.py')).read_text(encoding='utf8'), 'enrich-library.py', 'exec'))

# A page break is not the end of a rule. Join continuation paragraphs before matching.
for t in SOURCES:
 for h in t['blocks']:
  if '（续）' in h['title']:
   previous=next((p for p in t['blocks'] if p['title']==h['title'].replace('（续）','')),None)
   if previous:previous['html']+='\n'+h['html']

def findblock(book,pattern):
 return next(((t,h) for t in SOURCES if t['book']==book for h in t['blocks'] if re.search(pattern,h['title'],re.I)),None)
def attach(iid,book,pattern,lead=False):
 found=findblock(book,pattern)
 if not found:return False
 t,h=found;d=detail(t,h)
 if lead:d['html']=re.split(r'<h[1-6]\b',d['html'])[0]
 if not plain(d['html']):return False
 items.setdefault(iid,{'details':[]})['details'].append(d)
 return True

# Re-match against the joined blocks.
for item in CAT['items']:
 magic=bool(re.search('魔法|神器',item['category'])) or item['source'][0]['book']=='REF5'
 matched=match(item,magic_blocks if magic else ordinary_blocks)
 if matched:items.setdefault(item['id'],{})['details']=unique([detail(t,h) for t,h in matched])

special={
 'magic-daerns-instant-fortress':('dmg',r'Doern.s Instant Fortress$'),
 'magic-figurine-of-wondrous-power':('dmg',r'Figurines of Wondrous Power$'),
 'magic-shield-large-1-4-vs-missiles':('dmg',r'Shield, Large,.*Missiles$'),
 'magic-shield-1-missile-attractor':('dmg',r'Missile Attractor$'),
 'oa-spirit-net':('oa',r'Net of Spirit Snaring$'),
 'oa-restoration-mirror':('oa',r'Mirror of Curing$'),
 'oa-spirit-summoning-tablet':('oa',r'Tablet of Spirit Summoning$'),
 'ref5-mirror-against-undead':('ref5',r'^镜子$'),
 'ref5-sunstrike-holy-symbol':('ref5',r'^Sunstrike$'),
 'ref5-life-glyph':('ref5',r'^Life$'),
 'ref5-sunstone-talisman':('ref5',r'^护符$'),
}
for iid,(book,pattern) in special.items():attach(iid,book,pattern)
for iid in ['oa-biwa-of-calm','oa-biwa-of-charm','oa-biwa-of-discord']:attach(iid,'oa',r'Biwa$')
for iid in ['oa-pearl-ebbing-tide','oa-pearl-rising-tide','oa-tide-pearl']:attach(iid,'oa',r'^退潮珍珠与涨潮珍珠$')
for pattern in [r'Seal of Deception$',r'Seal of Vigor$']:attach('oa-family-seal','oa',pattern)
for pattern in [r'Mirror of Curing$',r'Mirror of Enlightenment$',r'Mirror of Fear$',r'Mirror of Spirit Seeing$']:attach('oa-oriental-mirror','oa',pattern)
items['oa-family-seal'].update(nameZh='东方魔法印章',nameEn='Magical Seals',catalogHidden=True)
items['oa-oriental-mirror'].update(nameZh='东方魔法镜',nameEn='Magical Mirrors',catalogHidden=True)
items['oa-tide-pearl'].update(catalogHidden=True)

# Explicit translations of the three cursed sword rules, DMG printed p.166 (PDF page 167).
curse={
 'magic-sword-1-cursed':'此剑具有 +1 武器的命中与伤害加值。面对敌人时，它会牢牢粘在持有者手中，迫使其战斗，直至敌人或持有者死亡。战斗结束后可以松手，却无法摆脱此剑：再次面对对手时，它仍会出现在手中。须由牧师施行驱魔才能解除。',
 'magic-cursed':'此剑带有魔法灵光，在练习时表现正常；实战中却使持有者命中骰 −2，伤害也 −2，但伤害最低为 1。只有仔细观察才能发现命中率下降。面对敌人时，它会传送到持有者手中并迫使其使用。只有有限祈愿、祈愿或改变现实才能摆脱。',
 'magic-sword-cursed-berserking':'除实战外，各种测试都把它显示为 +2 魔法剑。进入真正战斗后，持有者会狂暴，攻击距离最近的生物，直至自己死亡或身周 6″ 内不再有活物。此剑的加值为 +2，其他强迫使用与无法摆脱的性质与 +1 诅咒剑相同；须经驱魔或祈愿才能摆脱。'
}
for iid,body in curse.items():items[iid]={'description':body,'details':[{'title':'诅咒与解除条件','html':'<p>'+body+'</p>','source':{'book':'DMG','page':166,'section':'Swords'},'href':'/books/dmg/treasure-continuation-27/'}]}

for item in CAT['items']:
 iid=item['id'];name=item['nameEn'];magic=bool(re.search('魔法|神器',item['category']))
 if magic and item['source'][0]['book']=='DMG' and not items.get(iid,{}).get('details'):
  armor=bool(re.search(r'armor|mail|shield|leather',name,re.I))
  attach(iid,'dmg',r'^护甲与盾牌 Armor and Shield$' if armor else r'^剑 Swords$' if 'sword' in name.lower() else r'^杂项武器 Miscellaneous Weapons',True)
  bonus=re.search(r'[+−-]\s*\d+',name)
  if bonus:
   text=(f"{item['nameZh']}在普通同类护甲或盾牌的防护基础上提供 {bonus[0]} 魔法调整；AC 越低防护越好。魔法盾牌仍保留普通盾牌的重量。" if armor else f"{item['nameZh']}的魔法加值为 {bonus[0]}，同时用于命中骰与伤害骰；武器的基本伤害和使用方式沿用同类武器。")
   items.setdefault(iid,{'details':[]})['description']=text
  # The random table includes a +5 defender, while the prose example uses +4.
  if 'defender' in name.lower():attach(iid,'dmg',r'Sword \+4, Defender$')

# Named headings become entries, never random-table headings or generic item families.
additions=[];existing=CAT['items'][:]
gha_names={
 'gha-magical-items-rings':['Admundfort Ring of Leadership','Lucky Ring of the Wild Coast','Cursed Ring of the Great Kingdom','Ring of the Pomarj'],
 'gha-magical-items-rods-wands-amulets':['Diplomacy Rod of Furyondy','Rod of the Aerdi Sea','Rod of Onnwal','Rod of Welkwood','Skull-Staff of Hepmonaland','Staff of Gnatmarsh','Staff of Hornwood','War Staff of Nyrond','Bisselite Wand of Peace','Scant Wand of Storms','Dark Wand of the Sulhaut Mountains','Fire Wand of Suloise','Wand of Highfolk','Yatil Wand of Zooming','Amulet of the Cairn Hills','Amulet of Furyondy','Amulet of Spinecastle'],
 'gha-magical-items-miscellaneous-1':['Anvil of the Lortmil Mountains','Bear Cloak of the Sulhaut Mountains','Black Crown of Aerdy','Black Sails of Schnai','Casket of Furyondy','Cheetah Cloak of Amedio','Cloak of the Hellfurnaces','Coin of Almor','Collar of Tusmit','Holy Symbol of Greyhawk','Crown of Blackmoor','Disk of the Azure Sea','Dream Cap of Veluna','Eyepatch of Tenh','Flaming Mirror of Tenh',"Gemcutter’s Tools of Sunndi",'Goblet of the Great Kingdom','Golden Girdle of Urnst','Golden Circlet of Greyhawk'],
 'gha-magical-items-miscellaneous-2':['Hasty Barge of Nyr Dyv','Headband of the Corusk Mountains','Healing Cap of Veluna','Headband of the Jotens','Holy Star of the Bright Desert','Holy Medallion of Almor','Horn of the Azure Sea','Horn of the Barrier Peaks','Horn of the Vast Swamp','Iron Crown of the Bandit Kingdoms','Iron Pin of the Icy Sea','Lantern of Greyhawk','Locket of the Great Kingdom','Medallion of Malog','Medegian Bracelet of Lost Ships','Necklace of Almor','Oracles of Greyhawk','Paints of Blackmoor','Prism of Greyhawk','Purple Gem of the Vesve Forest','Robe of Veluna','Scarf of the Dry Steppes','Sceptre of the Forgotten City','Silver Crown of Veluna'],
 'gha-magical-items-miscellaneous-3':['Star of Celene','Storm Rider of the Gearnat Sea','Tapestry of Ekbir','Tiger Cloak of Chakyik','Timeglass of the Mage','Turbans of Tusmit','Blue Armor of the Crystalmist Mountains +3',"Tusmit’s Battle Crescent",'Whistle of Axewood','Wings of the Rakers','Wolf Cloak of Wegwiur',"Woodworker’s Tools of Dyvers"],
 'gha-armor-shields-swords-weapons-1':['Goblin Shield of the Pomarj +2','Keolish Plate Mail of the Seas +1','Red Armor of the Hellfurnaces +4','Shield of Greyhawk +3','Thillonrian Shield of Berserking +2','White Armor of the Griff Mountains +3','Equalizer of Gran March','Flying Scimitar of Tusmit +3','Rel Astran Sword of Enmity +1, +3 vs. Racial Enemies','Stonefist Sword of Rage +2','Sword of the Wild Coast +3','Warlord Blade of the Shield Lands','Axe of Sulward +2','Black Arrow of Iuz +3','Cord of Ekbir +1','Iron Gauntlet of Urnst','Razor Claws of Chakyik +2','Trident of the Oljatt Sea +2','Whip of Zeif +3']
}
for t in SOURCES:
 if t['book']=='gha' and t['slug'] in gha_names:
  hs=[h for h in t['blocks'] if h['level']==3]
  assert len(hs)==len(gha_names[t['slug']]),t['slug']
  for h,english in zip(hs,gha_names[t['slug']]):h['english']=english
matched_blocks={}
for original in CAT['items']:
 for mt,mh in match(original,magic_blocks):matched_blocks[(mt['book'],mt['slug'],mh['start'])]=original
 for d in items.get(original['id'],{}).get('details',[]):
  for mt,mh in magic_blocks:
   if d['source']['book']==mt['book'].upper() and d['title']==mh['title']:matched_blocks[(mt['book'],mt['slug'],mh['start'])]=original
for t in SOURCES:
 scope=t['book']=='dmg' and t['slug']=='dmg-treasure' or t['book']=='ua' and re.search(r'ua-dm-.*descriptions',t['slug']) or t['book']=='oa' and t['slug']=='oa-treasure-magic' or t['book']=='dla' and t['slug']=='dla-magical-items' or t['book']=='gha' and t['slug'] in gha_names
 if not scope:continue
 for h in t['blocks']:
  english=h.get('english',en(h['title']));chinese=zh(h['title']);body=plain(h['html'])
  if not english or not chinese or '（续）' in h['title'] or len(body)<35:continue
  if h['level'] < (3 if t['book'] in ['dla','gha'] else 4):continue
  if re.search(r'^III|^Table|^第|^表|^Spell Level|^Magic Spell|^Use of Scroll|^Note |^Protection Scrolls$|^Special Note$|^Air$|^Earth$|^Fire$|^Water$|^General Properties|^Notes Regarding|^Sword Intelligence|^Sword Alignment|^Axes \(|Artifacts|Power/Effects|Possible Destruction|^Potions?$|^Rings?$|^Scrolls?$|^Rods?$|^Staves$|^Wands?$|^Swords?$|^Weapons$|^Armor|Miscellaneous|^Biwa$|^Spears$',english,re.I):continue
  if t['book']!='gha' and not re.search(r'[\u3400-\u9fff]',chinese):continue
  probe={'nameEn':english,'nameZh':chinese,'source':[{'book':t['book'].upper()}]}
  matches=[]
  same=matched_blocks.get((t['book'],t['slug'],h['start']))
  same=same or next((i for i in existing if i['source'][0]['book']==t['book'].upper() and (norm(i['nameEn'])==norm(english) or norm(i['nameZh'])==norm(chinese))),None)
  if same:
   items.setdefault(same['id'],{})['details']=unique(items.get(same['id'],{}).get('details',[])+[detail(t,h)])
   continue
  if t['book']=='dmg' and english.startswith('Protection from '):english='Scroll of '+english;chinese+='卷轴'
  iid=t['book']+'-item-'+re.sub(r'[^a-z0-9]+','-',english.lower()).strip('-')
  if any(i['id']==iid for i in existing):continue
  artifact=t['book']=='dmg' and h['start']>next(x['start'] for x in t['blocks'] if x['title']=='圣物与遗物 Artifacts and Relics') and h['start']<next(x['start'] for x in t['blocks'] if x['title']=='圣物与遗物能力／效果表 Artifacts and Relics Power/Effects Tables') or t['book']=='dmg' and bool(re.search('Vecna|Kas|Orcus|Baba Yaga|Codex|Al.Akbar|Arnd|Jacinth|Lum the Mad|Regalia|Mighty Servant|Axe of the Dwarvish|Rod of Seven|Queen Ehlissa|Teeth of Dahlver',english,re.I))
  if english=='Mighty Servant of Leuk-O':chinese='莱乌克-欧的强力仆役'
  entry={'id':iid,'nameZh':chinese,'nameEn':english,'category':'神器' if artifact else '魔法物品','price':'未列售价','weight':'未列','description':body.split('。')[0]+'。','tags':['魔法']+(['神器'] if artifact else []),'source':[{'book':t['book'].upper(),'section':h['title']}],'details':[detail(t,h)]}
  additions.append(entry);existing.append(entry)

# Old shorthand names resolve to the actual named entry, keeping saved card IDs intact.
for old,english in [('oa-spirit-net','Net of Spirit Snaring'),('oa-restoration-mirror','Mirror of Curing'),('oa-spirit-summoning-tablet','Tablet of Spirit Summoning')]:
 canonical=next((i for i in existing if norm(i['nameEn'])==norm(english) and i['id']!=old),None)
 if canonical:items[old].update(catalogHidden=True,aliases=[english],nameZh=canonical['nameZh'],nameEn=canonical['nameEn'])

# Ordinary equipment: explain the object and its actual use, not just repeat a price row.
purposes=[
 (r'banded mail','横向相接的甲片覆盖在链甲外，构成躯干与肢体的防护。'),(r'splint mail','纵向甲片夹在衣料层中，并穿在链甲外。'),(r'studded leather','皮革上嵌入防护铆片，肩部另加防护层。'),(r'ring mail','在皮甲上缝入密集铁环的护甲。'),(r'scale mail|metal scale','相互重叠的小金属鳞片固定在底衬上。'),(r'chain mail','由相互扣合的金属环组成的链甲。'),(r'plate mail','胸、背、肩、肘、胯与腿部甲片穿在链甲外；与后世整套全身板甲有别。'),(r'padded armor','以厚织物和衬垫吸收打击的软甲。'),(r'leather armor','熟皮制成的护甲，包含外套及相应肢体防护。'),(r'shield|buckler','手持或固定于前臂的防具；防护效果还取决于攻击方向及每轮可拦截的攻击。'),(r'helmet','保护头部的盔具；大小与覆盖程度会影响观察及佩戴。'),
 (r'arrow|quarrel|bolt|sling bullet|sling stone','供对应弓、弩或投石索使用的弹药；购买单位、弹药种类与发射武器应分别记录。'),
 (r'crossbow','以弩机上弦并发射弩矢的远程武器；轻弩、重弩与手弩各用对应射速和射程。'),(r'\bbow\b|daikyu','以弓弦发射箭矢；长弓、短弓及复合弓分别采用各自武器数据。'),(r'javelin|atlatl','标枪用于投掷；投矛器借助杠杆帮助掷出标枪。'),(r'sling','利用皮兜或绳兜旋转发射弹丸的远程武器。'),(r'dagger|knife|ninja-to|wakizashi','适合近身使用的短刃；能否投掷及其数据应按具体武器表区分。'),(r'axe','斧刃集中在柄端；战斧与手斧的持用及投掷数据不同。'),(r'mace|hammer|flail|morning star','以重型头部、锤面或带链打击部造成伤害的近战武器。'),(r'\bpick\b','尖头用于集中穿刺；军用镐与采掘工具的用途有别。'),(r'sword|scimitar|katana','有护手和长刃的近战武器；剑型决定对不同体型目标的伤害、速度与所需空间。'),(r'lance','主要供骑乘战斗使用的长柄刺击武器；冲锋与骑乘攻击依相应规则处理。'),(r'spear|yari|trident','以尖头刺击的长柄武器；手持、投掷及对冲锋的使用方式按武器表和战斗规则处理。'),(r'bardiche|bec de corbin|guisarme|fauchard|glaive|halberd|lucern|partisan|pike|ranseur|spetum|voulge|military fork','将刃、尖刺或钩装在长柄上的步战武器；各型的长度、挥动空间、速度及对护甲调整不同。'),(r'bo stick|jo stick|quarter|^bo$','以木棒两端进行打击的杖类武器。'),(r'whip|lasso|man catcher|garrot|sap|caltrop|tetsu|metsubishi|nunchaku|kusari|shuriken|aklys|blowgun','具有专门攻击方式的武器；擒抱、投掷、妨碍行动等效果须使用该武器的专门规则。'),
 (r'backpack','背负携行的容器，适合集中携带随身装备。容器本身与内容物的负重分别计算。'),(r'box|chest','用于收存和运输物品的硬质箱具；铁箱与木箱及不同尺寸分别计价、计重。'),(r'pouch|sack','柔软的随身容器，适合装零钱、零件或补给；袋内物品另计负重。'),(r'case.*map|case.*scroll','用于收存地图或卷轴的筒盒，便于携带并减少直接磨损。'),(r'quiver','收纳箭或弩矢的箭袋；容量按条目所列的打或二十支单位记录。'),(r'water container|skin for','盛装饮水或酒的容器；容器与所装液体分别记录。'),
 (r'candle','以烛芯和蜡或脂肪燃烧提供小范围照明；需要点火，燃料会消耗。'),(r'lantern','以灯油作燃料的照明器具；遮光式与聚光式的照明方向不同。'),(r'torch','燃烧式手持照明，使用中会消耗火把并暴露持有者位置。'),(r'oil','灯具燃料；用于燃烧攻击时须依投掷、点燃和燃烧规则处理。'),(r'tinder','以燧石、火镰和引火物生火的套具；点燃灯火仍需要操作时间。'),(r'mirror','用于照面、反射光线或间接观察的金属镜；本身不提供魔法效果。'),(r'pole','用于探触地面、跨越小间隙或隔着距离试探物体的长杆。'),(r'rope','用于捆扎、攀爬与牵引的绳具；长度按条目记录，固定点和承重情况影响实际使用。'),(r'spike','可打入缝隙以固定绳索、楔住门或辅助攀爬的铁钉。'),(r'thieves','开锁、拆除小型机关等操作使用的专用工具；工具不会自动赋予盗贼技能。'),
 (r'beads|incense|holy|symbol','宗教仪式或施法使用的用品；普通圣徽与经祝圣的圣水应区别记录。'),(r'garlic','一瓣大蒜，可作为食材或在特定生物规则允许时使用。'),(r'belladonna|wolvesbane','药草材料；其毒性、疗效及对特定生物的作用依对应规则处理。'),
 (r'barding','供坐骑穿戴的护甲；不能直接套用人物护甲的重量与价格。'),(r'bit and bridle','衔铁与缰绳配合，用于引导和控制坐骑。'),(r'harness','将牲畜与车辆或载荷连接的挽具。'),(r'saddle bags','挂在鞍侧的袋具，用于分配坐骑携带的物资。'),(r'saddle blanket','铺在鞍下的垫毯，隔开鞍具与坐骑背部。'),(r'saddle','供骑手乘坐并固定在坐骑背上的鞍具。'),
 (r'\bbarge\b|\braft\b','用于水上承载与运输的平底船或筏。'),(r'canoe|kayak|boat','小型水上交通工具，载员、载重和操纵要求依具体船型与水域规则处理。'),(r'galley','以桨手推进并可配帆的船舶；航速、载重和船员要求依船型处理。'),(r'ship','海上运输或作战船只；船员、容量和速度须按船型查阅。'),(r'cart|wagon','以轮轴运载物资的车辆，通常需要挽畜；车辆自重和所载货物分别计算。'),
 (r'rations','供旅行携带的口粮；按条目所列天数或周数购买，并依环境计算保存与每日消耗。'),(r'grain.*horse','供坐骑食用的一日谷料；与人物口粮分开记录。'),(r'ale|beer|mead|wine|sake','按条目所列容量购买的饮料；酒与饮水在补给规则中应分别计算。'),(r'food|meal','供人物食用的一餐食物；富裕餐食与商旅餐食的差别体现在供应和价格。'),
 (r'clothing|boots|belt|cap|cloak|girdle|hat|robe','日常穿戴用品；材质、覆盖与气候适用性会影响旅行和生存。普通衣物不提供魔法防护。'),
 (r'horse|warhorse|pony|mule|donkey|ox|cow','可作骑乘、驮运、挽车或畜牧用途的动物；战马、乘用马、驮畜的负载与战斗用途不同。'),(r'dog|hawk','可训练用于警戒、狩猎或追踪的动物；实际行为依训练及动物规则处理。'),(r'chicken|goat|pigeon|pig|sheep|songbird','供饲养、食用、通信或观赏的动物；用途取决于品种及训练。')]
for item in CAT['items']:
 if re.search('魔法|神器',item['category']) or item['source'][0]['book']=='REF5':continue
 extra=items.setdefault(item['id'],{'details':[]});body=item['description']
 purpose=next((text for pattern,text in purposes if re.search(pattern,item['nameEn'],re.I)),None)
 if purpose:
  # Preserve existing book-specific practical instructions, replacing only table-only summaries.
  extra['description']=purpose+(' '+body if not re.search(r'；价格|DMG 表列|随机骰值',body) and not body.startswith(purpose) else '')
 if item.get('weaponCombat'):
  combat=item['weaponCombat'];bits=[]
  if 'handHeld' in combat:bits.append('手持攻击的长度、所需空间、速度因子与逐项对 AC 调整列于下表。')
  if 'missile' in combat:bits.append('投射攻击的射速、短／中／远射程与对 AC 调整列于下表。')
  extra['description']=extra.get('description',body)+' '+''.join(bits)
 if not extra.get('details') and len(body)>45:
  extra['details']=[{'title':'用途与使用','html':'<p>'+html.escape(body)+'</p>','source':item['source'][0],'href':'/books/'+item['source'][0]['book'].lower()+'/'}]
 # Ordinary armor already has its construction entry; the treasure chapter's
 # Armor and Shield heading describes magical equipment only.
 if item['source'][0]['book']=='WSG':
  if 'shelter' in item['nameEn'].lower():attach(item['id'],'wsg',r'^便携庇护所$')
  elif 'clothing' in item['nameEn'].lower():addwhole(extra['details'],'wsg','wsg-weather-clothing')
  else:addwhole(extra['details'],'wsg','wsg-food-water')
 if item['source'][0]['book']=='DSG':
  attach(item['id'],'dsg',r'^常用装备说明$' if not any(x in item['nameEn'].lower() for x in ['boat','canoe','kayak']) else r'^交通工具$',False)
 if item['source'][0]['book']=='OA' and item['category']=='武器':
  attach(item['id'],'oa',r'^特殊武器$')
  attach(item['id'],'oa',r'^武器等效与数值$')
 if item['source'][0]['book']=='OA' and item['category']=='护甲':attach(item['id'],'oa',r'^护甲$')

# The DMG miscellaneous tables use three columns, not the four-column XP/GP layout.
treasure=get('dmg','dmg-treasure')
prices={}
for table in re.findall(r'<table\b[^>]*>.*?</table>',treasure['html'],re.S|re.I):
 if '售价（金币）' not in table:continue
 for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',table,re.S|re.I):
  cells=[plain(c) for c in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S|re.I)]
  if len(cells)==3 and en(cells[1]):prices[norm(en(cells[1]))]=cells[2]
for item in additions:
 if item['source'][0]['book']=='DMG' and norm(item['nameEn']) in prices:
  item['price']='参考售价 '+prices[norm(item['nameEn'])]+' gp'

# Reconcile repeated OA shorthand records and the original healing-potion example.
for shorthand,english in [('oa-noise-cannon','Noisome Spirit Chasers'),('oa-fire-protection-pearl','Pearl of Protection from Fire'),('oa-minyan-shrine','Minyan'),('oa-enlightenment-mirror','Mirror of Enlightenment'),('oa-spirit-mirror','Mirror of Spirit Seeing')]:
 old=next((i for i in CAT['items'] if i['id']==shorthand),None)
 canonical=next((i for i in CAT['items'] if i['nameEn']==english),None)
 if old and canonical and old['id']!=canonical['id']:items.setdefault(old['id'],{}).update(catalogHidden=True,aliases=[english])
items['healing-potion']['catalogHidden']=True

# DMG follower sub-tables use the same heading level as their class labels.
followers=get('dmg','dmg-character-classes')
labels=['cleric','fighter','ranger','thief','assassin']
patterns=[r'^牧师 Clerics$',r'^战士 Fighters$',r'^巡林客 Rangers$',r'^盗贼 Thieves$',r'^刺客 Assassins$']
for index,cid in enumerate(labels):
 h=next(h for h in followers['blocks'] if re.search(patterns[index],h['title']))
 stop=next((x['start'] for x in followers['blocks'] if x['start']>h['start'] and (re.search(patterns[index+1],x['title']) if index<4 else 'Paladin' in x['title'])),len(followers['html']))
 expanded={**h,'html':followers['html'][h['end']:stop]}
 classes[cid]['details']=[d for d in classes[cid]['details'] if not (d['source']['book']=='DMG' and d['title']==h['title'])]
 classes[cid]['details'].append(detail(followers,expanded))
for t in SOURCES:
 if t['book']=='gha' and ('deities' in t['slug'] or any(x in t['slug'] for x in ['boccob','celestian','cuthbert','ehlonna','fharlanghn','incabulos','ist us','iuz','nerull','ralishaz','trithereon','ulam','vecna','st-cuthbert'])):
  for h in t['blocks']:
   if re.search(r'牧师$|祭司$|Priests$|Clerics$',h['title'],re.I) and len(plain(h['html']))>30:classes['cleric']['details'].append(detail(t,h,title='GHA · '+h['title']))
classes['cleric']['details']=unique(classes['cleric']['details'])

# Independent regional careers and the Krynn gnome retain their complete source tables.
class_additions=[]
for cid,chinese,english,slug,hitdie,spellcasting in [
 ('dla-knight-solamnia','索兰尼亚骑士','Knight of Solamnia','dla-characters-krynn','1d10','宝剑骑士的祈祷与法术另见教团规则'),
 ('dla-tinker','发明家','Tinker','dla-tinkers-gnomes','见侏儒晋级表','以发明、设计与装置为专长')]:
 ds=[];addwhole(ds,'dla',slug,'DLA · '+chinese+'完整规则与表格')
 class_additions.append({'id':cid,'nameZh':chinese,'nameEn':english,'referenceOnly':True,'primeRequisite':'见职业正文','minimumAbilities':{},'eligibleRaces':['human'] if 'knight' in cid else ['dla-tinker-gnome'],'hitDie':hitdie,'alignment':'守序善良' if 'knight' in cid else '见职业正文','weapons':'见职业正文','armor':'见职业正文','spellcasting':spellcasting,'description':'包含王冠、宝剑、玫瑰三大教团的入团条件、晋级表、誓言、准则和施法规则。' if 'knight' in cid else '克莱恩侏儒的特殊职业；包含设计、造价、建造、操作、故障及装置范例。','abilities':[],'source':[{'book':'DLA','section':chinese}],'details':ds})
ds=[];addheads(ds,'dla','dla-tinkers-gnomes',r'^发明家（侏儒）');addheads(ds,'dla','dla-races-krynn',r'Gnomes|侏儒')
race_additions=[{'id':'dla-tinker-gnome','nameZh':'克莱恩侏儒','nameEn':'Gnome of Krynn','referenceOnly':True,'modifiers':'见种族正文','restrictions':'发明家','levelLimits':'见侏儒晋级表','languages':'见种族正文','movement':'见种族正文','abilities':[],'eligibleClasses':[{'id':'dla-tinker','limit':'见侏儒晋级表'}],'multiclass':[],'savingThrows':'见种族正文','detection':'见种族正文','source':[{'book':'DLA','section':'Tinkers (Gnomes)'}],'details':ds}]
for name,data in [('class-additions',class_additions),('race-additions',race_additions),('class-details',classes),('race-details',races)]:
 (ROOT/f'src/data/public/{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

for iid,extra in items.items():
 extra['details']=unique(extra.get('details',[]))
 if extra['details'] and not extra.get('description'):
  ps=re.findall(r'<p\b[^>]*>(.*?)</p>',extra['details'][0]['html'],re.S|re.I)
  if ps:extra['description']=plain(ps[0])
(ROOT/'src/data/public/item-details.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'src/data/public/item-additions.json').write_text(json.dumps(additions,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Added named entries:',len(additions),'Sourced existing entries:',sum(bool(v.get('details')) for v in items.values()))
