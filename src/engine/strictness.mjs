/* Strictness as a DERIVED score, not an authored integer.

   Prompted by Luggage Validator's published method, which is worth reading and
   worth disagreeing with. They combine six factors into one 1–10 number:
   free allowance, size limits, weight limits, gate enforcement, fees, and
   personal-item rules. Five of those six describe how restrictive the published
   rules ARE. One describes how likely they are to be applied.

   That is a good score for THEIR product — a shopping signal, "which airline
   should I book?". It is the wrong input for ours. Our engine already consumes
   the published rules directly: the size limit IS the box we compare against,
   the weight cap IS the advisory, a missing cabin row IS the no-bag flag. Folding
   restrictiveness into strictness would count the same fact twice — Ryanair's
   40x30x20 would penalise them once in the delta and again in the band.

   So we keep the definition (enforcement probability, and nothing else) and
   steal the decomposition. Every component below is a question about BEHAVIOUR,
   independently checkable, individually cited. The score becomes reproducible
   instead of asserted — which is the honest fix for the admission in 05-schema
   that the ceilings are judgement rather than measurement. */

/** Each component is a yes/no about what the airline DOES, with a weight.
 *  Weights are judgement and are meant to be re-fit from `reports` once enough
 *  real outcomes exist. They are in one table so that is a single edit. */
/* A PRIOR from the business model, before any evidence is gathered.

   I initially rejected carrier type as "policy restrictiveness in disguise".
   That was wrong, and the distinction is worth stating precisely: a ULCC's small
   allowance is restrictiveness and does not belong here, but a ULCC's REASON for
   enforcing does. Ancillary fees are not a side effect of the ULCC model, they
   are the model — the fare is priced below cost on the assumption that bags are
   billed separately. Enforcement is therefore structural rather than incidental,
   and that is a fact about behaviour.

   A legacy carrier has the opposite incentive. The fare already paid for the
   seat, gate staff are measured on on-time departure, and stopping a passenger
   to gauge a bag costs them the thing they are judged on.

   So this is a genuine prior, in the Bayesian sense: where we start before
   looking, and what the evidence then moves us away from. It is never the final
   answer. Every carrier still needs its published content read — the prior
   exists so that an unresearched carrier has a DEFENSIBLE score rather than a
   null or a fail-safe guess, not so we can skip the reading. */
export const TYPE_PRIOR = {
  ulcc: { score: 9, why: 'Ancillary fees are the revenue model; enforcement is structural.' },
  lcc: { score: 7, why: 'Fee-dependent, though less absolutely than a ULCC.' },
  hybrid: { score: 6, why: 'Bundles vary; enforcement varies with the fare sold.' },
  full_service: {
    score: 5,
    why: 'Fare covers the seat; gate staff are measured on on-time departure.',
  },
  regional: {
    score: 6,
    why: 'Bins are physically small, so bags are stopped for space rather than policy.',
  },
  charter: { score: 7, why: 'Thin margins, high load factors.' },
};

/* Region shifts the prior, because carrier TYPE alone did not explain the data.

   Comparing the type prior against 24 hand-assigned scores produced a clean
   pattern: full-service carriers scored 5.3 on average in North America and
   7.0 in Europe and the Middle East. Same business model, different behaviour —
   European legacy carriers gauge at the gate as routine, while American removed
   its sizers entirely in October 2025.

   That is enforcement, not policy, so it belongs in the prior. It also has an
   obvious mechanism: European carriers compete directly with Ryanair and Wizz
   and have adopted their gate practices, and Gulf carriers weigh as standard. */
export const REGION_SHIFT = {
  EU: +2, // gate sizers are routine; direct competition with ULCCs
  ME: +2, // cabin bags weighed as standard
  AS: +1, // weighing common, size enforcement variable
  /* NA is the baseline, and the reason needs stating carefully: it is US
     LEGACY carriers that are relaxing — American removed its gate sizers in
     Oct 2025 — not the US as a region. US ULCCs run the most aggressively
     incentivised enforcement documented anywhere, paying gate agents per bag
     caught. The type prior already puts them at 9, and the shift is capped so
     it cannot pull them down; but "North America is lenient" would be a false
     summary of this row, and nobody should read it that way. */
  NA: 0,
};

/** With no type and no evidence, assume strict. The asymmetry from
 *  constants.mjs applies: an over-cautious verdict costs convenience, an
 *  over-confident one costs a gate fee and the bag. */
export const NO_PRIOR = {
  score: 8,
  why: 'Carrier type unknown — assume enforcement until shown otherwise.',
};

export function priorFor(type, region = null) {
  const base = TYPE_PRIOR[type] ?? NO_PRIOR;
  const shift = REGION_SHIFT[region] ?? 0;
  /* ULCCs are already at the ceiling and do not get more enforcing for being
     European — the shift describes how much legacy carriers have moved toward
     ULCC practice, not a property of the region itself. */
  if (!shift || base.score >= 9) return base;
  return {
    score: Math.min(10, Math.max(1, base.score + shift)),
    why: `${base.why} ${region}: ${shift > 0 ? '+' : ''}${shift} for regional enforcement norms.`,
  };
}

/* Components are chosen for one reason: we can actually source them.

   An earlier version asked four good questions we mostly cannot answer — "is
   there a sizer at the gate", "are checks routine" — which are the right
   questions and are invisible from a desk. A model whose inputs are unavailable
   is not a model, it is a nicer-looking guess.

   These four are sourceable during the 50-carrier audit at close to zero extra
   cost, because three of them are on the same page as the allowance we are
   already reading. Each is a fact about BEHAVIOUR OR MOTIVE, never about how
   restrictive the rules are — that is already in the box we compare against. */
export const COMPONENTS = {
  /* The airline's own words. Many baggage pages state it outright: bags "will
     be placed in the sizer", "may be gauged at the gate". That is a tier-1
     source on the carrier's own site, it is directly about enforcement, and it
     is free to collect while reading the allowance. Strongest available signal. */
  published_gauging: {
    weight: 3,
    asks: 'Does the carrier state on its own site that bags are gauged or sized at the gate?',
    source: 'carrier baggage page — tier 1',
  },

  /* Gate price divided by online price. Luggage Validator counts fees as a
     factor and I dismissed it as merely the consequence of being caught. That
     was too quick. The LEVEL of a fee is a consequence; the ASYMMETRY between
     gate and online is a motive — a carrier earning 6x at the gate has a
     revenue reason to look, and Ryanair's staff bonus is the explicit form of
     the same incentive. Published, computable, comparable. */
  fee_asymmetry: {
    weight: 3,
    asks: 'Is the gate price for a carry-on several times the online price?',
    source: 'carrier fee table — tier 1',
    threshold: 3, // gate >= 3x online counts as true
  },

  /* Documented pay-per-catch schemes. Rare, real, and decisive where it exists. */
  staff_incentive: {
    weight: 2,
    asks: 'Is there reported evidence staff are rewarded for catching oversize bags?',
    source: 'news reporting — tier 2',
  },

  /* A published cabin weight cap is policy, not enforcement — but weighing is a
     separate physical act, and a carrier that publishes 7kg and owns scales at
     check-in is demonstrably doing something. Marked as the weakest of the four
     because it is the closest to inferring enforcement from policy. */
  weighs_at_checkin: {
    weight: 2,
    asks: 'Are cabin bags weighed at check-in, not merely capped on paper?',
    source: 'carrier page or direct observation — tier 1-3',
  },
};

export const MAX_RAW = Object.values(COMPONENTS).reduce((n, c) => n + c.weight, 0);

/** Observed outcomes from travellers — the only component that is measured
 *  rather than asserted. Weighted by sample size so three angry reports cannot
 *  move a score, and deliberately capable of OVERRIDING the asserted components
 *  once the sample is real: what actually happens beats what we think happens. */
export const REPORT_FLOOR = 25; // below this, reports inform but do not decide

/** Below this share of components researched, we do not publish a score at all.
 *  One known component out of four produced a confident-looking 10 in testing —
 *  arithmetically correct and completely misleading, because a 0.3-confidence
 *  score renders identically to a 1.0-confidence one. "We have not looked into
 *  this carrier yet" is a true and useful answer; a number is not. */
export const MIN_CONFIDENCE = 0.5;

export function scoreFrom(components = {}, reports = null, type = null, region = null) {
  const prior = priorFor(type, region);

  let raw = 0,
    known = 0;
  const missing = [];
  for (const [key, spec] of Object.entries(COMPONENTS)) {
    const c = components[key];
    if (c == null || c.v == null) {
      missing.push(key);
      continue;
    }
    known += spec.weight;
    if (c.v === true) raw += spec.weight;
  }
  const confidence = known / MAX_RAW;

  /* Unknown components are not zeros. A carrier we have not researched is not a
     lax carrier — scoring it as one would quietly recommend bags into a gate
     check. Score against what we know, then blend toward it from the prior in
     proportion to how much we know. */
  const asserted = known ? 1 + 9 * (raw / known) : null;

  let score = prior.score;
  let source = 'prior';
  if (asserted != null) {
    score = prior.score * (1 - confidence) + asserted * confidence;
    source = confidence >= 1 ? 'components' : 'prior+components';
  }

  /* Measurement beats both. Below the floor reports inform but do not decide,
     so a handful of bad experiences cannot rewrite a carrier. */
  if (reports && reports.n >= REPORT_FLOOR) {
    const observed = 1 + 9 * reports.stop_rate;
    const trust = Math.min(1, reports.n / (REPORT_FLOOR * 4));
    score = score * (1 - trust) + observed * trust;
    source = trust >= 1 ? 'observed' : 'blended';
  }

  return {
    score: Math.round(Math.min(10, Math.max(1, score))),
    prior: prior.score,
    prior_why: prior.why,
    asserted: asserted == null ? null : Math.round(asserted),
    raw,
    known,
    of: MAX_RAW,
    confidence: +confidence.toFixed(2),
    missing,
    source,
    /* True until someone has actually read the carrier's published content.
       The UI must say so — a prior presented as a finding is the failure mode
       this whole file exists to avoid. */
    provisional: source === 'prior' || confidence < MIN_CONFIDENCE,
    reports: reports ? { n: reports.n, stop_rate: reports.stop_rate } : null,
  };
}

/** How long an override stands before someone must look at it again.
 *  An override is a patch over a model that disagreed with reality. Reality
 *  moves — American pulled its gate sizers in October 2025 — and a patch nobody
 *  revisits becomes the stale magic number this system exists to replace. */
export const OVERRIDE_REVIEW_DAYS = 180;

export function overrideStatus(override, now = new Date()) {
  if (!override) return null;
  if (!override.at) return { state: 'undated', stale: true };
  const days = Math.floor((now - new Date(override.at)) / 86400000);
  const limit = override.review_days ?? OVERRIDE_REVIEW_DAYS;
  return { state: days > limit ? 'stale' : 'current', days, limit, stale: days > limit };
}

/** The whole record.

    An `override` is deliberately supported: the model will be wrong about some
    carrier, travellers will say so, and the person who reads those reports must
    be able to act without waiting for a schema change. But an override is an
    assertion against the evidence, so it carries the same burden as any other
    claim here — a reason, a date, and a name. validate-carriers.mjs fails the
    build without them, and flags one that has gone unreviewed.

    Because carrier records are version-controlled JSON, an override is a commit:
    diffable, attributable and revertable, with the audit trail for free. An
    admin UI writing to a database would have to rebuild all of that. */
export function resolve(strictness = {}, now = new Date(), type = null, region = null) {
  const derived = scoreFrom(strictness.components, strictness.reports, type, region);
  const o = strictness.override;
  if (o?.score != null) {
    return {
      ...derived,
      score: o.score,
      source: 'override',
      /* The derived score is kept, not discarded. Seeing "we compute 5, a human
         pinned 8, here is why" is the whole value of allowing the override. */
      derived_score: derived.score,
      disagrees_by: derived.score == null ? null : o.score - derived.score,
      override: {
        reason: o.reason ?? null,
        by: o.by ?? null,
        at: o.at ?? null,
        status: overrideStatus(o, now),
      },
    };
  }
  /* A hand-assigned legacy score outranks a bare prior — someone looked at this
     carrier once, which is more than the business model tells us — but loses to
     real components. Labelled either way so it surfaces in an audit instead of
     passing for derived. */
  if (typeof strictness.score === 'number' && derived.source === 'prior') {
    return { ...derived, score: strictness.score, source: 'legacy_manual', provisional: true };
  }
  return derived;
}
