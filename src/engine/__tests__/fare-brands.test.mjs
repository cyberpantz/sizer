/* Every fare brand in the dataset must be classified.
 *
 * Airlines call the same rung different things — Basic, Light, Lite, Saver,
 * Blue Basic, Wanna Get Away, Hand Baggage Only, Economy Light. No list can
 * ever be complete, and completeness is not the point. The point is that an
 * unclassified brand must fail LOUDLY rather than quietly.
 *
 * WHAT HAPPENS WITHOUT THIS TEST. An unrecognised brand matches nothing, the
 * carrier resolves to no cabin row, it is reported `cabin_unknown`, and it
 * drops out of the coverage denominator of every number on the site — with no
 * error anywhere. That is exactly how Ryanair, easyJet, Wizz, Vueling and
 * Frontier came to be excluded from "clears 41 of 52", and how the one bag
 * advertised as clearing every airline had never been checked against the five
 * airlines that actually measure.
 *
 * The carrier set is heading for 100. Without this the bug returns one airline
 * at a time, and each time it looks like working software. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { ADDON_FARES, classifyFare, ECONOMY_TIERS, PREMIUM_TIERS } from '../normalize.mjs';

const carriers = readdirSync('data/carriers')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/carriers/${f}`, 'utf8')));

describe('fare brands', () => {
  test('every fare brand on a cabin row is classified', () => {
    const unknown = new Map();
    for (const c of carriers) {
      for (const a of c.allowances ?? []) {
        if (a.type !== 'cabin') continue;
        if (a.fare_class == null) continue;
        if (classifyFare(a.fare_class)) continue;
        (unknown.get(a.fare_class) ?? unknown.set(a.fare_class, []).get(a.fare_class)).push(c.iata);
      }
    }
    assert.equal(
      unknown.size,
      0,
      `unclassified fare brands — each will silently drop its carrier out of every ` +
        `coverage figure on the site. Add each to ECONOMY_TIERS, PREMIUM_TIERS or ` +
        `ADDON_FARES in engine/normalize.mjs:\n` +
        [...unknown].map(([f, ias]) => `  "${f}"  (${ias.join(', ')})`).join('\n')
    );
  });

  test('every carrier offers at least one classifiable economy rung', () => {
    /* A carrier whose every cabin row is premium or add-on cannot answer the
       only question this site asks. Better to name it here than to let it
       vanish from a denominator. */
    const orphans = [];
    for (const c of carriers) {
      if (c.status === 'ceased') continue;
      const rows = (c.allowances ?? []).filter((a) => a.type === 'cabin' || a.type === 'personal');
      if (!rows.length) continue; // nothing researched yet — a different gap
      const hasEconomy = rows.some((a) => classifyFare(a.fare_class) === 'economy');
      if (!hasEconomy) orphans.push(`${c.iata} ${c.name}`);
    }
    assert.deepEqual(
      orphans,
      [],
      `carriers with no economy-class fare rung:\n  ${orphans.join('\n  ')}`
    );
  });

  test('the classifier is total — it answers for anything, including junk', () => {
    assert.equal(classifyFare('basic'), 'economy');
    assert.equal(classifyFare('business'), 'premium');
    assert.equal(classifyFare('priority'), 'addon');
    assert.equal(classifyFare(null), 'unnamed');
    assert.equal(classifyFare('wanna_get_away'), null, 'an unknown brand must return null, loudly');
  });

  test('no brand is in two categories at once', () => {
    /* "priority" as both an add-on and an economy rung would make the ladder
       reachable without buying it — the most expensive way to be wrong. */
    for (const f of ECONOMY_TIERS) {
      assert.ok(!PREMIUM_TIERS.has(f), `${f} is both economy and premium`);
      assert.ok(!ADDON_FARES.has(f), `${f} is both an economy rung and an add-on`);
    }
    for (const f of ADDON_FARES)
      assert.ok(!PREMIUM_TIERS.has(f), `${f} is both add-on and premium`);
  });
});
