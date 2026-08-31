/* Which figure is it? Wheels decide. Handles do not.
 *
 * The rung used to be INFERRED: a record counted as the maker's overall figure
 * only if it also carried a separate packing figure, on the theory that a
 * manufacturer publishing both must mean the other one is the outside.
 *
 * That proxy left 20 well-researched bags unrecommendable — July, Quince,
 * Bellroy, Calpak, Solgaard, Away Flex — where the page said in plain words
 * "External dimensions including wheels". Every intake note gave the same
 * reason: wheels explicitly included, HANDLES not explicitly confirmed.
 *
 * Handles are not a real doubt about which figure it is. A telescoping handle
 * is retracted when a bag is measured or dropped in a sizer, and the
 * packing-to-overall gap is driven overwhelmingly by wheels. A page stating
 * "external dimensions" that excluded a permanent part of the bag would be
 * misstating them.
 *
 * So the standard is one rule in one place, applied to a flag somebody set
 * from the manufacturer's own quoted words — rather than 54 judgement calls
 * made in prose and impossible to re-audit. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DIM_SOURCE, dimSourceOf, isPromotable, toBag } from '../normalize.mjs';

const dim = (v, extra = {}) => ({ v, src: 'manufacturer', at: '2026-08-31', ...extra });
const rec = (fields) => ({
  slug: 'x',
  brand: 'B',
  model: 'M',
  type: 'hardside spinner',
  ...fields,
});

describe('wheels decide the rung', () => {
  test('wheels stated included is the overall figure, whatever the field is called', () => {
    /* July publishes "External dimensions including wheels" and the intake
       filed it as claimed_cm out of caution about handles. The flag is what
       matters, not which field name it landed in. */
    const r = rec({ claimed_cm: dim([56, 40, 23], { includes_wheels: true }) });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_OVERALL);
    assert.equal(isPromotable(toBag(r)), true, 'a stated-with-wheels figure must be recommendable');
  });

  test('handles being unstated does not demote it', () => {
    /* The exact shape of all ten records: wheels yes, handles silent. */
    const r = rec({ claimed_cm: dim([56, 40, 23], { includes_wheels: true }) });
    const alsoHandles = rec({
      claimed_cm: dim([56, 40, 23], { includes_wheels: true, includes_handles: true }),
    });
    assert.equal(dimSourceOf(r), dimSourceOf(alsoHandles));
  });

  test('a figure stated to EXCLUDE wheels is the packing body', () => {
    /* Not silence — a statement. Whatever the label calls it, a figure the
       maker says leaves the wheels out is not what an airline measures. */
    const r = rec({ claimed_cm: dim([54, 38, 21], { includes_wheels: false }) });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_PACKING);
    assert.equal(isPromotable(toBag(r)), false);
  });

  test('silence is still unspecified — the flag is never inferred', () => {
    /* The failure this whole change exists to avoid: guessing from prose. An
       unqualified "Dimensions" stays exactly where it was. */
    const r = rec({ claimed_cm: dim([56, 40, 23]) });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_UNSPECIFIED);
    assert.equal(isPromotable(toBag(r)), false);
  });

  test("a figure much bigger than the maker's OWN packing figure is the exterior", () => {
    /* The ladder assumes an unlabelled maker figure is "probably the packing
       body, which runs small". Where a maker publishes both, that is checkable
       — and false every time it can be checked: the unlabelled figure runs
       3.2 to 6.4 cm larger on all five bags carrying the pair. That gap is the
       wheels.
       Evidence from inside one manufacturer's page, so it does not lean on a
       review measurement, which here is usually the spec sheet quoted back. */
    const r = rec({
      claimed_cm: dim([56, 40, 23]),
      claimed_packing_cm: dim([52, 37, 20]),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_OVERALL);
  });

  test('a figure the SAME size as the packing figure proves nothing', () => {
    /* The rule has to compare values, not merely notice that a packing figure
       exists — which is all the old one did. Two figures within rounding of
       each other are the same body, and the label still tells us nothing. */
    const r = rec({
      claimed_cm: dim([52.1, 37, 20]),
      claimed_packing_cm: dim([52, 37, 20]),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_UNSPECIFIED);
  });

  test('a review measurement outranks nothing — the flag cannot promote it', () => {
    /* includes_wheels describes the figure, not who produced it. A review that
       measured with wheels on is still a review. */
    const r = rec({
      external_cm: { v: [56, 40, 23], src: 'review', includes_wheels: true },
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.REVIEW);
    assert.equal(isPromotable(toBag(r)), false);
  });

  test('an explicit dim_source on the record still wins', () => {
    const r = rec({
      dim_source: DIM_SOURCE.RESELLER,
      claimed_cm: dim([56, 40, 23], { includes_wheels: true }),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.RESELLER);
  });
});

describe('the ladder ranks sources, not field names', () => {
  /* THE BUG FRANK FOUND BY READING A NUMBER ON THE PAGE.
   *
   * "22 of 61 bags carry the manufacturer's own overall dimensions" looked far
   * too low against 54 researched records, and it was — but not because the
   * count was miscomputed. 19 bags held a stale review measurement in
   * `external_cm` and the maker's own figure in `claimed_cm`, because the
   * intake correctly files an unlabelled figure as "claimed".
   *
   * toBag took `measured ?? external ?? claimed` and dimSourceOf tested
   * `external_cm.src === 'review'` first. Both picked by WHICH FIELD held the
   * number. So the site compared a review publication's measurement against
   * airline limits, left the manufacturer's number unused one field away, and
   * told the reader the bag rested on a review.
   *
   * docs/19 always said: measured > maker_overall > review > maker_unspecified
   * > maker_packing. It just was not implemented. */
  test('a maker figure in claimed_cm beats a review figure in external_cm', () => {
    const r = rec({
      external_cm: { v: [56, 40, 23], src: 'review' },
      claimed_cm: dim([55, 39, 22], { includes_wheels: true }),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_OVERALL);
    assert.deepEqual(
      toBag(r).external_cm,
      [55, 39, 22],
      'the review number is still the one being compared against airline limits'
    );
  });

  test('an UNLABELLED maker figure still loses to a review', () => {
    /* The other half of the ladder, and it must not move: maker_unspecified
       sits BELOW review, because an unlabelled figure is probably the packing
       body and a publication at least measured the outside. */
    const r = rec({
      external_cm: { v: [56, 40, 23], src: 'review' },
      claimed_cm: dim([55, 39, 22]),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.REVIEW);
    assert.deepEqual(toBag(r).external_cm, [56, 40, 23]);
  });

  test('our own measurement outranks everything', () => {
    const r = rec({
      measured_cm: dim([54, 38, 21]),
      external_cm: dim([56, 40, 23], { includes_wheels: true }),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MEASURED);
    assert.deepEqual(toBag(r).external_cm, [54, 38, 21]);
  });

  test('a packing figure is never chosen while anything else exists', () => {
    const r = rec({
      claimed_packing_cm: dim([50, 36, 19]),
      claimed_cm: dim([55, 39, 22]),
    });
    assert.notEqual(dimSourceOf(r), DIM_SOURCE.MAKER_PACKING);
    assert.deepEqual(toBag(r).external_cm, [55, 39, 22]);
  });

  test('provenance describes the figure actually used', () => {
    /* It used to report `measured ?? external ?? claimed` independently of
       which value won, so a bag could show the review's attribution beside the
       manufacturer's number. */
    const r = rec({
      external_cm: { v: [56, 40, 23], src: 'review', ref: 'tl-carryon' },
      claimed_cm: dim([55, 39, 22], { includes_wheels: true, ref: 'https://maker.test' }),
    });
    assert.equal(toBag(r).provenance.src, 'manufacturer');
    assert.equal(toBag(r).provenance.ref, 'https://maker.test');
  });
});

describe('the real catalogue', () => {
  test('no bag ignores a better figure it already holds', async () => {
    /* The whole-catalogue form of the bug. For every bag, the figure being
       compared against airline limits must be the best-ranked one on the
       record — never merely the first field that held a number. */
    const { loadBags } = await import('../../lib/data.mjs');
    const { rankedDimensions } = await import('../normalize.mjs');
    const offenders = [];
    for (const b of await loadBags()) {
      const best = rankedDimensions(b.record)[0];
      if (!best) continue;
      const used = JSON.stringify(b.external_cm);
      const want = JSON.stringify(best.field.v ?? best.field);
      if (used !== want) offenders.push(`${b.slug}: uses ${used}, best is ${best.key} ${want}`);
    }
    assert.deepEqual(offenders, [], `a better figure was ignored:\n  ${offenders.join('\n  ')}`);
  });

  test('every flagged record carries the manufacturer quote that justifies it', async () => {
    /* The flag is a claim about what a page says. If it cannot be walked back
       to the words on that page, it is our opinion wearing a boolean. */
    const { readFileSync } = await import('node:fs');
    const src = JSON.parse(readFileSync('data/manufacturer-bags.json', 'utf8')).bags;
    const missing = [];
    for (const m of src) {
      for (const key of ['external_cm', 'external_in', 'claimed_cm', 'claimed_in']) {
        const f = m[key];
        if (!f || f.includes_wheels !== true) continue;
        if (!f.quote || !/wheel/i.test(f.quote)) {
          missing.push(`${m.slug}.${key}: includes_wheels=true but quote is "${f.quote ?? ''}"`);
        }
      }
    }
    assert.deepEqual(
      missing,
      [],
      `includes_wheels set without a quote that says so:\n  ${missing.join('\n  ')}`
    );
  });

  test('no bag is recommendable on a figure nobody labelled', async () => {
    /* The release gate, checked against the whole catalogue rather than
       reasoned about. There are exactly THREE ways onto the recommendable
       rung, and a bag reaching it by any other route is a bug:
         1. we measured it ourselves
         2. the maker states wheels are included
         3. the figure is materially bigger than the maker's OWN packing
            figure, so it is the exterior whatever the label omits
       Nothing else. In particular, not "a packing figure exists" — the old
       version of this test accepted mere presence, which is what let an
       unlabelled figure through without comparing the values. */
    const { loadBags } = await import('../../lib/data.mjs');
    const { rankedDimensions } = await import('../normalize.mjs');
    const offenders = [];
    for (const b of await loadBags()) {
      if (!isPromotable(b)) continue;
      const r = b.record;
      const best = rankedDimensions(r)[0];
      const measured = best?.key === 'measured_cm';
      const stated = best?.field?.includes_wheels === true;
      const packing = r.claimed_packing_cm?.v;
      const gapProven =
        Boolean(packing && best?.field?.v) &&
        Math.max(...best.field.v.map((v, i) => v - (packing[i] ?? 0))) >= 1;
      if (!measured && !stated && !gapProven) offenders.push(`${b.slug} (${best?.key})`);
    }
    assert.deepEqual(
      offenders,
      [],
      `promotable on an unlabelled figure:\n  ${offenders.join('\n  ')}`
    );
  });
});
