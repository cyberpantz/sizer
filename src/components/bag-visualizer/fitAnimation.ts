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

  /* THE MOMENT THE FRAME DECIDES.
   *
   * A gate sizer is not a gauge that reads continuously — it is a slot, and it
   * answers when the bag is IN it. So the alarm fires on arrival, not during
   * the approach: a frame reddening while the bag is still travelling would be
   * pre-judging, and the drawing would be making its claim before the
   * measurement it depends on has been taken.
   *
   * Fast in, faster out, and only across the dwell. Held for the whole time the
   * bag is seated so a reader glancing over mid-cycle still sees the verdict. */
  const SEAT_T = 0.38; // the slide-in completes
  const LIFT_T = 0.58; // the slide-out begins
  const ALARM_IN = 0.042; // ~220ms of the 5.2s cycle
  const ALARM_OUT = 0.03; // ~160ms — the reset is quicker than the alarm

  function update(bagRig: THREE.Group, elapsedMs: number) {
    const t = (elapsedMs % CYCLE_MS) / CYCLE_MS;
    let z = startZ;
    let tilt = 0;

    if (t < 0.1) {
      z = startZ;
    } else if (t < SEAT_T) {
      const p = easeInOut((t - 0.1) / 0.28);
      z = startZ + (endZ - startZ) * p;
      tilt = -0.06 * Math.sin(p * Math.PI);
    } else if (t < LIFT_T) {
      z = endZ;
    } else if (t < 0.82) {
      const p = easeInOut((t - LIFT_T) / 0.24);
      z = endZ + (startZ - endZ) * p;
      tilt = -0.04 * Math.sin(p * Math.PI);
    } else {
      z = startZ;
    }

    bagRig.position.z = z;
    bagRig.rotation.x = tilt;

    /* 0 while approaching and after it has left, 1 while seated. */
    let seated = 0;
    if (t >= SEAT_T && t < LIFT_T) {
      seated = Math.min(1, (t - SEAT_T) / ALARM_IN);
    } else if (t >= LIFT_T && t < LIFT_T + ALARM_OUT) {
      seated = 1 - (t - LIFT_T) / ALARM_OUT;
    }
    return { seated };
  }

  return {
    update,
    travelCm: startZ - endZ,
  };
}
