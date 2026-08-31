/* Can the dataset exercise every path the product has?

   Not "how many bags do we have" — 500 hardside spinners would still leave the
   under-seat filter empty and the top shelf bare. The question is whether every
   band, filter, shelf, advisory and comparison surface has at least one real bag
   standing in it.

   Reads data/ through the SAME loaders the pages use. It used to parse the
   mockup, which let the audit and the landing page disagree about the catalogue
   — and they did: the audit reported 4 bags on the top shelf while the page
   showed 5. An audit measuring a different dataset than the product is worse
   than no audit, because it reads as coverage. */
import { evaluate, coverage } from '../src/engine/fit.mjs';
import { loadBags, loadCarriers } from '../src/lib/data.mjs';
import { shelve } from '../src/lib/shelves.mjs';

const allBags = await loadBags({ role: null });
const carriers = await loadCarriers();
const carryon = allBags.filter((b) => b.role !== 'underseat' && b.record.role !== 'underseat');
const underseat = allBags.filter((b) => b.record.role === 'underseat');

const ready = [];
const blocking = [];
const deferred = [];

/* A path is DEFERRED when the product ships fine without it, or when it waits on
   data nobody has collected. Without the split everything looks equally urgent
   and nothing gets prioritised. */
function need(label, n, min, defer) {
  const line = `${label.padEnd(46)} ${String(n).padStart(3)}  (need ${min})`;
  if (n >= min) ready.push(line);
  else (defer ? deferred : blocking).push(line + (defer ? `  — ${defer}` : ''));
}

/* 1 · every verdict band must be reachable, by more than one bag */
const hit = { clears: new Set(), line: new Set(), gamble: new Set(), wont: new Set() };
for (const b of carryon) {
  for (const c of carriers) {
    const band = evaluate(b, c).band;
    if (band) hit[band]?.add(b.slug);
  }
}
for (const band of Object.keys(hit)) need(`band "${band}" reachable by N bags`, hit[band].size, 3);

/* 2 · catalogue filters */
for (const [type, min, defer] of [
  ['hardside spinner', 4],
  ['softside spinner', 4],
  ['2-wheel roller', 4],
  ['backpack', 4, 'one-bag audience, not the launch case'],
  ['duffel', 2, 'niche form factor'],
]) {
  need(`carry-on filter: ${type}`, carryon.filter((b) => b.record.type === type).length, min, defer);
}

/* 3 · the three shelves on the landing page — the claims the site makes */
for (const shelf of shelve(carryon, carriers)) {
  need(`carry-on shelf: ${shelf.title}`, shelf.bags.length, 5);
}
need(
  'under-seat category (its own shelf)',
  underseat.length,
  6,
  'own category, padded out later. Also blocked: scoring it needs a personal-item envelope per carrier'
);

/* 4 · advisories need bags that actually trip them */
const advisory = (id) =>
  carryon.filter((b) => carriers.some((c) => evaluate(b, c).advisories.some((a) => a.id === id)))
    .length;
need('trips the weight-headroom advisory', advisory('weight'), 4);
need('trips the squish advisory', advisory('squish'), 4);
need('trips the agent-commission advisory', advisory('agent_commission'), 1);

/* 5 · the variant-comparison surface */
const lines = {};
for (const b of carryon) {
  if (!b.record.line) continue;
  lines[b.record.line] ??= [];
  lines[b.record.line].push(b.slug);
}
const multi = Object.entries(lines).filter(([, v]) => v.length > 1);
need('product lines with 2+ sized variants', multi.length, 3);

/* 6 · provenance surfaces */
need(
  'bags carrying a cross-source conflict',
  allBags.filter((b) => b.record.conflicts?.length).length,
  5,
  'grows on its own as sources are added'
);
need(
  'bags cited by 2+ publications',
  allBags.filter((b) => b.record.mentions > 1).length,
  8,
  'grows on its own as sources are added'
);
need(
  'bags measured by us',
  allBags.filter((b) => b.measured).length,
  1,
  'THE product claim — nothing may be promoted until this moves'
);

/* 7 · carriers we cannot answer for, reported rather than hidden */
const unknown = carriers.filter((c) => c.cabin_unknown).length;

console.log(`READY\n${ready.map((s) => `  ok    ${s}`).join('\n')}`);
console.log(
  `\nBLOCKING — launch paths with no real data behind them\n${
    blocking.map((s) => `  THIN  ${s}`).join('\n') || '  none'
  }`
);
console.log(`\nDEFERRED — real gaps, not launch blockers\n${deferred.map((s) => `  later ${s}`).join('\n')}`);
console.log(
  `\n${ready.length} of ${ready.length + blocking.length} launch paths exercised  ·  ${deferred.length} deferred`
);
console.log(
  `catalogue: ${allBags.length} bags · ${carriers.length} carriers, ${unknown} unanswerable`
);
console.log(`lines with sized variants: ${multi.map((m) => `${m[0]}(${m[1].length})`).join(', ') || 'none'}`);
