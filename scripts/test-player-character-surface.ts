import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = (relative: string) => readFileSync(join(root, relative), 'utf8');

const home = page('src/pages/character/index.astro');
if (home.includes('/character/review/') || home.includes('DM 创建审核')) {
  throw new Error('Player character home must not expose a DM review route.');
}
if (!home.includes('/character/create/') || !home.includes('/character/sheet/') || !home.includes('/character/growth/') || !home.includes('/character/journal/')) {
  throw new Error('Player character home is missing one of the four primary workspaces.');
}

const archive = page('src/pages/character/archive/index.astro');
if (archive.includes('/character/review/') || archive.includes('DM 创建审核')) {
  throw new Error('Archive checker must not link to the removed DM review page.');
}

for (const obsoleteRoute of ['review', 'operations']) {
  if (existsSync(join(root, `src/pages/character/${obsoleteRoute}/index.astro`))) {
    throw new Error(`The player site must not build the obsolete character/${obsoleteRoute} route.`);
  }
}

const core = page('src/character/ui/core-candidate-controller.ts');
if (core.includes('DM 已确认') || core.includes('DM 许可的稳定语言 ID')) {
  throw new Error('Core creation still exposes a DM approval field.');
}
const admission = page('src/character/ui/core-campaign-admission.ts');
const divine = page('src/character/ui/core-divine-initial-spells.ts');
if (admission.includes('确认此设置的 DM 身份') || admission.includes('导出创建进度交给 DM 审核') || divine.includes('待创建审核确认')) {
  throw new Error('Player creation still exposes the future DM Studio review workflow.');
}

const distReview = join(root, 'dist/character/review/index.html');
if (existsSync(distReview)) {
  throw new Error('The generated static site still contains the removed DM review page.');
}

console.log('PASS: player character surface has no DM review route or approval fields and keeps the four primary workspaces.');
