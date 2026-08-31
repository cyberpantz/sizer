/* Advisories: everything true about a fit that the four bands deliberately
   don't encode.

   The architectural rule, from docs/05-schema.md and worth restating because it
   is the one that keeps getting tested: an advisory NEVER changes the band.
   Dimensions decide whether the bag goes through the frame. Weight is a
   different gate, enforced by a different person. Squish is a property of the
   bag. Aircraft is a property of the route. Collapsing any of them into the
   verdict misreports both halves — and folding squish into the tolerance once
   moved a bag nine carriers, silently, which is wiggle room replacing a
   published limit.

   They are a REGISTRY so the specced-but-unbuilt ones (gate-check tagging,
   TSA scanner aperture, seasonal bin pressure) drop in without touching
   evaluate(). Each returns structured data with cm/kg figures — never a
   sentence. Copy is the caller's job, so the same advisory can render as a
   headline, a table cell, or a tooltip. */

/** @typedef {{ id: string, level: string, [k: string]: unknown }} Advisory */

export function squish({ bag, deltaCm, config }) {
  if (deltaCm <= 0) return null;
  const give = config.SQUISH_CM[bag.shell] ?? 0;
  if (give >= 1 && deltaCm <= give) {
    return {
      id: 'squish',
      level: 'may_squeeze',
      over_cm: deltaCm,
      give_cm: give,
      shell: bag.shell,
    };
  }
  /* Rigid and over. "It'll probably squeeze in" is sound for a duffel and
     completely wrong for a polycarbonate shell, which either goes in or doesn't.
     Saying so is more useful than staying quiet. */
  if (give < 1) {
    return { id: 'squish', level: 'rigid', over_cm: deltaCm, give_cm: give, shell: bag.shell };
  }
  return null;
}

export function weight({ bag, carrier, config }) {
  const cap = carrier.allowance?.max_kg,
    kg = bag.weight_kg;
  if (!cap || !kg) return null;
  /* `shared` means the cap covers the carry-on AND the personal item together
     — see buildAllowance. The arithmetic is unchanged; what changes is what we
     are allowed to claim the remainder is FOR. Saying "that leaves 5.4 kg to
     pack" when 5.4 kg has to cover the laptop bag too is the kind of
     over-generous answer that costs a fee. */
  const shared = carrier.allowance?.weight_shared === true;
  const left = +(cap - kg).toFixed(2);
  if (left <= 0)
    return { id: 'weight', level: 'over', bag_kg: kg, cap_kg: cap, left_kg: left, shared };
  if (kg / cap >= config.WEIGHT_TIGHT_RATIO) {
    return {
      id: 'weight',
      level: 'tight',
      bag_kg: kg,
      cap_kg: cap,
      left_kg: left,
      shared,
      share: +(kg / cap).toFixed(2),
    };
  }
  return null;
}

/** An expansion zip is a trap: the bag is compliant until someone uses it.
 *  Rick Steves states this on their own product page; Away's Flex needed a
 *  reviewer to say it for them. */
export function expansion({ bag, deltaCm }) {
  if (!bag.expands_cm) return null;
  const expanded = +(deltaCm + bag.expands_cm).toFixed(2);
  if (deltaCm <= 0 && expanded > 0) {
    return {
      id: 'expansion',
      level: 'compliant_until_expanded',
      expands_cm: bag.expands_cm,
      over_when_expanded_cm: expanded,
    };
  }
  return null;
}

/** A bag can be fully compliant and still be taken at the jetbridge, because a
 *  CRJ-200 bin physically won't hold it. Not a policy failure and never scored
 *  as one — an operational fact the traveller needs. */
export function regionalJet({ carrier }) {
  if (!carrier.regional_jets) return null;
  return { id: 'regional_jet', level: 'likely_gate_check' };
}

/** Per-catch commission — the case the bands cannot represent.

    The engine models two outcomes: a bag fits, or it is over and may be caught.
    Frontier and Spirit pay gate agents per oversize bag charged ($10 and $5
    respectively on domestic flights), and a 2024 congressional report found the
    two paid roughly $26M in such commissions over 2022-23, noting the incentives
    "may inappropriately encourage abuse of discretion".

    That describes a third outcome: a compliant bag charged anyway. Strictness
    cannot express it, because strictness only scales the GAMBLE ceiling and a
    bag that clears never reaches it. So this fires even on CLEARS — the only
    advisory that does.

    Per 16-editorial-policy this states the fee and cites the source. It does not
    characterise anyone's conduct; the congressional report's words are quoted as
    theirs, and the traveller draws their own conclusion. */
export function agentCommission({ carrier }) {
  const c = carrier.agent_commission;
  if (!c?.amount_usd) return null;
  return {
    id: 'agent_commission',
    level: 'incentivised_enforcement',
    amount_usd: c.amount_usd,
    where: c.where ?? 'gate',
    url: c.url ?? null,
    /* True even when the verdict is CLEARS — that is the entire point. */
    applies_when_compliant: true,
  };
}

/** A fare with no cabin allowance at all. The loudest thing we can say. */
export function noCabinBag({ carrier }) {
  if (!carrier.no_cabin_bag) return null;
  return { id: 'no_cabin_bag', level: 'not_permitted', fare_class: carrier.fare_class };
}

/** Order is render order: most consequential first. */
export const DEFAULT_ADVISORIES = [
  noCabinBag,
  agentCommission,
  regionalJet,
  squish,
  weight,
  expansion,
];
