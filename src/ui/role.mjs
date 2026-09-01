/* WHICH BAG IS WHICH, ON THIS TRIP.
 *
 * A fare grants a SET — usually one bag overhead and one under the seat — and
 * the interesting failures only exist at the set level: a fare that grants one
 * bag, a weight cap shared across both, a personal item ten centimetres deep.
 * None of that is expressible while a bag is checked in isolation.
 *
 * ONE CONTROL PER BAG, DEFAULTED, NOT ASKED. The role is derived from the bag's
 * own record and the control is there to CORRECT us, not to interrogate the
 * reader. Someone who owns a roller and a rucksack already knows which is going
 * overhead; making them declare it before we will answer anything is an
 * interview, and the whole point of this page is that it is not one.
 *
 * Presentation lives here rather than in the engine, for the same reason
 * ui/verdict.mjs exists: the engine takes `role` as data and knows nothing
 * about what to call it, and the moment two pages each write their own word for
 * "personal item" they start disagreeing.
 */

/** The two roles a bag can take. `checked` is deliberately absent — we answer
 *  cabin questions, and a checked bag has no gate to be measured at. */
export const ROLES = ['cabin', 'personal'];

/* THE AIRLINE'S WORD, NOT THE INDUSTRY'S.
 *
 * "Personal item" is what appears on every booking page and every gate sign in
 * the US, so it is what a reader will recognise — even though "under-seat bag"
 * describes the thing better. We lose on precision and win on recognition, and
 * recognition is what a control has to optimise for.
 *
 * The hint says WHERE it goes, because that is the part that actually settles
 * which bag is which for someone who has never thought about it in these
 * terms. */
export const ROLE_COPY = {
  cabin: { label: 'Carry-on', where: 'Goes in the overhead bin.' },
  personal: { label: 'Personal item', where: 'Goes under the seat in front of you.' },
};

export const roleLabel = (role) => ROLE_COPY[role]?.label ?? ROLE_COPY.cabin.label;

/**
 * What we assume this bag is for, before the reader says otherwise.
 *
 * Records carry `role: 'overhead' | 'underseat' | 'checked'` — the catalogue's
 * own vocabulary, which is about what a bag IS. This maps it to what a bag is
 * DOING on a trip. Two words for nearly the same idea is one more than anybody
 * wants, but they are not the same idea: a 40 × 30 × 20 packing cube is an
 * overhead bag by construction and a personal item on Ryanair Basic, and the
 * whole feature exists to let a reader say so.
 *
 * A `checked` record defaults to cabin rather than being refused. It is
 * probably a mistake in the data or a reader testing an oversize bag, and
 * answering "this is 12 cm too long for the bin" is more useful than declining
 * to answer at all.
 *
 * TODAY THIS ALWAYS RETURNS 'cabin', AND THAT IS NOT A BUG. The catalogue holds
 * two under-seat bags — the Calpak Luka Mini and the Kenneth Cole underseater —
 * and both publish only an INTERIOR figure, so isSized() correctly keeps them
 * out rather than let us invent an exterior. So every bag a reader can pick is
 * an overhead bag, and the role control is pure correction: "yes, I know it is
 * a carry-on; I am taking it as my personal item on Ryanair Basic", which is a
 * real and common thing to do. The default starts mattering the moment one
 * under-seat bag publishes an outside measurement.
 */
export function defaultRole(record) {
  return record?.role === 'underseat' ? 'personal' : 'cabin';
}

/** Coerce anything off a URL or a stale link. Unknown values fall back rather
 *  than throwing: a permalink someone shared last month must keep working. */
export const asRole = (v) => (ROLES.includes(v) ? v : 'cabin');

/* ONE LETTER IN THE URL, and it has to survive being wrong.
 *
 * /check keeps the whole trip in the query string so "copy link" is a real
 * feature rather than a button that lies. Roles ride along with the bag slug —
 * `away-carryon:p` — because a link that dropped them would silently answer a
 * DIFFERENT question from the one on the sender's screen: same two bags, both
 * checked against the overhead limit, no mention that one of them was the
 * personal item. A shared answer that quietly changes meaning in transit is
 * worse than no sharing at all.
 *
 * The cabin role encodes as nothing, so the common case leaves the URL exactly
 * as it was and every link shared before this feature existed still resolves to
 * what its sender saw. */
export const encodeSlot = ({ slug, role }) => (role === 'personal' ? `${slug}:p` : slug);

export function decodeSlot(token) {
  const [slug, tag] = String(token ?? '').split(':');
  return { slug, role: tag === 'p' ? 'personal' : 'cabin' };
}
