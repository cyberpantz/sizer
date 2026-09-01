/* Verdict copy. One source, previously three — and they had already drifted:
   "Won't fit" on the bag page, "It won't fit" on the others.

   The engine returns bands and figures. All wording lives here, so a copy change
   is one edit and cannot disagree with itself. */

/* ONE PART OF SPEECH ACROSS ALL FOUR.

   These were "It fits" / "Just fits" / "Risky" / "It won't fit" — a sentence,
   a verb fragment, an adjective and another sentence. Read down a column of
   airlines your eye re-parses at every row, which is what made them feel off
   even though each one on its own was fine.

   Two more reasons they had to change:

   - "It" has no antecedent in a table whose rows are airlines. "Ryanair … It
     won't fit" takes a beat to bind to the bag rather than to Ryanair.
   - The sentences overclaimed. `wont` means over the published limit AT AN
     AIRLINE THAT CHECKS — not that the object cannot physically go in the bin.
     "It won't fit" sounds like geometry; what we hold is a policy breach.

   "Tight" rather than "Just fits" because the old label led with "fits" and
   buried the thing worth knowing, which is that there is no margin left.

   "Over" states only what we measured. It is completed by the detail beside
   it — "2.5 cm too deep" — rather than by asserting what a gate agent will do.
   Note that `gamble` is also over the limit: the two differ on enforcement,
   and "Risky" is where that judgement is expressed. */
/* THE FIFTH BAND, and why "Risky" alone was doing too much work.
 *
 * `gamble` spans everything from a hair over the limit to the edge of what the
 * airline tolerates. At a carrier that effectively never measures, that is
 * 0.3 cm to 5 cm under one word. Being 0.4 cm over at an airline nobody has
 * ever seen check a bag is not the same proposition as being 4.9 cm over, and
 * calling both "Risky" overstates the first and understates the second.
 *
 * `likely` is the shallow half of that zone — see LIKELY_SHARE in
 * engine/constants.mjs. It is expressed as a fraction of the airline's OWN
 * ceiling, so it scales with enforcement automatically and vanishes entirely
 * at a carrier that measures every bag. Ryanair has no "Probably fine".
 *
 * TWO WORDS, deliberately, against a ladder of one-word labels. "Likely" alone
 * does not say likely WHAT, and a reader could as easily take it for likely to
 * be stopped. The reassurance has to be unambiguous or it is worse than the
 * word it replaced.
 *
 * ORDERING. `line` (Tight) is LEGAL — inside the published limit with no
 * margin. `likely` is OVER it. So Tight outranks Probably fine, which is why
 * Tight moves up the colour ramp to lime and Probably fine takes amber: the
 * tint has to agree with the order or the wall of cards stops being readable
 * at a glance. */
/* `var` NAMES THE REAL CUSTOM PROPERTY, and did not until now: these said
   `var(--green)` while the stylesheet defines `--color-green`. Nothing read
   `.token` yet, so it was a trap rather than a bug — the first surface to use
   it would have got an undefined variable and silently painted nothing.
   `hex` is the same colour as a number, for canvas and WebGL, which cannot
   take a CSS variable. Two representations of ONE decision, side by side, so a
   change to the palette cannot move the badge without moving the drawing. */
export const BAND_COPY = {
  clears: { label: 'Fits', tone: 'good', token: 'var(--color-green)', hex: 0x14713d },
  line: { label: 'Tight', tone: 'edge', token: 'var(--color-lime)', hex: 0x5c7000 },
  likely: { label: 'Probably fine', tone: 'caution', token: 'var(--color-amber)', hex: 0x8a5d00 },
  gamble: { label: 'Risky', tone: 'warn', token: 'var(--color-orange)', hex: 0xb4530f },
  wont: { label: 'Over', tone: 'bad', token: 'var(--color-red)', hex: 0xb3261e },
};

/** The colour for a band, as a number. `null` — the engine declining to
 *  answer — is grey, and must never borrow a verdict colour: "we do not know"
 *  is not a mild version of "it fits". */
export const UNANSWERED_HEX = 0x736c63;
export const bandHex = (band) => BAND_COPY[band]?.hex ?? UNANSWERED_HEX;

/* The same five steps as Tailwind classes, for anything the DOM tints.
 *
 * Written out in full rather than built from `${tone}-wash` — Tailwind scans
 * source text for literal class names, and a template string produces none of
 * them. A generated class is a class that silently does not exist, which on a
 * status colour means the element renders untinted and looks exactly like a
 * verdict we have not answered. */
export const BAND_CHIP = {
  clears: ['border-green', 'bg-green-wash', 'text-green'],
  line: ['border-lime', 'bg-lime-wash', 'text-lime'],
  likely: ['border-amber', 'bg-amber-wash', 'text-amber'],
  gamble: ['border-orange', 'bg-orange-wash', 'text-orange'],
  wont: ['border-red', 'bg-red-wash', 'text-red'],
};

/* FITS OR DOES NOT FIT — the binary underneath the five bands.
 *
 * The ladder has five steps because the ADVICE has five shades. The object
 * itself does not: a reader glancing at a drawn bag is asking one question,
 * and five tints on a tinted shell is mush — nobody distinguishes lime from
 * green from amber on a rendered surface.
 *
 * The split is not a design preference. It is where the engine already puts
 * it: `line` (Tight) is INSIDE the published limit with no margin, and
 * `likely` (Probably fine) is OVER it and forgiven only because the airline
 * rarely measures. So the boundary is the airline's own published box, which
 * is the only line this site is willing to draw.
 *
 * `null` for an unanswered leg. Not knowing is neither good nor bad, and must
 * never be rendered as either. */
export const FITTING_BANDS = new Set(['clears', 'line']);
export const OVER_BANDS = new Set(['likely', 'gamble', 'wont']);
export const fitsWithinLimit = (band) =>
  FITTING_BANDS.has(band) ? true : OVER_BANDS.has(band) ? false : null;

/** Every class the ladder can apply, so a caller can clear before it sets. */
export const ALL_BAND_CHIP_CLASSES = Object.values(BAND_CHIP).flat();

/** Worst-first, so any surface needing a ranking uses this one and not its own.
 *  A second ordering somewhere else is a second chance to disagree. */
export const BAND_ORDER = ['wont', 'gamble', 'likely', 'line', 'clears'];

/* Editorial policy 16: we report measurements, not accusations. "Turned away",
   never "refused". Kept as a test, because this wording slipped once already. */
export const BANNED = /\brefus|\bscam|\brip.?off|\bcheat|\bgreedy/i;

/** Label from a band alone. `null` means the engine declined to answer, and
 *  this function cannot tell WHY — use resultLabel() wherever the result
 *  object is to hand.
 *
 *  This used to return "Not flying" for null. That was written when the only
 *  way to get a null band was Spirit ceasing operations. It is now also
 *  returned for a carrier we have not researched, and the bag pages were
 *  telling readers that Ryanair, easyJet, Wizz Air, Vueling, Frontier and
 *  Singapore Airlines were not flying. All six are operating. Saying an
 *  airline has stopped flying is a claim about a real company, and we were
 *  making it about six of them because of a gap in our own data. */
export function bandLabel(band) {
  if (band == null) return 'No answer';
  return BAND_COPY[band]?.label ?? 'Unknown';
}

/** The honest label, from the whole result. Every null band has a reason and
 *  the reasons are not interchangeable: one is a fact about the airline, the
 *  others are facts about us. */
export function resultLabel(result) {
  if (!result) return 'No answer';
  if (result.not_flying) return 'Ceased';
  if (result.no_cabin_bag) return 'No cabin bag';
  if (result.unknown) return 'Unknown';
  return bandLabel(result.band);
}

/** The one-line explanation under the verdict. Takes engine output and a units
 *  instance; returns a string. */
export function verdictLine(result, U) {
  if (result.not_flying) return 'This airline no longer operates.';
  if (result.no_cabin_bag) return 'This fare includes no cabin bag at any size.';

  const d = result.delta_cm;

  /* A LINEAR limit binds on the SUM of the sides, not on one of them, so the
     per-axis phrasing does not survive the substitution — "3.1 cm too in
     total" is not a sentence, and "3.1 cm too long" would name a dimension
     that is not the one at fault. Singapore publishes nothing but a linear
     rule; Delta, JAL, ANA and Scoot publish one beside their box.

     The reader also needs different advice: no rotation helps, and the fix is
     a smaller bag rather than a different orientation. */
  if (result.basis === 'linear') {
    if (d > 0)
      return `${U.lenText(d)} over their limit on the three sides added together.`;
    if (d === 0) return 'Exactly on their total-size limit.';
    return `${U.lenText(Math.abs(d))} to spare on their total-size limit.`;
  }

  if (d > 0) return `${U.lenText(d)} too ${result.dimension}.`;
  if (d === 0) return 'Exactly on the limit.';
  return `${U.lenText(Math.abs(d))} to spare.`;
}

/** Advisory copy. Engine returns figures; sentences are built here. */
export function advisoryLine(a, U) {
  switch (a.id) {
    case 'no_cabin_bag':
      return 'No cabin bag is permitted on this fare, whatever its size.';
    case 'agent_commission':
      return `Gate staff at this airline are paid ${a.amount_usd ? `up to $${a.amount_usd} ` : ''}for each bag charged at the gate.`;
    case 'regional_jet':
      return 'Often flown on a regional jet, whose bins will not take a full-size carry-on. Expect a free gate-check.';
    case 'squish':
      return a.level === 'may_squeeze'
        ? `Over by ${U.len(a.over_cm)} ${U.lenLabel()}. A soft bag this close usually compresses into a sizer — but that is the gate agent's call.`
        : `Over by ${U.len(a.over_cm)} ${U.lenLabel()} and the shell is rigid. It will not compress.`;
    case 'weight': {
      /* A shared cap covers the carry-on AND the personal item. The remainder
         is not "to pack" — it has to cover the second bag as well, and saying
         otherwise is generous in the direction that costs money. */
      const cap = a.shared
        ? `${U.mass(a.cap_kg)} ${U.massLabel()} for this bag and your personal item TOGETHER`
        : `${U.mass(a.cap_kg)} ${U.massLabel()}`;
      if (a.level === 'over') {
        return `The empty bag is ${U.mass(a.bag_kg)} ${U.massLabel()} against a limit of ${cap} — over before you pack.`;
      }
      return a.shared
        ? `Their limit is ${cap}. The empty suitcase is already ${U.mass(a.bag_kg)} ${U.massLabel()} of it, leaving ${U.mass(a.left_kg)} ${U.massLabel()} for everything you pack AND whatever you carry on top.`
        : `Their limit is ${cap} and the empty bag is ${U.mass(a.bag_kg)} ${U.massLabel()} of it. That leaves ${U.mass(a.left_kg)} ${U.massLabel()} to pack.`;
    }
    case 'expansion':
      return `Compliant until you use the expander, which adds ${U.len(a.expands_cm)} ${U.lenLabel()}.`;
    default:
      return '';
  }
}
