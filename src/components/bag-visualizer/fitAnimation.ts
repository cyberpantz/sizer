import type * as THREE from 'three';

export type FitAnimationOptions = {
  bagDepthCm: number;
  sizerDepthCm: number;
};

/** Slide the bag fully into the gate sizer, then roll back out. */
export function createFitAnimation(opts: FitAnimationOptions) {
  const { bagDepthCm: bd, sizerDepthCm: sd } = opts;
  const sizerHd = sd / 2;
  const bagBd = bd / 2;
  const gap = Math.max(bd, sd) * 0.28;
  const startZ = sizerHd + bagBd + gap;
  /** Back of bag near the rear of the sizer — fully inside the depth slot. */
  const endZ = -(sizerHd - bagBd);

  const CYCLE_MS = 5200;

  function easeInOut(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }

  function update(bagRig: THREE.Group, elapsedMs: number) {
    const t = (elapsedMs % CYCLE_MS) / CYCLE_MS;
    let z = startZ;
    let tilt = 0;

    if (t < 0.1) {
      z = startZ;
    } else if (t < 0.38) {
      const p = easeInOut((t - 0.1) / 0.28);
      z = startZ + (endZ - startZ) * p;
      tilt = -0.06 * Math.sin(p * Math.PI);
    } else if (t < 0.58) {
      z = endZ;
    } else if (t < 0.82) {
      const p = easeInOut((t - 0.58) / 0.24);
      z = endZ + (startZ - endZ) * p;
      tilt = -0.04 * Math.sin(p * Math.PI);
    } else {
      z = startZ;
    }

    bagRig.position.z = z;
    bagRig.rotation.x = tilt;
  }

  return {
    update,
    travelCm: startZ - endZ,
  };
}
