import * as THREE from 'three';
import type { BagDimensions } from './types';

/** Procedural airport gate sizer — open front, welded frame on a flat deck.
 *
 * Two rules govern every number in here, and both were learned the hard way.
 * They are stated once at the top and referenced below rather than repeated.
 *
 *   1. THE INNER SURFACE IS THE ALLOWANCE.
 *   2. ONE GAUGE, SQUARE SECTION, SHARED COORDINATES.
 */
export function createGateSizer(dims: BagDimensions): THREE.Group {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const scale = Math.min(w, d, h);

  /* RULE 2. SQUARE SECTION, ONE GAUGE THROUGHOUT.
   *
   * The frame was round tube, and two cylinders crossing at a corner never
   * meet: each is cut square to its OWN axis, so the join leaves a notch and
   * the rail reads as overshooting the post. It was also two gauges — posts at
   * `tube`, rails at `tube * 0.9` — so the outer faces sat 0.1 of a tube apart
   * and nothing lined up with anything.
   *
   * A gate sizer is welded box section in real life, and box section is what
   * aligns: flat ends, shared coordinates, corners that close. One half-
   * thickness for every member, so posts and rails cannot drift apart. */
  const t = scale * 0.028;

  /* RULE 1. Every member is pushed out by its own half-thickness, so the clear
     opening measures exactly w x d x h and the frame sits around it. Getting
     this wrong makes the opening smaller than the limit AND the silhouette
     larger, both at once: on Air Astana's 55 x 40 x 23 the first version drew
     a 23 cm slot as 21.7 cm. Twice EPS_CM, so the drawing contradicted the
     verdict printed beside it. */
  const hw = w / 2 + t;
  const hd = d / 2 + t;
  const railY = h + t;

  const frame = new THREE.MeshStandardMaterial({
    color: 0x74808d,
    metalness: 0.1,
    roughness: 0.72,
  });
  /* Every member shares ONE material instance, so the verdict pulse is a single
     colour write rather than a traverse. Exposed on the group because the
     caller animates it and has no other handle on it. */
  group.userData.frameMaterial = frame;
  group.userData.frameBaseHex = 0x74808d;

  /** An axis-aligned square-section member between two points. */
  const member = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number
  ) => {
    /* Extended by a half-thickness at each end so it reaches the CENTRE-LINE of
       whatever it meets. That is what closes a corner: the two members overlap
       by exactly the material they are made of, rather than stopping short and
       leaving a notch. */
    const span = (a: number, b: number) => (a === b ? t * 2 : Math.abs(b - a) + t * 2);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(span(ax, bx), span(ay, by), span(az, bz)),
      frame
    );
    box.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    group.add(box);
  };

  // Uprights.
  for (const [x, z] of [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ]) {
    member(x, 0, z, x, h, z);
  }

  // Top frame — the slot the bag must pass through, clearing h.
  member(-hw, railY, -hd, hw, railY, -hd);
  member(-hw, railY, hd, hw, railY, hd);
  member(-hw, railY, -hd, -hw, railY, hd);
  member(hw, railY, -hd, hw, railY, hd);

  // Back and side braces — open at the front (+Z) where the bag slides in.
  member(-hw, h * 0.55, -hd, hw, h * 0.55, -hd);
  member(-hw, h * 0.35, -hd, -hw, h * 0.35, hd);
  member(hw, h * 0.35, -hd, hw, h * 0.35, hd);
  member(-hw, h * 0.35, -hd, hw, h * 0.35, -hd);
  member(-hw, h * 0.35, hd, hw, h * 0.35, hd);

  /* The deck the bag stands on. Sits BELOW y = 0 so the floor of the slot is
     the limit plane — the bag rests at y = 0 and the full height is clear. */
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(hw * 2 + t * 2, t * 2.4, hd * 2 + t * 2),
    frame
  );
  base.position.set(0, -t * 1.2, 0);
  group.add(base);

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
