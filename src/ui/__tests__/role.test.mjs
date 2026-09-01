/* ROLES ON /check.
 *
 * A fare grants a SET, not a bag. The interesting failures only exist at the
 * set level — a fare that grants one bag, a weight cap shared across both, a
 * personal item ten centimetres deep — and none of them are expressible while
 * every bag is checked in isolation against the overhead limit.
 *
 * Two kinds of guard here, and the second matters more.
 *
 * The behavioural ones exercise ui/role.mjs directly, which is why that module
 * exists as a module: /check is one 1,100-line .astro file whose script cannot
 * be imported, so anything worth testing has to be somewhere else.
 *
 * The source-level ones read check.astro looking for ONE failure: the page
 * drawing or explaining a limit that is not the one the verdict came from. A
 * bag rendered inside the overhead box under a word computed from the
 * under-seat slot is worse than no picture at all — a picture reads as a
 * measurement, and this one would be lying with the verdict printed beside it.
 * Those bugs are invisible to any behavioural test of role.mjs, because they
 * live in the wiring.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  asRole,
  decodeSlot,
  defaultRole,
  encodeSlot,
  ROLE_COPY,
  ROLES,
  roleLabel,
} from '../role.mjs';

const page = readFileSync('src/pages/check.astro', 'utf8');
const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? '';
const code = script.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the role vocabulary', () => {
  test('there are exactly two roles, and checked is not one', () => {
    /* A checked bag has no gate to be measured at. Offering it would be a
       third answer to a question this site does not ask. */
    assert.deepEqual(ROLES, ['cabin', 'personal']);
  });

  test("each role uses the airline's word, and says where the bag goes", () => {
    /* "Personal item" is imprecise — "under-seat bag" describes it better — but
       it is what appears on every US booking page and gate sign, so it is what
       a reader recognises. Recognition beats precision in a control label. The
       `where` line carries the precision instead, and it is what actually
       settles which bag is which for someone who has never thought in these
       terms. */
    for (const r of ROLES) {
      assert.ok(ROLE_COPY[r].label, `${r} has no label`);
      assert.match(ROLE_COPY[r].where, /overhead|under the seat/i, `${r} does not say where`);
    }
    assert.equal(roleLabel('personal'), 'Personal item');
    assert.equal(roleLabel('nonsense'), 'Carry-on', 'an unknown role should fall back, not blank');
  });
});

describe('a permalink keeps its meaning', () => {
  test('the role travels with the bag', () => {
    /* Without this, a shared link answers a DIFFERENT question from the one on
       the sender's screen: same two bags, both against the overhead limit, no
       sign that one of them was the personal item. An answer that quietly
       changes meaning in transit is worse than no sharing at all. */
    assert.equal(encodeSlot({ slug: 'away-carryon', role: 'personal' }), 'away-carryon:p');
    assert.deepEqual(decodeSlot('away-carryon:p'), { slug: 'away-carryon', role: 'personal' });
  });

  test('the cabin role adds nothing to the URL', () => {
    /* So every link shared before roles existed still resolves to exactly what
       its sender saw, and the common case leaves the query string untouched. */
    assert.equal(encodeSlot({ slug: 'away-carryon', role: 'cabin' }), 'away-carryon');
    assert.deepEqual(decodeSlot('away-carryon'), { slug: 'away-carryon', role: 'cabin' });
  });

  test('a mangled or hostile token falls back rather than throwing', () => {
    assert.equal(asRole('checked'), 'cabin');
    assert.equal(asRole(undefined), 'cabin');
    assert.equal(decodeSlot('away-carryon:x').role, 'cabin');
    assert.equal(decodeSlot('').slug, '');
  });
});

describe('the default is a correction, not an interview', () => {
  test('an under-seat record defaults to the personal role', () => {
    assert.equal(defaultRole({ role: 'underseat' }), 'personal');
  });

  test('everything else defaults to the overhead bin', () => {
    for (const r of ['overhead', 'checked', undefined, null]) {
      assert.equal(defaultRole({ role: r }), 'cabin', `role ${r} should default to cabin`);
    }
    assert.equal(defaultRole(null), 'cabin', 'a missing record must not throw');
  });
});

describe('the page never mixes the two limits', () => {
  /* THE ONE BUG THAT MATTERS. Everything below is about the same failure: a
     number, a drawing or a sentence sourced from one role while the verdict
     beside it came from the other. */

  test('every read of an allowance goes through the role-aware helper', () => {
    /* `carrier.allowance` is the CABIN allowance, and it stays as an alias so
       the rest of the codebase keeps working unchanged. On THIS page, reading
       it directly is how the picture ends up contradicting the word next to it.
       So the page reads it in exactly one place — the definition of
       allowanceFor — and everywhere else goes through that.

       Matched on `.allowance` in any form, optional chaining included, rather
       than on an identifier before the dot: writing `carrier?.allowance` is the
       obvious way to reintroduce this bug and it must not be a loophole. */
    const lines = code.split('\n');
    const helper = lines.findIndex((l) => l.includes('const allowanceFor'));
    assert.ok(helper >= 0, 'allowanceFor has been removed');
    const direct = lines
      .map((line, i) => ({ line, i }))
      /* The helper's own body is the one permitted read. */
      .filter(({ i }) => i < helper || i > helper + 2)
      .filter(({ line }) => /\?\.allowance\b(?!s)|\.allowance\b(?!s)/.test(line))
      .map(({ line, i }) => `${i + 1}: ${line.trim()}`);
    assert.deepEqual(
      direct,
      [],
      'read the allowance through allowanceFor(carrier, role):\n  ' + direct.join('\n  ')
    );
  });

  test('the comparator is given the role', () => {
    /* Checked at the CALL SITE, not just the signature — and that distinction
       cost me a guard. The first version asserted /comparator\([^)]*role\)/
       against the whole file, which the DECLARATION satisfies all by itself: I
       deleted the argument from the call and the test still passed. A parameter
       nobody passes is a parameter that silently defaults, and here it would
       default the drawing back to the overhead box under an under-seat verdict
       — exactly the bug this section exists to catch. */
    assert.match(
      code,
      /function comparator\([^)]*\brole\b[^)]*\)/,
      'the drawing cannot know which box to draw'
    );
    const calls = [...code.matchAll(/(?<!function )\bcomparator\(([^)]*)\)/g)].map((m) => m[1]);
    assert.ok(calls.length > 0, 'nothing calls the comparator');
    for (const args of calls) {
      assert.match(args, /\brole\b\s*$/, `the role is not passed: comparator(${args})`);
    }
  });

  test('the risk control re-evaluates in the same role', () => {
    /* riskEffect() re-runs all three engines to say what the setting did. In
       the wrong role it would report on a verdict the reader is not looking
       at — "on Strict this reads Over" about a different question entirely. */
    assert.match(code, /E\.evaluate\(bag, carrier, \{ role \}\)/);
  });

  test('the envelope is per role', () => {
    /* The under-seat intersection is dramatically smaller than the overhead
       one. Showing the cabin envelope under an under-seat verdict would hand
       the reader a box far too generous, in the expensive direction. */
    assert.match(code, /personalEnvelope/, 'the personal envelope is never used');
    assert.match(code, /personal\s*\n?\s*\?\s*DEFAULT\.personalEnvelope/);
  });

  test('the answer names which question it answered', () => {
    /* Two verdicts for one bag differ only by a limit the reader chose. If the
       card does not say which, the two are indistinguishable in a screenshot —
       and screenshots are how this answer gets shared. */
    assert.match(code, /roleLabel\(role\)/, 'the verdict card does not name the role');
  });
});

describe('an absence is never dressed as a measurement', () => {
  test('"they publish no size" and "we have not looked" read differently', () => {
    /* The taxonomy's whole purpose. Delta was READ and found to publish no
       under-seat dimensions — that is a finding, and a better answer than any
       number, because the true limit is the space beneath one seat on one
       aircraft. Printing "not researched yet" for it would hide our best work
       behind our worst. */
    assert.match(code, /unpublished/, 'the page cannot tell a finding from a gap');
    assert.match(code, /no size published/, 'the leg table has no wording for a finding');
    assert.match(code, /not researched yet/, 'the wording for our own gap has gone');
  });

  test('the fare trap points at the other half of the answer', () => {
    /* On Ryanair Basic every suitcase ever made fails equally, so "Over" tells
       the reader nothing they can act on. The fare still grants a personal
       item, and saying so is the single most useful thing we know about that
       ticket. */
    assert.match(code, /no_cabin_bag[\s\S]{0,900}?Personal item/);
  });
});
