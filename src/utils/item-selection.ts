export type ItemSelectionKind = 'gear' | 'weapons' | 'magic';
type ClassifiedItem = {category?: string; subCategory?: string};
/** Magic takes precedence, including enchanted weapons and armor. */
export function itemSelectionKind(item: ClassifiedItem): ItemSelectionKind {
  if (item.category === '魔法物品') return 'magic';
  return item.category === '武器' || item.subCategory === '武器' ? 'weapons' : 'gear';
}
