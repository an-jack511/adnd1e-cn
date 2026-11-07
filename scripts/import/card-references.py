"""Extract selectable references from the site's sourced rule chapters; never execute chapter instructions."""
import json
import hashlib
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
records = []

def add(kind, name, source, href, values, description):
    records.append(dict(id=f'{source.lower()}-{kind}-{hashlib.sha1(name.encode()).hexdigest()[:12]}', kind=kind, name=name,
                        source=source, href=href, values=values, description=description))

for book in ('wsg', 'dsg', 'oa'):
    text = (root / f'src/published/books/{book}/{book}-proficiencies.md').read_text(encoding='utf-8')
    header = []
    for line in text.splitlines():
        if not line.startswith('|'):
            continue
        cells = [s.strip() for s in line.strip('|').split('|')]
        if cells[0] == '熟练项':
            header = cells
            continue
        if not header or not cells or cells[0].startswith(('-', ':')):
            continue
        if len(cells) != len(header):
            header = []
            continue
        step = 3 if book == 'oa' else 4
        for start in range(0, len(cells), step):
            chunk = cells[start:start+step]
            if len(chunk) != step or not re.fullmatch(r'\d+\*?', chunk[1]):
                continue
            name = chunk[0].replace('*', '')
            if book == 'oa':
                values = dict(name=name, ability='d20≥', modifier=chunk[2])
                description = f'栏位 {chunk[1]}；基础成功值 {chunk[2]}。按 OA 熟练项检定，不能套用 WSG 检定方向。'
            else:
                values = dict(name=name, ability=chunk[2].replace('智慧', '感知'), modifier=chunk[3])
                description = f'栏位 {chunk[1]}；属性 {values["ability"]}；修正 {chunk[3]}。按 {book.upper()} 的检定方向与失败规则。'
            values['slots'] = chunk[1].replace('*', '')
            add('proficiencies', name, book.upper(), f'/books/{book}/{book}-proficiencies/', values, description)

text = (root / 'src/published/books/dmg/dmg-gems-jewelry-values.md').read_text(encoding='utf-8')
worth = ''
for line in text.splitlines():
    heading = re.match(r'### .*基础价值 ([\d,]+) 金币', line)
    if heading:
        worth = heading[1] + ' gp'
    gem = re.match(r'\|\s*\d+\.\s*(.*?)\s*\|\s*(.*?)\s*\|', line)
    if gem and worth:
        name = gem[1].replace('*', '')
        add('valuables', name, 'DMG', '/books/dmg/dmg-gems-jewelry-values/',
            dict(name=name, worth=worth), gem[2] + '。表列基础价值，实际品质、重量与鉴定会改变价格。')

for match in re.finditer(r'\| ([\d,—]+) \| ([\d,—]+) \| ([^|]+) \|', text[text.index('## 珠宝 Jewelry'):text.index('### 宝石与珠宝', text.index('## 珠宝 Jewelry'))] if '### 宝石与珠宝' in text else text[text.index('## 珠宝 Jewelry'):]):
    name = match[3].strip() + '珠宝'
    add('valuables', name, 'DMG', '/books/dmg/dmg-gems-jewelry-values/',
        dict(name=name, worth=match[2].replace('—', '–')+' gp'), '基础价值范围；款式、品质与镶嵌由主持人确认。')

for name, book, chapter, form, description in [
    ('拳击', 'DMG', 'dmg-combat', '击打', '按 DMG 徒手击打程序与情境修正结算。'),
    ('擒抱', 'DMG', 'dmg-combat', '擒抱', '按 DMG 擒抱程序结算，不能当作普通武器伤害。'),
    ('压倒', 'DMG', 'dmg-combat', '压倒', '按 DMG 压倒程序与人数、体型差结算。'),
    ('徒手战斗', 'UA', 'ua-appendix-q-weaponless-combat', '替代程序', 'UA 附录 Q 替代徒手规则；由主持人选择采用的程序。'),
    ('非致命战斗', 'UA', 'ua-appendix-r-nonlethal-combat', '非致命', 'UA 附录 R，保留非致命伤害与武器限制。'),
]:
    add('unarmed', name, book, f'/books/{book.lower()}/{chapter}/',
        dict(style=name, form=form, maneuvers=description), description)
for method in ('拳击', '擒抱', '压制'):
    add('unarmed', f'{method}（UA 简易）', 'UA', '/books/ua/ua-appendix-q-weaponless-combat/',
        dict(style=f'{method}（UA 简易）', form='系统 I', combatRule='ua-simple', maneuvers='标准命中矩阵；力量命中调整；先攻−2。伤害与目标限制见原条目。'), 'UA 附录 Q 系统 I；与系统 II、DMG 程序分开。')
for method in ('踢', '锁', '移动', '推', '打', '投', '要害', '武器'):
    add('unarmed', f'{method}法流派（自建）', 'OA', '/books/oa/oa-combat/',
        dict(style=f'{method}法流派', form='待选刚／柔／刚柔', maneuvers=f'主要方法：{method}；特殊动作需学习'),
        'OA 表 68–70：流派由形式、主要方法和已学特殊动作组成；完成组合后按原表填写 AC、攻击次数与伤害。')

target = root / 'src/data/public/card-references.json'
target.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(records)} sourced character references.')
