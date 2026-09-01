/* THE ARROWS ON A NUMBER FIELD MUST ACTUALLY MOVE THE NUMBER.
 *
 * Frank: "when I try to increment the number fields it does not appear to allow
 * me to change the value. When I just type a new number in it appears to work."
 *
 * The custom-bag editor rendered `step="0.25"` in imperial while len() renders
 * one decimal place. 55.2 cm displays as 21.7 in, which is NOT a member of the
 * `min + n·step` grid the browser enforces — so stepUp() snapped to the nearest
 * grid point, 21.75. That is a rise of 0.05 in, not a step of 0.25. 0.05 in is
 * 0.13 cm; the permalink stores one decimal of a centimetre, so it re-encoded
 * to 55.2 — the value it started from — and the re-render put 21.7 back.
 *
 * Three separately reasonable decisions produced it: round the display to one
 * decimal, store the slug to one decimal, offer a quarter-inch step. None is
 * wrong alone. The bug lives in the arithmetic BETWEEN them, which is why no
 * test covering any one of them would have caught it, and why this file tests
 * the whole round trip instead.
 *
 * THE RULE: one press moves the number the reader can see by exactly one digit
 * of the precision they can see, and that movement survives being stored.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { decodeCustom, encodeCustom } from '../custom-bag.mjs';
import { createUnits } from '../units.mjs';

/** The step the editor renders. Read from source, so the guard tracks the
 *  page rather than a copy of its value. */
const STEP = (() => {
  const src = readFileSync('src/pages/check.astro', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const m = src.match(/const step = ([0-9.]+)\s*;/);
  assert.ok(m, 'the custom editor no longer declares a single numeric step');
  return Number(m[1]);
})();

/** What the browser does to `value` when the up arrow is pressed: snap to the
 *  next member of the `min + n·step` grid, which is NOT the same as adding
 *  step when the value is off-grid. That difference is the entire bug. */
const stepUp = (value, min = 1) => {
  const n = Math.floor((value - min) / STEP + 1e-9) + 1;
  return +(min + n * STEP).toFixed(10);
};

describe('the step matches the precision the reader sees', () => {
  test('one press changes the displayed number by one digit', () => {
    for (const unit of ['cm', 'in']) {
      const U = createUnits({ storage: null, server: true });
      U.set(unit);
      for (const cm of [55.2, 40, 23.4, 16.5, 33.7, 61]) {
        const shown = U.len(cm);
        /* Compared with a tolerance, not for equality: 21.8 - 21.7 is
           0.10000000000000142 in binary floating point. My first version
           asserted exact equality and failed on correct code, which is the
           kind of test that gets deleted rather than trusted. */
        assert.ok(
          Math.abs(stepUp(shown) - shown - STEP) < 1e-9,
          `${unit}: stepping ${shown} moved it by ${(stepUp(shown) - shown).toFixed(4)}, not ${STEP} — the displayed value is off the step grid`
        );
      }
    }
  });

  test('the displayed value is always ON the grid the browser enforces', () => {
    /* The precondition for the test above, stated separately so a failure says
       which half broke. len() rounds to one decimal; the grid is min + n·step.
       They agree only while step is that same one decimal. */
    for (const unit of ['cm', 'in']) {
      const U = createUnits({ storage: null, server: true });
      U.set(unit);
      for (const cm of [55.2, 40, 23.4, 16.5, 33.7, 61]) {
        const shown = U.len(cm);
        const offGrid = Math.abs(((shown - 1) / STEP) % 1);
        assert.ok(
          offGrid < 1e-6 || Math.abs(offGrid - 1) < 1e-6,
          `${unit}: ${shown} is not a member of the 1 + n×${STEP} grid`
        );
      }
    }
  });
});

describe('a step survives the permalink', () => {
  test('stepping up then storing yields a different bag', () => {
    /* THE FAILURE FRANK SAW. The old step produced a value that re-encoded to
       the byte-identical slug, so the panel redrew from unchanged state and the
       press looked ignored. A step that cannot change the stored trip is not a
       step. */
    for (const unit of ['cm', 'in']) {
      const U = createUnits({ storage: null, server: true });
      U.set(unit);
      for (const cm of [55.2, 40, 23.4, 16.5]) {
        const before = encodeCustom({ shape: 'suitcase', cm: [cm, 40, 23] });
        const stepped = U.toCm(stepUp(U.len(cm)));
        const after = encodeCustom({ shape: 'suitcase', cm: [stepped, 40, 23] });
        assert.notEqual(
          after,
          before,
          `${unit}: stepping ${U.len(cm)} re-encoded to the same slug ${before}`
        );
        assert.ok(decodeCustom(after), `${after} does not decode`);
      }
    }
  });

  test('and the reader sees the number they stepped to', () => {
    /* Round trip the other way: what comes back out of the slug must be what
       the arrow put in, or the field visibly snaps back. */
    for (const unit of ['cm', 'in']) {
      const U = createUnits({ storage: null, server: true });
      U.set(unit);
      const target = stepUp(U.len(55.2));
      const slug = encodeCustom({ shape: 'suitcase', cm: [U.toCm(target), 40, 23] });
      assert.equal(U.len(decodeCustom(slug).cm[0]), target, `${unit}: ${slug} redisplays differently`);
    }
  });
});
