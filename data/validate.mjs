/* CI gate. The failure mode this exists to prevent: a review's number quietly
   becoming "ours" somewhere between here and the page. */
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('bags/', import.meta.url);
/* `!startsWith('_')` — the convention every other loader in this repo uses.
   This one excluded `_index.json` BY NAME, so the next underscore file added
   to the directory was read as a bag record and crashed the validator on a
   missing field. A filter that lists its exceptions individually will always
   be one behind. */
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const bags = files.map((f) => JSON.parse(readFileSync(new URL(f, dir))));
const M = JSON.parse(readFileSync(new URL('reviews/mentions.json', import.meta.url)));
let fail = 0;
const bad = (s) => {
  console.log(`  FAIL  ${s}`);
  fail++;
};
const factFields = [
  'external_cm',
  'claimed_cm',
  'claimed_packing_cm',
  'weight_kg',
  'capacity_l',
  'expands_cm',
];

for (const b of bags) {
  for (const f of factFields) {
    const v = b[f];
    if (v == null) continue;
    if (typeof v !== 'object' || !('v' in v) || !v.src)
      bad(`${b.slug}.${f} is a bare value with no provenance`);
    if (v.src === 'measured' && !b.measured_at)
      bad(`${b.slug}.${f} claims "measured" with no date`);
  }
  if (b.external_cm && b.external_cm.src === 'measured' && !b.measured_cm)
    bad(`${b.slug} claims a measured dimension but measured_cm is null`);
  if (b.measured_cm && b.needs_measurement) bad(`${b.slug} is measured but still queued`);
  if (b.external_cm) {
    const d = b.external_cm.v;
    if (d.some((x, i) => i && x > d[i - 1])) bad(`${b.slug} dimensions not sorted descending`);
    if (d.some((x) => x <= 0 || x > 120)) bad(`${b.slug} implausible dimension ${d.join('x')}`);
  }
  if (b.weight_kg && (b.weight_kg.v <= 0 || b.weight_kg.v > 15))
    bad(`${b.slug} implausible weight`);
  if (!b.reviews.length && !b.manufacturer_source?.url)
    bad(`${b.slug} has neither review nor manufacturer provenance`);
  if (b.manufacturer_source) {
    const source = b.manufacturer_source;
    if (!source.url?.startsWith('https://') || !/^\d{4}-\d{2}-\d{2}$/.test(source.retrieved ?? ''))
      bad(`${b.slug} has incomplete manufacturer provenance`);
    for (const f of factFields) {
      const v = b[f];
      if (v?.src === 'manufacturer' && (v.ref !== source.url || v.at !== source.retrieved))
        bad(`${b.slug}.${f} does not match its manufacturer source`);
    }
  }
  for (const r of b.reviews)
    if (r.verbatim && !r.url) bad(`${b.slug} quotes verbatim with no link`);
}
const slugs = new Set(bags.map((b) => b.slug));
for (const m of M.mentions) if (!slugs.has(m.bag)) bad(`mention references unknown bag ${m.bag}`);

console.log(
  `${bags.length} bags checked · ${bags.filter((b) => b.measured_cm).length} measured · ${bags.filter((b) => b.external_cm).length} sized`
);
console.log(
  fail ? `\n${fail} FAILURES` : '\nall provenance intact — no review number is masquerading as ours'
);
process.exit(fail ? 1 : 0);
