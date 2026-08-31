/* Runs the real catalogue against the carrier set. Directional only — every
   dimension is a publication's, none is ours, and the carriers are placeholders. */
import { readdirSync, readFileSync } from 'node:fs';
import { readMockup } from '../scripts/read-mockup.mjs';

const { AIR } = readMockup();
const dir = new URL('bags/', import.meta.url);
const bags = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== '_index.json')
  .map((f) => JSON.parse(readFileSync(new URL(f, dir))))
  .filter((b) => b.external_cm);
const std = (a) =>
  a.f.economy ? 'economy' : a.f.priority ? 'priority' : a.f.plus ? 'plus' : Object.keys(a.f)[0];
const desc = (a) => [...a].sort((x, y) => y - x);

const EPS_CM = 0.3;
/* How far over the published limit is still worth showing, as a function of how
   reliably the carrier enforces it. This is the "fuzz factor", and it belongs
   here rather than in EPS_CM because it is a fact about the airline, not about
   our tape measure.

   It never moves the published limit — the delta is always computed against the
   real number and always shown. What it decides is whether an overage is worth
   presenting as a risk the traveller can weigh (GAMBLE) or is simply not on
   (WON'T). US carriers sit low on the strictness scale and genuinely do wave
   bags through; Ryanair, Wizz and Vueling pay staff to catch them.

   The old rule had a flat 3 cm ceiling that ignored strictness, so 3.1 cm over
   on Southwest — which does not own a gate sizer — read the same as 3.1 cm over
   on Ryanair. And strictness was a binary switch at 6, so a 1-to-10 scale
   produced exactly two behaviours. */
function gambleCeiling(st) {
  if (st <= 3) return 5.0; // effectively never measured
  if (st <= 5) return 3.0; // occasional, usually only when bins are full
  if (st <= 7) return 1.5; // frames at the gate, staff use judgement
  return 0; // measured as routine — over is over
}

function fit(cm, soft, st, lim) {
  const e = desc(cm).slice();
  if (soft) e[2] = Math.max(0, e[2] - 2);
  const m = desc(lim);
  let d = -Infinity;
  for (let i = 0; i < 3; i++) d = Math.max(d, e[i] - m[i]);
  const ceiling = gambleCeiling(st);
  if (d > ceiling && d > EPS_CM) return 'wont';
  else if (d > EPS_CM) return 'gamble';
  else if (d > 0) return 'line';
  else if (d > -2 && st >= 6) return 'line';
  else return 'clears';
}
const rows = bags
  .map((b) => {
    let ok = 0,
      tight = 0;
    for (const a of AIR) {
      const v = fit(b.external_cm.v, b.soft, a.st, a.f[std(a)].d);
      if (v === 'clears') ok++;
      else if (v === 'line') tight++;
    }
    return { b, ok, tight, pass: ok + tight };
  })
  .sort((x, y) => y.pass - x.pass || y.ok - x.ok);

console.log(`${'bag'.padEnd(34) + 'type'.padEnd(18)}clears  line   ok/N   reviews`);
for (const r of rows) {
  const awards = r.b.reviews.filter((v) => v.award).length;
  console.log(
    `${`${r.b.brand} ${r.b.model}`.slice(0, 33).padEnd(34)}${r.b.type.padEnd(18)}${String(r.ok).padStart(4)}${String(r.tight).padStart(6)}${String(r.pass).padStart(8)}/24${String(awards).padStart(6)}`
  );
}
const good = rows.filter((r) => r.pass / AIR.length >= 0.8).length;
console.log(`\n${good} of ${rows.length} sized bags clear or scrape 80%+ of carriers.`);
console.log(
  `${rows.filter((r) => r.pass / AIR.length <= 0.2).length} clear under a fifth — most of them award winners.`
);
