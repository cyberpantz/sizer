/* THE PANEL AT THE FOOT OF /check, TESTED BY RUNNING IT.
 *
 * Frank, on the grid of bags: "it seems like it wasn't really thought out, you
 * can't click on them, it's not clear if they are filtered by bags that would
 * actually fit."
 *
 * The presentation complaints were all correct. Underneath them were three
 * bugs, and not one of them is visible in the source — each needed a real
 * itinerary run through it:
 *
 *   Ryanair Basic + Aegean  listed 43 bags for a trip whose first leg permits
 *                           no cabin bag at any size
 *   Aegean + British Airways hid 10 bags the engine says clear both legs
 *   any trip                 recommended bags resting on a review's figure,
 *                            against docs/19's release gate
 *
 * So these tests run the module over the actual catalogue and actual carrier
 * records. Fixtures would have let me invent an airline whose limits made my
 * code look right, which is precisely how the old panel passed review.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createEngine } from '../../engine/fit.mjs';
import { isPromotable, toBag, toCarrier } from '../../engine/normalize.mjs';
import { loadBags, loadCarriers } from '../../lib/data.mjs';
import { SHOWN, tripEnvelope } from '../trip-envelope.mjs';

const engine = createEngine();
const bagRecords = await loadBags();
const carriers = await loadCarriers();

/* The catalogue in the shape the BROWSER gets it, because that is what the
   panel is handed on the page. */
const bags = bagRecords.map((b) => ({
  slug: b.slug,
  brand: b.brand,
  model: b.model,
  external_cm: b.external_cm,
  soft: b.soft,
  weight_kg: b.weight_kg,
  shell: b.shell,
  dim_source: b.dim_source,
  measured: b.measured,
}));
const toEngineBag = (b) => toBag({ ...b, external_cm: { v: b.external_cm } });

const at = (iata) => {
  const c = carriers.find((x) => x.iata === iata);
  assert.ok(c, `${iata} is not in the catalogue`);
  return c;
};

/** One itinerary, evaluated exactly as the page evaluates it. */
const trip = (legs, { role = 'cabin', ownSlugs = [] } = {}) => {
  const probe = toEngineBag(bags[0]);
  const rows = legs.map(([iata, fare], i) => {
    const carrier = toCarrier(at(iata).record, fare);
    return { i, leg: { iata, fare }, carrier, result: engine.evaluate(probe, carrier, { role }) };
  });
  return tripEnvelope({ rows, role, bags, toEngineBag, engine, ownSlugs });
};

describe('a fare that grants no bag ends the conversation', () => {
  /* THE WORST OF THE THREE. envelope() intersects carriers that HAVE an
     allowance, and a no-cabin-bag fare has none — so the barred leg silently
     left the intersection and the panel answered a question about the other
     airlines. It then printed "the biggest bag that works on this whole trip"
     three inches below a verdict reading "includes no cabin bag at all on this
     fare, whatever its size". */
  const panel = trip([
    ['FR', 'basic'],
    ['A3', 'economy'],
  ]);

  test('the barred leg is reported, not dropped', () => {
    assert.equal(panel.barred.length, 1);
    assert.equal(panel.barred[0].carrier.name, 'Ryanair');
  });

  test('nothing is recommended', () => {
    /* Every bag in the catalogue would be refused at that gate. Suggesting any
       of them is worse than suggesting none: it reads as a way through. */
    assert.deepEqual(panel.fits, []);
    assert.equal(panel.heldBack, 0, 'nothing may be described as merely held back either');
  });

  test('the old behaviour really was this bad', () => {
    /* The bug, reproduced, so the number in the commit message is checkable and
       so nobody restores the old filter thinking it was roughly equivalent. */
    const legs = [toCarrier(at('FR').record, 'basic'), toCarrier(at('A3').record, 'economy')];
    const env = engine.envelope(legs);
    assert.ok(env, 'envelope() still silently ignores the barred leg');
    const oldList = bags.filter((b) =>
      [...b.external_cm].sort((x, y) => y - x).every((v, i) => v <= env[i])
    );
    assert.ok(
      oldList.length > 20,
      `expected the old rule to recommend many bags here, got ${oldList.length}`
    );
  });
});

describe('the list is the engine’s answer, not a second one', () => {
  const legs = [
    ['A3', 'economy'],
    ['BA', 'economy'],
  ];
  const panel = trip(legs);

  test('every listed bag actually clears every leg', () => {
    const carriers2 = legs.map(([iata, fare]) => toCarrier(at(iata).record, fare));
    for (const b of panel.fits) {
      for (const c of carriers2) {
        const band = engine.evaluate(toEngineBag(b), c).band;
        assert.ok(
          band === 'clears' || band === 'line',
          `${b.slug} is listed but the engine says "${band}" on ${c.name}`
        );
      }
    }
  });

  test('no bag the engine clears is silently missing', () => {
    /* The old rule compared published dimensions with no EPS_CM and no soft-bag
       compression, so it dropped ten bags — every soft duffel among them,
       because compression is exactly what makes a duffel worth buying. A bag
       may now be absent only for a reason we STATE: it is the reader's own, or
       it is held back by the release gate. */
    const carriers2 = legs.map(([iata, fare]) => toCarrier(at(iata).record, fare));
    const clears = bags.filter((b) =>
      carriers2.every((c) => ['clears', 'line'].includes(engine.evaluate(toEngineBag(b), c).band))
    );
    const listed = new Set(panel.fits.map((b) => b.slug));
    const missing = clears.filter((b) => !listed.has(b.slug) && isPromotable(toEngineBag(b)));
    assert.deepEqual(
      missing.map((b) => b.slug),
      [],
      'these clear every leg and are promotable, yet are not offered'
    );
  });

  test('the old rule really did hide them', () => {
    const env = engine.envelope(legs.map(([iata, fare]) => toCarrier(at(iata).record, fare)));
    const oldList = new Set(
      bags
        .filter((b) => [...b.external_cm].sort((x, y) => y - x).every((v, i) => v <= env[i]))
        .map((b) => b.slug)
    );
    const carriers2 = legs.map(([iata, fare]) => toCarrier(at(iata).record, fare));
    const clears = bags.filter((b) =>
      carriers2.every((c) => ['clears', 'line'].includes(engine.evaluate(toEngineBag(b), c).band))
    );
    const hidden = clears.filter((b) => !oldList.has(b.slug));
    assert.ok(hidden.length >= 5, `expected the old rule to hide several bags, hid ${hidden.length}`);
  });
});

describe('a list that recommends honours the release gate', () => {
  const panel = trip([['A3', 'economy']]);

  test('every bag offered carries the manufacturer’s own overall figure', () => {
    /* docs/19. A list answering "what should I buy instead" is a
       recommendation whatever it is titled, and this was the one surface
       putting review-sourced figures forward as answers. */
    for (const b of panel.fits) {
      assert.ok(isPromotable(toEngineBag(b)), `${b.slug} is not promotable but is recommended`);
    }
  });

  test('the ones held back are counted, not silently dropped', () => {
    /* Hiding them makes the catalogue look thinner than it is for no stated
       reason. The panel says "N more would fit, held back because their figures
       are not the manufacturer's own", which is a fact about our standards. */
    assert.ok(panel.heldBack > 0, 'expected some bags to be held back on this catalogue');
  });
});

describe('the reader’s own bags are not offered back to them', () => {
  test('every chosen slug is excluded, not just the first', () => {
    /* This took a plural. The page answered for one bag and excluded one bag;
       both were the same off-by-a-set mistake, and fixing the visible half
       would have left the panel suggesting the reader's second bag back to
       them as a discovery. */
    const own = bags.filter((b) => isPromotable(toEngineBag(b))).slice(0, 2);
    assert.equal(own.length, 2, 'expected at least two promotable bags to test with');
    const panel = trip([['A3', 'economy']], { ownSlugs: own.map((b) => b.slug) });
    for (const b of own) {
      assert.ok(
        !panel.fits.some((x) => x.slug === b.slug),
        `the panel suggests ${b.slug}, which the reader already told us they have`
      );
    }
  });
});

describe('ordering and size match what the panel promises', () => {
  const panel = trip([['A3', 'economy']]);

  test('roomiest first, because the heading says "the biggest bag that works"', () => {
    const vol = (b) => b.external_cm.reduce((n, v) => n * v, 1);
    for (let i = 1; i < panel.fits.length; i++) {
      assert.ok(
        vol(panel.fits[i - 1]) >= vol(panel.fits[i]),
        'the list is not ordered biggest first'
      );
    }
  });

  test('there is more than a screenful, so the cap earns its keep', () => {
    assert.ok(
      panel.fits.length > SHOWN,
      'if the catalogue no longer overflows the cap, revisit whether it is needed'
    );
  });
});

describe('the under-seat role gets the under-seat answer', () => {
  test("Singapore's ten-centimetre slot admits nothing we hold", () => {
    /* Not a bug — a finding, and the panel has to say it rather than fall back
       to the cabin envelope, which is what would have made the numbers look
       reasonable and the answer wrong. */
    const panel = trip([['SQ', 'economy']], { role: 'personal' });
    assert.ok(panel.env, 'Singapore publishes an under-seat box; it should be drawn');
    assert.equal(panel.env[2], 10);
    assert.deepEqual(panel.fits, []);
  });

  test('the envelope differs from the cabin one', () => {
    const cabin = trip([['SQ', 'economy']]);
    const personal = trip([['SQ', 'economy']], { role: 'personal' });
    assert.notDeepEqual(cabin.env, personal.env);
  });
});

describe('an airline nobody has researched cannot set the box', () => {
  test('unanswerable legs stay out of the intersection', () => {
    /* An envelope built on a guess is worse than no envelope. Unchanged
       behaviour, asserted because the rewrite moved the code that does it. */
    const unknown = carriers.find((c) => toCarrier(c.record, 'economy').cabin_unknown);
    if (!unknown) return;
    const withIt = trip([
      ['A3', 'economy'],
      [unknown.iata, 'economy'],
    ]);
    const without = trip([['A3', 'economy']]);
    assert.deepEqual(withIt.env, without.env);
  });
});
