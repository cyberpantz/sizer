/* Band ladder. Node's built-in runner — no dependencies, because a test suite
   that needs an install is a test suite that stops being run.

   Two kinds of test here, deliberately:
     - REGRESSIONS, one per bug we actually shipped. Each names the bug.
     - PROPERTIES, which hold for every input. Those catch the next bug, and
       every bug so far has come from a case nobody thought to write down. */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, band, BANDS, EPS_CM, gambleCeiling } from '../fit.mjs';

describe('band ladder', () => {
  test('is exhaustive — no delta falls through at any strictness', () => {
    for (let st = 1; st <= 10; st++) {
      for (let d = -20; d <= 20; d += 0.05) {
        const b = band(+d.toFixed(2), st);
        assert.ok(BANDS.includes(b), `delta ${d.toFixed(2)} st ${st} gave ${b}`);
      }
    }
  });

  test('is monotonic — a stricter carrier is never more permissive', () => {
    const rank = (b) => BANDS.indexOf(b);   // clears < line < gamble < wont
    for (let d = -5; d <= 8; d += 0.1) {
      let prev = -1;
      for (let st = 1; st <= 10; st++) {
        const r = rank(band(+d.toFixed(2), st));
        assert.ok(r >= prev, `delta ${d.toFixed(1)}: st ${st} is more permissive than st ${st - 1}`);
        prev = r;
      }
    }
  });

  test('is monotonic in delta — a bigger bag never scores better', () => {
    const rank = (b) => BANDS.indexOf(b);
    for (let st = 1; st <= 10; st++) {
      let prev = -1;
      for (let d = -5; d <= 8; d += 0.1) {
        const r = rank(band(+d.toFixed(2), st));
        assert.ok(r >= prev, `st ${st}: delta ${d.toFixed(1)} scores better than a smaller bag`);
        prev = r;
      }
    }
  });

  test('a bag comfortably inside clears everywhere', () => {
    for (let st = 1; st <= 10; st++) assert.equal(band(-5, st), 'clears');
  });

  test('a bag far over is refused even by the laxest carrier', () => {
    for (let st = 1; st <= 10; st++) assert.equal(band(8, st), 'wont');
  });
});

describe('regressions — each of these shipped once', () => {
  /* Original rules put WON'T at strictness >= 8 and GAMBLE at <= 5, leaving
     6 and 7 matching nothing. A bag 2cm over on Lufthansa fell through to
     CLEARS while the prose claimed it was refused. */
  test('bug 1: no fall-through gap at strictness 6-7', () => {
    for (const st of [6, 7]) {
      assert.notEqual(band(2, st), 'clears', `st ${st}: 2cm over must not read as a clean pass`);
      assert.equal(band(2, st), 'wont');
    }
  });

  /* Travelpro Maxlite 5 International is built to 55x40x20 but published in
     inches; 21.75in -> 55.245cm. It failed seven carriers, Iberia by 0.01cm. */
  test('bug 2: a rounding artefact is never a failure', () => {
    for (let st = 1; st <= 10; st++) {
      assert.ok(['line', 'clears'].includes(band(0.01, st)), `st ${st} failed a bag by 0.01cm`);
      assert.ok(['line', 'clears'].includes(band(EPS_CM, st)), `st ${st} failed a bag at exactly EPS`);
    }
  });

  test('bug 2b: over-but-inside-EPS never reads as a clean pass', () => {
    for (let st = 1; st <= 10; st++) {
      assert.equal(band(0.1, st), 'line', `st ${st} called an over bag "clears"`);
    }
  });

  /* A flat 3cm ceiling ignored strictness: 3.1cm over read as WON'T on
     Southwest, which does not own a gate sizer, exactly as on Ryanair. */
  test('bug 3: the ceiling scales with enforcement', () => {
    assert.equal(band(3.1, 3), 'gamble', 'Southwest (st3) should still show a 3.1cm overage');
    assert.equal(band(3.1, 5), 'wont');
    assert.equal(band(3.1, 9), 'wont');
    assert.notEqual(gambleCeiling(3), gambleCeiling(5), 'st3 and st5 must differ');
    assert.notEqual(gambleCeiling(6), gambleCeiling(9), 'st6 and st9 must differ');
  });

  test('bug 3b: strict carriers get no fuzz at all', () => {
    for (const st of [8, 9, 10]) {
      assert.equal(gambleCeiling(st), 0);
      assert.equal(band(0.4, st), 'wont', `st ${st} must treat the published number as the number`);
    }
  });
});

describe('at the line', () => {
  test('no margin on a measuring carrier reads as at-the-line', () => {
    assert.equal(band(-1, 7), 'line');
    assert.equal(band(-1, 6), 'line');
  });

  test('no margin on a carrier that does not measure is a clean pass', () => {
    assert.equal(band(-1, 3), 'clears');
    assert.equal(band(-1, 5), 'clears');
  });
});

describe('configurability', () => {
  test('thresholds can be overridden without forking', () => {
    const strictEverywhere = createEngine({ gambleCeiling: () => 0 });
    assert.equal(strictEverywhere.band(1, 1), 'wont');
    assert.equal(band(1, 1), 'gamble', 'the default engine must be unaffected');
  });

  test('an injected EPS still cannot be bypassed', () => {
    const loose = createEngine({ EPS_CM: 2 });
    assert.equal(loose.band(1.5, 10), 'line');
    assert.equal(band(1.5, 10), 'wont');
  });
});

describe('unknown strictness fails safe', () => {
  /* `null <= 3` is true in JavaScript, so an unresearched carrier once received
     the most permissive ceiling available — we would have encouraged an oversize
     bag onto an airline we know nothing about. The asymmetry matters: an
     over-cautious verdict costs convenience, an over-confident one costs a gate
     fee and the bag. */
  test('a missing strictness is treated as strict, not lax', () => {
    for (const st of [null, undefined, NaN, 'nine', {}]) {
      assert.equal(gambleCeiling(st), 0, `${String(st)} produced a permissive ceiling`);
      assert.equal(band(2, st), 'wont', `${String(st)} let a 2cm overage through`);
    }
  });

  test('a rounding artefact is still forgiven even when strictness is unknown', () => {
    assert.equal(band(0.1, null), 'line', 'failing safe must not resurrect the 0.01cm bug');
  });

  test('a known lax carrier is still lax — the guard has not flattened the curve', () => {
    assert.equal(gambleCeiling(3), 5.0);
    assert.equal(band(2, 3), 'gamble');
  });
});
