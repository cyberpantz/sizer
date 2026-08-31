/* Guards for the bag card, which is the most-repeated object on the site and
   the one nobody re-reads once it looks right.

   Both tests here exist because the failure they catch is INVISIBLE: the card
   still renders, still looks deliberate, and is simply wrong. */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { SHAPE, shapeOf } from '../bag-shape.mjs';
import { loadBags } from '../data.mjs';

const read = (f) => readFileSync(f, 'utf8');
/* Scan code, not prose. The first version of the interpolation test below
   failed on the comment that EXPLAINS the interpolation trap — a guard that
   flags its own documentation is a guard people delete. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');

const card = stripComments(read('src/components/BagCard.astro'));
const silhouette = read('src/components/BagSilhouette.astro');

describe('bag card', () => {
  test('every catalogue bag type has its own silhouette', async () => {
    /* Without this, a new type falls through to the spinner default and every
       card for it draws the wrong object — confidently, and forever. It is how
       the mockups lost their drawings: the pages key on "spinner" and the
       catalogue says "hardside spinner", and a missing key is not an error. */
    const bags = await loadBags({ role: null });
    for (const type of new Set(bags.map((b) => b.record.type))) {
      assert.ok(shapeOf(type), `bag type "${type}" maps to no shape — it will draw as a spinner`);
    }
  });

  test('every shape the map names is actually drawn', () => {
    /* The mirror failure: a shape in the map with no artwork behind it renders
       an empty <svg>, which looks like a loading state that never finishes. */
    for (const shape of new Set(Object.values(SHAPE))) {
      assert.ok(
        silhouette.includes(`shape === '${shape}'`),
        `shape "${shape}" is mapped but BagSilhouette draws nothing for it`
      );
    }
  });

  test('no colour class is built by string interpolation', () => {
    /* Tailwind finds classes by scanning source text. `text-${tone}` matches
       nothing, so the class is never generated and the card ships grey — which
       reads as a design choice rather than a bug, and so never gets reported. */
    const interpolated = /(?:bg|text|border|fill|stroke)-\$\{/.exec(card);
    assert.equal(
      interpolated,
      null,
      `BagCard builds a class by interpolation ("${interpolated?.[0]}") — Tailwind will not emit it`
    );
  });

  test('status colour never lands on the card link itself', () => {
    /* docs/02: blue is the only interactive colour. verify-build.mjs checks the
       BUILT html, which only helps once a build exists; this catches it in the
       source, where it is cheap to fix. */
    for (const tag of card.match(/<(?:a|button)\b[^>]*>/g) ?? []) {
      assert.ok(
        !/(?:bg|text|border)-(?:green|amber|orange|red)\b/.test(tag),
        `status colour on an interactive element: ${tag.slice(0, 60)}`
      );
    }
  });
});
