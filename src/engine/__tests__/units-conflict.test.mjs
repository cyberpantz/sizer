/* Carriers publish inches and centimetres that disagree with each other.

   United's carry-on is "22 x 14 x 9 in (56 x 35 x 23 cm)". 14 in is 35.56 cm,
   not 35. A 35.5 cm bag passes the inch limit and fails the published cm limit,
   same page, same airline. Both numbers are theirs; the difference exceeds our
   own EPS_CM of 0.3, so it cannot be waved off as rounding. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bag } from '../__fixtures__/catalogue.mjs';
import { evaluate } from '../fit.mjs';
import { reconcileUnits, toCarrier } from '../normalize.mjs';

const UNITED = {
  iata: 'UA',
  name: 'United',
  strictness: { score: 6 },
  allowances: [
    {
      type: 'cabin',
      fare_class: 'economy',
      cabin_class: 'economy',
      max_cm: [56, 35, 23],
      max_in: [22, 14, 9],
    },
  ],
};

describe('reconciling two published units', () => {
  test('takes the stricter figure on each axis, not one unit wholesale', () => {
    const u = reconcileUnits([56, 35, 23], [22, 14, 9]);
    assert.deepEqual(
      u.cm,
      [55.88, 35, 22.86],
      'inches are tighter on length and depth, cm is tighter on width'
    );
  });

  test('flags the contradiction rather than silently picking one', () => {
    assert.equal(reconcileUnits([56, 35, 23], [22, 14, 9]).conflict, true);
  });

  test('agreement is not flagged', () => {
    const u = reconcileUnits([55.9, 35.6, 22.9], [22, 14, 9]);
    assert.equal(u.conflict, false);
    assert.equal(u.from, 'agreed');
  });

  test('keeps both published figures so a page can show the airline its own numbers', () => {
    const u = reconcileUnits([56, 35, 23], [22, 14, 9]);
    assert.deepEqual(u.published_cm, [56, 35, 23]);
    assert.deepEqual(u.published_in, [22, 14, 9]);
    assert.deepEqual(u.diff_cm, [-0.12, 0.56, -0.14]);
  });

  test('one unit alone is used as given', () => {
    assert.deepEqual(reconcileUnits([55, 40, 20], null).cm, [55, 40, 20]);
    assert.deepEqual(reconcileUnits(null, [22, 14, 9]).cm, [55.88, 35.56, 22.86]);
    assert.equal(reconcileUnits(null, null), null);
  });
});

describe('the bag that sits in the gap', () => {
  /* 35.5 cm wide: inside 35.56 (their inches), outside 35 (their cm). */
  const borderline = bag('borderline', [55, 35.5, 22]);

  test('is refused, because we compare against the stricter figure', () => {
    const r = evaluate(borderline, toCarrier(UNITED, 'economy'));
    assert.ok(r.delta_cm > 0, 'being wrong toward caution costs convenience, not a gate fee');
  });

  test('and the page can still show why the answer is arguable', () => {
    const c = toCarrier(UNITED, 'economy');
    assert.equal(c.allowance.units.conflict, true);
    assert.deepEqual(c.allowance.units.published_in, [22, 14, 9]);
  });
});
