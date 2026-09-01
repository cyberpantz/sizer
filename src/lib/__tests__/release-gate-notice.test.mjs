/* THE CONFESSION MUST ONLY APPEAR WHERE IT IS TRUE.
 *
 * A bag page can carry an amber notice: "Shown, not recommended — the
 * dimension above is not the manufacturer's own figure for the outside of the
 * bag." It is the release gate from docs/19 made visible, and it is the most
 * self-critical sentence on the site.
 *
 * IT WAS RENDERING ON ALL 57 BAG PAGES. Twenty bags are genuinely not
 * promotable. Thirty-seven carry the manufacturer's own overall figure — the
 * top rung — and every one of them was published with a notice saying the
 * opposite of the truth about its own sourcing.
 *
 * The cause is worth stating plainly because it has now appeared THREE TIMES
 * in this file's history: `promotable` is not a field on an engine bag.
 * toBag() does not carry it. isPromotable() is a QUESTION you ask, not a
 * property you read. `bag.promotable` returns undefined, `!undefined` is true,
 * and the notice renders unconditionally. The failure is silent in both
 * directions — no error, no empty render, just a confident false statement.
 *
 * Found by fetching the deployed page and reading it, minutes after the first
 * successful deploy. Not by a test, not by review — by looking at the thing.
 * Every guard below exists because looking at the thing does not scale.
 *
 * WHY THE ASSERTIONS ARE ABOUT COUNTS. A source-level guard here is nearly
 * useless: `{!bag.promotable && ...}` and `{!promotable && ...}` differ by one
 * token and a regex pinning either is pinning the SHAPE. So these render the
 * real catalogue through the real gate and compare against the pages that
 * actually get built.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, test } from 'node:test';
import { toBag, isPromotable } from '../../engine/normalize.mjs';
import { loadBags } from '../data.mjs';

const NOTICE = 'Shown, not recommended — the dimension above';

const bags = await loadBags();
const gate = new Map(bags.map((b) => [b.slug, isPromotable(toBag(b))]));

describe('the release gate is a question, not a property', () => {
  test('an engine bag has no `promotable` field to read', () => {
    /* THE ROOT CAUSE, PINNED DIRECTLY. If toBag() ever starts carrying this
       field, the three-times-repeated bug becomes impossible and this test
       should be deleted with a note. Until then, its absence is exactly why
       `bag.promotable` must never appear in a template. */
    for (const b of bags.slice(0, 5)) {
      assert.equal(
        toBag(b).promotable,
        undefined,
        `toBag() now carries .promotable — the guard below is stale`
      );
    }
  });

  test('no page reads .promotable off an engine bag', () => {
    /* Deliberately a substring search rather than a clever regex: any
       occurrence at all is wrong, so there is no pattern to get wrong. */
    for (const page of ['src/pages/bags/[slug].astro', 'src/pages/bags/index.astro']) {
      if (!existsSync(page)) continue;
      const src = readFileSync(page, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.ok(
        !/\bbag\.promotable\b/.test(src),
        `${page} reads bag.promotable, which is always undefined — call isPromotable(bag)`
      );
    }
  });

  test('the catalogue really does split, so the count below means something', () => {
    /* Guards against the vacuous case: if every bag were promotable, "the
       notice appears on non-promotable pages only" would be satisfied by
       never rendering it at all. */
    const yes = [...gate.values()].filter(Boolean).length;
    const no = gate.size - yes;
    assert.ok(yes > 0 && no > 0, `the gate no longer discriminates: ${yes} pass, ${no} fail`);
  });
});

/* The built pages are the real evidence, but dist/ is gitignored, only exists
   after a build, and goes stale the moment the page is edited. Both cases skip
   rather than fail: a fresh clone has no dist, and an old dist proves nothing
   about the current source — failing on either would train people to ignore
   this suite, which for a guard is the same as deleting it.
   Loud about WHY it skipped, though. A guard that quietly does nothing is how
   the bug it catches survived two fixes. */
const PAGE = 'src/pages/bags/[slug].astro';
const stale =
  existsSync('dist/bags') && statSync('dist/bags').mtimeMs < statSync(PAGE).mtimeMs;
const why = !existsSync('dist/bags')
  ? 'no dist/ — run `npm run build` to check the built pages'
  : stale
    ? `dist/ is older than ${PAGE} — rebuild to check the built pages`
    : false;

describe('the built pages agree with the gate', { skip: why }, () => {
  test('the notice appears on exactly the bags that fail the gate', () => {
    const wrong = [];
    for (const [slug, promotable] of gate) {
      const file = `dist/bags/${slug}/index.html`;
      if (!existsSync(file)) continue;
      const shown = readFileSync(file, 'utf8').includes(NOTICE);
      if (shown === promotable) {
        wrong.push(
          `${slug}: gate says ${promotable ? 'promotable' : 'NOT promotable'}, page ${shown ? 'shows' : 'hides'} the notice`
        );
      }
    }
    assert.deepEqual(wrong, [], `${wrong.length} page(s) disagree with the release gate`);
  });
});
