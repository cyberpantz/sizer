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

describe('lenPair — a table may not contradict the verdict beside it', () => {
  /* THE BUG. A bag 0.2 cm over Air China's limit rendered as `21.7 in` in the
     YOUR BAG column and `21.7 in` in the AIRLINE LIMIT column, directly above
     a line reading "0.2 cm too long on Air China economy". Both were correct:
     one decimal of an inch is 2.5 mm, so a real overage disappeared into the
     rounding.

     That is worse than either half being wrong on its own, because the reader
     cannot tell which to believe — and the table is the one that looks like
     data. */
  const inches = () => {
    const u = createUnits({ storage: undefined, server: true });
    u.set('in');
    return u;
  };

  test('a difference too small for one decimal is still shown', () => {
    const [bag, limit] = inches().lenPair(55.1, 54.9);
    assert.notEqual(bag, limit, '55.1 cm and 54.9 cm both rendered as 21.7 in');
    assert.deepEqual([bag, limit], [21.7, 21.6]);
  });

  test('equal values stay equal — precision appears only where it means something', () => {
    assert.deepEqual(inches().lenPair(55, 55), [21.7, 21.7]);
  });

  test('figures that are plainly apart keep one decimal', () => {
    assert.deepEqual(inches().lenPair(55, 40), [21.7, 15.7]);
  });

  test('metric behaves the same way', () => {
    const u = createUnits({ storage: undefined, server: true });
    u.set('cm');
    assert.deepEqual(u.lenPair(55.14, 55.11), [55.14, 55.11]);
    assert.deepEqual(u.lenPair(55.1, 54.9), [55.1, 54.9]);
  });

  test('it never runs away to silly precision', () => {
    /* Capped at three decimals. Two figures a ten-thousandth apart are equal
       for a traveller's purposes, and a table reading 21.6536 would be
       claiming a precision no tape measure in an airport has. The cap losing
       the distinction is the correct trade. */
    const decimals = (n) => String(n).split('.')[1]?.length ?? 0;
    const [a, b] = inches().lenPair(55.0001, 55.0002);
    assert.ok(decimals(a) <= 3, `${a} carries more than three decimals`);
    assert.ok(decimals(b) <= 3, `${b} carries more than three decimals`);
  });
});

describe('lenText — a real margin never prints as none', () => {
  /* THE BUG. A bag clearing Aegean by 0.1 cm rendered as "0 in to spare".
     One decimal of an inch is 2.5 mm, so len() rounded a genuine margin to
     nothing — and "0 to spare" is the sentence resultLine() has a SEPARATE
     branch for, meaning something else entirely: exactly on the limit.

     The reader cannot act on a millimetre either way. They can be misled by
     it: "0 to spare" invites a shrug, "under 0.1 in" invites packing thin. */
  const inches = () => {
    const u = createUnits({ storage: undefined, server: true });
    u.set('in');
    return u;
  };

  test('a margin too small to display says so, rather than showing zero', () => {
    assert.equal(inches().lenText(0.1), 'under 0.1 in');
  });

  test('a true zero is still zero — the two states stay distinguishable', () => {
    assert.equal(inches().lenText(0), '0 in');
  });

  test('anything displayable is displayed normally', () => {
    assert.equal(inches().lenText(2.54), '1 in');
    assert.equal(inches().lenText(5), '2 in');
  });

  test('metric hits it too, just further down', () => {
    const u = createUnits({ storage: undefined, server: true });
    u.set('cm');
    assert.equal(u.lenText(0.04), 'under 0.1 cm');
    assert.equal(u.lenText(0.4), '0.4 cm');
    assert.equal(u.lenText(0), '0 cm');
  });
});
