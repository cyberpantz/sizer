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

  const external =
    unwrap(record.measured_cm) ?? unwrap(record.external_cm) ?? unwrap(record.claimed_cm);
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
    provenance: provenanceOf(record.measured_cm ?? record.external_cm ?? record.claimed_cm),
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
export function dimSourceOf(record) {
  if (record?.dim_source) return record.dim_source;
  if (unwrap(record?.measured_cm)) return DIM_SOURCE.MEASURED;
  const ext = record?.external_cm;
  if (ext?.src === 'review') return DIM_SOURCE.REVIEW;
  if (unwrap(record?.claimed_packing_cm) && unwrap(ext)) return DIM_SOURCE.MAKER_OVERALL;
  if (unwrap(ext) || unwrap(record?.claimed_cm)) return DIM_SOURCE.MAKER_UNSPECIFIED;
  return null;
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
  const b = typeof booking === 'string' ? { fare: booking } : (booking ?? {});
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
    max_cm: assertDims(u.cm, subject),
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
    units: u,
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
