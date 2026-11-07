import {sourceGroup} from './source-group';
export const checkedValues = (name: string): string[] =>
  [...document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map(input => input.value);

export const matchesChoices = (selected: string[], values: string[]): boolean =>
  selected.length === 0 || selected.some(value => values.includes(value));

export function bindFilterChoices(render: () => void) {
  const params = new URLSearchParams(location.search);
  for (const group of document.querySelectorAll<HTMLElement>('[data-filter-group]')) {
    const name = group.dataset.filterGroup!;
    const requested = params.getAll(name).flatMap(value => value.split(',')).map(value => name === 'source' ? sourceGroup(value) : value);
    for (const input of group.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      input.checked = requested.includes(input.value);
      input.addEventListener('change', render);
    }
    group.querySelector('button')?.addEventListener('click', () => {
      group.querySelectorAll<HTMLInputElement>('input').forEach(input => input.checked = false);
      render();
    });
  }
}
