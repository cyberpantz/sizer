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
import { BAND_COPY, BAND_ORDER, bandHex, UNANSWERED_HEX } from '../verdict.mjs';

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
    assert.doesNotMatch(
      client,
      /classList\.toggle\('(border|bg|text)-red/,
      'the axis label is back to a hard-coded red instead of the band'
    );
    assert.match(client, /BAND_CHIP\[result\.band\]/, 'the chip no longer reads the band');
  });

  test('the measured envelope carries the band, not a fixed colour', () => {
    /* The envelope is the bag's exterior drawn as a box — the thing being
       judged. A fixed slate blue made the Outline view the one place that said
       nothing about the answer, and blue is reserved for interactive. */
    assert.match(
      client,
      /envelope\.material as THREE\.LineBasicMaterial\)\.color\.setHex\(bandHex/,
      'the envelope is back to a fixed colour'
    );
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

describe('the bag itself reads good or alarm', () => {
  const materials = readFileSync(
    'src/components/bag-visualizer/createMaterials.ts',
    'utf8'
  );
  const code = materials.replace(/\/\*[\s\S]*?\*\//g, '');

  test('the body colour is pulled toward the band, not left fixed', () => {
    /* Frank: "we need good vs alarm styling and decision for the bag." The
       verdict reached the dimension lines, the chips and the envelope, then
       stopped at the object all three describe — so the bag looked identical
       whether it sailed through or was refused. */
    assert.match(code, /body\.color\.lerp/, 'the bag body no longer takes the verdict');
  });

  test('the pull is a blend, never a repaint', () => {
    /* A fully green suitcase is a toy, and docs/23 ruled out anything reading
       as the manufacturer's own presentation. Every weight stays well under
       half so the shell still reads as a shell. */
    const block = code.match(/BAND_PULL[^=]*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
    assert.ok(block, 'BAND_PULL has moved; this guard needs rewriting');
    const weights = [...block.matchAll(/(\w+):\s*([\d.]+)/g)].map(([, b, v]) => [b, +v]);
    assert.equal(weights.length, 5, 'every band needs a weight');
    for (const [band, v] of weights) {
      assert.ok(v > 0.2, `${band} at ${v} is too faint to read as a verdict`);
      assert.ok(v <= 0.5, `${band} at ${v} repaints the bag instead of tinting it`);
    }
  });

  test('alarm pulls harder than reassurance', () => {
    /* The two errors are not equal. Telling someone their bag is fine when it
       is not costs them a gate fee and their bag; a green that is slightly too
       subtle costs nobody anything. Same asymmetry as gambleCeiling() and the
       evidence gate on `likely`. */
    const block = code.match(/BAND_PULL[^=]*=\s*\{([\s\S]*?)\};/)[1];
    const w = Object.fromEntries(
      [...block.matchAll(/(\w+):\s*([\d.]+)/g)].map(([, b, v]) => [b, +v])
    );
    assert.ok(w.wont > w.clears, 'refusal must not be quieter than approval');
    assert.ok(w.gamble > w.line, 'over-the-limit must not be quieter than tight-but-legal');
    assert.deepEqual(
      [w.clears, w.line, w.likely, w.gamble, w.wont],
      [w.clears, w.line, w.likely, w.gamble, w.wont].sort((a, b) => a - b),
      'the weights must ascend from clears to wont — worse is louder'
    );
  });

  test('an unanswered verdict leaves the bag alone', () => {
    /* Not knowing is not a mild version of fitting, so it gets no tint at
       all rather than a washed-out one. */
    assert.match(code, /opts\?\.band \?/, 'a missing band no longer skips the tint');
  });
});
