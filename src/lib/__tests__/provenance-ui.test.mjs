/* Any airline the product NAMES as the reason for an answer must arrive with
   the page that answer came from.

   "Set by Ryanair — the tightest limit on your itinerary" is a claim about a
   company's published policy. Without a link it is unverifiable, and an
   unverifiable claim is the thing this site exists not to publish. The rule is
   cheap to state and easy to lose in a refactor, so it is a test.

   Placeholder status must survive catalogue generation, including when the
   researched dataset has no placeholders left. Compare against source records
   rather than requiring an obsolete positive placeholder count. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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
    /* Pin the BEHAVIOUR, not the exact sentence.

       The first version matched the literal string "ticket · ${source(" and
       failed the moment the fare label beside it changed — the citation was
       still there, the copy around it had moved. A guard that breaks on a
       wording change gets "fixed" by deleting it, and then the rule it was
       protecting goes unwatched.

       FOUR surfaces name an airline as the cause of an answer, and each must
       call source() inside its own render function. The fourth is new: a trip
       with a leg that grants no cabin bag now names that airline and fare as
       the reason nothing can be suggested — which is the strongest claim on the
       page, since it tells someone their ticket is the problem. A claim that
       strong needs its citation more than the others, not less. */
    for (const [surface, fn] of [
      ['the per-leg table', 'function legRow'],
      ['the comparator', 'function comparator'],
      /* Was 'function renderAnswer' until the envelope moved into its own
         function. The rule did not change; only where it lives did. */
      ['the envelope', 'function envelopePanel'],
    ]) {
      const start = page.indexOf(fn);
      assert.ok(start > -1, `${fn} is gone — does ${surface} still exist?`);
      const end = page.indexOf('\n  }\n', start);
      const body = page.slice(start, end === -1 ? undefined : end);
      assert.match(body, /\bsource\(/, `${surface} names an airline without citing it`);
    }
  });

  test('every source carrier ships with its actual placeholder status', () => {
    const records = readdirSync('data/carriers')
      .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
      .map((name) => JSON.parse(readFileSync(`data/carriers/${name}`, 'utf8')));
    assert.equal(D.carriers.length, records.length);
    for (const record of records) {
      const shipped = D.carriers.find((c) => c.iata === record.iata);
      assert.ok(shipped, `${record.iata} was dropped from the payload`);
      assert.equal(shipped.record.placeholder, record.placeholder === true, record.iata);
    }
  });
});
