import abilityTables from '../data/public/ability-tables.json';
import type { Ability } from './character';

const inRange = (label: string, score: string) => {
  const exceptional = score.trim().match(/^18\/(\d{1,2}|00)$/);
  if (exceptional) {
    const amount = exceptional[1] === '00' ? 100 : Number(exceptional[1]);
    if (label === '18/00') return amount === 100;
    const range = label.match(/^18\/(\d+)[–-](\d+)$/);
    return Boolean(range && amount >= Number(range[1]) && amount <= Number(range[2]));
  }
  if (label.includes('/')) return false;
  const value = Number(score);
  const range = label.match(/^(\d+)(?:[–-](\d+))?$/);
  return Number.isInteger(value) && Boolean(range && value >= Number(range[1]) && value <= Number(range[2] ?? range[1]));
};
export function abilityAdjustment(ability: Ability, score: string) {
  if (!score) return { display: '—', source: '', values: [] as { label: string; value: string }[] };
  const table = (abilityTables as Partial<Record<Ability, { page: number; labels: string[]; rows: string[][] }>>)[ability];
  if (!table) return { display: '详见 PHB 属性说明', source: 'PHB Character Abilities', values: [] as { label: string; value: string }[] };
  const row = table.rows.find((entry) => inRange(entry[0], score));
  if (!row) return { display: '请核对 PHB 属性表', source: `PHB p.${table.page}`, values: [] as { label: string; value: string }[] };
  const values = table.labels.map((label, index) => ({ label, value: row[index + 1] }));
  return { display: `${values.map(({ label, value }) => `${label} ${value}`).join('；')}（PHB p.${table.page}）`, source: `PHB p.${table.page}`, values };
}
