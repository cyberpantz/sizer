import { evaluate } from '../../engine/fit.mjs';
import { toCarrier } from '../../engine/normalize.mjs';
import type { MeasurementAxis } from './types';

const PHYSICAL: MeasurementAxis[] = ['height', 'width', 'depth'];

/** Map engine binding label (long/wide/deep) to this bag's physical axis. */
export function bindingPhysicalAxis(
  externalCm: number[],
  binding: string | null | undefined
): MeasurementAxis | null {
  if (!binding || binding === 'in total') return null;
  const indexed = externalCm.map((v, i) => ({ v, axis: PHYSICAL[i] }));
  indexed.sort((a, b) => b.v - a.v);
  const slot = { long: 0, wide: 1, deep: 2 }[binding as 'long' | 'wide' | 'deep'];
  if (slot === undefined) return null;
  return indexed[slot]?.axis ?? null;
}

/* THE DRAWING USES THE SAME FIVE BANDS AS EVERYTHING ELSE.
 *
 * This had its own ladder, and it disagreed with the site in two ways.
 *
 * It collapsed `clears` and `line` into one green — but Tight is the whole
 * point of that distinction: legal, inside the published limit, with NO margin.
 * `docs/24` argues the ordering at length and the badge, the shelf and the
 * verdict copy all honour it. The 3D view, which is the most persuasive thing
 * on the page, quietly told a reader with 0 cm to spare that they were fine.
 *
 * And the hexes were hand-copied from the palette, so a change to --color-lime
 * would have moved the badge and left the drawing behind — the same drift the
 * verdict labels were centralised to stop.
 *
 * One source now: BAND_COPY in ui/verdict.mjs carries the CSS variable AND the
 * number, because WebGL cannot take a custom property. */
export { bandHex } from '../../ui/verdict.mjs';

export type FitEvaluation = ReturnType<typeof evaluate>;

export function evaluateFit(
  bag: Parameters<typeof evaluate>[0],
  carrierRecord: Parameters<typeof toCarrier>[0],
  fare: string
) {
  const carrier = toCarrier(carrierRecord, fare);
  const result = evaluate(bag, carrier);
  return { bag, carrier, result };
}
