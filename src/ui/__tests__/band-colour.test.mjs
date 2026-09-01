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
