/* Shelving is a claim, not a label. "Goes anywhere" asserts something about
   every airline we track, so the thresholds and the bucketing are tested. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bag, carrier } from '../../engine/__fixtures__/catalogue.mjs';
import { loadBags, loadCarriers } from '../data.mjs';
import { SHELVES, shelve } from '../shelves.mjs';

describe('bucketing', () => {
  const carriers = [carrier('Lax', 3, [61, 46, 25]), carrier('Strict', 9, [40, 30, 20])];

  test('every bag lands on exactly one shelf', () => {
    const bags = [bag('big', [60, 45, 24]), bag('small', [39, 29, 19]), bag('mid', [55, 40, 22])];
    const shelved = shelve(bags, carriers);
    const total = shelved.reduce((n, s) => n + s.bags.length, 0);
    assert.equal(total, bags.length, 'a bag on two shelves, or none, is a bucketing bug');
  });

  test('shelves are ordered widest-fitting first', () => {
    for (let i = 1; i < SHELVES.length; i++) {
      assert.ok(SHELVES[i - 1].min > SHELVES[i].min, 'thresholds must descend');
    }
  });

  test('bags are sorted by coverage within a shelf', () => {
    const bags = [bag('a', [55, 40, 22]), bag('b', [39, 29, 19]), bag('c', [45, 32, 20])];
    for (const s of shelve(bags, carriers)) {
      const ratios = s.bags.map((x) => x.coverage.ratio);
      assert.deepEqual(
        ratios,
        [...ratios].sort((x, y) => y - x)
      );
    }
  });

  test('an empty catalogue produces empty shelves, not a crash', () => {
    assert.equal(
      shelve([], carriers).reduce((n, s) => n + s.bags.length, 0),
      0
    );
  });
});

/* Loaded once at module scope. The loaders are async because they will read
   endpoints rather than disk soon; awaiting inside describe() is not allowed. */
const bags = await loadBags();
const carriers = await loadCarriers();

describe('against the real catalogue', () => {
  /* These run on data/, so they fail when the data regresses — which is the
     point. The landing page makes exactly these claims. */
  const shelves = shelve(bags, carriers);

  test('the top shelf is not empty', () => {
    const top = shelves[0];
    assert.ok(
      top.bags.length > 0,
      '"goes anywhere" with nothing on it means the site cannot answer its own question'
    );
  });

  test('nothing on the top shelf clears less than 80%', () => {
    for (const { bag: b, coverage } of shelves[0].bags) {
      assert.ok(
        coverage.ratio >= 0.8,
        `${b.slug} is on the top shelf at ${Math.round(coverage.ratio * 100)}%`
      );
    }
  });

  test('a denominator counts only airlines the answer can discriminate between', () => {
    /* THREE reasons to leave the denominator, and they are not the same claim:
     *
     *   cabin_unknown — we have not researched it. A fact about US.
     *   not_flying    — the airline has stopped. A fact about THEM.
     *   no_cabin_bag  — their cheapest fare includes no cabin bag at any size.
     *                   A fact about the FARE.
     *
     * The third is the one this test grew to cover. Ryanair, Wizz and Frontier
     * sell a seat and a personal item; every suitcase ever made fails them
     * equally, so counting them says nothing about which bag to buy and makes
     * "clears every airline" unreachable by construction — the top shelf
     * empties and the page stops discriminating at all.
     *
     * Excluded, but never hidden: coverage reports the count separately so a
     * page can say it, and "no bag clears these three without buying up" is
     * among the most useful things this site knows. */
    const excluded = carriers.filter(
      (c) => c.cabin_unknown || c.flying === false || c.no_cabin_bag
    ).length;
    for (const s of shelves) {
      for (const { coverage } of s.bags) {
        assert.equal(
          coverage.of,
          carriers.length - excluded,
          'a coverage claim must not count airlines the bag cannot be judged against'
        );
      }
    }
  });

  test('an excluded airline is reported, never silently dropped', () => {
    /* A denominator that quietly shrinks is how "clears 41 of 52" becomes a
       claim nobody can check. Each exclusion has to be countable from the
       result itself. */
    const [{ coverage }] = shelves.flatMap((s) => s.bags);
    assert.equal(typeof coverage.unknown, 'number');
    assert.equal(typeof coverage.not_flying, 'number');
    assert.equal(
      typeof coverage.no_cabin_bag,
      'number',
      'coverage does not report how many airlines allow no cabin bag at all'
    );
    assert.equal(
      coverage.of + coverage.unknown + coverage.not_flying + coverage.no_cabin_bag,
      carriers.length,
      'the exclusions do not account for every carrier — one is being dropped unreported'
    );
  });

  test('no bag is presented as measured until someone measures one', () => {
    for (const b of bags) {
      if (b.measured) {
        assert.ok(b.record.measured_at, `${b.slug} claims measured with no date`);
      }
    }
  });
});
