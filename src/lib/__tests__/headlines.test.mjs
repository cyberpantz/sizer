/* A BIG TITLE HAS TO LAND WITHOUT THE PARAGRAPH UNDER IT.
 *
 * Frank, on /bags: "let's simplify this line so nobody will scratch their head
 * and wonder — what does that mean? Adding an informational subtitle is totally
 * fine, but larger titles need to be immediately understandable."
 *
 * The line was "Bags checked against the airline's own limit". Six words, two
 * of which need explaining before the sentence means anything: WHICH airline —
 * the reader has named none — and what "own" is doing, which is quietly arguing
 * against reseller listings, a case they have not heard yet.
 *
 * It was also the only headline on the site describing OUR PROCESS instead of
 * the reader's job. The others are all plain: "Check your whole trip", "Why
 * bags get stopped at the gate", "How we work it out", "Sources". That is not a
 * coincidence — it is the same failure the home page had, where the headline
 * was a thesis and the reader had to get four lines in to learn what the site
 * did. An insight is what you EARN attention with; a service statement is what
 * you spend it on.
 *
 * WHAT THESE GUARDS DO AND DO NOT CLAIM, stated plainly because I checked.
 *
 * No test can decide whether a sentence is understandable. I put the old
 * headline back and ran these, and the jargon, length and punctuation rules all
 * passed it — "Bags checked against the airline's own limit" is seven plain
 * words with no term of art in it. Those three rules catch the mechanical
 * habits that produce a bad headline; they cannot catch a headline that is
 * merely unclear.
 *
 * ONE RULE DID CATCH IT, and it is the interesting one: the home page card
 * pointing at /bags and the /bags headline have to make the same promise. Two
 * independent statements of what a page is, written weeks apart, disagreeing —
 * that IS detectable, and it is a reliable smell. When a page cannot be
 * described the same way twice, it is usually because the description on the
 * page is doing something other than describing it.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]
  );

const pages = walk('src/pages').filter((f) => f.endsWith('.astro'));

const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** The visible words of each h1, with markup and expressions removed. */
const all = pages.flatMap((file) =>
  [...strip(readFileSync(file, 'utf8')).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => ({
    file,
    raw: m[1].trim(),
    /* `{' '}` is a real space; any other expression is a runtime value — a bag
       name or a count — which cannot be judged as copy. */
    text: m[1]
      .replace(/\{'\s*'\}/g, ' ')
      .replace(/\{[^}]*\}/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  }))
);

/* A HEADLINE MADE ENTIRELY OF DATA IS NOT COPY.
 *
 * /bags/[slug] has `<h1>{bag.brand} {bag.model}</h1>` — "Away The Carry-On".
 * There is no sentence there for anyone to have written badly: it is the name
 * of the thing the reader clicked, which is the most immediately understandable
 * headline a page can have, and it needs no subtitle to qualify it.
 *
 * Exempted on that PROPERTY rather than by filename, so a future product page
 * inherits the exemption and a future prose headline cannot accidentally claim
 * it — the moment someone writes a word of their own into one of these, every
 * rule below starts applying to it again. */
const headlines = all.filter((h) => h.text.length > 0);

describe('every page has exactly one headline', () => {
  test('one h1 per page, and none empty', () => {
    /* Two h1s is two answers to "what is this page", and a reader picks
       whichever they land on first. */
    for (const file of pages) {
      const n = [...strip(readFileSync(file, 'utf8')).matchAll(/<h1\b/g)].length;
      assert.equal(n, 1, `${file} has ${n} h1 elements`);
    }
    for (const { file, raw } of all) {
      assert.ok(raw.length > 0, `${file} has an empty h1`);
    }
  });
});

describe('a headline says the reader’s job, not our method', () => {
  /* THE HOUSE VOCABULARY IS FOR THE BODY, NOT THE TITLE.
   *
   * These are all words this codebase uses constantly and correctly. Every one
   * of them is a term of art the reader has not been taught yet, and a headline
   * is the one place on a page with nothing above it to do the teaching.
   * "overall" is here because it is precisely what tripped Frank on the bag
   * page badge — it means "wheels and handle included" to us and nothing at all
   * to a stranger. */
  const JARGON = [
    'allowance',
    'linear',
    'envelope',
    'dim source',
    'provenance',
    'overall figure',
    'strictness',
    'promotable',
    'facet',
    'binding leg',
  ];

  test('no headline uses a term the page has not defined yet', () => {
    const bad = [];
    for (const { file, text } of headlines) {
      for (const word of JARGON) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(text)) bad.push(`${file}: "${text}" — ${word}`);
      }
    }
    assert.deepEqual(
      bad,
      [],
      'a headline reaches for the house vocabulary:\n  ' + bad.join('\n  ')
    );
  });

  test('a headline is short enough to read at a glance', () => {
    /* Not a style preference. Past roughly ten words a title stops being a
       title and becomes the first sentence of the body, which is where the
       qualification belongs anyway. */
    for (const { file, text } of headlines) {
      const words = text.split(/\s+/).length;
      assert.ok(words <= 10, `${file}: ${words} words is a sentence, not a headline — "${text}"`);
    }
  });

  test('the qualification lives under the headline, not inside it', () => {
    /* An em dash or a colon in a title is usually the qualification being
       smuggled in: "Bags — checked against every airline's published limit".
       Frank's rule is that the subtitle is the right home for that, and every
       headline that needs one has a paragraph under it. */
    for (const { file, text } of headlines) {
      assert.doesNotMatch(
        text,
        /[—:;] /,
        `${file}: the clause after the punctuation belongs in the subtitle — "${text}"`
      );
    }
  });
});

describe('there is somewhere for the qualification to go', () => {
  test('every headline is followed by a paragraph', () => {
    /* The corollary of keeping titles plain: something has to carry the detail
       the title no longer does. A headline with nothing under it means the
       qualification was either lost or is still inside the title. */
    for (const { file } of headlines) {
      const src = strip(readFileSync(file, 'utf8'));
      const after = src.slice(src.indexOf('</h1>'));
      assert.match(
        after.slice(0, 400),
        /<p\b/,
        `${file}: nothing follows the headline, so any qualification has nowhere to live`
      );
    }
  });
});

describe('a link and the page it opens agree', () => {
  test('the home page card for /bags matches the /bags headline', () => {
    /* Continuity is what tells a reader the link did what they expected. The
       card said "how many airlines they actually clear" while the page said
       "the airline's own limit" — two descriptions of one page, neither
       confirming the other. */
    const home = strip(readFileSync('src/pages/index.astro', 'utf8'));
    const bagsHeadline = headlines.find((h) => h.file.endsWith(join('bags', 'index.astro')))?.text;
    assert.ok(bagsHeadline, '/bags has no headline');
    /* The shared claim, not the whole sentence — the card is allowed to be
       phrased differently, it is not allowed to promise something else. */
    const claim = 'how many airlines they fit';
    assert.match(bagsHeadline, new RegExp(claim, 'i'), `/bags headline: "${bagsHeadline}"`);
    const card = home.slice(home.indexOf('href="/bags/"'), home.indexOf('href="/bags/"') + 700);
    assert.match(card, new RegExp(claim, 'i'), 'the home page card promises something else');
  });
});

/* THE NAV MUST NOT NAME THE THING WE HELP PEOPLE AVOID.
 *
 * Frank, on the nav item pointing at /check: "maybe there is a better name that
 * describes what the page actually does."
 *
 * It said "Check a bag", and that is worse than vague. At an airport, checking
 * a bag means handing it over at the counter for the hold — the outcome every
 * page on this site is trying to help someone avoid. It was the most prominent
 * link in the header, and it named the failure state.
 *
 * "check" is a fine word here in every other use: check it AGAINST an airline,
 * check your trip, we check the limit. What collides is the bare verb-plus-bag
 * form, which the industry has already claimed. So the guard is narrow — it
 * forbids that phrase as a LABEL, and leaves the verb alone everywhere else.
 *
 * The second rule is the one that generalises: a nav item and the page it opens
 * have to describe themselves compatibly. "Check a bag" pointed at a page
 * titled "Check your whole trip" — two names for one thing, neither confirming
 * the other, which is the same failure the /bags headline had.
 */
describe('the nav says what the page does', () => {
  const header = readFileSync('src/components/Header.astro', 'utf8');
  const labels = [...header.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);
  const hrefs = [...header.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]);

  test('the nav is still three items', () => {
    assert.equal(labels.length, 3, `expected three nav items, found ${labels.length}`);
    assert.equal(hrefs.length, labels.length, 'every nav item needs a destination');
  });

  test('no label uses the airline’s phrase for the hold', () => {
    /* Deliberately narrow: "check a bag" and "check your bag" as a whole
       label. The verb is welcome everywhere else on the site. */
    for (const label of labels) {
      assert.doesNotMatch(
        label,
        /check\s+(a|your|the)\s+bags?\b/i,
        `"${label}" is what an airport calls putting a bag in the hold`
      );
    }
  });

  test('the tool’s label and its page agree', () => {
    /* Not a demand that they be identical — a nav item is allowed to be shorter
       than an h1. It must not be a DIFFERENT name for the same page. */
    const i = hrefs.indexOf('/check/');
    assert.ok(i > -1, 'nothing in the nav points at the tool');
    const label = labels[i].toLowerCase();
    const h1 = headlines.find((h) => h.file.endsWith('check.astro'))?.text.toLowerCase() ?? '';
    assert.ok(h1, '/check has no headline');
    const shared = label.split(/\s+/).filter((w) => w.length > 2 && h1.includes(w));
    assert.ok(
      shared.length >= 2,
      `the nav says "${labels[i]}" and the page says "${h1}" — pick one name`
    );
  });
});
