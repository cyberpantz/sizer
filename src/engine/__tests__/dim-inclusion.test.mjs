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

  test('the old inference still stands where no flag was set', () => {
    /* A maker publishing a separate packing figure alongside an exterior one
       is distinguishing the two. Kept so the change adds a rule rather than
       replacing one and silently demoting records nobody re-read. */
    const r = rec({
      external_cm: dim([56, 40, 23]),
      claimed_packing_cm: dim([52, 37, 20]),
    });
    assert.equal(dimSourceOf(r), DIM_SOURCE.MAKER_OVERALL);
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

describe('the real catalogue', () => {
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
       reasoned about. Every promotable bag must reach that rung through a
       stated inclusion, a separate packing figure, or our own tape measure. */
    const { loadBags } = await import('../../lib/data.mjs');
    const offenders = [];
    for (const b of await loadBags()) {
      if (!isPromotable(b)) continue;
      const r = b.record;
      const field = r.external_cm?.v ? r.external_cm : r.claimed_cm;
      const stated = field?.includes_wheels === true;
      const hasPacking = Boolean(r.claimed_packing_cm?.v && r.external_cm?.v);
      const measured = Boolean(r.measured_cm?.v);
      if (!stated && !hasPacking && !measured) offenders.push(b.slug);
    }
    assert.deepEqual(
      offenders,
      [],
      `promotable on an unlabelled figure:\n  ${offenders.join('\n  ')}`
    );
  });
});
