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

export function bandHex(band: string | null | undefined): number {
  if (band === 'clears' || band === 'line') return 0x14713d;
  if (band === 'likely') return 0x8a5d00;
  if (band === 'gamble') return 0xb4530f;
  if (band === 'wont') return 0xb3261e;
  return 0x736c63;
}

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
