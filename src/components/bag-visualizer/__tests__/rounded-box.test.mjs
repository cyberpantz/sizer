/* THE FIRST TEST IN THIS DIRECTORY THAT MEASURES A REAL MESH.
 *
 * Every other guard here reads the source and asserts about its shape. Between
 * them they caught a great deal today, and they could not catch this, because
 * the source was entirely reasonable and the LIBRARY did something else:
 *
 *   ExtrudeGeometry adds its bevel OUTSIDE the profile and outside the depth.
 *   Ask for 35.1 x 55.1 x 23.1 with a 2.31 corner radius, get
 *   37.32 x 57.32 x 25.32 — every face 1.11 cm proud, every axis 2.22 cm over.
 *
 * So every bag on the site was drawn oversize by twice the bevel, and a bag
 * clearing its airline by 0.8 cm rendered poking out of the frame: the verdict
 * said Tight and the picture said no. drawn-size.test.mjs missed it because it
 * reproduces roundedBox's ARGUMENTS rather than the mesh it returns — a model
 * of the intent, which is exactly where the bug was not.
 *
 * three is pure JavaScript and node can strip TypeScript, so the real function
 * can be imported and the real bounding box measured. That is why roundedBox
 * lives in its own module with no local imports: so this test can reach it. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as THREE from 'three';
import { EPS_CM } from '../../../engine/constants.mjs';
import { roundedBox } from '../roundedBox.ts';

/* A hundredth of a MICRON. Not 1e-6, because the geometry is built in float32
   and 35.1 does not survive the round trip exactly — the residual is ~1.5e-6,
   which is 15 nanometres on a suitcase. The threshold has to be loose enough
   to permit float32 and tight enough that the 2.22 cm bevel error could never
   sneak back; EPS_CM / 100 is 0.003, six orders of magnitude clear of both. */
const EXACT = 1e-4;

const measure = (w, h, d, corner) => {
  const g = roundedBox(w, h, d, corner);
  g.computeBoundingBox();
  const box = g.boundingBox;
  return { size: box.getSize(new THREE.Vector3()), base: box.min.y };
};

/* Real catalogue proportions, plus the awkward ends of the range. */
const CASES = [
  ['a cabin roller', 35.1, 55.1, 23.1, 2.31],
  ['an international roller', 40, 55, 20, 2],
  ['an under-seat case', 30, 40, 20, 2],
  ['a duffel', 31.8, 50, 21.6, 3.4],
  ['something wide and shallow', 45, 20, 15, 1.5],
  ['a corner radius larger than the box', 20, 30, 12, 40],
];

describe('roundedBox is the size it was asked for', () => {
  for (const [name, w, h, d, corner] of CASES) {
    test(name, () => {
      const { size } = measure(w, h, d, corner);
      for (const [axis, got, want] of [
        ['width', size.x, w],
        ['height', size.y, h],
        ['depth', size.z, d],
      ]) {
        assert.ok(
          Math.abs(got - want) < EXACT,
          `${axis}: drew ${got.toFixed(3)} for a stated ${want} — off by ${(got - want).toFixed(3)} cm`
        );
      }
    });
  }

  test('never drifts anywhere near the engine tolerance', () => {
    /* EPS_CM is 0.3 and the old bevel error was 2.22 — seven times the number
       the engine refuses to round away. A drawing allowed that much slack can
       show a bag at the line as over, or one that is over as fitting. */
    for (const [name, w, h, d, corner] of CASES) {
      const { size } = measure(w, h, d, corner);
      const worst = Math.max(Math.abs(size.x - w), Math.abs(size.y - h), Math.abs(size.z - d));
      assert.ok(worst < EPS_CM / 100, `${name}: ${worst.toFixed(4)} cm of drift`);
    }
  });
});

describe('roundedBox sits on the floor', () => {
  test('every box starts at y = 0', () => {
    /* It used to span h/2 .. 3h/2, because the translate assumed an origin
       ExtrudeGeometry does not use. Harmless only because bagRig re-seats
       everything afterwards — which is how it hid the size error underneath
       it. Seated here, from the measured bounds rather than an assumption. */
    for (const [name, w, h, d, corner] of CASES) {
      const { base } = measure(w, h, d, corner);
      assert.ok(Math.abs(base) < EXACT, `${name}: base at ${base.toFixed(4)} rather than 0`);
    }
  });
});

describe('it degrades sensibly rather than inverting', () => {
  test('an absurd corner radius still produces the right box', () => {
    /* Clamped to a quarter of every axis, so a request for a 40 cm radius on a
       12 cm face rounds hard instead of turning the profile inside out. */
    const { size } = measure(20, 30, 12, 40);
    assert.ok(Math.abs(size.x - 20) < EXACT);
    assert.ok(Math.abs(size.z - 12) < EXACT);
  });

  test('a zero radius is a plain box, still exactly sized', () => {
    const { size, base } = measure(30, 40, 20, 0);
    assert.ok(Math.abs(size.x - 30) < 1e-3);
    assert.ok(Math.abs(size.y - 40) < 1e-3);
    assert.ok(Math.abs(size.z - 20) < 1e-3);
    assert.ok(Math.abs(base) < 1e-3);
  });
});
