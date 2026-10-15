import { z } from 'zod';

export const abilities = ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'] as const;
export type Ability = typeof abilities[number];
export const methods = ['DMG:I', 'DMG:II', 'DMG:III', 'DMG:IV'] as const;
export type Method = typeof methods[number];
const methodSchema = z.enum(methods);
const scoreSchema = z.object(Object.fromEntries(abilities.map(a => [a, z.number().int().min(3).max(18)]))).strict();
export const batchSchema = z.object({
  id: z.string().min(1), method: methodSchema, createdAt: z.string().min(1),
  candidates: z.array(z.array(z.number().int().min(1).max(6))).max(72)
}).strict();
export type Batch = z.infer<typeof batchSchema>;
const snapshotSchema = z.object({ batch: batchSchema, choices: z.array(z.number().int().nonnegative()).length(6).nullable(), scores: scoreSchema.nullable() }).strict();
export const draftSchema = z.object({
  format: z.literal('adnd1e-creation-draft'), schemaVersion: z.literal('1.0.0'),
  id: z.string().min(1), revision: z.number().int().nonnegative(), name: z.string().max(200),
  profile: z.object({ books: z.tuple([z.literal('PHB'), z.literal('DMG'), z.literal('MM')]), abilityMethod: methodSchema,
    algorithm: z.literal('dmg-ability-generation-v1'), source: z.object({book:z.literal('DMG'),printedPage:z.literal(11),section:z.literal('Generation of Ability Scores')}).strict()
  }).strict(),
  activeBatch: batchSchema.nullable(), choices: z.array(z.number().int().nonnegative()).length(6).nullable(), scores: scoreSchema.nullable(),
  history: z.array(snapshotSchema).max(200),
  audit: z.array(z.object({ at: z.string().min(1), action: z.enum(['generated', 'assigned', 'named', 'copied']), batchId: z.string().nullable() }).strict()).max(1000)
}).strict();
export type Draft = z.infer<typeof draftSchema>;
export const source = { book: 'DMG', printedPage: 11, section: 'Generation of Ability Scores', href: '/books/dmg/dmg-ability-generation/' } as const;
export const methodLabels: Record<Method, string> = {
  'DMG:I': '方法 I：六组 4d6，去最低后分配',
  'DMG:II': '方法 II：十二组 3d6，取最高六项后分配',
  'DMG:III': '方法 III：每项六组 3d6，保留该项最高',
  'DMG:IV': '方法 IV：十二个完整人物组，选择一整组'
};
