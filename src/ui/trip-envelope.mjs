/* WHAT SURVIVES THE WHOLE TRIP, AND WHICH BAGS WE WOULD ACTUALLY PUT FORWARD.
 *
 * This is the panel at the foot of /check: one box that clears every leg, and a
 * short list of bags inside it. It is the thing this page has that a per-airline
 * lookup never will, and it was the least careful code on the site.
 *
 * Frank: "it seems like it wasn't really thought out, you can't click on them,
 * it's not clear if they are filtered by bags that would actually fit."
 *
 * All true, and underneath the presentation were three bugs, each found by
 * running real itineraries rather than reading:
 *
 * 1. IT RECOMMENDED BAGS FOR A FARE THAT ALLOWS NONE. envelope() intersects
 *    carriers with an allowance, and a no-cabin-bag fare has none — so a
 *    Ryanair Basic leg silently LEFT the intersection. On Ryanair Basic +
 *    Aegean it drew a box from Aegean alone and listed 43 bags, every one of
 *    which would be refused at the first gate, directly below a verdict reading
 *    "includes no cabin bag at all on this fare, whatever its size". The page
 *    contradicted itself and the confident half was the wrong half.
 *
 * 2. IT USED A SECOND SUBTRACTION. The list filtered on published dimensions —
 *    no EPS_CM, no soft-bag compression, none of the rules the verdict above it
 *    is computed with. On Aegean + British Airways it hid TEN bags the engine
 *    says clear both legs, every soft duffel among them, because a duffel's
 *    whole advantage is the compression this comparison ignored. The comparator
 *    on the same page already carries the rule — "the picture cannot disagree
 *    with the verdict, because it is the same subtraction" — and this panel is
 *    where it had not been applied.
 *
 * 3. IT IGNORED THE RELEASE GATE. docs/19: a bag may only be RECOMMENDED on the
 *    manufacturer's own overall figure. 15 of those 43 rested on a review's
 *    measurement or a maker figure that never said whether wheels were counted.
 *    Every other surface that recommends honours this. A list that answers
 *    "what should I buy instead" is a recommendation whatever it is called.
 *
 * PURE, AND IN A MODULE, for the reason that keeps recurring: /check is one
 * long .astro file whose script imports a .jsx component, so it cannot be
 * imported by a test at all. Anything worth checking has to live somewhere a
 * test can reach — and every one of the three bugs above is invisible to a
 * source-level guard and obvious to a function you can call.
 */
import { desc } from '../engine/fit.mjs';
import { isPromotable } from '../engine/normalize.mjs';
import { fitsWithinLimit } from './verdict.mjs';

/** How many bags the panel shows before handing off to /bags. Forty-three cards
 *  is not a shortlist, it is the catalogue with extra steps — and it buried the
 *  copy-link row under a screen and a half of scrolling. */
export const SHOWN = 6;

const volume = (cm) => cm.reduce((n, v) => n * v, 1);

/**
 * @param {object} o
 * @param {{leg: object, carrier: object, result: object}[]} o.rows  one per flight
 * @param {'cabin'|'personal'} o.role
 * @param {object[]} o.bags        the catalogue, as shipped to the browser
 * @param {(bag: object) => object} o.toEngineBag
 * @param {object} o.engine        the engine at the reader's chosen risk level
 * @param {string[]} [o.ownSlugs]  bags they already chose; never suggested back
 */
export function tripEnvelope({ rows, role, bags, toEngineBag, engine, ownSlugs = [] }) {
  const personal = role === 'personal';
  const allowanceOf = (c) => (personal ? c?.allowances?.personal : c?.allowance) ?? null;

  /* LEGS THAT GRANT NOTHING AT ALL, kept apart from legs we cannot answer for.
     One is a finding about the ticket, the other a gap in our research, and
     collapsing them is how the old panel lost Ryanair entirely. */
  const barred = rows.filter((x) =>
    personal ? x.result.no_personal_item : x.result.no_cabin_bag
  );
  const scorable = rows.filter((x) => !x.result.unknown && allowanceOf(x.carrier));

  /* THE ENGINE'S OWN INTERSECTION, not one computed here.

     The first draft of this module took the per-axis minimum itself — three
     lines, obviously correct, and a second implementation of something the
     engine already exports. That is the identical mistake the list below had:
     one page, two subtractions, and nothing forcing them to agree. Catching it
     in code written to fix that very bug is a fair measure of how easy it is. */
  const carriers = scorable.map((x) => x.carrier);
  const env = personal ? engine.personalEnvelope(carriers) : engine.envelope(carriers);

  /* Which airlines actually set the box, carried with their code so the page
     can link each claim back to the page it came from. */
  const setters = env
    ? [
        ...new Map(
          scorable
            .filter((x) => allowanceOf(x.carrier)?.max_cm)
            .filter((x) => desc(allowanceOf(x.carrier).max_cm).some((v, i) => v === env[i]))
            .map((x) => [x.leg.iata, { name: x.carrier.name, iata: x.leg.iata }])
        ).values(),
      ]
    : [];

  /* Nothing to suggest when a leg grants no bag: the answer is not a size, and
     offering one anyway is the contradiction this rewrite exists to remove. */
  const candidates = barred.length
    ? []
    : bags
        /* EVERY bag the reader already has, not just the first. Offering
           someone back a bag they told us they own is the same mistake as
           answering for only one of them, in a smaller costume. */
        .filter((b) => !ownSlugs.includes(b.slug))
        .map((b) => ({ bag: b, engine: toEngineBag(b) }))
        .filter(({ engine: eb }) =>
          scorable.every((x) => fitsWithinLimit(engine.evaluate(eb, x.carrier, { role }).band))
        );

  const fits = candidates
    .filter((x) => isPromotable(x.engine))
    /* Biggest first, because "the biggest bag that works" is what the panel
       promises: the roomiest thing you can pack and still clear every gate.
       Sorted on the PUBLISHED volume, not the compressed one — that is the bag
       being bought. */
    .sort((a, b) => volume(b.bag.external_cm) - volume(a.bag.external_cm))
    .map((x) => x.bag);

  return {
    personal,
    barred,
    scorable,
    env,
    setters,
    fits,
    /* Said out loud rather than silently dropped. "17 more would fit, held back
       because their figures are not the manufacturer's own" is a fact about our
       standards, and hiding it would make the catalogue look thinner than it
       is for no stated reason. */
    heldBack: candidates.length - fits.length,
  };
}
