/* ONE COLOUR LADDER, FIVE STEPS, EVERY SURFACE.
 *
 * Frank: "in the Check page we have an entire design language around the
 * sizing and when it is within bounds or out of bounds (too large === red). We
 * should continue that."
 *
 * The 3D visualiser had grown its own, and it disagreed twice:
 *
 *   1. It COLLAPSED `clears` and `line` into a single green. Tight is the whole
 *      reason that distinction exists — legal, inside the published limit, with
 *      no margin at all — and docs/24 argues the ordering at length. The most
 *      persuasive element on the page was quietly telling a reader with 0 cm to
 *      spare that they were fine.
 *   2. It hard-coded the hexes, copied from the palette. Change --color-lime and
 *      the badge moves while the drawing stays put — exactly the drift that made
 *      BAND_COPY the single home for verdict labels in the first place.
 *
 * BAND_COPY now carries both representations: the CSS variable for the DOM and
 * the number for WebGL, which cannot take a custom property. Side by side, so
 * they cannot be changed apart. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  BAND_COPY,
  BAND_ORDER,
  bandHex,
  fitsWithinLimit,
  sizeVerdict,
  UNANSWERED_HEX,
} from '../verdict.mjs';

const css = readFileSync('src/styles/app.css', 'utf8');

describe('the palette and the bands agree', () => {
  test('every band token names a custom property the stylesheet defines', () => {
    /* These said `var(--green)` while the stylesheet defines `--color-green`.
       Nothing read `.token` yet, so it was a trap rather than a bug: the first
       surface to use it paints nothing and nobody knows why. */
    for (const [band, copy] of Object.entries(BAND_COPY)) {
      const name = copy.token.match(/var\((--[\w-]+)\)/)?.[1];
      assert.ok(name, `${band}: token is not a var() reference — "${copy.token}"`);
      assert.ok(
        new RegExp(`^\\s*${name}\\s*:`, 'm').test(css),
        `${band}: ${name} is not defined in app.css`
      );
    }
  });

  test('the hex equals the value of that custom property', () => {
    /* The two representations must be the SAME colour. A drawing a shade off
       from its badge is the kind of thing nobody reports and everybody sees. */
    for (const [band, copy] of Object.entries(BAND_COPY)) {
      const name = copy.token.match(/var\((--[\w-]+)\)/)[1];
      const declared = css.match(new RegExp(`^\\s*${name}\\s*:\\s*(#[0-9a-fA-F]{6})`, 'm'))?.[1];
      assert.ok(declared, `${band}: ${name} is not a plain hex in app.css`);
      assert.equal(
        `#${copy.hex.toString(16).padStart(6, '0')}`,
        declared.toLowerCase(),
        `${band}: the hex and ${name} are different colours`
      );
    }
  });
});

describe('the five bands stay five', () => {
  test('no two bands share a colour', () => {
    /* clears and line shared one in the visualiser, which erased Tight. */
    const seen = new Map();
    for (const band of BAND_ORDER) {
      const hex = bandHex(band);
      assert.ok(!seen.has(hex), `${band} and ${seen.get(hex)} are the same colour`);
      seen.set(hex, band);
    }
    assert.equal(seen.size, 5);
  });

  test('an unanswerable leg is grey, and grey is not a verdict colour', () => {
    /* "We have not researched this airline" must never borrow a band colour:
       not knowing is not a mild version of fitting. */
    assert.equal(bandHex(null), UNANSWERED_HEX);
    assert.equal(bandHex('nonsense'), UNANSWERED_HEX);
    for (const band of BAND_ORDER) {
      assert.notEqual(bandHex(band), UNANSWERED_HEX, `${band} is using the unanswered grey`);
    }
  });

  test('the visualiser does not keep a second ladder', () => {
    const src = readFileSync('src/components/bag-visualizer/fitVisual.ts', 'utf8');
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(
      body,
      /0x[0-9a-f]{6}/i,
      'a hard-coded colour is back in the visualiser; it must read BAND_COPY'
    );
  });
});

describe('the ladder reaches every surface that states a verdict', () => {
  /* Frank, twice: "/check has an entire design language around whether it is
     within bounds — too large === red. We should continue that." The first
     pass did the dimension lines and stopped, which is how a colour system
     ends up applied to the parts someone happened to be editing. */
  const client = readFileSync(
    'src/components/bag-visualizer/BagVisualizer.client.ts',
    'utf8'
  ).replace(/\/\*[\s\S]*?\*\//g, '');

  test('the axis chip is not hard-coded to red', () => {
    /* It was `classList.toggle('border-red', overflowCm > 0)`: exactly two
       states, ink or red. A bag TIGHT on its depth — legal, inside the limit,
       no margin — got the same red as one 5 cm over, and a comfortable pass
       got no colour at all. The number a reader looks at hardest was the one
       place the ladder did not reach. */
    /* Scoped to the CHIP. The verdict line legitimately toggles text-red —
       that is the alert, and it is a different decision from the axis label's
       five-band tint. */
    const chipBlock = client.match(/const chip = labels\.querySelector[\s\S]*?\n      \}/)?.[0] ?? '';
    assert.ok(chipBlock, 'the chip block has moved; this guard needs rewriting');
    assert.doesNotMatch(
      chipBlock,
      /classList\.toggle\('(border|bg|text)-red/,
      'the axis label is back to a hard-coded red instead of the band'
    );
    assert.match(client, /BAND_CHIP\[result\.band\]/, 'the chip no longer reads the band');
  });

  test('the measured envelope carries the band, not a fixed colour', () => {
    /* The envelope is the bag's exterior drawn as a box — the thing being
       judged. A fixed slate blue made the Outline view the one place that said
       nothing about the answer, and blue is reserved for interactive. */
    assert.match(client, /envelope\.material as THREE\.LineBasicMaterial\)\.color\.setHex\(/);
    assert.match(client, /sizeVerdict\(result\) === null \? UNANSWERED_HEX : bandHex/);
  });

  test('a finding that is not about size takes no size colour, anywhere', () => {
    /* evaluate() reports `wont` for a fare that grants no cabin bag — correctly,
       since the answer is no. But that is a fact about the TICKET: on Air France
       Basic a handbag gets the same verdict as a wardrobe trunk. Painting the
       bag red states a claim we never made — "your bag is oversize" — while the
       badge directly above it says "No cabin bag". The drawing and the label
       must not disagree.

       sizeVerdict() is the gate. Every surface that takes a colour goes through
       it: the bag body, the envelope, the measurement overlay. */
    assert.equal(sizeVerdict({ no_cabin_bag: true, band: 'wont' }), null);
    assert.equal(sizeVerdict({ unknown: true, band: 'wont' }), null);
    assert.equal(sizeVerdict({ not_flying: true, band: 'wont' }), null);
    assert.equal(sizeVerdict({ band: 'wont' }), false, 'a real overage is still an overage');
    assert.equal(sizeVerdict({ band: 'clears' }), true);

    for (const call of ['fits: sizeVerdict(result)', 'const fits = sizeVerdict(result)']) {
      assert.ok(client.includes(call), `a surface bypasses the gate: expected ${call}`);
    }
  });

  test('the drawing is put away entirely when there is nothing to compare', () => {
    /* Frank: "there should be an informational empty state sort of thing
       displayed instead of a red tinted bag." The 3D view is the vocabulary of
       "does it fit" — a measured envelope, three orthogonal views, a bag
       sliding into a frame. Shown where fit is not the question, it implies we
       measured something and found an answer. */
    assert.match(client, /if \(!canDrawSizer\)/, 'the apparatus renders with nothing to compare');
    assert.match(client, /data-no-compare/, 'there is no stated finding to show in its place');
  });

  test('band chip classes are written out, never assembled', () => {
    /* Tailwind scans source text for literal class names. `${tone}-wash`
       produces none, so the class does not exist and the element renders
       untinted — indistinguishable from a verdict we could not answer. */
    const verdict = readFileSync('src/ui/verdict.mjs', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const block = verdict.match(/BAND_CHIP = \{[\s\S]*?\};/)?.[0] ?? '';
    assert.ok(block, 'BAND_CHIP has moved; this guard needs rewriting');
    assert.doesNotMatch(block, /\$\{/, 'a band class is being built from a template string');
    for (const band of BAND_ORDER) {
      assert.ok(new RegExp(`\\b${band}:`).test(block), `${band} has no chip classes`);
    }
  });
});

describe('the bag itself reads good or bad', () => {
  const code = readFileSync(
    'src/components/bag-visualizer/createMaterials.ts',
    'utf8'
  ).replace(/\/\*[\s\S]*?\*\//g, '');

  test('the body colour is pulled toward the verdict, not left fixed', () => {
    /* The verdict reached the dimension lines, the chips and the envelope,
       then stopped at the object all three describe — so the bag looked
       identical whether it sailed through or was refused. */
    assert.match(code, /body\.color\.lerp/, 'the bag body no longer takes the verdict');
  });

  test('the bag is binary — good or bad, not five-way', () => {
    /* Frank: "fits === good, does not fit === bad." The ladder has five steps
       because the ADVICE has five shades; the object does not. Five tints on a
       curved, rendered shell is mush — nobody tells lime from green from amber
       at a glance. The nuance stays where there is room for it: the badge, the
       axis chip, the sentence. */
    assert.doesNotMatch(
      code,
      /BAND_PULL/,
      'the five-way tint is back on the bag; it belongs on the labels'
    );
    assert.match(code, /GOOD_HEX/, 'no good colour');
    assert.match(code, /BAD_HEX/, 'no bad colour');
  });

  test('bad pulls harder than good', () => {
    /* The two errors are not equal. Telling someone their bag is fine when it
       is not costs them a gate fee and their bag; a green slightly too subtle
       costs nobody anything. Same asymmetry as gambleCeiling(). */
    const good = Number(code.match(/GOOD_PULL\s*=\s*([\d.]+)/)?.[1]);
    const bad = Number(code.match(/BAD_PULL\s*=\s*([\d.]+)/)?.[1]);
    assert.ok(good > 0 && bad > 0, 'both pulls must exist');
    assert.ok(bad > good, `refusal (${bad}) must not be quieter than approval (${good})`);
    assert.ok(bad <= 0.5, `${bad} repaints the bag instead of tinting it`);
  });

  test('an unanswered verdict leaves the bag alone', () => {
    /* Not knowing is neither good nor bad, and must never render as either. */
    assert.equal(fitsWithinLimit(null), null);
    assert.equal(fitsWithinLimit('nonsense'), null);
    assert.match(code, /opts\?\.fits === true/, 'the tint no longer distinguishes null from false');
  });
});

describe('where fits stops and over begins', () => {
  test('the boundary is the airline\'s published limit, not a design choice', () => {
    /* `line` (Tight) is INSIDE the published box with no margin. `likely`
       (Probably fine) is OVER it, and forgiven only because the airline rarely
       measures. docs/24 argues this ordering at length; the drawing must not
       quietly move the line somewhere more flattering. */
    assert.equal(fitsWithinLimit('clears'), true);
    assert.equal(fitsWithinLimit('line'), true, 'Tight is legal — it is inside the limit');
    assert.equal(fitsWithinLimit('likely'), false, 'Probably fine is already OVER the limit');
    assert.equal(fitsWithinLimit('gamble'), false);
    assert.equal(fitsWithinLimit('wont'), false);
  });

  test('every band lands on one side or the other', () => {
    for (const band of BAND_ORDER) {
      assert.notEqual(fitsWithinLimit(band), null, `${band} is neither fitting nor over`);
    }
  });
});
