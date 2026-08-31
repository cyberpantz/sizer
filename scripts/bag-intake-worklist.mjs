#!/usr/bin/env node
/* What still needs a trip to the manufacturer's product page.
 *
 * The carrier brief carries a hand-typed table of airlines and it has already
 * drifted once — records got filled in and the table still called them
 * pending. A worklist is a fact about the dataset, so it should be computed
 * from the dataset. Run this, paste the output, or just read it.
 *
 *   node scripts/bag-intake-worklist.mjs          # human-readable
 *   node scripts/bag-intake-worklist.mjs --json   # for tooling
 *
 * Three tiers, and the ordering is the point:
 *
 *   P1  no dimensions at all — the bag is INVISIBLE on the site. It has no
 *       card, no detail page, and cannot be an answer to anything. This is
 *       where Away, Rimowa, Monos and July currently sit, which is to say the
 *       bags people actually search for.
 *   P2  review-sourced dimensions — the bag is shown but NOT recommendable
 *       (isPromotable() refuses it), so it can never be offered as an
 *       alternative to a bag that failed.
 *   P3  manufacturer dimensions already — needs price only.
 */
import { readdirSync, readFileSync } from 'node:fs';

const bags = readdirSync('data/bags')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/bags/${f}`, 'utf8')));

const sized = (b) => Boolean(b.external_cm || b.measured_cm);
const dimSrc = (b) => b.external_cm?.src ?? null;
const priced = (b) => b.price_usd != null;

/* Brands whose absence costs the most. Not a ranking of quality — a ranking of
   how often the name is typed into a search box, which is what decides whether
   a missing record costs us a reader. Hand-kept and openly a judgement. */
const MARQUEE = new Set(['Away', 'Rimowa', 'Monos', 'July', 'Béis', 'Peak Design', 'Tumi']);

const tierOf = (b) => (!sized(b) ? 'P1' : dimSrc(b) !== 'manufacturer' ? 'P2' : 'P3');

const rows = bags
  .map((b) => ({
    tier: tierOf(b),
    slug: b.slug,
    brand: b.brand,
    model: b.model,
    marquee: MARQUEE.has(b.brand),
    needs: [
      !sized(b) ? 'dimensions' : dimSrc(b) !== 'manufacturer' ? 'dimensions (upgrade)' : null,
      !priced(b) ? 'price' : null,
    ].filter(Boolean),
    /* A review URL is not a source for a dimension, but it is often the
       fastest way to identify the exact variant before finding the maker's
       page — the model names in review round-ups are frequently loose. */
    hint: b.reviews?.[0]?.url ?? null,
  }))
  .filter((r) => r.needs.length)
  .sort(
    (a, b) =>
      a.tier.localeCompare(b.tier) ||
      Number(b.marquee) - Number(a.marquee) ||
      a.brand.localeCompare(b.brand)
  );

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

const LEGEND = {
  P1: 'NO DIMENSIONS — invisible on the site today',
  P2: 'review-sourced — shown, but never recommendable',
  P3: 'manufacturer dimensions already — price only',
};

console.log(`\n${bags.length} bags. ${rows.length} still need something.\n`);
for (const tier of ['P1', 'P2', 'P3']) {
  const group = rows.filter((r) => r.tier === tier);
  if (!group.length) continue;
  console.log(`\n${tier} · ${LEGEND[tier]} · ${group.length} bags`);
  console.log('─'.repeat(74));
  for (const r of group) {
    const star = r.marquee ? '★ ' : '  ';
    console.log(`${star}${r.brand} ${r.model}`);
    console.log(`    ${r.slug}  —  needs ${r.needs.join(' + ')}`);
  }
}
console.log('\n★ = high search demand; do these first within their tier.\n');
