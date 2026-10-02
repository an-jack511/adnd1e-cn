import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve('dist');
const pages = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? pages(path) : entry.name.endsWith('.html') ? [path] : [];
});
const broken: string[] = [];
for (const page of pages(dist)) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(/\bhref="(\/[^"]+)"/g)) {
    const route = decodeURIComponent(match[1].split(/[?#]/)[0]);
    if (route.includes('${')) continue; // Client-side templates are not static links.
    if (route === '/') continue;
    const target = resolve(dist, `.${route}`);
    if (!existsSync(target) && !existsSync(join(target, 'index.html'))) broken.push(`${page.slice(dist.length + 1)} -> ${route}`);
  }
}
if (broken.length) {
  console.error(broken.slice(0, 50).join('\n'));
  process.exitCode = 1;
} else console.log('All built internal links resolve.');
