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

describe('the dimension lines are drawn the way a drawing is drawn', () => {
  test('the arrowhead is anchored at its tip, not its middle', () => {
    /* The marker path points at (10, 5). refX="5" anchors the marker's MIDDLE
       to the line end, so half an arrowhead hung past it and the arrows sat
       somewhere other than where the measurement stops. */
    const marker = stage.match(/<marker id="viz-arrow"[^>]*>/)?.[0] ?? '';
    assert.ok(marker, 'the viz-arrow marker has moved; this guard needs rewriting');
    assert.match(marker, /refX="10"/, 'the arrowhead is anchored by its middle again');
  });

  test('the witness ticks are perpendicular to the measurement, not collinear', () => {
    /* They used to run along the same axis, 8% past each end — so the visible
       stroke continued BEYOND the arrowheads and the arrows read as landing
       short. A dimension line terminates at its arrows; the ticks cross it. */
    const src = readFileSync('src/components/bag-visualizer/projectMeasurements.ts', 'utf8');
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(
      body,
      /ext1End|ext2End/,
      'the collinear extension points are back; the arrows will sit inside the line ends'
    );
    assert.match(body, /const nx = -vy \/ len/, 'the screen-space perpendicular is gone');
  });
});

describe('a box-less element is never observed', () => {
  test('IntersectionObserver watches the stage, not the display:contents root', () => {
    /* THE REGRESSION THIS EXISTS FOR. Splitting the visualiser across two
       columns made its root `display: contents`, which generates NO BOX — no
       layout, a 0 x 0 bounding rect, and isIntersecting: false forever. The
       render loop gates on that flag and returns before scheduling the next
       frame, so the view buttons went dead: wired correctly, firing correctly,
       setting their targets correctly, and never given another frame to turn
       in.
       Nothing failed. Nothing logged. The canvas simply stopped. */
    const src = code(client);
    assert.match(src, /io\.observe\(stage\)/, 'the observer is back on a box-less element');
    assert.doesNotMatch(
      src,
      /io\.observe\(root\)/,
      'root is display:contents and reports isIntersecting:false forever — the loop will die'
    );
  });

  test('the root really is display:contents, so the rule above still applies', () => {
    assert.match(
      stage,
      /class="bag-visualizer contents"/,
      'the root no longer uses display:contents; this guard may be obsolete'
    );
  });
});

describe('the slide animation is visible from the view it opens in', () => {
  test('the opening view is not the dead-on front elevation', () => {
    /* THE BUG THIS EXISTS FOR. The bag slides into the sizer along Z. The
       camera is ORTHOGRAPHIC and looks straight down -Z, so from a dead-on
       front view that motion produces no change on screen at all — no
       parallax, no scale, nothing. The animation ran perfectly and could not
       be seen from the view the page opened in.

       `front` stays dead-on, because a drafting elevation is exactly what you
       want when reading a height off a face. The OPENING view is the one that
       has to be angled. */
    const src = code(client);
    const presets = src.match(/const PRESETS[\s\S]*?\};/)?.[0] ?? '';
    assert.ok(presets, 'PRESETS has moved; this guard needs rewriting');

    const d = presets.match(/default:\s*\{\s*yaw:\s*(-?[\d.]+),\s*pitch:\s*(-?[\d.]+)/);
    assert.ok(d, 'there is no `default` preset — the opening view is an orthogonal one again');
    assert.ok(
      Math.abs(+d[1]) > 0.15,
      `opening yaw ${d[1]} is too square: the depth axis has no screen direction to move along`
    );
    assert.ok(Math.abs(+d[2]) > 0.1, `opening pitch ${d[2]} reads the top as an edge, not a face`);

    assert.match(presets, /front:\s*\{\s*yaw:\s*0,\s*pitch:\s*0/, 'Front must stay a true elevation');
  });

  test('the component opens on that view, not on front', () => {
    assert.match(code(client), /setView\('default'\)/, 'mount no longer opens on the default view');
  });

  test('no button claims to be the opening view', () => {
    /* Pressing "Front" while showing a three-quarter angle would make the
       control lie about what you are looking at — the same rule as a hover
       state that imitates pressed. */
    assert.doesNotMatch(
      stage,
      /data-view="default"/,
      'the opening angle is exposed as a button; it is a starting point, not a preset'
    );
  });
});

describe('the frame answers on arrival, not during the approach', () => {
  const anim = readFileSync('src/components/bag-visualizer/fitAnimation.ts', 'utf8');
  const body = anim.replace(/\/\*[\s\S]*?\*\//g, '');

  test('the alarm is zero while the bag is still travelling', () => {
    /* A gate sizer is a slot, not a continuous gauge — it answers when the bag
       is IN it. A frame reddening mid-approach would be pre-judging: the
       drawing stating its claim before the measurement it rests on was taken. */
    const seat = Number(body.match(/SEAT_T = ([\d.]+)/)?.[1]);
    const lift = Number(body.match(/LIFT_T = ([\d.]+)/)?.[1]);
    assert.ok(seat && lift, 'the seat/lift phase marks have moved');
    assert.ok(seat < lift, 'the bag must arrive before it leaves');
    assert.match(body, /t >= SEAT_T && t < LIFT_T/, 'the alarm no longer starts at arrival');
  });

  test('the reset is quicker than the pulse', () => {
    /* A verdict should land and leave cleanly. A slow fade out reads as the
       frame being unsure of what it just said. */
    const pulse = Number(body.match(/PULSE_LEN = ([\d.]+)/)?.[1]);
    const rampOut = Number(body.match(/ALARM_OUT = ([\d.]+)/)?.[1]);
    assert.ok(pulse && rampOut, 'the pulse timings have moved');
    assert.ok(rampOut < pulse, 'the frame lingers coloured after the bag has gone');
  });

  test('it settles to a sustained hold rather than blinking', () => {
    /* A reader who looks over mid-dwell must find a STATED verdict, not a
       flicker they have to wait out. */
    const hold = Number(body.match(/HOLD = ([\d.]+)/)?.[1]);
    assert.ok(hold > 0.5, `a hold of ${hold} lets the verdict fade out between beats`);
    assert.ok(hold < 1, 'with no swell above the hold there is no pulse at all');
  });

  test('it answers both ways — green for a pass, red for a refusal', () => {
    /* The first version only reddened on failure, so a bag that sailed through
       got a frame that never reacted: the reader watched it slide in and
       nothing happened. Silence is a poor way to say yes. */
    const src = code(client);
    assert.match(src, /bandHex\(fits \? 'clears' : 'wont'\)/, 'the frame only knows one answer');
  });

  test('an unanswered leg arms nothing at all', () => {
    /* A frame that went green because nobody checked would be the worst thing
       on this page. */
    const src = code(client);
    assert.match(src, /fits !== null && sizer/, 'an unresearched carrier can now colour the frame');
  });

  test('a refusal is louder than an approval', () => {
    const strength = code(client).match(/alarmStrength = fits \? ([\d.]+) : ([\d.]+)/);
    assert.ok(strength, 'the asymmetry has gone');
    assert.ok(+strength[1] < +strength[2], 'approval must not shout louder than refusal');
  });

  test('the pulse is well under the flash threshold', () => {
    /* Two beats over ~600ms is about 1.6 Hz. The photosensitive-seizure
       guidance is three flashes a second; this must never be tuned past half
       of it without revisiting that. */
    const len = Number(body.match(/PULSE_LEN = ([\d.]+)/)?.[1]);
    assert.ok(len, 'PULSE_LEN has moved');
    /* sin squared has period pi, so sin(s * pi * 1.5) squared is 1.5 peaks
       across the pulse. Guidance is three flashes a second. */
    const hz = 1.5 / (len * 5.2);
    assert.ok(hz < 1.5, `${hz.toFixed(2)} Hz is too close to the flash threshold`);
  });

  test('reduced motion gets the finding without the flash', () => {
    /* The information is not the animation. A reader who asked for less
       movement has not asked for less information — the frame sits red. */
    const src = code(client);
    assert.match(src, /prefers-reduced-motion/, 'the alarm ignores the motion preference');
    assert.match(
      src,
      /if \(alarmMaterial && reducedMotion\) \{\s*alarmMaterial\.color\.copy\(FRAME_BASE\)\.lerp\(FRAME_ALARM/,
      'reduced motion loses the verdict instead of stating it statically'
    );
  });
});

describe('the verdict is stated above the drawing, in words', () => {
  test('the badge sits before the stage in the DOM', () => {
    /* The verdict existed only as a sentence UNDER the stage, which is the
       wrong order: a reader scanning the column met a 3D drawing before being
       told what it was showing, and "No cabin bag" — the strongest claim this
       site makes — arrived last. */
    const badge = stage.indexOf('data-viz-badge');
    const shell = stage.indexOf('data-viz-shell');
    assert.ok(badge > 0, 'there is no badge above the stage');
    assert.ok(badge < shell, 'the badge is rendered after the canvas it labels');
  });

  test('the label comes from resultLabel(), not a second ladder', () => {
    /* The four cases that are NOT a band — Ceased, No cabin bag, Unknown, No
       answer — are worded by the same function the shelf and the check page
       use. A private copy would be a second chance to disagree. */
    assert.match(code(client), /badge\.textContent = resultLabel\(result\)/);
  });

  test('a finding about the FARE does not borrow a size colour', () => {
    /* "This fare includes no cabin bag at any size" is a fact about the
       ticket, not a measurement of the bag; "we have not researched this" is
       not a mild version of anything. Both get the neutral chip, so red keeps
       meaning "your bag is too big". */
    const src = code(client);
    assert.match(
      src,
      /const bandable = !result\.no_cabin_bag && !result\.unknown && !result\.not_flying/,
      'the badge is tinting non-size findings with a band colour'
    );
  });
});
