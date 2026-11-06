import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Monster } from '../../src/schemas';
import { bilingualName } from './bilingual-name';

const clean = (value: string) => value.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<!--[^]*?-->/g, '')
  .replace(/<[^>]*>/g, ' ').replace(/[#*`]/g, '').replace(/\s+/g, ' ').trim();
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function importMonsters(book: 'ff' | 'mm2') {
  const sourceRoot = resolve(`../manuscript/${book}`);
  const destination = resolve(`src/data/public/${book}-monsters-imported.json`);
  const previous = JSON.parse(readFileSync(destination, 'utf8')) as Monster[];
  const ids = new Map(previous.map(monster => [monster.nameEn, monster.id]));
  const stableIds: Record<string, string> = book === 'ff'
    ? { Aarakocra: 'ff-aarakocra-bird-man', 'Zombie, Yellow Musk': 'ff-yellow-musk' }
    : { 'Shade General Rules': 'mm2-shade', 'Shedu, Greater': 'mm2-greater' };
  const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'book.json'), 'utf8')) as {
    topics: { file: string; slug: string }[];
  };
  const monsters: Monster[] = [];
  const chapters: Record<string, string> = {};
  for (const file of readdirSync(resolve(sourceRoot, 'topics')).filter(name => name.endsWith('.md')).sort()) {
    const raw = readFileSync(resolve(sourceRoot, 'topics', file), 'utf8');
    const headings = [...raw.matchAll(/^(#{1,6})\s+(.+)$/gm)];
    for (let index = 0; index < headings.length; index++) {
      const heading = headings[index];
      const localEnd = headings[index + 1]?.index ?? raw.length;
      const local = raw.slice(heading.index, localEnd);
      const table = local.match(/^\|\s*项目\s*\|[^\n]*\r?\n(?:\|[^\n]*(?:\r?\n|$))+/m);
      if (!table) continue;
      let name = bilingualName(heading[2]);
      if (!name && heading[2].trim() === '总则') {
        const parent = headings.slice(0, index).reverse().find(entry => entry[1].length < heading[1].length);
        if (parent) name = bilingualName(parent[2]);
      }
      if (!name) continue;
      const stats = new Map([...table[0].matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)]
        .map(row => [row[1].trim(), clean(row[2])]));
      const field = (...prefixes: string[]) => {
        for (const prefix of prefixes) {
          const value = [...stats].find(([key]) => key.startsWith(prefix))?.[1];
          if (value) return value;
        }
        return '未记载';
      };
      if (field('生命骰') === '未记载') continue;
      const armorText = field('护甲等级');
      const armorNumber = armorText.replace(/[−–]/g, '-').match(/^-?\d+/)?.[0];
      const id = stableIds[name.nameEn] ?? ids.get(name.nameEn) ?? `${book}-${slug(name.nameEn)}`;
      const end = headings.slice(index + 1).find(entry => entry[1].length <= heading[1].length)?.index ?? raw.length;
      const description = clean(raw.slice(heading.index! + table.index! + table[0].length, end));
      monsters.push({
        id, ...name, frequency: field('出现频率'), numberAppearing: field('出现数量'),
        armorClass: armorNumber === undefined ? null : Number(armorNumber), armorClassText: armorText,
        movement: field('移动'), hitDice: field('生命骰'), inLair: field('巢穴概率', '巢穴内百分比', '巢穴内'),
        treasureType: field('宝藏类型', '宝物类型', '财宝类型', '宝藏', '财宝', '巢穴概率／宝藏'),
        attacks: field('攻击次数', '攻击'), damage: field('每次攻击伤害', '每次伤害', '伤害', '攻击/伤害'),
        specialAttacks: field('特殊攻击'), specialDefenses: field('特殊防御', '特殊攻击/防御'),
        magicResistance: field('魔法抗性'), intelligence: field('智力'), alignment: field('阵营'),
        size: field('体型'), psionics: field('灵能能力', '灵能'), environment: '原条目未单列',
        description, source: [{ book: book.toUpperCase(), section: name.nameEn }],
      });
      const topic = manifest.topics.find(topic => basename(topic.file) === file);
      if (!topic) throw new Error(`Missing chapter for ${book}/${file}`);
      chapters[id] = `${book}/${topic.slug}`;
    }
  }
  if (new Set(monsters.map(monster => monster.id)).size !== monsters.length) throw new Error('Duplicate monster IDs');
  const missing = previous.filter(monster => !monsters.some(entry => entry.id === monster.id));
  if (missing.length) throw new Error(`Lost existing monster URLs: ${missing.map(monster => monster.id).join(', ')}`);
  writeFileSync(destination, `${JSON.stringify(monsters, null, 2)}\n`);
  writeFileSync(resolve(`src/data/public/${book}-monster-chapters.json`), `${JSON.stringify(chapters, null, 2)}\n`);
  console.log(`Imported ${monsters.length} bilingual ${book.toUpperCase()} monsters with chapter links.`);
}
