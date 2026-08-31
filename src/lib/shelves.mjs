/* Grouping bags by how widely they actually fly.

   Thresholds live here rather than in a page, because they define a claim the
   whole site makes — "goes anywhere" is an assertion, not a label. Changing
   them changes what we tell people. */
import { coverage } from '../engine/fit.mjs';

export const SHELVES = [
  {
    id: 'anywhere',
    title: 'Goes anywhere',
    blurb: 'Clears at least 80% of the airlines we track.',
    min: 0.8,
  },
  {
    id: 'almost',
    title: 'Goes almost anywhere',
    blurb: 'Clears most airlines. Check the ones you are actually flying.',
    min: 0.4,
  },
  {
    id: 'us_only',
    title: 'Fine in the US, a problem abroad',
    blurb: 'Built to the 22 × 14 × 9 in domestic standard, which is larger than most of the world allows.',
    min: 0,
  },
];

/** Score every bag against every carrier and put it on a shelf. */
export function shelve(bags, carriers) {
  const scored = bags
    .map((bag) => ({ bag, coverage: coverage(bag, carriers) }))
    .sort((a, b) => b.coverage.ratio - a.coverage.ratio);

  return SHELVES.map((shelf, i) => {
    const max = i === 0 ? Infinity : SHELVES[i - 1].min;
    return {
      ...shelf,
      bags: scored.filter((s) => s.coverage.ratio >= shelf.min && s.coverage.ratio < max),
    };
  });
}
