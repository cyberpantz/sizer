/* The enforcement indicator.

   Strictness decides every verdict on the site and was invisible until now.
   These tests hold the two things that make showing it honest rather than
   decorative. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { gambleCeiling } from '../../engine/constants.mjs';
import {
  enforcementLabel,
  enforcementNote,
  enforcementScore,
  enforcementSteps,
  isResearched,
  SCALE_MAX,
  strictnessIcon,
  TIERS,
  tierFor,
} from '../strictness.mjs';

describe('enforcement indicator', () => {
  test('the tiers are the engine’s tiers', () => {
    /* If these drifted, the page would describe an airline as lenient while
       the engine gave it no slack at all — the reader would be reading one
       model and getting answers from another. */
    for (let score = 1; score <= 10; score++) {
      const tier = tierFor(score);
      const ceiling = gambleCeiling(score);
      const strictest = tier === TIERS.at(-1);
      assert.equal(
        ceiling === 0,
        strictest,
        `score ${score}: tier says "${tier.label}" but gambleCeiling gives ${ceiling}`
      );
    }
  });

  test('a score is always paired with its tier word', () => {
    /* The score is shown now — I had hidden it behind the tier, and that was
       my judgement rather than a project rule. What matters is that "9" never
       appears alone: the tier word is what stops a reader treating a prior as
       a measurement, and the pairing is the whole reason showing the number is
       safe. */
    for (let score = 1; score <= 10; score++) {
      assert.equal(enforcementScore(score), score);
      assert.ok(enforcementLabel(score), `score ${score} has no tier word to travel with`);
    }
  });

  test('the meter never overflows its scale', () => {
    assert.equal(enforcementSteps(0), 0);
    assert.equal(enforcementSteps(9), 9);
    assert.equal(enforcementSteps(99), SCALE_MAX);
    assert.equal(enforcementSteps(null), 0);
  });

  test('an unscored carrier is not described as lenient', () => {
    /* Absence of a score is not evidence of leniency — the same rule the
       engine applies when it fails an unknown strictness safe. */
    assert.equal(enforcementLabel(null), 'Enforcement unknown');
    assert.equal(tierFor(undefined), null);
    assert.match(enforcementNote(null), /Nobody has looked/);
  });

  test('a prior says it is a prior', () => {
    /* EVERY score in the dataset today is a type/region prior. Presenting one
       as a finding is the exact failure this project exists to avoid. */
    const prior = { score: 7, score_basis: 'type_region_prior_only', evidence: [] };
    assert.equal(isResearched(prior), false);
    assert.match(enforcementNote(prior), /starting assumption/);
  });

  test("the airline's own researched claim wins over our adjective", () => {
    const withEvidence = {
      score: 9,
      score_basis: 'type_region_prior_only',
      evidence: [{ claim: 'They measure bags at the gate and pay staff a bonus.' }],
    };
    assert.equal(
      enforcementNote(withEvidence),
      'They measure bags at the gate and pay staff a bonus.'
    );
    assert.doesNotMatch(enforcementNote(withEvidence), /starting assumption/);
  });

  test('the browser gets the basis, not just the score', () => {
    /* The payload used to ship { score } alone, so the page could not tell a
       prior from a finding. */
    const D = JSON.parse(readFileSync('public/catalogue.json', 'utf8'));
    const withClaim = D.carriers.filter((c) => (c.record.strictness?.evidence ?? []).length);
    assert.ok(withClaim.length > 10, `only ${withClaim.length} carriers ship a claim`);
    for (const c of D.carriers) {
      assert.ok(
        'score_basis' in (c.record.strictness ?? {}),
        `${c.name} ships a score with no basis — the page cannot say whether it is researched`
      );
    }
  });
});

describe('the strictness icon', () => {
  test('every tier gets a distinct number of filled bars', () => {
    /* If two tiers drew the same icon it would be decoration rather than
       information. */
    const filled = (svg) =>
      (svg.match(/fill="var\(--color-(green|amber|orange|red)\)"/g) ?? []).length;
    const counts = [3, 5, 7, 9].map((s) => filled(strictnessIcon(s)));
    assert.deepEqual(counts, [1, 2, 3, 4]);
  });

  test('the level survives greyscale', () => {
    /* Colour alone fails a colour-blind reader and fails in print. Bar HEIGHT
       must carry the same information, so each successive bar is taller. */
    for (const score of [3, 5, 7, 9]) {
      const heights = [...strictnessIcon(score).matchAll(/height="([\d.]+)"/g)]
        .map((m) => Number(m[1]))
        .filter((h) => h < 14); // the bars, not the svg itself
      for (let i = 1; i < heights.length; i++) {
        assert.ok(heights[i] > heights[i - 1], `bar ${i} is not taller than bar ${i - 1}`);
      }
    }
  });

  test('an unscored carrier draws an empty icon, not a low one', () => {
    /* "We have not scored this" must not look like "this airline is lenient" —
       the same rule the engine applies when it fails an unknown strictness
       safe. */
    const svg = strictnessIcon(null);
    assert.doesNotMatch(svg, /fill="var\(--color-(green|amber|orange|red)\)"/);
    assert.match(svg, /aria-label="Enforcement not scored"/);
  });

  test('the icon is labelled for a screen reader', () => {
    /* It is the only carrier of this information for a sighted reader
       skimming; it must not be silent for anyone else. */
    assert.match(strictnessIcon(9), /role="img"/);
    assert.match(strictnessIcon(9), /aria-label="Strictness 9 of 10: measures every bag"/);
  });
});
