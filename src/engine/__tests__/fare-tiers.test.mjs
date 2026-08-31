/* Basic is a TIER of economy, not a class beside it.
 *
 * One modelling error produced two opposite bugs, and the second was my patch
 * for the first.
 *
 * `cabin_class` is null on 97 of the 99 cabin rows in the dataset — airlines
 * publish a fare brand, not a travel class. So resolving a bare "economy" only
 * ever matched a row literally NAMED economy, and the five carriers that never
 * use the word — Ryanair, easyJet, Wizz, Vueling, Frontier — resolved to
 * nothing, became cabin_unknown, and were dropped from the coverage
 * denominator of every figure on the site. "Goes anywhere" meant "goes
 * anywhere except the five airlines that actually measure".
 *
 * The patch, applied on one page only, preferred `basic` outright — which then
 * answered on Basic Economy for the 18 carriers publishing both, and told Air
 * France and KLM passengers they get no cabin bag.
 *
 * Both disappear once the ladder is modelled: economy is a family, basic is
 * its no-frills bottom rung, and each rung up buys something back. Ask for
 * economy and you get the airline's economy row where one exists, and its
 * cheapest economy tier where it sells nothing else. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CABIN_ABSENCE, ECONOMY_TIERS, isTierOf, resolveFare, toCarrier } from '../normalize.mjs';

const rec = (allowances, extra = {}) => ({
  iata: 'XX',
  name: 'Test Air',
  status: 'operating',
  strictness: { score: 5 },
  allowances,
  ...extra,
});
const cabin = (fare, max_cm, extra = {}) => ({ type: 'cabin', fare_class: fare, max_cm, ...extra });
const personal = (fare, max_cm) => ({ type: 'personal', fare_class: fare, max_cm });

describe('the economy ladder', () => {
  test('an exact economy row always wins over a cheaper tier', () => {
    /* Air France and KLM publish both. Answering on basic told their
       passengers they get no cabin bag — true of the cheapest ticket, wrong
       for what most people buy. */
    const r = resolveFare(rec([cabin('basic', [40, 30, 20]), cabin('economy', [55, 35, 25])]), {
      class: 'economy',
    });
    assert.deepEqual(r.row.max_cm, [55, 35, 25]);
  });

  test('a carrier selling no row called "economy" still resolves', () => {
    /* Ryanair's basic IS their economy. This is the branch whose absence
       dropped five carriers out of every denominator on the site. */
    const r = resolveFare(rec([cabin('basic', [55, 40, 20])]), { class: 'economy' });
    assert.ok(r.row, 'a carrier publishing only a fare brand resolved to nothing');
    assert.deepEqual(r.row.max_cm, [55, 40, 20]);
    assert.equal(r.tier, 'basic');
  });

  test('the fallback takes the CHEAPEST tier, never the most generous', () => {
    /* Each rung up buys something back — bags, legroom, free changes. Picking
       a higher rung would promise an allowance the reader has not bought. */
    const r = resolveFare(
      rec([cabin('plus', [56, 45, 25]), cabin('basic', [45, 36, 20]), cabin('flex', [56, 45, 25])]),
      { class: 'economy' }
    );
    assert.equal(r.tier, 'basic');
    assert.deepEqual(r.row.max_cm, [45, 36, 20]);
  });

  test('an add-on is never reachable through the class fallback', () => {
    /* Ryanair Priority is €6 on top of Basic. Reaching it from an unqualified
       question would tell a passenger with no cabin allowance their bag is
       fine — wrong in the most expensive direction. */
    const r = resolveFare(
      rec([cabin('basic', [55, 40, 20], { addon: 'priority' }), personal('basic', [40, 30, 20])]),
      { class: 'economy' }
    );
    assert.equal(r.row, null, 'the class fallback bought an add-on the reader did not');
  });

  test('an unrecognised brand is not assumed to be economy', () => {
    /* Membership is an explicit list. Guessing would hand a business row to
       someone who booked coach. */
    assert.equal(isTierOf('scootplus', 'economy'), false);
    assert.equal(isTierOf('business', 'economy'), false);
    assert.equal(isTierOf('basic', 'economy'), true);
    assert.equal(isTierOf('basic', 'business'), false);
    const r = resolveFare(rec([cabin('scootplus', [54, 38, 23])]), { class: 'economy' });
    assert.equal(r.row, null, 'a premium cabin was served to an economy booking');
  });

  test('the ladder ascends, cheapest first', () => {
    assert.equal(ECONOMY_TIERS[0], 'basic', 'basic must be the bottom rung');
    assert.ok(ECONOMY_TIERS.indexOf('basic') < ECONOMY_TIERS.indexOf('standard'));
    assert.ok(ECONOMY_TIERS.indexOf('standard') < ECONOMY_TIERS.indexOf('plus'));
    assert.equal(new Set(ECONOMY_TIERS).size, ECONOMY_TIERS.length, 'duplicate rung');
  });
});

describe('a paywalled cabin bag is a finding, not a gap', () => {
  const ulcc = rec([
    personal('basic', [40, 30, 20]),
    cabin('priority', [55, 40, 20]),
    cabin('basic', [55, 40, 20], { addon: 'priority' }),
  ]);

  test('"the only cabin row costs extra" resolves to NOT PERMITTED', () => {
    /* Ryanair, Wizz and Frontier publish no free cabin allowance at all. The
       engine read that as "unresearched" — a fact about us — and dropped the
       three airlines readers most want answered. */
    const r = resolveFare(ulcc, { class: 'economy' });
    assert.equal(r.absence, CABIN_ABSENCE.NOT_PERMITTED);
    assert.equal(r.addon_available, 'priority');
  });

  test('the carrier reports no_cabin_bag, not cabin_unknown', () => {
    const c = toCarrier(ulcc, 'economy');
    assert.equal(c.no_cabin_bag, true, 'a researched ban is being reported as an unknown');
    assert.equal(c.cabin_unknown, false);
  });

  test('silence alone still means unresearched', () => {
    /* Narrow on purpose. Inferring a ban from an empty record is how a
       half-finished carrier turns into a confident claim. */
    const empty = rec([personal('basic', [40, 30, 20])]);
    const r = resolveFare(empty, { class: 'economy' });
    assert.notEqual(
      r.absence,
      CABIN_ABSENCE.NOT_PERMITTED,
      'a ban was inferred from a record that simply has no cabin row'
    );
  });

  test('buying the add-on gets the bag back', () => {
    const r = resolveFare(ulcc, { class: 'economy', addons: ['priority'] });
    assert.deepEqual(r.row.max_cm, [55, 40, 20]);
    assert.equal(r.matched, 'addon');
  });
});

describe('the real catalogue', () => {
  test('every operating carrier is answerable', async () => {
    /* Was `['SQ']` for about an hour. Singapore publishes only "sum of
       dimensions <= 115 cm", which the schema could not express, so its
       researched figure sat parked in `published_cabin_allowances` with a note
       saying it was waiting on the engine. The engine honours linear limits
       now and the row moved into `allowances`.
       Zero is the standing bar: an airline we cannot answer for is a hole in
       every coverage figure on the site, so a new one has to be deliberate. */
    const { loadCarriers } = await import('../../lib/data.mjs');
    const cs = await loadCarriers();
    const unknown = cs.filter((c) => c.cabin_unknown).map((c) => c.iata);
    assert.deepEqual(unknown, [], `unanswerable carriers: ${unknown.join(', ')}`);
  });

  test('every carrier record survives normalisation', async () => {
    /* loadCarriers() swallows a throwing record so one bad file cannot take
       down the build — which also means a record can vanish in total silence.
       SQ did exactly that for a few minutes: `reconcileUnits(null, undefined)`
       returns null rather than { cm: null }, buildAllowance threw, the loader
       dropped it, and "zero unanswerable" was Singapore disappearing rather
       than Singapore answered. Count, do not assume. */
    const { loadCarriers } = await import('../../lib/data.mjs');
    const { readdirSync } = await import('node:fs');
    const onDisk = readdirSync('data/carriers').filter(
      (f) => f.endsWith('.json') && !f.startsWith('_')
    ).length;
    const loaded = (await loadCarriers()).length;
    assert.equal(loaded, onDisk, `${onDisk - loaded} carrier record(s) threw and were dropped`);
  });

  test('the three ULCCs answer "no cabin bag" rather than "unknown"', async () => {
    const { loadCarriers } = await import('../../lib/data.mjs');
    const cs = await loadCarriers();
    for (const iata of ['FR', 'W6', 'F9']) {
      const c = cs.find((x) => x.iata === iata);
      assert.equal(c.no_cabin_bag, true, `${iata} should report no cabin bag on its cheapest fare`);
    }
  });

  test('carriers publishing both tiers answer on economy, not basic', async () => {
    const { loadCarriers } = await import('../../lib/data.mjs');
    const cs = await loadCarriers();
    for (const iata of ['AF', 'KL']) {
      const c = cs.find((x) => x.iata === iata);
      assert.equal(
        c.no_cabin_bag,
        false,
        `${iata} answers on Basic — most of their passengers do get a cabin bag`
      );
      assert.ok(c.allowance, `${iata} has no allowance`);
    }
  });
});
