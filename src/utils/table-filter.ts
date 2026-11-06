import { bindFilterChoices, checkedValues, matchesChoices } from './filter-choices';

export function tableFilter<T>(prefix: string, fields: string[], groups: string[], matches: (record: T, values: Record<string, string>) => boolean) {
  const inputs = fields.map(key => [key, document.querySelector<HTMLInputElement>(`#${prefix}-${key}`)!] as const);
  const rows = [...document.querySelectorAll<HTMLTableRowElement>(`#${prefix}-results tr[data-record]`)].map(row => ({ row, record: JSON.parse(row.dataset.record!) as T & { facets: Record<string, string[]> } }));
  const count = document.querySelector<HTMLElement>(`#${prefix}-count`)!;
  const params = new URLSearchParams(location.search);
  for (const [key, input] of inputs) input.value = params.get(key) ?? '';
  const render = () => {
    const values = Object.fromEntries(inputs.map(([key, input]) => [key, input.value.trim().toLowerCase()]));
    const selected = Object.fromEntries(groups.map(key => [key, checkedValues(key)]));
    let visible = 0;
    for (const { row, record } of rows) {
      row.hidden = !matches(record, values) || !groups.every(key => matchesChoices(selected[key], record.facets[key] ?? []));
      if (!row.hidden) visible++;
    }
    count.textContent = `显示 ${visible} / ${rows.length} 项`;
    const url = new URL(location.href);
    for (const [key, input] of inputs) input.value ? url.searchParams.set(key, input.value) : url.searchParams.delete(key);
    for (const key of groups) { url.searchParams.delete(key); for (const value of selected[key]) url.searchParams.append(key, value); }
    history.replaceState({}, '', url);
  };
  bindFilterChoices(render);
  inputs.forEach(([, input]) => input.addEventListener('input', render));
  render();
}
