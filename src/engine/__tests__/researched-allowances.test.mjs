import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { toCarrier } from '../normalize.mjs';

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

test('Singapore linear rule is retained without fabricating a rectangular allowance', () => {
  const singapore = record('SQ');
  assert.equal(singapore.published_cabin_allowances[0].linear_max_cm, 115);
  assert.equal(singapore.published_cabin_allowances[0].max_cm, null);
  const carrier = toCarrier(singapore, 'economy');
  assert.equal(carrier.cabin_unknown, true);
  assert.equal(carrier.no_cabin_bag, false);
});

test('Blue Basic includes overhead baggage and Wizz wheel exception survives intake', () => {
  assert.ok(toCarrier(record('B6'), 'basic').allowance);
  assert.equal(record('W6').allowances.find((a) => a.type === 'cabin').includes_wheels, false);
});
