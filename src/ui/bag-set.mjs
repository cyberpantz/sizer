/* WHAT A FARE GRANTS, AGAINST WHAT THE READER IS CARRYING.
 *
 * Frank: "it seems like I'm allowed to create two carry ons, that should not be
 * allowed."
 *
 * He was right about the experience and wrong about the remedy, and the data
 * settles both. docs/27 says two bags in one role is legitimate — "some fares
 * allow two cabin pieces. Answer it rather than blocking it" — and five rows
 * bear that out:
 *
 *   Eurowings BIZclass    2 cabin pieces AND a separate personal row, so that
 *                         fare really is two 55x40x23 bags plus an under-seat
 *                         item. Unambiguous.
 *   Ural business         the row says it in words: "Two pieces with a combined
 *                         maximum weight of 15 kg".
 *   Azerbaijan (pe, biz)  count 2, no personal row, no note.
 *   Air Astana business   count 2, no personal row, no note.
 *
 * The last two are weaker than the first two and are flagged for re-reading: a
 * cabin row with count 2 and NOWHERE ELSE to record a personal item may be a
 * researcher folding "carry-on plus personal item" into one row. Two solid
 * cases are still enough that blocking would make the tool unable to model a
 * correct ticket.
 *
 * SO THE BUG WAS THE SILENCE, NOT THE PERMISSION. On the other seventy-odd
 * carriers a second carry-on is a mistake, and the page said nothing at all
 * about it. Two changes follow, and neither forbids anything:
 *
 *   defaultRoleForNew  the second bag you add defaults to Personal item, since
 *                      that is what almost everyone is adding. You can still
 *                      switch it.
 *   pieceOverages      when a leg grants fewer pieces in a role than you are
 *                      carrying, say so and name the leg.
 *
 * `count` has been in every allowance row since the intake and was read by
 * nothing until now — the same shape as `linear_max_cm` and `absence` before
 * it. Three fields in one day, all researched, all inert.
 */

/**
 * The role a newly added bag should start in.
 *
 * Not "always cabin", which is what it was and what produced Frank's two
 * carry-ons without him asking for either. The overwhelmingly common second bag
 * is the personal item — that is what "a carry-on and a small bag" means to
 * almost everyone — so the default follows the shape of the trip rather than a
 * constant.
 *
 * It only ever DEFAULTS. A Eurowings business passenger flips it back in one
 * click, which is the right cost for a case that rare.
 */
export function defaultRoleForNew(slots = []) {
  const hasCabin = slots.some((s) => s.role === 'cabin');
  const hasPersonal = slots.some((s) => s.role === 'personal');
  if (hasCabin && !hasPersonal) return 'personal';
  return 'cabin';
}

/**
 * Legs where the fare grants fewer pieces in a role than the reader is
 * carrying.
 *
 * A SET-LEVEL FACT, and the first one this site can state. No stack of per-bag
 * verdicts can reach it: each bag can fit the box perfectly and the pair still
 * be refused, because the limit being broken is a COUNT rather than a size.
 * That is docs/27's whole argument for modelling a kit rather than a bag.
 *
 * Returns one entry per (leg, role) that is over, so the page can name the
 * airline and the fare. An empty array means nothing to say — which is the
 * common case and must stay silent.
 *
 * @param {{role: string}[]} slots  the reader's bags
 * @param {{leg: object, carrier: object}[]} rows  one per flight
 */
export function pieceOverages({ slots = [], rows = [] } = {}) {
  const carrying = { cabin: 0, personal: 0 };
  for (const s of slots) if (s.slug) carrying[s.role] = (carrying[s.role] ?? 0) + 1;

  const out = [];
  for (const row of rows) {
    for (const role of ['cabin', 'personal']) {
      if (carrying[role] < 2) continue; // one bag can never exceed a granted piece
      const allowance = role === 'personal' ? row.carrier?.allowances?.personal : row.carrier?.allowance;
      /* NO ALLOWANCE IS NOT ZERO PIECES HERE. A fare that grants no cabin bag
         is already reported, loudly, as its own finding — repeating it as a
         piece overage would say the same thing twice in different words. And a
         carrier nobody has researched grants an unknown number of pieces, which
         is not a violation of anything. */
      if (!allowance) continue;
      const granted = allowance.count ?? 1;
      if (carrying[role] > granted) {
        out.push({ leg: row.leg, carrier: row.carrier, role, granted, carrying: carrying[role] });
      }
    }
  }
  return out;
}
