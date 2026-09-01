import { DIM_SOURCE } from '../../engine/normalize.mjs';

/** Bags whose operative dimension is packing-only or reseller-sourced get no visualizer. */
const INELIGIBLE = new Set([DIM_SOURCE.MAKER_PACKING, DIM_SOURCE.RESELLER]);

export function isVisualizerEligible(bag) {
  if (bag?.external_cm?.length !== 3) return false;
  return !INELIGIBLE.has(bag.dim_source);
}
