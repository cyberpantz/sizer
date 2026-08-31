/* How strictly an airline checks is said ONCE on the answer, in one place.

   The bug this locks out, as it actually shipped:

     "Answered on I'll chance it. All three settings agree here. RYANAIR
      MEASURES BAGS AS ROUTINE, so there is no margin for any of them to give
      you — the risk setting cannot change an answer at an airline like this."

     "RYANAIR — strictness 9/10, MEASURES EVERY BAG. THEY MEASURE BAGS AT THE
      GATE and pay staff a bonus for spotting oversize ones."

   The carrier named twice and its enforcement stated three times, in four
   lines. Neither half was wrong; they were written months apart, each unaware
   the other existed, and nothing failed when they overlapped.

   That is the shape of the failure worth testing. Duplicated copy never
   throws — it just accumulates until someone reads the page and winces, which
   is a slow and expensive way to find it. So the rule is structural:

     the callout owns enforcement; riskEffect() owns what the CONTROL did.

   riskEffect may say the setting changed nothing. It may not say why in the
   airline's own terms, because the block directly beneath it does that with
   researched evidence rather than our adjective. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { TIERS } from '../../ui/strictness.mjs';

const page = readFileSync('src/pages/check.astro', 'utf8');

/** A function's body, sliced out of the page source, COMMENTS REMOVED.
 *
 *  The comments have to go, and the reason is a small lesson: the first
 *  version of this test failed on the comment "No '· assumed' marker here",
 *  written to explain the very rule being asserted. A test that forbids
 *  discussing the thing it forbids is a test nobody keeps. Only what the page
 *  actually renders is evidence. */
function bodyOf(signature) {
  const i = page.indexOf(signature);
  assert.notEqual(i, -1, `${signature} is gone from check.astro — this test needs rewriting`);
  const rest = page.slice(i);
  const end = rest.indexOf('\n  }\n');
  assert.notEqual(end, -1, `could not find the end of ${signature}`);
  return rest
    .slice(0, end)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

describe('enforcement is stated once', () => {
  test('only one place on the page draws the strictness icon', () => {
    /* Two drawings of one fact drift apart — that is how the mockups lost
       their bag silhouettes, and how this duplication started. */
    const drawn = page.match(/strictnessIcon\(/g) ?? [];
    assert.equal(
      drawn.length,
      1,
      `${drawn.length} places render the strictness icon; exactly one should`
    );
  });

  test('riskEffect does not name the airline', () => {
    /* The callout names it, three lines below and in bold. */
    const body = bodyOf('function riskEffect(');
    assert.doesNotMatch(
      body,
      /carrier\.name/,
      'riskEffect names the carrier, which the strictness callout already does'
    );
  });

  test('riskEffect does not describe how the airline checks', () => {
    /* Any paraphrase of a tier belongs to the callout, which can cite the
       airline's own researched claim instead of our adjective. */
    const body = bodyOf('function riskEffect(').toLowerCase();
    for (const t of TIERS) {
      const words = t.label.toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length < 5) continue; // "at", "the", "bag" carry no tier meaning
        assert.ok(
          !body.includes(w),
          `riskEffect uses "${w}" from the tier "${t.label}" — describing enforcement is the callout's job`
        );
      }
    }
    assert.doesNotMatch(
      body,
      /measur/,
      "riskEffect describes measuring; that is the callout's sentence"
    );
  });

  test('the callout still explains why the risk setting is inert', () => {
    /* The half that must NOT be lost while removing the duplicate. A control
       the reader just moved that does nothing, with no reason given, reads as
       broken — which is why the sentence was written in the first place. It
       moved; it did not go. */
    const body = bodyOf('function strictnessCallout(');
    assert.match(
      body,
      /gambleCeiling\([^)]*\) === 0/,
      'the callout no longer detects the no-margin case'
    );
    assert.match(
      body,
      /risk setting cannot change the answer/,
      'the callout no longer says why the risk setting is inert'
    );
  });

  test('the callout does not repeat "assumed" alongside enforcementNote', () => {
    /* enforcementNote() already ends a prior with "This is our starting
       assumption for an airline of this type and region, not researched
       enforcement." A chip saying "· assumed" beside it is the same mistake
       one scale smaller. */
    const body = bodyOf('function strictnessCallout(');
    assert.ok(body.includes('enforcementNote('), 'the callout must show the basis');
    assert.doesNotMatch(body, /·\s*assumed/, "the callout duplicates enforcementNote's disclaimer");
  });
});
