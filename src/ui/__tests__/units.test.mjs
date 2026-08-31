/* Units. Tested harder than the size warrants, because the rules were reversed
   three times before settling and the cost of getting them wrong is losing
   either the US or the non-US audience entirely. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CM, createUnits, IN, localeDefault } from '../units.mjs';

const fakeStore = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};
const nav = (language, languages = []) => ({ language, languages });

describe('opening default', () => {
  test('en-US opens in inches', () => {
    assert.equal(localeDefault(nav('en-US')), IN);
  });

  test('everywhere else opens in centimetres', () => {
    for (const l of ['en-GB', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'zh-CN']) {
      assert.equal(localeDefault(nav(l)), CM, `${l} should open metric`);
    }
  });

  test('en-GB is metric — British luggage is sold in cm', () => {
    assert.equal(localeDefault(nav('en-GB')), CM);
  });

  test('a missing or broken navigator falls back to cm rather than throwing', () => {
    assert.equal(localeDefault(undefined), CM);
    assert.equal(localeDefault(null), CM);
    assert.equal(localeDefault({}), CM);
    assert.equal(
      localeDefault({
        get language() {
          throw new Error('x');
        },
      }),
      CM
    );
  });

  /* Node 22 ships a built-in navigator reporting en-US. Without this guard every
     server-rendered page opens in inches for every reader on earth. */
  test('the server never infers a locale — SSR opens metric', () => {
    const U = createUnits({ storage: undefined, server: true });
    assert.equal(U.unit, CM, 'Node says en-US; that is the machine, not the reader');
  });

  test('the client still reads the real locale', () => {
    assert.equal(createUnits({ storage: fakeStore(), navigator: nav('en-US') }).unit, IN);
  });
});

describe('an explicit choice wins and persists', () => {
  test('a saved choice beats the locale', () => {
    const U = createUnits({ storage: fakeStore({ units: CM }), navigator: nav('en-US') });
    assert.equal(U.unit, CM, 'a US visitor who chose cm keeps cm');
  });

  test('setting writes through', () => {
    const s = fakeStore();
    createUnits({ storage: s, navigator: nav('en-US') }).set(CM);
    assert.equal(s.getItem('units'), CM);
  });

  test('a junk stored value is ignored, not trusted', () => {
    const U = createUnits({ storage: fakeStore({ units: 'furlongs' }), navigator: nav('en-US') });
    assert.equal(U.unit, IN);
  });

  test('an unknown unit is refused', () => {
    assert.throws(() => createUnits({ storage: fakeStore() }).set('cubits'));
  });

  test('storage that throws does not break the page', () => {
    const hostile = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    const U = createUnits({ storage: hostile, navigator: nav('de-DE') });
    assert.equal(U.unit, CM);
    U.set(IN); // must not throw
    assert.equal(U.unit, IN, 'the choice applies for the session even if it cannot persist');
  });

  test('no storage at all still works', () => {
    const U = createUnits({ storage: undefined, navigator: nav('en-US') });
    assert.equal(U.unit, IN);
    U.toggle();
    assert.equal(U.unit, CM);
  });
});

describe('conversion', () => {
  const metric = () => createUnits({ storage: fakeStore({ units: CM }), navigator: nav('en-US') });
  const imperial = () =>
    createUnits({ storage: fakeStore({ units: IN }), navigator: nav('de-DE') });

  test('cm passes through untouched in metric', () => {
    assert.equal(metric().len(55.9), 55.9);
  });

  test('the US standard renders as 22 inches, not 21.9', () => {
    assert.equal(imperial().len(55.88), 22);
  });

  test('mass converts and labels', () => {
    const U = imperial();
    assert.equal(U.mass(4.76), 10.5);
    assert.equal(U.massLabel(), 'lb');
    assert.equal(metric().massLabel(), 'kg');
  });

  test('dims are joined with the unit stated once', () => {
    assert.equal(metric().dims([55, 40, 20]), '55 × 40 × 20 cm');
  });

  test("dual display leads with the reader's own unit", () => {
    assert.match(metric().dimsBoth([55, 40, 20]), /^55 × 40 × 20 cm · /);
    assert.match(imperial().dimsBoth([55, 40, 20]), /^21\.7 × 15\.7 × 7\.9 in · /);
  });
});

describe('the toggle', () => {
  test('flips and notifies', () => {
    const U = createUnits({ storage: fakeStore(), navigator: nav('en-US') });
    let seen = null;
    U.onChange((u) => {
      seen = u;
    });
    U.toggle();
    assert.equal(U.unit, CM);
    assert.equal(seen, CM, 'every rendered figure on the page depends on this firing');
  });

  test('unsubscribing works', () => {
    const U = createUnits({ storage: fakeStore() });
    let n = 0;
    const off = U.onChange(() => n++);
    U.toggle();
    off();
    U.toggle();
    assert.equal(n, 1);
  });
});
