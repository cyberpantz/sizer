/* Golden snapshot of every verdict the mockups currently produce.

   Taken BEFORE the engine port and compared after. A refactor of the thing that
   decides whether someone's bag gets on a plane has to be provably behaviour-
   preserving, and "I read the diff" is not proof. */
import { readMockup } from './read-mockup.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const { html, AIR, BAGS } = readMockup();

/** Pull the data and the engine straight out of the page as it stands today. */

const std = (a) => a.f.economy ? 'economy' : (a.f.priority ? 'priority' : (a.f.plus ? 'plus' : Object.keys(a.f)[0]));
const desc = (a) => [...a].sort((p, q) => q - p);

/* The engine exactly as the page runs it right now. */
const EPS_CM = 0.3;
const gambleCeiling = (st) => st <= 3 ? 5.0 : st <= 5 ? 3.0 : st <= 7 ? 1.5 : 0;
function legacyFit(bag, alw, st) {
  const e = desc(bag.x).slice();
  if (bag.soft) e[2] = Math.max(0, e[2] - 2);
  const m = desc(alw.d);
  let delta = -Infinity, idx = 0;
  for (let i = 0; i < 3; i++) { const d = e[i] - m[i]; if (d > delta) { delta = d; idx = i; } }
  const ceiling = gambleCeiling(st);
  let band;
  if (delta > ceiling && delta > EPS_CM) band = 'wont';
  else if (delta > EPS_CM) band = 'gamble';
  else if (delta > 0) band = 'line';
  else if (delta > -2 && st >= 6) band = 'line';
  else band = 'clears';
  return { band, delta: +delta.toFixed(2), dim: ['long', 'wide', 'deep'][idx] };
}

const rows = [];
for (const bag of BAGS) {
  for (const a of AIR) {
    for (const fare of Object.keys(a.f)) {
      const r = legacyFit(bag, a.f[fare], a.st);
      rows.push(`${bag.s}|${a.c}|${fare}|${r.band}|${r.delta}|${r.dim}`);
    }
  }
}
rows.sort();
writeFileSync(new URL('scripts/verdicts.golden', root), rows.join('\n') + '\n');
console.log(`${rows.length} verdicts snapshotted (${BAGS.length} bags x ${AIR.length} carriers x fares)`);
