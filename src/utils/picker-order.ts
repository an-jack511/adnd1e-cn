/** Keep a picker’s current order within each group while placing enabled choices first. */
export function prioritizeSelectableRows(tbody: HTMLTableSectionElement, selector: string) {
  const rows = Array.from(tbody.rows);
  const available: HTMLTableRowElement[] = [], unavailable: HTMLTableRowElement[] = [];
  for (const row of rows) {
    const input = row.querySelector<HTMLInputElement>(selector);
    (input?.disabled ? unavailable : available).push(row);
  }
  const ordered = [...available, ...unavailable];
  if (ordered.every((row, index) => row === rows[index])) return;
  const fragment = document.createDocumentFragment();
  for (const row of ordered) fragment.append(row);
  tbody.append(fragment);
}
