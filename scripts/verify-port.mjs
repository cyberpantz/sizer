/* Replays the golden snapshot through the SHARED engine.
   If a single verdict differs, the port changed behaviour and the diff says
   exactly which bag on which carrier. */

import { readFileSync } from 'node:fs';
import { createEngine } from '../src/engine/fit.mjs';
import { readMockup } from './read-mockup.mjs';

const root = new URL('../', import.meta.url);
const { AIR, BAGS } = readMockup();
const engine = createEngine();

const rows = [];
for (const b of BAGS) {
  const bag = {
    slug: b.s,
    model: b.m,
    external_cm: b.x,
    soft: Boolean(b.soft),
    weight_kg: b.kg ?? null,
    shell: b.soft ? 'softside' : 'hardside',
    expands_cm: 0,
    measured: false,
  };
  for (const a of AIR) {
    for (const fare of Object.keys(a.f)) {
      const alw = a.f[fare];
      const carrier = {
        iata: a.c,
        name: a.n,
        strictness: a.st,
        fare_class: fare,
        allowance: { max_cm: alw.d, linear_max_cm: alw.lin ?? null, max_kg: alw.kg ?? null },
        no_cabin_bag: false,
        regional_jets: false,
      };
      const r = engine.evaluate(bag, carrier);
      rows.push(`${b.s}|${a.c}|${fare}|${r.band}|${r.delta_cm}|${r.dimension}`);
    }
  }
}
rows.sort();

const golden = readFileSync(new URL('scripts/verdicts.golden', root), 'utf8').trim().split('\n');
const now = rows;
let diffs = 0;
const max = Math.max(golden.length, now.length);
for (let i = 0; i < max; i++) {
  if (golden[i] !== now[i]) {
    if (diffs < 10)
      console.log(`  was: ${golden[i] ?? '(missing)'}\n  now: ${now[i] ?? '(missing)'}\n`);
    diffs++;
  }
}
console.log(
  diffs
    ? `${diffs} of ${max} verdicts CHANGED — the port is not behaviour-preserving`
    : `all ${max} verdicts identical — shared engine matches the mockups exactly`
);
process.exit(diffs ? 1 : 0);
