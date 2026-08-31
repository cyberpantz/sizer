/* The adapter between stored records and the engine.
   This is where bad data must die. A verdict computed from a malformed record
   is worse than no verdict, because someone acts on it at an airport. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  EngineInputError,
  isSized,
  provenanceOf,
  shellOf,
  toBag,
  toCarrier,
  unwrap,
} from '../normalize.mjs';

const REC = {
  slug: 'monos-carry-on',
  brand: 'Monos',
  model: 'Carry-On',
  external_cm: { v: [56, 40, 23], src: 'review', ref: 'tl-international', at: '2026-02-23' },
  measured_cm: null,
  weight_kg: { v: 3.5, src: 'review' },
  soft: false,
  type: 'hardside spinner',
};

describe('provenance survives the boundary', () => {
  test('unwraps a value object without losing where it came from', () => {
    const b = toBag(REC);
    assert.deepEqual(b.external_cm, [56, 40, 23]);
    assert.equal(b.provenance.src, 'review');
    assert.equal(b.provenance.ref, 'tl-international');
  });

  test('accepts a bare array too, and says the provenance is unknown', () => {
    const b = toBag({ ...REC, external_cm: [56, 40, 23] });
    assert.deepEqual(b.external_cm, [56, 40, 23]);
    assert.equal(b.provenance.src, 'unknown');
  });

  test('`measured` is false unless WE measured it', () => {
    assert.equal(toBag(REC).measured, false, 'a review dimension is not ours');
    const ours = { ...REC, measured_cm: { v: [56, 40, 24], src: 'measured', at: '2026-09-01' } };
    assert.equal(toBag(ours).measured, true);
  });

  test('our own measurement wins over a published one', () => {
    const ours = { ...REC, measured_cm: { v: [57, 41, 25], src: 'measured' } };
    assert.deepEqual(toBag(ours).external_cm, [57, 41, 25]);
  });

  test('unwrap and provenanceOf handle null without throwing', () => {
    assert.equal(unwrap(null), null);
    assert.equal(provenanceOf(null).src, 'unknown');
  });
});

describe('bad input fails loudly', () => {
  const bad = (rec, why) =>
    test(why, () => {
      assert.throws(() => toBag(rec), EngineInputError, why);
    });

  bad({ ...REC, external_cm: null, measured_cm: null, claimed_cm: null }, 'no dimensions at all');
  bad({ ...REC, external_cm: { v: [56, 40] } }, 'only two dimensions');
  bad({ ...REC, external_cm: { v: [56, 40, 23, 12] } }, 'four dimensions');
  bad({ ...REC, external_cm: { v: [56, 40, NaN] } }, 'NaN dimension');
  bad({ ...REC, external_cm: { v: [56, 40, 0] } }, 'zero dimension');
  bad({ ...REC, external_cm: { v: [56, 40, -3] } }, 'negative dimension');
  bad({ ...REC, external_cm: { v: [56, 40, '23'] } }, 'string dimension');
  bad(null, 'no record at all');

  test('the error names the bag, so the failure is findable', () => {
    try {
      toBag({ ...REC, external_cm: null, measured_cm: null, claimed_cm: null });
    } catch (e) {
      assert.equal(e.subject, 'monos-carry-on');
    }
  });

  test('isSized answers without throwing, for filtering', () => {
    assert.equal(isSized(REC), true);
    assert.equal(isSized({ slug: 'x' }), false);
    assert.equal(isSized(null), false);
  });
});

describe('construction inference', () => {
  test('an explicit shell field wins over any guess', () => {
    assert.equal(shellOf({ shell: 'duffel', model: 'Aluminum Edition', soft: false }), 'duffel');
  });

  test('falls back to the model name, which is why the field should be set', () => {
    assert.equal(shellOf({ model: 'The Carry-On Aluminum Edition' }), 'aluminium');
  });

  test('an invalid shell value is ignored rather than trusted', () => {
    assert.equal(shellOf({ shell: 'unobtanium', soft: true }), 'softside');
  });

  test('type beats softness for duffels and backpacks', () => {
    assert.equal(shellOf({ type: 'duffel', soft: true }), 'duffel');
    assert.equal(shellOf({ type: 'backpack', soft: true }), 'backpack');
  });
});

describe('carriers', () => {
  const CARRIER = {
    iata: 'FR',
    name: 'Ryanair',
    strictness: { score: 9 },
    allowances: [
      { type: 'cabin', fare_class: 'priority', max_cm: [55, 40, 20], max_kg: 10 },
      { type: 'checked', fare_class: 'priority', linear_max_cm: 158 },
    ],
  };

  test('picks the cabin row for the requested fare', () => {
    const c = toCarrier(CARRIER, 'priority');
    assert.deepEqual(c.allowance.max_cm, [55, 40, 20]);
    assert.equal(c.strictness, 9);
    assert.equal(c.no_cabin_bag, false);
  });

  /* Superseded. A missing cabin row used to mean "no cabin bag at any size";
     it now means UNKNOWN unless the record says not_permitted. See
     absence.test.mjs — telling a traveller their bag is banned because nobody
     researched the fare is the worse error. */
  test('a missing cabin row is unknown, not a ban, and never a zero-size allowance', () => {
    const c = toCarrier(CARRIER, 'basic');
    assert.equal(c.no_cabin_bag, false);
    assert.equal(c.cabin_unknown, true);
    assert.equal(c.allowance, null, 'a zero-size row would silently pass a naive comparison');
  });

  test('strictness outside 1-10 is rejected', () => {
    assert.throws(
      () => toCarrier({ ...CARRIER, strictness: { score: 0 } }, 'priority'),
      EngineInputError
    );
    assert.throws(
      () => toCarrier({ ...CARRIER, strictness: { score: 11 } }, 'priority'),
      EngineInputError
    );
    assert.throws(() => toCarrier({ ...CARRIER, strictness: null }, 'priority'), EngineInputError);
  });

  test('a malformed allowance is rejected, not rounded off', () => {
    const broken = {
      ...CARRIER,
      allowances: [{ type: 'cabin', fare_class: 'priority', max_cm: [55, 40] }],
    };
    assert.throws(() => toCarrier(broken, 'priority'), EngineInputError);
  });
});
