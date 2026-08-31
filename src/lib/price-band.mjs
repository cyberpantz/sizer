/* Budget · Midrange · Luxury — a band, never a price.

   THE BAND IS THE DURABLE FACT. A price fluctuates: sales, seasons, the same
   Rimowa at 20% off in November. A band does not. A $600 aluminium case on
   discount is still a luxury bag, and a reader filtering for "budget" is not
   asking today's number — they are asking what kind of bag this is. So we
   store the price, compute the band, and publish only the band.

   That is also what makes the staleness survivable. Publishing "$295" is a
   claim about today that rots the moment a sale starts, which is why the bag
   page has no price block (docs/23). Publishing "midrange" stays true across
   the whole sale.

   WHERE THE NUMBER MUST COME FROM, and this one is not a preference:

   Amazon's Associates operating agreement, §2(e), bars "aggregating,
   analyzing, extracting, or repurposing any Product Advertising Content"
   without written approval. Sorting a catalogue into price bands IS
   aggregation and analysis. Hiding the number does not cure it — the
   violation is in the analysis, not the display. So an Amazon price cannot
   feed this module even if it never reaches a page.

   A manufacturer's own listed price is not Amazon content and their agreement
   does not reach it. Same source ladder as dimensions, same reason, and it is
   the only ladder that makes this feature legal to build.

   TWO RULES IN THE MATHS:

   1. BUDGET IS FLOORED AT QUALITY, NOT AT A PRICE. Frank's rule: "budget
      starts with the cheapest bag that has decent reviews." A budget filter
      that surfaces the cheapest bag in the catalogue regardless of whether it
      is any good is a filter that recommends junk. So a bag nobody has
      reviewed is not the bottom of the budget band; it is outside the bands
      entirely, and shows up only under "Everything".

   2. LUXURY HAS NO MAX. The top band is open-ended by construction. */

/** Bands, cheapest first. `id` is what the DOM carries. */
export const BANDS = [
  { id: 'budget', label: 'Budget' },
  { id: 'midrange', label: 'Midrange' },
  { id: 'luxury', label: 'Luxury' },
];

export const BAND_IDS = BANDS.map((b) => b.id);

/** The price, in USD, or null. Accepts the provenanced shape used everywhere
 *  else in the catalogue ({ v, src, ref, at }) and a bare number. */
export function priceOf(record) {
  const p = record?.price_usd;
  const v = typeof p === 'object' && p !== null ? p.v : p;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

/* "Decent reviews" — the quality floor.
 *
 * Deliberately the weakest defensible test: at least one real review from a
 * publication we cite. Not a score threshold, because most of our reviews
 * carry no score (`rolling_score` is null on nearly all of them) and inventing
 * one would be exactly the fabrication this project exists to avoid.
 *
 * So this excludes the unreviewed, not the badly reviewed. That is a narrower
 * claim than "decent", and it is the one the data supports. */
export function hasDecentReviews(record) {
  return (record?.reviews ?? []).some((r) => r?.publication);
}

/** Bags eligible to be banded at all: priced AND reviewed. */
export const bandable = (records) =>
  records.filter((r) => priceOf(r) !== null && hasDecentReviews(r));

/* Tercile cut points over the bandable catalogue.
 *
 * Frank chose terciles over fixed dollar cuts, which buys balanced bands that
 * grow with the catalogue at the cost of a bag being able to change band when
 * we add bags around it. That trade is right while the catalogue is 61 bags
 * and moving; it would be wrong at 600 and stable, where a reader might
 * remember what band something was in. Worth revisiting then, not now.
 *
 * Returns [lowCut, highCut] as prices, or null when there is too little data
 * to cut — fewer than one bag per band means the bands are noise. */
export function cutPoints(records) {
  const prices = bandable(records)
    .map(priceOf)
    .sort((a, b) => a - b);
  if (prices.length < BANDS.length) return null;

  /* Nearest-rank at 1/3 and 2/3. Index arithmetic rather than interpolation:
     a cut point that lands between two real prices is not more accurate, and
     an actual catalogue price is easier to reason about when a band boundary
     is questioned. */
  const at = (f) => prices[Math.min(prices.length - 1, Math.floor(prices.length * f))];
  return [at(1 / 3), at(2 / 3)];
}

/**
 * The band for one record, given the cuts. Null when the bag is unpriced,
 * unreviewed, or the catalogue cannot be cut.
 *
 * Null is a real answer and must not collapse to "budget": an unpriced bag is
 * not a cheap bag, exactly as an unscored airline is not a lenient one.
 */
export function bandOf(record, cuts) {
  if (!cuts) return null;
  if (!hasDecentReviews(record)) return null;
  const p = priceOf(record);
  if (p === null) return null;
  const [low, high] = cuts;
  if (p < low) return 'budget';
  if (p < high) return 'midrange';
  return 'luxury';
}

/**
 * Band every record in one pass. Returns { bands: Map(slug -> band|null),
 * counts, cuts, priced } — `counts` drives whether a pill renders at all, and
 * `priced` lets a caller say honestly how much of the catalogue is banded.
 */
export function bandAll(records) {
  const cuts = cutPoints(records);
  const bands = new Map();
  const counts = Object.fromEntries(BAND_IDS.map((id) => [id, 0]));
  for (const r of records) {
    const band = bandOf(r, cuts);
    bands.set(r.slug, band);
    if (band) counts[band] += 1;
  }
  return { bands, counts, cuts, priced: bandable(records).length, of: records.length };
}
