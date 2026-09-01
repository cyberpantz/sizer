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
       the reader a box far too generous, in the expensive direction.

       Asserted against ui/trip-envelope.mjs, which is where this moved when the
       panel became testable — and asserted on the ENGINE call, because the
       first draft of that module took the per-axis minimum itself. */
    const panel = readFileSync('src/ui/trip-envelope.mjs', 'utf8');
    assert.match(panel, /engine\.personalEnvelope/, 'the personal envelope is never used');
    assert.match(panel, /personal \? engine\.personalEnvelope\(carriers\) : engine\.envelope\(carriers\)/);
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

/* EVERY BAG GETS AN ANSWER.
 *
 * Frank: "if I add more than a single piece of luggage the right side panel
 * does not evaluate both only the first one."
 *
 * renderAnswer() opened with `state.bags.find(x => x.slug)` and described that
 * bag alone. The others got a verdict chip in the left column and nothing else,
 * so adding a personal item beside your carry-on made the carry-on's answer
 * disappear.
 *
 * It was defensible exactly once, when bags were ALTERNATIVES — the add button
 * still says "add another bag to compare", and comparing two rollers one at a
 * time is coherent. Roles broke that assumption without anyone revisiting this
 * function: a carry-on and a personal item are not alternatives, they are a set
 * you carry at once.
 *
 * Source-level, because renderAnswer cannot be imported — check.astro's script
 * pulls in a .jsx component. What CAN be pinned is the shape of the mistake:
 * a singular pick where a plural belongs.
 */
describe('more than one bag', () => {
  test('the answer iterates the bags rather than picking one', () => {
    /* `.find(` on state.bags in the answer path is the bug itself. */
    const answer = code.slice(code.indexOf('function renderAnswer'));
    assert.doesNotMatch(
      answer.slice(0, 2000),
      /state\.bags\.find\(/,
      'the answer panel picks a single bag again — every chosen bag needs a card'
    );
    assert.match(code, /chosen\.map\(answerCard\)/, 'nothing renders a card per bag');
  });

  test('the envelope is a trip fact, rendered once per role in use', () => {
    /* Two carry-ons would otherwise print the same box twice, and a carry-on
       plus a personal item needs both — they are wildly different numbers and
       only one of them was ever shown. */
    assert.match(code, /rolesInUse/, 'the envelope is not computed per role');
    assert.match(code, /new Set\(chosen\.map\(\(x\) => x\.role\)\)/);
  });

  test('every bag the reader owns is excluded from the suggestions', () => {
    /* The same off-by-a-set mistake as the answer: the panel excluded one bag
       and would have offered the second one back to them. */
    assert.match(code, /ownSlugs: owned/, 'only one bag is excluded from the suggestions');
    const panel = readFileSync('src/ui/trip-envelope.mjs', 'utf8');
    assert.match(panel, /!ownSlugs\.includes\(b\.slug\)/);
  });
});

/* AN ABSENCE THE AIRLINE OWNS IS NOT AN ABSENCE WE OWN.
 *
 * The engine has kept `unpublished` and `unknown` apart since roles landed, and
 * the leg table has said so — but resultLabel(), which produces the biggest
 * word on the card in display type, flattened both to "Unknown".
 *
 * That is the wrong way round. On Delta, Southwest, Qatar and Aegean somebody
 * DID the work, and the work is what established that no number exists. It is
 * also the only way a reader can tell that checking back later will not help.
 */
describe('the headline word', () => {
  test('a published absence is not reported as our ignorance', async () => {
    const { resultLabel } = await import('../verdict.mjs');
    assert.equal(resultLabel({ unknown: true, unpublished: true }), 'No size published');
    assert.equal(resultLabel({ unknown: true }), 'Unknown');
  });

  test('a fare granting no personal item says so', () => {
    /* Distinct from "Over": every bag fails equally, and the reason is the
       ticket rather than the tape measure. */
    assert.match(code, /no_personal_item/, 'the page cannot see a barred personal item');
  });
});

/* A STATUS BADGE NEEDS A STATUS.
 *
 * Frank, twice on the same chip. First: "the 'No size published' label makes no
 * sense next to the 'Own bag' options." I made the wording vaguer, shipped "No
 * answer", and got the obvious follow-up: "I'm not understanding the 'no
 * answer' label. It looks off. Why is it there?"
 *
 * Because I had fixed the sentence instead of the decision. The question was
 * never how to word it. It was whether a badge belongs in a slot that has no
 * status — and a grey pill reading "No answer", sitting against the shape
 * selector and the dimensions someone is still typing, reads as an error they
 * caused.
 *
 * resultLabel() works where the AIRLINE is named in the same breath: the leg
 * table has the carrier in the next column, the verdict card has a sentence
 * under it beginning "Aegean publishes no size…". This chip has neither, so it
 * says something about the bag or it says nothing.
 */
describe('the bag-row chip', () => {
  test('renders nothing when there is no verdict', async () => {
    /* An airline that publishes no under-seat size, a leg nobody has
       researched, a defunct carrier: none is a fact about this bag, and none
       fits in a pill. The answer card carries all three, with a subject. */
    const { chipLabel } = await import('../verdict.mjs');
    for (const [what, result] of [
      ['a researched absence', { band: null, unknown: true, unpublished: true }],
      ['our own gap', { band: null, unknown: true }],
      ['a defunct airline', { band: null, not_flying: true }],
      ['nothing at all', null],
    ]) {
      assert.equal(chipLabel(result), null, `${what} should render no chip`);
    }
  });

  test('a fare granting no bag DOES earn a badge, about the bag', async () => {
    /* This one is worth shouting: the bag cannot go, and the reader can act on
       it by buying up a fare. "Not allowed" is true of the bag; "No cabin bag"
       is true of the fare and beside a bag reads as "this is not a cabin bag". */
    const { chipLabel } = await import('../verdict.mjs');
    assert.equal(chipLabel({ band: 'wont', no_cabin_bag: true }), 'Not allowed');
    assert.equal(chipLabel({ band: 'wont', no_personal_item: true }), 'Not allowed');
  });

  test('a measured verdict is unchanged — those already describe the bag', async () => {
    const { chipLabel } = await import('../verdict.mjs');
    assert.equal(chipLabel({ band: 'clears' }), 'Fits');
    assert.equal(chipLabel({ band: 'line' }), 'Tight');
    assert.equal(chipLabel({ band: 'wont' }), 'Over');
  });

  test('the row omits the element entirely rather than rendering it empty', () => {
    /* An empty pill is still a pill: padding, a background, a shape where a
       verdict should be. The span has to not exist. */
    const bagRow = code.slice(code.indexOf("el('[data-bagbox]')"), code.indexOf('data-addbag'));
    assert.match(bagRow, /const chip = b \? chipLabel\(worst\?\.result\) : null;/);
    assert.match(bagRow, /chip\s*\?\s*`<span/, 'the chip renders unconditionally');
    assert.doesNotMatch(bagRow, /resultLabel\(/, 'the bag row is back to the sentenced wording');
  });

  test('the leg table keeps the fuller wording, because it has room', () => {
    /* Flattening those would throw away the finding-versus-gap distinction in
       one of the two places with space to state it. */
    const legRow = code.slice(code.indexOf('function legRow'), code.indexOf('function legRow') + 1800);
    assert.match(legRow, /resultLabel\(/, 'the leg table lost its fuller wording');
  });
});
