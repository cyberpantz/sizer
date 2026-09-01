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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const page = readFileSync('src/pages/bags/[slug].astro', 'utf8');

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === '__tests__' ? [] : walk(join(d, e.name))) : [join(d, e.name)]
  );

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

/* NO BADGE MAY REQUIRE A GLOSSARY.
 *
 * Frank, reading the top rung of the ladder: "What does 'Maker's overall
 * figure' mean?"
 *
 * It meant nothing unless you already knew the trade's vocabulary. "Overall"
 * is a term of art for the outside of the bag with wheels and handle counted,
 * as against the packing body — and knowing that distinction exists is the
 * whole premise of this site, which is exactly why the badge cannot assume it.
 *
 * The lower rungs were fine because each names its contrast. This guard holds
 * the top ones to the same standard: a badge that claims a figure is
 * trustworthy has to say what makes it trustworthy, in words, not in an
 * adjective the reader has to already understand. */
describe('the source badge explains itself', () => {
  /* Scoped to the SOURCE_BADGE object. SOURCE_LINE below it is keyed the same
     way and is the FOLDED prose — held to a different standard, since it has
     room to explain and this does not. */
  const block = page.match(/const SOURCE_BADGE = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  const badges = [...block.matchAll(/\[DIM_SOURCE\.([A-Z_]+)\]:\s*(['"`])(.*?)\2,/g)].map((m) => [
    m[1],
    m[3],
  ]);

  test('all six rungs carry a badge', () => {
    assert.equal(badges.length, 6, `expected six source badges, found ${badges.length}`);
  });

  test('the trusted rungs say the wheels are in the number', () => {
    /* These two are the ones that let a bag be RECOMMENDED. A reader deciding
       whether to trust the figure needs to know what it measures, and "wheels
       and handle" is the only phrase that settles it — it is what an airline
       puts against the gauge. */
    for (const rung of ['MEASURED', 'MAKER_OVERALL']) {
      const copy = badges.find(([k]) => k === rung)?.[1] ?? '';
      assert.match(copy, /wheels/i, `${rung} does not say whether wheels are included: "${copy}"`);
    }
  });

  test('no badge relies on "overall" to carry the meaning', () => {
    /* The word may appear, but never as the only thing distinguishing this
       rung from the ones below it. */
    for (const [rung, copy] of badges) {
      if (!/overall/i.test(copy)) continue;
      assert.match(
        copy,
        /wheels|handle|outside/i,
        `${rung} uses "overall" as a term of art with nothing to unpack it: "${copy}"`
      );
    }
  });

  test('every badge says whose number it is, or that we took it ourselves', () => {
    /* "Retail listing" did not, and a reader had no way to tell it apart from
       a manufacturer figure without opening the panel. */
    for (const [rung, copy] of badges) {
      assert.match(
        copy,
        /manufacturer|we measured|packing size/i,
        `${rung} does not say who the figure came from: "${copy}"`
      );
    }
  });
});

/* ONE WORD FOR THE PARTY WHOSE NUMBER DECIDES THE VERDICT.
 *
 * Frank: "Maker might be unexpected language to use in the US market — people
 * are more familiar with manufacturer."
 *
 * The site had in fact already chosen. /methodology, /sources, /guide and the
 * folded provenance prose all said "manufacturer"; the badges and a scattering
 * of body copy said "maker". /bags did both inside one paragraph — "each
 * manufacturer's own product page", and two lines later "where a maker
 * publishes both" — which is what an unenforced house style always converges
 * on, since each sentence is written on a different day.
 *
 * This is not pedantry about a synonym. Provenance is the product: the whole
 * claim is that we can tell you WHO said a number and what it measures. A
 * reader who cannot tell whether "the maker" and "the manufacturer" are the
 * same party has been handed a distinction we did not mean to draw.
 *
 * Comments are exempt. This is about what a reader sees. */
describe('house vocabulary', () => {
  const pages = walk('src').filter((f) => /\.(astro|jsx)$/.test(f));

  test('no rendered copy says "maker"', () => {
    const offenders = [];
    for (const file of pages) {
      const src = readFileSync(file, 'utf8')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of src.matchAll(/\bmakers?('s)?\b/gi)) {
        /* `makers` is also the variable holding the manufacturer list on
           /sources, and DIM_SOURCE.MAKER_* are schema keys. Neither is copy. */
        const around = src.slice(Math.max(0, m.index - 24), m.index + 24);
        if (/DIM_SOURCE|maker_|makers\.map|const makers|bags_maker/i.test(around)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${file}:${line}  …${around.replace(/\s+/g, ' ').trim()}…`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'rendered copy says "maker" where the rest of the site says "manufacturer":\n  ' +
        offenders.join('\n  ')
    );
  });
});
