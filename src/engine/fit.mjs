/* The fit engine.

   Pure: no DOM, no I/O, no unit formatting, no copy. Centimetres in, data out.
   That is what lets one implementation serve the pages, the build scripts and
   the tests — and it is why "5 cm too width" and a silently-drifted band ladder
   were both possible before it existed.

   Built through createEngine(config) rather than as bare exports, so thresholds
   are injectable. Tests can pin a curve; a future per-region tuning can vary one
   without a fork. The default export covers the common case.

   Contract and rationale: docs/05-schema.md.
   Three bugs have been found in these rules, every one by running real data
   through them rather than reading them:
     1. a fall-through gap at strictness 6-7 that silently returned CLEARS
     2. no rounding tolerance — failed a bag by 0.01 cm
     3. a flat 3 cm ceiling that ignored strictness entirely
   All three are tests now. Add a case when a fourth turns up. */

import { DEFAULT_ADVISORIES } from './advisories.mjs';
/* Plain named imports, no aliases and no namespace import. The mockup inliner
   flattens these modules into a single scope, where `defaults.EPS_CM` and
   `EPS_CM as DEFAULT_EPS_CM` both evaporate. scripts/build-mockups.mjs rejects
   either form rather than emitting a page that throws in a browser — both were
   caught that way, which is the entire reason that check exists. */
import {
  EPS_CM,
  gambleCeiling,
  LIKELY_SHARE,
  PERSONAL_ITEM_CM,
  SOFT_COMPRESS_CM,
  SQUISH_CM,
  WEIGHT_TIGHT_RATIO,
} from './constants.mjs';
import { EngineInputError, isPromotable, isSized, toBag, toCarrier } from './normalize.mjs';

/** Compared largest-to-smallest, never by axis name: a bag rotates, so
 *  length/width/depth are the manufacturer's convention rather than a physical
 *  constraint. Sorting is what makes the comparison honest. */
export const desc = (a) => [...a].sort((x, y) => y - x);

const DIM_LABEL = ['long', 'wide', 'deep'];

export function createEngine(overrides = {}) {
  const config = {
    EPS_CM,
    gambleCeiling,
    LIKELY_SHARE,
    SQUISH_CM,
    SOFT_COMPRESS_CM,
    WEIGHT_TIGHT_RATIO,
    PERSONAL_ITEM_CM,
    advisories: DEFAULT_ADVISORIES,
    ...overrides,
  };

  /** External dimensions after compression the traveller actually controls.
   *  Applied to the smallest dimension only — that is the one you can flatten. */
  function effective(bag) {
    const e = desc(bag.external_cm);
    if (bag.soft) e[2] = Math.max(0, e[2] - config.SOFT_COMPRESS_CM);
    return e;
  }

  /** Overage on the worst dimension. Negative means room to spare. Reports the
   *  binding dimension, because that is the fact the traveller can act on. */
  function delta(bag, allowanceCm) {
    const e = effective(bag),
      m = desc(allowanceCm);
    let worst = -Infinity,
      idx = 0;
    for (let i = 0; i < 3; i++) {
      const d = e[i] - m[i];
      if (d > worst) {
        worst = d;
        idx = i;
      }
    }
    return { cm: +worst.toFixed(2), dimension: DIM_LABEL[idx], index: idx };
  }

  /** Exhaustive by construction: every finite delta lands in exactly one band
   *  at every strictness, with no fall-through. */
  function band(deltaCm, strictness, enforcementResearched = false) {
    const ceiling = config.gambleCeiling(strictness);
    if (deltaCm > ceiling && deltaCm > config.EPS_CM) return 'wont';
    if (deltaCm > config.EPS_CM) {
      /* THE SHALLOW HALF OF THE GAMBLE ZONE — "Probably fine".
       *
       * Gated on someone having actually researched how this airline behaves,
       * NOT merely on it having a strictness number. Every score in the
       * dataset today is a type/region prior; 23 carriers additionally carry
       * an evidence claim about what staff do at the gate.
       *
       * The gate exists because this is the first band whose job is to
       * REASSURE, and the two ways of being wrong are not symmetric — the
       * same asymmetry gambleCeiling() already fails safe on. Telling someone
       * their oversize bag is probably fine, on the strength of a number
       * nobody researched, costs them a gate fee and their bag. Leaving it at
       * "Risky" costs them some convenience.
       *
       * It also makes the research pay: a carrier moves into this band only
       * once somebody reads how it actually behaves. */
      if (enforcementResearched && deltaCm <= ceiling * config.LIKELY_SHARE) return 'likely';
      return 'gamble';
    }
    if (deltaCm > 0) return 'line'; // over, but inside our own error
    if (deltaCm > -2 && strictness >= 6) return 'line'; // legal, no margin, they measure
    return 'clears';
  }

  /** One bag against one carrier+fare. The single call every surface should use. */
  function evaluate(bag, carrier) {
    /* A carrier that no longer flies cannot produce a verdict. Returning
       'clears' or 'wont' would both be wrong — the honest answer is that the
       question no longer applies. Checked FIRST, before the allowance, because
       a defunct airline's published limits are trivia. */
    if (carrier.flying === false) {
      return {
        band: null,
        delta_cm: null,
        dimension: null,
        no_cabin_bag: false,
        not_flying: true,
        status: carrier.status,
        ceased_at: carrier.ceased_at,
        successor: carrier.successor ?? null,
        advisories: [
          {
            id: 'not_flying',
            level: carrier.status,
            ceased_at: carrier.ceased_at,
            successor: carrier.successor ?? null,
          },
        ],
      };
    }
    /* We do not know the allowance. Refusing to answer is the only honest
       option — a guess here is indistinguishable to the reader from a finding. */
    if (carrier.cabin_unknown) {
      return {
        band: null,
        delta_cm: null,
        dimension: null,
        no_cabin_bag: false,
        unknown: true,
        reason: carrier.cabin_absence,
        advisories: [{ id: 'allowance_unknown', level: carrier.cabin_absence }],
      };
    }
    if (carrier.no_cabin_bag) {
      return {
        band: 'wont',
        delta_cm: null,
        dimension: null,
        no_cabin_bag: true,
        advisories: runAdvisories({ bag, carrier, deltaCm: null }),
      };
    }
    const d = delta(bag, carrier.allowance.max_cm);
    return {
      band: band(d.cm, carrier.strictness, carrier.enforcement_researched),
      delta_cm: d.cm,
      dimension: d.dimension,
      no_cabin_bag: false,
      /* The release gate: may this bag be RECOMMENDED, not merely displayed?
         See isPromotable — manufacturer's own overall figure, or ours. */
      promotable: isPromotable(bag),
      dim_source: bag.dim_source,
      advisories: runAdvisories({ bag, carrier, deltaCm: d.cm }),
    };
  }

  function runAdvisories(ctx) {
    return config.advisories.map((fn) => fn({ ...ctx, config })).filter(Boolean);
  }

  /** Strictest common box across an itinerary: the biggest bag surviving every
   *  leg. Minimum per SORTED dimension, so it is rotation-independent. */
  function envelope(carriers) {
    const boxes = carriers
      .filter((c) => c.allowance && c.flying !== false)
      .map((c) => desc(c.allowance.max_cm));
    if (!boxes.length) return null;
    return [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b[i])));
  }

  /** Which leg decides the trip — the one to name in the copy. A leg with no
   *  cabin allowance always binds, whatever the dimensions say. */
  function bindingLeg(bag, carriers) {
    let worst = null;
    for (const carrier of carriers) {
      const result = evaluate(bag, carrier);
      if (result.no_cabin_bag) return { carrier, result };
      if (result.unknown) return { carrier, result }; // an unanswerable leg decides the trip
      if (!worst || result.delta_cm > worst.result.delta_cm) worst = { carrier, result };
    }
    return worst;
  }

  /** Does an overhead carry-on also fit a personal-item envelope? Shown on a bag
   *  page; never a reason to move it out of the carry-on shelf. */
  function fitsPersonalItem(bag) {
    const e = desc(bag.external_cm),
      p = desc(config.PERSONAL_ITEM_CM);
    return e.every((v, i) => v <= p[i]);
  }

  /** Share of a carrier set the bag clears. `line` counts — it does fit. */
  /** Share of a carrier set the bag clears. Carriers that no longer fly are
   *  excluded from the denominator, not counted as failures — "clears 19 of 24"
   *  must not quietly become "19 of 25" because a defunct airline is still in
   *  the file. */
  /** Carriers we cannot score leave the denominator, exactly like ones that no
   *  longer fly. "Clears 41 of 58" must not silently become "41 of 58" when six
   *  of those 58 were never researched. */
  /* A carrier that permits NO cabin bag on its cheapest fare leaves the
     denominator too, and for a different reason from the two above.
     `no_cabin_bag` is a fact about the FARE, not about the bag: Ryanair, Wizz
     and Frontier sell you a seat and a personal item, and every suitcase ever
     made fails them equally. Counting them tells a reader nothing about which
     bag to buy, and makes "clears every airline" unreachable by construction —
     the top shelf empties and the page stops discriminating.
     Reported separately so the page can say it, which it must: "no bag clears
     these three without buying up" is among the most useful things we know. */
  function coverage(bag, carriers) {
    const live = carriers.filter((c) => c.flying !== false && !c.cabin_unknown && !c.no_cabin_bag);
    let clears = 0,
      line = 0;
    for (const c of live) {
      const b = evaluate(bag, c).band;
      if (b === 'clears') clears++;
      else if (b === 'line') line++;
    }
    return {
      clears,
      line,
      pass: clears + line,
      of: live.length,
      excluded: carriers.length - live.length,
      /* Split out, because "we could not answer for 6 of these" is a different
         statement to "6 of these no longer fly" and the page should say which. */
      unknown: carriers.filter((c) => c.cabin_unknown).length,
      not_flying: carriers.filter((c) => c.flying === false).length,
      /* Airlines whose cheapest fare includes no cabin bag at any size. Not a
         failure of the bag, and not a gap in our research — a finding. */
      no_cabin_bag: carriers.filter((c) => c.no_cabin_bag && c.flying !== false).length,
      ratio: live.length ? (clears + line) / live.length : 0,
    };
  }

  return {
    config,
    effective,
    delta,
    band,
    evaluate,
    envelope,
    bindingLeg,
    fitsPersonalItem,
    coverage,
  };
}

export const engine = createEngine();
export const { delta, band, evaluate, envelope, bindingLeg, fitsPersonalItem, coverage } = engine;
export * from './constants.mjs';
export { EngineInputError, isPromotable, isSized, toBag, toCarrier };
