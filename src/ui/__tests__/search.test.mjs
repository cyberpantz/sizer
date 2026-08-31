/* The ranking behind the airline picker.

   Downshift owns the widget — keyboard, ARIA, the live region. This owns which
   airline comes first, which is domain knowledge no library has: people type
   the two-letter code off their booking confirmation at least as often as they
   type a name.

   Pure on purpose, so it is testable without a browser or a framework — the
   same split as the fit engine. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fold, NO_MATCH, score, search } from '../search.mjs';

const carriers = readdirSync('data/carriers')
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(`data/carriers/${f}`, 'utf8')))
  .map((c) => ({ value: c.iata, name: c.name, code: c.iata }));

const first = (q) => search(q, carriers)[0]?.name;

describe('airline search ranking', () => {
  test('the IATA code wins, because it is what is on the booking', () => {
    /* "BA" as a substring appears in several airline names. Someone typing it
       has their confirmation open. */
    assert.equal(first('BA'), 'British Airways');
    assert.equal(first('ba'), 'British Airways');
    assert.equal(first('FR'), 'Ryanair');
    assert.equal(first('UA'), 'United');
  });

  test('the start of a name works', () => {
    assert.equal(first('brit'), 'British Airways');
    assert.equal(first('ryan'), 'Ryanair');
    assert.equal(first('wizz'), 'Wizz Air');
  });

  test('a space in the query is not a barrier', () => {
    /* "air f" and "airfrance" are the same intention typed two ways. */
    assert.equal(first('air f'), 'Air France');
    assert.equal(first('airfrance'), 'Air France');
    assert.equal(first('air france'), 'Air France');
  });

  test('a word from the middle of the name matches', () => {
    const r = search('france', carriers).map((x) => x.name);
    assert.ok(r.includes('Air France'), `expected Air France in ${JSON.stringify(r)}`);
  });

  test('an empty query returns everything, alphabetically', () => {
    const all = search('', carriers);
    assert.equal(all.length, carriers.length, 'the full list must be browsable like a <select>');
    const names = all.map((x) => x.name);
    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b))
    );
  });

  test('nonsense matches nothing rather than something', () => {
    /* The picker keeps the previous airline when this is empty. If the ranking
       returned a weak match instead, it would look like a suggestion — and a
       suggestion is how you end up checking a bag against the wrong airline. */
    assert.equal(search('zzzqx', carriers).length, 0);
    assert.equal(score('zzzqx', { name: 'Ryanair', code: 'FR' }), NO_MATCH);
  });

  test('ties break alphabetically, so the list never shuffles under the cursor', () => {
    const a = search('air', carriers).map((x) => x.name);
    const b = search('air', [...carriers].reverse()).map((x) => x.name);
    assert.deepEqual(a, b, 'result order depends on input order — the list would reorder itself');
  });

  test('accents and punctuation fold away', () => {
    assert.equal(fold('Düsseldorf-Air'), 'dusseldorfair');
    const items = [{ value: 'x', name: 'Brussels Airlines', code: 'SN' }];
    assert.notEqual(score('brussels', items[0]), NO_MATCH);
  });

  test('every airline in the dataset is reachable by its own code and name', () => {
    /* The failure this catches: a carrier nobody can find, which is
       indistinguishable to the reader from a carrier we do not cover. */
    for (const c of carriers) {
      assert.notEqual(score(c.code, c), NO_MATCH, `${c.name} unreachable by code ${c.code}`);
      assert.notEqual(score(c.name, c), NO_MATCH, `${c.name} unreachable by its own name`);
    }
  });
});
