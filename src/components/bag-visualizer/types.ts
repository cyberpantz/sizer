export type BagDimensions = {
  heightCm: number;
  widthCm: number;
  depthCm: number;
};

export type BagType =
  | 'hardside spinner'
  | 'softside spinner'
  | '2-wheel roller'
  | 'underseat'
  | 'backpack'
  | 'duffel';

export type MaterialPreset =
  | 'hard_shell'
  | 'aluminum'
  | 'soft_side'
  | 'backpack'
  | 'duffel';

export type BagVisualProfile = {
  material: MaterialPreset;
  cornerRadius?: 'small' | 'medium' | 'large';
  ribbing?: 'none' | 'horizontal' | 'vertical';
  frontPocket?: boolean;
  wheelStyle?: 'single' | 'double';
};

export type BagVisualizerProps = {
  slug: string;
  name: string;
  dimensions: BagDimensions;
  packingDimensions?: BagDimensions;
  dimensionSource: string;
  type: BagType;
  wheels: 0 | 2 | 4;
  soft: boolean;
  expandsCm?: number;
  visualProfile?: BagVisualProfile;
  wheelHandleDeltaCm?: [number, number, number] | null;
};

export type ViewPreset = 'front' | 'side' | 'top' | 'default';

export type MeasurementAxis = 'height' | 'width' | 'depth';

export type ProjectedMeasurement = {
  axis: MeasurementAxis;
  valueCm: number;
  line: { x1: number; y1: number; x2: number; y2: number };
  ext1: { x1: number; y1: number; x2: number; y2: number };
  ext2: { x1: number; y1: number; x2: number; y2: number };
  label: { x: number; y: number };
  occluded: boolean;
};
