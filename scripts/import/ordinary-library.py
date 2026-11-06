"""Complete missing purchasable OA/DSG equipment from the actual price and damage tables."""
exec(compile((__import__('pathlib').Path(__file__).with_name('complete-library.py')).read_text(encoding='utf8'),'complete-library.py','exec'))
names={
 'haidate':('腿裙 Haidate','Haidate','护甲','覆盖大腿的系扎甲片；按 OA 单件护甲规则与其他部件组合。'),
 'hara-ate-gawa':('皮腹当 Hara-ate-gawa','Hara-ate-gawa','护甲','皮制腹部护甲，背部敞开；背面受到攻击时的 AC 另按 OA 规则处理。'),
 'haramaki-do':('腹卷胴 Haramaki-do','Haramaki-do','护甲','躯干系扎甲，按覆盖部位与其他单件护甲组合。'),
 'horo':('母衣 Horo','Horo','衣物','穿戴于背部的外衣类骑乘用品。'),
 'jingasa':('阵笠 Jingasa','Jingasa','护甲','帽形头部防具。'),
 'kabuto':('兜 Kabuto','Kabuto','护甲','东方头盔，与其他护甲部件的防护覆盖分别记录。'),
 '吹管':('吹管','Blowgun','武器','用呼气发射短小吹箭的远程武器。'),
 '木刀 boku-toh':('木刀','Boku-toh','武器','木制的武士刀练习复制品；伤害使用 OA 木刀一行。'),
 '链':('加重链','Chain (Manriki-gusari)','武器','两端带重物，可挥击、投掷或缠绕的链条。'),
 'chijiriki':('链尾矛','Chijiriki','武器','尾端带加重链的矛，链尾可甩出缠住敌人。'),
 '诸葛连弩':('诸葛连弩','Chu-ko-nu','武器','顶部弹匣可容纳 10 支弩矢，每轮最多装入 2 支；不能在同一轮射击和装填。'),
 '十手 jitte':('十手','Jitte','武器','带侧钩的短柄铁制武器。'),
 'jo 棍':('短棍','Jo','武器','比长杖短的棍棒，使用 OA 短棍一行的重量与伤害。'),
 '镰 kama':('镰','Kama','武器','可作为武器使用的短柄镰。'),
 '缠绕链 kau sin ke':('缠绕链','Kau sin ke','武器','由相接金属节组成的链状武器。'),
 '铁扇 gunsen':('铁扇','Gunsen','武器','将扇形器具制成武器使用的铁扇。'),
 '小弓 hankyu':('小弓','Hankyu','武器','体型较短的弓，使用对应弓箭与 OA 武器规则。'),
 '攀爬耙 kumade':('攀爬耙','Kumade','武器','带爪齿的长柄攀爬工具，也可用于战斗。'),
 '双刃绳 kyoketsu-shogi':('绳刃','Kyoketsu-shogi','武器','刀刃与绳具结合的忍者武器。'),
 '捕人器':('捕人器','Man Catcher','武器','用于夹住对手的长柄器具；使用专门的捕捉规则。'),
 '骑手长刀 nagimaki':('骑手长刀','Nagimaki','武器','以较长柄配合刀刃的近战武器。'),
 '攀爬爪 nekode（一对）':('攀爬爪（一对）','Nekode (Pair)','武器','成对使用的爪形攀爬器具，也可用于近战。'),
 '砍刀 parang':('砍刀','Parang','武器','可作近战或清理植被用途的砍刀。'),
 '弹丸弓':('弹丸弓','Pellet Bow','武器','弓弦上带弹兜，用于发射石丸或泥丸。'),
 '金属箭 siangkam':('金属短矛','Siangkam','武器','金属制的短柄刺击武器。'),
 '袖缠 sode-garami':('袖缠','Sode-garami','武器','带钩刺的长柄武器，可用于缠绕。'),
 '铁棒 tetsubo':('铁棒','Tetsubo','武器','较重的棒状打击武器，采用 OA 铁棒伤害。'),
 '三节棍':('三节棍','Three-piece Rod','武器','由三个棍节相连构成的武器。'),
 'tuite':('手套武器','Tuite','武器','东方武器表列的手部武器。'),
 '小标枪 uchi-ne':('小标枪','Uchi-ne','武器','短小的投掷标枪。'),
 '柳条背包':('柳条背包','Backpack, Wicker','容器','背负携行的编织容器，不能视为防水储具。'),
 '大篮':('大篮','Basket, Large','容器','盛放固体物品的编织容器。'),
 '小篮':('小篮','Basket, Small','容器','盛放少量固体物品的编织容器。'),
 '粗毯':('粗毯','Blanket, Coarse','衣物','供寝卧、包裹或露营保温使用的粗织毯。'),
 '铠甲箱':('铠甲箱','Armor Box','容器','储放及运输护甲的箱具。'),
 '漆筷':('漆筷','Chopsticks, Lacquered','杂项装备与物品','一副涂漆的进食用筷。'),
 '棉布一匹':('棉布（一匹）','Cloth, Cotton (Bolt)','杂项装备与物品','按匹计价的棉织布料，可供裁衣或其他制作。'),
 '丝绸一匹':('丝绸（一匹）','Cloth, Silk (Bolt)','杂项装备与物品','按匹计价的丝织布料。'),
 '鱼钩':('鱼钩','Fishhook','工具','配合钓线与鱼饵使用的小钩。'),
 '十尺渔网':('渔网（十尺）','Fishing Net, 10 ft.','工具','用于捕鱼的网具。'),
 '草席':('草席','Grass Mat','杂项装备与物品','编织的寝卧或铺地用席。'),
 '墨、笔和砚':('墨、笔和砚','Ink, Brush and Inkstone','工具','书写、绘图与研墨使用的套具；纸张另购。'),
 '书写纸（10 张）':('书写纸（十张）','Paper, Writing (10 Sheets)','杂项装备与物品','供书写或绘图的普通纸张；不自带卷轴魔力。'),
 '丝绳（50 尺）':('丝绳（五十尺）','Rope, Silk, 50 ft.','工具','长度五十尺的丝绳，用于捆扎与攀爬。'),
 '信号火箭':('信号火箭','Signal Rocket','信号用品','用于发出可见信号的火药器具。'),
 '旗帜/腰旗 sashimono':('背旗／腰旗','Sashimono','信号用品','用于显示身份或队伍标识的旗帜。'),
 '刀架':('刀架','Sword Stand','杂项装备与物品','供刀剑陈列或收存的架具。'),
 '大帐篷':('大帐篷','Tent, Large','荒野生存用品','较大的便携营帐，搭设和收存需要时间与场地。'),
 '小帐篷':('小帐篷','Tent, Small','荒野生存用品','较小的便携营帐。'),
 '烟草（1 磅）':('烟草（一磅）','Tobacco, 1 lb.','消耗品','供烟斗使用的烟草。'),
 '大篮子（蒲式耳）':('大篮子（蒲式耳）','Basket, Large (Bushel)','容器','有可扣紧盖子的编织篮，不能防水；可盛装多数非液体物品。'),
 '小篮子':('小篮子','Basket, Small','容器','可盛装非液体物品的带盖小篮。'),
 '鸟笼':('鸟笼','Birdcage','容器','高约十八英寸、直径一尺，可容纳三只鸣禽。'),
 '小型金箱':('小型金箱','Box, Gold, Small','容器','密封后气密且完全不透光的金制小箱，适合收存宝石或需遮蔽光线的物品。'),
 '小型铅箱':('小型铅箱','Box, Lead, Small','容器','密封后气密且完全不透光的铅制小箱。'),
}
for book,slug in [('oa','oa-money-equipment'),('dsg','dsg-equipment')]:
 t=get(book,slug)
 for table in re.findall(r'<table\b[^>]*>.*?</table>',t['html'],re.S|re.I):
  for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',table,re.S|re.I):
   cells=[plain(c) for c in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S|re.I)]
   pairs=[(cells[0],cells[1],cells[2] if book=='dsg' and len(cells)==3 else '未列')] if len(cells)>=2 else []
   if book=='oa' and len(cells)==4:pairs.append((cells[2],cells[3],'未列'))
   for key,price,weight in pairs:
    if key not in names or not re.search(r"gp|sp|cp|fen|yuan|tael|ch'ien",price):continue
    chinese,english,category,description=names[key]
    same=next((i for i in existing if i['source'][0]['book']==book.upper() and (norm(i['nameEn'])==norm(english) or norm(i['nameZh'])==norm(chinese))),None)
    if same:continue
    iid=book+'-gear-'+re.sub('[^a-z0-9]+','-',english.lower()).strip('-')
    ds=[]
    if book=='oa' and category=='武器':addheads(ds,book,slug,r'^特殊武器$')
    elif category=='护甲':addheads(ds,book,slug,r'^护甲$')
    elif book=='dsg':addheads(ds,book,slug,r'^常用装备说明$')
    # Include a short, item-specific source row instead of a second entire price table.
    ds.insert(0,{'title':'用途与规格','html':'<p>'+description+'</p>','source':{'book':book.upper(),'section':'Equipment'},'href':f'/books/{book}/{slug}/'})
    item={'id':iid,'nameZh':chinese,'nameEn':english,'category':category,'price':price,'weight':weight,'description':description,'tags':[],'source':[{'book':book.upper(),'section':'Equipment'}],'details':ds}
    additions.append(item);existing.append(item)

# Add table 49 data only where the name genuinely matches that row.
t=get('oa','oa-money-equipment')
h=next(h for h in t['blocks'] if h['title'].startswith('表 49'))
stats={}
for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',h['html'],re.S|re.I):
 c=[plain(x) for x in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S|re.I)]
 if len(c)==4:stats[norm(c[0])]=c[1:]
for item in additions:
 if item['source'][0]['book']=='OA' and norm(item['nameZh']) in stats:
  weight,sm,large=stats[norm(item['nameZh'])];item.update(weight=weight+' gp',damageSmallMedium=sm,damageLarge=large)
(ROOT/'src/data/public/item-additions.json').write_text(json.dumps(additions,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Total additions including ordinary gear:',len(additions))
