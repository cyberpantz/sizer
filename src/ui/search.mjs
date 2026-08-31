/* Type-ahead matching. Pure, so it can be tested without a browser — the same
   reason the fit engine has no DOM in it.

   The problem this solves: a <select> of 58 airlines, heading for 100. Every
   carrier we add makes that control worse, which is a perverse relationship
   with the main job on the project. Someone who knows they are flying Ryanair
   should type "ry", not hunt an alphabetical list.

   What people actually type, in the order they try it:

     "ba"        the IATA code, from their booking confirmation
     "brit"      the start of the name
     "airfrance" the name with the space left out
     "wizz"      a word from the middle of the name

   So the ranking is: exact code, then code prefix, then name prefix, then the
   start of any word in the name, then anywhere. Ties break alphabetically, so
   the list never reorders itself between two equally good matches — a list
   that shuffles under the cursor is unusable for anyone who is not fast. */

/** Lowercase, strip accents, collapse punctuation and spaces.
 *  "Düsseldorf-Air" and "dusseldorfair" have to meet somewhere. */
export const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/** Words of a name, folded individually — for "air f" matching "Air France". */
const words = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/* Lower is better. Gaps left between tiers so a tier can be inserted without
   renumbering every branch. */
const EXACT_CODE = 0;
const CODE_PREFIX = 10;
const NAME_PREFIX = 20;
const WORD_PREFIX = 30;
const CONTAINS = 40;
export const NO_MATCH = Number.POSITIVE_INFINITY;

/** How well one item matches a query. `NO_MATCH` means hide it. */
export function score(query, { name, code } = {}) {
  const q = fold(query);
  if (!q) return CONTAINS; // empty query shows everything, in name order

  const c = fold(code);
  const n = fold(name);

  if (c && c === q) return EXACT_CODE;
  if (c && c.startsWith(q)) return CODE_PREFIX;
  if (n.startsWith(q)) return NAME_PREFIX;

  /* Word starts. "fra" should find "Air France" but a query spanning a space
     ("airfra") is already handled by the folded prefix test above. */
  const ws = words(name);
  for (let i = 1; i < ws.length; i++) {
    if (ws[i].startsWith(q)) return WORD_PREFIX + i; // earlier words rank higher
  }

  if (n.includes(q)) return CONTAINS;
  return NO_MATCH;
}

/** Filter and rank. Returns a new array; never mutates the input. */
export function search(query, items, { limit = Number.POSITIVE_INFINITY } = {}) {
  return items
    .map((item) => ({ item, s: score(query, item) }))
    .filter((x) => x.s !== NO_MATCH)
    /* Alphabetical tiebreak, so equal matches keep a stable, predictable
       order rather than the dataset's file order. */
    .sort((a, b) => a.s - b.s || String(a.item.name).localeCompare(String(b.item.name)))
    .slice(0, limit)
    .map((x) => x.item);
}
