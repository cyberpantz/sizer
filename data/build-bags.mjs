/* Builds data/bags/*.json from review mentions, identity, and manufacturer-bags.json.
   Rules, and they are not negotiable:
     - No dimension is ever invented. If no source printed one, the field is null.
     - Review-published dimensions are src "review". They are NOT "measured".
       Nothing in this repo is "measured" until we have measured it ourselves.
     - Every value carries {v, src, at, ref}. A bare number is a bug.
   Run: node data/build-bags.mjs */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { IDENTITY } from './bag-identity.mjs';

const here = new URL('.', import.meta.url);
/* Fields a HUMAN writes and this script must never overwrite.

   This file regenerates every record from sources. That is the right design for
   anything derived — but `measured_cm` is not derived. It is the one number in
   the repo that came from someone holding a tape against a bag, and it is the
   only thing the product actually sells. A rebuild that erased it would destroy
   the asset silently, and the corruption would look exactly like a clean build.

   So: read the existing record first, carry these forward, and refuse to
   proceed if anything is at risk. Adding a hand-entered field? Add it here in
   the same commit. */
const PRESERVE = ['measured_cm', 'measured_at', 'measured_by', 'measurement_photo', 'notes'];

function preserved(slug) {
  const url = new URL(`bags/${slug}.json`, here);
  if (!existsSync(url)) return {};
  let prior;
  try {
    prior = JSON.parse(readFileSync(url));
  } catch (e) {
    /* A record we cannot parse might still hold a measurement. Never clobber it
       on a guess — make a human look. */
    throw new Error(
      `bags/${slug}.json is unreadable (${e.message}). Fix or move it before rebuilding; it may contain measurements.`
    );
  }
  const keep = {};
  for (const f of PRESERVE) if (prior[f] != null) keep[f] = prior[f];
  return keep;
}

const R = JSON.parse(readFileSync(new URL('reviews/mentions.json', here)));
const S = JSON.parse(readFileSync(new URL('reviews/sources.json', here))).sources;
const manufacturerBags = JSON.parse(readFileSync(new URL('manufacturer-bags.json', here))).bags;
const sourceKind = (ref) => (S[ref].kind === 'manufacturer' ? 'manufacturer' : 'review');

const CM = (i) => +(i * 2.54).toFixed(1);
const desc = (a) => [...a].sort((x, y) => y - x);
const LB2KG = (l) => +(l * 0.45359).toFixed(2);

const byBag = new Map();
for (const m of R.mentions) (byBag.get(m.bag) ?? byBag.set(m.bag, []).get(m.bag)).push(m);

const bags = [];
for (const [slug, ms] of byBag) {
  const id = IDENTITY[slug];
  if (!id) {
    console.error(`  MISSING IDENTITY  ${slug}`);
    continue;
  }

  /* Dimensions: only from sources that actually printed them. Prefer the most
     recently updated source when several did. Externally measured, sorted desc. */
  const dimRows = ms
    .filter((m) => Array.isArray(m.claimed?.dimensions_in))
    .sort((a, b) => (S[b.source].updated > S[a.source].updated ? 1 : -1));
  const dim = dimRows[0];

  const wRows = ms
    .filter((m) => typeof m.claimed?.weight_lb === 'number')
    .sort((a, b) => (S[b.source].updated > S[a.source].updated ? 1 : -1));
  const cRows = ms
    .filter((m) => typeof m.claimed?.capacity_l === 'number')
    .sort((a, b) => (S[b.source].updated > S[a.source].updated ? 1 : -1));

  const F = (rows, get, unit) =>
    rows.length
      ? {
          v: get(rows[0]),
          src: sourceKind(rows[0].source),
          ref: rows[0].source,
          at: S[rows[0].source].updated,
          unit,
        }
      : null;

  /* Disagreements survive. We never silently pick a winner. */
  const conflicts = [];
  for (const [field, rows, get] of [
    ['weight_kg', wRows, (m) => LB2KG(m.claimed.weight_lb)],
    ['capacity_l', cRows, (m) => m.claimed.capacity_l],
    ['external_cm', dimRows, (m) => desc(m.claimed.dimensions_in.map(CM))],
  ]) {
    const seen = rows.map((r) => [r.source, get(r)]);
    const key = (v) => (Array.isArray(v) ? v.join('x') : String(v));
    if (new Set(seen.map((s) => key(s[1]))).size > 1)
      conflicts.push({ field, values: seen.map(([src, v]) => ({ src, v })) });
  }

  /* Reference personal-item envelope. The common floor across the strict European
     budget carriers (Ryanair, Wizz, Vueling all publish 40 x 30 x 20). */
  const _PI = [40, 30, 20];
  bags.push({
    slug,
    brand: id.brand,
    model: id.model,
    variant: id.variant ?? null,
    line: id.line ?? null,
    type: id.type,
    soft: id.soft,
    wheels: id.wheels,
    role: id.role, // overhead | underseat — see bag-identity.mjs
    /* Derived, and deliberately separate from role: plenty of overhead carry-ons
       are also small enough to go under a seat. That is a useful fact to show on a
       bag page. It is NOT a reason to move the bag out of the carry-on shelf. */
    fits_personal_item: null,

    external_cm: dim
      ? {
          v: desc(dim.claimed.dimensions_in.map(CM)),
          src: sourceKind(dim.source),
          ref: dim.source,
          at: S[dim.source].updated,
          note:
            sourceKind(dim.source) === 'manufacturer'
              ? 'Manufacturer-published overall dimensions. Not independently measured by us.'
              : "Publication's own measurement. Not ours. Re-measure before this drives a verdict.",
        }
      : null,
    /* Where a manufacturer publishes BOTH figures, keep the packing one too. The
       gap between them is the product: it's the wheels-and-handle delta that every
       spec sheet hides by printing only one number. */
    claimed_packing_cm: (() => {
      const r = ms.find((x) => Array.isArray(x.claimed_packing_in));
      return r
        ? {
            v: desc(r.claimed_packing_in.map(CM)),
            src: 'manufacturer',
            ref: r.source,
            at: S[r.source].updated,
          }
        : null;
    })(),
    claimed_cm: null, // manufacturer spec — not yet collected, never guessed
    measured_cm: null, // ours. null until someone puts a tape on it.
    measured_at: null,

    weight_kg: F(wRows, (m) => LB2KG(m.claimed.weight_lb), 'kg'),
    capacity_l: F(cRows, (m) => m.claimed.capacity_l, 'L'),

    reviews: ms.map((m) => ({
      src: m.source,
      ...(sourceKind(m.source) === 'manufacturer' ? { kind: 'manufacturer' } : {}),
      publication: S[m.source].publication,
      url: S[m.source].url,
      at: S[m.source].updated,
      award: m.award ?? null,
      rank: m.rank ?? null,
      ranked: m.ranked !== false,
      rolling_score: m.rolling_score ?? null,
      praise: m.praise ?? null,
      caveat: m.caveat ?? null,
      /* A reviewer asserting the bag is carry-on legal. Captured because an
         unbacked claim is a claim: it's what the reader acts on. `basis` says
         what it rests on — assertion_only, product_name, or a dimension. */
      compliance_claim: m.compliance_claim ?? null,
      observed: m.observed ?? null,
      category: m.category ?? 'carryon',
      verbatim: m.caveat_verbatim === true,
      rejected_on_fit: m.rejected_on_fit === true,
    })),
    conflicts,
    mentions: ms.length,
    needs_measurement: true,
    /* Last, so it overwrites the generated nulls above rather than the reverse. */
    ...preserved(slug),
  });
}

/* Manufacturer research, merged onto whatever the reviews already produced.

   A slug collision used to throw, with a comment saying it "needs an explicit
   merge, never a silent overwrite". This is that merge, and it is the whole
   workflow docs/19 describes: 31 of our sized bags rest on a review
   publication's tape measure, every one of them is ALREADY in the catalogue
   through that review, and upgrading one means replacing its dimension with
   the manufacturer's own overall figure — not adding a second record.

   Who wins what:
     - DIMENSIONS, weight, expansion: the manufacturer. That is the point of
       the upgrade, and docs/19 ranks maker_overall above review.
     - REVIEWS, mentions, awards, caveats: the review side. The manufacturer
       entry has none, and spreading it over the top would erase them.
     - CONFLICTS: the union, plus one generated below if the two sources
       actually disagree.

   Nothing is dropped silently: a field the manufacturer record does not carry
   keeps whatever the review gave it. */
const bySlug = new Map(bags.map((b) => [b.slug, b]));
for (const record of manufacturerBags) {
  const prior = bySlug.get(record.slug);

  if (!prior) {
    const fresh = {
      variant: null,
      line: null,
      role: 'overhead',
      fits_personal_item: null,
      claimed_packing_cm: null,
      claimed_cm: null,
      measured_cm: null,
      measured_at: null,
      reviews: [],
      conflicts: [],
      mentions: 0,
      needs_measurement: true,
      ...record,
      ...preserved(record.slug),
    };
    bags.push(fresh);
    bySlug.set(record.slug, fresh);
    continue;
  }

  /* Do the two sources agree? Recorded either way, because "the maker and an
     independent publication measured the same object and got the same answer"
     is worth as much to a reader as a disagreement — and a disagreement is a
     finding this site exists to publish.

     0.3 cm is the engine's EPS_CM: below it nothing resolves, so calling that
     a conflict would cry wolf on rounding. */
  const EPS = 0.3;
  const before = prior.external_cm;
  const after = record.external_cm;
  const crossSource = [];
  if (before?.v && after?.v && before.src !== after.src) {
    const gap = after.v.map((v, i) => +(v - before.v[i]).toFixed(2));
    const worst = Math.max(...gap.map(Math.abs));
    crossSource.push({
      field: 'external_cm',
      from: `${before.src}${before.ref ? ` (${before.ref})` : ''}`,
      to: `${after.src} (${after.ref})`,
      delta_cm: gap,
      agrees: worst <= EPS,
      detail:
        worst <= EPS
          ? `Superseded by the manufacturer's own overall figure. The two agree to within ${worst} cm, so the earlier number was sound — it simply could not be recommended on.`
          : `Superseded by the manufacturer's own overall figure, which differs by up to ${worst} cm. Both are recorded; the maker's is the one an airline's limit is compared against.`,
      at: after.at ?? null,
    });
  }

  Object.assign(prior, {
    ...record,
    /* Review-side facts the manufacturer entry knows nothing about. */
    reviews: prior.reviews,
    mentions: prior.mentions,
    conflicts: [...(prior.conflicts ?? []), ...crossSource, ...(record.conflicts ?? [])],
    ...preserved(record.slug),
  });
}

/* The number that names the gap: someone told the reader this bag fits, and
   nobody — them or us — has a dimension to stand behind it. */
for (const b of bags) {
  /* A measured bag is no longer queued, whatever the generator defaulted to. */
  if (b.measured_cm) b.needs_measurement = false;
  b.compliance_claimed = b.reviews.some((r) => r.compliance_claim);
  /* How much bigger the airline's box has to be than the brochure's. */
  if (b.claimed_packing_cm && b.external_cm) {
    const p = b.claimed_packing_cm.v,
      e = b.external_cm.v;
    b.wheel_handle_delta_cm = e.map((v, i) => +(v - p[i]).toFixed(1));
  }
  b.observed = b.reviews.flatMap((r) => r.observed ?? []);
  b.compliance_unbacked = b.compliance_claimed && !b.external_cm;
}

for (const b of bags) {
  if (!b.external_cm) continue;
  const e = desc(b.external_cm.v),
    p = desc([40, 30, 20]);
  b.fits_personal_item = e.every((v, i) => v <= p[i]);
}

mkdirSync(new URL('bags/', here), { recursive: true });
for (const b of bags)
  writeFileSync(new URL(`bags/${b.slug}.json`, here), JSON.stringify(b, null, 1));

const kept = bags.filter((b) => b.measured_cm).length;
if (kept) console.log(`${kept} measurement(s) preserved across the rebuild`);
writeFileSync(
  new URL('bags/_index.json', here),
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      count: bags.length,
      note: 'Generated by data/build-bags.mjs. Edit the sources, not this.',
      bags: bags.map((b) => b.slug),
    },
    null,
    1
  )
);
console.log(`built ${bags.length} bag records`);
