/* The boundary between stored records and the engine.

   Records in data/bags/ carry provenance objects — {v, src, at} — because we
   refuse to state a number without saying where it came from. The engine works
   in plain centimetres. Something has to unwrap, and if that "something" is
   each caller, we are back to five hand-maintained copies.

   So: one adapter, one place to change when the record shape changes, and it
   VALIDATES rather than trusting. A bag with two dimensions or a NaN should
   fail loudly here, not silently produce a verdict someone acts on. */

export class EngineInputError extends Error {
  constructor(msg, subject) {
    super(msg);
    this.name = 'EngineInputError';
    this.subject = subject;
  }
}

/** Accepts a bare value or a {v,...} provenance object. */
export const unwrap = (f) =>
  f && typeof f === 'object' && !Array.isArray(f) && 'v' in f ? f.v : f;

/** Provenance travels alongside the value, never inside it. The UI must be able
 *  to render a manufacturer claim differently from something we measured. */
export const provenanceOf = (f) =>
  f && typeof f === 'object' && !Array.isArray(f) && 'src' in f
    ? { src: f.src, at: f.at ?? null, ref: f.ref ?? null }
    : { src: 'unknown', at: null, ref: null };

function assertDims(v, subject) {
  if (!Array.isArray(v) || v.length !== 3) {
    throw new EngineInputError(`expected 3 dimensions, got ${JSON.stringify(v)}`, subject);
  }
  for (const n of v) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
      throw new EngineInputError(`dimension is not a positive finite number: ${n}`, subject);
    }
  }
  return v;
}

/* Carrier lifecycle. Airlines stop flying, merge, and get absorbed, and over a
   five-to-seven year horizon this is routine rather than exceptional — Spirit
   ceased operations on 2 May 2026, the first major US carrier to fail
   financially in 25 years, and our dataset went on describing its baggage policy
   as current.

   This is a STEP CHANGE, not staleness. A 180-day freshness warning would have
   flagged it in October, five months after the last Spirit flight. */
export const CARRIER_STATUS = new Set(['operating', 'ceased', 'merged', 'suspended']);

/* Why a fare has no cabin row. Three different facts that looked identical.

   The original rule was "absence is the signal": no cabin row meant no cabin bag
   at any size, which is the loudest thing this product says. That was safe while
   every record was placeholder. It stopped being safe the moment a real audit
   began, because a half-researched carrier also has no cabin row — and telling
   someone their bag is banned when nobody has looked yet is a worse error than
   any dimension we could get wrong.

   Same shape as gambleCeiling(null): an absent value silently produced a
   confident answer. */
/* Three axes, previously collapsed into one `fare_class` string.

   The values in use across 58 carriers were: economy, business (CABIN CLASS),
   basic, flex, max, plus, comfort_flex, family (FARE BRAND), and priority
   (a PAID ADD-ON). Ryanair Priority is €6 on top of a Basic fare, not a class
   of travel — and it is the highest-value distinction in the product, because
   it is the difference between "no cabin bag at any size" and "55x40x20".

   A reader can answer all three: what class did you book, which fare, did you
   buy priority. One string cannot represent that, and "economy" alone cannot
   distinguish a Ryanair Basic from a Ryanair Basic + Priority. */
export const CABIN_CLASS = new Set(['economy', 'premium_economy', 'business', 'first']);

/* BASIC IS A TIER OF ECONOMY, NOT A CLASS BESIDE IT.
 *
 * MEMBERSHIP ONLY — the order of this list carries no meaning.
 * It ranked the rungs once, against a global ordering, and that was a fiction:
 * airlines use the same word at different heights. "Standard" is easyJet's
 * bottom tier and LOT's middle one; `plus` is an ordinary rung at some
 * carriers and a PAID UPGRADE at others. Ranking by name promised easyJet
 * Basic passengers a 56x45x25 bag they would be charged for at the gate.
 * Which tier is cheapest is now read out of the airline's own entitlements —
 * see resolveFare. This list only answers "is this an economy fare at all",
 * which is the one question a name genuinely can answer.
 *
 * This one modelling error produced two opposite bugs at once.
 *
 * `cabin_class` is null on 97 of the 99 cabin rows in the dataset — carriers
 * publish a fare brand, not a travel class. So the class fallback only ever
 * matched a row literally NAMED "economy", and the five carriers who never use
 * that word — Ryanair, easyJet, Wizz, Vueling, Frontier — resolved to nothing,
 * became `cabin_unknown`, and were dropped from the coverage denominator of
 * every number on the site. "Goes anywhere" meant "goes anywhere except the
 * five airlines that actually measure".
 *
 * The patch for that, applied on one page only, was to prefer `basic`
 * outright — which then answered on Basic Economy for the 18 carriers that
 * publish both, and told Air France and KLM passengers they get no cabin bag.
 *
 * Both vanish once basic is modelled as what it is: the entry TIER of the
 * economy cabin. Ask for economy and you get the airline's economy row where
 * one exists, and its cheapest economy tier where the airline sells nothing
 * else.
 *
 * An unrecognised brand is NOT assumed to be economy, or a business row could
 * be handed to someone who booked coach. */
export const ECONOMY_TIERS = [
  'basic',
  'light',
  'lite',
  'saver',
  'standard',
  'classic',
  'value',
  'economy',
  'convenience',
  'comfort',
  'comfort_flex',
  'family',
  'flex',
  'plus',
  'inclusive_plus',
  'fly_grande',
  'fly_pro',
  'max',
];
const ECONOMY_SET = new Set(ECONOMY_TIERS);

/** Cabins ABOVE economy. Listed so they can be recognised and refused, rather
 *  than falling through and being served to someone who booked coach. */
export const PREMIUM_TIERS = new Set(['premium_economy', 'business', 'first', 'scootplus']);

/** Fare names that are really a PAID ADD-ON sold on top of a fare. Ryanair
 *  Priority is €6 on a Basic ticket, not a class of travel. */
export const ADDON_FARES = new Set(['priority', 'carry_on', 'two_pieces']);

/** Is this fare brand a tier of the given cabin class? */
export const isTierOf = (fare, cabinClass) => cabinClass === 'economy' && ECONOMY_SET.has(fare);

/* EVERY FARE BRAND MUST BE CLASSIFIED, AND AN UNKNOWN ONE MUST BE LOUD.
 *
 * Airlines call the same rung different things — Basic, Light, Lite, Saver,
 * Blue Basic, Wanna Get Away, Hand Baggage Only. No list can be complete, and
 * that is the danger: an unrecognised brand resolves to nothing, the carrier
 * becomes `cabin_unknown`, and it silently leaves the coverage denominator of
 * every figure on the site. That is precisely the bug that hid Ryanair,
 * easyJet, Wizz, Vueling and Frontier, and it would come back one carrier at a
 * time as the set grows toward 100.
 *
 * So the failure is moved from runtime to the test suite: a fare brand this
 * function cannot place fails the build and names the carrier, and somebody
 * decides which rung it is. A guess costs a reader money; a failing test costs
 * five minutes. */
export function classifyFare(fare) {
  if (fare == null) return 'unnamed';
  if (ADDON_FARES.has(fare)) return 'addon';
  if (PREMIUM_TIERS.has(fare)) return 'premium';
  if (ECONOMY_SET.has(fare)) return 'economy';
  return null;
}

/* Carriers publish both units, and the two disagree.
   United's carry-on is "22 x 14 x 9 in (56 x 35 x 23 cm)" — but 14 in is
   35.56 cm, not 35. A 35.5 cm bag passes the inch limit and fails the published
   centimetre limit, on the same page, from the same airline.

   Both numbers are theirs. We hold both, compare against the SMALLER on each
   axis, and say so — being wrong toward caution costs a reader some
   convenience; the other direction costs them a gate fee. */
export const IN_TO_CM = 2.54;

/* Where a dimension came from, ranked by how much it can be trusted.

   The original plan was "we measure every bag ourselves". That is not
   happening, and it was load-bearing — the release gate, the tier table and the
   moat argument all rested on it.

   The replacement is narrower and actually achievable: **go to the
   manufacturer, never the reseller.** A marketplace listing is the weakest
   source in this whole category — the same bag carries different dimensions
   across sellers, usually with no note of which figure is being quoted — and it
   is also the easiest one to scrape, which is why every competitor uses it.

   The distinction that matters is not who measured, it is WHICH FIGURE:
   the overall size, wheels and handle included, is the one an airline checks. */
export const DIM_SOURCE = {
  /* Manufacturer states an overall / with-wheels figure explicitly.
     Travelpro: "the overall dimensions, which include wheels and carry handles".
     This is what we build on. */
  MAKER_OVERALL: 'maker_overall',
  /* Manufacturer publishes one figure without saying which it is. Usable, and
     flagged — it is probably the packing body, which runs small. */
  MAKER_UNSPECIFIED: 'maker_unspecified',
  /* Manufacturer's packing/case figure, explicitly labelled as such. Never
     compared against an airline limit on its own. */
  MAKER_PACKING: 'maker_packing',
  /* A publication measured it. Attributed, and second to the maker's own
     overall figure because their method is rarely stated. */
  REVIEW: 'review',
  /* Reseller or marketplace. NOT TRUSTED — recorded for conflict detection
     only, never used as the operative dimension. */
  RESELLER: 'reseller',
  /* We put a tape on it. Still supported; nobody is planning to. */
  MEASURED: 'measured',
};

/** Sources we will compute a published verdict from, best first. */
export const TRUSTED_DIM_SOURCES = [
  DIM_SOURCE.MEASURED,
  DIM_SOURCE.MAKER_OVERALL,
  DIM_SOURCE.REVIEW,
  DIM_SOURCE.MAKER_UNSPECIFIED,
];

/** The release gate. A bag may only be PROMOTED — recommended, shelved, put in
 *  front of someone as an answer — on a dimension we can stand behind.
 *  Browsing and comparison are fine on weaker sources, as long as the page says
 *  so; a recommendation is us putting our name to it. */
export function isPromotable(bag) {
  const src = bag?.dim_source;
  return src === DIM_SOURCE.MEASURED || src === DIM_SOURCE.MAKER_OVERALL;
}

/* Route regions. An allowance can depend on where you are flying, not just what
   you bought: United Basic Economy includes no carry-on domestically and DOES
   include one transatlantic. Same fare, same passenger, opposite answers.

   Coarse on purpose. These are the buckets carriers themselves use in their
   baggage copy; anything finer would be inventing precision the source lacks. */
export const ROUTE_REGIONS = new Set([
  'domestic', // within the carrier's home country
  'shorthaul', // regional/continental — intra-Europe, intra-Asia
  'TATL', // transatlantic
  'TPAC', // transpacific
  'SA', // to/from South America
  'ME', // to/from the Middle East
  'AF', // to/from Africa
  'international', // catch-all when a carrier says no more than that
]);

/** Does this row apply to the route being asked about?
 *
 *  A row with no `applies_to` applies everywhere — most allowances are
 *  unconditional and requiring the field would make every record noisier.
 *  A row WITH one applies only where stated, and a route we were not told
 *  about resolves to "we do not know", never to a silent yes or no. */
export function routeApplies(row, route) {
  const a = row?.applies_to;
  if (!a) return { applies: true, conditional: false };
  if (!route) return { applies: null, conditional: true, reason: 'route_not_given' };

  if (Array.isArray(a.except)) {
    return { applies: !a.except.includes(route), conditional: true };
  }
  if (Array.isArray(a.regions)) {
    return { applies: a.regions.includes(route), conditional: true };
  }
  return { applies: true, conditional: false };
}

/** Reconcile a published inch figure with a published centimetre figure.
 *  Returns the effective limit plus whether the source contradicts itself. */
export function reconcileUnits(cm, inches, epsCm = 0.3) {
  if (!cm && !inches) return null;
  if (!inches) return { cm, from: 'cm', conflict: false };
  const converted = inches.map((v) => +(v * IN_TO_CM).toFixed(2));
  if (!cm) return { cm: converted, from: 'in', conflict: false };

  const diff = converted.map((v, i) => +(v - cm[i]).toFixed(2));
  const conflict = diff.some((d) => Math.abs(d) > epsCm);
  return {
    /* Axis by axis, not whole-array: United is 0.56 cm looser in inches on
       width and 0.14 cm tighter on depth. Picking one unit wholesale would be
       generous on the axis that actually binds. */
    cm: cm.map((v, i) => Math.min(v, converted[i])),
    published_cm: cm,
    published_in: inches,
    converted_cm: converted,
    diff_cm: diff,
    conflict,
    from: conflict ? 'stricter_of_both' : 'agreed',
  };
}

/** An add-on is bought on top of a fare and REPLACES the allowance it upgrades.
 *  Kept separate from the fare because the same add-on appears across fares and
 *  because the page has to be able to say "this costs €6 and changes the answer". */
export const ADDONS = new Set(['priority', 'cabin_bag', 'extra_legroom_bundle']);

export const CABIN_ABSENCE = {
  /* The carrier publishes a fare that permits no cabin bag at any size.
     Ryanair Basic, Wizz Basic. A finding, and the strongest one we make. */
  NOT_PERMITTED: 'not_permitted',
  /* Nobody has read this fare yet. We do not know. */
  NOT_RESEARCHED: 'not_researched',
  /* The carrier does not publish it, and we could not establish it. */
  NOT_PUBLISHED: 'not_published',
  /* Deliberately outside scope — a cargo or charter fare we do not model. */
  OUT_OF_SCOPE: 'out_of_scope',
  /* We know the answer, but it depends on a route we were not given. Distinct
     from not_researched: this is a gap in the QUESTION, not in our data. */
  ROUTE_DEPENDENT: 'route_dependent',
};

const SHELLS = new Set(['aluminium', 'hardside', 'softside', 'backpack', 'duffel']);

/** Infer construction when the record doesn't state it. The regex on model name
 *  is a fallback, not the rule — rename a product and the physics shouldn't
 *  change. Records SHOULD carry `shell`; this keeps older ones working. */
export function shellOf(bag) {
  if (bag.shell && SHELLS.has(bag.shell)) return bag.shell;
  if (/alumin/i.test(bag.model ?? '')) return 'aluminium';
  if (bag.type === 'duffel') return 'duffel';
  if (bag.type === 'backpack') return 'backpack';
  return bag.soft ? 'softside' : 'hardside';
}

/** Stored bag record -> engine input. Throws on anything unusable. */
export function toBag(record) {
  const subject = record?.slug ?? '(unnamed bag)';
  if (!record) throw new EngineInputError('no bag record given', subject);

  /* THE BEST FIGURE, not the first field that happens to hold one. Picking
     `external_cm ?? claimed_cm` meant a review measurement outranked the
     manufacturer's own number on 19 bags purely because of where the intake
     filed it. */
  const best = bestDimension(record);
  const external = unwrap(best?.field);
  if (!external) {
    throw new EngineInputError(
      'no dimensions on this bag — check `sized` before evaluating it',
      subject
    );
  }
  return {
    slug: record.slug,
    brand: record.brand,
    model: record.model,
    external_cm: assertDims(external, subject),
    provenance: provenanceOf(best.field),
    /* Which figure this is, and therefore what we may do with it. A first-class
       fact rather than a footnote — see DIM_SOURCE. */
    dim_source: dimSourceOf(record),
    measured: Boolean(unwrap(record.measured_cm)),
    weight_kg: unwrap(record.weight_kg) ?? null,
    soft: Boolean(record.soft),
    type: record.type ?? null,
    shell: shellOf(record),
    expands_cm: unwrap(record.expands_cm) ?? 0,
  };
}

/** Classify a bag record's operative dimension.
 *
 *  Explicit `dim_source` wins. Otherwise infer, conservatively: a record that
 *  carries BOTH a packing figure and an external one is a manufacturer that
 *  published both, which is the good case. A bare `claimed_cm` is unspecified —
 *  assume the worse reading rather than the flattering one. */
/* WHEELS DECIDE THE RUNG. HANDLES DO NOT.
 *
 * The rung used to be inferred: a record was MAKER_OVERALL only if it also
 * carried a separate packing figure, on the theory that a maker publishing
 * both must mean the other one is the outside. That is a proxy, and it left 20
 * well-researched bags — July, Quince, Bellroy, Calpak, Solgaard, Away Flex —
 * at MAKER_UNSPECIFIED and therefore unrecommendable, even where the page said
 * in plain words "External dimensions including wheels".
 *
 * Every one of those intake notes said the same thing: wheels explicitly
 * included, HANDLES not explicitly confirmed. That is not a real doubt about
 * which figure it is:
 *
 *   - A telescoping handle is retracted when a bag is measured or dropped in a
 *     sizer, so it is not part of the envelope that gets checked.
 *   - The packing-to-overall gap is driven overwhelmingly by WHEELS. Our own
 *     copy says "wheels, handle and feet" and the wheels are the big term.
 *   - A page stating "external dimensions" that excluded a permanent part of
 *     the bag would be misstating them.
 *
 * So the standard is: the maker says wheels are in, and it is the overall
 * figure. Recorded as a flag on the dimension by whoever reads the page, and
 * applied HERE — one rule in one tested place, rather than 54 judgement calls
 * made in prose notes and impossible to re-audit.
 *
 * `includes_wheels: false` is a statement, not a gap: a figure the maker says
 * EXCLUDES wheels is the packing body, whatever else the label calls it. */
/* THE LADDER RANKS SOURCES. IT USED TO RANK FIELD NAMES.
 *
 * docs/19 sets the order: measured > maker_overall > review > maker_unspecified
 * > maker_packing. The code did not implement it. `toBag` took
 * `measured_cm ?? external_cm ?? claimed_cm` and `dimSourceOf` checked
 * `external_cm.src === 'review'` before looking at anything else — both
 * choosing by WHICH FIELD a number landed in rather than by where it came
 * from.
 *
 * That inverted the entire premise of the project on 19 bags. Each had a stale
 * review measurement in `external_cm` and the manufacturer's own figure in
 * `claimed_cm`, because the intake correctly files an unlabelled figure as
 * "claimed". The site then compared the REVIEW's number against airline
 * limits, kept the maker's number unused, and told the reader the bag rested
 * on a review publication — while the research sat one field away.
 *
 * Most of those 19 differ by under half a millimetre, because the publications
 * were quoting the spec sheet rather than measuring. So little moved in the
 * verdicts. What was wrong was the CLAIM: "22 of 61 carry the manufacturer's
 * own dimensions" counted the field a number happened to land in.
 *
 * Now every figure on the record is ranked and the best one wins, which is
 * what the ladder always said. */
const RUNG_ORDER = [
  DIM_SOURCE.MEASURED,
  DIM_SOURCE.MAKER_OVERALL,
  DIM_SOURCE.REVIEW,
  DIM_SOURCE.MAKER_UNSPECIFIED,
  DIM_SOURCE.MAKER_PACKING,
  DIM_SOURCE.RESELLER,
];
const rankOf = (rung) => {
  const i = RUNG_ORDER.indexOf(rung);
  return i < 0 ? Number.POSITIVE_INFINITY : i;
};

/** What rung ONE figure sits on, given the record it belongs to. */
function rungOfField(field, key, record) {
  if (!field || !unwrap(field)) return null;
  if (key === 'measured_cm') return DIM_SOURCE.MEASURED;
  if (key === 'claimed_packing_cm') return DIM_SOURCE.MAKER_PACKING;
  if (field.src === 'review') return DIM_SOURCE.REVIEW;
  if (field.src === 'reseller') return DIM_SOURCE.RESELLER;

  /* Manufacturer figure. Wheels decide — see the flag rules below. */
  if (field.includes_wheels === true) return DIM_SOURCE.MAKER_OVERALL;
  if (field.includes_wheels === false) return DIM_SOURCE.MAKER_PACKING;
  /* NO FLAG — SO ASK THE MAKER'S OWN PACKING FIGURE.
   *
   * The ladder assumes an unlabelled maker figure is "probably the packing
   * body, which runs small". Where the maker publishes BOTH, that assumption
   * is checkable, and it is false every time it can be checked: the unlabelled
   * figure runs 3.2 to 6.4 cm LARGER than the same maker's packing figure on
   * all five bags that carry the pair. That gap is the wheels.
   *
   * A figure materially bigger than the maker's own packing size is the
   * exterior, whatever the label omits to say. This is evidence from inside
   * one manufacturer's own page, so it does not depend on a review — which
   * matters, because the reviews here mostly quote the spec sheet rather than
   * measure, and "they agree" would be the same number twice.
   *
   * The old rule only checked that a packing figure EXISTED, and only on
   * `external_cm`. It now compares the values, and applies to whichever field
   * the intake filed the figure under — Herschel, Samsonite Freeform and
   * Traveler's Choice all put it in `claimed_cm` and were missed. */
  const packing = unwrap(record?.claimed_packing_cm);
  const here = unwrap(field);
  if (packing && here && key !== 'claimed_packing_cm') {
    const biggest = Math.max(...here.map((v, i) => v - (packing[i] ?? 0)));
    /* 1 cm: comfortably past rounding, comfortably short of a wheel. A gap
       near zero means the two figures ARE the same body and the label tells
       us nothing new. */
    if (biggest >= 1) return DIM_SOURCE.MAKER_OVERALL;
  }
  return DIM_SOURCE.MAKER_UNSPECIFIED;
}

/** Every dimension on the record, best rung first. */
export function rankedDimensions(record) {
  return ['measured_cm', 'external_cm', 'claimed_cm', 'claimed_packing_cm']
    .map((key) => ({ key, field: record?.[key], rung: rungOfField(record?.[key], key, record) }))
    .filter((d) => d.rung)
    .sort((a, b) => rankOf(a.rung) - rankOf(b.rung));
}

/** The figure the site should actually use, and what it is. */
export const bestDimension = (record) => rankedDimensions(record)[0] ?? null;

export function dimSourceOf(record) {
  if (record?.dim_source) return record.dim_source;
  return bestDimension(record)?.rung ?? null;
}

/** True when a record can be evaluated at all. Cheaper than try/catch in a loop. */
export const isSized = (record) =>
  Boolean(unwrap(record?.measured_cm) ?? unwrap(record?.external_cm) ?? unwrap(record?.claimed_cm));

/** Carrier record + fare class -> engine input. */
/** Resolve a booking to a single allowance.
 *
 *  `booking` is { class, fare, addons[] } — or a bare string for the legacy
 *  callers, which is treated as whichever axis the record happens to use.
 *  Add-ons are applied last and win, because that is what buying one does. */
export function resolveFare(record, booking) {
  /* A bare string is the legacy call shape, and it was read as a FARE only —
     so `toCarrier(record, 'economy')` never reached the cabin-class fallback
     and a carrier selling nothing called "economy" resolved to nothing. The
     real pages escaped it because loadCarriers() passes { class: 'economy' },
     which made the same string mean two different things depending on which
     caller you were. A name that IS a cabin class fills both axes; anything
     else stays a fare, so 'basic' cannot start matching business rows. */
  const b =
    typeof booking === 'string'
      ? { fare: booking, ...(CABIN_CLASS.has(booking) ? { class: booking } : {}) }
      : (booking ?? {});
  const all = (record.allowances ?? []).filter((a) => a.type === 'cabin');

  /* Route filtering happens BEFORE fare matching, so a conditional row cannot
     be selected for a route it does not cover. United Basic Economy has a
     carry-on row that applies only transatlantic; a domestic booking must not
     reach it. */
  const applicable = all.map((a) => ({ row: a, r: routeApplies(a, b.route) }));
  const rows = applicable.filter((x) => x.r.applies === true).map((x) => x.row);
  /* Rows we could not decide on, because no route was supplied. Reported so the
     caller can say "this depends on where you are flying" instead of guessing. */
  const undecidable = applicable.filter((x) => x.r.applies === null).map((x) => x.row);

  /* Every comparison guards against undefined on BOTH sides. Without that,
     `a.cabin_class === b.class` is `undefined === undefined` and matches the
     first row in the file — an absent value silently producing a confident
     answer, which is the third time that exact shape has bitten today
     (gambleCeiling(null), the missing cabin row, and now this). */
  const eq = (x, y) => x != null && y != null && x === y;
  const bought = new Set(b.addons ?? []);

  /* A row gated behind an add-on is reachable ONLY when that add-on was bought.
     Without this, a Ryanair Basic booking matched the Priority row through
     `cabin_class: 'economy'` and we told a passenger with no cabin allowance
     that their bag was fine. Wrong in the most expensive direction. */
  const reachable = rows.filter((a) => !a.addon || bought.has(a.addon));

  /* Most specific first: an add-on beats a fare, a fare beats a class. */
  for (const addon of b.addons ?? []) {
    const hit = rows.find((a) => eq(a.addon, addon) || eq(a.fare_class, addon));
    if (hit) return { row: hit, matched: 'addon', addon };
  }
  const byFare = reachable.find((a) => eq(a.fare_class, b.fare) || eq(a.fare_brand, b.fare));
  if (byFare) return { row: byFare, matched: 'fare' };
  /* A known Basic fare must not inherit regular Economy's overhead bag.
     Purchased add-ons above can override it; a cabin-class fallback cannot. */
  const namedFare = (record.allowances ?? []).find(
    (a) => (eq(a.fare_class, b.fare) || eq(a.fare_brand, b.fare)) && a.cabin_absence
  );
  if (namedFare) {
    if (routeApplies(namedFare, b.route).applies === null)
      return { row: null, matched: null, route_dependent: true };
    if (routeApplies(namedFare, b.route).applies === false)
      return { row: null, matched: null, absence: CABIN_ABSENCE.OUT_OF_SCOPE };
    return { row: null, matched: 'fare', absence: namedFare.cabin_absence };
  }
  const byClass = reachable.find((a) => eq(a.cabin_class, b.class) || eq(a.fare_class, b.class));
  if (byClass) return { row: byClass, matched: 'class' };

  /* NOTHING IS NAMED FOR THE CLASS — fall back to the cheapest tier OF it.
   *
   * Ryanair publishes `basic` and `priority`; neither is the string "economy",
   * and `cabin_class` is null on almost every row in the dataset. Without this
   * the carrier resolved to nothing and was reported as unresearched, which
   * dropped it from the coverage denominator of every figure on the site.
   *
   * Reached only AFTER an exact match has failed, which is what keeps the two
   * failure modes apart: a carrier publishing a real `economy` row is answered
   * on that row (Air France and KLM keep their cabin bag), and a carrier
   * selling nothing but Basic is answered on Basic, because that IS their
   * economy.
   *
   * Cheapest-first, because this branch is a guess and basic economy is the
   * no-frills tier where you pay extra for everything — assuming the more
   * generous fare would promise an allowance the reader has not bought.
   * `matched: 'class'` still, since we resolved a class and not a named fare;
   * the page can say it answered on the cheapest fare sold. */
  /* WHICH TIER IS THE BASE ONE — decided by ENTITLEMENT, never by name.
   *
   * This used to rank the fare brands against a global ordered list, and that
   * list was a fiction: airlines use the same word at different rungs.
   * "Standard" is easyJet's bottom tier and LOT's middle one. Worse, `plus` is
   * an ordinary economy rung at some carriers and a PAID UPGRADE at others.
   *
   * That is not hypothetical — it shipped. easyJet's structure is Ryanair's:
   * Basic gets a personal item, and the 56x45x25 cabin bag needs the
   * `large_cabin_bag` add-on or a buy-up to Plus. But `plus` and
   * `inclusive_plus` are non-addon rows, they were in the tier list, and the
   * name rank cheerfully picked one — so we promised easyJet Basic passengers
   * a bag they would be charged for at the gate.
   *
   * The airline's own data already says which tier is cheapest, in the only
   * currency that matters here: how little it entitles you to. So rank by
   * entitlement. A tier with no reachable cabin bag is below one with a small
   * bag, which is below one with a large bag. No marketing vocabulary needed,
   * and it cannot be wrong about an airline nobody has taught us about. */
  const economyRows = all.filter((a) => !a.addon && isTierOf(a.fare_class, b.class));
  if (economyRows.length) {
    /* Every economy tier this carrier publishes, from ANY row type — a tier
       that appears only as a personal-item row still exists, and is precisely
       the cheap one we must not skip past. */
    const tierNames = new Set(
      (record.allowances ?? [])
        .filter((a) => !a.addon && isTierOf(a.fare_class, b.class))
        .map((a) => a.fare_class)
    );
    const entitlement = (tier) => {
      const row = economyRows.find((a) => a.type === 'cabin' && a.fare_class === tier);
      if (!row) return -1; // no cabin bag at all — the base product
      if (row.max_cm) return row.max_cm.reduce((s, v) => s + v, 0);
      return row.linear_max_cm ?? 0;
    };
    const cheapest = [...tierNames].sort((x, y) => entitlement(x) - entitlement(y))[0];
    const row = economyRows.find((a) => a.type === 'cabin' && a.fare_class === cheapest);
    if (row) return { row, matched: 'class', tier: cheapest };
    /* The cheapest tier has no cabin row of its own — easyJet Basic and
       Ryanair Basic both look like this. Fall through to the paywall and
       absence checks below, which decide whether that is a researched ban or
       an unresearched gap. Nothing to carry forward: those checks re-derive
       the tier from the same rows. */
  }

  /* The same fallback for a class whose only rows are an explicit absence —
     "this fare includes no cabin bag" is an ANSWER, and a far more useful one
     than "we have not researched this airline". */
  /* No sort. It used to order these by the global name rank, which no longer
     exists — a dead reference that would have thrown the first time any
     carrier reached this branch, and nothing does today. Every row here is an
     explicit "this fare includes no cabin bag", so they all say the same
     thing; picking the first is not a judgement about which is cheapest. */
  const absent = (record.allowances ?? [])
    .filter((a) => a.type === 'cabin' && !a.addon && a.cabin_absence)
    .filter((a) => isTierOf(a.fare_class, b.class));
  if (absent.length && routeApplies(absent[0], b.route).applies === true) {
    return {
      row: null,
      matched: 'class',
      absence: absent[0].cabin_absence,
      tier: absent[0].fare_class,
    };
  }

  /* THE ONLY CABIN ROW IS BEHIND A PAYWALL — that is a finding, not a gap.
   *
   * Ryanair, Wizz and Frontier publish no cabin allowance for their base fare
   * at all. What they publish is a personal-item row for Basic, and a cabin
   * row reachable only by buying Priority (or Frontier's carry-on). The
   * records say exactly that, correctly.
   *
   * The engine was reading "no cabin row I can reach" as NOT_RESEARCHED — a
   * fact about US — and dropping the three airlines readers most want answered
   * out of the coverage denominator entirely. But a record that documents what
   * an add-on buys is a record somebody read the fare table for, and the
   * absence of a free cabin bag beside a priced one is the single most
   * important thing these carriers publish.
   *
   * Deliberately narrow: it fires only when a cabin row exists for this same
   * tier AND is gated behind an add-on. Silence on its own still means
   * unresearched — inferring a ban from nothing is how a half-finished record
   * turns into a confident claim. */
  const paywalled = all.filter(
    (a) => a.addon && !bought.has(a.addon) && isTierOf(a.fare_class, b.class)
  );
  const researchedTier = (record.allowances ?? []).some(
    (a) => a.type !== 'cabin' && !a.addon && isTierOf(a.fare_class, b.class)
  );
  if (paywalled.length && researchedTier) {
    return {
      row: null,
      matched: 'class',
      absence: CABIN_ABSENCE.NOT_PERMITTED,
      tier: paywalled[0].fare_class,
      addon_available: paywalled[0].addon,
    };
  }

  /* Nothing matched — but if a route-conditional row exists that we could not
     evaluate, the honest answer is "it depends", not "no". */
  if (undecidable.length) {
    return { row: null, matched: null, route_dependent: true, candidates: undecidable.length };
  }
  return { row: null, matched: null };
}

function buildAllowance(row, subject, rows = []) {
  const u = reconcileUnits(row.max_cm, row.max_in);
  return {
    /* A LINEAR-ONLY ALLOWANCE IS STILL AN ALLOWANCE.
       Singapore publishes no box at all — their whole cabin rule is "sum of
       dimensions <= 115 cm". Requiring three axes made that record
       unrepresentable, so the researched figure sat parked in
       `published_cabin_allowances` with a note saying it was waiting on the
       engine. Dimensions are required only when there is no linear cap to
       fall back on; one of the two must exist or there is no rule to check. */
    max_cm:
      u?.cm == null && typeof row.linear_max_cm === 'number' ? null : assertDims(u?.cm, subject),
    /* Sum of the three sides. Published alongside a box by Delta, JAL, ANA and
       Scoot, and instead of one by Singapore. The stricter constraint binds. */
    linear_max_cm: typeof row.linear_max_cm === 'number' ? row.linear_max_cm : null,
    max_kg: row.max_kg ?? null,
    /* IS THAT WEIGHT CAP FOR THIS BAG, OR FOR BOTH BAGS?

       Air France, KLM, Cathay, JAL, ANA and Scoot publish ONE cabin weight
       covering the carry-on AND the personal item together. The figure lands
       on the cabin row because that is where a weight belongs, and the
       personal row carries null — so read naively it says the whole 10 kg is
       available for the suitcase.

       It is not, and the error runs in the expensive direction. We told
       someone flying ANA that a 4.6 kg suitcase "leaves 5.4 kg to pack". Add
       the laptop bag they are also carrying and the truth is nearer 3.4.

       `allowance_group` is the airline's own grouping, recorded during
       research and, until now, read by nothing. */
    weight_shared: row.allowance_group
      ? rows.some(
          (r) =>
            r !== row &&
            r.allowance_group === row.allowance_group &&
            r.fare_class === row.fare_class &&
            r.type === 'personal'
        )
      : false,
    /* Kept so a page can show the airline's own figures rather than ours, and
       flag when they disagree — that disagreement is a finding worth printing. */
    units: u ?? null,
  };
}

export function toCarrier(record, fareClass) {
  const subject = record?.iata ?? record?.name ?? '(unnamed carrier)';
  if (!record) throw new EngineInputError('no carrier record given', subject);

  const rows = record.allowances ?? [];
  const resolved = resolveFare(record, fareClass);
  const cabin = resolved.row;

  /* Absence must say WHY. An explicit row of `{type:'cabin', permitted:false}`
     is a finding; a fare row that exists with no cabin entry is unresearched
     unless it says otherwise. Falling back to NOT_RESEARCHED is deliberate: the
     conservative reading of silence is "we do not know", never "banned". */
  const key = typeof fareClass === 'string' ? fareClass : (fareClass?.fare ?? fareClass?.class);
  const fareRow = rows.find((a) => a.fare_class === key);
  const absence = cabin
    ? null
    : resolved.route_dependent
      ? CABIN_ABSENCE.ROUTE_DEPENDENT
      : (resolved.absence ??
        fareRow?.cabin_absence ??
        record.cabin_absence ??
        CABIN_ABSENCE.NOT_RESEARCHED);
  const strictness = unwrap(record.strictness?.score ?? record.strictness);
  if (typeof strictness !== 'number' || strictness < 1 || strictness > 10) {
    throw new EngineInputError(`strictness must be 1-10, got ${strictness}`, subject);
  }
  return {
    iata: record.iata,
    name: record.name,
    fare_class: key ?? null,
    /* Which axis actually matched, so a page can say "we answered for your fare"
       versus "we fell back to your cabin class". */
    matched_on: resolved.matched,
    /* The allowance depends on where they are flying and we were not told. */
    route_dependent: Boolean(resolved.route_dependent),
    strictness,
    /* Has anyone actually READ how this airline behaves at the gate, as
       opposed to us assigning it a type/region prior?

       Every strictness score in the dataset is currently a prior, so the score
       alone cannot answer this. An evidence claim — "they measure bags at the
       gate and pay staff a bonus for spotting oversize ones" — is somebody
       having looked. The engine uses it to decide whether it may offer the
       reassuring "Probably fine" band, which is the one place a guess would
       cost a reader money rather than convenience. */
    enforcement_researched: (record.strictness?.evidence ?? []).some((e) => e?.claim),
    /* Never a zero-size row — a naive comparison would let one pass. */
    allowance: cabin ? buildAllowance(cabin, subject, rows) : null,
    /* Only an EXPLICIT finding means "no cabin bag". Everything else is unknown:
       silence from a half-researched carrier must never read as a ban. */
    no_cabin_bag: absence === CABIN_ABSENCE.NOT_PERMITTED,
    cabin_unknown: absence != null && absence !== CABIN_ABSENCE.NOT_PERMITTED,
    cabin_absence: absence,
    regional_jets: Boolean(record.operates_regional_jets),
    /* Documented per-catch commission, if any. Carried on the carrier because
       it is a fact about the airline, not about the bag. */
    agent_commission: record.agent_commission ?? null,

    /* Default to operating: a record without a status is one nobody has thought
       about, and the overwhelming majority of carriers are flying. Absence here
       is not evidence of failure — unlike an absent cabin row, which IS the
       signal for "no bag permitted". */
    status: record.status ?? 'operating',
    ceased_at: record.ceased_at ?? null,
    successor: record.successor ?? null,
    /* The one question every caller must ask before rendering a verdict. */
    flying: (record.status ?? 'operating') === 'operating',
  };
}
