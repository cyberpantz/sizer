/* What commercial relationships we ACTUALLY have.
 *
 * The footer said "As an Amazon Associate we earn from qualifying purchases"
 * on every page of the site, and it was not true: no account, no tags, no
 * outbound links, no earnings. It was written from docs/07 as a
 * requirement-in-advance — put the disclosure in the layout so it cannot be
 * forgotten later — which is a reasonable instinct and produced a false
 * statement on 63 pages.
 *
 * That is the exact inverse of this project's discipline. We refuse to print a
 * dimension without saying where it came from, and then printed a commercial
 * relationship we did not have. A disclosure is a factual claim about us; it
 * gets the same treatment as a claim about a bag.
 *
 * So it is DERIVED, not asserted. Turn a programme on here when it is real —
 * when the account exists and links carry the tag — and the disclosure appears
 * by itself. Leave it off and the page says nothing, which is the truth.
 *
 * The other direction matters just as much: the moment a link earns money, the
 * FTC requires the disclosure to be clear and conspicuous, and `disclosure.mjs`
 * has no way to know. So a live programme with `disclose: false` is refused by
 * the tests rather than trusted.
 */

/** Programmes we are enrolled in. `live: false` means not signed up. */
export const PROGRAMMES = [
  {
    id: 'amazon',
    name: 'Amazon Associates',
    live: false,
    /* Set to the tag once enrolled. Its presence is what makes a link earn. */
    tag: null,
    disclosure: 'As an Amazon Associate we earn from qualifying purchases.',
  },
  {
    id: 'direct',
    name: 'Direct brand programmes',
    live: false,
    tag: null,
    disclosure: 'We may earn a commission on some links to retailers.',
  },
];

/** Are we monetising anything at all? */
export const isMonetised = () => PROGRAMMES.some((p) => p.live);

/**
 * The disclosure to print, or null.
 *
 * Null is the correct output today and must render as NOTHING — not as an
 * empty paragraph, and never as a hedge like "we may earn a commission" when
 * we currently cannot. "May" is doing dishonest work in a sentence where the
 * answer is no.
 */
export function disclosure() {
  const live = PROGRAMMES.filter((p) => p.live);
  if (!live.length) return null;
  return `${live.map((p) => p.disclosure).join(' ')} It does not change what we recommend — we publish the measurements either way.`;
}
