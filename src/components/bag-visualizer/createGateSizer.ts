import * as THREE from 'three';
import type { BagDimensions } from './types';

/** Procedural airport gate sizer — open front, solid frame on a flat base.
 *
 * THE INNER SURFACE IS THE ALLOWANCE. Every tube is pushed OUT by its own
 * radius, so the clear opening measures exactly w x d x h — the airline's
 * published box — and the frame sits around it.
 *
 * The first version centred the posts ON the limit plane, which is the natural
 * thing to write and is wrong in both directions at once: it made the clear
 * opening 2 x tube SMALLER than the published limit, and the outer silhouette
 * 2 x tube LARGER. On Air Astana's 55 x 40 x 23 that is a 23 cm slot drawn as
 * a 21.7 cm one. A bag exactly at the limit visibly fouled the rear posts —
 * which is what "the animation overshoots the back of the cage" was, in both
 * top and side view, because it was never a camera problem.
 *
 * The error is ~0.6 cm on a typical carrier. That is twice EPS_CM, the
 * tolerance the engine is careful to the tenth of a centimetre about, so a
 * drawing built this way contradicts the verdict printed beside it. */
export function createGateSizer(dims: BagDimensions): THREE.Group {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const scale = Math.min(w, d, h);
  const tube = scale * 0.028;
  /* Post CENTRES, offset outward by the tube radius so the inner face lands on
     the limit. Same for the rails below, which use tube * 0.9. */
  const hw = w / 2 + tube;
  const hd = d / 2 + tube;
  const rr = tube * 0.9;
  const railW = w / 2 + rr;
  const railD = d / 2 + rr;
  /* The top frame is the slot you must fit through, so it clears h as well. */
  const railY = h + rr;

  const frame = new THREE.MeshStandardMaterial({
    color: 0x74808d,
    metalness: 0.1,
    roughness: 0.72,
  });

  const post = (x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(tube, tube, h, 12), frame);
    m.position.set(x, h / 2, z);
    group.add(m);
  };

  post(-hw, -hd);
  post(hw, -hd);
  post(-hw, hd);
  post(hw, hd);

  const rail = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    const a = new THREE.Vector3(x1, y1, z1);
    const b = new THREE.Vector3(x2, y2, z2);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(tube * 0.9, tube * 0.9, len, 10),
      frame
    );
    bar.position.copy(a).add(dir.multiplyScalar(0.5));
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    group.add(bar);
  };

  // Top frame — the slot you must fit through, clearing h.
  rail(-railW, railY, -railD, railW, railY, -railD);
  rail(-railW, railY, railD, railW, railY, railD);
  rail(-railW, railY, -railD, -railW, railY, railD);
  rail(railW, railY, -railD, railW, railY, railD);

  // Back and side braces — open at the front (+Z) where the bag slides in.
  rail(-railW, h * 0.55, -railD, railW, h * 0.55, -railD);
  rail(-railW, h * 0.35, -railD, -railW, h * 0.35, railD);
  rail(railW, h * 0.35, -railD, railW, h * 0.35, railD);
  rail(-railW, h * 0.35, -railD, railW, h * 0.35, -railD);
  rail(-railW, h * 0.35, railD, railW, h * 0.35, railD);

  /* The deck the bag stands on. Sits BELOW y = 0 so the floor of the slot is
     the limit plane — the bag rests at y = 0 and the full height is clear. */
  const base = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08 + tube * 2, tube * 2.4, d * 1.1), frame);
  base.position.set(0, -tube * 1.2, 0);
  group.add(base);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, tube * 2, tube * 3), frame);
  lip.position.set(0, -tube * 1.2, hd + tube * 1.5);
  group.add(lip);

  return group;
}

export function sizerDeckY(dims: BagDimensions): number {
  const scale = Math.min(dims.widthCm, dims.depthCm, dims.heightCm);
  return scale * 0.028 * 2.4;
}

export function allowanceDimensions(maxCm: number[] | null | undefined): BagDimensions | null {
  if (!maxCm || maxCm.length !== 3) return null;
  const [heightCm, widthCm, depthCm] = maxCm;
  return { heightCm, widthCm, depthCm };
}
