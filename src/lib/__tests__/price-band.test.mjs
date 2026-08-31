/* Budget · Midrange · Luxury.
 *
 * The failure that matters most here is silent: an unpriced bag falling into
 * "budget". Nothing throws, the filter looks like it works, and the cheapest
 * band quietly fills with bags whose price nobody knows — which is the same
 * error as an unscored airline rendering as a lenient one. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bandAll, bandOf, cutPoints, hasDecentReviews, priceOf } from '../price-band.mjs';

const reviewed = [{ publication: 'Travel + Leisure', url: 'https://example.test' }];
const bag = (slug, price, reviews = reviewed) => ({
  slug,
  reviews,
  ...(price == null ? {} : { price_usd: { v: price, src: 'manufacturer', at: '2026-08-31' } }),
});

/* Nine priced bags, evenly spread, so the terciles are unambiguous. */
const NINE = [100, 150, 200, 250, 300, 400, 500, 700, 1200].map((p, i) => bag(`b${i}`, p));

describe('priceOf', () => {
  test('reads the provenanced shape and a bare number alike', () => {
    assert.equal(priceOf({ price_usd: { v: 295 } }), 295);
    assert.equal(priceOf({ price_usd: 295 }), 295);
  });

  test('rejects anything that is not a usable price', () => {
    for (const v of [null, undefined, 0, -10, Number.NaN, '295', {}]) {
      assert.equal(priceOf({ price_usd: v }), null, `${JSON.stringify(v)} should not be a price`);
    }
    assert.equal(priceOf({}), null);
    assert.equal(priceOf(null), null);
  });
});

describe('the quality floor', () => {
  test('"decent reviews" means a review from a named publication', () => {
    assert.equal(hasDecentReviews({ reviews: reviewed }), true);
    assert.equal(hasDecentReviews({ reviews: [] }), false);
    assert.equal(hasDecentReviews({}), false);
    /* A review row with no publication is not a citation. */
    assert.equal(hasDecentReviews({ reviews: [{ url: 'https://x.test' }] }), false);
  });

  test('an unreviewed bag gets NO band, however cheap it is', () => {
    /* Frank's rule: "budget starts with the cheapest bag that has decent
       reviews." A budget filter that surfaces the cheapest thing in the
       catalogue regardless of quality recommends junk. */
    const cuts = cutPoints(NINE);
    assert.equal(bandOf(bag('junk', 5, []), cuts), null);
    assert.equal(bandOf(bag('cheap-but-good', 100), cuts), 'budget');
  });
});

describe('the cuts', () => {
  test('terciles split the priced catalogue three ways', () => {
    const cuts = cutPoints(NINE);
    const bands = NINE.map((b) => bandOf(b, cuts));
    const n = (id) => bands.filter((x) => x === id).length;
    assert.equal(n('budget'), 3, `budget got ${n('budget')} of 9`);
    assert.equal(n('midrange'), 3, `midrange got ${n('midrange')} of 9`);
    assert.equal(n('luxury'), 3, `luxury got ${n('luxury')} of 9`);
  });

  test('luxury has no upper bound', () => {
    const cuts = cutPoints(NINE);
    assert.equal(bandOf(bag('absurd', 100000), cuts), 'luxury');
  });

  test('unpriced bags do not move the cuts', () => {
    /* An unpriced bag counted as 0 would drag both cut points down and
       silently reband the catalogue. */
    const withGaps = [...NINE, bag('u1', null), bag('u2', null), bag('u3', null)];
    assert.deepEqual(cutPoints(withGaps), cutPoints(NINE));
  });

  test('too few priced bags means no bands at all', () => {
    /* Two bags cannot be cut into three meaningful bands. Better to render no
       filter than one that calls the cheaper of two bags "budget". */
    assert.equal(cutPoints([bag('a', 100), bag('b', 200)]), null);
    assert.equal(bandOf(bag('a', 100), null), null);
  });
});

describe('bandOf never guesses', () => {
  test('an unpriced bag is not a cheap bag', () => {
    const cuts = cutPoints(NINE);
    assert.equal(
      bandOf(bag('unpriced', null), cuts),
      null,
      'an unpriced bag fell into a band — it must be excluded, not assumed cheap'
    );
  });
});

describe('bandAll', () => {
  test('reports how much of the catalogue it could band', () => {
    const records = [...NINE, bag('unpriced', null), bag('unreviewed', 250, [])];
    const { counts, priced, of, bands } = bandAll(records);
    assert.equal(of, 11);
    assert.equal(priced, 9, 'only the priced AND reviewed bags are bandable');
    assert.equal(counts.budget + counts.midrange + counts.luxury, 9);
    assert.equal(bands.get('unpriced'), null);
    assert.equal(bands.get('unreviewed'), null);
  });

  test('an empty catalogue produces no bands and does not throw', () => {
    const { counts, cuts } = bandAll([]);
    assert.equal(cuts, null);
    assert.deepEqual(counts, { budget: 0, midrange: 0, luxury: 0 });
  });
});

describe('the real catalogue', () => {
  test('bands stay hidden until enough researched prices exist', async () => {
    const { loadBags } = await import('../data.mjs');
    const records = (await loadBags()).map((b) => b.record);
    const { priced, counts, cuts } = bandAll(records);
    if (priced < 3) {
      assert.equal(cuts, null);
      assert.deepEqual(counts, { budget: 0, midrange: 0, luxury: 0 });
    } else {
      assert.ok(cuts);
      assert.equal(counts.budget + counts.midrange + counts.luxury, priced);
    }
  });
});
