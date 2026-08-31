/* Any airline the product NAMES as the reason for an answer must arrive with
   the page that answer came from.

   "Set by Ryanair — the tightest limit on your itinerary" is a claim about a
   company's published policy. Without a link it is unverifiable, and an
   unverifiable claim is the thing this site exists not to publish. The rule is
   cheap to state and easy to lose in a refactor, so it is a test.

   The uncomfortable half is the second test. 22 of the 58 carriers here are
   still `placeholder: true` — Ryanair, Lufthansa, American, Delta, British
   Airways, Emirates, Singapore among them — and they produce verdicts on the
   live page today. They have no source URL because nobody has read their page.
   That is a real gap, and the requirement is not that it disappears; it is
   that the UI SAYS SO rather than printing the same confident sentence with
   the link quietly missing. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const D = JSON.parse(readFileSync('public/catalogue.json', 'utf8'));
const page = readFileSync('src/pages/check.astro', 'utf8');

describe('provenance in the UI', () => {
  test('the payload carries a source link for every carrier we have read', () => {
    const researched = D.carriers.filter((c) => !c.record.placeholder);
    assert.ok(researched.length > 0);
    for (const c of researched) {
      assert.ok(
        c.record.source_url,
        `${c.name} is a researched record but ships no source_url — the page cannot cite it`
      );
    }
  });

  test('a carrier with no source is flagged, never silently unlinked', () => {
    /* The failure mode this prevents: `url ? link : ''`. That renders the same
       sentence for a verified airline and an unread one, and the reader cannot
       tell which they are looking at. */
    const fn = page.slice(page.indexOf('function source(iata)'));
    const body = fn.slice(0, fn.indexOf('\n  }\n'));
    assert.match(
      body,
      /has not been read yet/,
      'source() must say when an airline has no recorded source, not return an empty string'
    );
    assert.doesNotMatch(
      body,
      /return\s*''\s*;/,
      'source() returns an empty string somewhere — an unread airline would look identical to a cited one'
    );
  });

  test('every place that names a carrier as the reason also cites it', () => {
    /* Three surfaces name an airline as the cause of an answer: the per-leg
       table, the comparator heading, and the envelope's "set by". Each must
       call source(). */
    for (const marker of [
      'ticket · ${source(',
      'Your bag against',
      'the tightest limit on your itinerary',
    ]) {
      assert.ok(page.includes(marker), `check.astro no longer contains "${marker}"`);
    }
    /* Count call sites, not one spelling of them: two are `${source(...)}` and
       one is `setters.map((x) => source(x.iata))`. An earlier version of this
       test matched only the first spelling and reported a violation that did
       not exist — a guard that cries wolf gets switched off. */
    const sourceCalls = (page.match(/(?<!function )\bsource\(/g) ?? []).length;
    assert.ok(
      sourceCalls >= 3,
      `only ${sourceCalls} source() calls — a surface that names an airline has stopped citing it`
    );
  });

  test('placeholder carriers are still counted honestly, not hidden', () => {
    /* If a placeholder were quietly excluded from the catalogue the links
       problem would "go away" while the site simply answered for fewer
       airlines without saying so. They ship; they are marked. */
    const placeholders = D.carriers.filter((c) => c.record.placeholder);
    assert.ok(
      placeholders.length > 0,
      'placeholders vanished from the payload — were they dropped?'
    );
    for (const c of placeholders) {
      assert.equal(c.record.source_url, null, `${c.name} is a placeholder but claims a source`);
    }
  });
});
