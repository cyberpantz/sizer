/* Unknown is not the same as banned.

   The original rule was "a fare with no cabin row means no cabin bag at any
   size" — the loudest claim this product makes. Safe while every record was
   placeholder; dangerous the moment a real audit began, because a
   half-researched carrier also has no cabin row.

   Telling a traveller their bag is banned when nobody has looked is a worse
   error than any dimension we could get wrong, and it is indistinguishable to
   them from a finding. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bag, carrier } from '../__fixtures__/catalogue.mjs';
import { bindingLeg, coverage, envelope, evaluate } from '../fit.mjs';
import { CABIN_ABSENCE, toCarrier } from '../normalize.mjs';

const base = {
  iata: 'XX',
  name: 'Test',
  strictness: { score: 5 },
  allowances: [{ type: 'cabin', fare_class: 'economy', max_cm: [55, 40, 20], max_kg: 10 }],
};
const b = bag('t', [50, 35, 20]);

describe('why a cabin row is missing', () => {
  test('an explicit not_permitted is a finding — the bag is banned', () => {
    const c = toCarrier(
      {
        ...base,
        allowances: [
          { type: 'cabin', fare_class: 'economy', max_cm: [55, 40, 20] },
          {
            type: 'personal',
            fare_class: 'basic',
            max_cm: [40, 30, 20],
            cabin_absence: CABIN_ABSENCE.NOT_PERMITTED,
          },
        ],
      },
      'basic'
    );
    assert.equal(c.no_cabin_bag, true);
    assert.equal(c.cabin_unknown, false);
    assert.equal(evaluate(b, c).band, 'wont');
  });

  test('a dedicated cabin absence row is resolved without inventing dimensions', () => {
    const c = toCarrier(
      {
        ...base,
        allowances: [
          {
            type: 'cabin',
            fare_class: 'basic',
            cabin_absence: CABIN_ABSENCE.NOT_PERMITTED,
          },
          { type: 'personal', fare_class: 'basic', max_cm: [40, 30, 20] },
        ],
      },
      'basic'
    );
    assert.equal(c.no_cabin_bag, true);
    assert.equal(c.allowance, null);
    assert.equal(evaluate(b, c).band, 'wont');
  });

  test('a fare nobody researched is UNKNOWN, not banned', () => {
    const c = toCarrier(base, 'flex');
    assert.equal(c.cabin_absence, CABIN_ABSENCE.NOT_RESEARCHED);
    assert.equal(c.no_cabin_bag, false, 'silence must never read as a ban');
    assert.equal(c.cabin_unknown, true);
  });

  test('an unknown allowance produces no verdict at all', () => {
    const r = evaluate(b, toCarrier(base, 'flex'));
    assert.equal(r.band, null, 'a guess here is indistinguishable from a finding');
    assert.equal(r.unknown, true);
    assert.equal(r.reason, CABIN_ABSENCE.NOT_RESEARCHED);
  });

  test('the reason travels, so the page can say which kind of gap it is', () => {
    for (const reason of Object.values(CABIN_ABSENCE)) {
      if (reason === CABIN_ABSENCE.NOT_PERMITTED) continue;
      const c = toCarrier({ ...base, cabin_absence: reason }, 'flex');
      assert.equal(evaluate(b, c).reason, reason);
    }
  });

  test('a researched fare is unaffected', () => {
    const r = evaluate(b, toCarrier(base, 'economy'));
    assert.ok(['clears', 'line'].includes(r.band));
    assert.equal(r.unknown, undefined);
  });
});

describe('unknowns leave the denominator', () => {
  const known = carrier('Known', 5, [55, 40, 20]);
  const unknown = {
    ...carrier('Unknown', 5, [55, 40, 20]),
    cabin_unknown: true,
    cabin_absence: 'not_researched',
    allowance: null,
  };

  test('coverage does not count an unresearched carrier as a pass or a fail', () => {
    const withU = coverage(b, [known, unknown]);
    const withoutU = coverage(b, [known]);
    assert.equal(withU.of, withoutU.of, '"41 of 58" must not include 6 nobody researched');
    assert.equal(withU.unknown, 1);
    assert.equal(withU.ratio, withoutU.ratio);
  });

  test('an unknown leg does not shrink the envelope', () => {
    const tight = { ...carrier('Tiny', 9, [40, 30, 15]), cabin_unknown: true, allowance: null };
    assert.deepEqual(envelope([known, tight]), envelope([known]));
  });

  test('but an unknown leg DOES decide the itinerary', () => {
    const { result } = bindingLeg(b, [known, unknown]);
    assert.equal(result.unknown, true, 'a trip is only as answerable as its least-known leg');
  });
});
