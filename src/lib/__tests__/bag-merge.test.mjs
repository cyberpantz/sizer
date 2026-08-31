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
      assert.equal(
        b.external_cm?.src,
        'manufacturer',
        `${m.slug} was researched at the maker but the built record still uses ${b.external_cm?.src}`
      );
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
      const cross = (b.conflicts ?? []).find((c) => c.field === 'external_cm');
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
