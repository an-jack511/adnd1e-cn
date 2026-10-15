import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const tests=['test-rules-engine.ts','test-character-creation.ts','test-character-transactions.ts','test-character-record.ts','test-character-persistence.ts','test-character-quarantine.ts','test-character-release-gate.ts','test-campaign-profile.ts','test-core-eligibility-engine.ts','test-core-creation-workflow.ts','test-core-admission.ts','test-core-progression-engine.ts','test-core-career-paths.ts','test-core-starting-resources.ts','test-core-class-capabilities.ts','test-core-languages.ts','test-core-weapon-proficiency.ts','test-core-equipment-legality.ts','test-core-spell-acquisition.ts','test-core-spell-capacity.ts','test-core-spell-ledger.ts','test-core-psionics.ts','test-core-magical-research.ts','test-core-magic-item-fabrication.ts','test-core-training.ts','test-core-advancement-workflow.ts','test-core-inventory.ts','test-core-relationships.ts','test-core-time-rest.ts','test-core-life-state.ts'];
// Implemented sidecars join the executable suite without pretending absent modules passed.
for(const name of ['test-core-eligibility-data.ts','test-core-progression-data.ts','test-character-archive.ts']){
  if(existsSync(resolve(root,'scripts',name)))tests.push(name);else console.log('PENDING module test:',name);
}
for(const name of tests){
  const result=spawnSync(process.execPath,[resolve(root,'node_modules/tsx/dist/cli.mjs'),resolve(root,'scripts',name)],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
console.log('Implemented character tests passed. This is not the full-system release gate.');
