const schools: [string, RegExp][] = [
  ['防护', /Abjuration|防护/i],
  ['变化', /Alteration|变化/i],
  ['咒法／召唤', /Conjuration|Summoning|咒法|召唤/i],
  ['预言', /Divination|预言/i],
  ['惑控／魅惑', /Enchantment|Charm|惑控|附魔|魅惑|强化/i],
  ['幻术／幻影', /Illusion|Phantasm|幻术|幻象|幻影|魅影|幻相/i],
  ['祈唤／塑能', /Invocation|Evocation|祈唤|塑能/i],
  ['死灵', /Necroman|死灵/i],
  ['附体', /Possession|附体/i],
];
export function spellSchools(value: string): string[] {
  const matched = schools.filter(([, pattern]) => pattern.test(value)).map(([name]) => name);
  return matched.length ? matched : ['其他'];
}

/** Keep spell schools separate from reversal notes and spell names in headings. */
export function englishSpellSchool(value: string): string {
  const original = value;
  const english = original.match(/Abjuration|Alteration|Conjuration(?:\/Summoning)?|Divination|Enchantment(?:\/Charm)?|Illusion(?:\/Phantasm)?|Invocation|Evocation|Necromantic|Necromancy|Possession/gi);
  if (english?.length) return [...new Set(english)].join(', ');
  const labels: Record<string,string> = {'防护':'Abjuration','变化':'Alteration','咒法／召唤':'Conjuration/Summoning','预言':'Divination','惑控／魅惑':'Enchantment/Charm','幻术／幻影':'Illusion/Phantasm','祈唤／塑能':'Invocation/Evocation','死灵':'Necromantic','附体':'Possession'};
  if (/按所选/.test(value)) return 'Varies by spell';
  return spellSchools(value).filter(name => name !== '其他').map(name => name === '祈唤／塑能' ? (/祈唤/.test(value) && /塑能/.test(value) ? labels[name] : /祈唤/.test(value) ? 'Invocation' : 'Evocation') : labels[name]).join(', ') || '/';
}

/** Chinese labels remain paired with the precise school names in the source. */
export function bilingualSpellSchool(value: string): string {
 const english=englishSpellSchool(value);
 const labels:Record<string,string>={Abjuration:'防护系',Alteration:'变化系','Conjuration/Summoning':'咒法／召唤系',Conjuration:'咒法系',Summoning:'召唤系',Divination:'预言系','Enchantment/Charm':'惑控／魅惑系',Enchantment:'惑控系',Charm:'魅惑系','Illusion/Phantasm':'幻术／幻影系',Illusion:'幻术系',Phantasm:'幻影系',Invocation:'祈唤系',Evocation:'塑能系','Invocation/Evocation':'祈唤／塑能系',Necromantic:'死灵系',Necromancy:'死灵系',Possession:'附体系','Varies by spell':'按所选法术而定'};
 return english.split(', ').map(name=>name==='/'?'/':`${labels[name]??'其他学派'} ${name}`).join('；');
}
