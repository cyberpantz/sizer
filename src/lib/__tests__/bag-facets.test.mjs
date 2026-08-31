/* Facets, and the two ways a filter goes quietly wrong.
 *
 * 1. DRIFT BETWEEN FILES. A filter is a contract: the page stamps values onto
 *    cards, the script reads them back, the panel counts them. No half fails
 *    loudly when they stop agreeing — the filter just matches nothing, which
 *    looks exactly like "no bags like that". The /bags "Under-seat" pill was
 *    declared in GROUPS, rendered nothing for weeks, and the "never render a
 *    dead filter" guard hid the evidence perfectly.
 *
 * 2. RESTATING THE PAGE. The first version of this panel filtered on COVERAGE,
 *    which looked like the obvious axis and was in fact the shelf headings as
 *    checkboxes: "Goes anywhere" was exactly cov-all + cov-most. Ticking a box
 *    showed one shelf, which the reader could reach by scrolling to a heading
 *    already on screen. A filter has to offer something the page does not
 *    already say — hence weight and shell, which appear nowhere else. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  AXES,
  axisLive,
  FACET_MATCH,
  facetCounts,
  facetsFor,
  optionCount,
  SHELL_FACETS,
  shellFacet,
  WEIGHT_FACETS,
  weightFacet,
} from '../bag-facets.mjs';

const page = readFileSync('src/pages/bags/index.astro', 'utf8');
const filters = readFileSync('src/components/BagFilters.astro', 'utf8');
const panel = readFileSync('src/components/BagFacetPanel.astro', 'utf8');

const entries = async () => {
  const { loadBags, loadCarriers } = await import('../data.mjs');
  const { shelve } = await import('../shelves.mjs');
  return shelve(await loadBags(), await loadCarriers()).flatMap((s) => s.bags);
};

describe('the page, the panel and the script agree', () => {
  test('every data-attribute the script reads is stamped by the page', () => {
    const map = filters.match(/const key = \{([^}]*)\}/);
    assert.ok(map, 'the axis→dataset map has moved; this test needs rewriting');
    const keys = [...map[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.ok(keys.length >= 4, `expected one dataset key per axis, found ${keys.length}`);

    for (const key of keys) {
      const attr = `data-${key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)}`;
      assert.ok(
        page.includes(attr),
        `the script reads dataset.${key} but bags/index.astro never stamps ${attr} — ` +
          'the filter will silently match nothing, exactly like the Under-seat pill did'
      );
    }
  });

  test('every axis the panel renders is one the script can read', () => {
    const axes = [...panel.matchAll(/axis:\s*'(\w+)'/g)].map((m) => m[1]);
    assert.ok(axes.length >= 4, `expected four axes in the panel, found ${axes.length}`);
    for (const axis of axes) {
      assert.ok(AXES.includes(axis), `the panel offers "${axis}", which facetsFor never stamps`);
      assert.match(
        filters,
        new RegExp(`\\b${axis}:\\s*'bag`),
        `the panel offers the "${axis}" axis but the script has no dataset key for it`
      );
    }
  });

  test('facetsFor stamps every axis it advertises', async () => {
    const facets = facetsFor(await entries());
    assert.ok(facets.size > 0);
    for (const f of facets.values()) {
      for (const axis of AXES) {
        assert.ok(axis in f, `facetsFor never stamped "${axis}"`);
      }
    }
  });
});

describe('no axis restates the shelves', () => {
  test('no facet partitions the catalogue the way the shelf headings do', async () => {
    /* The coverage bug, as a guard. If a facet's value happens to split the
       catalogue into exactly the same groups as the shelves, the panel is
       offering the page's own structure back and the reader gains a click. */
    const rows = await entries();
    const { shelve } = await import('../shelves.mjs');
    const { loadBags, loadCarriers } = await import('../data.mjs');
    const shelves = shelve(await loadBags(), await loadCarriers());
    const shelfOf = new Map();
    for (const [i, s] of shelves.entries()) for (const e of s.bags) shelfOf.set(e.bag.slug, i);

    const facets = facetsFor(rows);
    for (const axis of AXES) {
      /* Build the partition this axis induces, then check it is not a
         relabelling of the shelf partition. */
      const groups = new Map();
      let stamped = 0;
      for (const [slug, f] of facets) {
        if (f[axis] == null) continue;
        stamped += 1;
        (groups.get(f[axis]) ?? groups.set(f[axis], new Set()).get(f[axis])).add(slug);
      }
      if (stamped === 0 || groups.size < 2) continue; // dormant axis

      const identical = [...groups.values()].every((set) => {
        const shelvesHit = new Set([...set].map((s) => shelfOf.get(s)));
        return shelvesHit.size === 1;
      });
      assert.ok(
        !identical || groups.size !== shelves.length,
        `the "${axis}" facet splits the catalogue exactly along the shelf headings — ` +
          'it restates the page instead of adding to it'
      );
    }
  });
});

describe('axisLive', () => {
  test('one populated value is not a filter', () => {
    /* 44 overhead bags and 0 underseat is not a choice, it is a relabelling of
       the page. This is the rule keeping the role toggle off /bags. */
    assert.equal(axisLive({ overhead: 44 }), false);
    assert.equal(axisLive({ overhead: 44, underseat: 0 }), false);
    assert.equal(axisLive({ overhead: 44, underseat: 1 }), true);
  });

  test('an empty or missing axis is not live', () => {
    assert.equal(axisLive({}), false);
    assert.equal(axisLive(undefined), false);
  });
});

describe('weight', () => {
  test('a bag lands in the narrowest threshold it satisfies', () => {
    assert.equal(weightFacet({ weight_kg: { v: 1.22 } }), 'w-25');
    assert.equal(weightFacet({ weight_kg: { v: 2.6 } }), 'w-30');
    assert.equal(weightFacet({ weight_kg: { v: 3.2 } }), 'w-35');
    assert.equal(weightFacet({ weight_kg: { v: 4.9 } }), 'w-over');
  });

  test('an unweighed bag is not a light bag', () => {
    /* Same rule as an unpriced bag and an unscored airline: absence of a
       figure must never render as a flattering one. */
    assert.equal(weightFacet({}), null);
    assert.equal(weightFacet({ weight_kg: null }), null);
    assert.equal(weightFacet(null), null);
  });

  test('the options are cumulative — a lighter bag satisfies a looser threshold', () => {
    /* Nobody filters FOR a heavy bag, so these are floors, not bands. A
       1.2 kg bag must appear under "under 3.5 kg" as well as "under 2.5". */
    const light = { weight_kg: { v: 1.22 } };
    const facets = new Map([['x', { weight: weightFacet(light) }]]);
    for (const f of WEIGHT_FACETS) {
      assert.equal(optionCount(facets, 'weight', f.id), 1, `${f.id} missed a 1.22 kg bag`);
    }
  });

  test('a heavier bag does NOT satisfy a tighter threshold', () => {
    const heavy = new Map([['x', { weight: weightFacet({ weight_kg: { v: 3.2 } }) }]]);
    assert.equal(optionCount(heavy, 'weight', 'w-25'), 0);
    assert.equal(optionCount(heavy, 'weight', 'w-35'), 1);
  });

  test('thresholds ascend, so the cumulative sets nest', () => {
    const maxes = WEIGHT_FACETS.map((f) => f.max);
    assert.deepEqual(
      maxes,
      [...maxes].sort((a, b) => a - b),
      'WEIGHT_FACETS must ascend'
    );
    for (const [i, f] of WEIGHT_FACETS.entries()) {
      assert.equal(FACET_MATCH.weight[f.id].length, i + 1);
    }
  });
});

describe('shell', () => {
  test('reads the soft flag, and null when it is absent', () => {
    assert.equal(shellFacet({ soft: 1 }), 'soft');
    assert.equal(shellFacet({ soft: 0 }), 'hard');
    assert.equal(shellFacet({}), null);
  });

  test('is not derivable from the shape pills, which is why it exists', () => {
    /* GROUPS merges "hardside spinner" and "softside spinner" into one
       "Spinners" pill, so without this axis a reader cannot ask for a soft
       bag at all. If that ever stops being true, this facet is redundant. */
    const spinner = filters.match(/id: 'spinner'[^}]*types: \[([^\]]*)\]/);
    assert.ok(spinner, 'the spinner group has moved');
    assert.match(spinner[1], /hardside/, 'the spinner pill no longer merges shells');
    assert.match(spinner[1], /softside/, 'the spinner pill no longer merges shells');
    assert.equal(SHELL_FACETS.length, 2);
  });
});

describe('over the real catalogue', () => {
  test('every option count equals the bags that option will actually show', async () => {
    /* The number beside a checkbox is a promise about what ticking it does.
       Computed from FACET_MATCH — the same map the filter script matches with
       — so the two cannot disagree. */
    const facets = facetsFor(await entries());
    for (const axis of AXES) {
      for (const id of Object.keys(FACET_MATCH[axis] ?? {})) {
        const wanted = new Set(FACET_MATCH[axis][id]);
        let n = 0;
        for (const f of facets.values()) if (wanted.has(f[axis])) n += 1;
        assert.equal(optionCount(facets, axis, id), n, `${axis}/${id} count disagrees`);
      }
    }
  });

  test('counts never describe bags that are not on the page', async () => {
    const rows = await entries();
    const counts = facetCounts(facetsFor(rows));
    const total = new Set(rows.map((e) => e.bag.slug)).size;
    for (const axis of Object.values(counts)) {
      for (const n of Object.values(axis)) {
        assert.ok(n <= total, 'a facet counts more bags than the page contains');
      }
    }
  });
});
