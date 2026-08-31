/* Strictness scoring.

   The score decides which band an overage lands in, so a wrong score sends
   someone to a gate with a bag that will not fit. The tests that matter are the
   ones about NOT KNOWING — an unresearched carrier must never read as a lax one. */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  COMPONENTS,
  MAX_RAW,
  MIN_CONFIDENCE,
  NO_PRIOR,
  priorFor,
  REPORT_FLOOR,
  resolve,
  scoreFrom,
  TYPE_PRIOR,
} from '../strictness.mjs';

const yes = { v: true },
  no = { v: false };
const all = (v) => Object.fromEntries(Object.keys(COMPONENTS).map((k) => [k, { v }]));

describe('derived from components', () => {
  test('every enforcement behaviour present scores at the top', () => {
    assert.equal(scoreFrom(all(true)).score, 10);
  });

  test('none present scores at the bottom, whatever the prior said', () => {
    assert.equal(
      scoreFrom(all(false), null, 'ulcc').score,
      1,
      'full evidence must be able to overturn the business-model prior entirely'
    );
  });

  test('is monotonic — adding an enforcement behaviour never lowers the score', () => {
    const keys = Object.keys(COMPONENTS);
    let prev = 0;
    for (let i = 0; i <= keys.length; i++) {
      const c = Object.fromEntries(keys.map((k, j) => [k, { v: j < i }]));
      const s = scoreFrom(c).score;
      if (s != null) {
        assert.ok(s >= prev, `score fell from ${prev} to ${s}`);
        prev = s;
      }
    }
  });

  test('the same facts always give the same score', () => {
    const c = {
      published_gauging: yes,
      staff_incentive: no,
      weighs_at_checkin: yes,
      fee_asymmetry: yes,
    };
    assert.equal(scoreFrom(c).score, scoreFrom(c).score);
  });
});

describe('not knowing is not the same as lax', () => {
  test('an unresearched carrier scores from its business model, flagged provisional', () => {
    const s = scoreFrom({}, null, 'ulcc');
    assert.equal(s.score, TYPE_PRIOR.ulcc.score);
    assert.equal(s.source, 'prior');
    assert.equal(s.provisional, true, 'a prior must never present as a finding');
  });

  test('a carrier with no type at all assumes enforcement', () => {
    const s = scoreFrom({});
    assert.equal(s.score, NO_PRIOR.score);
    assert.ok(s.score >= 7, 'unknown must lean strict, never lax');
  });

  test('below the confidence floor the score stays provisional', () => {
    const s = scoreFrom({ published_gauging: yes }, null, 'full_service');
    assert.ok(s.confidence < MIN_CONFIDENCE);
    assert.equal(s.provisional, true, 'one component out of four cannot produce a finding');
    assert.ok(s.score < 10, 'and it must not be dragged all the way to the top by one answer');
  });

  test('at the floor, the score stops being provisional', () => {
    const s = scoreFrom({ published_gauging: yes, staff_incentive: yes }, null, 'full_service');
    assert.ok(s.confidence >= MIN_CONFIDENCE);
    assert.equal(s.provisional, false);
    assert.deepEqual(s.missing.sort(), ['fee_asymmetry', 'weighs_at_checkin']);
  });

  test('unknown components are not counted as absent', () => {
    const partial = scoreFrom(
      { published_gauging: yes, staff_incentive: yes },
      null,
      'full_service'
    );
    const explicit = scoreFrom(
      { published_gauging: yes, staff_incentive: yes, weighs_at_checkin: no, fee_asymmetry: no },
      null,
      'full_service'
    );
    assert.ok(
      partial.score > explicit.score,
      'scoring unknowns as "no" would understate every half-researched carrier'
    );
  });
});

describe('observed outcomes', () => {
  const lax = all(false);

  test('a handful of reports cannot move a score', () => {
    const s = scoreFrom(lax, { n: 5, stop_rate: 1 });
    assert.equal(s.source, 'components');
    assert.equal(s.score, 1, 'five angry reports must not rewrite a carrier');
  });

  test('a real sample blends, and says so', () => {
    const s = scoreFrom(lax, { n: REPORT_FLOOR + 5, stop_rate: 0.8 });
    assert.equal(s.source, 'blended');
    assert.ok(s.score > 1);
  });

  test('a large sample wins outright — what happens beats what we assumed', () => {
    const s = scoreFrom(lax, { n: REPORT_FLOOR * 4, stop_rate: 0.8 });
    assert.equal(s.source, 'observed');
    assert.ok(s.score >= 7, `expected the evidence to dominate, got ${s.score}`);
  });

  test('reports alone can score a carrier with no research at all', () => {
    const s = scoreFrom({}, { n: 100, stop_rate: 0.9 }, 'full_service');
    assert.ok(s.score >= 8);
    assert.equal(s.source, 'observed');
  });
});

describe('overrides', () => {
  test('a human can pin a score, and it is labelled', () => {
    const r = resolve({
      components: all(false),
      override: { score: 9, reason: 'policy changed mid-audit' },
    });
    assert.equal(r.score, 9);
    assert.equal(r.source, 'override');
    assert.equal(r.override.reason, 'policy changed mid-audit');
  });

  test('a legacy hand-assigned score still works but is flagged', () => {
    const r = resolve({ score: 7 });
    assert.equal(r.score, 7);
    assert.equal(
      r.source,
      'legacy_manual',
      'so it shows up in an audit rather than passing for derived'
    );
  });

  test('components beat a stale hand-assigned number', () => {
    const r = resolve({ score: 2, components: all(true) });
    assert.equal(r.score, 10);
    assert.equal(r.source, 'components');
  });
});

describe('weights', () => {
  test('the two tier-1, self-published signals carry the most weight', () => {
    const w = Object.entries(COMPONENTS)
      .map(([k, c]) => [k, c.weight])
      .sort((a, b) => b[1] - a[1]);
    assert.deepEqual(
      w
        .slice(0, 2)
        .map((x) => x[0])
        .sort(),
      ['fee_asymmetry', 'published_gauging'],
      'the heaviest components must be the ones we can actually source'
    );
  });

  test('every component states where its answer comes from', () => {
    for (const [k, c] of Object.entries(COMPONENTS)) {
      assert.ok(
        c.source,
        `${k} has no source — an unsourceable component is a guess with a schema`
      );
      assert.ok(c.asks, `${k} does not say what question it answers`);
    }
  });

  test('MAX_RAW tracks the table rather than being hard-coded', () => {
    assert.equal(
      MAX_RAW,
      Object.values(COMPONENTS).reduce((n, c) => n + c.weight, 0)
    );
  });
});

describe('admin override — the operator must be able to act on reports', () => {
  const comps = {
    published_gauging: yes,
    staff_incentive: no,
    weighs_at_checkin: no,
    fee_asymmetry: yes,
  };

  test('an admin can pin a score for one carrier', () => {
    const r = resolve({
      components: comps,
      override: { score: 5, reason: 'sizers removed', by: 'frank', at: '2026-08-30' },
    });
    assert.equal(r.score, 5);
    assert.equal(r.source, 'override');
  });

  test('the derived score survives, so the disagreement is visible', () => {
    const r = resolve({
      components: comps,
      override: { score: 9, reason: 'x', by: 'frank', at: '2026-08-30' },
    });
    const expected = scoreFrom(comps).score;
    assert.equal(r.derived_score, expected);
    assert.equal(
      r.disagrees_by,
      9 - expected,
      'seeing HOW MUCH a human overrode the model is the point'
    );
  });

  test('it carries who and when', () => {
    const r = resolve({
      components: comps,
      override: { score: 5, reason: 'x', by: 'frank', at: '2026-08-30' },
    });
    assert.equal(r.override.by, 'frank');
    assert.equal(r.override.at, '2026-08-30');
  });

  test('an override goes stale and says so', () => {
    const r = resolve(
      { components: comps, override: { score: 5, reason: 'x', by: 'f', at: '2024-01-01' } },
      new Date('2026-08-30')
    );
    assert.equal(r.override.status.stale, true);
    assert.ok(r.override.status.days > 180);
  });

  test('a fresh override is current', () => {
    const r = resolve(
      { components: comps, override: { score: 5, reason: 'x', by: 'f', at: '2026-08-01' } },
      new Date('2026-08-30')
    );
    assert.equal(r.override.status.stale, false);
  });

  test('an undated override is treated as stale, not as fresh', () => {
    const r = resolve({ components: comps, override: { score: 5, reason: 'x' } });
    assert.equal(r.override.status.state, 'undated');
    assert.equal(r.override.status.stale, true, 'no date means nobody can tell if it still holds');
  });

  test('a per-carrier review window can be shortened', () => {
    const r = resolve(
      { components: comps, override: { score: 5, reason: 'x', at: '2026-06-01', review_days: 30 } },
      new Date('2026-08-30')
    );
    assert.equal(r.override.status.stale, true, 'a volatile carrier can demand a tighter window');
  });
});

describe('the business-model prior', () => {
  test('a ULCC starts stricter than a legacy carrier', () => {
    assert.ok(
      TYPE_PRIOR.ulcc.score > TYPE_PRIOR.full_service.score,
      'ancillary fees ARE the ULCC revenue model — enforcement is structural'
    );
  });

  test('every prior explains itself', () => {
    for (const [t, p] of Object.entries(TYPE_PRIOR)) {
      assert.ok(p.why, `${t} has no stated reason`);
      assert.ok(p.score >= 1 && p.score <= 10);
    }
  });

  test('an unrecognised type falls back to assuming enforcement', () => {
    assert.equal(priorFor('spaceline').score, NO_PRIOR.score);
    assert.ok(priorFor(undefined).score >= 7);
  });

  test('evidence overrides the prior in proportion to how much we have', () => {
    const none = scoreFrom({}, null, 'ulcc').score;
    const half = scoreFrom({ published_gauging: no, fee_asymmetry: no }, null, 'ulcc').score;
    const full = scoreFrom(all(false), null, 'ulcc').score;
    assert.ok(
      none > half && half > full,
      'a ULCC that demonstrably does not enforce must be able to score low'
    );
  });

  test('a prior alone is always provisional', () => {
    for (const t of Object.keys(TYPE_PRIOR)) {
      assert.equal(
        scoreFrom({}, null, t).provisional,
        true,
        'the published content still has to be read for every carrier'
      );
    }
  });
});

describe('the region shift', () => {
  /* ⚠️ These thresholds were fitted against 24 hand-assigned scores that the
     same author wrote. Agreement therefore proves consistency, NOT accuracy —
     it partly measures the model reproducing its author's assumptions. The
     independent justification is mechanical: European legacy carriers gauge at
     the gate as routine, Gulf carriers weigh as standard, and American removed
     its sizers in Oct 2025. Re-fit from `reports` when real outcomes exist. */
  test('a European legacy carrier starts stricter than a US one', () => {
    assert.ok(priorFor('full_service', 'EU').score > priorFor('full_service', 'NA').score);
  });

  test('a ULCC does not get stricter for being European — it is already at the ceiling', () => {
    assert.equal(
      priorFor('ulcc', 'EU').score,
      priorFor('ulcc', 'NA').score,
      'the shift describes legacy carriers moving toward ULCC practice, not the region itself'
    );
  });

  test('an unknown region leaves the prior alone', () => {
    assert.equal(priorFor('full_service', 'ANTARCTICA').score, priorFor('full_service').score);
  });

  test('the shift never pushes a prior outside 1-10', () => {
    for (const t of [...Object.keys(TYPE_PRIOR), 'nonsense']) {
      for (const r of ['EU', 'ME', 'AS', 'NA', null, 'XX']) {
        const s = priorFor(t, r).score;
        assert.ok(s >= 1 && s <= 10, `${t}/${r} gave ${s}`);
      }
    }
  });

  test('the reason string records why the prior moved', () => {
    assert.match(priorFor('full_service', 'EU').why, /EU: \+2/);
  });
});
