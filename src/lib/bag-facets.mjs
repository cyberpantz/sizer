/* The facets a bag can be filtered on, in one place.
 *
 * ONE definition, imported by the page (which stamps the values onto each
 * card) and by the filter component (which reads them back). Two lists would
 * drift, and the drift is silent: a facet the page stops stamping just quietly
 * matches nothing, which looks like "no bags like that" rather than a bug.
 * That is precisely how the /bags "Under-seat" pill spent weeks declared and
 * never rendered.
 *
 * EVERY FACET IS DATA-GATED. A facet whose values are all null does not render
 * at all — the rule already in BagFilters: "a dead filter is a dead end the
 * reader has to discover by clicking it." Two of the four facets here are
 * empty today and will light up on their own when the intake lands
 * (resources/bags/_INTAKE-BRIEF.md).
 */
import { bandOf, cutPoints } from './price-band.mjs';

/* Coverage bands. The site's whole promise is "will this get through", so how
   many airlines a bag actually clears is the most useful thing we can offer to
   filter on — and unlike price and role it is computed, so it works today.

   Cuts match BagCard's own tint thresholds (0.8 / 0.4). A card tinted green
   and a filter called "most airlines" must mean the same thing, or the wall of
   colour the reader just scanned stops predicting the filter. */
export const COVERAGE_FACETS = [
  { id: 'cov-all', label: 'Every airline', hint: 'Clears all of them, at the fare we default to.' },
  { id: 'cov-most', label: 'Most airlines', hint: '80% or more.' },
  { id: 'cov-some', label: 'Some airlines', hint: 'Between 40% and 80%.' },
];

export function coverageFacet(coverage) {
  if (!coverage?.of) return null;
  const r = coverage.pass / coverage.of;
  if (r === 1) return 'cov-all';
  if (r >= 0.8) return 'cov-most';
  if (r >= 0.4) return 'cov-some';
  return 'cov-few';
}

/* Where a bag is meant to go. `role` in the record; the catalogue holds
   overhead, underseat and checked.

   NOTE the honest state of this one: /bags loads role:'overhead' by default,
   so only one underseat bag is even reachable. The facet is defined here and
   gated on stock, so it appears when there are underseat bags and not before —
   rather than shipping a toggle that splits the catalogue 39-to-1. */
export const ROLE_FACETS = [
  { id: 'overhead', label: 'Overhead', hint: 'The bin above your seat.' },
  { id: 'underseat', label: 'Under-seat', hint: 'A different allowance, not a small carry-on.' },
];

export const PRICE_HINTS = {
  budget: 'The least expensive bags that reviewers still stand behind.',
  midrange: 'The middle third of the catalogue.',
  luxury: 'The top third. No upper limit.',
};

/**
 * Stamp every facet value onto each bag, once, at build time.
 * @param {{bag: object, coverage: object}[]} entries
 * @returns {Map<string, {role: string|null, price: string|null, cov: string|null}>} by slug
 */
export function facetsFor(entries) {
  const cuts = cutPoints(entries.map((e) => e.bag.record));
  const out = new Map();
  for (const { bag, coverage } of entries) {
    out.set(bag.slug, {
      role: bag.record?.role ?? null,
      price: bandOf(bag.record, cuts),
      cov: coverageFacet(coverage),
    });
  }
  return out;
}

/**
 * How many bags sit behind each facet value. Drives whether a facet — and its
 * whole section — renders at all.
 */
export function facetCounts(facets) {
  const counts = { role: {}, price: {}, cov: {} };
  for (const f of facets.values()) {
    for (const axis of ['role', 'price', 'cov']) {
      const v = f[axis];
      if (v) counts[axis][v] = (counts[axis][v] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * An axis is worth showing only if at least TWO of its values have bags.
 *
 * One populated value is not a filter, it is a relabelling of the whole page:
 * every bag matches, so choosing it changes nothing and the reader learns
 * only that they wasted a click. This is the rule that keeps the Overhead /
 * Under-seat toggle off the page while it would read 39 versus 1.
 */
export const axisLive = (counts) => Object.values(counts ?? {}).filter((n) => n > 0).length >= 2;
