/* A BAG HAS A ROLE ON A TRIP, NOT A PROPERTY IN A DATABASE.
 *
 * Every competitor asks: enter one bag, get pass/fail against the carry-on
 * limit and pass/fail against the personal-item limit, two percentages side by
 * side. That is backwards. Nobody is undecided about which bag is which — you
 * own a roller and a rucksack and you already know the roller is going
 * overhead. The question is not "could this be a personal item", it is "does my
 * kit work on this trip".
 *
 * So `role` is an argument to evaluate(), not a field on the record. These
 * tests run against the REAL catalogue rather than fixtures, because the whole
 * reason this work exists is that the old answer was measured against a
 * hard-coded [40, 30, 20] that no airline necessarily publishes — and a fixture
 * would let me invent that number all over again.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadBags, loadCarriers } from '../../lib/data.mjs';
import { desc, evaluate, bindingLeg, fitsPersonalItem } from '../fit.mjs';
import { CABIN_ABSENCE, toCarrier } from '../normalize.mjs';

const carriers = await loadCarriers();
const bags = await loadBags();
const at = (iata) => carriers.find((c) => c.iata === iata);
const resolve = (iata, fare) => {
  const c = at(iata);
  assert.ok(c, `${iata} is not in the catalogue`);
  return toCarrier(c.record, fare ?? 'economy');
};

describe('the default is unchanged', () => {
  test('omitting the role answers the cabin question, exactly as before', () => {
    /* The golden snapshot proves this across 3,861 verdicts. This says it once
       in a form a reader of this file can check. */
    const bag = bags[0];
    for (const c of carriers.slice(0, 12)) {
      const carrier = toCarrier(c.record, 'economy');
      assert.deepEqual(evaluate(bag, carrier), evaluate(bag, carrier, { role: 'cabin' }));
    }
  });
});

describe("Singapore's personal item is ten centimetres deep", () => {
  /* The case that motivated all of this. A normal laptop bag fails it, and
     until now the site could not say so — it compared against [40, 30, 20] and
     reported a pass. Wrong in the direction that costs someone their bag. */
  const sq = resolve('SQ');

  test('the under-seat box is genuinely that shallow', () => {
    const box = desc(sq.allowances.personal.max_cm);
    assert.equal(box[2], 10, `Singapore's shortest personal axis is ${box[2]}, not 10`);
  });

  test('a carry-on judged as a personal item is refused', () => {
    const roller = bags.find((b) => desc(b.external_cm)[2] > 15);
    assert.ok(roller, 'no bag in the catalogue is over 15 cm deep');
    const r = evaluate(roller, sq, { role: 'personal' });
    assert.equal(r.band, 'wont', `${roller.slug} should not fit under a Singapore seat`);
    assert.ok(r.delta_cm > 0);
  });

  test('the same bag in the cabin role gets the cabin answer', () => {
    /* Different question, different limit, and it must not be the same object
       with a relabelled band. */
    const roller = bags.find((b) => desc(b.external_cm)[2] > 15);
    const cabin = evaluate(roller, sq);
    const personal = evaluate(roller, sq, { role: 'personal' });
    assert.notEqual(cabin.delta_cm, personal.delta_cm);
    assert.equal(personal.role, 'personal');
  });
});

describe('an airline that publishes no under-seat size', () => {
  /* Delta, Southwest, Qatar, Aegean, Air Serbia and three Chinese majors were
     READ, and found to publish nothing. That is a finding, and a better answer
     than any number: the real limit is the space beneath one seat on one
     aircraft, which no website can honestly quantify. */
  const unpublished = carriers.filter(
    (c) => toCarrier(c.record, 'economy').personal_absence === CABIN_ABSENCE.NOT_PUBLISHED
  );

  test('there are still carriers in this state', () => {
    assert.ok(unpublished.length > 0, 'the finding has been lost from the data');
  });

  test('it refuses to answer rather than guessing', () => {
    for (const c of unpublished) {
      const r = evaluate(bags[0], toCarrier(c.record, 'economy'), { role: 'personal' });
      assert.equal(r.band, null, `${c.iata} produced a band from no published size`);
      assert.equal(r.unknown, true);
    }
  });

  test('and it says NOBODY can answer, not that we did not look', () => {
    /* The distinction the whole taxonomy exists for. Collapsing `unpublished`
       into `unknown` would throw away the more useful of the two facts and make
       our best-researched carriers look like our worst. */
    for (const c of unpublished) {
      const r = evaluate(bags[0], toCarrier(c.record, 'economy'), { role: 'personal' });
      assert.equal(r.unpublished, true, `${c.iata}: a finding is reported as a gap`);
      assert.equal(r.reason, CABIN_ABSENCE.NOT_PUBLISHED);
    }
  });

  test('an unresearched carrier is NOT marked unpublished', () => {
    const gaps = carriers.filter(
      (c) => toCarrier(c.record, 'economy').personal_absence === CABIN_ABSENCE.NOT_RESEARCHED
    );
    for (const c of gaps) {
      const r = evaluate(bags[0], toCarrier(c.record, 'economy'), { role: 'personal' });
      assert.equal(r.unknown, true);
      assert.notEqual(r.unpublished, true, `${c.iata}: our gap is being sold as their silence`);
    }
  });
});

describe('the fare trap, from the personal item side', () => {
  test('a fare with no cabin bag still answers for the personal item', () => {
    /* THE POINT OF THE WHOLE FEATURE. On Ryanair Basic every suitcase ever made
       fails equally, and saying "Over" five times is useless. What the reader
       needs is the OTHER answer: the rucksack fits the thing you are actually
       allowed to bring. Under the old model there was no way to ask. */
    const noCabin = carriers
      .flatMap((c) => {
        const fares = [...new Set((c.record.allowances ?? []).map((a) => a.fare_class))];
        return fares.map((f) => ({ c, f, carrier: toCarrier(c.record, f) }));
      })
      .filter((x) => x.carrier.no_cabin_bag && x.carrier.allowances.personal);
    assert.ok(noCabin.length > 0, 'no carrier sells a fare with a personal item and no cabin bag');

    for (const { c, f, carrier } of noCabin) {
      const cabin = evaluate(bags[0], carrier);
      assert.equal(cabin.no_cabin_bag, true, `${c.iata} ${f}`);
      const personal = evaluate(bags[0], carrier, { role: 'personal' });
      assert.notEqual(
        personal.band,
        null,
        `${c.iata} ${f}: the personal item is published and still unanswered`
      );
      assert.notEqual(personal.no_cabin_bag, true, 'the cabin finding leaked into the other role');
    }
  });
});

describe('bindingLeg answers per role', () => {
  test('two bags on one trip can be stopped by different airlines', () => {
    /* "Which leg decides" is not a property of the itinerary — it depends on
       which bag you are asking about. Naming one leg for both would be wrong
       about one of them, which is exactly the mistake a per-trip answer makes
       when roles are bolted on afterwards. */
    const legs = ['SQ', 'FR', 'BA'].map((i) => resolve(i, i === 'FR' ? 'basic' : 'economy'));
    const roller = bags.find((b) => desc(b.external_cm)[2] > 15);
    const cabinLeg = bindingLeg(roller, legs);
    const personalLeg = bindingLeg(roller, legs, { role: 'personal' });
    assert.ok(cabinLeg && personalLeg);
    assert.equal(personalLeg.result.role, 'personal');
  });
});

describe('the catalogue claim and the trip answer stay separate', () => {
  test('fitsPersonalItem ignores soft-bag compression, evaluate does not', () => {
    /* A durable claim on a product page must not depend on a traveller sitting
       on their bag. `fits_personal_item` is the strict box check; the banded
       answer is for /check, where the reader has named the airline and fare. */
    const soft = bags.find(
      (b) => b.soft && at('SQ') && fitsPersonalItem(b, resolve('SQ')) !== null
    );
    if (!soft) return; // no soft bag reaches Singapore's published box either way
    const strict = fitsPersonalItem(soft, resolve('SQ'));
    const banded = evaluate(soft, resolve('SQ'), { role: 'personal' });
    if (strict === false) {
      assert.notEqual(banded.band, null, 'the banded answer should still exist');
    }
  });

  test('no published size means null, never false', () => {
    /* An airline saying only "it must fit under the seat in front of you" has
       not told us the bag is too big, and we must not say it did. */
    for (const c of carriers) {
      const carrier = toCarrier(c.record, 'economy');
      if (carrier.allowances.personal) continue;
      assert.equal(
        fitsPersonalItem(bags[0], carrier),
        null,
        `${c.iata}: an absence became a refusal`
      );
    }
  });
});
