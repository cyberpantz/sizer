import * as THREE from 'three';
import type { BagDimensions, BagVisualProfile, BagVisualizerProps } from './types';
import type { MaterialSet } from './createMaterials';
import { resolveWheelCount } from './visualProfile';

const CORNER_SCALE = { small: 0.1, medium: 0.15, large: 0.2 };

function roundedBox(
  w: number,
  h: number,
  d: number,
  radius: number,
  segments = 6
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hd = d / 2;
  const r = Math.min(radius, hw * 0.48, hd * 0.48);
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
    depth: h,
    bevelEnabled: true,
    bevelThickness: r * 0.48,
    bevelSize: r * 0.48,
    bevelSegments: segments,
    steps: 1,
  });
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, h / 2, 0);
  return geom;
}

/** Wheel puck plus a corner leg using the body material so it reads as one piece. */
function addWheelPod(
  body: THREE.Mesh,
  x: number,
  z: number,
  radius: number,
  bodyBottomLocalY: number,
  materials: MaterialSet
) {
  const centerLocalY = bodyBottomLocalY - radius;

  const legH = bodyBottomLocalY - centerLocalY + radius * 0.55;
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.7, legH, radius * 1.7),
    materials.body
  );
  leg.position.set(x, bodyBottomLocalY - legH / 2, z);
  body.add(leg);

  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, radius * 0.4, 16),
    materials.wheel
  );
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(x, centerLocalY, z);
  wheel.name = 'wheel';
  body.add(wheel);
}

function meshBoundsLocalY(mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox!;
  return { min: box.min.y, max: box.max.y, height: box.max.y - box.min.y };
}

function meshBottomLocalY(mesh: THREE.Mesh) {
  return meshBoundsLocalY(mesh).min;
}

function wheelRadius(dims: BagDimensions) {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  return Math.max(Math.min(w, d, h) * 0.055, h * 0.04);
}

function addWheels(
  body: THREE.Mesh,
  dims: BagDimensions,
  count: 0 | 2 | 4,
  materials: MaterialSet
) {
  if (count === 0) return;

  const { widthCm: w, depthCm: d } = dims;
  const r = wheelRadius(dims);
  const bodyBottomLocalY = meshBottomLocalY(body);
  const insetX = w * 0.17;
  const insetZ = d * 0.2;

  const corners: [number, number][] =
    count === 4
      ? [
          [-insetX, insetZ],
          [insetX, insetZ],
          [-insetX, -insetZ],
          [insetX, -insetZ],
        ]
      : [
          [-w * 0.24, -d * 0.38],
          [w * 0.24, -d * 0.38],
        ];

  for (const [x, z] of corners) {
    addWheelPod(body, x, z, r, bodyBottomLocalY, materials);
  }
}

/* THE TELESCOPING HANDLE, RETRACTED — inside the height, never above it.
 *
 * The grip used to sit at `max + height * 0.055`: on a 55 cm bag, 3 cm of
 * handle standing proud of the top. `external_cm` ALREADY includes wheels and
 * handles — that is the argument the whole site is built on, and the reason
 * `includes_wheels` and the maker_overall / maker_packing rungs exist. Drawing
 * the handle on top double-counts precisely the gap the rest of the codebase
 * is careful about, and a bag that genuinely clears the limit was rendered
 * sticking out of the gate sizer.
 *
 * The grip now finishes flush with the top face and the pole sits under it,
 * which is both honest and what a retracted handle actually looks like — and
 * retracted is how a bag goes through a sizer. */
function addHandle(body: THREE.Mesh, width: number, materials: MaterialSet) {
  const { max, height } = meshBoundsLocalY(body);
  const gripH = width * 0.025;
  const poleH = height * 0.06;

  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.18, gripH, width * 0.05),
    materials.accent
  );
  grip.position.set(0, max - gripH * 0.5, -width * 0.02);
  body.add(grip);

  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.04, poleH, width * 0.04),
    materials.accent
  );
  pole.position.set(0, max - gripH - poleH * 0.5, -width * 0.02);
  body.add(pole);
}

function addRibs(
  body: THREE.Mesh,
  dims: BagDimensions,
  profile: BagVisualProfile,
  materials: MaterialSet
) {
  if (profile.ribbing === 'none') return;
  const { widthCm: w, depthCm: d } = dims;
  const { min, height } = meshBoundsLocalY(body);
  const count = 4;
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const rib = new THREE.Mesh(
      profile.ribbing === 'horizontal'
        ? new THREE.BoxGeometry(w * 0.96, height * 0.012, d * 0.02)
        : new THREE.BoxGeometry(w * 0.02, height * 0.96, d * 0.96),
      materials.accent
    );
    if (profile.ribbing === 'horizontal') {
      rib.position.set(0, min + height * t, d * 0.48);
    } else {
      rib.position.set(-w * 0.48 + w * t, min + height * 0.5, 0);
    }
    body.add(rib);
  }
}

function buildSpinner(
  dims: BagDimensions,
  profile: BagVisualProfile,
  materials: MaterialSet,
  wheels: 0 | 2 | 4
): THREE.Group {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const corner = Math.min(w, d) * (CORNER_SCALE[profile.cornerRadius ?? 'small'] ?? 0.06);
  const r = wheels > 0 ? wheelRadius(dims) : 0;
  const wheelZone = wheels > 0 ? r * 2.15 : h * 0.04;
  const bodyH = h - wheelZone;

  const body = new THREE.Mesh(roundedBox(w, bodyH, d, corner), materials.body);
  body.position.y = wheelZone;
  group.add(body);

  if (wheels > 0) addWheels(body, dims, wheels, materials);
  addRibs(body, dims, profile, materials);
  addHandle(body, w, materials);
  return group;
}

function buildBackpack(
  dims: BagDimensions,
  profile: BagVisualProfile,
  materials: MaterialSet
): THREE.Group {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    roundedBox(w, h, d * 0.85, Math.min(w, d) * (CORNER_SCALE[profile.cornerRadius ?? 'medium'] ?? 0.15)),
    materials.body
  );
  body.position.y = h / 2;
  group.add(body);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.7, h * 0.08, d * 0.5),
    materials.accent
  );
  top.position.set(0, h * 0.96, 0);
  group.add(top);

  if (profile.frontPocket) {
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.55, h * 0.35, d * 0.08),
      materials.accent
    );
    pocket.position.set(0, h * 0.45, d * 0.44);
    group.add(pocket);
  }

  return group;
}

function buildDuffel(
  dims: BagDimensions,
  materials: MaterialSet
): THREE.Group {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(d / 2, d / 2, w, 24, 1, false),
    materials.body
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.y = h / 2;
  group.add(barrel);

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(w * 0.12, w * 0.015, 8, 16, Math.PI),
    materials.accent
  );
  handle.rotation.y = Math.PI / 2;
  handle.position.set(0, h * 0.85, 0);
  group.add(handle);

  return group;
}

function buildUnderseat(
  dims: BagDimensions,
  profile: BagVisualProfile,
  materials: MaterialSet,
  wheels: 0 | 2 | 4
): THREE.Group {
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const corner = Math.min(w, d) * (CORNER_SCALE[profile.cornerRadius ?? 'small'] ?? 0.1);
  const wheelCount = wheels >= 2 ? 2 : 0;
  const r = wheelCount > 0 ? wheelRadius(dims) : 0;
  const wheelZone = wheelCount > 0 ? r * 2.15 : h * 0.06;
  const bodyH = h - wheelZone;

  const body = new THREE.Mesh(roundedBox(w, bodyH, d, corner), materials.body);
  body.position.y = wheelZone;
  group.add(body);

  if (wheelCount > 0) addWheels(body, dims, 2, materials);

  /* THE HANDLE LIVES INSIDE THE HEIGHT, NEVER ON TOP OF IT.
   *
   * It used to sit at `max + h * 0.02` — the top of the body plus 2% — which
   * made the drawn bag about 1 cm taller than the number printed beside it.
   * That is the one thing this drawing must never do: `external_cm` ALREADY
   * includes wheels and handles. It is the whole argument of the site, the
   * reason `includes_wheels` exists and the reason the dimension ladder ranks
   * maker_overall above maker_packing. Adding height on top double-counts the
   * exact gap we spend the rest of the codebase being careful about, and a bag
   * that genuinely fits was drawn poking out of the gate sizer.
   *
   * Recessed into the body instead, which is also what a telescoping handle
   * does when it is down — and down is how it goes through a sizer. */
  const handleH = h * 0.04;
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.35, handleH, d * 0.06),
    materials.accent
  );
  const { max } = meshBoundsLocalY(body);
  handle.position.set(0, max - handleH * 0.5, -d * 0.1);
  body.add(handle);

  addRibs(body, dims, profile, materials);
  return group;
}

export type BagScene = {
  root: THREE.Group;
  exterior: THREE.Group;
  envelope: THREE.LineSegments;
  packing: THREE.Group | null;
  bounds: THREE.Box3;
  dispose: () => void;
};

export function createBagGeometry(
  props: BagVisualizerProps,
  profile: BagVisualProfile,
  materials: MaterialSet,
  packingMaterials?: MaterialSet
): BagScene {
  const { dimensions, type } = props;
  const wheels = resolveWheelCount(props);
  const exterior = new THREE.Group();

  switch (type) {
    case 'backpack':
      exterior.add(buildBackpack(dimensions, profile, materials));
      break;
    case 'duffel':
      exterior.add(buildDuffel(dimensions, materials));
      break;
    case 'underseat':
      exterior.add(buildUnderseat(dimensions, profile, materials, wheels));
      break;
    case '2-wheel roller':
      exterior.add(buildSpinner(dimensions, profile, materials, 2));
      break;
    default:
      exterior.add(buildSpinner(dimensions, profile, materials, wheels));
      break;
  }

  const root = new THREE.Group();
  const envelope = createMeasurementEnvelope(dimensions);
  root.add(envelope);
  root.add(exterior);

  let packing: THREE.Group | null = null;
  if (props.packingDimensions && packingMaterials) {
    packing = new THREE.Group();
    const p = props.packingDimensions;
    const delta = props.wheelHandleDeltaCm;
    let py = 0;

    if (delta) {
      py = delta[0] > 0 ? delta[0] * 0.8 : 0;
    }

    const inner = new THREE.Mesh(
      roundedBox(p.widthCm, p.heightCm, p.depthCm, Math.min(p.widthCm, p.depthCm) * 0.06),
      packingMaterials.packing
    );
    inner.position.set(0, py + p.heightCm / 2, 0);
    packing.add(inner);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(inner.geometry),
      packingMaterials.packingEdge
    );
    edges.position.copy(inner.position);
    packing.add(edges);
    packing.visible = false;
    root.add(packing);
  }

  const bounds = new THREE.Box3().setFromObject(exterior);
  bounds.min.y = 0;

  return {
    root,
    exterior,
    envelope,
    packing,
    bounds,
    dispose() {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (obj instanceof THREE.LineSegments && obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
    },
  };
}

/** Wireframe of the exact exterior dimensions — what the arrows measure. */
export function createMeasurementEnvelope(dims: BagDimensions): THREE.LineSegments {
  const { heightCm, widthCm, depthCm } = dims;
  const geom = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
  geom.translate(0, heightCm / 2, 0);
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geom),
    new THREE.LineBasicMaterial({ color: 0x736c63, transparent: true, opacity: 0.7 })
  );
}

/** Normalised bounding box for measurement projection. Y=height, X=width, Z=depth. */
export function measurementBounds(dims: BagDimensions): THREE.Box3 {
  const { heightCm, widthCm, depthCm } = dims;
  return new THREE.Box3(
    new THREE.Vector3(-widthCm / 2, 0, -depthCm / 2),
    new THREE.Vector3(widthCm / 2, heightCm, depthCm / 2)
  );
}
