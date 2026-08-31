/* Research arrives in the units the manufacturer prints. The build converts.
 *
 * WHY THE SPLIT IS THIS WAY ROUND. The intake brief forbids the researcher
 * from converting anything, because a conversion done at the source is a
 * number nobody can walk back to the sentence on the page. So Away's figures
 * arrive as `external_in: [22.7, 15.4, 9.6]`, exactly as awaytravel.com prints
 * them, and the build turns that into centimetres.
 *
 * TWO FAILURES, both of which already happened on the same record:
 *
 * 1. AN UNREAD FIELD. The build did not know `external_in`, so a fully
 *    researched bag — sourced, quoted, conflict recorded — landed with a price
 *    and NO DIMENSIONS and stayed invisible on the site. Nothing threw and no
 *    test failed; the only trace was an `intake_status` the researcher set.
 *
 * 2. TWO CONVERSIONS. A hand-derived `external_cm` was then added alongside
 *    the inches, and the build's rule "an explicit metric figure wins" made it
 *    defer — so the converter never ran on the one record it was written for,
 *    and the arithmetic lived in the data file instead of in versioned code.
 *    The rule now distinguishes a figure the PAGE printed from one somebody
 *    DERIVED, which are not the same kind of claim at all. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const built = readdirSync('data/bags')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/bags/${f}`, 'utf8')));
const source = JSON.parse(readFileSync('data/manufacturer-bags.json', 'utf8')).bags;
const bySlug = new Map(built.map((b) => [b.slug, b]));

const PAIRS = [
  ['external_in', 'external_cm', 2.54],
  ['claimed_packing_in', 'claimed_packing_cm', 2.54],
  ['claimed_in', 'claimed_cm', 2.54],
  ['weight_lb', 'weight_kg', 0.45359],
];
const exact = (v, f) => +(v * f).toFixed(6);

/* Did the PAGE print this metric figure, or did somebody derive it?
 *
 * The distinction is the whole rule, and Béis is why it earns its keep: their
 * page prints both units and they disagree once converted —
 * claimed_cm [58, 40, 25.4] against claimed_in × 2.54 [57.9882, 39.878, 25.4].
 * Both are Béis's own numbers. Ours is arithmetic. Theirs wins, and the
 * disagreement is a fact about their page rather than a problem to tidy away.
 *
 * A derived figure carries `conversion.from_field`; a published one does not. */
const published = (field) => Boolean(field) && !field.conversion?.from_field;

describe('imperial intake reaches the site', () => {
  test('every imperial field is converted, and the build does the arithmetic', () => {
    let checked = 0;
    for (const m of source) {
      const b = bySlug.get(m.slug);
      for (const [from, to, factor] of PAIRS) {
        if (!m[from]) continue;
        assert.ok(b?.[to], `${m.slug}: ${from} was researched but ${to} was never derived`);

        /* The manufacturer printed metric too — it outranks our arithmetic and
           must survive byte-identical. Checked by its own test below. */
        if (published(m[to])) continue;
        checked += 1;

        const want = Array.isArray(m[from].v)
          ? m[from].v.map((x) => exact(x, factor))
          : exact(m[from].v, factor);
        assert.deepEqual(
          b[to].v,
          want,
          `${m.slug}: ${to} does not equal ${from} × ${factor} — either the build skipped it ` +
            "or a hand-converted value is standing in for the build's own arithmetic"
        );
        assert.equal(
          b[to].conversion?.by,
          'build-bags.mjs',
          `${m.slug}: ${to} was not produced by the build — conversions must live in one versioned place`
        );
      }
    }
    assert.ok(checked > 0, 'no imperial intake in the dataset — this test proved nothing');
  });

  test('a converted figure says so, and points at what it came from', () => {
    for (const m of source) {
      const b = bySlug.get(m.slug);
      for (const [from, to] of PAIRS) {
        if (!m[from] || published(m[to])) continue;
        const f = b[to];
        assert.equal(f.conversion?.from_field, from, `${m.slug}: ${to} lost its source field`);
        assert.match(f.note ?? '', /derived|converted/i, `${m.slug}: ${to} reads as published`);
        assert.equal(f.ref, m[from].ref, `${m.slug}: ${to} lost the source URL`);
      }
    }
  });

  test('a metric figure the PAGE printed is never overwritten', () => {
    /* The distinction the build now draws. A manufacturer's own centimetre
       figure outranks our arithmetic and must survive untouched; a derived one
       does not, or the conversion forks. */
    let checked = 0;
    for (const m of source) {
      for (const [from, to] of PAIRS) {
        if (!published(m[to])) continue;
        checked += 1;
        assert.deepEqual(
          bySlug.get(m.slug)[to].v,
          m[to].v,
          `${m.slug}: a published ${to} was overwritten by a conversion from ${from}`
        );
      }
    }
    assert.ok(checked > 0, 'no published metric figure in the dataset — this test proved nothing');
  });

  test('where a maker publishes both units and they disagree, we keep theirs', () => {
    /* Béis prints 58 cm and 22.83 in; converted that is 57.9882. Ours is
       arithmetic on their number, theirs is their number. A disagreement below
       EPS_CM (0.3) never moves a verdict, so there is nothing to reconcile —
       and reconciling would replace a manufacturer's figure with our own. */
    let disagreements = 0;
    for (const m of source) {
      for (const [from, to, factor] of PAIRS) {
        if (!m[from] || !published(m[to])) continue;
        const conv = Array.isArray(m[from].v)
          ? m[from].v.map((x) => exact(x, factor))
          : [exact(m[from].v, factor)];
        const pub = Array.isArray(m[to].v) ? m[to].v : [m[to].v];
        const worst = Math.max(...pub.map((v, i) => Math.abs(v - conv[i])));
        if (worst > 0) disagreements += 1;
        assert.deepEqual(
          bySlug.get(m.slug)[to].v,
          m[to].v,
          `${m.slug}: ${to} drifted from the published figure toward the conversion`
        );
        /* A disagreement past EPS_CM is allowed — it is a fact about the
           manufacturer's page, and Rimowa's really does disagree with itself
           by 1.13 cm on width. What is NOT allowed is resolving one silently.
           Below EPS nothing can move a verdict, so it needs no declaration;
           above it, the record must say so. */
        if (worst >= 0.3) {
          const declared = (m.conflicts ?? []).some((c) => c.field === to || c.field === from);
          assert.ok(
            declared,
            `${m.slug}: ${to} and ${from} disagree by ${worst.toFixed(3)} cm — past EPS_CM, so ` +
              'the record must declare it in `conflicts` rather than resolve it silently'
          );
        }
      }
    }
    assert.ok(disagreements > 0, 'no maker publishes disagreeing units — nothing was exercised');
  });

  test('no researched bag is left without dimensions', () => {
    /* The end state, stated without reference to units: if someone went to the
       manufacturer's page, the bag must end up sized — or it never appears. */
    for (const m of source) {
      const b = bySlug.get(m.slug);
      if (!(m.external_in || m.external_cm || m.claimed_cm || m.claimed_in)) continue;
      assert.ok(
        b.external_cm || b.claimed_cm,
        `${m.slug} was researched at the manufacturer but is still unsized — it will not appear on the site`
      );
    }
  });
});
