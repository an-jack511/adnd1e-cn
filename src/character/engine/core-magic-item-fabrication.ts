import {
  coreMagicItemFabricationRule as rule,
  type CoreMagicItemFabricationSourceId,
} from '../rules/core-magic-item-fabrication';

export type CoreFabricatorProfession =
  | 'magic-user'
  | 'illusionist'
  | 'cleric'
  | 'druid'
  | 'assassin';
export type CoreFabricationCategory = 'potion' | 'scroll' | 'other-item';
export type CoreFabricationDecision = 'eligible' | 'ineligible' | 'needs-dm';

export interface CoreFabricationEligibilityInput {
  readonly profession: CoreFabricatorProfession;
  readonly level: number;
  readonly category: CoreFabricationCategory;
  readonly itemNature?:
    | 'consumable-potion'
    | 'poison'
    | 'spell-scroll'
    | 'protection-scroll'
    | 'curse-scroll'
    | 'one-shot'
    | 'charged'
    | 'permanent';
  readonly itemIsAncientOrReserved?: boolean;
  readonly itemUsableByMakerProfession?: boolean | null;
  readonly itemOnlyUsableByNonMakers?: boolean | null;
  readonly clericItemPermittedAndAlignmentCompatible?: boolean | null;
  readonly spellLevel?: number;
  readonly makerCanEmploySpell?: boolean | null;
  readonly hasAlchemist?: boolean;
  readonly compelled?: 'no' | 'charmed' | 'magically-persuaded' | 'enslaved';
}

export interface CoreFabricationEligibility {
  readonly decision: CoreFabricationDecision;
  readonly reasons: readonly string[];
  readonly needsDm: readonly string[];
  readonly dmSecrets: readonly string[];
  readonly sourceIds: readonly CoreMagicItemFabricationSourceId[];
}

export interface RationalQuantity {
  readonly numerator: number;
  readonly denominator: number;
}

export interface CoreResourceTransaction {
  readonly kind: 'spend-gp' | 'consume-material' | 'reserve-facility' | 'ability-loss';
  readonly amount?: number;
  readonly unit?: 'gp' | 'item' | 'constitution-point';
  readonly timing: 'before-work' | 'during-work' | 'on-completion';
  readonly description: string;
  readonly dmPrivate: boolean;
}

export interface CoreCalendarCommitment {
  readonly kind: 'work' | 'retreat' | 'fast' | 'purify' | 'wait-for-favor' | 'rest';
  readonly quantity: RationalQuantity;
  readonly unit: 'hours' | 'days';
  readonly continuous: boolean;
  readonly restrictions: readonly string[];
}

export interface CoreFabricationPlan {
  readonly decision: CoreFabricationDecision;
  readonly category: CoreFabricationCategory;
  readonly eligibility: CoreFabricationEligibility;
  readonly calendar: readonly CoreCalendarCommitment[];
  readonly transactions: readonly CoreResourceTransaction[];
  readonly checks: readonly CoreFabricationCheck[];
  readonly needsDm: readonly string[];
  readonly factsToPersist: readonly string[];
}

export interface CoreFabricationCheck {
  readonly id:
    | 'optional-potion-delusion'
    | 'scroll-transcription'
    | 'enchant-item-preparation'
    | 'successive-dweomer'
    | 'divine-favor';
  readonly die: 'd20' | 'd100';
  readonly target: number | null;
  readonly succeedsOn: 'roll-at-or-below' | 'roll-over' | 'saving-throw-success';
  readonly visibility: 'public' | 'maker-knows-result' | 'dm-secret';
  readonly failureEffect: string;
  readonly sourceId: CoreMagicItemFabricationSourceId;
}

const integer = (value: number, label: string, minimum = 0): void => {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be a safe integer >= ${minimum}.`);
  }
};

const unique = (values: readonly string[]): readonly string[] => [...new Set(values)];
const whole = (value: number): RationalQuantity => ({ numerator: value, denominator: 1 });
const half = (value: number): RationalQuantity =>
  value % 2 === 0
    ? { numerator: value / 2, denominator: 1 }
    : { numerator: value, denominator: 2 };

export function evaluateCoreFabricationEligibility(
  input: CoreFabricationEligibilityInput,
): CoreFabricationEligibility {
  integer(input.level, 'level', 1);
  if (input.spellLevel !== undefined) integer(input.spellLevel, 'spell level', 1);
  const reasons: string[] = [];
  const needsDm: string[] = [];
  const dmSecrets: string[] = [];
  const sourceIds = new Set<CoreMagicItemFabricationSourceId>();

  if (input.itemIsAncientOrReserved) {
    return {
      decision: 'ineligible',
      reasons: ['The proposed item belongs to a class reserved to the DM and cannot be made by player characters.'],
      needsDm,
      dmSecrets,
      sourceIds: ['dmg:116:fabrication-and-potions'],
    };
  }

  if (
    input.compelled &&
    input.compelled !== 'no' &&
    (input.profession === 'magic-user' || input.profession === 'illusionist')
  ) {
    dmSecrets.push('Compelled magic-user fabrication consumes the usual time and money but can never succeed.');
    sourceIds.add('dmg:118:other-items');
    return {
      decision: 'ineligible',
      reasons: ['The maker lacks the voluntary discipline and concentration required for fabrication.'],
      needsDm,
      dmSecrets,
      sourceIds: [...sourceIds],
    };
  }

  if (input.category === 'potion') {
    sourceIds.add('dmg:116:fabrication-and-potions');
    sourceIds.add('dmg:117:potions-and-scrolls');
    if (input.itemNature === undefined) {
      needsDm.push('DM must classify the proposed liquid as a potion or poison.');
    }
    if (input.itemNature === 'poison') {
      if (input.profession !== 'assassin' || input.level < rule.makerThresholds.poisonAssassin) {
        reasons.push('Only an assassin of 9th or higher level may concoct poison under this procedure.');
      }
    } else if (input.profession === 'magic-user') {
      if (input.level < rule.makerThresholds.potionMagicUser) {
        reasons.push('A magic-user must be at least 7th level to make potions.');
      } else if (
        input.level < rule.makerThresholds.potionMagicUserWithoutMandatoryAlchemist &&
        !input.hasAlchemist
      ) {
        reasons.push('A 7th- through 11th-level magic-user must enlist an alchemist.');
      }
    } else if (input.profession === 'illusionist' && input.level >= rule.makerThresholds.illusionistTemporaryOrCharged) {
      needsDm.push('DM must approve the illusionist-specific formula and process for this potion.');
    } else if (input.profession === 'cleric') {
      needsDm.push('The checked potion list has cleric-only exceptions but gives no complete general cleric potion procedure.');
    } else {
      reasons.push('No checked core potion-making permission applies to this profession and level.');
    }
  } else if (input.category === 'scroll') {
    sourceIds.add('dmg:117:potions-and-scrolls');
    if (input.itemNature === undefined) {
      needsDm.push('DM must classify the scroll as spell, protection, or curse.');
    }
    const scrollProfessions: readonly CoreFabricatorProfession[] = [
      'cleric',
      'druid',
      'magic-user',
      'illusionist',
    ];
    if (!scrollProfessions.includes(input.profession) || input.level < rule.makerThresholds.scrollSpellCaster) {
      reasons.push('Scroll inscription requires a cleric, druid, magic-user, or illusionist of 7th or higher level.');
    }
    if (input.itemNature === 'spell-scroll') {
      if (input.spellLevel === undefined) needsDm.push('Spell level must be recorded.');
      if (input.makerCanEmploySpell === null || input.makerCanEmploySpell === undefined) {
        needsDm.push('DM must confirm that the maker can employ the spell at the current level.');
      } else if (!input.makerCanEmploySpell) {
        reasons.push('The maker cannot place a spell on a scroll that the maker cannot employ.');
      }
    }
    if (input.itemNature === 'protection-scroll') {
      needsDm.push('Protection-scroll profession allocation must be checked against the printed protection list.');
    }
  } else {
    sourceIds.add('dmg:116:fabrication-and-potions');
    sourceIds.add('dmg:118:other-items');
    if (input.itemNature === undefined) {
      needsDm.push('DM must classify the item as one-shot, charged, or permanent.');
    }
    if (input.profession === 'magic-user' && input.level < rule.makerThresholds.otherMagicUser) {
      reasons.push('Other magic items require a magic-user of at least 12th level.');
    } else if (input.profession === 'cleric' && input.level < rule.makerThresholds.otherCleric) {
      reasons.push('Other clerical magic items require a cleric of at least 11th level.');
    } else if (input.profession === 'druid' && input.level < rule.makerThresholds.otherDruid) {
      reasons.push('Archdruid status is 13th level in the checked PHB table.');
      sourceIds.add('phb:21:druid-level-title');
    } else if (input.profession === 'illusionist') {
      const permanent = input.itemNature === 'permanent';
      const threshold = permanent
        ? rule.makerThresholds.illusionistPermanent
        : rule.makerThresholds.illusionistTemporaryOrCharged;
      if (input.level < threshold) {
        reasons.push(
          permanent
            ? 'A permanent illusionist item requires at least 14th level.'
            : 'A one-shot or charged illusionist item requires at least 11th level.',
        );
      }
    } else if (!['magic-user', 'cleric', 'druid'].includes(input.profession)) {
      reasons.push('No checked core permission to fabricate this other magic item applies.');
    }

    if (input.itemUsableByMakerProfession === null || input.itemUsableByMakerProfession === undefined) {
      if (input.itemOnlyUsableByNonMakers !== true) {
        needsDm.push('DM must determine whether the item is particular to the maker profession.');
      }
    } else if (!input.itemUsableByMakerProfession && input.itemOnlyUsableByNonMakers !== true) {
      reasons.push('A maker may not fabricate an item assigned to another item-making profession.');
    }
    if (input.profession === 'cleric') {
      if (input.clericItemPermittedAndAlignmentCompatible === null || input.clericItemPermittedAndAlignmentCompatible === undefined) {
        needsDm.push('DM must confirm clerical profession permission and alignment compatibility.');
      } else if (!input.clericItemPermittedAndAlignmentCompatible) {
        reasons.push('Clerics cannot make prohibited, opposite-alignment, or magic-sword items.');
      }
    }
  }

  return {
    decision: reasons.length > 0 ? 'ineligible' : needsDm.length > 0 ? 'needs-dm' : 'eligible',
    reasons: unique(reasons),
    needsDm: unique(needsDm),
    dmSecrets,
    sourceIds: [...sourceIds],
  };
}

export interface PotionPlanInput extends CoreFabricationEligibilityInput {
  readonly category: 'potion';
  readonly potionXpAward: number | null;
  readonly potionHasNoListedXpAward: boolean;
  readonly laboratoryGpValue: number | null;
  readonly laboratoryUpkeepPaid: boolean;
  readonly specialIngredientApprovedAndPossessed: boolean | null;
  readonly optionalFailurePercent: number | null;
}

export function planCorePotionFabrication(input: PotionPlanInput): CoreFabricationPlan {
  const eligibility = evaluateCoreFabricationEligibility(input);
  const needsDm = [...eligibility.needsDm];
  if (input.potionXpAward !== null) integer(input.potionXpAward, 'potion XP award');
  if (input.laboratoryGpValue !== null) integer(input.laboratoryGpValue, 'laboratory GP value');
  if (input.optionalFailurePercent !== null) integer(input.optionalFailurePercent, 'optional failure percent');

  const poison = input.itemNature === 'poison';
  const baseXp = input.potionXpAward ?? (input.potionHasNoListedXpAward ? rule.potion.unlistedXpValue : null);
  if (baseXp === null) needsDm.push('DM must supply the printed XP award or confirm that none is listed.');
  if (!poison) {
    if (input.laboratoryGpValue === null) {
      needsDm.push('DM must set or confirm the laboratory value.');
    } else if (
      input.laboratoryGpValue < rule.potion.laboratoryInitialGp.minimum ||
      input.laboratoryGpValue > rule.potion.laboratoryInitialGp.maximum
    ) {
      needsDm.push('Laboratory value is outside the printed 200-1,000 gp guideline and needs explicit DM adoption.');
    }
    if (!input.laboratoryUpkeepPaid) needsDm.push('Laboratory upkeep for the active month is not confirmed paid.');
  }
  if (input.specialIngredientApprovedAndPossessed !== true) {
    needsDm.push('DM must choose/approve the special ingredient and confirm that it was obtained.');
  }
  if (input.optionalFailurePercent !== null) {
    if (
      input.optionalFailurePercent < rule.potion.optionalDelusionFailurePercent.minimum ||
      input.optionalFailurePercent > rule.potion.optionalDelusionFailurePercent.maximum
    ) {
      needsDm.push('Optional potion failure must be a DM-selected 5%-20%.');
    }
  }

  const alchemistReduction = input.hasAlchemist === true && input.itemNature !== 'poison';
  const gp = baseXp === null ? null : alchemistReduction ? half(baseXp) : whole(baseXp);
  const days = baseXp === null ? null : Math.ceil(baseXp / 100);
  const calendar: CoreCalendarCommitment[] = days === null ? [] : [{
    kind: 'work',
    quantity: alchemistReduction ? half(days) : whole(days),
    unit: 'days',
    continuous: false,
    restrictions: [rule.potion.oneAtATime ? 'Only one potion may be made at a time.' : ''],
  }];
  const transactions: CoreResourceTransaction[] = [];
  if (gp !== null) {
    transactions.push({
      kind: 'spend-gp',
      amount: gp.numerator / gp.denominator,
      unit: 'gp',
      timing: 'during-work',
      description: 'Basic formula, rare herbs, spices, and exotic ingredients.',
      dmPrivate: false,
    });
  }
  transactions.push({
    kind: 'consume-material',
    unit: 'item',
    timing: 'during-work',
    description: 'DM-approved special ingredient.',
    dmPrivate: true,
  });
  if (!poison && input.laboratoryGpValue !== null) {
    transactions.push({
      kind: 'spend-gp',
      amount: (input.laboratoryGpValue * rule.potion.laboratoryMonthlyUpkeepPercent) / 100,
      unit: 'gp',
      timing: 'before-work',
      description: 'Monthly laboratory upkeep while the laboratory is in use.',
      dmPrivate: false,
    });
  }
  const checks: CoreFabricationCheck[] = input.optionalFailurePercent === null ? [] : [{
    id: 'optional-potion-delusion',
    die: 'd100',
    target: input.optionalFailurePercent,
    succeedsOn: 'roll-over',
    visibility: 'dm-secret',
    failureEffect: 'The failed product becomes a delusion potion of the attempted sort.',
    sourceId: 'dmg:117:potions-and-scrolls',
  }];

  return finalizePlan('potion', eligibility, calendar, transactions, checks, needsDm, [
    'maker profession and level',
    'alchemist identity and employment interval',
    'laboratory value and upkeep payment month',
    'listed XP award or explicit no-award fact',
    'DM-approved special ingredient and acquisition transaction',
    'work start/end and overlap lock proving one-at-a-time manufacture',
    'DM-selected optional failure rule, private roll, and outcome, if used',
  ]);
}

export type ScrollSurface = keyof typeof rule.scroll.surfaces;
export interface ScrollPlanInput extends CoreFabricationEligibilityInput {
  readonly category: 'scroll';
  readonly spellLevel: number;
  readonly surface: ScrollSurface;
  readonly sheetCount: number;
  readonly actualGpPerSheet: number | null;
  readonly specialQuillConfirmed: boolean | null;
  readonly dmInkFormulaApprovedAndPossessed: boolean | null;
  readonly existingSpellCount: number;
}

export function scrollFailurePercent(input: Pick<ScrollPlanInput, 'level' | 'spellLevel' | 'surface'>): number {
  integer(input.level, 'level', 1);
  integer(input.spellLevel, 'spell level', 1);
  return rule.scroll.baseFailurePercent + input.spellLevel - input.level + rule.scroll.surfaces[input.surface].failureAdjustmentPercent;
}

export function planCoreScrollInscription(input: ScrollPlanInput): CoreFabricationPlan {
  integer(input.sheetCount, 'sheet count', 1);
  integer(input.existingSpellCount, 'existing spell count');
  if (input.actualGpPerSheet !== null) integer(input.actualGpPerSheet, 'actual GP per sheet');
  const eligibility = evaluateCoreFabricationEligibility(input);
  const needsDm = [...eligibility.needsDm];
  const surface = rule.scroll.surfaces[input.surface];
  if (input.actualGpPerSheet === null) needsDm.push('The exact sheet price is not recorded; the book gives only a minimum.');
  else if (input.actualGpPerSheet < surface.minimumGpPerSheet) needsDm.push('Sheet price is below the printed minimum and needs correction.');
  if (input.specialQuillConfirmed !== true) needsDm.push('A fresh virgin quill from a strange or magical creature must be confirmed.');
  if (input.dmInkFormulaApprovedAndPossessed !== true) needsDm.push('DM must devise/approve the spell-specific ink and confirm its ingredients.');
  if (input.existingSpellCount >= rule.scroll.maximumSpells) needsDm.push('The scroll already holds the maximum seven spells.');
  const failure = scrollFailurePercent(input);
  return finalizePlan(
    'scroll',
    eligibility,
    [{
      kind: 'work',
      quantity: whole(input.spellLevel),
      unit: 'days',
      continuous: true,
      restrictions: [
        'Interruptions are permitted only for rest, food, sleep, and the like.',
        'Leaving the scroll for any other activity breaks the magic and wastes the effort.',
      ],
    }],
    [
      ...(input.actualGpPerSheet === null ? [] : [{
        kind: 'spend-gp' as const,
        amount: input.actualGpPerSheet * input.sheetCount,
        unit: 'gp' as const,
        timing: 'before-work' as const,
        description: `${input.sheetCount} sheet(s) of pure, unblemished ${input.surface}.`,
        dmPrivate: false,
      }]),
      { kind: 'consume-material', unit: 'item', timing: 'during-work', description: 'Fresh special quill and DM-approved ink.', dmPrivate: true },
    ],
    [{
      id: 'scroll-transcription',
      die: 'd100',
      target: failure,
      succeedsOn: 'roll-over',
      visibility: 'public',
      failureEffect: 'The spell is useless; no further spells may be placed on this scroll.',
      sourceId: 'dmg:117:potions-and-scrolls',
    }],
    needsDm,
    [
      'spell identity, level, profession, and maker ability to employ it',
      'scroll surface, sheets, exact price, quill provenance, and DM ink formula reference',
      'continuous calendar interval and any interruption',
      'spell ordinal, d100 roll, computed failure percentage, and whether the scroll was closed by failure',
    ],
  );
}

export interface OtherItemPlanInput extends CoreFabricationEligibilityInput {
  readonly category: 'other-item';
  readonly itemXpValue: number | null;
  readonly finestQualityConfirmed: boolean | null;
  readonly rawMaterialGp: number | null;
  readonly dmFormulaApproved: boolean | null;
  readonly requiredIngredientsPossessed: boolean | null;
  readonly rolledEnchantAdditionalHours?: number | null;
  readonly successiveSpellLevel?: number | null;
  readonly rolledSuccessiveAdditionalHoursPerLevel?: number | null;
  readonly itemSavingThrowTarget?: number | null;
  readonly makerSavingThrowBonus?: number | null;
}

export function planCoreOtherItemFabrication(input: OtherItemPlanInput): CoreFabricationPlan {
  const eligibility = evaluateCoreFabricationEligibility(input);
  const needsDm = [...eligibility.needsDm];
  if (input.itemXpValue !== null) integer(input.itemXpValue, 'item XP value');
  if (input.rawMaterialGp !== null) integer(input.rawMaterialGp, 'raw material GP');
  if (input.finestQualityConfirmed !== true) needsDm.push('Finest possible material, workmanship, soundness, and lack of damage must be confirmed.');
  if (input.dmFormulaApproved !== true) needsDm.push('DM must specify/approve required spells, materials, and procedure.');
  if (input.requiredIngredientsPossessed !== true) needsDm.push('DM-approved ingredients are not confirmed possessed.');
  const calendar: CoreCalendarCommitment[] = [];
  const transactions: CoreResourceTransaction[] = [];
  const checks: CoreFabricationCheck[] = [];

  if (input.profession === 'cleric' || input.profession === 'druid') {
    calendar.push(
      { kind: 'retreat', quantity: whole(rule.otherItem.clericDruidRetreatDays), unit: 'days', continuous: true, restrictions: ['Complete isolation and meditation.'] },
      { kind: 'fast', quantity: whole(rule.otherItem.clericDruidFastDays), unit: 'days', continuous: true, restrictions: ['Fasting.'] },
      { kind: 'purify', quantity: whole(rule.otherItem.clericDruidPurificationDays), unit: 'days', continuous: true, restrictions: ['Pray over and purify the item.'] },
    );
    checks.push({
      id: 'divine-favor', die: 'd100', target: null, succeedsOn: 'roll-at-or-below', visibility: 'dm-secret',
      failureEffect: 'No favor yet; another day adds a cumulative 1% chance if conduct remains exemplary.',
      sourceId: 'dmg:118:other-items',
    });
    needsDm.push('DM must privately confirm exemplary faith/alignment conduct and record each favor day.');
  } else if (input.profession === 'illusionist') {
    calendar.push({
      kind: 'work', quantity: whole(rule.otherItem.illusionistInitialDweomerHours), unit: 'hours', continuous: true,
      restrictions: ['After major creation, any interruption makes the item fade forever.'],
    });
    if (input.itemNature === 'permanent') {
      needsDm.push('DM must confirm major creation followed by alter reality and all item-specific spells/materials.');
    }
  } else if (input.profession === 'magic-user') {
    const extra = input.rolledEnchantAdditionalHours;
    if (extra === null || extra === undefined) {
      needsDm.push('Record the 8-64 additional hours for enchant an item; the checked text does not prescribe a die expression.');
    } else {
      integer(extra, 'enchant additional hours');
      if (extra < rule.otherItem.enchantItemAdditionalHours.minimum || extra > rule.otherItem.enchantItemAdditionalHours.maximum) {
        needsDm.push('Enchant-item additional hours must be within the printed 8-64 range.');
      } else {
        calendar.push({
          kind: 'work', quantity: whole(rule.otherItem.enchantItemBaseHours + extra), unit: 'hours', continuous: true,
          restrictions: [
            'No more than 8 hours of work per day.',
            'The caster must touch the item while working and keep it within 1 foot while resting.',
            'Rest is quiet and isolated, with no other magic.',
          ],
        });
      }
    }
    if (input.itemSavingThrowTarget === null || input.itemSavingThrowTarget === undefined || input.makerSavingThrowBonus === null || input.makerSavingThrowBonus === undefined) {
      needsDm.push('DM must supply the maker/item saving throw target and applicable bonus (capped at +3).');
    } else {
      integer(input.itemSavingThrowTarget, 'item saving throw target', 1);
      integer(input.makerSavingThrowBonus, 'maker saving throw bonus');
      checks.push({
        id: 'enchant-item-preparation', die: 'd20',
        target: input.itemSavingThrowTarget - Math.min(input.makerSavingThrowBonus, rule.otherItem.itemMaximumSavingThrowBonus),
        succeedsOn: 'saving-throw-success', visibility: 'maker-knows-result',
        failureEffect: 'Preparation fails; natural 1 always fails regardless of modifiers.', sourceId: 'phb:83-84:enchant-an-item',
      });
    }
    if (input.successiveSpellLevel !== null && input.successiveSpellLevel !== undefined) {
      integer(input.successiveSpellLevel, 'successive spell level', 1);
      const perLevel = input.rolledSuccessiveAdditionalHoursPerLevel;
      if (perLevel === null || perLevel === undefined) {
        needsDm.push('Record the printed 4-8 additional hours per spell level; no die expression is supplied.');
      } else {
        integer(perLevel, 'successive additional hours per level');
        if (perLevel < 4 || perLevel > 8) needsDm.push('Successive additional hours per level must be 4-8.');
        else calendar.push({
          kind: 'work', quantity: whole(4 + perLevel * input.successiveSpellLevel), unit: 'hours', continuous: true,
          restrictions: ['Begin within 24 hours of the prior stage; touch/one-foot/isolation restrictions continue.'],
        });
      }
      checks.push({
        id: 'successive-dweomer', die: 'd20', target: checks[0]?.target ?? null,
        succeedsOn: 'saving-throw-success', visibility: 'dm-secret',
        failureEffect: 'The dweomer does not take; the maker cannot tell whether it succeeded.', sourceId: 'phb:83-84:enchant-an-item',
      });
    }
  }

  if (input.rawMaterialGp !== null) transactions.push({
    kind: 'spend-gp', amount: input.rawMaterialGp, unit: 'gp', timing: 'before-work',
    description: 'Finest-quality item, materials, and labor.', dmPrivate: false,
  });
  transactions.push({
    kind: 'consume-material', unit: 'item', timing: 'during-work',
    description: 'DM-defined fabrication ingredients and spell components.', dmPrivate: true,
  });
  if (input.itemXpValue === null) {
    needsDm.push('Item XP value is required to determine post-fabrication rest.');
  } else if (input.itemXpValue % 100 !== 0) {
    needsDm.push('The item XP value is not divisible by 100; the checked text does not state how to round convalescence.');
  } else {
    calendar.push({
      kind: 'rest', quantity: whole(input.itemXpValue / 100), unit: 'days', continuous: true,
      restrictions: ['Only eating, resting, mild exercise, and sleep in relative isolation; no adventuring or spell use.'],
    });
  }
  if (input.itemNature === 'permanent' && input.profession === 'magic-user') {
    transactions.push({
      kind: 'ability-loss', amount: 1, unit: 'constitution-point', timing: 'on-completion',
      description: 'Permanency lowers the caster constitution by 1 point.', dmPrivate: false,
    });
  }

  return finalizePlan('other-item', eligibility, calendar, transactions, checks, needsDm, [
    'maker class, level, voluntary status, and profession/alignment permission',
    'item category, permanence/charges, finest-quality base object, value, and XP value',
    'DM-private formula, required spells, ingredients, and acquisition/consumption transactions',
    'every uninterrupted calendar interval, deadline, interruption, and recovery day',
    'basic enchant roll visible to maker; each later save and divine-favor roll with DM-only visibility',
    'constitution loss and other permanent resource changes',
  ]);
}

export function resolveCoreFabricationCheck(
  check: CoreFabricationCheck,
  roll: number,
  context?: { readonly divineFavorDay?: number },
): { readonly succeeded: boolean; readonly target: number; readonly visibility: CoreFabricationCheck['visibility'] } {
  integer(roll, `${check.die} roll`, 1);
  const maximum = check.die === 'd20' ? 20 : 100;
  if (roll > maximum) throw new Error(`${check.die} roll must be 1-${maximum}.`);
  const target = check.id === 'divine-favor'
    ? Math.min(100, context?.divineFavorDay ?? 0)
    : check.target;
  if (target === null) throw new Error('Check target is unresolved and needs DM input.');
  let succeeded: boolean;
  if (check.id === 'enchant-item-preparation' || check.id === 'successive-dweomer') {
    succeeded = roll !== 1 && roll >= target;
  } else if (check.succeedsOn === 'roll-over') succeeded = roll > target;
  else succeeded = roll <= target;
  return { succeeded, target, visibility: check.visibility };
}

export function projectCoreFabricationForPlayer(plan: CoreFabricationPlan): object {
  return Object.freeze({
    decision: plan.decision,
    category: plan.category,
    reasons: plan.eligibility.reasons,
    needsDm: plan.needsDm,
    calendar: plan.calendar,
    transactions: plan.transactions.map(transaction =>
      transaction.dmPrivate
        ? { ...transaction, description: 'DM-managed special material or component.' }
        : transaction,
    ),
    checks: plan.checks.map(check => check.visibility === 'dm-secret'
      ? { id: check.id, die: check.die, visibility: check.visibility, result: 'withheld' }
      : check),
  });
}

function finalizePlan(
  category: CoreFabricationCategory,
  eligibility: CoreFabricationEligibility,
  calendar: readonly CoreCalendarCommitment[],
  transactions: readonly CoreResourceTransaction[],
  checks: readonly CoreFabricationCheck[],
  needsDm: readonly string[],
  factsToPersist: readonly string[],
): CoreFabricationPlan {
  const unresolved = unique(needsDm);
  return Object.freeze({
    decision: eligibility.decision === 'ineligible'
      ? 'ineligible'
      : unresolved.length > 0
        ? 'needs-dm'
        : 'eligible',
    category,
    eligibility,
    calendar,
    transactions,
    checks,
    needsDm: unresolved,
    factsToPersist,
  });
}

