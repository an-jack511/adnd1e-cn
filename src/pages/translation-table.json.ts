import names from '../data/terminology/names.json';

export function GET() {
  const entries = names
    .filter(entry => entry.en && entry.zh)
    .map(entry => ({ en: entry.en, zh: entry.zh, category: entry.category, status: entry.status }));
  return new Response(JSON.stringify({ entries }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
