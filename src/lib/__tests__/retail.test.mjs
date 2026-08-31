/* Retail links and reviews — the rules, before there is any data.
 *
 * WHY THE TESTS EXIST BEFORE THE FEATURE. The footer carried "As an Amazon
 * Associate we earn from qualifying purchases" on every page before an account
 * existed, because the plausible complete version of a site got built instead
 * of the true one. These guards make the same mistake fail loudly in this
 * corner: a buy button that appears with no offer, a review that discloses
 * nothing, our own opinion counted as independent. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import {
  citationsFor,
  MERCHANT_KIND,
  needsDisclosure,
  offersFor,
  ourReview,
  SAMPLE_SOURCE,
  sampleDisclosure,
} from '../retail.mjs';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.astro') ? [join(d, e.name)] : []
  );
const bags = readdirSync('data/bags')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/bags/${f}`, 'utf8')));

describe('offers', () => {
  test('an absent retail list is empty, never a guess', () => {
    assert.deepEqual(offersFor({}), []);
    assert.deepEqual(offersFor(null), []);
  });

  test('the manufacturer outranks a retailer, which outranks a marketplace', () => {
    const r = {
      retail: [
        { merchant: 'amazon', kind: MERCHANT_KIND.MARKETPLACE, url: 'https://a.test' },
        { merchant: 'rei', kind: MERCHANT_KIND.RETAILER, url: 'https://r.test' },
        { merchant: 'monos', kind: MERCHANT_KIND.MANUFACTURER, url: 'https://m.test' },
      ],
    };
    assert.deepEqual(
      offersFor(r).map((o) => o.merchant),
      ['monos', 'rei', 'amazon']
    );
  });

  test('an offer with no url is dropped rather than rendered as a dead link', () => {
    const r = { retail: [{ merchant: 'x', kind: 'retailer' }] };
    assert.deepEqual(offersFor(r), []);
  });
});

describe('our review is never counted as independent', () => {
  test('a first-party review does not satisfy the price-band quality floor', async () => {
    /* THE SELF-DEALING TRAP. price-band.mjs uses `reviews[]` as a quality
       floor — a bag nobody has reviewed cannot enter a band, so "budget" never
       fills with junk. If our own review lived in that array it would satisfy
       our own gate, and writing about a bag would make it eligible for our own
       recommendation. Different fields, so it cannot happen by accident. */
    const { hasDecentReviews } = await import('../price-band.mjs');
    const record = {
      reviews: [],
      our_review: {
        status: 'published',
        author: 'Frank Young',
        sample: { how: SAMPLE_SOURCE.PURCHASED },
      },
    };
    assert.equal(hasDecentReviews(record), false, 'our own review satisfied our own quality floor');
    assert.ok(ourReview(record), 'but it is still readable as our review');
  });

  test('an unpublished review is not shown', () => {
    assert.equal(ourReview({ our_review: { status: 'planned' } }), null);
    assert.equal(ourReview({}), null);
  });

  test('citations are third-party only and need a url to be a citation', () => {
    const r = { reviews: [{ publication: 'T+L', url: 'https://t.test' }, { publication: 'X' }] };
    assert.equal(citationsFor(r).length, 1);
  });
});

describe('material connections are disclosed', () => {
  test('a brand-supplied bag always produces a disclosure', () => {
    const rev = { sample: { how: SAMPLE_SOURCE.BRAND_SUPPLIED } };
    assert.ok(needsDisclosure(rev));
    assert.match(sampleDisclosure(rev), /sent us this bag/i);
  });

  test('a gifted bag always produces a disclosure', () => {
    assert.ok(needsDisclosure({ sample: { how: SAMPLE_SOURCE.GIFTED } }));
  });

  test('a purchased bag needs none, and says so anyway', () => {
    const rev = { sample: { how: SAMPLE_SOURCE.PURCHASED } };
    assert.equal(needsDisclosure(rev), false);
    assert.match(sampleDisclosure(rev), /bought this bag/i);
  });

  test('a review with no recorded sample source discloses nothing — and is caught below', () => {
    assert.equal(sampleDisclosure({}), null);
  });

  test('every PUBLISHED review in the catalogue records how we got the bag', () => {
    /* The field that cannot be reconstructed later. Trivial the day the box
       arrives, impossible two years on. Vacuous today because there are no
       reviews; live the moment there is one. */
    const missing = [];
    for (const b of bags) {
      const r = b.our_review;
      if (r?.status !== 'published') continue;
      if (!r.sample?.how) missing.push(`${b.slug}: published review with no sample.how`);
      else if (!Object.values(SAMPLE_SOURCE).includes(r.sample.how))
        missing.push(`${b.slug}: unknown sample.how "${r.sample.how}"`);
      if (!r.author) missing.push(`${b.slug}: published review with no author`);
    }
    assert.deepEqual(missing, [], `reviews missing their provenance:\n  ${missing.join('\n  ')}`);
  });
});

describe('stored links stay honest', () => {
  test('no affiliate-tagged or shortened url is stored in a record', () => {
    /* Tagging is a RENDER-time concern. A tagged URL in the data rots the
       moment a programme changes, and a redirect chain cannot be audited —
       which is the one thing every field in this repo has to survive. */
    const bad = [];
    for (const b of bags) {
      for (const o of b.retail ?? []) {
        if (!o?.url) continue;
        if (/[?&](tag|aff|affid|utm_|ref_?=)/i.test(o.url))
          bad.push(`${b.slug}: ${o.merchant} url carries a tracking tag`);
        if (/geni\.us|amzn\.to|bit\.ly|shrsl|shareasale|redirect/i.test(o.url))
          bad.push(`${b.slug}: ${o.merchant} url is a shortener, not the real destination`);
      }
    }
    assert.deepEqual(bad, [], `affiliate plumbing in the data:\n  ${bad.join('\n  ')}`);
  });

  test('nothing renders an offer or a review yet', () => {
    /* THE POINT OF THE WHOLE EXERCISE. The schema may exist before the data;
       the UI may not exist before the data, because a rendered element is a
       claim. When the first offer is recorded, delete this test in the same
       commit that builds the button — deliberately, not by accident. */
    const offenders = [];
    for (const f of walk('src')) {
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      if (/offersFor\(|ourReview\(|sampleDisclosure\(/.test(src)) offenders.push(f);
    }
    assert.deepEqual(
      offenders,
      [],
      'a page renders retail or review data before any exists:\n  ' + offenders.join('\n  ')
    );
  });
});
