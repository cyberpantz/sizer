import * as THREE from 'three';

/* A ROUNDED BOX THAT IS ACTUALLY THE SIZE YOU ASKED FOR, SPANNING 0..h.
 *
 * THE BUG. ExtrudeGeometry adds its bevel OUTSIDE the profile and outside the
 * depth: ask for 35.1 x 55.1 x 23.1 with a 2.31 corner radius and you get
 * 37.32 x 57.32 x 25.32 — every face 1.11 cm proud, every axis 2.22 cm over.
 *
 * So every bag on the site was drawn oversize by twice the bevel, and a bag
 * that clears its airline by 0.8 cm rendered poking out of the frame. The
 * verdict said Tight, the picture said no. It survived the arithmetic guard
 * because that guard reproduced the INTENT — it modelled roundedBox's
 * arguments, not the mesh ExtrudeGeometry actually returns.
 *
 * The fix is to hand the extruder the inner box and let the bevel restore the
 * nominal one: inset the profile by the bevel on each side, shorten the depth
 * by two bevels, and the finished solid measures exactly w x h x d.
 *
 * It also did not span 0..h. It spanned h/2 .. 3h/2, because the translate
 * assumed an origin ExtrudeGeometry does not use — harmless only because
 * bagRig re-seats everything on the deck afterwards, which is precisely the
 * kind of accident that hides a second bug. Seated explicitly here now, from
 * the measured bounds rather than an assumption about them. */
export function roundedBox(
  w: number,
  h: number,
  d: number,
  radius: number,
  segments = 6
): THREE.BufferGeometry {
  /* Corner radius of the FINISHED box, and the bevel that will produce it.
     Both clamped so a shallow bag cannot ask for a bevel deeper than itself. */
  const corner = Math.min(radius, w * 0.24, d * 0.24, h * 0.24);
  const bevel = Math.max(corner * 0.48, 1e-4);

  /* The profile the extruder receives is the finished box minus the bevel it
     will add back on every side. */
  const hw = Math.max(w / 2 - bevel, 1e-3);
  const hd = Math.max(d / 2 - bevel, 1e-3);
  const r = Math.max(Math.min(corner - bevel, hw * 0.95, hd * 0.95), 0);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(h - bevel * 2, 1e-3),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    steps: 1,
  });
  geom.rotateX(-Math.PI / 2);

  /* Seat the finished solid on y = 0 from its MEASURED bounds. The old code
     translated by h / 2 on the assumption that the extruder centres its
     output; it does not, and an assumption about someone else's origin is not
     something this file can afford to carry. */
  geom.computeBoundingBox();
  geom.translate(0, -geom.boundingBox!.min.y, 0);
  return geom;
}

