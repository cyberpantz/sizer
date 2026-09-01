/* THE ONE FACET THAT IS A LOOKUP.
 *
 * Frank: "the bags page needs a brands multiselect filter."
 *
 * Every other facet on /bags helps a reader refine a question they are still
 * forming — how heavy, how much, hard or soft. Brand is the opposite: they
 * arrive already knowing the answer. They own a Travelpro, or a review sent
 * them here for the Monos, and until now the only way to learn whether we hold
 * it was to scroll 57 cards reading names.
 *
 * That difference is why two of the panel's own rules bend for this axis, and
 * why both bends are written down rather than left to look like oversights.
 * The tests below are mostly about the ways a derived, high-cardinality facet
 * can go quietly wrong: a slug collision that returns one maker's bags under
 * another's name, a count that describes a different set than the filter
 * returns, a search box that hides a control and makes it look cleared.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  AXES,
  brandFacets,
  brandId,
  facetsFor,
  matchesFacets,
  optionCount,
} from '../bag-facets.mjs';
import { loadBags, loadCarriers } from '../data.mjs';
import { shelve } from '../shelves.mjs';

const bags = await loadBags();
const carriers = await loadCarriers();
const entries = shelve(bags, carriers).flatMap((s) => s.bags);
const facets = facetsFor(entries);
const brands = brandFacets(entries);

describe('the brand list is derived, never typed', () => {
  test('every brand in the catalogue has an option', () => {
    /* A typed list goes stale the first time a bag is added, and silently — an
       undeclared brand simply never appears, which reads to a visitor as "they
       do not stock it" rather than as a bug. */
    const inCatalogue = new Set(entries.map((e) => e.bag.brand).filter(Boolean));
    const offered = new Set(brands.map((b) => b.label));
    assert.deepEqual([...inCatalogue].filter((b) => !offered.has(b)), []);
  });

  test('it is ordered for finding a NAME', () => {
    /* Alphabetical, not by inventory. Every other axis is ordered by meaning —
       light to heavy, cheap to dear — because the reader is comparing. Nobody
       scans brands by how many bags we hold; they scan for a word, and a word
       is findable in one order only. */
    const sorted = [...brands].sort((a, b) => a.label.localeCompare(b.label));
    assert.deepEqual(
      brands.map((b) => b.label),
      sorted.map((b) => b.label)
    );
  });

  test('brand is a real axis, so the panel and the filter agree about it', () => {
    /* AXES is the one list three places iterate. An axis missing from it is
       stamped but never counted, or counted but never matched — the silent
       drift the module header was written about. */
    assert.ok(AXES.includes('brand'));
  });
});

describe('the slug cannot merge two makers', () => {
  test('accents decompose rather than vanish', () => {
    /* Béis slugged to `b-is` — the é stripped, leaving a gap. Harmless while
       unique, and a silent merge the moment the catalogue holds a brand that
       differs from another only by an accent. `beis` is also what a reader
       types when searching for it. */
    assert.equal(brandId('Béis'), 'beis');
    assert.equal(brandId('Briggs & Riley'), 'briggs-and-riley');
    assert.equal(brandId("Bric's"), 'bric-s');
  });

  test('every id in the catalogue is unique and non-empty', () => {
    const ids = brands.map((b) => b.id);
    assert.deepEqual(ids.filter((x) => !x), [], 'a brand slugged to nothing');
    assert.equal(new Set(ids).size, ids.length, 'two brands share an id');
  });

  test('a collision throws rather than merging quietly', () => {
    /* The filter matches on the id, so a collision returns one maker's bags
       under another's name — and the count beside the checkbox would still be
       right, which is what makes it invisible. This is the kind of thing a
       future catalogue addition causes and nobody re-reads for. */
    assert.throws(
      () => brandFacets([{ bag: { brand: 'Béis', slug: 'a' } }, { bag: { brand: 'Beis', slug: 'b' } }]),
      /two brands slug to/
    );
  });
});

describe('the number beside a checkbox is the number of cards it leaves', () => {
  test('each brand count matches the catalogue exactly', () => {
    /* The panel's standing rule, and the most checkable way for it to lie. */
    const wrong = [];
    for (const b of brands) {
      const shown = optionCount(facets, 'brand', b.id);
      const real = new Set(
        entries.filter((e) => e.bag.brand === b.label).map((e) => e.bag.slug)
      ).size;
      if (shown !== real) wrong.push(`${b.label}: panel ${shown}, catalogue ${real}`);
    }
    assert.deepEqual(wrong, []);
  });

  test('the counts account for every bag', () => {
    /* Brands partition the catalogue — unlike weight or price, where a null is
       legitimate. A bag with no brand would be unreachable by this filter AND
       missing from every count, so the sum is the cheapest way to notice. */
    const sum = brands.reduce((n, b) => n + optionCount(facets, 'brand', b.id), 0);
    assert.equal(sum, new Set(entries.map((e) => e.bag.slug)).size);
  });
});

describe('single-bag brands stay on the list', () => {
  test('most of the catalogue is one-bag brands, and they are all offered', () => {
    /* THE DELIBERATE EXCEPTION. Elsewhere a one-bag option is close to a
       wasted click. Here, "we have one Rimowa" is a complete answer to the
       question actually being asked, and dropping it would make the catalogue
       look like it holds nothing by that maker. */
    const singles = brands.filter((b) => optionCount(facets, 'brand', b.id) === 1);
    assert.ok(singles.length > 5, 'expected many single-bag brands in this catalogue');
    for (const b of singles) {
      assert.ok(brands.some((x) => x.id === b.id), `${b.label} was pruned`);
    }
  });
});

describe('the search box is a view, not a filter', () => {
  const panel = readFileSync('src/components/BagFacetPanel.astro', 'utf8');
  const filters = readFileSync('src/components/BagFilters.astro', 'utf8');

  test('it appears only when the list is long enough to warrant it', () => {
    /* Gated on the option count rather than hard-coded to this axis, so it
       arrives and leaves with the catalogue. A search box over four options is
       furniture. */
    assert.match(panel, /s\.search && s\.options\.length > 12/);
  });

  test('typing hides labels and never touches a checkbox', () => {
    /* The panel's founding rule is that a filter you cannot see is a filter you
       forget you set — and a search box is the easiest possible way to break
       it, because hiding a control looks exactly like clearing it. A brand
       ticked and then typed out of view stays ticked, stays in the badge count
       and stays visible as a chip in the open. */
    const block = filters.match(/data-facet-search[\s\S]*?\n  \}/)?.[0] ?? '';
    assert.ok(block, 'the search wiring has gone');
    assert.doesNotMatch(block, /\.checked\s*=/, 'the search box is clearing checkboxes');
    assert.match(block, /label\.hidden = !hit/);
  });

  test('it matches anywhere in the name, not just the start', () => {
    /* Someone hunting for Briggs & Riley may well type "riley", and a prefix
       match would tell them we do not stock it. */
    assert.match(filters, /textContent\.toLowerCase\(\)\.includes\(q\)/);
  });

  test('"Clear all" resets it', () => {
    /* It is a view of the option list, not a filter on the catalogue. Leave it
       set and a reader who typed "tum", cleared everything and reopened the
       panel finds one brand listed and 31 apparently gone. */
    const clear = filters.match(/function clearAll\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
    assert.match(clear, /data-facet-search/, '"Clear all" leaves the search box set');
  });

  test('a search with no hits says so', () => {
    assert.match(panel, /data-facet-empty/, 'an empty result is an unexplained blank box');
  });
});

/* THE MATCHING RULE, NOW THAT IT CAN BE REACHED.
 *
 * These are the first tests of what the /bags filter actually DOES rather than
 * of what its source says. They only became possible because matchesFacets()
 * moved into this module — and it could only move once BagFilters stopped
 * using `define:vars`, which forces a script inline and therefore forbids it
 * from importing anything.
 *
 * That constraint is what had duplicated the rule in the first place: the
 * panel counted with FACET_MATCH and the script matched with a hand-rolled
 * loop written out beside it. bag-facets.mjs opens by warning about exactly
 * this, and the warning was being violated three files away by an Astro
 * directive nobody connected to it.
 *
 * Brand is what forced the fix. An error in the weight axis announces itself —
 * you can see that a 2 kg bag is missing. Nobody knows off-hand how many
 * Travelpros we hold, so a brand-matching bug would look like the catalogue.
 */
describe('what ticking boxes actually does', () => {
  const bagsBy = (axis) => {
    const out = new Map();
    for (const [slug, f] of facets) {
      if (!f[axis]) continue;
      if (!out.has(f[axis])) out.set(f[axis], []);
      out.get(f[axis]).push(slug);
    }
    return out;
  };

  test('two brands ticked returns BOTH, not the intersection', () => {
    /* Within an axis the test is OR. Getting this backwards makes every extra
       tick return fewer bags until nothing is left, which reads to a visitor
       as an empty catalogue rather than a broken rule — and it is the single
       most common way a faceted search is built wrong. */
    const [a, b] = brands.slice(0, 2).map((x) => x.id);
    const shown = [...facets].filter(([, f]) => matchesFacets(f, { brand: new Set([a, b]) }));
    const expected = [...facets].filter(([, f]) => f.brand === a || f.brand === b);
    assert.equal(shown.length, expected.length);
    assert.ok(shown.length > 1, 'two brands should return more than one bag');
  });

  test('a brand AND a shell narrows to the overlap', () => {
    /* Across axes the test is AND. */
    const brandWithBoth = brands.find((x) => {
      const slugs = [...facets].filter(([, f]) => f.brand === x.id);
      return new Set(slugs.map(([, f]) => f.shell)).size > 1;
    });
    if (!brandWithBoth) return; // no brand in the catalogue spans both shells
    const both = [...facets].filter(([, f]) =>
      matchesFacets(f, { brand: new Set([brandWithBoth.id]), shell: new Set(['soft']) })
    );
    const brandOnly = [...facets].filter(([, f]) =>
      matchesFacets(f, { brand: new Set([brandWithBoth.id]) })
    );
    assert.ok(both.length < brandOnly.length, 'adding an axis did not narrow the result');
    assert.ok(both.every(([, f]) => f.shell === 'soft'));
  });

  test('an empty selection matches everything', () => {
    /* The page opens in this state, and it must show the whole catalogue
       rather than nothing. */
    for (const [, f] of facets) assert.equal(matchesFacets(f, {}), true);
  });

  test('an axis with nothing ticked constrains nothing', () => {
    /* selection() only creates a Set when a box is checked, so this should not
       arise — but a filter that silently hid everything on an empty Set would
       be indistinguishable from "no bags match", and that is a bad way to find
       out. */
    for (const [, f] of facets) {
      assert.equal(matchesFacets(f, { brand: new Set() }), true);
    }
  });

  test('cumulative weight options still expand, unaffected by the new axis', () => {
    /* "Under 3.5 kg" has to include a bag under 2.5 kg. Checked here because
       matchesFacets is now the single implementation — if adding brand had
       broken the expansion, the counts and the filter would still agree with
       each other while both being wrong. */
    const light = [...facets].filter(([, f]) => f.weight === 'w-25');
    assert.ok(light.length > 0, 'no bag is under 2.5 kg');
    for (const [, f] of light) {
      assert.equal(matchesFacets(f, { weight: new Set(['w-35']) }), true);
    }
  });

  test('every bag is reachable through its own brand', () => {
    /* The end-to-end claim the whole feature makes: pick a brand, see its
       bags. Run over the real catalogue rather than a fixture, because a
       fixture would let me invent brand names that slug cleanly. */
    for (const [slug, f] of facets) {
      assert.equal(
        matchesFacets(f, { brand: new Set([f.brand]) }),
        true,
        `${slug} cannot be found under its own brand`
      );
    }
  });
});
