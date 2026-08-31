/* Upgrading a bag from a review measurement to the manufacturer's own figure.

   This is the workflow docs/19 puts at the centre of the dataset plan: most of
   our sized bags rest on a review publication's tape measure, and each one is
   raised by going to the maker's product page. Every one of those bags is
   ALREADY in the catalogue via its review, so the upgrade is a merge onto an
   existing record — not a second record.

   build-bags.mjs used to throw on the slug collision, with a comment saying
   the case "needs an explicit merge, never a silent overwrite". It does now,
   and these are the rules that merge has to keep. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { dimSourceOf, isPromotable, toBag } from '../../engine/normalize.mjs';

const built = readdirSync('data/bags')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/bags/${f}`, 'utf8')));

const source = JSON.parse(readFileSync('data/manufacturer-bags.json', 'utf8')).bags;

describe('manufacturer data merged onto a review record', () => {
  test('one record per slug — the upgrade replaces, never duplicates', () => {
    const seen = new Set();
    for (const b of built) {
      assert.ok(!seen.has(b.slug), `${b.slug} appears twice; the merge forked instead of merging`);
      seen.add(b.slug);
    }
  });

  test('every manufacturer entry actually reached the built catalogue', () => {
    for (const m of source) {
      const b = built.find((x) => x.slug === m.slug);
      assert.ok(b, `${m.slug} is in manufacturer-bags.json but not in data/bags`);
      /* THE RULE IS "THE RESEARCH SURVIVES", NOT "THE FIGURE IS EXTERIOR".
       *
       * This has now been wrong in both directions. It was first weakened to
       * `if (m.external_cm)`, which skipped the very case it existed to catch
       * — the Away intake arrived as `external_in`, the build ignored the
       * field, and a researched bag landed unsized and invisible. Restoring it
       * then over-corrected: it demanded `external_cm` from every record, and
       * Béis legitimately has none. Their FAQ calls the dimensions exterior
       * but never confirms wheels and handles are in them, so the intake
       * recorded `claimed_*` rather than `external_*`. That is the discipline
       * working — DIM_SOURCE has a rung for exactly this
       * (MAKER_UNSPECIFIED: shown, never recommended).
       *
       * So: the record must arrive SIZED, from the manufacturer, in whichever
       * unit and at whichever confidence the page supports. Whether it may be
       * promoted is isPromotable()'s question, tested separately below. */
      const dims = [b.external_cm, b.claimed_cm, b.claimed_packing_cm].filter(Boolean);
      assert.ok(
        dims.length,
        `${m.slug} was researched at the maker but the built record has no dimensions — ` +
          'if it came back in imperial, the build must convert it, not skip it'
      );
      /* AT LEAST ONE dimension must carry the maker's name, not specifically
         external_cm.
         This asserted `(external_cm ?? claimed_cm).src === 'manufacturer'` and
         failed on the Away Carry-On Flex, correctly researched: Away prints
         only an interior triple, so the maker figure lands as claimed_cm while
         external_cm rightly keeps the review measurement it already had. The
         `??` picked external_cm, found "review", and called a good record bad.
         The rule is that the research SURVIVES. Which rung it lands on is
         DIM_SOURCE's business, and whether it may be recommended is
         isPromotable's — both tested separately. */
      assert.ok(
        dims.some((d) => d.src === 'manufacturer'),
        `${m.slug} was researched at the maker but no dimension says so — ` +
          `sources are ${dims.map((d) => d.src).join(', ')}`
      );
      for (const field of ['external_in', 'claimed_packing_in', 'weight_lb', 'price_usd']) {
        if (m[field]) assert.deepEqual(b[field], m[field], `${m.slug}: ${field} lost during merge`);
      }
    }
  });

  test('the upgrade makes a bag promotable', () => {
    /* The whole point. A review dimension can be displayed; only the maker's
       own overall figure can be recommended on. */
    for (const m of source) {
      const b = built.find((x) => x.slug === m.slug);
      if (!m.external_cm || !m.claimed_packing_cm) continue;
      assert.equal(dimSourceOf(b), 'maker_overall', m.slug);
      assert.equal(isPromotable(toBag(b)), true, `${m.slug} should be recommendable now`);
    }
  });

  test('reviews survive the merge', () => {
    /* The manufacturer entry carries no reviews. Spreading it over the top
       would erase the awards, caveats and mention counts the review side
       collected — silently, and only visible as bags quietly losing their
       citations. */
    const upgraded = built.filter((b) => b.external_cm?.src === 'manufacturer' && b.mentions > 0);
    assert.ok(upgraded.length > 0, 'no bag has both a maker figure and a review — nothing tested');
    for (const b of upgraded) {
      assert.equal(
        b.reviews.length > 0,
        true,
        `${b.slug} counts ${b.mentions} mentions but its reviews were wiped by the merge`
      );
    }
  });

  test('a superseded review dimension is recorded, not discarded', () => {
    /* Whether the two sources agreed is a fact worth keeping either way: a
       disagreement is a finding this site exists to publish, and an agreement
       tells a reader the earlier number was sound. */
    for (const b of built) {
      if (b.external_cm?.src !== 'manufacturer') continue;
      if (!b.mentions) continue;
      /* TWO KINDS OF CONFLICT share the `external_cm` field name and they are
         not interchangeable:

           - CROSS-SOURCE, generated by the merge — a review measured the bag
             and the manufacturer publishes something else. Carries `from`,
             `to`, `delta_cm` and `agrees`.
           - SAME-PAGE, written by the intake — the manufacturer prints cm and
             inches that disagree once converted. Rimowa's really do, by
             1.13 cm on width. Carries `values`.

         Matching on field alone found Rimowa's same-page entry and demanded
         an `agrees` it was never meant to have. Identify the merge's own
         record by the shape only the merge produces. */
      const cross = (b.conflicts ?? []).find(
        (c) => c.field === 'external_cm' && Array.isArray(c.delta_cm)
      );
      if (!cross) continue; // the review carried no dimension of its own
      assert.equal(
        typeof cross.agrees,
        'boolean',
        `${b.slug}: conflict does not say whether they agree`
      );
      assert.ok(Array.isArray(cross.delta_cm), `${b.slug}: conflict records no per-axis delta`);
    }
  });

  test('no built record silently loses a manufacturer field', () => {
    for (const m of source) {
      const b = built.find((x) => x.slug === m.slug);
      for (const key of ['weight_kg', 'expands_cm', 'claimed_packing_cm']) {
        if (m[key] == null) continue;
        assert.ok(b[key] != null, `${m.slug}: ${key} was researched and did not survive the build`);
        assert.equal(b[key].src, 'manufacturer', `${m.slug}: ${key} lost its provenance`);
      }
    }
  });
});
