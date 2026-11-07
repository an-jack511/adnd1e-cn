/** PHB printed p.31 (PDF p.32), Monks Table II; checked against the local page image. */
const ac=[10,9,8,7,7,6,5,4,3,3,2,1,0,-1,-1,-2,-3];
const move=[15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32];
const attacks=['1','1','1','5/4','5/4','3/2','3/2','3/2','2','2','5/2','5/2','5/2','3','3','4','4'];
const damage=['1–3','1–4','1–6','1–6','2–7','2–8','3–9','2–12','3–12','3–13','4–13','4–16','5–17','5–20','6–24','5–30','8–32'];
export function monkCombat(level:number){return Number.isInteger(level)&&level>=1&&level<=17?{ac:ac[level-1],move:move[level-1],attacks:attacks[level-1],damage:damage[level-1]}:null;}
