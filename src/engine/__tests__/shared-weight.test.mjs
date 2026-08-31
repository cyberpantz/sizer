/* A cabin weight cap that covers TWO bags must never be reported as if it
   covered one.

   Six carriers publish it this way — Air France, KLM, Cathay, JAL, ANA and
   Scoot. The figure lands on the cabin row because that is where a weight
   belongs, and the personal row carries null. Read naively, the whole 10 kg
   looks available for the suitcase.

   We shipped that reading. A traveller on ANA with a 4.6 kg suitcase was told
   it "leaves 5.4 kg to pack"; add the laptop bag they are also carrying and
   the truth is nearer 3.4. Over-generous, on the one axis a US traveller has
   never had to think about, because US carriers essentially never weigh a
   carry-on.

   Three ways it can come back, so three tests:
     1. the engine stops reading `allowance_group`
     2. the browser payload stops SHIPPING `allowance_group` — how it was
        broken in the first place, silently, in a different file
     3. the copy stops distinguishing the two cases */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { createUnits } from '../../ui/units.mjs';
import { advisoryLine } from '../../ui/verdict.mjs';
import { engine } from '../fit.mjs';
import { toBag, toCarrier } from '../normalize.mjs';

const records = readdirSync('data/carriers')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/carriers/${f}`, 'utf8')));

/** Carriers whose own data groups a cabin row with a personal row. */
const grouped = records.filter((r) =>
  (r.allowances ?? []).some(
    (a) =>
      a.allowance_group &&
      a.type === 'cabin' &&
      a.max_kg &&
      (r.allowances ?? []).some(
        (p) =>
          p !== a &&
          p.allowance_group === a.allowance_group &&
          p.fare_class === a.fare_class &&
          p.type === 'personal'
      )
  )
);

describe('a shared cabin weight cap', () => {
  test('the dataset still contains this case at all', () => {
    /* If this ever hits zero the tests below pass vacuously and the bug can
       walk straight back in behind them. */
    assert.ok(grouped.length > 0, 'no carrier groups a cabin row with a personal row any more');
  });

  test('the engine marks it shared', () => {
    for (const rec of grouped) {
      const row = rec.allowances.find((a) => a.type === 'cabin' && a.allowance_group && a.max_kg);
      const carrier = toCarrier(rec, row.fare_class);
      assert.equal(
        carrier.allowance?.weight_shared,
        true,
        `${rec.iata} publishes a combined cabin weight and the engine reads it as this bag's alone`
      );
    }
  });

  test('a carrier with no grouping is NOT marked shared', () => {
    /* The mirror failure: flagging everything shared would make every weight
       line hedge, and a warning that is always on is a warning nobody reads. */
    const plain = records.find(
      (r) =>
        !(r.allowances ?? []).some((a) => a.allowance_group) &&
        (r.allowances ?? []).some((a) => a.type === 'cabin' && a.max_kg)
    );
    if (!plain) return;
    const row = plain.allowances.find((a) => a.type === 'cabin' && a.max_kg);
    assert.equal(toCarrier(plain, row.fare_class).allowance?.weight_shared, false, plain.iata);
  });

  test('the browser gets the same answer as the build', () => {
    /* This is the one that actually broke. The engine was right; the payload
       dropped the field, so /check computed a more generous number than the
       static pages did — from the same code. */
    const payload = JSON.parse(readFileSync('public/catalogue.json', 'utf8'));
    for (const rec of grouped) {
      const shipped = payload.carriers.find((c) => c.iata === rec.iata);
      assert.ok(shipped, `${rec.iata} missing from the payload`);
      const row = rec.allowances.find((a) => a.type === 'cabin' && a.allowance_group && a.max_kg);
      assert.equal(
        toCarrier(shipped.record, row.fare_class).allowance?.weight_shared,
        true,
        `${rec.iata}: the browser cannot tell this cap is shared — catalogue.json dropped allowance_group`
      );
    }
  });

  test('the copy says the cap covers both bags', () => {
    const U = createUnits({ server: true });
    const heavy = {
      slug: 't',
      brand: 'T',
      model: 'T',
      external_cm: { v: [55, 40, 23] },
      weight_kg: { v: 4.6 },
    };
    const bag = toBag(heavy);
    const rec = grouped[0];
    const row = rec.allowances.find((a) => a.type === 'cabin' && a.allowance_group && a.max_kg);
    const w = engine
      .evaluate(bag, toCarrier(rec, row.fare_class))
      .advisories.find((a) => a.id === 'weight');
    assert.ok(w, `${rec.iata}: expected a weight advisory for a 4.6 kg bag`);
    const line = advisoryLine(w, U);
    assert.match(
      line,
      /TOGETHER/,
      `${rec.iata}: the line does not say the cap covers both bags — "${line}"`
    );
    assert.doesNotMatch(
      line,
      /leaves [\d.]+ \w+ to pack\./,
      'a shared cap must not describe the remainder as available "to pack"'
    );
  });
});
