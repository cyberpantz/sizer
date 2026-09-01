import * as THREE from 'three';
import type { BagDimensions, BagVisualProfile, BagVisualizerProps } from './types';
import type { MaterialSet } from './createMaterials';
import { roundedBox } from './roundedBox';
import { resolveWheelCount } from './visualProfile';

const CORNER_SCALE = { small: 0.1, medium: 0.15, large: 0.2 };


/* HOW FAR THE RUNNING GEAR DROPS BELOW THE BODY, as a multiple of the wheel
 * radius. ONE constant, used by both the builder that carves the space and the
 * pod that fills it — they were two numbers before, and they disagreed.
 *
 *   wheelZone (carved out)  2.15r
 *   leg + wheel (drawn)     1.55r
 *
 * So 0.6r of the stated height was allocated to running gear and then left
 * empty. On a 53.3 cm bag with a 2.13 cm wheel that is 1.28 cm of the bag
 * simply missing: the drawn bag measured 52.02 against a record saying 53.3.
 * Small, and exactly the kind of small this file cannot afford — EPS_CM is
 * 0.3, so the drawing was off by four times the tolerance the engine agonises
 * over, and the bag sat floating above the deck by the difference. */
const WHEEL_DROP = 1.55;

/* WHICH WAY A WHEEL POINTS DEPENDS ON WHAT KIND OF WHEEL IT IS.
 *
 * A CylinderGeometry's axis starts along Y, so the rotation chosen here IS the
 * axle direction, and the two bag types need different ones:
 *
 *   2-wheel roller   you tilt it and pull it behind you, so it rolls fore-aft
 *                    and the axle runs across the bag's WIDTH — along X.
 *   4-wheel spinner  castors that swivel, mounted under the corners and read
 *                    from below as discs; their axle is drawn along Z.
 *
 * Everything used `rotation.x = PI / 2`, which puts the axle along Z. Right for
 * a castor and wrong for a roller: the inline wheels were drawn rolling
 * SIDEWAYS, which is the one direction that bag cannot go. */
function addWheelPod(
  body: THREE.Mesh,
  x: number,
  z: number,
  radius: number,
  bodyBottomLocalY: number,
  materials: MaterialSet,
  axle: 'x' | 'z'
) {
  const centerLocalY = bodyBottomLocalY - radius;

  /* radius + 0.55r = WHEEL_DROP * radius. Kept as the shared constant so the
     space carved out and the space filled cannot drift apart again. */
  const legH = radius * WHEEL_DROP;
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.7, legH, radius * 1.7),
    materials.body
  );
  leg.position.set(x, bodyBottomLocalY - legH / 2, z);
  body.add(leg);

  /* An inline wheel is wider than a castor — it carries the whole bag on two
     of them — and recessed rather than hung below. */
  const thickness = axle === 'x' ? radius * 0.62 : radius * 0.4;
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, thickness, 16),
    materials.wheel
  );
  if (axle === 'x') wheel.rotation.z = Math.PI / 2;
  else wheel.rotation.x = Math.PI / 2;
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

  /* Two wheels means an inline roller; four means castors. */
  const axle = count === 2 ? 'x' : 'z';
  for (const [x, z] of corners) {
    addWheelPod(body, x, z, r, bodyBottomLocalY, materials, axle);
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

/* THE RIBS ARE GONE, and this is the note explaining why rather than a
 * commented-out block.
 *
 * Four accent bars across the shell were meant to read as construction detail
 * and read as noise: horizontal lines stacked inside a rectangle, in a drawing
 * whose entire job is to let a reader compare one rectangle against another.
 * Every one of them competed with the dimension leaders and the frame rails
 * for the same glance, and none of them carried information.
 *
 * docs/25 asks for "at least one construction detail that catches the eye
 * without competing with the measurements". The wheels and the retracted
 * handle already do that, and both are load-bearing: they are the parts the
 * airline measures over, which is the argument the site exists to make.
 *
 * Detail is only free when the surface has nothing to say. This one does. */

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
  /* The body gives up EXACTLY what the running gear occupies — no more. The old
     2.15r carved out more than addWheelPod drew, leaving a gap that made every
     wheeled bag 0.6r shorter than its record and floating above the deck. */
  const drop = wheels > 0 ? r * WHEEL_DROP : h * 0.04;
  const bodyH = h - drop;

  const body = new THREE.Mesh(roundedBox(w, bodyH, d, corner), materials.body);
  body.position.y = drop;
  group.add(body);

  if (wheels > 0) addWheels(body, dims, wheels, materials);
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
  /* roundedBox ALREADY spans 0..h — it translates by h/2 after rotating. The
     extra `body.position.y = h / 2` pushed the backpack to h/2..3h/2, so every
     accent placed at a fraction of `h` landed in the wrong half of it. The
     spinner never had this because it offsets by wheelZone, which is what the
     offset is actually for. */
  const body = new THREE.Mesh(
    roundedBox(w, h, d * 0.85, Math.min(w, d) * (CORNER_SCALE[profile.cornerRadius ?? 'medium'] ?? 0.15)),
    materials.body
  );
  group.add(body);

  /* Anchored to the body's REAL bounds, never to a fraction of the stated box —
     the same rule the telescoping handle follows, and the one the duffel broke
     by floating its grab handle 6.7 cm above a barrel. */
  const { min, max } = meshBoundsLocalY(body);
  const lidH = h * 0.08;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, lidH, d * 0.5), materials.accent);
  top.position.set(0, max - lidH * 0.5, 0);
  group.add(top);

  if (profile.frontPocket) {
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.55, h * 0.35, d * 0.08),
      materials.accent
    );
    pocket.position.set(0, min + h * 0.45, d * 0.44);
    group.add(pocket);
  }

  return group;
}

/* THE DUFFEL IGNORED TWO OF ITS THREE DIMENSIONS.
 *
 * It was a CYLINDER: radius d/2, length w — so `heightCm` never reached the
 * geometry, and a 50 cm bag drew as a 21.6 cm barrel. A cylinder cannot fill a
 * box with a rectangular cross-section anyway: there is no radius that is both
 * 31.8 and 21.6.
 *
 * The first correction over-rotated. A rounded box with the radius clamped at
 * half the smallest face is a LOZENGE, and Frank was right that a Black Hole is
 * nothing like one — it is a soft rectangular box that bulges slightly, with a
 * reinforced base and webbing running over it. So: a modest corner radius, a
 * base band, and straps. The silhouette should be recognisable as the product
 * without becoming a portrait of it (docs/23: we do not do the manufacturer's
 * presentation).
 *
 * The handle used to sit at `h * 0.85` — a fraction of the STATED box rather
 * than a position on the body — so it floated 6.7 cm clear of a barrel that
 * stopped short. Everything here anchors to meshBoundsLocalY() instead. */
function buildDuffel(dims: BagDimensions, materials: MaterialSet): THREE.Group {
  /* UPRIGHT, LIKE EVERY OTHER SHAPE AND LIKE THE FRAME.
   *
   * I laid this down to match the product photo, and it made a bag that fits
   * with 5 cm to spare render OVERHANGING the sizer on two sides. The reason
   * is the one thing this file must never get wrong: I rotated the BAG and not
   * the SIZER, so the two were being drawn on different axis conventions.
   *
   *   sizer   X=width 45   Y=height 55.9   Z=depth 25
   *   bag     X=height 50  Y=depth 21.6    Z=width 31.8
   *   top view compares X and Z: 50 vs 45, and 31.8 vs 25. Both "over".
   *
   * Rotating the sizer to match is not the fix either — an airport frame
   * stands upright, and turning it would misrepresent the thing we are
   * claiming to draw exactly.
   *
   * And the upright pose is the honest one anyway: `delta()` compares
   * largest-to-largest precisely because a bag ROTATES, so the drawing should
   * show the orientation in which it fits. A traveller with a holdall and a
   * sizer turns the holdall. */
  const { heightCm: h, widthCm: w, depthCm: d } = dims;
  const group = new THREE.Group();
  const small = Math.min(w, d, h);

  /* Soft, but square: a duffel packed full is a box with eased edges. */
  const body = new THREE.Mesh(roundedBox(w, h, d, small * 0.16, 8), materials.body);
  group.add(body);

  const { min, max } = meshBoundsLocalY(body);

  /* The reinforced base — the darker wrap the real bag has, and the reason it
     stands up rather than slumping. Inset so it reads as a skin on the body
     rather than a separate slab. */
  const baseH = h * 0.3;
  const base = new THREE.Mesh(
    roundedBox(w * 0.995, baseH, d * 0.995, small * 0.16, 6),
    materials.accent
  );
  base.position.y = min;
  group.add(base);

  /* Webbing: two straps over the body, meeting a flat grab handle. Flush with
     the top face, because external_cm already counts them. */
  const strapW = small * 0.14;
  for (const x of [-w * 0.2, w * 0.2]) {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(strapW, h * 0.98, d * 1.01),
      materials.accent
    );
    strap.position.set(x, min + h * 0.5, 0);
    group.add(strap);
  }

  const gripH = small * 0.06;
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.34, gripH, d * 0.22),
    materials.accent
  );
  grip.position.set(0, max - gripH * 0.5, 0);
  group.add(grip);

  /* End compression straps, on the two short faces. */
  for (const z of [-d * 0.5, d * 0.5]) {
    const end = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.62, small * 0.06, d * 0.02),
      materials.accent
    );
    end.position.set(0, min + h * 0.62, z);
    group.add(end);
  }

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
  /* Same WHEEL_DROP as the spinner. This carried its own copy of the 2.15
     carve-out and had the identical gap — found by the arithmetic guard rather
     than by looking, which is the point of writing it that way. */
  const drop = wheelCount > 0 ? r * WHEEL_DROP : h * 0.06;
  const bodyH = h - drop;

  const body = new THREE.Mesh(roundedBox(w, bodyH, d, corner), materials.body);
  body.position.y = drop;
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
/* THE MEASURED ENVELOPE — dashed, because it is a DRAWN limit and not an
 * object. The gate sizer is a real frame you could touch; this box is a
 * measurement laid over the world, and the drafting convention for that is a
 * broken line. It also stops the two reading as the same kind of thing when
 * they sit a centimetre apart.
 *
 * LineDashedMaterial needs computeLineDistances() or every dash length comes
 * out zero and the line renders solid — a silent failure that looks exactly
 * like "the dashes did not work", which is why it is called here rather than
 * left to the caller. */
export function createMeasurementEnvelope(dims: BagDimensions): THREE.LineSegments {
  const { heightCm, widthCm, depthCm } = dims;
  const geom = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
  geom.translate(0, heightCm / 2, 0);
  const edges = new THREE.EdgesGeometry(geom);

  /* Dash scaled to the bag, so a 40 cm under-seat case and a 55 cm roller show
     the same rhythm rather than one reading as finer than the other. */
  const unit = Math.min(widthCm, heightCm, depthCm);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineDashedMaterial({
      color: 0x2f2b26,
      dashSize: unit * 0.09,
      gapSize: unit * 0.055,
    })
  );
  line.computeLineDistances();
  return line;
}

/** Normalised bounding box for measurement projection. Y=height, X=width, Z=depth. */
export function measurementBounds(dims: BagDimensions): THREE.Box3 {
  const { heightCm, widthCm, depthCm } = dims;
  return new THREE.Box3(
    new THREE.Vector3(-widthCm / 2, 0, -depthCm / 2),
    new THREE.Vector3(widthCm / 2, heightCm, depthCm / 2)
  );
}
