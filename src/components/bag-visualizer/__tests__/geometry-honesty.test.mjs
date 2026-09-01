/* THE DRAWING MAY NOT CONTRADICT THE NUMBER.
 *
 * This site's whole argument is that a manufacturer's packing figure is not
 * what an airline measures — `external_cm` includes the wheels and the handle,
 * and the dimension ladder ranks maker_overall above maker_packing for exactly
 * that reason. A drawing that then adds height for a handle double-counts the
 * gap, and a bag that genuinely clears the limit gets rendered poking out of
 * the gate sizer.
 *
 * Two bugs of that shape shipped in the first build of the visualiser, and
 * neither could fail — they were geometry, and geometry has no assertions:
 *
 *   1. The spinner handle sat at `max + height * 0.055`. On a 55 cm bag that
 *      is 3 cm of handle standing above the stated height.
 *   2. The gate sizer's posts were centred ON the limit plane rather than
 *      outside it, so the clear opening measured 2 x tube LESS than the
 *      published box while the outer silhouette measured 2 x tube MORE. About
 *      0.6 cm on a typical carrier — twice EPS_CM, the tolerance the engine is
 *      careful to a tenth of a centimetre about.
 *
 * These are source-level guards rather than render tests: Three.js needs a
 * WebGL context and this suite runs in plain node. They are deliberately dumb
 * and deliberately specific — they catch the exact regression, and they name
 * it in the failure message so the next person does not have to rediscover
 * why it matters. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const geometry = readFileSync('src/components/bag-visualizer/createBagGeometry.ts', 'utf8');
const sizer = readFileSync('src/components/bag-visualizer/createGateSizer.ts', 'utf8');
const stage = readFileSync('src/components/bag-visualizer/BagVisualizer.astro', 'utf8');
const client = readFileSync('src/components/bag-visualizer/BagVisualizer.client.ts', 'utf8');

/** Strip comments — they discuss the old code on purpose. */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('nothing is drawn outside the bag it claims to be', () => {
  test('no part is positioned ABOVE the body top', () => {
    /* `max` is the body's top face. Anything at `max + ...` is taller than the
       stated height, which is the number the verdict was computed from. */
    const offenders = [...code(geometry).matchAll(/position\.set\([^)]*\bmax\s*\+[^)]*\)/g)].map(
      (m) => m[0].replace(/\s+/g, ' ')
    );
    assert.deepEqual(
      offenders,
      [],
      'a part sits above the body top, so the bag is drawn taller than external_cm — ' +
        'the one thing this drawing must never do:\n  ' + offenders.join('\n  ')
    );
  });
});

describe('the gate sizer opening IS the published allowance', () => {
  test('posts and rails are offset outward by their own radius', () => {
    const src = code(sizer);
    assert.match(
      src,
      /const hw = w \/ 2 \+ tube/,
      'the post centres are back on the limit plane — the clear opening will be ' +
        '2 x tube smaller than the airline publishes'
    );
    assert.match(src, /const hd = d \/ 2 \+ tube/, 'same for depth');
    assert.match(
      src,
      /const railY = h \+ rr/,
      'the top frame is the slot the bag must pass through; it has to clear h'
    );
  });

  test('the deck sits below the limit plane, so the full height is clear', () => {
    assert.match(
      code(sizer),
      /base\.position\.set\(0, -/,
      'the deck is inside the opening, eating height the airline allows'
    );
  });
});

describe('the stage is a height, not a ratio of the window', () => {
  test('data-stage does not derive its height from its width', () => {
    /* `aspect-[4/5] w-full` asked for 1.25x the CARD WIDTH — hundreds of pixels
       more than the scene ever uses — then argued with a min-height, a
       breakpoint min-height and a max-height. The canvas is inset-0 inside it
       and filled all of it. The camera was fitting correctly into a container
       that was simply too tall, which is why tuning the camera never fixed it.
       A gate sizer is 55 x 40 cm; its size does not depend on the reader's
       window width. */
    const tag = stage.match(/data-stage[\s\S]{0,400}?>/)?.[0] ?? '';
    assert.ok(tag, 'data-stage element not found — this guard needs rewriting');
    assert.doesNotMatch(
      tag,
      /aspect-\[/,
      'data-stage derives its height from its width again; state a height instead'
    );
  });
});

describe('the model is centred in the frustum', () => {
  test('content.position centres all three axes', () => {
    /* An orthographic frustum symmetric about the origin looking at (0,0,0)
       puts "the ground" in the MIDDLE of the frame. Pinning y to 0 left the
       lower half empty and clipped the top at the same time. */
    const call = code(client).match(/content\.position\.set\(([\s\S]*?)\);/)?.[1] ?? '';
    assert.ok(call, 'content.position.set not found — this guard needs rewriting');
    const args = call.split(',').map((s) => s.trim());
    assert.equal(args.length, 3);
    assert.notEqual(args[1], '0', 'the Y axis is pinned to 0 again — the model will sit high');
    assert.match(args[1], /layoutBox/, 'Y should be centred on the same box as X and Z');
  });
});
