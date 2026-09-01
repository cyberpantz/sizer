import type { BagType, BagVisualProfile, BagVisualizerProps } from './types';

const CORNER: Record<string, BagVisualProfile['cornerRadius']> = {
  underseat: 'medium',
  duffel: 'large',
  backpack: 'large',
};

/** Visual-only overrides where catalogue classification is wrong for rendering. */
const PROFILE_OVERRIDES: Record<string, Partial<BagVisualProfile>> = {
  'away-aluminum': { material: 'aluminum' },
  'rimowa-cabin': { material: 'aluminum' },
  'carl-friedrik-carryon-x': { material: 'aluminum' },
  'briggs-riley-sympatico-global-spinner': { material: 'aluminum' },
};

export function resolveWheelCount(props: BagVisualizerProps): 0 | 2 | 4 {
  if (props.wheels === 2 || props.wheels === 4) return props.wheels;
  if (props.type === '2-wheel roller') return 2;
  if (props.type === 'hardside spinner' || props.type === 'softside spinner') return 4;
  return 0;
}

export function deriveVisualProfile(props: BagVisualizerProps): BagVisualProfile {
  const override = PROFILE_OVERRIDES[props.slug] ?? {};
  if (props.visualProfile) return { ...props.visualProfile, ...override };

  const { type, soft } = props;
  const wheelCount = resolveWheelCount(props);
  let material: BagVisualProfile['material'] = 'hard_shell';

  if (type === 'backpack') material = 'backpack';
  else if (type === 'duffel') material = 'duffel';
  else if (type === 'underseat') material = soft ? 'soft_side' : 'hard_shell';
  else if (soft) material = 'soft_side';

  return {
    material,
    cornerRadius: CORNER[type] ?? (soft ? 'large' : 'medium'),
    frontPocket: type === 'backpack' || (soft && type !== 'duffel'),
    wheelStyle: wheelCount === 4 ? 'double' : 'single',
    ...override,
  };
}

export function bagTypeFromRecord(type: string | null): BagType {
  const known: BagType[] = [
    'hardside spinner',
    'softside spinner',
    '2-wheel roller',
    'underseat',
    'backpack',
    'duffel',
  ];
  return (known.find((t) => t === type) ?? 'hardside spinner') as BagType;
}

export function toBagDimensions(cm: number[]): import('./types').BagDimensions {
  const [heightCm, widthCm, depthCm] = cm;
  return { heightCm, widthCm, depthCm };
}
