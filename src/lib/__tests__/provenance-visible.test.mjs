/* WHAT MAY FOLD, AND WHAT MAY NOT.
 *
 * "Where did this number come from" is the question this site exists to
 * answer, so the panel that answers it is not free to hide. But it had grown
 * to five stacked paragraphs and was pushing the airline picker — the thing a
 * reader actually came to use — down the page.
 *
 * THE LINE MOVED ONCE, DELIBERATELY, AND THIS IS WHERE IT SITS NOW.
 *
 * The first version of this file said the source SENTENCE must stay visible.
 * That was the right instinct aimed at the wrong object: what a reader needs
 * without clicking is not the prose, it is the QUALIFICATION — whether the
 * figure above is the manufacturer's own or something weaker. Three words
 * carry that:
 *
 *     Review figure, not the maker  ·  Travel + Leisure ↗
 *
 * So the rule is now about MEANING rather than length. Visible: the rung, in
 * words, and the link that lets someone check it. Folded: why the rung
 * matters, the wheels-and-handle arithmetic, and any recorded conflicts —
 * every one of them an explanation of a claim already on screen.
 *
 * Collapsing an explanation is editing. Collapsing a citation is hiding. The
 * distinction is unchanged; only the shortest honest form of the citation is. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const page = readFileSync('src/pages/bags/[slug].astro', 'utf8');

/** The body of every <details> on the page, comments stripped. */
const disclosures = () =>
  [...page.matchAll(/<details[\s\S]*?<\/details>/g)]
    .map((m) => m[0].replace(/\{\/\*[\s\S]*?\*\/\}/g, ''))
    .join('\n');

/** Everything outside them. */
const visible = () =>
  page.replace(/<details[\s\S]*?<\/details>/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('the qualification is never behind a click', () => {
  test('the rung is named in words, on screen', () => {
    /* A reader who never opens the panel must still learn that the figure
       above is a review's and not the maker's. That is a different fact from
       the number, and it changes what the number is worth. */
    assert.match(visible(), /SOURCE_BADGE\[bag\.dim_source\]/, 'the source rung is hidden');
    assert.doesNotMatch(disclosures(), /SOURCE_BADGE/, 'the rung has been folded away');
  });

  test('a weak source is marked as weak, not merely described', () => {
    /* Amber, the same colour the "shown, not recommended" note uses, because
       it is the same finding. Naming the rung in ink would make "Packing size,
       not the outside" read like a neutral label for a fact that is anything
       but. */
    assert.match(page, /const weakSource = SOURCE_IS_WEAK\(bag\.dim_source\)/);
    assert.match(visible(), /weakSource \? 'text-amber'/, 'a weak rung reads as neutral');
  });

  test('the link to the source is not inside a disclosure', () => {
    /* Unchanged from the first version of this rule, and the part of it that
       was always right: a citation you have to ask for twice is a citation
       being downplayed. */
    assert.doesNotMatch(
      disclosures(),
      /sourceLinkText|href=\{ref\}/,
      'the citation link is behind a toggle'
    );
  });
});

describe('what folds is explanation', () => {
  test('the prose that explains the rung is inside the disclosure', () => {
    /* This is the change. SOURCE_LINE is three or four lines of reasoning
       about a claim the badge already makes in three words. */
    assert.match(disclosures(), /SOURCE_LINE\[bag\.dim_source\]/, 'the long form is back on screen');
  });

  test('the summary says what it opens', () => {
    /* "More…" tells a reader nothing about whether the click is worth it and
       is useless read aloud. */
    for (const s of page.match(/<summary[\s\S]*?<\/summary>/g) ?? []) {
      const text = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      assert.doesNotMatch(text, /^(More|Show more|Details)\W*$/i, `bare label: "${text}"`);
      assert.ok(text.length > 4, `summary has no readable label: "${text}"`);
    }
  });

  test('it says FIGURES, plural, because it covers more than one', () => {
    /* "Where this number comes from" was imprecise: the panel covers the
       dimensions AND the weight, and for many bags several figures drawn from
       different sources. */
    assert.match(page, /Where these figures come from/, 'the heading is back to the singular');
    assert.doesNotMatch(
      visible(),
      /Where this number comes from/,
      'the singular heading is still rendered'
    );
  });
});
