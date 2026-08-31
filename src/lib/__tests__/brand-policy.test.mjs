/* A brand's own answer to "do the listed dimensions include wheels?"
 *
 * Travelpro publishes it in their FAQ: they print both numbers, and the
 * overall one includes wheels and carry handles. That settles every Travelpro
 * bag at once. Re-deriving it from each product page is how one answer becomes
 * forty judgement calls — the exact failure that left 20 well-researched bags
 * unrecommendable.
 *
 * THE SAFETY RULE, and it is the whole reason this is not a blanket flag.
 * Frank put it in one line: the FAQ settles it "as long as we were able to
 * scrape the overall dimensions". A brand policy says what the OVERALL figure
 * contains. It says nothing about which figure WE captured. Travelpro prints
 * both on the same page, so a record holding a single unlabelled number could
 * be either — and the smaller one would make a bag look like it fits when it
 * does not.
 *
 * So the policy applies only where the stored figure is confirmably the
 * overall one: materially larger than that same record's own packing figure.
 * Two Travelpro bags fail that test and are deliberately left alone. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { DIM_SOURCE, dimSourceOf } from '../../engine/normalize.mjs';

const policy = JSON.parse(readFileSync('data/brand-dimension-policy.json', 'utf8')).brands;
const bag = (slug) => JSON.parse(readFileSync(`data/bags/${slug}.json`, 'utf8'));

describe('the brand policy is applied only where it can be confirmed', () => {
  test('a Travelpro figure bigger than its own packing figure gets the flag', () => {
    const b = bag('travelpro-maxlite5-international');
    const f = b.external_cm ?? b.claimed_cm;
    assert.equal(f.includes_wheels, true);
    assert.equal(f.includes_handles, true);
    assert.equal(dimSourceOf(b), DIM_SOURCE.MAKER_OVERALL);
  });

  test('the flag carries the brand statement that justifies it', () => {
    /* Provenance does not stop at the brand boundary. A flag set from a policy
       has to name the policy, or a reader auditing that bag finds a boolean
       with no argument behind it. */
    const b = bag('travelpro-maxlite5-international');
    const f = b.external_cm ?? b.claimed_cm;
    assert.match(f.note ?? '', /Travelpro states brand-wide/);
    assert.match(f.note ?? '', /include wheels and carry handles/);
    assert.match(f.note ?? '', /exceeds this record's own packing figure/);
  });

  test('a Travelpro bag with NO packing figure is left alone', () => {
    /* Frank's caveat, as a test. These records hold one number and the brand
       publishes two, so we cannot tell which we have. The policy is silent
       here and must stay silent — assuming would answer the question the
       caveat asks. */
    for (const slug of ['travelpro-maxlite5-21', 'travelpro-maxlite5-compact']) {
      const b = bag(slug);
      assert.ok(!b.claimed_packing_cm?.v, `${slug} now has a packing figure — revisit this test`);
      const f = b.external_cm ?? b.claimed_cm;
      assert.equal(
        f.includes_wheels,
        undefined,
        `${slug} was flagged from the brand policy without a packing figure to confirm ` +
          'which of the two published numbers we actually hold'
      );
    }
  });

  test('every brand policy states its evidence and admits what is missing', () => {
    /* A policy is a claim about a company. Same standard as everything else:
       quote it, date it, and say plainly when the URL is not yet recorded
       rather than letting a null read as "no source needed". */
    for (const [brand, p] of Object.entries(policy)) {
      assert.ok(p.quote, `${brand}: no quote`);
      assert.ok(p.source, `${brand}: no source description`);
      assert.ok(p.at, `${brand}: no date`);
      if (!p.url) {
        assert.match(
          p.url_status ?? '',
          /PENDING/,
          `${brand}: url is null and nothing says why or that it is outstanding`
        );
      }
    }
  });

  test('a policy never reaches a packing figure', () => {
    /* The policy describes the OVERALL number. Applying it to a figure the
       maker labelled as the case body would relabel the one dimension we know
       is not what an airline measures. */
    for (const slug of ['travelpro-maxlite5-international', 'travelpro-versapack']) {
      const b = bag(slug);
      for (const key of ['claimed_packing_cm', 'claimed_packing_in']) {
        if (!b[key]) continue;
        assert.notEqual(
          b[key].includes_wheels,
          true,
          `${slug}.${key}: the packing figure was flagged as including wheels`
        );
      }
    }
  });
});
