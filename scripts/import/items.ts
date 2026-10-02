import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Item } from '../../src/schemas';

const source = resolve('../build/chm/content/phb/money-equipment-and-arms.html');
const html = new TextDecoder('gbk').decode(readFileSync(source));
const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_m, hex: string, decimal: string) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10))).replace(/\s+/g, ' ').trim();
const section = html.match(/基本装备与补给价格 Basic Equipment And Supplies Costs[\s\S]*?<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
if (!section) throw new Error('PHB equipment price table not found');
const rows = [...section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1])));
if (rows[0]?.join('|') !== '类别|物品|价格') throw new Error(`Unexpected PHB equipment headers: ${rows[0]?.join('|')}`);
const tableAfter = (label: string) => {
  const match = html.match(new RegExp(`${label}[\\s\\S]*?<table\\b[^>]*>([\\s\\S]*?)<\\/table>`, 'i'));
  if (!match) throw new Error(`Missing PHB table: ${label}`);
  return [...match[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1])));
};
const weaponRows = tableAfter('Weight And Damage By Weapon Type');
const generalRows = tableAfter('Hand Held Weapons');
const weaponAlias: Record<string, string> = {
  '普通箭': '箭', '银箭': '箭', '匕首': '匕首', '步兵连枷': '步战连枷', '骑兵连枷': '骑战连枷',
  '步兵钉头锤': '步战钉头锤', '骑兵钉头锤': '骑战钉头锤', '步兵军用镐': '步战军用镐',
  '骑兵军用镐': '骑战军用镐', '混种剑': '手半剑', '琉森锤': '卢塞恩锤', '板条甲': '片状甲',
  '刀钩戟': '长柄刀钩戟', '轻型弩矢': '轻弩矢', '重型弩矢': '重弩矢'
};
const normalize = (name: string) => name.replace(/，.*$/, '').replace(/与鞘$/, '').replace(/（[^）]*）/g, '').replace(/\*+$/, '').trim();
const weaponKey = (name: string) => weaponAlias[normalize(name)] ?? normalize(name);
const weaponByName = new Map(weaponRows.slice(1).map((row) => [weaponKey(row[0]), row]));
const generalByName = new Map(generalRows.slice(1).map((row) => [weaponKey(row[0]), row]));
const dmgWeight = readFileSync(resolve('../manuscript/dmg/topics/appendix-o-encumbrance-standard-items.md'), 'utf8');
const standardWeights = new Map<string, string>();
for (const line of dmgWeight.split(/\r?\n/).filter((line) => /^\|/.test(line))) {
  const parts = line.split('|').slice(1, -1).map((part) => part.trim());
  if (parts.length === 4 && /^\d/.test(parts[1])) { standardWeights.set(parts[0], parts[1]); standardWeights.set(parts[2], parts[3]); }
}
const armorWeight = readFileSync(resolve('../manuscript/dmg/topics/types-of-armor-encumbrance.md'), 'utf8');
const armorWeights = new Map<string, string>();
for (const line of armorWeight.split(/\r?\n/).filter((line) => /^\|/.test(line))) {
  const parts = line.split('|').slice(1, -1).map((part) => part.trim());
  if (parts.length === 4 && /\d+ 磅/.test(parts[2])) armorWeights.set(parts[0].split(/\s+[A-Z]/)[0], parts[2]);
}
const armorAlias: Record<string, string> = { '衬甲': '软甲', '板条甲': '片状甲', '镶嵌皮甲': '镶钉皮甲', '小木盾': '木制小盾' };
const standardAlias: Record<string, string> = {
  '皮背包': '背包', '大型头盔': '巨盔', '小型头盔': '头盔', '高筒硬靴': '硬底靴', '低筒硬靴': '硬底靴',
  '重弩': '重型弩', '轻弩': '轻型弩',
  '高筒软靴': '软底靴', '低筒软靴': '软底靴', '牛脂蜡烛': '蜡烛', '蜂蜡蜡烛': '蜡烛',
  '骨制地图或卷轴匣': '骨制／象牙卷轴盒', '皮制地图或卷轴匣': '皮革卷轴盒',
  '聚光提灯': '提灯', '风帽提灯': '提灯', '大型金属镜': '镜子', '小型银镜': '镜子',
  '十英尺长杆': '10 尺长杆', '大型腰包': '大腰包', '小型腰包': '小腰包',
  '绳索': '50 尺绳索', '大型麻袋': '大麻袋', '小型麻袋': '小麻袋',
  '油': '装满的烧瓶', '水或酒皮囊': '空水袋／酒袋', '大型铁钉': '尖刺',
  '火绒盒': '火绒盒', '耐久口粮': '铁口粮', '标准口粮': '普通口粮',
  '大型鞍袋': '鞍袋', '小型鞍袋': '鞍袋', '鞍毯': '鞍毯（垫）',
  '箭袋': '箭袋', '弩矢袋': '箭袋'
};
const standardKey = (name: string) => standardAlias[normalize(name)] ?? normalize(name);
const formatGpWeight = (value: string) => {
  const amount = Number(value.replace(/,/g, ''));
  return Number.isFinite(amount) ? `${value} 金币重量（约 ${Number((amount / 10).toFixed(1))} 磅）` : `${value} 金币重量`;
};
const items: Item[] = rows.slice(1).filter((row) => row.length >= 3 && row[1] && row[2]).map((row, index) => {
  const category = row[0] || '其他';
  const key = weaponKey(row[1]);
  const weapon = category === '武器' && key !== '长柄刀' ? weaponByName.get(key) : undefined;
  const general = category === '武器' ? generalByName.get(weaponKey(row[1])) : undefined;
  const armor = category === '护甲' ? armorWeights.get(armorAlias[row[1]] ?? row[1]) : undefined;
  const standard = standardWeights.get(standardKey(row[1]));
  const quantity = /一打/.test(row[1]) ? 12 : /二十[支枚]/.test(row[1]) ? 20 : 1;
  const weaponGp = weapon?.[1] && /^\d+$/.test(weapon[1]) ? String(Number(weapon[1]) * quantity) : weapon?.[1];
  const weight = armor ? `${armor}（护甲负重调整值）` : weaponGp ? formatGpWeight(weaponGp) : standard ? formatGpWeight(standard) : '未列';
  const weightBook = armor || standard ? 'DMG' : undefined;
  return {
    id: `phb-item-${String(index + 1).padStart(3, '0')}`,
    nameZh: row[1], nameEn: '', category, price: row[2], weight,
    ...(weapon?.[2] ? { damageSmallMedium: weapon[2] } : {}),
    ...(weapon?.[3] ? { damageLarge: weapon[3] } : {}),
    ...(general?.[1] ? { length: general[1], spaceRequired: general[2], speedFactor: general[3] } : {}),
    description: `${category}；价格 ${row[2]}${weight !== '未列' ? `；负重 ${weight}` : ''}。`,
    tags: [category],
    source: [{ book: 'PHB', section: category === '武器' ? 'Equipment; Weight and Damage by Weapon Type' : 'Basic Equipment and Supplies Costs' }, ...(weightBook ? [{ book: weightBook, section: armor ? 'Types of Armor & Encumbrance' : 'Appendix O: Encumbrance of Standard Items' }] : [])]
  };
});
writeFileSync(resolve('src/data/public/items-imported.json'), `${JSON.stringify(items, null, 2)}\n`);
console.log(`Imported ${items.length} PHB equipment records; ${items.filter((item) => item.weight !== '未列').length} have sourced encumbrance.`);
