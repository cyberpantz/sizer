import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { engine } from '../fit.mjs';
import { toBag, toCarrier } from '../normalize.mjs';

const record = (code) =>
  JSON.parse(readFileSync(new URL(`../../../data/carriers/${code}.json`, import.meta.url)));

test('researched Basic fares cannot inherit regular Economy overhead allowance', () => {
  for (const code of ['AF', 'KL', 'FR', 'W6', 'U2', 'F9', 'VY', 'LH']) {
    const carrier = toCarrier(record(code), {
      fare: 'basic',
      class: 'economy',
      route: 'shorthaul',
    });
    assert.equal(carrier.no_cabin_bag, true, code);
    assert.equal(carrier.allowance, null, code);
  }
});

test('purchased overhead add-ons override the base fare restriction', () => {
  for (const [code, addon] of [
    ['AF', 'hand_baggage'],
    ['KL', 'hand_baggage'],
    ['FR', 'priority'],
    ['W6', 'wizz_priority'],
    ['U2', 'large_cabin_bag'],
    ['VY', 'two_pieces_on_board'],
    ['F9', 'carry_on'],
  ]) {
    const carrier = toCarrier(record(code), { fare: 'basic', class: 'economy', addons: [addon] });
    assert.ok(carrier.allowance, code);
    assert.equal(carrier.no_cabin_bag, false, code);
  }
});

test('Lufthansa Basic without route stays unknown; unresearched route does not inherit Economy', () => {
  assert.equal(toCarrier(record('LH'), { fare: 'basic', class: 'economy' }).cabin_unknown, true);
  assert.equal(
    toCarrier(record('LH'), { fare: 'basic', class: 'economy', route: 'TATL' }).cabin_unknown,
    true
  );
});

test('Singapore is answered on its linear rule, without fabricating a box', () => {
  /* This test used to assert the opposite, and was right to: Singapore
     publishes no per-axis dimensions at all — the whole rule is "sum of the
     three sides <= 115 cm" — so the researched row sat parked in
     `published_cabin_allowances` and SQ read as unanswerable. The record even
     carried a note saying it was waiting on the engine.
     The engine honours linear limits now, so the row has moved into
     `allowances`. What must NOT change is the second half of the original
     assertion: no rectangular allowance is invented. A plausible 55x40x20
     would answer far more questions and every answer would be made up. */
  const singapore = record('SQ');
  assert.equal(
    singapore.published_cabin_allowances,
    undefined,
    'the parked row should have moved into allowances'
  );

  const carrier = toCarrier(singapore, 'economy');
  assert.equal(carrier.cabin_unknown, false, 'SQ is answerable now');
  assert.equal(carrier.no_cabin_bag, false);
  assert.equal(carrier.allowance.linear_max_cm, 115);
  assert.equal(carrier.allowance.max_cm, null, 'a per-axis box was invented for SQ');
  assert.equal(carrier.allowance.max_kg, 7);
});

test('a linear-only carrier still produces a real verdict', () => {
  /* The point of the whole exercise: a reader flying Singapore gets an answer
     rather than a shrug, and the answer is about the sum of the sides. */
  const carrier = toCarrier(record('SQ'), 'economy');
  const big = engine.evaluate(
    toBag({ slug: 'big', model: 'Big', external_cm: { v: [55, 40, 25] }, soft: 0, wheels: 4 }),
    carrier
  );
  assert.equal(big.basis, 'linear', 'the linear cap should be the binding constraint');
  assert.equal(big.delta_cm, 5, '55+40+25 = 120 against a 115 limit');
  assert.equal(big.band, 'wont');

  const small = engine.evaluate(
    toBag({ slug: 'small', model: 'Small', external_cm: { v: [50, 35, 20] }, soft: 0, wheels: 4 }),
    carrier
  );
  assert.equal(small.band, 'clears', '50+35+20 = 105 is well inside 115');
});

test('Blue Basic includes overhead baggage and Wizz wheel exception survives intake', () => {
  assert.ok(toCarrier(record('B6'), 'basic').allowance);
  assert.equal(record('W6').allowances.find((a) => a.type === 'cabin').includes_wheels, false);
});
