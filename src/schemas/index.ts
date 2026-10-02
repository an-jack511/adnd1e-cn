import { z } from 'zod';

export const SourceReferenceSchema = z.object({
  book: z.string().min(1),
  page: z.number().int().positive().optional(),
  section: z.string().optional()
});

export const SpellSchema = z.object({
  id: z.string(),
  nameZh: z.string(),
  nameEn: z.string(),
  classes: z.array(z.string()),
  level: z.number().int().nonnegative(),
  school: z.string(),
  components: z.array(z.enum(['V', 'S', 'M'])),
  castingTime: z.string(),
  range: z.string(),
  duration: z.string(),
  areaOfEffect: z.string(),
  savingThrow: z.string(),
  reversible: z.boolean(),
  materialComponent: z.string().optional(),
  description: z.string(),
  tags: z.array(z.string()),
  source: z.array(SourceReferenceSchema)
});

export const MonsterSchema = z.object({
  id: z.string(),
  nameZh: z.string(),
  nameEn: z.string(),
  frequency: z.string(),
  numberAppearing: z.string(),
  armorClass: z.number(),
  armorClassText: z.string().optional(),
  movement: z.string(),
  hitDice: z.string(),
  inLair: z.string(),
  treasureType: z.string(),
  attacks: z.string(),
  damage: z.string(),
  specialAttacks: z.string(),
  specialDefenses: z.string(),
  magicResistance: z.string(),
  intelligence: z.string(),
  alignment: z.string(),
  size: z.string(),
  psionics: z.string(),
  environment: z.string(),
  description: z.string(),
  illustration: z.object({ src: z.string(), source: z.string(), page: z.number().int().positive() }).optional(),
  source: z.array(SourceReferenceSchema)
});

export const ItemSchema = z.object({
  id: z.string(),
  nameZh: z.string(),
  nameEn: z.string(),
  category: z.string(),
  price: z.string(),
  weight: z.string(),
  damageSmallMedium: z.string().optional(),
  damageLarge: z.string().optional(),
  length: z.string().optional(),
  spaceRequired: z.string().optional(),
  speedFactor: z.string().optional(),
  acAdjustment: z.string().optional(),
  description: z.string(),
  tags: z.array(z.string()),
  source: z.array(SourceReferenceSchema)
});

export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type Spell = z.infer<typeof SpellSchema>;
export type Monster = z.infer<typeof MonsterSchema>;
export type Item = z.infer<typeof ItemSchema>;

export type ClassEntry = {
  id: string; nameZh: string; nameEn: string; primeRequisite: string; hitDie: string;
  alignment: string; weapons: string; armor: string; description: string;
  abilities: { name: string; description: string; href?: string }[]; source: SourceReference[];
};

export type RaceEntry = {
  id: string; nameZh: string; nameEn: string; modifiers: string; restrictions: string;
  levelLimits: string; languages: string; movement: string; abilities: string[]; source: SourceReference[];
};

export type RuleEntry = {
  id: string; title: string; category: 'combat' | 'adventure' | 'rules'; summary: string;
  body: string[]; related?: { label: string; href: string }[]; source: SourceReference[];
};
