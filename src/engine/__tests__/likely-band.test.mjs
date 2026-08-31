/* "Probably fine" — the shallow half of the gamble zone.
 *
 * WHY THE BAND EXISTS. `gamble` used to cover everything from a hair over the
 * limit to the edge of what the airline tolerates. At a carrier that
 * effectively never measures, that is 0.3 cm to 5 cm under one word. Being
 * 0.4 cm over at an airline nobody has seen check a bag is not the same
 * proposition as being 4.9 cm over, and "Risky" overstated the first while
 * understating the second.
 *
 * WHY IT IS GATED ON EVIDENCE. This is the first band whose job is to
 * REASSURE, and the engine already takes a position on which way to be wrong:
 * gambleCeiling() fails an unknown carrier to STRICT because "an over-cautious
 * verdict costs a reader some convenience, an over-confident one costs them a
 * gate fee and their bag." Telling someone their oversize bag is probably fine
 * on the strength of a type/region prior is the expensive error. Every
 * strictness score in the dataset is currently such a prior, so the score
 * alone cannot license the band — an evidence claim about gate behaviour can.
 *
 * NOT COVERED BY THE GOLDEN SNAPSHOT. scripts/verify-port.mjs builds its
 * carriers by hand without an evidence field, so `likely` can never fire
 * there. That snapshot still proves the four original bands are untouched for
 * an unresearched carrier — which is most of them — but it is blind to this
 * band by construction. Hence this file. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { EPS_CM, gambleCeiling, LIKELY_SHARE } from '../constants.mjs';
import { createEngine } from '../fit.mjs';
import { toBag, toCarrier } from '../normalize.mjs';

const engine = createEngine();

/* A 55×40×20 limit, so a delta is just the bag's longest side minus 55. */
const carrierRecord = (score, { evidence = [] } = {}) => ({
  iata: 'XX',
  name: 'Test Air',
  status: 'operating',
  strictness: { score, score_basis: 'type_region_prior_only', evidence },
  allowances: [{ type: 'cabin', fare_class: 'economy', max_cm: [55, 40, 20] }],
});

const EVIDENCE = [{ claim: 'Staff measure bags at the gate.', url: 'https://example.test' }];

const bagOver = (cm) =>
  toBag({
    slug: 'test',
    brand: 'Test',
    model: 'Test',
    type: 'hardside spinner',
    external_cm: { v: [+(55 + cm).toFixed(2), 40, 20] },
    soft: 0,
    wheels: 4,
    weight_kg: { v: 2 },
  });

const bandAt = (score, over, evidence) =>
  engine.evaluate(bagOver(over), toCarrier(carrierRecord(score, { evidence }), 'economy')).band;

describe('the likely band', () => {
  test('a shallow overage at a researched, lenient airline reads "probably fine"', () => {
    /* score 2 → ceiling 5.0 → likely up to 2.5 cm. */
    assert.equal(gambleCeiling(2), 5);
    assert.equal(bandAt(2, 1.0, EVIDENCE), 'likely');
    assert.equal(bandAt(2, 2.4, EVIDENCE), 'likely');
  });

  test('the deep half of the same zone stays "risky"', () => {
    assert.equal(bandAt(2, 2.6, EVIDENCE), 'gamble');
    assert.equal(bandAt(2, 4.9, EVIDENCE), 'gamble');
  });

  test('past the ceiling is still over, band or no band', () => {
    assert.equal(bandAt(2, 5.1, EVIDENCE), 'wont');
  });

  test('the split is a FRACTION of the airline’s own ceiling, not a distance', () => {
    /* 1.0 cm over is "probably fine" at a carrier that rarely checks and
       "risky" at one that frames bags at the gate. That is the entire point:
       the same overage is not the same risk. */
    assert.equal(bandAt(2, 1.0, EVIDENCE), 'likely'); // ceiling 5.0
    assert.equal(bandAt(7, 1.0, EVIDENCE), 'gamble'); // ceiling 1.5
  });

  test('an airline that measures every bag has no "probably fine" at all', () => {
    /* Ceiling 0 leaves no zone to split. Ryanair must never reassure. */
    assert.equal(gambleCeiling(9), 0);
    for (const over of [0.4, 1, 3]) {
      assert.equal(bandAt(9, over, EVIDENCE), 'wont', `${over} cm over should be "Over" at 9/10`);
    }
  });
});

describe('the evidence gate', () => {
  test('an unresearched airline never returns the reassuring band', () => {
    /* The failure this prevents: telling someone their oversize bag is
       probably fine because of a number nobody looked up. */
    assert.equal(bandAt(2, 1.0, []), 'gamble');
    assert.equal(bandAt(2, 1.0, undefined), 'gamble');
  });

  test('evidence without a claim is not evidence', () => {
    /* A row carrying only a URL is a bookmark, not a finding. */
    assert.equal(bandAt(2, 1.0, [{ url: 'https://example.test' }]), 'gamble');
  });

  test('the gate only ever makes the answer MORE cautious', () => {
    /* Whatever evidence does, it must never move a verdict toward "clears" or
       away from "wont" — it may only split gamble. */
    for (const score of [1, 2, 4, 5, 6, 7, 8, 9, 10]) {
      for (const over of [-3, -1, 0, 0.2, 0.5, 1, 2, 3, 4, 6]) {
        const withEv = bandAt(score, over, EVIDENCE);
        const without = bandAt(score, over, []);
        if (withEv === without) continue;
        assert.equal(
          `${without}->${withEv}`,
          'gamble->likely',
          `score ${score}, ${over} cm over: evidence changed ${without} to ${withEv}, ` +
            'but it may only split the gamble zone'
        );
      }
    }
  });
});

describe('the ladder stays exhaustive', () => {
  test('every delta at every strictness lands in exactly one band', () => {
    for (let score = 1; score <= 10; score++) {
      for (let over = -5; over <= 8; over += 0.1) {
        for (const ev of [EVIDENCE, []]) {
          const b = bandAt(score, +over.toFixed(1), ev);
          assert.ok(
            ['clears', 'line', 'likely', 'gamble', 'wont'].includes(b),
            `score ${score}, ${over.toFixed(1)} cm over produced ${b}`
          );
        }
      }
    }
  });

  test('likely never appears inside the published limit', () => {
    /* It means OVER but probably unnoticed. A bag within the limit must read
       clears or line — reassurance is not a verdict for a legal bag. */
    for (let score = 1; score <= 10; score++) {
      for (const under of [-4, -2, -0.5, 0]) {
        assert.notEqual(bandAt(score, under, EVIDENCE), 'likely');
      }
    }
    /* And never inside our own measurement error either. */
    assert.notEqual(bandAt(2, EPS_CM - 0.01, EVIDENCE), 'likely');
  });

  test('LIKELY_SHARE is a proper fraction — the band is half a zone, not a new one', () => {
    assert.ok(LIKELY_SHARE > 0 && LIKELY_SHARE < 1, 'LIKELY_SHARE must sit strictly inside (0,1)');
  });
});
