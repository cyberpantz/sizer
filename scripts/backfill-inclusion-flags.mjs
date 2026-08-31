#!/usr/bin/env node
/* ONE-TIME MIGRATION. Read the intake's own words, write a structured flag.
 *
 * The first 54 manufacturer records recorded whether wheels and handles are
 * counted in PROSE — "Exterior explicitly includes wheel; handles not
 * explicitly confirmed" — and the researcher then chose the field name
 * (`external_*` vs `claimed_*`) based on that prose. Two problems: the
 * standard lived in 54 separate judgement calls, and it could not be
 * re-audited without re-reading 54 notes.
 *
 * So the flag becomes data. This script derives `includes_wheels` /
 * `includes_handles` from what the intake already wrote, ONCE, and prints
 * every decision so a human can check it. After this, the brief asks for the
 * flag directly and dimSourceOf() applies the rule.
 *
 * DELIBERATELY NOT A BUILD STEP. Regex-on-prose is exactly the fragility this
 * change exists to remove — running it forever would just hide the guesswork
 * one level down. It runs once, the result is committed as explicit values,
 * and the next record carries the flag from the start.
 *
 *   node scripts/backfill-inclusion-flags.mjs           # show what it would do
 *   node scripts/backfill-inclusion-flags.mjs --write   # apply
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'data/manufacturer-bags.json';
const doc = JSON.parse(readFileSync(PATH, 'utf8'));
const write = process.argv.includes('--write');

/* Fields that describe the OUTSIDE of the bag. A packing/interior figure is a
   different claim and is left alone — its rung is already unambiguous. */
const OUTER = ['external_cm', 'external_in', 'claimed_cm', 'claimed_in'];

/* ONLY THE MANUFACTURER'S OWN QUOTE COUNTS AS EVIDENCE.
 *
 * The first version of this read the intake's prose notes too, and got Osprey
 * backwards. Its note says "does not identify these as overall versus packing
 * dimensions or explicitly include wheels and handles" — a NEGATIVE. The
 * negative pattern allowed 60 characters between "does not" and "wheels" and
 * the real sentence has about 75, so the guard missed and the affirmative
 * "include wheels" matched instead. That would have promoted a bag whose own
 * researcher said the page does not say.
 *
 * A near-miss in the expensive direction, from exactly the technique this
 * change exists to abolish. So: the quote is the manufacturer's words and is
 * short, self-contained and citable; our notes are commentary and full of
 * hedges that read as their own opposite. Only the quote is consulted, and a
 * quote that does not affirmatively say "including wheels" yields null — a
 * human decides, or the old inference stands.
 *
 * Deliberately no negative detection: a manufacturer does not write "excluding
 * wheels" in an exterior label, and inferring `false` from silence would move
 * bags DOWN a rung on the strength of a regex. Silence is null. */
function readInclusion(quote, thing) {
  if (!quote) return null;
  const word = thing === 'wheels' ? 'wheels?' : 'handles?';
  const affirmative = new RegExp(
    `(includ\\w*|with|and)\\s+(the\\s+)?[\\w\\s]{0,18}?\\b${word}\\b`,
    'i'
  );
  return affirmative.test(quote) ? true : null;
}

const rows = [];
for (const bag of doc.bags) {
  for (const key of OUTER) {
    const f = bag[key];
    if (!f || typeof f !== 'object') continue;
    if ('includes_wheels' in f) continue; // already explicit — never overwrite

    const wheels = readInclusion(f.quote, 'wheels');
    const handles = readInclusion(f.quote, 'handles');
    if (wheels === null && handles === null) continue;

    rows.push({ slug: bag.slug, key, wheels, handles, quote: f.quote ?? '' });
    if (write) {
      if (wheels !== null) f.includes_wheels = wheels;
      if (handles !== null) f.includes_handles = handles;
    }
  }
}

const yes = rows.filter((r) => r.wheels === true);
const no = rows.filter((r) => r.wheels === false);

console.log(`\n${rows.length} dimension fields given an explicit flag\n`);
console.log(`WHEELS INCLUDED — these become maker_overall, i.e. recommendable (${yes.length})`);
for (const r of yes) {
  const h = r.handles === true ? 'handles too' : r.handles === false ? 'handles unstated' : '';
  console.log(`   ${r.slug.padEnd(32)} ${r.key.padEnd(12)} "${r.quote}"  ${h}`);
}
console.log(`\nWHEELS NOT INCLUDED / NOT STATED — unchanged (${no.length})`);
for (const r of no) console.log(`   ${r.slug.padEnd(32)} ${r.key.padEnd(12)} "${r.quote}"`);

if (write) {
  writeFileSync(PATH, `${JSON.stringify(doc, null, 1)}\n`);
  console.log(`\nwrote ${PATH} — now run: node data/build-bags.mjs && npm test`);
} else {
  console.log('\n(dry run — pass --write to apply)');
}
