import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DIM_SOURCE } from '../../../engine/normalize.mjs';
import { isVisualizerEligible } from '../eligible.mjs';

describe('isVisualizerEligible', () => {
  test('eligible on trusted exterior dimensions', () => {
    assert.equal(
      isVisualizerEligible({
        external_cm: [55, 40, 23],
        dim_source: DIM_SOURCE.MAKER_OVERALL,
      }),
      true
    );
  });

  test('ineligible on packing-only source', () => {
    assert.equal(
      isVisualizerEligible({
        external_cm: [55, 40, 23],
        dim_source: DIM_SOURCE.MAKER_PACKING,
      }),
      false
    );
  });

  test('ineligible on reseller source', () => {
    assert.equal(
      isVisualizerEligible({
        external_cm: [55, 40, 23],
        dim_source: DIM_SOURCE.RESELLER,
      }),
      false
    );
  });
});
