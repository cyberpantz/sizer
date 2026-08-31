/* Allowances that depend on where you are flying.

   United Basic Economy: "You can't bring a carry-on bag unless you're flying to
   South America, across the Atlantic or across the Pacific." Same fare, same
   passenger, opposite answers — and the transatlantic case is precisely our
   audience, a US flyer connecting to Europe. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bag } from '../__fixtures__/catalogue.mjs';
import { evaluate } from '../fit.mjs';
import { CABIN_ABSENCE, resolveFare, routeApplies, toCarrier } from '../normalize.mjs';

const UNITED = {
  iata: 'UA',
  name: 'United',
  strictness: { score: 6 },
  allowances: [
    {
      type: 'personal',
      fare_class: 'basic',
      cabin_class: 'economy',
      max_cm: [43, 25, 22],
      cabin_absence: CABIN_ABSENCE.NOT_PERMITTED,
      applies_to: { except: ['SA', 'TATL', 'TPAC'] },
    },
    {
      type: 'cabin',
      fare_class: 'basic',
      cabin_class: 'economy',
      max_cm: [56, 35, 23],
      max_in: [22, 14, 9],
      applies_to: { regions: ['SA', 'TATL', 'TPAC'] },
    },
    {
      type: 'cabin',
      fare_class: 'economy',
      cabin_class: 'economy',
      max_cm: [56, 35, 23],
      max_in: [22, 14, 9],
    },
  ],
};
const b = bag('roller', [55, 34, 22]);

describe('the same fare, two answers', () => {
  test('Basic Economy domestic: no carry-on', () => {
    const c = toCarrier(UNITED, { fare: 'basic', route: 'domestic' });
    assert.equal(c.allowance, null);
    assert.equal(c.no_cabin_bag, true);
    assert.equal(evaluate(b, c).band, 'wont');
  });

  test('Basic Economy transatlantic: carry-on included', () => {
    const c = toCarrier(UNITED, { fare: 'basic', route: 'TATL' });
    assert.notEqual(c.allowance, null, 'our exact audience — a US flyer connecting to Europe');
    assert.notEqual(evaluate(b, c).band, 'wont');
  });

  test('and transpacific, and to South America', () => {
    for (const route of ['TPAC', 'SA']) {
      assert.notEqual(toCarrier(UNITED, { fare: 'basic', route }).allowance, null, route);
    }
  });
});

describe('no route given', () => {
  test('answers "it depends", not "no"', () => {
    const c = toCarrier(UNITED, { fare: 'basic' });
    assert.equal(c.route_dependent, true);
    assert.equal(c.cabin_absence, CABIN_ABSENCE.ROUTE_DEPENDENT);
    assert.equal(c.no_cabin_bag, false, 'a missing question is not a finding');
  });

  test('and produces no verdict rather than a guess', () => {
    const r = evaluate(b, toCarrier(UNITED, { fare: 'basic' }));
    assert.equal(r.band, null);
    assert.equal(r.reason, CABIN_ABSENCE.ROUTE_DEPENDENT);
  });

  test('route_dependent is distinct from not_researched', () => {
    assert.notEqual(
      CABIN_ABSENCE.ROUTE_DEPENDENT,
      CABIN_ABSENCE.NOT_RESEARCHED,
      'one is a gap in the question, the other a gap in our data'
    );
  });
});

describe('unconditional rows are unaffected', () => {
  test('a row with no applies_to works on every route', () => {
    for (const route of ['domestic', 'TATL', undefined]) {
      const c = toCarrier(UNITED, { fare: 'economy', route });
      assert.notEqual(c.allowance, null, String(route));
      assert.equal(c.route_dependent, false);
    }
  });

  test('routeApplies defaults to yes so records stay clean', () => {
    assert.deepEqual(routeApplies({}, 'domestic'), { applies: true, conditional: false });
  });
});

describe('route filtering happens before fare matching', () => {
  test('a domestic booking cannot reach a transatlantic-only row', () => {
    const r = resolveFare(UNITED, { fare: 'basic', route: 'domestic' });
    assert.equal(r.row, null, 'the TATL carry-on row must be invisible domestically');
  });

  test('an except-list excludes exactly what it names', () => {
    assert.equal(routeApplies({ applies_to: { except: ['TATL'] } }, 'TATL').applies, false);
    assert.equal(routeApplies({ applies_to: { except: ['TATL'] } }, 'domestic').applies, true);
  });
});
