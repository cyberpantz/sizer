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

/* WHY THERE IS NO COVERAGE FACET, having built one and thrown it away.
 *
 * Coverage looked like the obvious axis — the site's whole promise is "will
 * this get through". But /bags is ALREADY grouped by coverage: the shelves are
 * "Goes anywhere", "Goes almost anywhere", "Fine in the US, a problem abroad",
 * and they partition the catalogue on exactly the same thresholds. Measured
 * against the real data the sets were identical, not merely similar:
 *
 *   Goes anywhere                     = cov-all(1) + cov-most(9)
 *   Goes almost anywhere              = cov-some(12)
 *   Fine in the US, a problem abroad  = cov-few(22)
 *
 * So the filter was the headings restated as checkboxes. Ticking "80% or more"
 * showed precisely the first shelf — which the reader can reach by scrolling
 * to a heading that is already on screen. A control that duplicates the page's
 * own structure adds a click and no information.
 *
 * What belongs in a filter is what the page does NOT already say. Weight is on
 * no card and no heading, and the shape pills merge hardside and softside
 * spinners into one "Spinners", so the shell is invisible too. Both are
 * populated for essentially the whole catalogue today. */

/* Weight, as cumulative "under" thresholds rather than bands.
 *
 * Nobody filters FOR a heavy bag, so disjoint bands would spend two of three
 * options on questions no reader is holding. "Under 3 kg" is the actual query.
 *
 * It matters more than it looks: the Asian LCCs in the carrier set cap CABIN
 * WEIGHT at 7 kg, often shared with the personal item. An empty 4.9 kg
 * suitcase leaves under 2 kg to pack. That is the difference between a bag
 * that works on those routes and one that cannot, and nothing else on this
 * page surfaces it. */
/* NO UNIT IS BAKED INTO A LABEL.
 *
 * These read "Under 2.5 kg" and stayed in kilograms with the toggle set to
 * imperial — the numbers came from `max`, but the word "kg" was part of the
 * string, so nothing could reach it. Same bug as the hard-coded weights on the
 * cards, one layer further out, and the guard written for that one missed it
 * because it only searched .astro markup. A unit living inside a label is
 * invisible to every tool that looks for a unit next to a number.
 *
 * So a facet carries only the FIGURE and the words around it. The component
 * assembles the label with a conversion hook around the number, which is what
 * lets the toggle rewrite it in place. `cap` is the cabin weight limit the
 * hint is measured against, carried the same way for the same reason. */
export const WEIGHT_FACETS = [
  { id: 'w-25', prefix: 'Under', max: 2.5, hintCap: 7 },
  { id: 'w-30', prefix: 'Under', max: 3, hintCap: null },
  { id: 'w-35', prefix: 'Under', max: 3.5, hintCap: null },
];

/** The heaviest threshold a bag satisfies — the narrowest bucket it lands in.
 *  Null when nobody has recorded a weight, which is not the same as light. */
export function weightFacet(record) {
  const kg = record?.weight_kg?.v ?? record?.weight_kg;
  if (typeof kg !== 'number' || !Number.isFinite(kg)) return null;
  return WEIGHT_FACETS.find((f) => kg < f.max)?.id ?? 'w-over';
}

/* Shell. Hidden by the shape pills, which merge "hardside spinner" and
   "softside spinner" into one "Spinners" — so a reader who wants a soft bag
   has no way to ask for one. The site's own editorial makes the case that this
   matters: a soft bag compresses into a sizer frame in a way a hard shell
   never will, which is why the one bag clearing every airline has no wheels. */
export const SHELL_FACETS = [
  { id: 'hard', label: 'Hardside', hint: 'Protects what is inside. Will not compress.' },
  {
    id: 'soft',
    label: 'Softside',
    hint: 'Gives a little under a sizer, which sometimes decides it.',
  },
];

export const shellFacet = (record) => (record?.soft == null ? null : record.soft ? 'soft' : 'hard');
/* Which stamped values satisfy each option, per axis.
   Weight options are CUMULATIVE — "under 3.5 kg" must also match a bag under
   2.5 kg — so an option is not always the same string as the value stamped on
   the card. Identity for the rest: role, price and shell are plain equality.

   Shared by the panel (which counts) and the filter script (which matches).
   Two copies of this is exactly how a count starts describing a different set
   of bags than the filter returns. */
export const FACET_MATCH = {
  weight: Object.fromEntries(
    WEIGHT_FACETS.map((f, i) => [f.id, WEIGHT_FACETS.slice(0, i + 1).map((x) => x.id)])
  ),
};

/** Every stamped value one chosen option stands for. Cumulative axes expand;
 *  everything else is identity. */
export const valuesFor = (axis, id) => FACET_MATCH[axis]?.[id] ?? [id];

/**
 * Does a bag's stamped facet values satisfy a selection?
 *
 * WITHIN an axis the test is OR — budget OR midrange. ACROSS axes it is AND —
 * budget AND softside. That is what every faceted search does, and getting it
 * backwards makes each additional tick return fewer results until nothing is
 * left, which reads as a broken catalogue rather than a broken rule.
 *
 * Lives here, beside FACET_MATCH and optionCount, because the file's own
 * header states the principle: two copies of the matching rule is exactly how
 * a count starts describing a different set of bags than the filter returns.
 * It was inline in BagFilters.astro, where nothing could reach it — and the
 * brand axis is the first one where a mistake would be invisible rather than
 * obvious, since nobody knows off-hand how many Travelpros we hold.
 *
 * @param {Record<string, string|null>} values  stamped facets for one bag
 * @param {Record<string, Iterable<string>>} selection  chosen option ids by axis
 */
export function matchesFacets(values, selection) {
  for (const [axis, chosen] of Object.entries(selection)) {
    const wanted = new Set([...chosen].flatMap((id) => valuesFor(axis, id)));
    if (!wanted.size) continue; // an axis with nothing ticked constrains nothing
    if (!wanted.has(values?.[axis] ?? '')) return false;
  }
  return true;
}

/** Bags satisfying one option — used for its count, so the number beside a
 *  checkbox is the number of cards ticking it will actually leave on screen. */
export const optionCount = (facets, axis, id) => {
  const wanted = new Set(FACET_MATCH[axis]?.[id] ?? [id]);
  let n = 0;
  for (const f of facets.values()) if (wanted.has(f[axis])) n += 1;
  return n;
};

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

/* BRAND — the one axis a reader arrives already knowing the answer to.
 *
 * Every other facet here is a QUESTION the page helps them refine: how heavy,
 * how much, hard or soft. Brand is a lookup. Someone owns a Travelpro, or their
 * partner swears by Briggs & Riley, or a review sent them here for the Monos —
 * and until now the only way to find out whether we hold it was to scroll 57
 * cards reading names.
 *
 * THAT DIFFERENCE CHANGES TWO OF THE PANEL'S OWN RULES, and both changes are
 * deliberate rather than oversights:
 *
 *   1. A ONE-BAG OPTION IS STILL WORTH SHOWING. Elsewhere an option matching a
 *      single bag is close to a wasted click. Here, 20 of the 32 brands have
 *      exactly one bag, and "we have one Rimowa" is a complete and useful
 *      answer to the question actually being asked. Refusing to list it would
 *      make the catalogue look like it holds nothing by that maker.
 *
 *   2. ALPHABETICAL, NOT BY COUNT. Every other axis is ordered by meaning —
 *      light to heavy, cheap to dear. Nobody scans brands by inventory. They
 *      scan for a NAME, and a name is findable in one order only.
 *
 * The ids are slugs because a brand name contains spaces, ampersands and
 * apostrophes ("Briggs & Riley", "Bric's"), and these values ride in a data
 * attribute and a checkbox value.
 */
export const brandId = (name) =>
  String(name ?? '')
    /* DECOMPOSE FIRST, so an accent becomes a separable mark rather than a
       character the class below deletes outright. Béis slugged to `b-is`
       without this: the é was stripped and left a gap. Harmless while it is
       unique, and a silent merge the moment the catalogue holds two brands
       that differ only in their accents — ticking one would return the other's
       bags. `Beis` is also what somebody types when searching for it. */
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The brand options, derived from the catalogue rather than listed. A typed
 *  list would go stale the first time a bag is added — silently, since a brand
 *  nobody declared simply never appears. */
export function brandFacets(entries) {
  const byId = new Map();
  for (const { bag } of entries) {
    if (!bag.brand) continue;
    const id = brandId(bag.brand);
    const seen = byId.get(id);
    /* TWO BRANDS ON ONE ID IS A CORRECTNESS BUG, NOT A COSMETIC ONE. The
       filter matches on the id, so a collision silently returns one maker's
       bags under another's name — and the count beside the checkbox would be
       right, which makes it invisible. Loud, because this is exactly the kind
       of thing a future catalogue addition causes and nobody re-reads. */
    if (seen && seen.label !== bag.brand) {
      throw new Error(
        `two brands slug to "${id}": "${seen.label}" and "${bag.brand}" — ` +
          'the filter would return one under the other'
      );
    }
    if (!seen) byId.set(id, { id, label: bag.brand });
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export const PRICE_HINTS = {
  budget: 'The least expensive bags that reviewers still stand behind.',
  midrange: 'The middle third of the catalogue.',
  luxury: 'The top third. No upper limit.',
};

/** Every axis the panel can offer. One list, so adding an axis cannot leave
 *  one of the three places that iterate them behind. */
export const AXES = ['weight', 'shell', 'price', 'role', 'brand'];

/**
 * Stamp every facet value onto each bag, once, at build time.
 * @param {{bag: object}[]} entries
 * @returns {Map<string, Record<string, string|null>>} by slug
 */
export function facetsFor(entries) {
  const cuts = cutPoints(entries.map((e) => e.bag.record));
  const out = new Map();
  for (const { bag } of entries) {
    out.set(bag.slug, {
      weight: weightFacet(bag.record),
      shell: shellFacet(bag.record),
      price: bandOf(bag.record, cuts),
      role: bag.record?.role ?? null,
      brand: bag.brand ? brandId(bag.brand) : null,
    });
  }
  return out;
}

/**
 * How many bags sit behind each facet value. Drives whether a facet — and its
 * whole section — renders at all.
 */
export function facetCounts(facets) {
  const counts = Object.fromEntries(AXES.map((a) => [a, {}]));
  for (const f of facets.values()) {
    for (const axis of AXES) {
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
