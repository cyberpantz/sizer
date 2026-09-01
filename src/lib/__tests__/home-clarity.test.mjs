/* A STRANGER SHOULD KNOW WHETHER THEY ARE IN THE RIGHT PLACE WITHOUT READING.
 *
 * The headline was "The same bag, three different sets of dimensions" — a true
 * and genuinely interesting thesis, and the wrong first sentence. Someone
 * landing here has exactly one question, and that headline made them read four
 * more lines to answer it.
 *
 * An insight is what you EARN attention with. A service statement is what you
 * spend it on. So the thesis moved down to the section that argues it, and the
 * top of the page names the job.
 *
 * These guards are about MEANING, not wording — they check that the promise is
 * near the top, that the three ways in are all named, and that no number on the
 * page is typed rather than counted. Copy can change freely inside that. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const page = readFileSync('src/pages/index.astro', 'utf8');
const body = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const h1 = body.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';

describe('the first thing on the page is the job', () => {
  test('the headline asks the question the reader arrived with', () => {
    assert.ok(h1, 'there is no h1');
    const text = h1.replace(/<[^>]+>/g, ' ').replace(/\{'\s*'\}/g, ' ').replace(/\s+/g, ' ').trim();
    assert.match(text, /\bfit\b/i, `the headline does not mention fitting: "${text}"`);
    assert.ok(text.length < 60, `the headline is a paragraph, not a headline: "${text}"`);
  });

  test('the thesis is below the fold, not in the h1', () => {
    /* It is the reason to use Sizer rather than a competitor, which is a
       different job from telling a stranger what Sizer is. */
    assert.doesNotMatch(h1, /three different/, 'the thesis is back in the headline');
    assert.match(body, /The same bag, three different sets of dimensions/, 'the thesis has been lost');
  });
});

describe('all three ways in are named', () => {
  /* A reader arrives already inside one of them: they own a bag, they are
     buying one, or they have a trip booked. Naming all three is how someone
     recognises themselves without reading a paragraph first — and the two-
     button version left the third audience with nowhere obvious to go. */
  for (const [who, href] of [
    ['someone who owns a bag', '/check/'],
    ['someone shopping', '/bags/'],
    ['someone with a flight booked', '/guide/'],
  ]) {
    test(`${who} has a door`, () => {
      assert.ok(body.includes(`href="${href}"`), `nothing on the home page links to ${href}`);
    });
  }
});

describe('no figure on the page is typed by hand', () => {
  test('the airline count is the answerable count, not a round number', () => {
    /* `answerable` excludes carriers the engine cannot answer for, so the
       promise shrinks on its own if research goes backwards. A literal here
       would keep promising after the data stopped supporting it — which is the
       footer-disclosure mistake in a different costume. */
    assert.match(page, /const answerable = carriers\.filter\(\(c\) => !c\.cabin_unknown\)\.length/);
    assert.match(body, /\{answerable\} airlines/, 'the airline count is no longer derived');
    assert.doesNotMatch(
      body.replace(/\{[^}]*\}/g, ''),
      /\b\d{2,}\s+airlines\b/,
      'a hard-coded airline count has appeared'
    );
  });

  test('the catalogue count is derived too', () => {
    assert.match(body, /\{stats\.bags_sized\} bags/, 'the bag count is hard-coded');
  });
});
