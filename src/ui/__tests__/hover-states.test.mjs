/* EVERYTHING CLICKABLE RESPONDS TO THE POINTER.
 *
 * Frank, on the source link: "link buttons should always have a hover state …
 * could be as simple as an underline."
 *
 * The audit found 30 of them — links, buttons and one summary — with no hover
 * treatment at all. Not a styling oversight so much as an inevitability: every
 * one was written by hand, in eleven files, over weeks. Nothing could tell you
 * which had been missed, so the count only ever went up.
 *
 * The rule is about affordance, not decoration. Colour alone is not a reliable
 * signal that something is clickable — it fails for the colour-blind, it fails
 * against a busy background, and on this site blue is also just a colour a
 * reader has learned to associate with us. A change ON POINTER is the cheap,
 * universal confirmation, and an underline is the plainest form of it.
 *
 * ONE THING THIS GUARD DOES NOT CHECK, and it matters more than the rest: a
 * hover state on a segmented control must not imitate its PRESSED state, or
 * the control lies about which option is selected. The unit toggle and the
 * risk selector therefore wash on hover and keep the solid blue for pressed —
 * with aria-pressed:hover overrides so hovering the selected segment does not
 * knock it back to the unselected look. That is a judgement no regex can make;
 * it is written down here so the next person knows it was one. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? e.name === '__tests__'
        ? []
        : walk(join(d, e.name))
      : /\.(astro|jsx)$/.test(e.name)
        ? [join(d, e.name)]
        : []
  );

const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('hover states', () => {
  test('every link, button and summary has one', () => {
    const bare = [];
    for (const file of walk('src')) {
      const src = strip(readFileSync(file, 'utf8'));
      for (const m of src.matchAll(/<(a|button|summary)\b[^>]*>/g)) {
        if (m[0].includes('hover:')) continue;
        /* An anchor with no href is not a control. */
        if (m[1] === 'a' && !/href/.test(m[0])) continue;
        const line = src.slice(0, m.index).split('\n').length;
        bare.push(`${file}:${line}  ${m[0].replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    assert.deepEqual(
      bare,
      [],
      `clickable with no hover state — an underline is enough:\n  ${bare.join('\n  ')}`
    );
  });

  test('a hover state never impersonates the pressed state', () => {
    /* A segmented control whose hover paints the selected style makes the
       reader unable to tell what is actually chosen — worse than no hover at
       all, because it actively misinforms. Any element that styles
       aria-pressed AND hovers must say what hovering does while pressed. */
    const wrong = [];
    for (const file of walk('src')) {
      const src = strip(readFileSync(file, 'utf8'));
      for (const m of src.matchAll(/<(button|a)\b[^>]*>/g)) {
        const tag = m[0];
        if (!tag.includes('aria-pressed') || !tag.includes('hover:')) continue;
        if (/aria-pressed:hover:/.test(tag)) continue;
        /* Border/text-only hovers cannot be confused with a solid fill. */
        if (!/hover:bg-/.test(tag)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        wrong.push(`${file}:${line}  ${tag.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    assert.deepEqual(
      wrong,
      [],
      'a pressed segment loses its selected look on hover — add aria-pressed:hover:*:\n  ' +
        wrong.join('\n  ')
    );
  });
});
