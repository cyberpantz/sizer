/* Runs the INLINED engine out of the built page and replays the golden
   snapshot through it. Proves the page a browser loads behaves identically
   to the module the tests cover — not just that the module is correct. */

import { readFileSync } from 'node:fs';
import { readMockup } from './read-mockup.mjs';

const root = new URL('../', import.meta.url);
const { html, AIR, BAGS } = readMockup();

const block = html.slice(html.indexOf('/* ENGINE:START'), html.indexOf('/* ENGINE:END */'));

/* Evaluate the inlined block exactly as the browser would. */
const ENGINE = new Function(`${block}\nreturn createEngine();`)();

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
  for (const a of AIR)
    for (const fare of Object.keys(a.f)) {
      const alw = a.f[fare];
      const r = ENGINE.evaluate(bag, {
        iata: a.c,
        name: a.n,
        strictness: a.st,
        fare_class: fare,
        allowance: { max_cm: alw.d, linear_max_cm: alw.lin ?? null, max_kg: alw.kg ?? null },
        no_cabin_bag: false,
        regional_jets: false,
      });
      rows.push(`${b.s}|${a.c}|${fare}|${r.band}|${r.delta_cm}|${r.dimension}`);
    }
}
rows.sort();

/* Set comparison rather than positional. Removing a carrier shifts every later
   line, and a line-by-line diff called that "623 verdicts changed" when in fact
   34 rows had gone and nothing else moved. The question worth answering is
   whether any SURVIVING verdict differs. */
const golden = new Set(
  readFileSync(new URL('scripts/verdicts.golden', root), 'utf8').trim().split('\n')
);
const now = new Set(rows);
const gone = [...golden].filter((l) => !now.has(l));
const added = [...now].filter((l) => !golden.has(l));

if (added.length) {
  console.log(`${added.length} verdict(s) CHANGED for carriers still in the dataset:\n`);
  for (const l of added.slice(0, 10)) console.log(`  ${l}`);
  process.exit(1);
}
if (gone.length) {
  const carriers = [...new Set(gone.map((l) => l.split('|')[1]))];
  console.log(
    `${gone.length} verdict(s) gone — carriers removed from the dataset: ${carriers.join(', ')}`
  );
  console.log(
    'No surviving verdict changed. Regenerate the snapshot if this removal was intended:'
  );
  console.log('  node scripts/snapshot-verdicts.mjs');
  process.exit(1);
}
console.log(`all ${rows.length} verdicts identical — the built page matches the golden snapshot`);
