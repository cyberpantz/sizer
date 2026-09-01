/* THE BROWSER MUST SEE WHAT THE BUILD SAW.
 *
 * /check runs this engine in the reader's browser against a trimmed catalogue.
 * That is the whole payoff of the engine being pure — no DOM, no I/O, no
 * units — because it means a verdict computed on someone's phone is
 * byte-identical to one computed at build time.
 *
 * It is only identical if the INPUT is. And the trim was a hand-kept list of
 * fields in scripts/build-client-data.mjs, which had fallen behind the engine
 * twice without anything noticing:
 *
 *   linear_max_cm  never shipped. Singapore's entire cabin rule is "the three
 *                  sides added together must be under 115 cm" — no box at all.
 *                  Strip the field and buildAllowance() reaches assertDims with
 *                  nothing to assert, and THROWS. Two of 58 airlines crashed
 *                  /check outright, and the comparator's whole "this airline
 *                  sets no box" branch — written, reviewed, commented — was
 *                  unreachable code that had never run once in a browser.
 *
 *   absence        never shipped. Delta, Southwest, Qatar and five others were
 *                  researched and found to publish NO under-seat dimensions;
 *                  that finding lives in `absence` on the personal row. Without
 *                  it the browser fell back to not_researched, so "this airline
 *                  publishes no size, it has to fit under the seat in front of
 *                  you" became "nobody has looked at this airline yet". A
 *                  finding downgraded to a gap is the precise failure the
 *                  taxonomy exists to prevent, and it happened in the one place
 *                  no test was looking.
 *
 * Both are the same bug, and reading the file harder would not have caught
 * either: the trim looks complete, and it is wrong on two carriers out of 58.
 *
 * So this does not check the field list. It round-trips every carrier and every
 * fare through toCarrier() twice — once from the full record, once from the
 * shipped projection — and demands the same object. Any field the engine starts
 * reading is covered the day it is read, without anybody remembering to come
 * back here.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadCarriers } from '../../lib/data.mjs';
import { CABIN_ABSENCE, projectAllowance, toCarrier } from '../normalize.mjs';

const carriers = await loadCarriers();

/** The record as the browser receives it — same projection the build applies. */
const shipped = (record) => ({
  ...record,
  allowances: (record.allowances ?? []).map(projectAllowance),
});

/** Every fare a carrier publishes, plus the bare class, because /check offers
 *  the fares and the bag pages ask by class. */
const faresOf = (record) => {
  const fares = [
    ...new Set((record.allowances ?? []).map((a) => a.fare_class).filter(Boolean)),
  ];
  return fares.length ? fares : ['economy'];
};

describe('the shipped catalogue is the same input', () => {
  test('every carrier and fare resolves identically from both shapes', () => {
    const differ = [];
    for (const c of carriers) {
      for (const fare of faresOf(c.record)) {
        const full = toCarrier(c.record, fare);
        const thin = toCarrier(shipped(c.record), fare);
        /* Deep equality on the WHOLE resolved carrier, not a field list. That
           is the point: the assertion cannot go stale. */
        try {
          assert.deepEqual(thin, full);
        } catch {
          differ.push(`${c.iata} ${fare}`);
        }
      }
    }
    assert.deepEqual(
      differ,
      [],
      'the browser would resolve these differently from the build — a field the ' +
        'engine reads is missing from ALLOWANCE_FIELDS:\n  ' +
        differ.join('\n  ')
    );
  });

  test('no carrier and fare throws on the shipped shape', () => {
    /* The Singapore failure was not a wrong answer, it was an exception — the
       page stopped rendering. A deep-equal test alone would have reported it as
       a difference; saying so plainly is worth one more loop. */
    const threw = [];
    for (const c of carriers) {
      for (const fare of faresOf(c.record)) {
        try {
          toCarrier(shipped(c.record), fare);
        } catch (err) {
          threw.push(`${c.iata} ${fare} :: ${err.message}`);
        }
      }
    }
    assert.deepEqual(threw, [], `/check would crash on:\n  ${threw.join('\n  ')}`);
  });
});

describe('the two fields that were actually lost', () => {
  /* Named cases, in addition to the round-trip above. The general guard is
     what keeps this from recurring; these say what went wrong, so a future
     reader of a failure knows which shape of bug they are looking at. */

  test("a linear-only carrier survives the trip to the browser", () => {
    /* Singapore publishes no cabin box whatsoever. */
    const sq = carriers.find((c) => c.iata === 'SQ');
    assert.ok(sq, 'Singapore Airlines is no longer in the catalogue');
    const thin = toCarrier(shipped(sq.record), 'economy');
    assert.equal(thin.allowance.max_cm, null, 'Singapore should have no box');
    assert.equal(
      typeof thin.allowance.linear_max_cm,
      'number',
      'the sum-of-sides cap did not reach the browser — /check will throw'
    );
  });

  test('a researched under-seat absence stays a finding, not a gap', () => {
    /* Delta was read and found to publish no numeric personal-item size. That
       is a better answer than any number, and it only survives if `absence`
       ships. */
    const withFinding = carriers.filter((c) => {
      const full = toCarrier(c.record, faresOf(c.record)[0]);
      return full.personal_absence === CABIN_ABSENCE.NOT_PUBLISHED;
    });
    assert.ok(
      withFinding.length > 0,
      'no carrier carries a researched "publishes no under-seat size" finding any more'
    );
    for (const c of withFinding) {
      const fare = faresOf(c.record)[0];
      assert.equal(
        toCarrier(shipped(c.record), fare).personal_absence,
        CABIN_ABSENCE.NOT_PUBLISHED,
        `${c.iata}: the browser reads this finding as an unresearched gap`
      );
    }
  });
});
