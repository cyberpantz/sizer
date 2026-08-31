/* Every tunable number in the fit engine, in one place.
   These were previously magic numbers duplicated across five files, which is how
   check.html silently drifted onto a superseded band ladder. Nothing outside this
   file may hard-code a threshold. */

/** Our own measurement error: tape, their rounding, inch→cm conversion.
 *  The ONLY quantity permitted to move a band. Deliberately small.
 *  Sized by the Travelpro Maxlite 5 International, built to 55×40×20 but
 *  published in inches: 21.75in → 55.245cm failed seven carriers, one of them
 *  (Iberia) by 0.01cm. A tenth of a millimetre is not a verdict. */
export const EPS_CM = 0.3;

/** How far past the published limit is still worth showing as a risk rather
 *  than a refusal — the "fuzz factor", and a fact about the AIRLINE.
 *  It never alters the published limit: delta is always computed against the
 *  real number and always shown. This only decides GAMBLE vs WON'T. */
export function gambleCeiling(strictness) {
  /* Unknown fails SAFE, meaning strict.

     `null <= 3` is true in JavaScript, so an unresearched carrier used to get
     the most permissive ceiling there is — we would have told someone their
     oversize bag was worth a try at an airline we know nothing about. The two
     ways to be wrong are not symmetric: an over-cautious verdict costs a reader
     some convenience, an over-confident one costs them a gate fee and their
     bag. When we do not know, say the strict thing. */
  if (typeof strictness !== 'number' || !Number.isFinite(strictness)) return 0;
  if (strictness <= 3) return 5.0; // effectively never measured
  if (strictness <= 5) return 3.0; // occasional, usually only when bins are full
  if (strictness <= 7) return 1.5; // frames at the gate, staff use judgement
  return 0; // measured as routine — over is over
}

/** What an unresearched carrier scores. Used when a record has no strictness
 *  we can derive and no override — deliberately at the strict end, and paired
 *  with a UI obligation to say the score is provisional rather than silently
 *  presenting a guess as a finding. */
export const UNKNOWN_STRICTNESS = 8;

/** How much the bag deforms entering a sizer frame. NEVER moves a band —
 *  folding it in moved one bag nine carriers, silently, which is wiggle room
 *  replacing a published limit. It raises an advisory instead. */
export const SQUISH_CM = {
  aluminium: 0, // dents, doesn't compress
  hardside: 0.3,
  softside: 1.5,
  backpack: 2.5,
  duffel: 3.0,
};

/** Depth a soft bag loses when packed thin. Applied to the smallest dimension
 *  only, because that is the one a traveller can flatten. */
export const SOFT_COMPRESS_CM = 2;

/** Empty-bag weight as a share of the cabin allowance, past which we tell the
 *  traveller what's left to pack. Ratio, not absolute: 4kg is unremarkable on
 *  Air France's 12kg and nearly disqualifying on Emirates' 7. */
export const WEIGHT_TIGHT_RATIO = 0.4;

/** Reference personal-item envelope — the floor Ryanair, Wizz and Vueling share. */
export const PERSONAL_ITEM_CM = [40, 30, 20];

export const BANDS = ['clears', 'line', 'gamble', 'wont'];
