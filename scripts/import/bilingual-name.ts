/** Split at the language boundary, retaining punctuation inside the English name. */
export function bilingualName(value: string): { nameZh: string; nameEn: string } | null {
  const text = value.replace(/&amp;/gi, '&').replace(/&#38;/g, '&').trim();
  const divider = text.lastIndexOf(' · ');
  const parts = divider >= 0
    ? [text.slice(0, divider), text.slice(divider + 3)]
    : text.match(/^(.+?[\u3400-\u9fff][^A-Za-zÀ-ž]*?)\s*([A-Za-zÀ-ž].*)$/)?.slice(1);
  if (!parts || !/[\u3400-\u9fff]/.test(parts[0]) || !/[A-Za-zÀ-ž]/.test(parts[1])) return null;
  return { nameZh: parts[0].replace(/[·、，,：:]+$/g, '').trim(), nameEn: parts[1].trim() };
}
