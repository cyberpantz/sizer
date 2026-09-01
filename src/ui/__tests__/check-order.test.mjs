/* THE FLIGHT IS THE FIRST QUESTION.
 *
 * Frank: "What if we swapped the order of Flights and Bags, so a user adds
 * their flights and fare class then adds their bags. We could impose some sort
 * of rules that way."
 *
 * It is not a layout preference, it is an argument about what is KNOWABLE. The
 * old order asked "which bag?" before the page knew whether the ticket allowed
 * one — and on a Ryanair Basic fare the honest first sentence is "this fare
 * includes no cabin bag at any size", which is answerable before the reader has
 * picked anything. Asking for input we may have to invalidate is backwards.
 *
 * It also changes what the bag panel CAN be. Once the fare is known, "you get
 * one cabin bag and one personal item" is a fact rather than a warning, so the
 * slots can start as the fare's own shape instead of a generic "add a bag" that
 * can assemble a set no ticket permits.
 *
 * Source-level: check.astro's script imports a .jsx component, so it cannot be
 * imported. What can be pinned is the order, the absence of a preselected
 * airline, and that nothing downstream assumes a carrier exists.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const page = readFileSync('src/pages/check.astro', 'utf8');
const markup = page.slice(0, page.indexOf('<script>')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const code = page
  .slice(page.indexOf('<script>'))
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('flights come before bags', () => {
  test('the flights panel is rendered first', () => {
    assert.ok(
      markup.indexOf('data-legbox') < markup.indexOf('data-bagbox'),
      'the bag panel is back above the flight panel'
    );
  });

  test('the panel on top has the higher stacking context', () => {
    /* Both panels open a combobox that overhangs the panel below it. This was
       z-20 on bags purely because bags used to be first, so the swap has to
       take the z-index with it or the flight picker opens BEHIND the bag
       panel — which looks like a broken dropdown, not a layering bug. */
    const legZ = markup.match(/class="relative (z-\d+)[^"]*" data-legbox/)?.[1];
    const bagZ = markup.match(/class="relative (z-\d+)[^"]*" data-bagbox/)?.[1];
    assert.ok(legZ && bagZ, 'the panels no longer carry an explicit z-index');
    assert.ok(
      Number(legZ.slice(2)) > Number(bagZ.slice(2)),
      `flights are on top but stack below bags (${legZ} vs ${bagZ})`
    );
  });
});

describe('no airline is preselected', () => {
  test('the page opens on an empty leg, not on whoever sorts first', () => {
    /* It opened on DATA.carriers[0] — Aegean, by alphabet. Tolerable while
       flights were the second panel and a bag was the subject; not once flights
       LEAD and everything below is computed from them, because the whole page
       would then answer a question about an airline the reader never named.
       Same rule the bags already had. */
    assert.match(code, /state\.legs = legs\.length \? legs : \[\{ iata: '', fare: '' \}\]/);
    assert.doesNotMatch(
      code,
      /iata: DATA\.carriers\[0\]/,
      'the first carrier is being preselected again'
    );
  });

  test('adding a flight adds an empty one', () => {
    assert.doesNotMatch(
      code,
      /const c = DATA\.carriers\[0\];/,
      'the add-a-flight button preselects a carrier'
    );
  });

  test('an empty leg never reaches a computation', () => {
    /* carrierOf('') is undefined, so every path that reads a carrier has to go
       through the filter rather than trusting the array. */
    assert.match(code, /const flownLegs = \(\) =>/);
    assert.match(code, /flownLegs\(\)\.map\(\(leg, i\)/, 'score() still maps raw state.legs');
  });

  test('an empty leg is left out of the permalink', () => {
    /* A shared link must describe a trip, not a half-filled form. */
    assert.match(code, /state\.legs\s*\n?\s*\.filter\(\(l\) => l\.iata\)/);
  });

  test('the fare dropdown does not render for an airline nobody chose', () => {
    /* And nor does the regional-jet warning, which would be a claim about a
       fleet we have not been told about. */
    assert.match(code, /const c = leg\.iata \? carrierOf\(leg\.iata\) : null;/);
    assert.match(code, /const regional = c\?\.record\.operates_regional_jets === true;/);
  });
});

describe('the empty states follow the order of the questions', () => {
  test('no flights asks for flights, and says why they come first', () => {
    assert.match(code, /Start with your flights/);
    assert.match(
      code,
      /no cabin bag at any size/,
      'the flights empty state does not say what the fare decides'
    );
  });

  test('flights but no bags asks for bags', () => {
    assert.match(code, /Now add your bags/);
  });

  test('the flights state is checked first', () => {
    /* Order matters: with neither chosen, the page must ask for the flight
       rather than the bag, or the swap has changed nothing about what the
       reader is asked to do first. */
    assert.ok(
      code.indexOf('Start with your flights') < code.indexOf('Now add your bags'),
      'the page asks for a bag before it asks for a flight'
    );
  });
});

/* "ANOTHER" IS A LIE WHEN THERE IS NO FIRST ONE.
 *
 * Frank: "Why are we showing the 'Add another flight' button when I haven't
 * even selected the first one?" — and then, about the bag panel, "Same with the
 * luggage."
 *
 * Both panels offered "+ Add another…" beside a slot that was still empty.
 * Three faults at once: the word is false, the affordance competes with the
 * control the reader is actually meant to use, and clicking it stacks empty
 * rows nobody asked for.
 *
 * So the rule is not "hide it until the first is chosen". It is that nothing
 * offers a SECOND empty slot while an empty one already exists — one condition
 * covering both the opening state and the stacking case.
 *
 * Worth recording that I had this screenshot in front of me one message earlier
 * and answered about the panel's COPY instead. The false affordance was the
 * larger fault and the more visible one.
 */
describe('nothing offers a second empty slot', () => {
  test('both add buttons are gated on every slot being filled', () => {
    assert.match(code, /const allFilled = \(slots, key\) =>/);
    assert.match(code, /allFilled\(state\.bags, 'slug'\)\s*\n?\s*\?/, 'the bag button is ungated');
    assert.match(code, /allFilled\(state\.legs, 'iata'\)\s*\n?\s*\?/, 'the flight button is ungated');
  });

  test('the gate requires a slot to exist AND be filled', () => {
    /* `[].every(...)` is true, so a bare `.every` would show the button on an
       empty array — which is the opening state on a page that has no slots at
       all, and exactly the case this is meant to catch. */
    assert.match(code, /slots\.length > 0 && slots\.every/);
  });

  test('the listeners tolerate the button not being there', () => {
    /* wireInputs runs on every draw, including the draws where the button is
       absent. An unguarded querySelector would throw on the opening render and
       take the whole panel with it. */
    assert.match(code, /\[data-addbag\]'\)\?\.addEventListener/);
    assert.match(code, /\[data-addleg\]'\)\?\.addEventListener/);
  });
});

describe('the bag panel describes a set, not a comparison', () => {
  test('the old comparison copy is gone from both places', () => {
    /* "Add the ones you're choosing between" and "+ Add another bag to
       compare" described the model roles replaced. A carry-on and a personal
       item are carried at the same time — the second bag defaults to the
       personal role and the piece check counts them together — so the panel was
       describing a behaviour it no longer had. */
    const visible = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(visible, /choosing between/, 'the panel still frames bags as alternatives');
    assert.doesNotMatch(visible, /bag to compare/, 'the add button still promises a comparison');
  });
});
