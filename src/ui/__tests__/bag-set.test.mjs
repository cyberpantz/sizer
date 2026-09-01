/* WHAT A FARE GRANTS, AGAINST WHAT THE READER IS CARRYING.
 *
 * Frank: "it seems like I'm allowed to create two carry ons, that should not be
 * allowed."
 *
 * Right about the experience, wrong about the remedy — and the data settles
 * both, which is why these tests run against real carrier records rather than
 * fixtures. Five cabin rows grant two pieces; blocking a second carry-on would
 * make the tool unable to model a correct Eurowings BIZclass ticket, and
 * docs/27 calls that out explicitly: "some fares allow two cabin pieces. Answer
 * it rather than blocking it."
 *
 * So the bug was the SILENCE. On the other seventy-odd carriers a second
 * carry-on is a mistake and the page said nothing whatsoever about it.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { toCarrier } from '../../engine/normalize.mjs';
import { loadCarriers } from '../../lib/data.mjs';
import { defaultRoleForNew, pieceOverages } from '../bag-set.mjs';

const carriers = await loadCarriers();
const at = (iata) => {
  const c = carriers.find((x) => x.iata === iata);
  assert.ok(c, `${iata} is not in the catalogue`);
  return c;
};
const row = (iata, fare) => ({
  leg: { iata, fare },
  carrier: toCarrier(at(iata).record, fare),
});

describe('the second bag you add is a personal item', () => {
  test('the first defaults to carry-on', () => {
    assert.equal(defaultRoleForNew([]), 'cabin');
  });

  test('the second defaults to personal, which is what people actually add', () => {
    /* THE FIX FOR THE REPORTED BUG. It defaulted to 'cabin' every time, so a
       reader clicking "add another bag" got a second carry-on without ever
       asking for one — and nothing on the page said that was unusual. */
    assert.equal(defaultRoleForNew([{ role: 'cabin' }]), 'personal');
  });

  test('a third goes back to carry-on rather than piling up personal items', () => {
    /* Once both roles are represented there is no obvious next answer, and
       cabin is the one a reader is more likely to be comparing. */
    assert.equal(defaultRoleForNew([{ role: 'cabin' }, { role: 'personal' }]), 'cabin');
  });

  test('it is a default and nothing more', () => {
    /* No function here forbids a second carry-on. If one ever does, a
       Eurowings business passenger loses the ability to describe their ticket. */
    const two = [{ role: 'cabin' }, { role: 'cabin' }];
    assert.equal(typeof defaultRoleForNew(two), 'string');
  });
});

describe('the piece count, against real fares', () => {
  const twoCarryOns = [
    { slug: 'a', role: 'cabin' },
    { slug: 'b', role: 'cabin' },
  ];

  test('an ordinary economy fare grants one, and says so', () => {
    const over = pieceOverages({ slots: twoCarryOns, rows: [row('BA', 'economy')] });
    assert.equal(over.length, 1);
    assert.equal(over[0].granted, 1);
    assert.equal(over[0].carrying, 2);
    assert.equal(over[0].role, 'cabin');
  });

  test('Eurowings business genuinely grants two, and stays silent', () => {
    /* The case that makes blocking wrong. That row has count 2 AND a separate
       personal row, so the fare really is two cabin bags plus an under-seat
       item — the record is unambiguous, unlike Azerbaijan's and Air Astana's,
       which are flagged for re-reading in the intake brief. */
    const c = toCarrier(at('EW').record, 'business');
    assert.equal(c.allowance.count, 2, 'the Eurowings record no longer grants two pieces');
    assert.ok(c.allowances.personal, 'Eurowings should also have a personal row');
    assert.deepEqual(pieceOverages({ slots: twoCarryOns, rows: [row('EW', 'business')] }), []);
  });

  test('a carry-on plus a personal item never complains', () => {
    /* The overwhelmingly common kit. If this ever fires, the feature is worse
       than useless — it would nag on nearly every trip. */
    const kit = [
      { slug: 'a', role: 'cabin' },
      { slug: 'b', role: 'personal' },
    ];
    for (const c of carriers) {
      const fare = [...new Set((c.record.allowances ?? []).map((a) => a.fare_class))][0] ?? 'economy';
      assert.deepEqual(
        pieceOverages({ slots: kit, rows: [row(c.iata, fare)] }),
        [],
        `${c.name} complains about one carry-on and one personal item`
      );
    }
  });

  test('one bag never complains, whatever the fare', () => {
    for (const c of carriers) {
      const fare = [...new Set((c.record.allowances ?? []).map((a) => a.fare_class))][0] ?? 'economy';
      assert.deepEqual(pieceOverages({ slots: [{ slug: 'a', role: 'cabin' }], rows: [row(c.iata, fare)] }), []);
    }
  });

  test('a fare granting NO cabin bag is not reported here', () => {
    /* Ryanair Basic already says "no cabin bag at any size", loudly, as its own
       finding. Reporting it again as a piece overage would say the same thing
       twice in different words — and the second telling is weaker, because
       "grants 0, you have 2" invites the reader to think one bag would do. */
    assert.deepEqual(pieceOverages({ slots: twoCarryOns, rows: [row('FR', 'basic')] }), []);
  });

  test('an unresearched carrier is not accused of anything', () => {
    /* No allowance means we do not know how many pieces they grant, which is
       not a violation of anything. */
    const unknown = carriers.find((c) => toCarrier(c.record, 'economy').cabin_unknown);
    if (!unknown) return;
    assert.deepEqual(pieceOverages({ slots: twoCarryOns, rows: [row(unknown.iata, 'economy')] }), []);
  });

  test('every leg that is over gets named, not just the first', () => {
    /* The reader has to know WHICH flight to fix, and a trip can be over on
       more than one. */
    const over = pieceOverages({
      slots: twoCarryOns,
      rows: [row('BA', 'economy'), row('A3', 'economy')],
    });
    assert.equal(over.length, 2);
    assert.deepEqual(
      over.map((o) => o.carrier.name).sort(),
      ['Aegean Airlines', 'British Airways']
    );
  });
});

describe('count reaches the allowance at all', () => {
  test('it is surfaced, having sat unread in the data since the intake', () => {
    /* Third field in one day found researched-but-inert, after linear_max_cm
       and absence. Worth an assertion of its own so it cannot go quiet again. */
    assert.equal(toCarrier(at('BA').record, 'economy').allowance.count, 1);
    assert.equal(toCarrier(at('EW').record, 'business').allowance.count, 2);
  });

  test('a row with no count grants one piece, not an unknown number', () => {
    /* 256 of 261 rows say nothing. Treating silence as "unknown" would make
       the check unanswerable almost everywhere — the same failure as reading an
       absent figure as permission. */
    const counts = carriers
      .flatMap((c) => {
        const fares = [...new Set((c.record.allowances ?? []).map((a) => a.fare_class))];
        return fares.map((f) => toCarrier(c.record, f).allowance?.count);
      })
      .filter((n) => n !== undefined);
    assert.ok(counts.length > 0);
    assert.ok(
      counts.every((n) => typeof n === 'number' && n >= 1),
      'an allowance granted zero or a non-number of pieces'
    );
  });
});
