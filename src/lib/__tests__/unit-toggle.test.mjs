/* The units toggle, and a loop that ran over nothing.
 *
 * THE BUG. UnitToggle re-renders every figure from the stored centimetres, and
 * it has three loops — `[data-cm]`, `[data-kg]`, `[data-dims]`. The second one
 * had no elements to find, because NOTHING on the site emitted `data-kg`.
 * Weight was printed as a bare "3.4 kg" string in the card and the bag page.
 *
 * So flipping to imperial gave a reader inches for the size and kilograms for
 * the weight. Half a conversion is worse than none: it looks finished, so
 * nobody reports it, and an American reader quietly concludes the bag weighs
 * 3.4 pounds.
 *
 * Dead code that looks like a feature is the hardest kind to notice — the loop
 * was right there in the source, doing nothing, for as long as the toggle has
 * existed. A test that only read UnitToggle.astro would have passed too, which
 * is why this one checks the OTHER side of the contract: that somebody
 * actually stamps the attribute the loop is looking for. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.astro') ? [join(d, e.name)] : []
  );

const toggle = readFileSync('src/components/UnitToggle.astro', 'utf8');
const others = walk('src').filter((f) => !f.endsWith('UnitToggle.astro'));
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const sources = others.map((f) => [f, stripComments(readFileSync(f, 'utf8'))]);

describe('the units toggle', () => {
  test('every attribute the toggle re-renders is emitted by some page', () => {
    /* The contract runs between two files and neither half fails on its own:
       the loop finds nothing and moves on, the page renders a fixed string. */
    const hooks = [...toggle.matchAll(/querySelectorAll\('\[(data-[\w-]+)\]'\)/g)].map((m) => m[1]);
    assert.ok(
      hooks.length >= 3,
      `expected the toggle's re-render hooks, found ${hooks.join(', ')}`
    );

    for (const hook of hooks) {
      const emitters = sources.filter(([, src]) => src.includes(hook)).map(([f]) => f);
      assert.ok(
        emitters.length > 0,
        `UnitToggle re-renders [${hook}] but nothing emits it — that loop runs over an ` +
          'empty set, so those figures never convert and stay in metric forever'
      );
    }
  });

  test('no figure is printed with a hard-coded unit next to it', () => {
    /* The shape of the original bug: `{bag.weight_kg} kg`. The number comes
       from data and the unit is a literal, so the two can disagree the moment
       a reader switches. Any element printing a value must either carry a
       conversion hook or go through the units helper. */
    const offenders = [];
    for (const [file, src] of sources) {
      for (const m of src.matchAll(
        /<(dd|span|p|b|strong)([^>]*)>\{([^}]*?)\}\s*(kg|lb|cm|in)\b/g
      )) {
        const [, tag, attrs, expr, unit] = m;
        if (/data-(kg|cm|dims)/.test(attrs)) continue; // has a conversion hook
        offenders.push(`${file}: <${tag}>{${expr.trim()}} ${unit}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `figures printed with a literal unit and no conversion hook:\n  ${offenders.join('\n  ')}`
    );
  });

  test('no unit is baked into a label or hint string', () => {
    /* THE SURFACE THE FIRST GUARD MISSED.
     *
     * That guard searched .astro markup for a number printed beside a literal
     * unit. The /bags filter labels lived in bag-facets.mjs as plain strings —
     * "Under 2.5 kg", "Leaves 4.5 kg to pack against a 7 kg cabin cap" — so it
     * never looked at them, and they stayed in kilograms with the toggle set
     * to imperial. Frank found them by using the page.
     *
     * A unit inside a string is unreachable by definition: there is no element
     * to hook and no number to convert, because both are one opaque token. So
     * the rule for these modules is stronger than "carry a hook" — a
     * user-facing string may not contain a unit AT ALL. Carry the figure and
     * let the component assemble the label around a hook.
     *
     * Scoped to the modules that feed labels into the UI. Comments and test
     * fixtures are stripped or excluded; prose in a comment is not a label. */
    const UI_DATA = ['src/lib/bag-facets.mjs', 'src/lib/price-band.mjs', 'src/ui/strictness.mjs'];
    const LABEL_KEYS = /\b(label|hint|prefix|legend|note|detail|blurb|title)\s*:\s*(['"`])(.*?)\2/g;

    const offenders = [];
    for (const file of UI_DATA) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const [, key, , text] of src.matchAll(LABEL_KEYS)) {
        if (!/\d\s*(kg|lb|lbs|cm|in|inch)\b/i.test(text)) continue;
        offenders.push(`${file}: ${key}: "${text}"`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'a unit is baked into a user-facing string, so the toggle cannot convert it:\n  ' +
        `${offenders.join('\n  ')}\n` +
        'Carry the figure instead and wrap it in a data-kg / data-cm span at render.'
    );
  });

  test('no space between an expression and an element is left to Astro', () => {
    /* Astro trims whitespace between an expression and an adjacent element, so
     *   <Fragment>{o.prefix} <span>{o.max} kg</span></Fragment>
     * rendered as "Under5.5 lb". The literal-text cases beside it ("Leaves
     * ...") kept their spaces, which is exactly why only one of them broke and
     * why it survived a source review — the two lines look identical.
     *
     * A space that must survive has to be {' '}. This is the pattern that
     * cannot, and it only became visible when the surrounding text changed
     * from a single string into assembled markup, so it will recur every time
     * a label is broken apart for a conversion hook. */
    const offenders = [];
    for (const [file, src] of sources) {
      for (const m of src.matchAll(/\}[ \t]+<(span|b|strong|a|em|code|Fragment)\b/g)) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${file}:${line} — }${' '}<${m[1]}  (use {' '})`);
      }
    }
    assert.deepEqual(offenders, [], `a space Astro will trim:\n  ${offenders.join('\n  ')}`);
  });

  test('the toggle names the SYSTEM, not one of its units', () => {
    /* It switches length and weight together. Labelling it "cm / in" described
       half of what it does, and gave a reader who wanted pounds no reason to
       think the button was for them. */
    assert.match(toggle, />Metric</, 'the metric button should say Metric');
    assert.match(toggle, />Imperial</, 'the imperial button should say Imperial');
    /* Screen readers get the units spelled out, since "Imperial" alone does
       not tell you the page is about to switch kilograms to pounds. */
    assert.match(toggle, /aria-label="[^"]*kilograms?"/);
    assert.match(toggle, /aria-label="[^"]*pounds?"/);
  });

  test('both systems convert weight as well as length', async () => {
    const { createUnits } = await import('../../ui/units.mjs');
    const U = createUnits();
    U.set('cm');
    assert.equal(U.massLabel(), 'kg');
    assert.equal(U.mass(3.4), 3.4);
    U.set('in');
    assert.equal(U.massLabel(), 'lb');
    assert.equal(U.mass(3.4), 7.5, '3.4 kg is 7.5 lb');
    assert.equal(U.lenLabel(), 'in');
  });
});
