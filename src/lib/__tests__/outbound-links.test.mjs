/* Every link off this site must be rel="noreferrer".

   Two separate reasons, and the second is the serious one.

   1. IT BREAKS PAGES. Aegean's WAF returns 403 to requests arriving with an
      unfamiliar referrer. Our own "check it yourself" link — the one the whole
      provenance argument rests on — was the single route to their baggage page
      that did not work. `noopener` does NOT strip the referrer; only
      `noreferrer` does, and we had only the former.

   2. IT LEAKS THE READER'S TRIP. /check keeps the itinerary in the query
      string so a permalink works:

        /check/?bags=samsonite-uplift&legs=A3.economy,FR.basic&risk=balanced

      Sent as a Referer, that tells Aegean the reader's bag, their whole
      itinerary, and that Ryanair is also on it. We ask people for their trip
      in order to answer a question, not to hand it to airlines. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(d, e.name))
      : /\.(astro|jsx|mjs)$/.test(e.name)
        ? [join(d, e.name)]
        : []
  );

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');

describe('outbound links', () => {
  test('no link leaves this site carrying a referrer', () => {
    /* WHAT COUNTS AS OUTBOUND. Two false starts here, both worth recording:

       1. Matching only hrefs beginning with a literal "https:" examined
          NOTHING, because almost every outbound link on this site is an
          expression — href={s.url}, href={ref}. It passed vacuously.
       2. Treating every unclassifiable expression as outbound flagged the nav,
          whose href={n.href} is internal.

       The rule that actually holds is our own convention: a link that leaves
       this site opens a new tab, and an internal one never does. So target
       ="_blank" IS the definition of outbound here — which makes the guard
       exact rather than heuristic, and gives it something real to enforce. */
    let examined = 0;
    for (const file of walk('src')) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const tag of src.match(/<a\b[^>]*>/g) ?? []) {
        const outbound = /target=["']_blank["']/.test(tag) || /href=["']https?:/.test(tag);
        if (!outbound) continue;
        examined++;
        const rel = /rel=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
        assert.match(
          rel,
          /\bnoreferrer\b/,
          `${file}: outbound link without noreferrer — ${tag.slice(0, 90).replace(/\s+/g, ' ')}…`
        );
      }
    }
    /* Cannot pass by finding nothing, which is how the first version passed. */
    assert.ok(
      examined >= 8,
      `only ${examined} outbound links examined — the matcher has stopped seeing them`
    );
  });

  test('an outbound link opens a new tab, so the rule above can find it', () => {
    /* The guard keys on target="_blank". If a source link ever ships without
       it, the link both navigates the reader away from their half-finished
       trip AND slips past the referrer check. */
    for (const file of walk('src')) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const tag of src.match(/<a\b[^>]*>/g) ?? []) {
        if (!/rel=["'][^"']*\bnofollow\b/.test(tag)) continue;
        assert.match(
          tag,
          /target=["']_blank["']/,
          `${file}: nofollow link that does not open a new tab — ${tag.slice(0, 80).replace(/\s+/g, ' ')}…`
        );
      }
    }
  });

  test('the layout sets a referrer policy as well', () => {
    /* Belt and braces: a link added later without the rel attribute still
       cannot leak, because the document-level policy covers it. */
    const base = readFileSync('src/layouts/Base.astro', 'utf8');
    assert.match(base, /name="referrer"\s+content="same-origin"/);
  });
});
