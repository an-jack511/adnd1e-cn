export const continuationParent = (slug: string) => {
  if (/^appendix-[a-p]-.*-\d+$/.test(slug)) return `dmg-${slug.replace(/-\d+$/, '')}`;
  if (/^treasure-continuation(?:-\d+)?$/.test(slug)) return 'dmg-treasure';
  if (slug === 'glossary-2') return 'dmg-glossary';
  return undefined;
};

export const continuationNumber = (slug: string) => {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : 1;
};
