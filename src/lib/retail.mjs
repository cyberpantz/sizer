/* Where to buy a bag, and what we have said about it.
 *
 * NOTHING RENDERS THIS YET, ON PURPOSE. The schema exists so the facts can be
 * recorded from the first day they are true; the UI arrives when there is
 * something to show. That order is deliberate, and it is the opposite of the
 * mistake this codebase just cleaned up: the footer carried "As an Amazon
 * Associate we earn from qualifying purchases" on 63 pages before an account
 * existed, because the plausible complete version of a site got written
 * instead of the true one.
 *
 * The distinction is precise and worth stating once:
 *
 *   A SCHEMA FIELD THAT IS NULL MAKES NO CLAIM.
 *   A RENDERED ELEMENT DOES.
 *
 * So adding these shapes is safe. Wiring a "Buy it here" button that appears
 * before any offer is recorded is the same bug wearing different clothes.
 */

/** Who is selling it. The same taxonomy the dimension ladder uses, because it
 *  is the same judgement: a marketplace listing is the weakest thing in the
 *  category and we never let one decide anything. */
export const MERCHANT_KIND = {
  MANUFACTURER: 'manufacturer', // the brand's own store
  RETAILER: 'retailer', // a real shop that stocks it — REI, John Lewis
  MARKETPLACE: 'marketplace', // Amazon, eBay. Link only, never a source
};

/** How a bag we reviewed came into our hands. The FTC cares about exactly
 *  this, and it is impossible to reconstruct after the fact. */
export const SAMPLE_SOURCE = {
  PURCHASED: 'purchased', // we paid retail
  LOANED: 'loaned', // borrowed and returned
  GIFTED: 'gifted', // kept, no conditions
  BRAND_SUPPLIED: 'brand_supplied', // the brand sent it — always disclosed
};

const MATERIAL = new Set([SAMPLE_SOURCE.GIFTED, SAMPLE_SOURCE.BRAND_SUPPLIED]);

/**
 * Offers for a bag, in the order a reader should see them.
 *
 * THE STORED URL IS ALWAYS THE REAL DESTINATION — never a pre-tagged affiliate
 * link. Two reasons, and both bite later rather than now:
 *
 *   1. A tagged URL rots. Change programme, add Geniuslink, switch from Amazon
 *      to a direct brand deal, and every record needs rewriting. Tagging is a
 *      render-time concern; the data records where the bag is sold.
 *   2. A record full of affiliate URLs cannot be audited. "Where did this
 *      number come from" is the question this whole project answers, and a
 *      redirect chain is not an answer.
 *
 * Manufacturer first, then real retailers, marketplaces last — the same
 * ranking as the dimension ladder, for the same reason.
 */
export function offersFor(record) {
  const rank = { manufacturer: 0, retailer: 1, marketplace: 2 };
  return (record?.retail ?? [])
    .filter((o) => o?.url && o?.merchant)
    .sort((a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9));
}

/** Third-party reviews we can point a reader at. NOT our own — see below. */
export const citationsFor = (record) => (record?.reviews ?? []).filter((r) => r?.url);

/**
 * Our own review, when one exists.
 *
 * KEPT SEPARATE FROM `reviews[]` DELIBERATELY, and this is the part that would
 * be painful to unpick later. `hasDecentReviews()` in price-band.mjs uses the
 * reviews array as a QUALITY FLOOR — a bag with no independent review cannot
 * enter a price band, so we never surface junk as "budget".
 *
 * If our own review landed in that array it would satisfy our own quality
 * gate. We would be making our own recommendation eligible by writing about
 * it, which is self-dealing however honestly the review was written. First
 * party and third party stay in different fields so that cannot happen by
 * accident.
 */
export const ourReview = (record) =>
  record?.our_review?.status === 'published' ? record.our_review : null;

/**
 * Does this review need a material-connection disclosure, and does it have one?
 *
 * A bag the brand sent us is a material connection under FTC guidance, whether
 * or not it changed a word of the review. Recording it the day the box arrives
 * is trivial; reconstructing it two years later is impossible — which is the
 * entire argument for putting the field in before we need it.
 */
export function sampleDisclosure(review) {
  const s = review?.sample;
  if (!s?.how) return null;
  if (!MATERIAL.has(s.how)) {
    return s.how === SAMPLE_SOURCE.PURCHASED ? 'We bought this bag ourselves.' : null;
  }
  return (
    s.disclosure ??
    (s.how === SAMPLE_SOURCE.BRAND_SUPPLIED
      ? 'The manufacturer sent us this bag. We paid nothing for it.'
      : 'This bag was given to us.')
  );
}

/** True when a review carries a connection that MUST be disclosed. */
export const needsDisclosure = (review) => MATERIAL.has(review?.sample?.how);
