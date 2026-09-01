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

  test('the alarm is spent on findings, not on our own gaps', () => {
    /* WHERE THIS LANDED, after arguing both sides.

       no_cabin_bag takes RED. It is the worst news the site delivers — your
       fare includes nothing to put in the locker, and you will be paying at
       the gate — and calm grey was wrong for it. What makes red safe here is a
       division of labour: the COLOUR carries urgency, the WORDS carry the
       claim, and "No cabin bag" cannot be misread as "your bag is too big".

       `unknown` and `not_flying` stay grey. That is the line: we do not raise
       an alarm about our OWN gap. Painting "nobody has researched this
       airline" red would cry wolf with the reader's attention and spend the
       credibility that makes the real red worth heeding. */
    const src = code(client);
    assert.match(src, /if \(result\.no_cabin_bag\) badge\.classList\.add\(\.\.\.BAND_CHIP\.wont\)/);
    assert.match(
      src,
      /result\.unknown \|\| result\.not_flying[\s\S]{0,80}border-rule/,
      'an unresearched carrier is being alarmed about as if it were a finding'
    );
  });
});

describe('the bag comes to rest centred in the slot', () => {
  const anim = readFileSync('src/components/bag-visualizer/fitAnimation.ts', 'utf8');
  const body = anim.replace(/\/\*[\s\S]*?\*\//g, '');

  test('the end position is the centre, not flush against the back', () => {
    /* It used to seat the bag's back face against the sizer's rear, which is
       what you physically do at a gate and the wrong thing for a MEASUREMENT
       drawing: in the side view Z maps to screen X, so the bag read as shoved
       against one side with all the clearance piled up on the other. That
       looks like a bag that barely made it, whatever the numbers say.

       Centred, the margin falls equally front and back — which is what the
       figures mean — and a bag too deep overhangs symmetrically rather than
       poking out of one end. */
    assert.match(body, /const endZ = 0;/, 'the bag is seated off-centre in the slot again');
    assert.doesNotMatch(
      body,
      /endZ = -\(sizerHd - bagBd\)/,
      'the flush-to-back seat is back; the side view will look lopsided'
    );
  });

  test('nothing protrudes further than the deck it stands on', () => {
    /* The entry lip sat past the front of the base and read as a stray nub
       hanging off the bottom corner in side view. */
    const src = code(sizer);
    assert.doesNotMatch(
      src,
      /lip\.position\.set\(0, [^,]+, hd \+/,
      'the lip hangs off the front of the deck again'
    );
  });
});

describe('the legend describes what is actually drawn', () => {
  test('nothing is called blue any more', () => {
    /* The caption read "Blue tint — your bag · Slate frame — the gate sizer"
       long after both stopped being true: the bag takes green or red from the
       verdict, and the frame pulses. A legend that names colours the drawing
       does not use is worse than none — a reader looking for the blue thing
       finds a red one and doubts the rest. */
    const src = stage.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    assert.doesNotMatch(src, /Blue tint/, 'the caption still names a colour nothing uses');
    assert.doesNotMatch(code(client), /Blue tint/, 'the fallback caption still names it');
  });

  test('the legend states what the frame IS, not what colour it is', () => {
    /* The frame's meaning is the claim worth making: its opening is the
       airline's published box, exactly. That is the thing no competitor draws
       and the thing the whole geometry pass was about. */
    assert.match(
      stage,
      /the opening is the box, exactly/,
      'the caption no longer says what the frame represents'
    );
  });
});

describe('the empty states are drawn, not decorated', () => {
  test('each of the three cases has its own icon', () => {
    for (const which of ['no_cabin_bag', 'linear', 'unknown']) {
      assert.match(stage, new RegExp(`data-icon="${which}"`), `${which} has no icon`);
    }
  });

  test('the icon is chosen by the same branch as the words', () => {
    /* One switch, so the picture and the sentence cannot drift apart — the
       failure mode that let a red bag sit under a "No cabin bag" label. */
    const src = code(client);
    for (const which of ['no_cabin_bag', 'linear', 'unknown']) {
      assert.match(src, new RegExp(`showIcon\\('${which}'\\)`), `${which} sets no icon`);
    }
  });

  test('they follow the icon set the rest of the interface uses', () => {
    /* Lucide's idiom: 24 grid, stroke 2, round caps and joins. The first pass
       drew them on the VISUALISER's drafting scale — hairlines on a 64 grid —
       which is right for a measured drawing and wrong for an icon. At 56px
       that reads as spidery, and it sat oddly beside an interface that is
       Lucide throughout. */
    const icons = [...stage.matchAll(/<svg[^>]*data-icon="[^"]+"[\s\S]*?<\/svg>/g)].map((m) => m[0]);
    assert.equal(icons.length, 3);
    for (const svg of icons) {
      assert.match(svg, /viewBox="0 0 24 24"/, 'off the 24 grid the rest of the set uses');
      assert.match(svg, /stroke-width="2"/, 'stroke weight does not match the icon set');
      assert.match(svg, /viewBox="0 0 24 24"/, 'off the 24 grid');
      assert.match(svg, /stroke-linecap="round"/, 'square caps read as a different family');
      assert.match(svg, /fill="none"/, 'a filled icon breaks the line-drawing language');
      assert.match(svg, /stroke="currentColor"/, 'the icon does not inherit its colour');
      assert.doesNotMatch(svg, /text-red|text-amber|text-green/, 'an icon is wearing a status colour');
    }
  });

  test('each leans on a convention the reader already owns', () => {
    /* The first attempt drew the CONCEPT — an empty locker, three sides laid
       end to end, an unbuilt frame — and Frank could not tell what any of them
       were. An icon gets about a second and no caption, so it has to borrow a
       convention: a slash means not allowed, a ruler means measured, a
       question mark means unknown. The suitcase is the constant; the marker
       carries the difference. */
    const get = (n) =>
      stage.match(new RegExp(`<svg[^>]*data-icon="${n}"[\\s\\S]*?</svg>`))[0];
    assert.match(get('no_cabin_bag'), /M3 20 21 4/, 'the slash is gone');
    assert.match(get('linear'), /<rect x="2" y="17"/, 'the ruler is gone');
    assert.match(get('unknown'), /stroke-dasharray/, 'the dashed case is gone');
    for (const n of ['no_cabin_bag', 'linear', 'unknown']) {
      assert.match(get(n), /<rect /, 'the shared suitcase body has gone');
    }
  });

  test('none of them is a warning triangle', () => {
    /* Two of these three are FINDINGS we are proud of — "this airline
       publishes no size" is a better answer than a number, and it is only
       sayable because somebody recorded the absence. Dressing them as errors
       would apologise for the most valuable thing on the page. */
    const icons = stage.match(/<svg[^>]*data-icon="[^"]+"[\s\S]*?<\/svg>/g).join('');
    assert.doesNotMatch(icons, /M12 9v2m0 4h\.01|exclamation|warning/i);
  });
});

describe('the verdict line alerts, and only where there is an alert', () => {
  const src = code(client);

  test('bad news for the traveller carries an alert mark and red text', () => {
    /* Frank: "we need a small alert icon before this and the text should be a
       color coordinated red." Two cases qualify — the fare grants no cabin bag,
       or the bag is over the published limit. Both cost the reader money at a
       gate. */
    assert.match(src, /sayVerdict\([\s\S]{0,140}?size does not matter\.`,\s*true/);
    assert.match(src, /sayVerdict\([\s\S]{0,180}?too \$\{result\.dimension\}[\s\S]{0,60}?,\s*true/);
  });

  test('our own gaps do NOT', () => {
    /* "We have not researched this yet" and "this airline no longer operates"
       are facts about OUR data, not threats to the reader's bag. Alarming them
       about our backlog spends attention we will want for something real —
       the same line the badge colour draws. */
    for (const phrase of ['have not researched', 'no longer operates']) {
      const at = src.indexOf(phrase);
      assert.ok(at > 0, `no verdict copy for "${phrase}"`);
      /* From the phrase to the end of that call — the `true` flag, if any,
         is the last argument. */
      const tail = src.slice(at, src.indexOf(');', at) + 2);
      assert.doesNotMatch(tail, /,\s*true\s*\)/, `"${phrase}" is being alarmed about`);
    }
  });

  test('a bag that fits is not decorated', () => {
    const call = src.match(/sayVerdict\(\s*`Fits[\s\S]{0,200}?\);/);
    assert.ok(call, 'the passing verdict has moved');
    assert.doesNotMatch(call[0], /,\s*true\s*\)/, 'a passing bag is wearing an alert');
  });

  test('the empty-state icon stays greyscale', () => {
    /* Two red marks in one view is one too many. The drawing is calm and
       legible; this line does the shouting. */
    assert.doesNotMatch(
      src,
      /data-icon="no_cabin_bag"[\s\S]{0,120}?text-red/,
      'the empty-state icon is taking the alarm colour again'
    );
    for (const svg of stage.match(/<svg[^>]*data-icon="[^"]+"[\s\S]*?<\/svg>/g)) {
      assert.match(svg, /text-muted/, 'an empty-state icon is not greyscale');
    }
  });

  test('the alert mark is on the same icon grid as everything else', () => {
    const alert = src.match(/const ALERT = `<svg[\s\S]*?<\/svg>`/)?.[0] ?? '';
    assert.ok(alert, 'the ALERT mark has moved');
    assert.match(alert, /viewBox="0 0 24 24"/);
    assert.match(alert, /stroke-width="2"/);
    assert.match(alert, /shrink-0/, 'a flexed icon beside wrapping text will squash without it');
  });
});

describe('every shape fills the box it claims, and every part hangs off it', () => {
  const src = code(geometry);

  test('no builder ignores one of its three dimensions', () => {
    /* THE DUFFEL WAS A CYLINDER: radius d/2, length w — `heightCm` never
       reached the geometry at all, so a 50 cm bag drew as a 21.6 cm barrel. A
       cylinder cannot fill a rectangular cross-section anyway; there is no
       radius that is both 31.8 and 21.6. Every builder destructures all three
       dimensions, so every builder has to USE all three. */
    for (const m of src.matchAll(/function build(\w+)\(([\s\S]*?)\n\}/g)) {
      const [, name, body] = m;
      for (const axis of ['h', 'w', 'd']) {
        assert.ok(
          new RegExp(`\\b${axis}\\b`).test(body.replace(/const \{[^}]*\}/, '')),
          `build${name} never uses ${axis} — the drawn bag will not be the stated size`
        );
      }
    }
  });

  test('accents are placed against the body, not against a fraction of the box', () => {
    /* `h * 0.85` looks like a layout constant and is really an assumption about
       where the body ended. The duffel's grab handle floated 6.7 cm above a
       barrel that stopped short; the backpack's lid sat in the wrong half of a
       body that had been pushed to h/2..3h/2 by a double offset.
       Anything attached to a body reads meshBoundsLocalY() first. */
    for (const m of src.matchAll(/(top|handle|grip|pole|pocket|seam)\.position\.set\(([^)]*)\)/g)) {
      const [whole, part, args] = m;
      const y = args.split(',')[1] ?? '';
      assert.ok(
        /\b(min|max)\b/.test(y),
        `${part} is positioned at "${y.trim()}" — anchor it to the body's bounds:\n    ${whole}`
      );
    }
  });

  test('roundedBox is not double-offset', () => {
    /* It already translates to 0..h. Adding position.y = h / 2 on top is the
       bug that moved the backpack into the upper half of its own frame. */
    assert.doesNotMatch(
      src,
      /body\.position\.y = h \/ 2/,
      'a body is being offset by half its height on top of a box that already spans 0..h'
    );
  });
});

describe('the bag and the frame are drawn on the same axes', () => {
  test('no builder permutes the dimensions', () => {
    /* THE BUG THIS EXISTS FOR, and it is the worst kind this file can have:
       the drawing disagreeing with the verdict beside it.

       I laid the duffel down to match its product photo — longest side across,
       smallest vertical — and left createGateSizer building the allowance in
       the record's own order. Two different axis conventions in one scene:

         sizer  X=width 45   Y=height 55.9  Z=depth 25
         bag    X=height 50  Y=depth 21.6   Z=width 31.8

       Top view compares X and Z, so a bag that clears Aegean by 5 cm rendered
       overhanging the frame on both. The numbers on the left said it fits.

       Rotating the SIZER to match is not the fix either: an airport frame
       stands upright, and turning it would misrepresent the one thing we claim
       to draw exactly. And upright is the honest pose anyway — delta() compares
       largest-to-largest BECAUSE a bag rotates, so the drawing should show the
       orientation in which it fits. A traveller with a holdall turns the
       holdall.

       Every builder therefore destructures the dimensions in the record's
       order and never reassigns them. */
    const src = code(geometry);
    for (const m of src.matchAll(/function build(\w+)\(([\s\S]*?)\n\}/g)) {
      const [, name, body] = m;
      assert.doesNotMatch(
        body,
        /const (w|h|d) = dims\.(height|width|depth)Cm/,
        `build${name} re-maps a dimension onto a different axis than the gate ` +
          `sizer uses — the drawing will contradict the verdict`
      );
    }
  });
});

describe('the badge bar reads subject-then-verdict', () => {
  const bar = stage.match(/<div\s+data-viz-badge\b[\s\S]*?<\/div>/)?.[0] ?? '';

  test('the airline comes before the verdict chip', () => {
    /* The chip led and the airline trailed in muted grey, which put the answer
       before the question — "Fits · Aer Lingus Basic" reads as a label looking
       for something to label. Every other verdict on this site names the
       flight first. */
    assert.ok(bar, 'the badge bar has moved; this guard needs rewriting');
    assert.ok(
      bar.indexOf('data-viz-badge-note') < bar.indexOf('data-viz-badge-chip'),
      'the verdict chip is back in front of the flight it describes'
    );
  });

  test('the chip is pushed right and cannot be squashed', () => {
    const chip = bar.match(/<span[\s\S]*?data-viz-badge-chip[\s\S]*?>/)?.[0] ?? '';
    assert.match(chip, /ml-auto/, 'the chip no longer sits at the end of the line');
    assert.match(chip, /shrink-0/, 'a long airline name will squash the verdict');
  });

  test('the flight is the emphasised half', () => {
    const note = bar.match(/<span data-viz-badge-note[^>]*>/)?.[0] ?? '';
    assert.match(note, /font-semibold/, 'the flight is no longer emphasised');
    assert.doesNotMatch(note, /text-muted/, 'the flight is greyed out again');
  });
});
