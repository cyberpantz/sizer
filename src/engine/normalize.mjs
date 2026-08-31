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
    /* Whether the number is ours is a first-class fact, not a footnote: nothing
       may ship as a promoted recommendation on someone else's tape measure. */
    measured: Boolean(unwrap(record.measured_cm)),
    weight_kg: unwrap(record.weight_kg) ?? null,
    soft: Boolean(record.soft),
    type: record.type ?? null,
    shell: shellOf(record),
    expands_cm: unwrap(record.expands_cm) ?? 0,
  };
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
  const rows = (record.allowances ?? []).filter((a) => a.type === 'cabin');

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
  const byClass = reachable.find((a) => eq(a.cabin_class, b.class) || eq(a.fare_class, b.class));
  if (byClass) return { row: byClass, matched: 'class' };
  return { row: null, matched: null };
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
    : (fareRow?.cabin_absence ?? record.cabin_absence ?? CABIN_ABSENCE.NOT_RESEARCHED);
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
    strictness,
    /* Never a zero-size row — a naive comparison would let one pass. */
    allowance: cabin
      ? { max_cm: assertDims(cabin.max_cm, subject), max_kg: cabin.max_kg ?? null }
      : null,
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
