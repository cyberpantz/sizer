/* THE SOURCE IS NEVER BEHIND A CLICK.
 *
 * "Where did this number come from" is the question this entire site answers.
 * A bag page may fold away the REASONING — the panel grew until it pushed the
 * airline picker below the fold, and the picker is what a reader came to use —
 * but the claim itself and the link that lets someone check it have to be on
 * screen when the page loads.
 *
 * The distinction is the same one the footer disclosure taught us: a fact you
 * have to ask for twice is a fact being quietly downplayed. Collapsing an
 * explanation is editing; collapsing a citation is hiding. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const page = readFileSync('src/pages/bags/[slug].astro', 'utf8');

/** The body of every <details> on the page, comments stripped. */
const disclosures = () =>
  [...page.matchAll(/<details[\s\S]*?<\/details>/g)]
    .map((m) => m[0].replace(/\{\/\*[\s\S]*?\*\/\}/g, ''))
    .join('\n');

describe('the provenance panel', () => {
  test('the source SENTENCE is not inside a disclosure', () => {
    assert.doesNotMatch(
      disclosures(),
      /SOURCE_LINE/,
      'the statement of where the number came from is hidden behind a toggle'
    );
  });

  test('the link to the source is not inside a disclosure', () => {
    assert.doesNotMatch(
      disclosures(),
      /sourceLinkText|href=\{ref\}/,
      'the citation link is hidden behind a toggle — collapsing an explanation ' +
        'is editing, collapsing a citation is hiding'
    );
  });

  test('the wheel-and-handle FIGURE stays visible, only its rationale folds', () => {
    /* The number is the finding. "That difference is the whole reason a bag
       sold as carry-on size gets stopped" is the argument for it, and the
       argument is what may fold. */
    assert.doesNotMatch(
      disclosures(),
      /data-cm=\{v\}/,
      'the wheels-and-handle measurement is behind the toggle; only the prose should be'
    );
  });

  test('a disclosure that exists says what it opens, in words', () => {
    /* "More…" tells a reader nothing about whether it is worth the click, and
       is unhelpful read aloud. */
    const summaries = [...page.matchAll(/<summary[\s\S]*?<\/summary>/g)].map((m) => m[0]);
    for (const s of summaries) {
      const text = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      assert.doesNotMatch(text, /^(More|Show more|Details)\W*$/i, `bare label: "${text}"`);
      assert.ok(text.length > 4, `summary has no readable label: "${text}"`);
    }
  });
});
