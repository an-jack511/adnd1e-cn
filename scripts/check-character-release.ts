import { readFileSync } from 'node:fs';
import { assessRelease } from '../src/character/audit/release-gate';
const input=JSON.parse(readFileSync(new URL('../src/character/audit/release-manifest.json',import.meta.url),'utf8'));
const result=assessRelease(input);console.log(`Full-system acceptance: ${result.accepted}/${result.total} accepted`);
for(const gate of result.blocked)console.log(`${gate.status}: ${gate.id} — ${gate.remaining.join('; ')}`);
if(!result.ready)process.exitCode=1;
