/* Builds data/bags/*.json from review mentions, identity, and manufacturer-bags.json.
   Rules, and they are not negotiable:
     - No dimension is ever invented. If no source printed one, the field is null.
     - Review-published dimensions are src "review". They are NOT "measured".
       Nothing in this repo is "measured" until we have measured it ourselves.
     - Every value carries {v, src, at, ref}. A bare number is a bug.
   Run: node data/build-bags.mjs */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/* Imperial intake, converted here and nowhere else.
 *
 * THE BUG THIS FIXES. The intake brief tells the researcher "do not convert,
 * round, average, or reconcile anything" — which is right, because a
 * conversion done at the source is a number nobody can audit back to the page.
 * But the brief then showed a target shape using `external_cm`. The two
 * instructions contradict, and the Away intake resolved it correctly: it
 * recorded `external_in` in the units Away actually prints, and set
 * `intake_status: researched_original_units_pending_runtime_support`.
 *
 * The build did not read that field, so a fully-researched bag landed with a
 * price and no dimensions and stayed invisible on the site. Nothing failed.
 *
 * So: the RESEARCH keeps the page's own units, and the BUILD converts. That is
 * the right split — the conversion is now one line of versioned code applied
 * identically to every record, instead of arithmetic done by hand 61 times.
 * Both survive: the imperial field is kept verbatim so any cm figure here can
 * be walked back to the sentence it came from. */
const EXACT = (f) => (v) => +(v * f).toFixed(6); // kill float dust, keep the value
const CONVERSIONS = [
  ['external_in', 'external_cm', 2.54, 'cm'],
  ['claimed_packing_in', 'claimed_packing_cm', 2.54, 'cm'],
  ['claimed_in', 'claimed_cm', 2.54, 'cm'],
  ['expands_in', 'expands_cm', 2.54, 'cm'],
  ['weight_lb', 'weight_kg', 0.45359, 'kg'],
];

/* Values are NOT rounded here. 22.7 in is 57.658 cm and that is what we store;
   rounding to 57.7 would be a second, invisible transformation of a
   manufacturer's number. Display rounding belongs in ui/units.mjs, where a
   reader can see what it did. */
const convert = (v, f) => (Array.isArray(v) ? v.map(EXACT(f)) : EXACT(f)(v));

/* Does this metric field come from the page, or from arithmetic?
 *
 * A cm figure PRINTED BY THE MANUFACTURER outranks anything we compute — it is
 * their own number. A cm figure someone derived from the inches in the same
 * record does not: it is arithmetic, and arithmetic belongs in one versioned
 * place rather than being redone by hand for each of 61 bags.
 *
 * The Away intake carried both `external_in` and a hand-converted
 * `external_cm` marked `conversion.from_field`. Deferring to it meant the
 * build's own converter never ran on the one record it was written for. */
const isDerived = (field) => Boolean(field?.conversion?.from_field);

function convertUnits(record) {
  const out = { ...record };
  for (const [from, to, factor, unit] of CONVERSIONS) {
    const src = record[from];
    const existing = record[to];
    if (!src) continue;
    if (existing && !isDerived(existing)) continue; // the page printed metric — it wins
    out[to] = {
      ...src,
      v: convert(src.v, factor),
      unit,
      conversion: {
        from_field: from,
        factor: String(factor),
        rounded: false,
        by: 'build-bags.mjs',
      },
      note: [
        src.note,
        `Derived from the manufacturer's published ${src.unit ?? 'imperial'} figure using factor ${factor}; not a manufacturer-published metric value. Converted by the build, not by the source.`,
      ]
        .filter(Boolean)
        .join(' '),
    };
  }
  return out;
}

const byBag = new Map();
for (const m of R.mentions) (byBag.get(m.bag) ?? byBag.set(m.bag, []).get(m.bag)).push(m);

let bags = [];
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
for (const raw of manufacturerBags) {
  /* Imperial in, metric derived, both kept. Done before anything else looks at
     the record, so no downstream step has to know which units it arrived in. */
  const record = convertUnits(raw);
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

/* BRAND-LEVEL DIMENSION POLICY.
 *
 * Travelpro's FAQ answers "do the listed dimensions include wheels and
 * handles?" for the whole brand: they publish both numbers and the overall one
 * includes wheels and carry handles. That settles every Travelpro bag at once,
 * and re-deriving it per product page is how one answer becomes forty
 * judgement calls.
 *
 * THE SAFETY RULE, which is Frank's caveat and is the whole reason this is not
 * a blanket flag: a brand policy says what the OVERALL figure includes. It says
 * nothing about whether WE captured the overall figure or the case figure. So
 * the policy is applied only where the stored figure is confirmably the
 * overall one — it is materially larger than the same record's own packing
 * figure. A record holding a single number with no sibling could be either,
 * and stays unflagged.
 *
 * Two Travelpro bags fail that test today (maxlite5-21, maxlite5-compact) and
 * are deliberately left alone. Applying the policy to them would be assuming
 * the answer to the exact question the caveat asks. */
const unwrapV = (f) => (f && typeof f === 'object' && 'v' in f ? f.v : null);
const policyPath = new URL('brand-dimension-policy.json', here);
const BRAND_POLICY = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath)).brands : {};
const POLICY_FIELDS = ['external_cm', 'external_in', 'claimed_cm', 'claimed_in'];

function applyBrandPolicy(record) {
  const policy = BRAND_POLICY[record.brand];
  if (!policy?.overall_includes_wheels) return record;

  const packing = unwrapV(record.claimed_packing_cm) ?? unwrapV(record.claimed_packing_in);
  if (!packing) return record; // cannot tell which figure we hold

  for (const key of POLICY_FIELDS) {
    const f = record[key];
    if (!f?.v || 'includes_wheels' in f) continue;
    /* Compare like with like: an inch field against an inch packing figure. */
    const sameUnit = key.endsWith('_in') ? unwrapV(record.claimed_packing_in) : packing;
    if (!sameUnit) continue;
    const biggest = Math.max(...f.v.map((v, i) => v - (sameUnit[i] ?? 0)));
    if (biggest < (key.endsWith('_in') ? 0.4 : 1)) continue; // same body — proves nothing

    f.includes_wheels = true;
    if (policy.overall_includes_handles) f.includes_handles = true;
    f.note = [
      f.note,
      `${record.brand} states brand-wide: "${policy.quote}" (${policy.source}). Confirmed as the overall figure here because it exceeds this record's own packing figure.`,
    ]
      .filter(Boolean)
      .join(' ');
  }
  return record;
}
for (const b of bags) applyBrandPolicy(b);

/* THE EXCLUSION REGISTER IS ENFORCED, NOT DECORATIVE.
 *
 * Two bags were removed because neither can ever be sourced: Amazon Basics is
 * an Amazon-owned brand and our own intake brief forbids marketplace sources,
 * and the Pacsafe ECONYL is discontinued with its URL redirecting to a
 * different product in a different material.
 *
 * Deleting them silently would leave nothing to stop the next intake pass
 * helpfully re-adding both and re-running the same dead end — with no record
 * anywhere of why they had gone. So the register carries the reason, and the
 * build refuses to emit anything on it. */
/* Kept OUTSIDE data/bags/ on purpose. A register of things that are not bags
   has no business in the directory every loader globs for bags — validate.mjs
   read it as a record and crashed on the first missing field.

   THE REGISTER FILTERS; IT DOES NOT SCOLD. The first version threw and told the
   operator to "remove them from the source data", which was wrong twice over.

   1. It aimed at the wrong file. The sources are FACTS — Travel + Leisure
      really did name that bag, and editing mentions.json to make the build pass
      would falsify a citation to express a decision about our catalogue. The
      register is where the decision belongs, so the register is what acts.

   2. It could not detect its own typo. The register keyed
      `amazon-21-expandable`; the catalogue slug was `amazon-21`. Nothing
      matched, so the guard passed — cleanly, silently, and vacuously — and an
      Amazon Basics bag with no dimensions at all stayed on the site after it
      had been excluded. A guard that only ever fires on a match cannot tell
      "nothing to exclude" from "excluding nothing".

   The check below is the load-bearing half. A register key must be a slug
   IDENTITY knows, because IDENTITY is the roster a future intake would re-add a
   bag FROM — an entry naming a slug that is not in it can never block anything,
   and is a typo or a stale rename wearing the costume of a decision.

   Deliberately NOT keyed on the bags produced this run: an exclusion that has
   already done its work removes nothing on every subsequent build, and that is
   success, not staleness. */
const excludedPath = new URL('excluded-bags.json', here);
const excluded = existsSync(excludedPath) ? JSON.parse(readFileSync(excludedPath)).bags : {};
const phantom = Object.keys(excluded).filter((slug) => !IDENTITY[slug]);
if (phantom.length) {
  throw new Error(
    `${phantom.length} entry/entries in excluded-bags.json name a slug bag-identity.mjs ` +
      `has never heard of:\n` +
      phantom.map((s) => `  ${s}`).join('\n') +
      '\nA register entry only blocks a bag it can name. Fix the slug, or delete ' +
      'the entry if the bag it referred to has been renamed away.'
  );
}
const dropped = bags.filter((b) => excluded[b.slug]);
for (const b of dropped) console.log(`excluded ${b.slug} — ${excluded[b.slug].reason}`);
bags = bags.filter((b) => !excluded[b.slug]);

/* Records for bags that have since been excluded would otherwise sit in
   data/bags/ forever, because the writer only ever writes and every loader
   globs the directory. */
for (const b of dropped) rmSync(new URL(`bags/${b.slug}.json`, here), { force: true });

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
