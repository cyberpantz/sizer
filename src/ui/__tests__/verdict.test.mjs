/* Verdict copy. One source, because three copies had already disagreed. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BANDS } from '../../engine/constants.mjs';
import { CM, createUnits } from '../units.mjs';
import { advisoryLine, BAND_COPY, BANNED, bandLabel, verdictLine } from '../verdict.mjs';

const U = createUnits({ storage: { getItem: () => CM, setItem() {} } });

describe('band copy', () => {
  test('every engine band has copy — no band can render blank', () => {
    for (const b of BANDS) {
      assert.ok(BAND_COPY[b], `${b} has no copy`);
      assert.ok(BAND_COPY[b].label && BAND_COPY[b].token);
    }
  });

  test('no copy uses banned editorial language', () => {
    for (const [b, c] of Object.entries(BAND_COPY)) {
      assert.ok(!BANNED.test(c.label), `${b}: "${c.label}" breaks editorial policy 16`);
    }
  });

  test('a null band renders as not flying, not as unknown', () => {
    assert.equal(bandLabel(null), 'Not flying');
  });
});

describe('the verdict line', () => {
  test('an overage names the binding dimension', () => {
    assert.equal(verdictLine({ delta_cm: 2.5, dimension: 'deep' }, U), '2.5 cm too deep.');
  });

  test('spare room is stated positively', () => {
    assert.equal(verdictLine({ delta_cm: -3, dimension: 'long' }, U), '3 cm to spare.');
  });

  test('exactly on the limit is its own case, not "0 cm to spare"', () => {
    assert.equal(verdictLine({ delta_cm: 0, dimension: 'long' }, U), 'Exactly on the limit.');
  });

  test('a fare with no cabin bag says so instead of quoting a size', () => {
    assert.match(verdictLine({ no_cabin_bag: true }, U), /no cabin bag at any size/);
  });

  test('a ceased carrier says so', () => {
    assert.match(verdictLine({ not_flying: true }, U), /no longer operates/);
  });
});

describe('advisory copy', () => {
  const cases = [
    ['no_cabin_bag', { id: 'no_cabin_bag' }],
    ['agent_commission', { id: 'agent_commission', amount_usd: 10 }],
    ['regional_jet', { id: 'regional_jet' }],
    ['squish may_squeeze', { id: 'squish', level: 'may_squeeze', over_cm: 1.2 }],
    ['squish rigid', { id: 'squish', level: 'rigid', over_cm: 0.4 }],
    ['weight tight', { id: 'weight', level: 'tight', bag_kg: 4.8, cap_kg: 7, left_kg: 2.2 }],
    ['weight over', { id: 'weight', level: 'over', bag_kg: 8, cap_kg: 7, left_kg: -1 }],
    ['expansion', { id: 'expansion', expands_cm: 5 }],
  ];

  for (const [name, a] of cases) {
    test(`${name} renders a real sentence`, () => {
      const s = advisoryLine(a, U);
      assert.ok(s.length > 10, `${name} produced "${s}"`);
      assert.ok(!/undefined|NaN|null/.test(s), `${name} leaked a placeholder: "${s}"`);
      assert.ok(!BANNED.test(s), `${name} breaks editorial policy: "${s}"`);
    });
  }

  test('the commission line states the fee and nothing about intent', () => {
    const s = advisoryLine({ id: 'agent_commission', amount_usd: 10 }, U);
    assert.match(s, /\$10/);
    assert.ok(
      !/unfair|abuse|dishonest|trick/i.test(s),
      'the figure is ours to report; characterisation belongs to the cited source'
    );
  });

  test('an unknown advisory renders empty rather than breaking the page', () => {
    assert.equal(advisoryLine({ id: 'not_a_thing' }, U), '');
  });
});
