/* Facets, and the drift that hides them.
 *
 * THE BUG THIS EXISTS FOR. The /bags "Under-seat" pill was declared in GROUPS,
 * rendered nothing, and nobody noticed for weeks — because loadBags() defaults
 * to role:'overhead', so the bags behind it were filtered out upstream and the
 * pill's count came back 0. The "never render a dead filter" guard then did
 * its job perfectly and hid the evidence.
 *
 * That is the shape to test: a filter is a CONTRACT BETWEEN TWO FILES. The
 * page stamps values onto cards; the script reads them back. Neither half
 * fails loudly when they stop agreeing — the filter just silently matches
 * nothing, which looks exactly like "no bags like that". */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  axisLive,
  COVERAGE_FACETS,
  coverageFacet,
  facetCounts,
  facetsFor,
} from '../bag-facets.mjs';

const page = readFileSync('src/pages/bags/index.astro', 'utf8');
const filters = readFileSync('src/components/BagFilters.astro', 'utf8');
const panel = readFileSync('src/components/BagFacetPanel.astro', 'utf8');

describe('the page and the script agree on every facet', () => {
  test('every data-attribute the script reads is stamped by the page', () => {
    /* The script maps axis -> dataset key. Both sides must exist. */
    const map = filters.match(/\{\s*cov:\s*'(\w+)',\s*price:\s*'(\w+)',\s*role:\s*'(\w+)'\s*\}/);
    assert.ok(map, 'the axis→dataset map has moved; this test needs rewriting');

    const kebab = (k) => k.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
    for (const key of map.slice(1)) {
      const attr = `data-${kebab(key)}`;
      assert.ok(
        page.includes(attr),
        `the script reads dataset.${key} but bags/index.astro never stamps ${attr} — ` +
          'the filter will silently match nothing, exactly like the Under-seat pill did'
      );
    }
  });

  test('every axis the panel renders is an axis the script can read', () => {
    const axes = [...panel.matchAll(/axis:\s*'(\w+)'/g)].map((m) => m[1]);
    assert.ok(axes.length >= 3, 'expected three axes in the panel');
    for (const axis of axes) {
      assert.match(
        filters,
        new RegExp(`\\b${axis}:\\s*'bag`),
        `the panel offers the "${axis}" axis but the script has no dataset key for it`
      );
    }
  });
});

describe('axisLive', () => {
  test('one populated value is not a filter', () => {
    /* 39 overhead bags and 1 underseat bag is not a choice, it is a relabelling
       of the page. This is the rule keeping the role toggle off /bags. */
    assert.equal(axisLive({ overhead: 39 }), false);
    assert.equal(axisLive({ overhead: 39, underseat: 0 }), false);
    assert.equal(axisLive({ overhead: 39, underseat: 1 }), true);
  });

  test('an empty or missing axis is not live', () => {
    assert.equal(axisLive({}), false);
    assert.equal(axisLive(undefined), false);
  });
});

describe('coverage facets', () => {
  test('the cuts match the tint on the card', () => {
    /* BagCard tints at 0.8 and 0.4. If a filter called "most airlines" used a
       different threshold, the wall of colour a reader just scanned would stop
       predicting what the filter returns — and they would trust neither. */
    const card = readFileSync('src/components/BagCard.astro', 'utf8');
    assert.match(card, /ratio >= 0\.8/, 'BagCard tint threshold moved');
    assert.match(card, /ratio >= 0\.4/, 'BagCard tint threshold moved');

    assert.equal(coverageFacet({ pass: 10, of: 10 }), 'cov-all');
    assert.equal(coverageFacet({ pass: 8, of: 10 }), 'cov-most');
    assert.equal(coverageFacet({ pass: 4, of: 10 }), 'cov-some');
    assert.equal(coverageFacet({ pass: 3, of: 10 }), 'cov-few');
  });

  test('"every airline" means every airline, not merely most', () => {
    assert.equal(coverageFacet({ pass: 51, of: 52 }), 'cov-most');
    assert.equal(coverageFacet({ pass: 52, of: 52 }), 'cov-all');
  });

  test('no coverage is null, never a band', () => {
    assert.equal(coverageFacet(null), null);
    assert.equal(coverageFacet({ pass: 0, of: 0 }), null);
  });

  test('every rendered option is one coverageFacet can actually return', () => {
    const reachable = new Set(['cov-all', 'cov-most', 'cov-some', 'cov-few']);
    for (const f of COVERAGE_FACETS) {
      assert.ok(reachable.has(f.id), `${f.id} is offered but nothing can ever match it`);
    }
  });
});

describe('facetsFor over the real catalogue', () => {
  test('stamps a value for every bag, and never invents one', async () => {
    const { loadBags, loadCarriers } = await import('../data.mjs');
    const { shelve } = await import('../shelves.mjs');
    const entries = shelve(await loadBags(), await loadCarriers()).flatMap((s) => s.bags);
    const facets = facetsFor(entries);

    assert.ok(facets.size > 0);
    for (const { bag } of entries) {
      const f = facets.get(bag.slug);
      assert.ok(f, `${bag.slug} got no facets`);
      /* price is null until the intake lands — that is correct, not missing. */
      assert.equal(f.role, bag.record.role);
      assert.ok(f.cov === null || f.cov.startsWith('cov-'));
    }
  });

  test('counts only ever describe bags that are on the page', async () => {
    const { loadBags, loadCarriers } = await import('../data.mjs');
    const { shelve } = await import('../shelves.mjs');
    const entries = shelve(await loadBags(), await loadCarriers()).flatMap((s) => s.bags);
    const counts = facetCounts(facetsFor(entries));
    const slugs = new Set(entries.map((e) => e.bag.slug));
    for (const axis of Object.values(counts)) {
      for (const n of Object.values(axis)) {
        assert.ok(n <= slugs.size, 'a facet counts more bags than the page contains');
      }
    }
  });
});
