/* The guide is the page most likely to be quoted back at us, so its facts get
   the same treatment as the engine: tested, not eyeballed. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { guideFacts } from '../guide-facts.mjs';

const facts = await guideFacts();

describe('guide facts', () => {
  test('nothing is asserted about an airline we cannot answer for', () => {
    assert.ok(facts.answerable > 0);
    assert.ok(facts.answerable <= facts.carriers);
  });

  test('a fare gap needs BOTH fares sized — a missing row is our gap, not their policy', () => {
    /* This is the failure this module exists to prevent. Seven carriers have a
       basic fare with no cabin row; none of them is a finding that the fare
       forbids a cabin bag. If one ever appears here, something has started
       reading absence as evidence again. */
    for (const g of facts.fareGaps) {
      assert.ok(
        Array.isArray(g.basic) && g.basic.length === 3,
        `${g.name} has no sized basic fare`
      );
      assert.ok(
        Array.isArray(g.economy) && g.economy.length === 3,
        `${g.name} has no sized economy fare`
      );
      assert.notDeepEqual(g.basic, g.economy, `${g.name} is in the gap table with no gap`);
    }
  });

  test('only a read finding may claim a fare carries no cabin bag', async () => {
    const { loadCarriers } = await import('../data.mjs');
    const carriers = await loadCarriers();
    for (const claim of facts.noCabinFares) {
      const record = carriers.find((c) => c.name === claim.name).record;
      const row = record.allowances.find((a) => a.cabin_absence === 'not_permitted');
      assert.ok(row, `${claim.name} is claimed as no-cabin without a not_permitted row`);
    }
  });

  test('envelopes are ordered smallest to largest by volume', () => {
    const vol = (cm) => cm[0] * cm[1] * cm[2];
    assert.ok(vol(facts.envelopes.smallest.cm) <= vol(facts.envelopes.largest.cm));
    assert.ok(
      facts.envelopes.distinct > 1,
      'a single envelope would mean the whole premise is wrong'
    );
  });

  test('strictness tiers cover every scored carrier exactly once', () => {
    const counted = facts.strictness.reduce((n, t) => n + t.count, 0);
    assert.equal(counted, facts.carriers, 'a carrier fell between two tiers, or was counted twice');
  });

  test('the empty-weight claim is arithmetic, not rhetoric', () => {
    assert.ok(facts.weight.overHalf <= facts.weight.weighed);
    assert.ok(facts.weight.heaviest.kg > facts.weight.cap / 2);
  });
});
