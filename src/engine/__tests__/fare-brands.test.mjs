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
import {
  ADDON_FARES,
  classifyFare,
  ECONOMY_TIERS,
  PREMIUM_TIERS,
  toCarrier,
} from '../normalize.mjs';

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

  test('we never answer with more than the airline gives on its cheapest fare', () => {
    /* THE STANDING RULE, and the one worth stating plainly: do not
     * misrepresent what an airline publishes.
     *
     * An unqualified "does my bag fit" must never be answered with an
     * allowance that has to be bought. The failure is invisible from the
     * inside — a paid tier's row looks exactly like a free one — so it is
     * checked against the whole dataset rather than reasoned about.
     *
     * For every carrier, the allowance we serve must be no larger than the
     * SMALLEST cabin allowance published for any non-add-on economy tier. If a
     * cheaper tier gets a smaller bag, or none, that is the answer. */
    const offenders = [];
    for (const c of carriers) {
      if (c.status === 'ceased') continue;
      const served = toCarrier(c, { class: 'economy' });
      if (!served.allowance?.max_cm) continue;

      const eco = (c.allowances ?? []).filter(
        (a) => !a.addon && classifyFare(a.fare_class) === 'economy'
      );
      /* SCOPED TO CARRIERS WITH NO FARE ACTUALLY NAMED "ECONOMY".
       *
       * Where an airline publishes a row called economy, that row is its
       * standard product and we answer on it — even though a cheaper Basic
       * exists with no bag. Whether that is the right default is an open
       * product question, not a bug: Lufthansa and easyJet have the same
       * structure (cheapest tier no bag, next tier up has one) and get
       * opposite answers purely because Lufthansa calls the second rung
       * "Economy" and easyJet calls it "Plus". Recorded in docs/24.
       *
       * What is unambiguously wrong, and what this guards, is reaching PAST
       * the cheapest tier when the airline never named one economy — that is
       * how easyJet Basic passengers were promised a 56x45x25 bag that costs
       * extra at the gate. */
      if (eco.some((a) => a.fare_class === 'economy')) continue;

      const withFreeCabin = new Set(
        eco.filter((a) => a.type === 'cabin' && a.max_cm).map((a) => a.fare_class)
      );
      const barer = [...new Set(eco.map((a) => a.fare_class))].find((t) => !withFreeCabin.has(t));
      if (barer) {
        offenders.push(
          `${c.iata} ${c.name}: served ${served.allowance.max_cm.join('x')} but "${barer}" ` +
            'publishes no free cabin bag — that bag has to be bought'
        );
        continue;
      }
      const smallest = Math.min(
        ...eco
          .filter((a) => a.type === 'cabin' && a.max_cm)
          .map((a) => a.max_cm.reduce((s, v) => s + v, 0))
      );
      const servedSum = served.allowance.max_cm.reduce((s, v) => s + v, 0);
      if (servedSum > smallest + 0.01) {
        offenders.push(
          `${c.iata} ${c.name}: served a ${servedSum.toFixed(0)} cm total when a cheaper ` +
            `economy tier publishes ${smallest.toFixed(0)} cm`
        );
      }
    }
    assert.deepEqual(offenders, [], `over-promised allowances:\n  ${offenders.join('\n  ')}`);
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
