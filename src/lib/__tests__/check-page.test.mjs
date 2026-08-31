/* The /check page runs the engine in the browser. These tests hold the parts
   of it that are logic rather than markup, against the payload the browser
   actually downloads.

   The bug that prompted them: the page picked its binding leg with its own
   `reduce` over delta_cm. A leg we cannot answer for scores `band: null`,
   ranked below every real band, and so LOST — meaning a trip routed through an
   unresearched airline printed a confident verdict derived from the other
   legs. The engine's bindingLeg() has always returned early on that case. Two
   implementations of one rule, and the copy on the loudest page was the wrong
   one. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { createEngine, engine as DEFAULT, desc } from '../../engine/fit.mjs';
import { toBag, toCarrier } from '../../engine/normalize.mjs';
import { BAND_ORDER } from '../../ui/verdict.mjs';

const D = JSON.parse(readFileSync('public/catalogue.json', 'utf8'));

/* The page's three modes, verbatim. If these drift from check.astro the tests
   below stop describing the product — so the page's own copy of them is the
   thing to keep in step, and the risk-ladder test pins their relationship. */
const ENGINES = {
  strict: createEngine({ gambleCeiling: () => 0 }),
  balanced: createEngine(),
  chance: createEngine({ gambleCeiling: (s) => DEFAULT.config.gambleCeiling(s) * 1.5 }),
};

const bagOf = (i) => toBag({ ...D.bags[i], external_cm: { v: D.bags[i].external_cm } });
const carrierOf = (iata, fare) => {
  const c = D.carriers.find((x) => x.iata === iata);
  return toCarrier(c.record, fare ?? c.fares[0]);
};

describe('check page — the trip model', () => {
  test('an unanswerable leg decides the trip, whatever the other legs say', () => {
    const unknown = D.carriers.find((c) => toCarrier(c.record, c.fares[0]).cabin_unknown);
    if (!unknown) return; // every carrier answerable: nothing to assert
    const scored = D.carriers.find((c) => !toCarrier(c.record, c.fares[0]).cabin_unknown);

    const bag = bagOf(0);
    /* Unanswerable leg FIRST, so a reducer that keeps the running maximum has
       every chance to overwrite it — which is how the bug read on screen. */
    const carriers = [carrierOf(unknown.iata), carrierOf(scored.iata)];
    const bound = DEFAULT.bindingLeg(bag, carriers);
    assert.equal(bound.carrier, carriers[0], 'a leg nobody has researched must bind the trip');
  });

  test('a fare with no cabin bag binds ahead of a merely oversize leg', () => {
    const none = D.carriers.find((c) =>
      (c.record.allowances ?? []).some((a) => a.cabin_absence === 'not_permitted')
    );
    if (!none) return;
    const fare = none.record.allowances.find(
      (a) => a.cabin_absence === 'not_permitted'
    )?.fare_class;
    const bag = bagOf(0);
    const carriers = [carrierOf(none.iata, fare), carrierOf('FR')].filter(Boolean);
    const bound = DEFAULT.bindingLeg(bag, carriers);
    assert.ok(
      bound.result.no_cabin_bag || bound.result.unknown,
      'a fare that permits no cabin bag at all cannot be outranked by centimetres'
    );
  });

  test('the envelope is built only from legs we can actually answer for', () => {
    /* An unread allowance is not an unlimited one. If unknown legs reached
       envelope() they would contribute no box and the result would silently
       describe a shorter trip than the one the reader typed in. */
    const carriers = D.carriers.slice(0, 12).map((c) => carrierOf(c.iata));
    const scorable = carriers.filter((c) => !c.cabin_unknown && c.allowance);
    const env = DEFAULT.envelope(scorable);
    assert.ok(env, 'no envelope from a dozen carriers means the data moved under us');
    for (const c of scorable) {
      const box = desc(c.allowance.max_cm);
      for (const [i, v] of env.entries()) {
        assert.ok(v <= box[i], `${c.name} allows less than the envelope on axis ${i}`);
      }
    }
  });

  test('every bag the envelope offers actually fits inside it', () => {
    const carriers = D.carriers.slice(0, 12).map((c) => carrierOf(c.iata));
    const env = DEFAULT.envelope(carriers.filter((c) => !c.cabin_unknown && c.allowance));
    const fits = D.bags.filter((b) => desc(b.external_cm).every((v, i) => v <= env[i]));
    for (const b of fits) {
      assert.ok(
        desc(b.external_cm).every((v, i) => v <= env[i]),
        `${b.brand} ${b.model} is offered but does not fit ${env.join('×')}`
      );
    }
  });

  test('the risk modes form a ladder — strict is never kinder than chance', () => {
    /* The three modes change ONE number. If a bag ever cleared under `strict`
       while failing under `chance`, the control would be lying about what it
       does. */
    /* Ranked from BAND_ORDER, never from a local map. This test kept its own
       and silently broke the moment a fifth band was added — `RANK[likely]`
       came back undefined and every comparison against it was false, so a
       correct ladder reported as broken. One ordering, imported. */
    const RANK = Object.fromEntries(BAND_ORDER.map((id, i) => [id, BAND_ORDER.length - 1 - i]));
    for (const b of D.bags.slice(0, 12)) {
      const bag = toBag({ ...b, external_cm: { v: b.external_cm } });
      for (const c of D.carriers.slice(0, 12)) {
        const carrier = carrierOf(c.iata);
        if (carrier.cabin_unknown || !carrier.allowance) continue;
        const s = ENGINES.strict.evaluate(bag, carrier).band;
        const m = ENGINES.balanced.evaluate(bag, carrier).band;
        const l = ENGINES.chance.evaluate(bag, carrier).band;
        assert.ok(
          RANK[s] >= RANK[m] && RANK[m] >= RANK[l],
          `${b.slug} on ${c.iata}: strict=${s} balanced=${m} chance=${l} is not a ladder`
        );
      }
    }
  });
});
