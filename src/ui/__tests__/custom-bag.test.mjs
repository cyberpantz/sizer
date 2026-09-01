/* A BAG WE DO NOT STOCK, DESCRIBED BY THE PERSON CARRYING IT.
 *
 * Frank: "We need to be able create a custom personal item (keep it simple with
 * a selector like tote bag, large purse, small backpack, etc)."
 *
 * The catalogue is 57 carry-on suitcases, and measured against the 55 carriers
 * that publish an under-seat box, NOT ONE of them clears even the most
 * permissive. So the moment roles landed, choosing "Personal item" offered a
 * reader 57 bags that all fail and no way to describe the tote they were
 * actually asking about.
 *
 * The design problem is provenance, not UI. A tote has no manufacturer and no
 * published dimensions, and this site runs on the rule that we never print a
 * figure we cannot source. The resolution — Frank's call — is that an archetype
 * is a FORM DEFAULT, not a claim: it prefills three inputs the reader corrects,
 * and what reaches the engine is whatever they leave in the boxes. These tests
 * hold that line, because it is the difference between saving someone typing
 * and inventing a measurement.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { createEngine } from '../../engine/fit.mjs';
import { DIM_SOURCE, isPromotable, toBag, toCarrier } from '../../engine/normalize.mjs';
import { loadCarriers } from '../../lib/data.mjs';
import {
  decodeCustom,
  defaultShape,
  encodeCustom,
  isCustom,
  SHAPES,
  shapeOf,
  shapesFor,
  toCustomRecord,
} from '../custom-bag.mjs';
import { createUnits } from '../units.mjs';

const engine = createEngine();
const carriers = await loadCarriers();

describe('an archetype is a default, never a claim', () => {
  test('"owner" is not one of our provenance rungs', () => {
    /* DIM_SOURCE describes where WE got a number for a bag WE publish. A
       reader's own estimate is neither, and adding it to that enum would put a
       permanent zero row on /methodology, which counts the catalogue per rung. */
    assert.ok(
      !Object.values(DIM_SOURCE).includes('owner'),
      'a reader’s own figure has been added to our sourcing ladder'
    );
  });

  test('a custom bag can never be recommended to anyone else', () => {
    /* isPromotable is the release gate. Someone’s guess about their own tote
       must not become a suggestion on another reader’s screen. */
    for (const shape of SHAPES) {
      const rec = toCustomRecord(encodeCustom({ shape: shape.id, cm: shape.cm }));
      assert.equal(isPromotable(toBag(rec)), false, `${shape.id} is promotable`);
    }
  });

  test('the sizes live in code, not in a data file', () => {
    /* data/ is where researched figures live. Putting plausible-but-invented
       numbers there is how, six months from now, somebody cites them. */
    const src = readFileSync('src/ui/custom-bag.mjs', 'utf8');
    assert.match(src, /export const SHAPES/, 'the shapes have moved');
    assert.doesNotMatch(src, /source_url|verified_at/, 'these are being dressed as research');
  });

  test('every shape carries a plausible size and a softness', () => {
    /* `soft` is not decoration: the engine takes SOFT_COMPRESS_CM off the
       shortest side of a soft bag, so getting it wrong changes the verdict. */
    for (const s of SHAPES) {
      assert.equal(s.cm.length, 3, `${s.id} needs three dimensions`);
      assert.ok(
        s.cm.every((v) => v > 5 && v < 100),
        `${s.id} has an implausible default: ${s.cm}`
      );
      assert.equal(typeof s.soft, 'boolean', `${s.id} does not say whether it is soft`);
    }
  });
});

describe('the shapes offered match what is being carried', () => {
  test('each role has its own list, and neither is empty', () => {
    /* "Duffel" is not an answer to "what is your personal item", and "handbag"
       is not an answer to "what is your carry-on". */
    for (const role of ['cabin', 'personal']) {
      assert.ok(shapesFor(role).length >= 3, `${role} has too few shapes`);
      assert.ok(shapeOf(defaultShape(role)), `${role} has no usable default`);
      assert.equal(shapeOf(defaultShape(role)).role, role);
    }
  });

  test('the personal shapes are the small ones', () => {
    /* Sanity on the defaults themselves: if a "personal item" default were
       suitcase-sized, every reader accepting it would get a wrong answer in
       the expensive direction. */
    for (const s of shapesFor('personal')) {
      assert.ok(
        s.cm[0] <= 45,
        `${s.id} is ${s.cm[0]} cm on its longest side — that is not a personal item`
      );
    }
  });
});

describe('a described bag survives the URL', () => {
  test('shape and size round-trip', () => {
    const slug = encodeCustom({ shape: 'tote', cm: [40, 33, 15] });
    assert.equal(slug, '~tote_40x33x15');
    assert.deepEqual(decodeCustom(slug), { shape: 'tote', cm: [40, 33, 15] });
    assert.ok(isCustom(slug));
  });

  test('A DECIMAL SURVIVES THE ROUND TRIP', () => {
    /* THE BUG THIS TEST EXISTS FOR, and the reason it is written as a round
       trip rather than as two assertions.
       
       The separator used to be '.', which is also what a decimal point is. So
       `~daypack.42x28x38.1` split into three parts, the decoder took the first
       two, and the bag came back 38 cm deep instead of 38.1 — a reader's own
       measurement rounded down by nearly a centimetre, in the generous
       direction.
       
       My first version of this test asserted only the ENCODED string, so it
       passed while the round trip was broken. A codec has to be tested by
       going both ways; checking one half is checking nothing. It took actually
       running the page flow to see it. */
    const U = createUnits({ storage: null, server: true });
    U.set('in');
    const cm = [U.toCm(16), U.toCm(13), U.toCm(15)];
    const slug = encodeCustom({ shape: 'daypack', cm });
    const back = decodeCustom(slug);
    assert.ok(back, `${slug} did not decode`);
    assert.deepEqual(back.cm, [40.6, 33, 38.1], slug);
    /* And it renders back as the numbers they typed. */
    assert.deepEqual(back.cm.map((v) => U.len(v)), [16, 13, 15]);
  });

  test('every shape default round-trips exactly', () => {
    for (const shape of SHAPES) {
      const slug = encodeCustom({ shape: shape.id, cm: shape.cm });
      assert.deepEqual(decodeCustom(slug)?.cm, shape.cm, slug);
      assert.equal(decodeCustom(slug)?.shape, shape.id, slug);
    }
  });

  test('anything a URL can do to it returns null rather than throwing', () => {
    /* A permalink is public. Someone will hand-edit it, a mail client will
       mangle it, and an old link will outlive a shape id. */
    for (const bad of [
      '~tote',
      '~tote_',
      '~tote_40x33',
      '~tote_40x33x15x9',
      '~tote_0x33x15',
      '~tote_-5x33x15',
      '~tote_40x33xNaN',
      '~tote_9999x33x15',
      '_40x33x15',
      '~',
      '',
      null,
    ]) {
      assert.equal(decodeCustom(bad), null, `${JSON.stringify(bad)} should not decode`);
    }
  });

  test('a retired shape keeps the reader’s dimensions', () => {
    /* The label is ours and can go; the numbers are theirs and decide the
       answer. Dropping the whole slot because we renamed an id would break a
       link that was working yesterday. */
    const got = decodeCustom('~nosuchshape_40x33x15');
    assert.deepEqual(got, { shape: null, cm: [40, 33, 15] });
  });

  test('a catalogue slug is never mistaken for a custom one', () => {
    assert.equal(isCustom('away-carryon'), false);
    assert.equal(decodeCustom('away-carryon'), null);
  });
});

describe('the engine treats it like any other bag', () => {
  test('it goes through toBag, so the same validation applies', () => {
    /* Building the engine shape by hand here would be a second implementation
       of toBag — and today that mistake has already turned up in the envelope
       panel and in trip-envelope.mjs itself. */
    const rec = toCustomRecord('~tote_40x33x15');
    const bag = toBag(rec);
    assert.deepEqual(bag.external_cm, [40, 33, 15]);
    assert.equal(bag.soft, true);
    assert.equal(bag.dim_source, 'owner');
  });

  test('nonsense is refused rather than scored', () => {
    /* assertDims is what stops a zero, a negative or a letter reaching a
       verdict. Reached through toCustomRecord returning null first, and through
       toBag throwing if it ever got past. */
    assert.equal(toCustomRecord('~tote_0x33x15'), null);
    assert.throws(() => toBag({ slug: '~x', external_cm: { v: [40, 33, 0] }, dim_source: 'owner' }));
  });

  test('a described laptop bag fails Singapore’s ten-centimetre slot', () => {
    /* The case the whole feature exists for, and one no catalogue bag could
       even ask. A 15 cm-deep tote does not fit under a Singapore seat, and
       until now the site had no way for its owner to find out. */
    const sq = toCarrier(
      carriers.find((c) => c.iata === 'SQ').record,
      'economy'
    );
    const tote = toBag(toCustomRecord('~tote_40x33x15'));
    const r = engine.evaluate(tote, sq, { role: 'personal' });
    assert.equal(r.band, 'wont', `expected a refusal, got ${r.band}`);

    /* And a slim laptop bag clears it, so the answer discriminates rather than
       just failing everything. */
    const slim = toBag(toCustomRecord('~laptop_40x30x9'));
    const ok = engine.evaluate(slim, sq, { role: 'personal' });
    assert.ok(['clears', 'line'].includes(ok.band), `expected a pass, got ${ok.band}`);
  });
});

describe('units go in as well as out', () => {
  test('toCm is the inverse of len, in both systems', () => {
    const U = createUnits({ storage: null, server: true });
    U.set('cm');
    assert.equal(U.toCm(40), 40);
    U.set('in');
    assert.equal(Math.round(U.toCm(16) * 100) / 100, 40.64);
    assert.equal(U.len(U.toCm(16)), 16);
  });

  test('it refuses what a number field can still contain', () => {
    /* An empty box, a minus sign mid-type, a pasted word. Returning null lets
       the caller leave the state alone and repaint, so a half-typed entry can
       never produce a verdict. */
    const U = createUnits({ storage: null, server: true });
    for (const bad of ['', '-3', '0', 'abc', null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(U.toCm(bad), null, `${JSON.stringify(bad)} should not convert`);
    }
  });

  test('2.54 appears once in the codebase’s conversion path', () => {
    /* Two copies of a conversion factor is how a bag typed in inches gets
       judged in centimetres — and that failure is invisible, because 22 would
       simply read "Over" everywhere and look like an answer. */
    const page = readFileSync('src/pages/check.astro', 'utf8');
    assert.doesNotMatch(page, /2\.54/, 'check.astro converts units itself; use U.toCm');
    assert.match(readFileSync('src/ui/custom-bag.mjs', 'utf8').replace(/2\.54/g, ''), /SHAPES/);
  });
});

/* IT HAS TO BE FINDABLE WITHOUT BEING TOLD.
 *
 * Frank, an hour after I shipped it: "Sorry how do I create a custom bag?"
 *
 * It was an item in the bag dropdown. search() orders an empty query BY NAME,
 * so "Describe your own bag…" sat alphabetically between Calpak and Eagle
 * Creek, styled exactly like the 57 products around it — reading as a bag we
 * sell. My comment in the source claimed it was "first in the list", which was
 * simply wrong, and no test contradicted me because I had tested the encoder
 * and the engine and nothing about the way in.
 *
 * A feature nobody can reach is worth what an unbuilt feature is worth. These
 * guards are about the DOOR, which is the part that was broken.
 */
describe('the way in is a control, not a list item', () => {
  const page = readFileSync('src/pages/check.astro', 'utf8');
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '');

  test('it is a button, visible without opening anything', () => {
    /* The page already has this idiom — "+ Add another flight". A verb belongs
       in a control, not hidden among nouns. */
    assert.match(code, /data-customise=/, 'nothing on the page starts a custom bag');
    assert.match(code, /Describe your own bag/, 'the button has lost its label');
  });

  test('it is NOT smuggled back into the picker', () => {
    /* BAG_ITEMS is the catalogue. The moment a verb is added to it, it sorts
       alphabetically into the middle of the products and disappears again.

       EVERY assignment, not the first one. The first version of this guard was
       `code.match(/BAG_ITEMS = [\s\S]*?;/)` — which matched the DECLARATION,
       `let BAG_ITEMS = [];`, near the top of the script. That contains nothing,
       so the assertion passed no matter what was in the real assignment. I put
       the bad code back to check, and the test did not move.

       Third time today a guard has matched the wrong occurrence: the exclusion
       register keyed a slug that did not exist, and the comparator's
       declaration satisfied an assertion meant for its call site. The shape is
       always the same — a regex that finds SOMETHING and is believed because it
       found something. Match all of them, or anchor on what makes the one you
       mean unique. */
    const assignments = [...code.matchAll(/BAG_ITEMS\s*=\s*[\s\S]*?;/g)].map((m) => m[0]);
    assert.ok(assignments.length >= 2, 'expected a declaration and an assignment');
    const real = assignments.filter((a) => a.includes('DATA.bags'));
    assert.equal(real.length, 1, 'the catalogue is built in more than one place');
    assert.doesNotMatch(real[0], /Describe|~/i, 'the way in is back inside the dropdown');
  });

  test('the door opens both ways', () => {
    /* Once a slot is custom the picker shows shapes, not the catalogue. Without
       a way back, a reader who clicked by accident is stuck describing a bag
       they never wanted to describe. */
    assert.match(code, /data-uncustom=/, 'a custom bag cannot be undone');
    assert.match(code, /Pick from our catalogue instead/);
  });

  test('leaving a custom bag empties the slot rather than guessing', () => {
    /* We did not keep whatever they had before, and restoring a bag they have
       not asked for since would be inventing an intention. An empty picker asks
       the question again, which is the honest state. */
    const handler = code.slice(code.indexOf('data-uncustom]'));
    assert.match(handler.slice(0, 500), /slug: ''/);
  });
});

/* ONE SLOT, ONE INPUT.
 *
 * Frank: "It doesn't make sense to both show the Baggage combobox and the
 * custom bag form. If one is active the other is inactive."
 *
 * Both were rendered and both were LIVE, so picking from the combobox would
 * silently overwrite a bag the reader had just described — two controls
 * fighting over one answer, with nothing on screen saying which was in charge.
 * That is worse than a layout problem: it is a control that discards work
 * without asking.
 *
 * Source-level, because the row is built inline in check.astro and cannot be
 * imported. What can be pinned is the structure: the picker mount and the
 * editor are the two arms of ONE ternary, so rendering both is not expressible.
 */
describe('the picker and the description are alternatives', () => {
  const page = readFileSync('src/pages/check.astro', 'utf8');
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '');

  test('the mount and the editor are two arms of one condition', () => {
    assert.match(
      code,
      /\$\{custom \? customEditor\(slot, i\) : `<div data-bag-mount="\$\{i\}"><\/div>`\}/,
      'the picker and the description are no longer mutually exclusive'
    );
  });

  test('the picker is mounted in exactly one place', () => {
    /* Two mounts would let a second combobox reappear beside the editor by a
       different route. */
    const mounts = [...code.matchAll(/data-bag-mount="/g)];
    assert.equal(mounts.length, 1, `data-bag-mount is rendered ${mounts.length} times`);
  });

  test('both modes label the row the same way', () => {
    /* The two controls stand in the same place and answer the same question, so
       a reader switching between them must not see the row rename itself. One
       definition, used by both. */
    assert.match(code, /const bagLabel = \(i\) =>/);
    const uses = [...code.matchAll(/bagLabel\(i\)/g)];
    assert.ok(uses.length >= 2, 'only one mode uses the shared label');
    assert.doesNotMatch(
      code,
      /label: state\.bags\.length > 1 \? `Bag/,
      'the picker has gone back to computing its own label'
    );
  });

  test('a described bag does not print its dimensions twice', () => {
    /* The dimensions line is a READOUT of the catalogue's figure. On a
       described bag the same numbers are already in the inputs, editable. */
    assert.match(code, /custom\s*\?\s*''\s*:\s*`<p class="mt-1 font-mono/);
  });
});
