import { allowanceDimensions } from './createGateSizer';
import type { FitEvaluation } from './fitVisual';
import { bindingPhysicalAxis } from './fitVisual';
import type { BagDimensions, MeasurementAxis } from './types';

const AXES: MeasurementAxis[] = ['height', 'width', 'depth'];

const AXIS_LABEL: Record<MeasurementAxis, string> = {
  height: 'Height',
  width: 'Width',
  depth: 'Depth',
};

function dimForAxis(dims: BagDimensions, axis: MeasurementAxis): number {
  if (axis === 'height') return dims.heightCm;
  if (axis === 'width') return dims.widthCm;
  return dims.depthCm;
}

export type LimitRow = {
  axis: MeasurementAxis;
  label: string;
  bagCm: number;
  limitCm: number | null;
  binding: boolean;
};

export type LimitsPanel = {
  mode: 'compare' | 'no_cabin' | 'unknown' | 'linear' | 'not_flying';
  limitHeading: string;
  rows: LimitRow[];
  linearBagSum?: number;
  linearMax?: number | null;
  weightLimitKg?: number | null;
  weightShared?: boolean;
  note?: string;
};

export function buildLimitsPanel(opts: {
  bagDims: BagDimensions;
  carrier: { allowance?: { max_cm?: number[] | null; linear_max_cm?: number | null; max_kg?: number | null; weight_shared?: boolean } | null; name?: string };
  result: FitEvaluation;
  fareLabel: string;
}): LimitsPanel {
  const { bagDims, carrier, result, fareLabel } = opts;
  const limitHeading = `${carrier.name ?? 'Airline'} · ${fareLabel}`;
  const bindingAxis = bindingPhysicalAxis(
    [bagDims.heightCm, bagDims.widthCm, bagDims.depthCm],
    result.dimension
  );
  const allowance = allowanceDimensions(carrier.allowance?.max_cm ?? null);

  if (result.not_flying) {
    return { mode: 'not_flying', limitHeading, rows: [], note: 'This airline no longer operates.' };
  }
  if (result.unknown) {
    return { mode: 'unknown', limitHeading, rows: [], note: 'We have not researched this fare yet.' };
  }
  if (result.no_cabin_bag) {
    return { mode: 'no_cabin', limitHeading, rows: [], note: 'No cabin bag on this fare.' };
  }
  if (result.basis === 'linear') {
    const linearBagSum = bagDims.heightCm + bagDims.widthCm + bagDims.depthCm;
    return {
      mode: 'linear',
      limitHeading,
      rows: AXES.map((axis) => ({
        axis,
        label: AXIS_LABEL[axis],
        bagCm: dimForAxis(bagDims, axis),
        limitCm: allowance ? dimForAxis(allowance, axis) : null,
        binding: false,
      })),
      linearBagSum,
      linearMax: carrier.allowance?.linear_max_cm ?? null,
      weightLimitKg: carrier.allowance?.max_kg ?? null,
      weightShared: carrier.allowance?.weight_shared ?? false,
      note: 'This airline also caps the three sides added together.',
    };
  }

  return {
    mode: 'compare',
    limitHeading,
    rows: AXES.map((axis) => ({
      axis,
      label: AXIS_LABEL[axis],
      bagCm: dimForAxis(bagDims, axis),
      limitCm: allowance ? dimForAxis(allowance, axis) : null,
      binding: bindingAxis === axis && (result.delta_cm ?? 0) > 0,
    })),
    weightLimitKg: carrier.allowance?.max_kg ?? null,
    weightShared: carrier.allowance?.weight_shared ?? false,
  };
}

export function fmtCm(v: number) {
  return v.toFixed(1).replace(/\.0$/, '');
}
