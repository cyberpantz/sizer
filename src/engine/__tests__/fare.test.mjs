/* Fares: three axes, previously one string.

   Across 58 carriers the `fare_class` field held cabin classes (economy,
   business), fare brands (basic, flex, max, plus, comfort_flex, family) and a
   paid add-on (priority). Ryanair Priority is €6 on top of a Basic fare, and it
   is the difference between "no cabin bag at any size" and 55×40×20 — the
   highest-value distinction in the product. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bag } from '../__fixtures__/catalogue.mjs';
import { evaluate } from '../fit.mjs';
import { CABIN_ABSENCE, resolveFare, toCarrier } from '../normalize.mjs';

/* Ryanair as it actually works: a Basic fare permits no cabin bag; €6 Priority
   adds one. Same ticket, same passenger, opposite answers. */
const RYANAIR = {
  iata: 'FR',
  name: 'Ryanair',
  strictness: { score: 9 },
  allowances: [
    {
      type: 'personal',
      fare_class: 'basic',
      cabin_class: 'economy',
      max_cm: [40, 25, 20],
      cabin_absence: CABIN_ABSENCE.NOT_PERMITTED,
    },
    {
      type: 'cabin',
      fare_class: 'priority',
      addon: 'priority',
      cabin_class: 'economy',
      max_cm: [55, 40, 20],
      max_kg: 10,
    },
  ],
};
const b = bag('roller', [54, 39, 20]);

describe('an add-on changes the verdict', () => {
  test('Basic permits no cabin bag at any size', () => {
    const c = toCarrier(RYANAIR, { class: 'economy', fare: 'basic' });
    assert.equal(c.no_cabin_bag, true);
    assert.equal(evaluate(b, c).band, 'wont');
  });

  test('the same booking plus Priority clears', () => {
    const c = toCarrier(RYANAIR, { class: 'economy', fare: 'basic', addons: ['priority'] });
    assert.notEqual(c.allowance, null);
    assert.notEqual(evaluate(b, c).band, 'wont', '€6 is the whole difference');
  });

  test('an add-on beats the fare it was bought on top of', () => {
    const r = resolveFare(RYANAIR, { fare: 'basic', addons: ['priority'] });
    assert.equal(r.matched, 'addon');
  });
});

describe('resolution order', () => {
  const CARRIER = {
    iata: 'XX',
    name: 'T',
    strictness: { score: 5 },
    allowances: [
      { type: 'cabin', cabin_class: 'economy', max_cm: [56, 36, 23] },
      { type: 'cabin', fare_class: 'flex', cabin_class: 'economy', max_cm: [56, 40, 25] },
      { type: 'cabin', fare_class: 'priority', addon: 'priority', max_cm: [60, 45, 25] },
    ],
  };

  test('addon > fare > class', () => {
    assert.equal(resolveFare(CARRIER, { class: 'economy' }).matched, 'class');
    assert.equal(resolveFare(CARRIER, { class: 'economy', fare: 'flex' }).matched, 'fare');
    assert.equal(
      resolveFare(CARRIER, { class: 'economy', fare: 'flex', addons: ['priority'] }).matched,
      'addon'
    );
  });

  test('the matched axis is reported, so a page can say how sure it is', () => {
    assert.equal(toCarrier(CARRIER, { class: 'economy' }).matched_on, 'class');
  });

  test('a bare string still works — legacy callers are not broken', () => {
    assert.equal(resolveFare(CARRIER, 'flex').matched, 'fare');
  });
});

describe('undefined never matches', () => {
  /* `a.cabin_class === b.class` was `undefined === undefined` and matched the
     first row in the file. Third occurrence of that shape today, after
     gambleCeiling(null) and the missing cabin row. */
  const SPARSE = {
    iata: 'YY',
    name: 'T',
    strictness: { score: 5 },
    allowances: [{ type: 'cabin', fare_class: 'economy', max_cm: [55, 40, 20] }],
  };

  test('an unrelated fare does not silently match a row with no class', () => {
    const r = resolveFare(SPARSE, 'flex');
    assert.equal(r.row, null, 'asking for "flex" must not return the economy row');
    assert.equal(r.matched, null);
  });

  test('and the carrier therefore reads as unknown, not as permitted', () => {
    const c = toCarrier(SPARSE, 'flex');
    assert.equal(c.cabin_unknown, true);
    assert.equal(c.cabin_absence, CABIN_ABSENCE.NOT_RESEARCHED);
  });

  test('an empty booking matches nothing rather than everything', () => {
    assert.equal(resolveFare(SPARSE, {}).row, null);
    assert.equal(resolveFare(SPARSE, undefined).row, null);
  });
});

describe('add-on rows are opt-in', () => {
  /* A Ryanair Basic booking matched the Priority row through cabin_class and we
     told a passenger with no cabin allowance that their bag was fine. Wrong in
     the most expensive direction there is. */
  test('a fare cannot inherit an allowance that costs extra', () => {
    const c = toCarrier(RYANAIR, { class: 'economy', fare: 'basic' });
    assert.equal(c.allowance, null, 'Basic must not reach the Priority row');
    assert.equal(c.no_cabin_bag, true);
  });

  test('nor by cabin class alone', () => {
    assert.equal(resolveFare(RYANAIR, { class: 'economy' }).row, null);
  });

  test('buying it makes it reachable', () => {
    assert.notEqual(resolveFare(RYANAIR, { class: 'economy', addons: ['priority'] }).row, null);
  });
});
