/* The release gate, after the plan changed.

   The original gate was "no bag is promoted unless WE measured it". That was
   load-bearing across the tier table, the moat argument and the front page —
   and it was never going to happen. Getting hold of 100 suitcases to put a tape
   on them is not a plan.

   The replacement is narrower and achievable: **the manufacturer's own overall
   figure, never a reseller's.** The distinction that matters was never who held
   the tape, it is WHICH FIGURE — overall, wheels and handle included, is the
   one an airline checks. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadBags } from '../../lib/data.mjs';
import { DIM_SOURCE, dimSourceOf, isPromotable } from '../normalize.mjs';

const withSource = (src) => ({ dim_source: src });

describe('what may be recommended', () => {
  test("the manufacturer's own overall figure is promotable", () => {
    assert.equal(isPromotable(withSource(DIM_SOURCE.MAKER_OVERALL)), true);
  });

  test('our own measurement still is, if it ever exists', () => {
    assert.equal(isPromotable(withSource(DIM_SOURCE.MEASURED)), true);
  });

  test('a reseller listing never is', () => {
    assert.equal(isPromotable(withSource(DIM_SOURCE.RESELLER)), false);
  });

  test('an unspecified manufacturer figure is not — it is probably the packing size', () => {
    assert.equal(isPromotable(withSource(DIM_SOURCE.MAKER_UNSPECIFIED)), false);
  });

  test('a packing figure never is, however well sourced', () => {
    assert.equal(isPromotable(withSource(DIM_SOURCE.MAKER_PACKING)), false);
  });

  test('a review measurement is displayable but not promotable', () => {
    /* Attributed and useful. Their method is rarely stated, and it is not the
       maker's own number, so it does not carry a recommendation. */
    assert.equal(isPromotable(withSource(DIM_SOURCE.REVIEW)), false);
  });

  test('an unknown or missing source is not promotable', () => {
    assert.equal(isPromotable({}), false);
    assert.equal(isPromotable(null), false);
  });
});

describe('inference is conservative', () => {
  test('both figures published means the maker gave an overall one', () => {
    assert.equal(
      dimSourceOf({ claimed_packing_cm: { v: [50, 35, 20] }, external_cm: { v: [55, 35, 22] } }),
      DIM_SOURCE.MAKER_OVERALL
    );
  });

  test('a lone figure is unspecified, not assumed to be overall', () => {
    assert.equal(dimSourceOf({ claimed_cm: { v: [55, 40, 20] } }), DIM_SOURCE.MAKER_UNSPECIFIED);
  });

  test('a review-sourced dimension is labelled as one', () => {
    assert.equal(
      dimSourceOf({ external_cm: { v: [55, 40, 20], src: 'review' } }),
      DIM_SOURCE.REVIEW
    );
  });

  test('an explicit dim_source always wins over inference', () => {
    assert.equal(
      dimSourceOf({
        dim_source: DIM_SOURCE.RESELLER,
        claimed_packing_cm: { v: [1, 1, 1] },
        external_cm: { v: [2, 2, 2] },
      }),
      DIM_SOURCE.RESELLER
    );
  });
});

describe('against the real catalogue', () => {
  test('the gate is reachable — promotable is not zero', async () => {
    const bags = await loadBags();
    const n = bags.filter(isPromotable).length;
    assert.ok(
      n > 0,
      'a gate nothing can pass blocks the product forever, which is what the measure-it-ourselves plan did'
    );
  });

  test('no reseller-sourced dimension is in the catalogue at all', async () => {
    for (const b of await loadBags()) {
      assert.notEqual(b.dim_source, DIM_SOURCE.RESELLER, `${b.slug} came from a reseller`);
    }
  });
});
