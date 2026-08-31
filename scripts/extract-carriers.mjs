/* One-off: lift the 24 placeholder carriers out of mockup/index.html into
   per-carrier JSON in the 05-schema shape.

   Run once, then delete. Its job is to give the 50-carrier audit somewhere to
   land — files with the right fields, every one flagged `placeholder: true` and
   carrying an empty `source_url`, so nothing can be published by accident and
   the audit is a matter of filling blanks rather than inventing structure.

   The VALUES here are not real. They came from a mockup and are recorded as
   such. See docs/README, "Numbers that are not yet real". */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('mockup/index.html', root), 'utf8');
// biome-ignore lint/security/noGlobalEval: one-off migration reading our own generated literal out of a mockup we wrote
const AIR = eval(html.match(/const AIR ?= ?\[[\s\S]*?\n\];/)[0].replace(/^const AIR=/, ''));

const REGION = {
  FR: 'EU',
  W6: 'EU',
  U2: 'EU',
  AF: 'EU',
  KL: 'EU',
  LH: 'EU',
  BA: 'EU',
  IB: 'EU',
  VY: 'EU',
  AA: 'NA',
  UA: 'NA',
  DL: 'NA',
  WN: 'NA',
  B6: 'NA',
  NK: 'NA',
  F9: 'NA',
  SQ: 'AS',
  CX: 'AS',
  JL: 'AS',
  NH: 'AS',
  TK: 'AS',
  TR: 'AS',
  EK: 'ME',
  QR: 'ME',
};
const TYPE = {
  FR: 'ulcc',
  W6: 'ulcc',
  U2: 'lcc',
  VY: 'lcc',
  NK: 'ulcc',
  F9: 'ulcc',
  TR: 'lcc',
  WN: 'lcc',
};
/* Mainline brands whose regional subsidiaries publish the mainline limits but
   fly aircraft whose bins won't take a 22-inch roller. Drives the advisory. */
const REGIONAL = new Set(['AA', 'UA', 'DL', 'AS']);

let written = 0;
for (const a of AIR) {
  const allowances = [];
  for (const [fare, f] of Object.entries(a.f)) {
    allowances.push({
      fare_class: fare,
      type: 'cabin',
      max_cm: f.d,
      max_kg: f.kg ?? null,
      includes_wheels: true,
      count: 1,
      note: f.note ?? null,
      /* Absence of a cabin row is the signal for "no cabin bag at any size".
         These placeholder fares all have one; the real audit may not. */
      source_url: '',
      verified_at: null,
    });
    if (f.chk) {
      allowances.push({
        fare_class: fare,
        type: 'checked',
        linear_max_cm: null,
        max_kg: null,
        free_pieces: f.chk,
        system: 'piece',
        weight_total_kg: null,
        source_url: '',
        verified_at: null,
      });
    }
  }

  const record = {
    iata: a.c,
    name: a.n,
    region: REGION[a.c] ?? null,
    type: TYPE[a.c] ?? 'full_service',
    strictness: {
      score: a.st,
      contested: false,
      /* The prose that justified the score in the mockup, kept as an
         unsourced claim rather than thrown away. The audit must replace each
         one with a citation or drop it — see 05-schema, evidence hierarchy. */
      evidence: a.e ? [{ claim: a.e, tier: null, url: '', retrieved: null, unverified: true }] : [],
      updated: null,
    },
    sizer: { at_gate: null, cabin_cm: null, personal_cm: null },
    operates_regional_jets: REGIONAL.has(a.c),
    allowances,
    source_url: '',
    verified_at: null,
    verified_by: null,
    /* The flag that keeps this out of production. validate-carriers.mjs fails
       any build that tries to publish one. */
    placeholder: true,
    placeholder_note:
      'Lifted from mockup/index.html. Not verified against the carrier. Do not publish.',
  };
  writeFileSync(new URL(`data/carriers/${a.c}.json`, root), JSON.stringify(record, null, 1));
  written++;
}

writeFileSync(
  new URL('data/carriers/_index.json', root),
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      count: written,
      target: 50,
      verified: 0,
      note: 'Every record is placeholder: true until someone reads the carrier page and fills source_url + verified_at.',
      carriers: AIR.map((a) => a.c).sort(),
    },
    null,
    1
  )
);
console.log(`${written} carrier records written, all flagged placeholder`);
