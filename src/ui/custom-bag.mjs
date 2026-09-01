/* A BAG WE DO NOT STOCK, DESCRIBED BY THE PERSON CARRYING IT.
 *
 * Frank: "We need to be able create a custom personal item (keep it simple with
 * a selector like tote bag, large purse, small backpack, etc)."
 *
 * WHY THIS IS NOT OPTIONAL. /check offered a picker of catalogue bags and
 * nothing else, and the catalogue is 57 carry-on suitcases. Measured against
 * the 55 carriers that publish an under-seat box, ZERO of them clear even the
 * most permissive one — so the moment roles landed, choosing "Personal item"
 * gave the reader a list of 57 bags, every one of which fails, and no way to
 * describe the tote they were actually asking about.
 *
 * It also closes a promise the home page had been making alone: "I have a bag —
 * type its size in and check it against your flights." Until now there was
 * nowhere to type it.
 *
 * WHERE THE NUMBERS COME FROM, which is the whole design problem.
 *
 * A tote bag has no manufacturer and no published dimensions. This site exists
 * on the rule that we never print a figure we cannot source, so an archetype
 * cannot be a CLAIM about what a tote measures — we would be inventing exactly
 * the kind of number the DIM_SOURCE ladder was built to keep out.
 *
 * So the archetype is a FORM DEFAULT, not a fact. Picking one fills three
 * inputs the reader can correct, and the value that reaches the engine is
 * whatever they leave in the box. We are not publishing "a tote is 40 × 33 ×
 * 15"; we are saving them typing. The sizes below are chosen to be plausible
 * and are deliberately NOT in a data file, because a data file is where
 * researched figures live and these are not researched figures.
 *
 * The verdict says so too: a custom bag carries `dim_source: 'owner'`, which is
 * not one of the DIM_SOURCE rungs. That is intentional — those rungs describe
 * where WE got a number for a bag WE publish, and this is neither. It keeps
 * `owner` out of /methodology's per-rung counts, where it would show as a
 * permanent zero, and isPromotable() rejects it for free, so a reader's own bag
 * can never be recommended to anyone else.
 */

/** Marks a custom bag in state and in the URL. `~` is URL-safe unreserved, and
 *  no catalogue slug starts with it. */
const MARK = '~';

/* SHAPES, PER ROLE. The list a reader sees depends on what they are carrying,
   because "duffel" is not an answer to "what is your personal item" and
   "handbag" is not an answer to "what is your carry-on".

   `soft` matters to the verdict — the engine takes SOFT_COMPRESS_CM off the
   shortest side of anything soft, because a soft bag gives under a gate sizer
   and a hard shell does not. Nearly everything here is soft, which is the
   honest answer for bags of this kind. */
export const SHAPES = [
  { id: 'tote', label: 'Tote bag', role: 'personal', cm: [40, 33, 15], soft: true },
  { id: 'purse', label: 'Large purse or handbag', role: 'personal', cm: [33, 23, 13], soft: true },
  { id: 'daypack', label: 'Small backpack', role: 'personal', cm: [42, 28, 16], soft: true },
  { id: 'laptop', label: 'Laptop bag', role: 'personal', cm: [40, 30, 10], soft: true },
  { id: 'shopper', label: 'Shopping or duty-free bag', role: 'personal', cm: [40, 35, 18], soft: true },
  { id: 'suitcase', label: 'Cabin suitcase', role: 'cabin', cm: [55, 40, 23], soft: false },
  { id: 'backpack', label: 'Travel backpack', role: 'cabin', cm: [50, 35, 22], soft: true },
  { id: 'duffel', label: 'Duffel', role: 'cabin', cm: [55, 30, 30], soft: true },
];

export const shapesFor = (role) => SHAPES.filter((s) => s.role === role);
export const shapeOf = (id) => SHAPES.find((s) => s.id === id) ?? null;

/** The shape a reader lands on when they first choose "describe your own". */
export const defaultShape = (role) => shapesFor(role)[0]?.id ?? SHAPES[0].id;

export const isCustom = (slug) => typeof slug === 'string' && slug.startsWith(MARK);

/* ONE DECIMAL IN THE URL, and no more.
   A typed length is at best a tape measure held against a soft bag; carrying
   `40.640000000000004` through a permalink from an inch conversion would be
   precision theatre. Rounded on the way OUT only — the live value stays exact,
   so nudging the units toggle back and forth cannot drift it. */
const trim = (n) => +n.toFixed(1);

/* THE SEPARATOR CANNOT BE A FULL STOP, AND I FOUND THAT OUT THE HARD WAY.
 *
 * The first version encoded `~tote.40x33x15` and decoded by splitting on '.'.
 * That is fine until a dimension has a decimal — which is the NORMAL case the
 * moment anyone types in inches, since 15 in is 38.1 cm. `~daypack.42x28x38.1`
 * split into three parts, the decoder took the first two, and the bag came back
 * 38 cm deep. A reader's own measurement, silently rounded down by nearly a
 * centimetre, in the generous direction.
 *
 * `_` cannot appear in a shape id or a number, so it cannot collide. Split on
 * the FIRST one regardless, because a separator that only works while ids stay
 * well-behaved is the same class of bug one step later. */
const SEP = '_';

/** `~tote_40x33x15` — shape and size, in centimetres, always. */
export function encodeCustom({ shape, cm }) {
  return `${MARK}${shape}${SEP}${cm.map(trim).join('x')}`;
}

/**
 * The inverse, and it has to survive anything a URL can carry. A permalink is
 * public: someone will edit it by hand, a mail client will mangle it, and an
 * old link will outlive a shape id we retire. Every one of those returns null
 * rather than throwing, and the caller drops the slot.
 */
export function decodeCustom(slug) {
  if (!isCustom(slug)) return null;
  const rest = slug.slice(MARK.length);
  const at = rest.indexOf(SEP);
  if (at < 1) return null;
  const shape = rest.slice(0, at);
  const dims = rest.slice(at + SEP.length);
  if (!shape || !dims) return null;
  const cm = dims.split('x').map(Number);
  if (cm.length !== 3 || cm.some((v) => !Number.isFinite(v) || v <= 0 || v > 300)) return null;
  /* A retired shape id keeps its DIMENSIONS — those are the reader's, and they
     are the part that decides the answer. Only the label falls back. */
  return { shape: shapeOf(shape) ? shape : null, cm };
}

/**
 * A record `toBag()` will accept, so a custom bag goes through exactly the same
 * normalisation and validation as a catalogue one — including assertDims, which
 * is what rejects a zero, a negative, two axes, or a letter typed into a number
 * field. Building the engine shape by hand here would be a second
 * implementation of toBag, and this file would be the fourth place today where
 * that turned out to be the bug.
 */
export function toCustomRecord(slug) {
  const parsed = decodeCustom(slug);
  if (!parsed) return null;
  const shape = shapeOf(parsed.shape);
  return {
    slug,
    /* Reads as "Your tote bag" on the card. Not a brand, and deliberately not
       dressed up as one — the reader should never mistake their own estimate
       for a product we hold. */
    brand: 'Your',
    model: shape ? shape.label.toLowerCase() : 'bag',
    external_cm: { v: parsed.cm, src: 'owner' },
    soft: shape ? shape.soft : true,
    /* NOT a DIM_SOURCE rung. See the header. */
    dim_source: 'owner',
    type: shape?.id ?? null,
  };
}
