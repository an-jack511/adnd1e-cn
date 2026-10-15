import { z } from 'zod';
export const requiredGateIds=[
  'rules-packs','core-creation','core-sheet','core-advancement','archive-recovery',
  'spell-lifecycle','inventory-wealth','career-paths','relationships-loyalty',
  'calendar-rest','death-permanent-changes','research-properties','ua','oa','survival',
  'dm-audit-projection','offline-updates','browser-accessibility','remote-build-release'
] as const;
const evidence=z.object({kind:z.enum(['source-review','automated-test','browser-test','human-review','deployment-check']),locator:z.string().min(1)}).strict();
export const releaseManifestSchema=z.object({
  version:z.literal(1),updatedAt:z.string().min(1),
  gates:z.array(z.object({id:z.enum(requiredGateIds),status:z.enum(['pending','partial','accepted']),evidence:z.array(evidence),remaining:z.array(z.string().min(1))}).strict())
}).strict();
export type ReleaseManifest=z.infer<typeof releaseManifestSchema>;
export function assessRelease(input:unknown){
  const manifest=releaseManifestSchema.parse(input);const ids=manifest.gates.map(g=>g.id);
  if(new Set(ids).size!==ids.length||requiredGateIds.some(id=>!ids.includes(id)))throw new Error('Release manifest omitted or duplicated a required gate.');
  for(const gate of manifest.gates){if(gate.status==='accepted'&&(!gate.evidence.length||gate.remaining.length))throw new Error('Accepted gate lacks evidence or still has unfinished requirements.');}
  const blocked=manifest.gates.filter(g=>g.status!=='accepted');
  return {ready:blocked.length===0,accepted:manifest.gates.length-blocked.length,total:requiredGateIds.length,blocked};
}
