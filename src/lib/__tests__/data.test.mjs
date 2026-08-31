/* The data seam.

   data/ is JSON on disk today and will be HTTP endpoints soon. Everything the
   product knows about where data lives is in one file, and these tests pin the
   two properties that must survive that move. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { coverageStats, loadBags, loadCarriers } from '../data.mjs';

describe('the loaders are async before they need to be', () => {
  /* Making them async LATER would ripple through every caller at exactly the
     moment the switch is riskiest. They are async now, against a synchronous
     source, so the endpoint move touches one file. */
  test('every loader returns a promise', () => {
    for (const fn of [loadBags, loadCarriers, coverageStats]) {
      assert.ok(fn() instanceof Promise, `${fn.name} is not async`);
    }
  });
});

describe('never degrade quietly', () => {
  /* The tempting failure: the endpoint is unreachable, a cached copy gets used,
     and the audit reports green. A guard claiming coverage it does not have is
     how the mockup drift and the dead drift-checker regex both survived. */
  test('a bag record still resolves its provenance', async () => {
    for (const b of await loadBags()) {
      assert.ok(b.provenance?.src, `${b.slug} lost its provenance crossing the seam`);
    }
  });

  test('no loader silently returns an empty set', async () => {
    assert.ok((await loadBags()).length > 0);
    assert.ok((await loadCarriers()).length > 0);
  });

  test('stats and loaders agree — one cannot drift from the other', async () => {
    const stats = await coverageStats();
    const carriers = await loadCarriers();
    assert.equal(stats.carriers_total, carriers.length);
  });
});

describe('what the loaders filter', () => {
  test('only sized bags reach a page that shows a verdict', async () => {
    for (const b of await loadBags()) {
      assert.ok(Array.isArray(b.external_cm) && b.external_cm.length === 3, b.slug);
    }
  });

  test('role defaults to overhead — under-seat is a separate category', async () => {
    for (const b of await loadBags()) assert.notEqual(b.record.role, 'underseat');
    assert.ok((await loadBags({ role: null })).length >= (await loadBags()).length);
  });

  test('a malformed carrier is excluded, not fatal', async () => {
    /* One bad record must not take down a build of 58. validate-carriers.mjs is
       where it gets fixed; the site keeps working meanwhile. */
    const carriers = await loadCarriers();
    assert.ok(carriers.every((c) => c.name && typeof c.strictness === 'number'));
  });
});
