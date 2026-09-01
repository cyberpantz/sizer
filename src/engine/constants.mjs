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

/** How much of the gamble zone is shallow enough to call "Probably fine".
 *
 *  A fraction of the airline's OWN ceiling, never an absolute distance — so it
 *  scales with enforcement for free and disappears at a carrier that measures
 *  every bag, where the ceiling is 0 and there is no zone to split.
 *
 *  Half is where the data is quiet. Across the current catalogue the gamble
 *  zone's overage/ceiling ratios cluster hard at 0.6 (181 of 385 verdicts);
 *  cutting there would put the boundary on top of the cluster, where a
 *  millimetre of rounding reclassifies a fifth of the zone. 0.5 sits in the
 *  valley beside it — 18 verdicts — so the band is stable under small changes
 *  to any single dimension. */
export const LIKELY_SHARE = 0.5;

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

/* THERE IS NO CONSTANT FOR THE PERSONAL ITEM, AND THAT IS THE POINT.
 *
 * `PERSONAL_ITEM_CM = [40, 30, 20]` lived here, described as "the floor Ryanair,
 * Wizz and Vueling share". Those three do publish it. It is not a floor: of the
 * 48 carriers publishing an under-seat size, 12 sit at 40 x 30 x 20 and 29 are
 * STRICTER on some axis — BA, Lufthansa, KLM, Air France, Turkish and United
 * among them; Singapore, EVA, Starlux and Scoot allow ten centimetres of depth.
 *
 * Every bag page compared bags to it anyway, because toCarrier() returned only
 * the cabin allowance and there was nothing else to compare against. A reference
 * envelope used as an airline's rule is the same error as an unscored airline
 * rendering as a lenient one: an absent fact producing a confident answer.
 *
 * The intersection is now DERIVED from the published limits — see
 * personalEnvelope() in fit.mjs, which comes to 40 x 25 x 10. Deriving it means
 * it moves when the data moves, and can name the carriers that bind it. */

/* EVERY BAND, IN INCREASING ORDER OF RISK. Two test files iterate this — one
   to check each band has display copy, one to check the engine's ordering is
   monotonic — so a band missing here is a band nothing verifies.
   'likely' ("Probably fine") was added to the engine and to BAND_COPY and
   never added here, which is exactly how it went unchecked in both. It sits
   between 'line' and 'gamble': over the limit, but less risky than a gamble,
   because it is only ever offered where we have read how staff actually
   behave. */
export const BANDS = ['clears', 'line', 'likely', 'gamble', 'wont'];
