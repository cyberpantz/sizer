/* Units. One implementation, previously five.

   The rules were settled after three reversals and are not up for
   reinterpretation (docs/README canonical decisions):

     - US locale opens in inches, everywhere else in centimetres
     - an always-visible toggle, on every page
     - an explicit choice wins and persists
     - dual display ONLY on the hero envelope

   Showing only inches loses EU and Asian readers; showing only cm loses American
   ones. Both were tried. */

export const CM = 'cm',
  IN = 'in';

/** en-US opens in inches. Everyone else gets cm — including en-GB, which is
 *  metric for luggage whatever it does for body weight.
 *
 *  ⚠️ Node 22 ships a built-in `navigator` reporting **en-US**. Left to a default
 *  parameter, every server-rendered page would open in inches regardless of who
 *  is reading — the exact failure that loses the EU and Asian audience. So the
 *  server is never asked: `resolve()` below only consults a navigator in a
 *  browser, and SSR emits the metric default plus a client-side correction. */
export function localeDefault(navigatorish) {
  try {
    const tags = [navigatorish?.language, ...(navigatorish?.languages ?? [])]
      .filter(Boolean)
      .join(' ');
    return /\ben-US\b/i.test(tags) ? IN : CM;
  } catch {
    return CM;
  }
}

/** True only in a real browser. `document` is the tell — Node has `navigator`
 *  but never `document`. */
export const isBrowser = () => typeof globalThis.document !== 'undefined';

/** Storage is optional. A private window or a blocked store must not break the
 *  page — it just means the choice doesn't persist. */
function read(store) {
  try {
    return store?.getItem('units') ?? null;
  } catch {
    return null;
  }
}
function write(store, u) {
  try {
    store?.setItem('units', u);
  } catch {
    /* ignore */
  }
}

export function createUnits({ storage, navigator: nav, server = !isBrowser() } = {}) {
  const store = storage !== undefined ? storage : isBrowser() ? globalThis.localStorage : undefined;
  const saved = read(store);
  /* On the server there is no reader to have a locale, so guessing is worse than
     defaulting. Static HTML ships metric; the client corrects on hydration. */
  const fallback = server && nav === undefined ? CM : localeDefault(nav ?? globalThis.navigator);
  let unit = saved === CM || saved === IN ? saved : fallback;
  const listeners = new Set();

  return {
    get unit() {
      return unit;
    },
    get isDefault() {
      return !saved;
    },

    set(u) {
      if (u !== CM && u !== IN) throw new Error(`unknown unit: ${u}`);
      unit = u;
      write(store, u);
      for (const fn of listeners) fn(u);
    },
    toggle() {
      this.set(unit === CM ? IN : CM);
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** cm in, display value out. Engine data is always cm. */
    len(cm) {
      return unit === CM ? round(cm, 1) : round(cm / 2.54, 1);
    },

    /** THE INVERSE, for the one place a reader TYPES a length.
     *
     * Everything else on this site converts one way: the engine holds
     * centimetres and the page renders them. A reader describing their own bag
     * reverses that — they type into whichever unit the toggle is showing, and
     * the number has to come back as cm before the engine ever sees it.
     *
     * It lives here rather than at the input, so 2.54 appears exactly once in
     * the codebase. Two copies of a conversion factor is how a bag typed in
     * inches gets judged in centimetres, and the reader would have no way to
     * tell: 22 would simply come out "Over" everywhere.
     *
     * NOT rounded. len() rounds for display, which is right for reading and
     * wrong for storing — round on the way in and a value round-trips
     * differently every time the toggle moves. */
    toCm(value) {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return unit === CM ? n : n * 2.54;
    },
    mass(kg) {
      return unit === CM ? round(kg, 1) : round(kg * 2.20462, 1);
    },
    lenLabel() {
      return unit === CM ? 'cm' : 'in';
    },
    massLabel() {
      return unit === CM ? 'kg' : 'lb';
    },

    /** A NON-ZERO MARGIN THAT ROUNDS TO ZERO MUST NOT PRINT AS ZERO.
     *
     * len() rounds to one decimal, and one decimal of an inch is 2.5 mm. A bag
     * clearing Aegean by 0.1 cm rendered as "0 in to spare" — which is the
     * sentence resultLine() has a SEPARATE branch for, and means something
     * different: exactly on the limit, no margin whatsoever.
     *
     * The reader cannot act on the difference, but they can be misled by it:
     * "0 to spare" invites a shrug, "under 0.1 in" invites packing thin. So
     * the display admits that it ran out of precision instead of rounding a
     * real margin away. */
    lenText(cm) {
      const v = this.len(cm);
      if (v !== 0 || cm === 0) return `${v} ${this.lenLabel()}`;
      return `under 0.1 ${this.lenLabel()}`;
    },

    /** TWO FIGURES THAT MUST NOT LOOK EQUAL WHEN THEY ARE NOT.
     *
     * A bag 0.2 cm over Air China's limit rendered as `21.7 in` against
     * `21.7 in` — the comparison table said it fitted while the verdict line
     * beneath it said "0.2 cm too long". Both were right; one decimal of an
     * inch is 2.5 mm, so a real overage vanished into the rounding.
     *
     * A table that contradicts the verdict beside it is worse than either
     * being wrong on its own, because the reader cannot tell which to believe.
     * So: render at the COARSEST precision that still tells them apart, and
     * only where they actually collide. Equal values stay equal. */
    lenPair(aCm, bCm) {
      const conv = (v) => (unit === CM ? v : v / 2.54);
      const a = conv(aCm);
      const b = conv(bCm);
      for (let d = 1; d <= 3; d++) {
        if (a === b || round(a, d) !== round(b, d)) return [round(a, d), round(b, d)];
      }
      return [round(a, 3), round(b, 3)];
    },

    dims(cmArr, sep = ' × ') {
      return `${cmArr.map((v) => this.len(v)).join(sep)} ${this.lenLabel()}`;
    },

    /** Hero envelope only. Anywhere else this is clutter — that was the whole
     *  argument for a toggle instead of always showing both. */
    dimsBoth(cmArr, sep = ' × ') {
      const cm = `${cmArr.map((v) => round(v, 1)).join(sep)} cm`;
      const inch = `${cmArr.map((v) => round(v / 2.54, 1)).join(sep)} in`;
      return unit === CM ? `${cm} · ${inch}` : `${inch} · ${cm}`;
    },
  };
}

const round = (n, d) => +(+n).toFixed(d);
