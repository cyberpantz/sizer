/* What a fare is called on screen.

   The dropdown read "comfort_flex ticket", in lower case, because the machine
   key was being rendered raw. These rules decide what replaces it. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fareLabel, humanise } from '../fare.mjs';

describe('fare labels', () => {
  test('machine keys become readable', () => {
    assert.equal(humanise('comfort_flex'), 'Comfort flex');
    assert.equal(humanise('inclusive_plus'), 'Inclusive plus');
    assert.equal(humanise('fly_grande'), 'Fly grande');
  });

  test("the airline's own name wins where we read one", () => {
    assert.equal(fareLabel('basic', 'Light'), 'Light');
    assert.equal(fareLabel('economy', 'SMART'), 'SMART');
  });

  test('but not when the "name" is one we generated', () => {
    /* Two records carry "Purchased priority" / "Purchased carry_on", and say
       in their own notes that this is our construction. Presenting it as the
       airline's word for a fare would be inventing a product name. */
    assert.equal(fareLabel('priority', 'Purchased priority'), 'Priority (paid add-on)');
    assert.equal(fareLabel('carry_on', 'Purchased carry_on'), 'With carry-on (paid add-on)');
  });

  test('add-ons say they cost money', () => {
    /* "Priority" alone reads like a fare tier that includes a bag. That
       misunderstanding is the single most expensive one on Ryanair. */
    for (const key of ['priority', 'carry_on']) {
      assert.match(fareLabel(key), /paid add-on/, key);
    }
  });

  test('nothing in the real dataset renders as a raw key', () => {
    const carriers = readdirSync('data/carriers')
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => JSON.parse(readFileSync(`data/carriers/${f}`, 'utf8')));
    for (const c of carriers) {
      for (const a of c.allowances ?? []) {
        if (!a.fare_class) continue;
        const label = fareLabel(a.fare_class, a.fare_name);
        assert.doesNotMatch(
          label,
          /_/,
          `${c.iata}/${a.fare_class} renders with an underscore: "${label}"`
        );
        assert.match(label, /^[A-Z]/, `${c.iata}/${a.fare_class} starts lower case: "${label}"`);
      }
    }
  });
});
