/* The design system has exactly one hard rule (docs/02):

     BLUE IS THE ONLY INTERACTIVE COLOUR.
     Green, amber, orange and red are only ever status.

   A green button reads as a verdict, which is precisely the confusion this
   product exists to remove.

   verify-build.mjs enforces this on the built HTML, but only on the landing
   page and only once a build exists. /check alone carries selects, remove
   buttons, a segmented risk control and a copy button, none of which that
   check has ever looked at. This one reads the source, so it costs nothing and
   covers every page.

   The mockups DO tint a control red — the remove × goes red on hover. Where a
   mockup and this rule disagree, the rule wins, and the page says so. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.astro') ? [join(d, e.name)] : []
  );

/* Comments explain the rule and would otherwise trip the check that enforces
   it — a guard that flags its own documentation is a guard people switch off. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');

const STATUS = /(?:bg|text|border|border-l|fill|stroke)-(?:green|amber|orange|red)\b/;
const INTERACTIVE = /<(?:a|button|input|select|summary|textarea)\b[^>]*>/gi;

describe('design system', () => {
  test('no interactive element wears a status colour', () => {
    for (const file of walk('src')) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const tag of src.match(INTERACTIVE) ?? []) {
        /* Class lists are built three ways in this codebase: a plain
           attribute, an expression, and a template literal inside a rendered
           string. Match the whole tag rather than trying to parse out one. */
        const hit = STATUS.exec(tag);
        assert.equal(
          hit,
          null,
          `${file}: status colour "${hit?.[0]}" on ${tag.slice(0, 70).replace(/\s+/g, ' ')}…`
        );
      }
    }
  });

  test('no colour class anywhere is built by string interpolation', () => {
    /* Tailwind finds classes by scanning source text, so `text-${tone}`
       compiles to nothing and the element ships unstyled — a failure that
       looks deliberate and therefore never gets reported. */
    for (const file of walk('src')) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const hit = /(?:bg|text|border|fill|stroke)-\$\{/.exec(src);
      assert.equal(
        hit,
        null,
        `${file} builds "${hit?.[0]}" by interpolation — Tailwind emits nothing`
      );
    }
  });
});
