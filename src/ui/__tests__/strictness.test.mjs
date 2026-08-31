/* The enforcement indicator.

   Strictness decides every verdict on the site and was invisible until now.
   These tests hold the two things that make showing it honest rather than
   decorative. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { gambleCeiling } from '../../engine/constants.mjs';
import { enforcementLabel, enforcementNote, isResearched, TIERS, tierFor } from '../strictness.mjs';

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

  test('a score is never shown as a bare number', () => {
    /* "7/10" implies a precision we do not have. These are ordinal tiers. */
    for (let score = 1; score <= 10; score++) {
      assert.doesNotMatch(enforcementLabel(score), /\d/, `score ${score} leaked a number`);
    }
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
