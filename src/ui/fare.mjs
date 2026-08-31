/* What to call a fare on screen.

   The dataset stores `fare_class` as a machine key — `basic`, `comfort_flex`,
   `inclusive_plus`, `fly_grande` — and the picker was rendering those raw, so
   the ticket dropdown read "comfort_flex ticket" in lower case.

   Some records also carry `fare_name`, the airline's own word for it: Aegean
   calls its cheapest fare "Light", Eurowings calls economy "SMART". That is
   better than anything we can derive, because it is what the reader saw when
   they booked — but only 20 of 99 rows have one, and at least one of those was
   generated rather than read ("Purchased carry_on"). So the airline's name is
   preferred and then sanity-checked, rather than trusted blindly.

   Pure, so the casing rules are testable without a browser. */

/* Words that stay lower case inside a longer name, so "Fly to Grande" reads
   like a name rather than a headline. Not applied to the first word. */
const MINOR = new Set(['to', 'and', 'or', 'the', 'of', 'a', 'with', 'per']);

/* Fare keys whose humanised form would be wrong or unhelpful. Short list on
   purpose: every entry here is a claim about what an airline calls something,
   and the honest default is to show the key tidied up rather than to invent a
   marketing name for a carrier we have not read. */
const KNOWN = {
  basic: 'Basic',
  economy: 'Economy',
  premium_economy: 'Premium economy',
  business: 'Business',
  first: 'First',
  /* These two are ADD-ONS, not fares you can book. The engine only matches an
     add-on row when the booking says it was bought (see resolveFare), and the
     label has to carry the same warning — "Priority" alone reads like a fare
     tier that includes a bag, which is exactly the Ryanair misunderstanding
     this site exists to prevent. */
  carry_on: 'With carry-on (paid add-on)',
  priority: 'Priority (paid add-on)',
  two_pieces: 'Two pieces',
};

/** "comfort_flex" -> "Comfort flex". Sentence case, not Title Case: these sit
 *  in a form control, and Title Case On Every Word reads like a headline. */
export function humanise(key) {
  const words = String(key ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  return words
    .map((w, i) => (i > 0 && MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/** Does the airline's own name look like a name, or like a leaked key? */
function usable(name) {
  if (!name) return false;
  /* An underscore means it was assembled from a key rather than copied off
     the airline's page — "Purchased carry_on" is in the data today. */
  if (/_/.test(name)) return false;
  /* "Purchased priority" is ours too: the records carrying it say so outright
     ("Legacy selection explicitly represents the purchased add-on"). Our own
     generated string must not be presented as the airline's word for a fare. */
  if (/^purchased\b/i.test(name)) return false;
  return true;
}

/**
 * @param {string} fareClass  the machine key, e.g. "comfort_flex"
 * @param {string} [fareName] the airline's own word for it, if we read one
 */
export function fareLabel(fareClass, fareName) {
  if (usable(fareName)) return String(fareName).trim();
  return KNOWN[fareClass] ?? humanise(fareClass);
}
