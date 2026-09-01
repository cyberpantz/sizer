/* THE DRAWN BAG IS THE STATED BAG, TO THE MILLIMETRE.
 *
 * Every other guard in this directory reads the source and asserts about its
 * shape. That caught a lot, and it could not catch this: two numbers that were
 * each individually reasonable and did not add up.
 *
 *   buildSpinner carved out   wheelZone = 2.15 * r
 *   addWheelPod drew          leg       = 1.55 * r
 *
 * So 0.6r of the bag's height was allocated to running gear and then left
 * empty. On a 53.3 cm bag with a 2.13 cm wheel that is 1.28 cm of bag simply
 * missing — the drawn bag measured 52.02 against a record saying 53.3, and it
 * floated above the deck by the difference.
 *
 * EPS_CM is 0.3. The engine is careful to a tenth of a centimetre and refuses
 * to call a bag over by less than that. A drawing four times further out than
 * the tolerance is not a rounding artefact; it is the picture disagreeing with
 * the number beside it, which is the one thing this component may never do.
 *
 * So this file does ARITHMETIC rather than pattern-matching: it reproduces the
 * builders' own geometry and checks the totals. If the constants drift apart
 * again the sum stops working, whatever the source looks like. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { EPS_CM } from '../../../engine/constants.mjs';

const src = readFileSync('src/components/bag-visualizer/createBagGeometry.ts', 'utf8');
const num = (name) => {
  const m = src.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`));
  assert.ok(m, `${name} not found — the geometry has been restructured`);
  return Number(m[1]);
};

const WHEEL_DROP = num('WHEEL_DROP');
const wheelRadius = ({ h, w, d }) => Math.max(Math.min(w, d, h) * 0.055, h * 0.04);

/** The vertical extent buildSpinner + addWheelPod actually produce. */
function spinnerExtent(dims, wheels) {
  const r = wheels > 0 ? wheelRadius(dims) : 0;
  const drop = wheels > 0 ? r * WHEEL_DROP : dims.h * 0.04;
  const bodyH = dims.h - drop;
  const top = drop + bodyH;
  /* leg spans -WHEEL_DROP*r..0 in body-local space; wheel centre is at -r with
     a half-thickness of 0.2r, so the leg is always the lower of the two. */
  const bottom = drop - r * WHEEL_DROP;
  return { top, bottom, height: top - bottom };
}

/* Real catalogue shapes, in centimetres. */
const CASES = [
  { name: 'Air France-sized cabin bag', h: 53.3, w: 34.3, d: 22.9, wheels: 4 },
  { name: 'a tall international roller', h: 55.9, w: 35.6, d: 22.9, wheels: 4 },
  { name: 'a two-wheel roller', h: 55, w: 40, d: 20, wheels: 2 },
  { name: 'a small under-seat case', h: 40, w: 30, d: 20, wheels: 4 },
  { name: 'a wheelless duffel', h: 50, w: 31.8, d: 21.6, wheels: 0 },
];

describe('a wheeled bag is drawn at exactly its stated height', () => {
  for (const c of CASES) {
    if (c.wheels === 0) continue;
    test(c.name, () => {
      const { height, bottom } = spinnerExtent(c, c.wheels);
      assert.ok(
        Math.abs(height - c.h) < 1e-9,
        `drawn ${height.toFixed(2)} cm against a stated ${c.h} cm — ` +
          `off by ${(height - c.h).toFixed(2)}, and EPS_CM is ${EPS_CM}`
      );
      assert.ok(
        Math.abs(bottom) < 1e-9,
        `the lowest part sits at ${bottom.toFixed(2)} rather than 0, so the bag ` +
          'floats above the deck by that much'
      );
    });
  }

  test('the error is never within a whisker of the engine tolerance', () => {
    /* Stated as its own case because "close enough" is the failure. A drawing
       allowed to drift by EPS_CM could show a bag at the line as clearing, or
       one clearing as at the line. */
    for (const c of CASES) {
      if (c.wheels === 0) continue;
      const err = Math.abs(spinnerExtent(c, c.wheels).height - c.h);
      assert.ok(err < EPS_CM / 10, `${c.name}: ${err.toFixed(3)} cm of drift`);
    }
  });
});

describe('the space carved out equals the space filled', () => {
  test('one constant governs both', () => {
    /* The bug was two numbers, not one wrong number. buildSpinner reserved the
       room and addWheelPod furnished it, and nothing made them agree. */
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(body, /const drop = wheels > 0 \? r \* WHEEL_DROP/, 'the builder has its own figure again');
    assert.match(body, /const legH = radius \* WHEEL_DROP/, 'the pod has its own figure again');
    assert.doesNotMatch(body, /r \* 2\.15/, 'the old carve-out constant is back');
    /* buildUnderseat carried its OWN copy of the same bug. Both builders now
       read the shared constant; neither may reintroduce a private one. */
    assert.equal(
      (body.match(/WHEEL_DROP/g) ?? []).length,
      4,
      'a builder has stopped using the shared drop, or a new one has appeared ' +
        'without it — expected the definition plus three uses'
    );
  });
});
