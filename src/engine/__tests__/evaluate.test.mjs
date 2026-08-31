/* End-to-end: real bags, real carriers, whole-verdict behaviour. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ALL_CARRIERS, BAGS, bag, CARRIERS, carrier } from '../__fixtures__/catalogue.mjs';
import { bindingLeg, coverage, delta, envelope, evaluate, fitsPersonalItem } from '../fit.mjs';

const adv = (r, id) => r.advisories.find((a) => a.id === id);

describe('the rounding bug, end to end', () => {
  test('the Maxlite International is not failed by a unit conversion', () => {
    for (const c of [CARRIERS.iberia, CARRIERS.lufthansa, CARRIERS.turkish]) {
      const r = evaluate(BAGS.maxliteIntl, c);
      assert.notEqual(r.band, 'wont', `${c.name} refused it by ${r.delta_cm}cm`);
    }
  });

  test('and the overage is still reported honestly, not zeroed out', () => {
    const r = evaluate(BAGS.maxliteIntl, CARRIERS.lufthansa);
    assert.ok(r.delta_cm > 0, 'the bag IS marginally over and we must say so');
    assert.equal(r.band, 'line', 'over-but-inside-EPS is at-the-line, never a clean pass');
  });
});

describe('bands over real bags', () => {
  test('a 23-inch bag sold as a carry-on clears almost nothing', () => {
    const cov = coverage(BAGS.maxlite21, ALL_CARRIERS);
    assert.ok(cov.ratio < 0.3, `expected a poor score, got ${cov.pass}/${cov.of}`);
  });

  test('the only bag clearing everything is the wheelless duffel', () => {
    const cov = coverage(BAGS.patagonia, ALL_CARRIERS);
    assert.equal(cov.pass, cov.of);
  });

  test('a bag on the US standard is not an international bag', () => {
    const cov = coverage(BAGS.uplift, ALL_CARRIERS);
    assert.ok(
      cov.ratio < 0.6,
      `US-standard bag scored ${cov.pass}/${cov.of} — too good to be true`
    );
  });
});

describe('advisories never move the band', () => {
  test('a soft bag that may squeeze is still reported as over', () => {
    const tight = carrier('Test', 9, [50, 40, 20]);
    const soft = bag('soft', [51, 40, 22], { soft: true, shell: 'softside' });
    const r = evaluate(soft, tight);
    assert.equal(r.band, 'wont', 'squish must not rescue the verdict');
    assert.ok(adv(r, 'squish'), 'but it should still be flagged as compressible');
  });

  test('a rigid bag over the limit is told it will not compress', () => {
    const r = evaluate(BAGS.awayAluminum, CARRIERS.ryanair);
    const s = adv(r, 'squish');
    assert.equal(s?.level, 'rigid');
    assert.equal(s.give_cm, 0, 'aluminium does not deform, it dents');
  });

  test('weight headroom fires on an empty bag eating the allowance', () => {
    const w = adv(evaluate(BAGS.awayAluminum, CARRIERS.emirates), 'weight');
    assert.equal(w?.level, 'tight');
    assert.ok(w.share >= 0.6, `4.76kg of a 7kg cap is ${w.share}`);
    assert.ok(w.left_kg < 2.5, 'and it should say what little is left');
  });

  test('the same bag is silent on a generous allowance', () => {
    const generous = carrier('AirFrance', 7, [55, 35, 25], 12);
    assert.equal(adv(evaluate(BAGS.awayAluminum, generous), 'weight'), undefined);
  });

  test('an expansion zip is flagged as compliant-until-used', () => {
    const b = bag('flex', [54, 39, 22], { expands_cm: 5 });
    const e = adv(evaluate(b, CARRIERS.lufthansa), 'expansion');
    assert.equal(e?.level, 'compliant_until_expanded');
    assert.ok(e.over_when_expanded_cm > 0);
  });

  test('a fare with no cabin allowance refuses at any size', () => {
    const basic = { ...carrier('Ryanair', 9, [40, 30, 20]), no_cabin_bag: true, allowance: null };
    const r = evaluate(bag('tiny', [20, 15, 10]), basic);
    assert.equal(r.band, 'wont');
    assert.ok(adv(r, 'no_cabin_bag'), 'and it must say why — the size is not the reason');
  });
});

describe('dimensions', () => {
  test('a rotated bag gets the same verdict', () => {
    const c = CARRIERS.lufthansa;
    const a = evaluate(bag('a', [55, 40, 23]), c);
    const b = evaluate(bag('b', [23, 55, 40]), c);
    assert.equal(a.band, b.band);
    assert.equal(a.delta_cm, b.delta_cm);
  });

  test('the binding dimension is named, not guessed', () => {
    const d = delta(bag('x', [60, 30, 20]), [55, 40, 25]);
    assert.equal(d.dimension, 'long');
    assert.equal(d.cm, 5);
  });

  test('a soft bag compresses on its smallest dimension only', () => {
    const stiff = bag('h', [55, 40, 25]);
    const squishy = bag('s', [55, 40, 25], { soft: true });
    const c = CARRIERS.lufthansa;
    assert.ok(evaluate(squishy, c).delta_cm < evaluate(stiff, c).delta_cm);
  });
});

describe('multi-leg', () => {
  const legs = [CARRIERS.american, CARRIERS.lufthansa, CARRIERS.ryanair];

  test('the envelope is the strictest box across the itinerary', () => {
    assert.deepEqual(envelope(legs), [55, 36, 20]);
  });

  test('it is rotation-independent', () => {
    const shuffled = [...legs].reverse();
    assert.deepEqual(envelope(legs), envelope(shuffled));
  });

  test('the binding leg is the one that decides the trip', () => {
    const { carrier: c } = bindingLeg(BAGS.rsSpinner, legs);
    assert.ok(['Ryanair', 'Lufthansa'].includes(c.name), `got ${c.name}`);
  });

  test('a leg with no cabin bag binds regardless of dimensions', () => {
    const noBag = { ...CARRIERS.ryanair, no_cabin_bag: true, allowance: null };
    const { carrier: c } = bindingLeg(BAGS.patagonia, [CARRIERS.southwest, noBag]);
    assert.equal(c.name, 'Ryanair');
  });

  test('an empty itinerary has no envelope rather than a wrong one', () => {
    assert.equal(envelope([]), null);
  });
});

describe('personal item', () => {
  test('a carry-on named "underseater" may not fit a personal-item envelope', () => {
    const kc = bag('kenneth-cole-underseater', [43.2, 33, 22.9]);
    assert.equal(fitsPersonalItem(kc), false);
  });
});

describe('per-catch commission — the case the bands cannot represent', () => {
  const commissioned = {
    ...carrier('Frontier', 9, [61, 46, 25]),
    agent_commission: { amount_usd: 10, where: 'gate' },
  };
  const plain = carrier('Delta', 5, [56, 35, 23]);
  const small = bag('small', [45, 33, 20], { weight_kg: 2.5 });

  test('fires even when the bag clears — which is the whole point', () => {
    const r = evaluate(small, commissioned);
    assert.equal(r.band, 'clears');
    const a = adv(r, 'agent_commission');
    assert.ok(a, 'a compliant bag on a commissioned carrier still carries risk');
    assert.equal(a.applies_when_compliant, true);
  });

  test('it does not touch the verdict', () => {
    const withComm = evaluate(small, commissioned);
    const without = evaluate(small, { ...commissioned, agent_commission: null });
    assert.equal(withComm.band, without.band, 'an advisory must never move a band');
    assert.equal(withComm.delta_cm, without.delta_cm);
  });

  test('carriers with no commission stay silent', () => {
    assert.equal(adv(evaluate(small, plain), 'agent_commission'), undefined);
  });

  test('it reports the figure rather than a characterisation', () => {
    const a = adv(evaluate(small, commissioned), 'agent_commission');
    assert.equal(typeof a.amount_usd, 'number');
    assert.equal(a.level, 'incentivised_enforcement');
    for (const v of Object.values(a)) {
      if (typeof v === 'string') {
        assert.ok(
          !/unfair|scam|abuse|cheat|dishonest/i.test(v),
          "the engine returns figures; characterisation is the source's, quoted in copy"
        );
      }
    }
  });
});

describe('carriers that no longer fly', () => {
  /* Spirit ceased operations 2 May 2026 while our dataset described its baggage
     policy as current. Over a 5-7 year horizon this is routine, not exceptional,
     and it is a step change rather than staleness — a 180-day freshness warning
     would have flagged it five months after the last flight. */
  const dead = {
    ...carrier('Spirit', 9, [46, 36, 20]),
    flying: false,
    status: 'ceased',
    ceased_at: '2026-05-02',
  };
  const live = CARRIERS.delta;
  const small = bag('small', [40, 30, 18]);

  test('produce no verdict at all, rather than a wrong one', () => {
    const r = evaluate(small, dead);
    assert.equal(r.band, null, 'clears and wont are both wrong; the question no longer applies');
    assert.equal(r.not_flying, true);
  });

  test('the reason and the date are carried, so the page can say something useful', () => {
    const a = adv(evaluate(small, dead), 'not_flying');
    assert.equal(a.level, 'ceased');
    assert.equal(a.ceased_at, '2026-05-02');
  });

  test('a bag that would have fitted still gets no verdict', () => {
    assert.equal(
      evaluate(small, dead).band,
      null,
      "a defunct airline's published limits are trivia, not an answer"
    );
  });

  test('they leave the coverage denominator rather than counting as failures', () => {
    const withDead = coverage(BAGS.patagonia, [live, dead]);
    const withoutDead = coverage(BAGS.patagonia, [live]);
    assert.equal(withDead.of, withoutDead.of, '"19 of 24" must not become "19 of 25"');
    assert.equal(withDead.excluded, 1);
    assert.equal(withDead.ratio, withoutDead.ratio);
  });

  test('they do not shrink a multi-leg envelope', () => {
    const tight = { ...carrier('Tiny', 9, [40, 30, 15]), flying: false };
    assert.deepEqual(
      envelope([live, tight]),
      envelope([live]),
      'a dead carrier must not constrain a living itinerary'
    );
  });

  test('a carrier with no status set is assumed to be flying', () => {
    assert.notEqual(
      evaluate(small, live).band,
      null,
      'absence of a status means nobody thought about it, not that the airline failed'
    );
  });
});
