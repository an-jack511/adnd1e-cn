/** Verified, deliberately narrow PHB Appendix I character-generation rules. */
const phbFile = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";

export const corePsionicsSources = Object.freeze({
  'phb:110:psionic-potential': Object.freeze({
    book: 'PHB', printedPages: [110] as const, pdfPages: [111] as const,
    section: 'Appendix I — Psionics; determination of potential and ability',
    sourceFile: phbFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text-and-visual-review',
  }),
  'phb:110-111:psionic-modes-disciplines': Object.freeze({
    book: 'PHB', printedPages: [110, 111] as const, pdfPages: [111, 112] as const,
    section: 'Attack/Defense Modes; Psionic Disciplines',
    sourceFile: phbFile,
    sha256: 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213',
    verification: 'local-page-text-and-visual-review',
  }),
} as const);

export type CorePsionicRaceId = 'human' | 'dwarf' | 'halfling' | 'other';
export type PsionicEligibility = 'eligible' | 'ineligible' | 'needs-dm';

export const psionicRacePolicy = Object.freeze({
  human: 'eligible',
  dwarf: 'needs-dm',
  halfling: 'needs-dm',
  other: 'ineligible',
} as const satisfies Readonly<Record<CorePsionicRaceId, PsionicEligibility>>);

export const attackModeCountBands = Object.freeze([
  { min: 1, max: 25, count: 1 }, { min: 26, max: 50, count: 2 },
  { min: 51, max: 75, count: 3 }, { min: 76, max: 95, count: 4 },
  { min: 96, max: 100, count: 5 },
]);
export const defenseModeCountBands = Object.freeze([
  { min: 1, max: 25, count: 2 }, { min: 26, max: 75, count: 3 },
  { min: 76, max: 90, count: 4 }, { min: 91, max: 100, count: 5 },
]);
export const disciplineCountBands = Object.freeze([
  { min: 1, max: 10, minor: 1, major: 0 }, { min: 11, max: 25, minor: 2, major: 0 },
  { min: 26, max: 40, minor: 3, major: 0 }, { min: 41, max: 55, minor: 2, major: 1 },
  { min: 56, max: 70, minor: 3, major: 1 }, { min: 71, max: 80, minor: 4, major: 1 },
  { min: 81, max: 90, minor: 3, major: 2 }, { min: 91, max: 95, minor: 5, major: 1 },
  { min: 96, max: 100, minor: 4, major: 2 },
]);

export const corePsionicsRulePack = Object.freeze({
  id: 'adnd1e:core:psionic-generation', version: '1.0.0', verifiedAt: '2026-10-15',
  sources: corePsionicsSources,
  scope: 'Optional PHB Appendix I eligibility, potential, strength, mode counts and discipline counts only',
  unresolved: Object.freeze([
    'How unmodified scores map onto every adjustment/history layer',
    'Minor-discipline d12/d6 mapping and class-exclusion rerolls',
    'Multi/two-class discipline acquisition and mastery',
    'Recovery allocation between unequal attack and defense pools',
    'Complete combat matrices, linked operations and exceptional outcomes',
  ]),
});
