/* How hard an airline checks, said in words.

   Strictness is the hidden variable behind every verdict on this site. It is
   the entire difference between "Risky" and "Over" — the same bag, the same
   number of centimetres over, and the answer changes because of a number the
   reader never sees. Showing it is overdue.

   THREE RULES:

   1. THE SCORE IS SHOWN, NEVER ON ITS OWN. I first hid the number behind a
      tier word, on the grounds that "7/10" implies a precision we do not have.
      Frank overruled that and he is right: a number is legible, comparable
      across airlines, and it is OUR score — the thing a competitor publishes
      and we were hiding. The precision worry is real but it is answered by
      showing the basis beside it, not by withholding it.

      So a score always travels with its tier word and, where it is a prior,
      with a marker saying so. The tiers remain gambleCeiling()'s own
      boundaries, so what the reader sees and what the engine does cannot
      drift.

   2. SAY WHEN IT IS A GUESS. Every carrier in the dataset today scores on a
      type/region prior, not on researched enforcement: 35 are
      `type_region_prior_only` and 22 `legacy_prior_only`. Presenting a prior
      as a finding is the exact failure this project exists to avoid, so the
      label carries its own basis.

   3. PREFER THE AIRLINE'S OWN EVIDENCE WHERE WE HAVE IT. 23 carriers carry a
      researched claim — "They measure bags at the gate and pay staff a bonus
      for spotting oversize" beats any adjective we could pick. Worth noting
      the gap this exposes: that evidence exists and the SCORE still ignores
      it. The copy can be honest about enforcement before the number is. */

/* The same boundaries as gambleCeiling() in engine/constants.mjs. If those
   move, these must move with them — the test asserts they line up. */
export const TIERS = [
  { max: 3, label: 'Rarely checks', detail: 'Effectively never measured.' },
  { max: 5, label: 'Sometimes checks', detail: 'Occasional, usually when the bins are filling.' },
  { max: 7, label: 'Checks at the gate', detail: 'Frames at the gate; staff use judgement.' },
  { max: 10, label: 'Measures every bag', detail: 'Measured as routine — over is over.' },
];

/** Ordinal tier for a score. Null for an unscored carrier, because "we do not
 *  know how strict they are" is not the same as "they are lenient". */
export function tierFor(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return TIERS.find((t) => score <= t.max) ?? TIERS.at(-1);
}

export const enforcementLabel = (score) => tierFor(score)?.label ?? 'Enforcement unknown';

/** The score itself, out of 10, or null when nobody has scored it.
 *  Callers must render it with enforcementLabel() and, for a prior, the
 *  "(assumed)" marker — the guard in the tests enforces that pairing. */
export const enforcementScore = (score) =>
  typeof score === 'number' && Number.isFinite(score) ? Math.round(score) : null;

export const SCALE_MAX = 10;

/** Filled steps out of SCALE_MAX, for a small meter. */
export const enforcementSteps = (score) => {
  const n = enforcementScore(score);
  return n === null ? 0 : Math.max(0, Math.min(SCALE_MAX, n));
};

/** Is this score researched, or a starting assumption? */
export const isResearched = (strictness) =>
  Boolean(strictness?.score_basis) && !/prior/i.test(strictness.score_basis);

/** The airline's own researched claim, where one exists. */
export function evidenceFor(strictness) {
  const ev = (strictness?.evidence ?? []).find((e) => e.claim);
  return ev ? { claim: ev.claim, url: ev.url ?? null, unverified: ev.unverified !== false } : null;
}

/**
 * One line a reader can act on. Prefers the researched claim; falls back to
 * the tier, and always says which it is.
 */
export function enforcementNote(strictness) {
  const ev = evidenceFor(strictness);
  if (ev) return ev.claim;
  const tier = tierFor(strictness?.score);
  if (!tier) return 'Nobody has looked at how strictly this airline checks.';
  return `${tier.detail} This is our starting assumption for an airline of this type and region, not researched enforcement.`;
}
