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
export function toCarrier(record, fareClass) {
  const subject = record?.iata ?? record?.name ?? '(unnamed carrier)';
  if (!record) throw new EngineInputError('no carrier record given', subject);

  const rows = record.allowances ?? [];
  const cabin = rows.find((a) => a.type === 'cabin' && a.fare_class === fareClass);

  /* Absence must say WHY. An explicit row of `{type:'cabin', permitted:false}`
     is a finding; a fare row that exists with no cabin entry is unresearched
     unless it says otherwise. Falling back to NOT_RESEARCHED is deliberate: the
     conservative reading of silence is "we do not know", never "banned". */
  const fareRow = rows.find((a) => a.fare_class === fareClass);
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
    fare_class: fareClass,
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
