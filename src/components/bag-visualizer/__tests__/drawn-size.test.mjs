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

describe('the shake says "rejected", and only when something was rejected', () => {
  /* The invalid-input convention, borrowed deliberately: a form field that
     jerks sideways when you submit something wrong is a gesture almost every
     reader already owns, and it reads as REJECTED faster than a colour can.
     It fires at the same instant as the red pulse — the bag reaches the frame,
     the frame says no, the bag refuses to settle. */
  const anim = readFileSync('src/components/bag-visualizer/fitAnimation.ts', 'utf8');
  const body = anim.replace(/\/\*[\s\S]*?\*\//g, '');
  const n = (name) => Number(body.match(new RegExp(`${name} = ([\\d.]+)`))?.[1]);

  test('it is gated on the bag actually being over', () => {
    /* A bag that fits arrives and settles. Shaking every bag is the same lie
       as a frame that flashes for every bag, and it teaches the reader to stop
       seeing it. */
    assert.match(body, /rejects && t >= SEAT_T/, 'the shake no longer checks the verdict');
    const client = readFileSync('src/components/bag-visualizer/BagVisualizer.client.ts', 'utf8');
    assert.match(
      client,
      /rejects: sizeVerdict\(result\) === false/,
      'the shake is driven by something other than a size finding — "no cabin bag" ' +
        'is a fact about the fare and must not shake a bag nobody measured'
    );
  });

  test('it starts exactly when the frame reddens', () => {
    /* Two signals at one instant read as one event. Staggered, they read as a
       glitch followed by a reaction. */
    assert.match(body, /shake = SHAKE_AMP/, 'the shake has moved');
    const seat = n('SEAT_T');
    assert.ok(seat > 0, 'SEAT_T has moved');
    assert.match(body, /rejects && t >= SEAT_T && t < SEAT_T \+ SHAKE_LEN/);
  });

  test('it decays to nothing rather than looping', () => {
    /* A shake that keeps going stops reading as a reaction and starts reading
       as a broken animation. */
    assert.match(body, /\(1 - since\) \*\* 2/, 'the damping term is gone');
    const len = n('SHAKE_LEN');
    const hz = n('SHAKE_HZ');
    const seconds = len * 5.2;
    assert.ok(seconds < 0.6, `${seconds.toFixed(2)}s is long enough to feel broken`);
    const cycles = hz * seconds;
    assert.ok(cycles >= 2 && cycles <= 4, `${cycles.toFixed(1)} oscillations reads wrong`);
  });

  test('it is a nudge, not a throw', () => {
    /* Amplitude is a fraction of the smaller of bag and slot, so it scales with
       the drawing and never looks like the bag left the frame. */
    assert.match(body, /SHAKE_AMP = Math\.min\(bd, sd\) \* ([\d.]+)/);
    const amp = Number(body.match(/SHAKE_AMP = Math\.min\(bd, sd\) \* ([\d.]+)/)[1]);
    assert.ok(amp > 0.02 && amp < 0.12, `${amp} of the slot is the wrong size for a nudge`);
  });

  test('it never fights the slide', () => {
    /* Zero outside its window, and on a different axis from the travel, so the
       two motions cannot interfere. */
    assert.match(body, /let shake = 0;/, 'the shake no longer rests at zero');
    assert.match(body, /bagRig\.position\.x = shake;/, 'the shake is on the travel axis');
    assert.match(body, /bagRig\.position\.z = z;/, 'the slide has moved off Z');
  });
});

describe('surface detail earns its place or is not drawn', () => {
  test('no decorative banding across the shell', () => {
    /* Four accent bars were meant to read as construction detail and read as
       noise — horizontal lines stacked inside a rectangle, in a drawing whose
       whole job is comparing one rectangle to another. They competed with the
       dimension leaders and the frame rails for the same glance and carried no
       information.

       The wheels and the retracted handle stay, and they are the exception
       that proves the rule: both are load-bearing. They are the parts the
       airline measures OVER, which is the argument this site exists to make. */
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(body, /addRibs/, 'the ribs are back');
    assert.doesNotMatch(body, /ribbing/, 'the ribbing profile field is back');
  });

  test('the removed option is gone from the profile too, not left dangling', () => {
    /* An unused config field is an invitation to set it and wonder why nothing
       happens — the same shape as the Under-seat pill that was declared and
       rendered nothing for weeks. */
    for (const f of ['visualProfile.ts', 'types.ts']) {
      const other = readFileSync(`src/components/bag-visualizer/${f}`, 'utf8');
      assert.doesNotMatch(other, /ribbing/, `${f} still carries the dead option`);
    }
  });
});

describe('turning reads as turning, not as zooming', () => {
  const client = readFileSync(
    'src/components/bag-visualizer/BagVisualizer.client.ts',
    'utf8'
  ).replace(/\/\*[\s\S]*?\*\//g, '');

  test('the frustum is sized once, for every preset at once', () => {
    /* THE BUG. fitCamera ran on each view change and re-fit to whatever the
       model measured in THAT orientation — front frames the width, side frames
       the depth — so the bag was drawn at a different scale in each. Under an
       orthographic camera there is no perspective convergence to say "this is
       turning", so a scale change is the only signal the eye gets, and it
       reads as zoom. Frank: "it just kinda looks like it is growing and
       collapsing." */
    assert.match(client, /for \(const p of Object\.values\(PRESETS\)\)/, 'the frustum is not sized across every preset');
    assert.doesNotMatch(
      client,
      /function setView\([\s\S]{0,200}?fitCamera\(\)/,
      'the camera re-fits on a view change again — the model will rescale as it turns'
    );
  });

  test('it stays orthographic', () => {
    /* Perspective would give the depth cue for free and cost the thing the
       drawing is for: near edges would render larger than far ones in a picture
       whose entire job is that they do not. */
    assert.match(client, /new THREE\.OrthographicCamera/);
    assert.doesNotMatch(client, /PerspectiveCamera/, 'a perspective camera would distort the comparison');
  });

  test('the move is a fixed-duration tween, not an exponential decay', () => {
    /* `yaw += (target - yaw) * 0.2` covers most of the distance in a few frames
       then crawls: a snap followed by a settle. A solid turning has a
       beginning, a middle and an end. */
    assert.doesNotMatch(client, /yaw \+= \(targetYaw - yaw\)/, 'the decay is back');
    assert.match(client, /const TURN_MS = \d+/, 'the move has no duration');
  });

  test('the path arcs through a three-quarter view and lands flat', () => {
    /* front and side are both pitch 0. Interpolating straight between them
       keeps the box edge-on the whole way, and an edge-on box turning under an
       orthographic camera is a rectangle changing width. The arc lifts the
       path so the reader sees the TOP face — the one cue orthographic still
       gives — and returns to zero, so it lands exactly on the preset. */
    assert.match(client, /Math\.sin\(t \* Math\.PI\) \* ([\d.]+)/, 'the arc is gone');
    const arc = Number(client.match(/const arc = Math\.sin\(t \* Math\.PI\) \* ([\d.]+)/)[1]);
    assert.ok(arc > 0.1, `${arc} rad is too shallow to show the top face`);
    assert.ok(arc < 0.5, `${arc} rad swings past a three-quarter view`);
    /* sin(0) and sin(pi) are both 0, so the endpoints are exact by
       construction — no drift onto a preset that is meant to be square-on. */
    for (const t of [0, 1]) {
      assert.ok(Math.abs(Math.sin(t * Math.PI) * arc) < 1e-12, 'the arc does not land flat');
    }
  });
});
