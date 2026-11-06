const schools: [string, RegExp][] = [
  ['防护', /Abjuration|防护/i],
  ['变化', /Alteration|变化/i],
  ['咒法／召唤', /Conjuration|Summoning|咒法|召唤/i],
  ['预言', /Divination|预言/i],
  ['惑控／魅惑', /Enchantment|Charm|惑控|附魔|魅惑|强化/i],
  ['幻术／幻影', /Illusion|Phantasm|幻术|幻象|幻影|魅影/i],
  ['祈唤／塑能', /Invocation|Evocation|祈唤|塑能/i],
  ['死灵', /Necroman|死灵/i],
  ['附体', /Possession|附体/i],
];
export function spellSchools(value: string): string[] {
  const matched = schools.filter(([, pattern]) => pattern.test(value)).map(([name]) => name);
  return matched.length ? matched : ['其他'];
}
