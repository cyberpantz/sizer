import * as THREE from 'three';
import type { AxisMap } from './createBagGeometry';
import type { BagDimensions, MeasurementAxis, ProjectedMeasurement } from './types';

const AXIS_VALUE: Record<MeasurementAxis, (d: BagDimensions) => number> = {
  height: (d) => d.heightCm,
  width: (d) => d.widthCm,
  depth: (d) => d.depthCm,
};

function project(v: THREE.Vector3, camera: THREE.Camera, width: number, height: number) {
  const p = v.clone().project(camera);
  return {
    x: ((p.x + 1) / 2) * width,
    y: ((-p.y + 1) / 2) * height,
    z: p.z,
  };
}

/* THE LABEL FOLLOWS THE OBJECT, NOT THE RECORD.
 *
 * `dimensions` is sorted largest-first and labelled height/width/depth, which
 * is right for a roller standing up. A duffel lies down: its longest side runs
 * ACROSS the screen. Without a per-shape map the leader lines kept measuring
 * the axes of a bag that was no longer standing, so "Height" pointed at the
 * short vertical edge of a bag whose height is its longest dimension. */
function axisPoints(
  axis: MeasurementAxis,
  box: THREE.Box3,
  axes: AxisMap
): [THREE.Vector3, THREE.Vector3] {
  const min = box.min;
  const max = box.max;
  const center = box.getCenter(new THREE.Vector3());
  /* Read the label back to the screen axis it now occupies. */
  const on = axes[axis];
  if (on === 'y') axis = 'height';
  else if (on === 'x') axis = 'width';
  else axis = 'depth';

  if (axis === 'height') {
    const x = max.x + (max.x - min.x) * 0.15;
    const z = min.z - (max.z - min.z) * 0.1;
    return [new THREE.Vector3(x, min.y, z), new THREE.Vector3(x, max.y, z)];
  }
  if (axis === 'width') {
    const y = max.y + (max.y - min.y) * 0.08;
    const z = max.z + (max.z - min.z) * 0.12;
    return [new THREE.Vector3(min.x, y, z), new THREE.Vector3(max.x, y, z)];
  }
  const x = min.x - (max.x - min.x) * 0.12;
  const y = center.y;
  return [new THREE.Vector3(x, y, min.z), new THREE.Vector3(x, y, max.z)];
}

/**
 * @param box  The bag's bounds IN `root`'s own local frame.
 *
 * MUST BE THE MESH'S ACTUAL BOUNDS, NOT A BOX RE-DERIVED FROM `dims`.
 * measurementBounds() returns 0..height with the bottom at the origin, but the
 * geometry does not sit that way — BagVisualizer corrects for it with
 * `bagRig.position.y = -bagBox.min.y`. Passing the nominal box meant that
 * correction was applied to the guide a SECOND time, so the height leader was
 * offset by the whole discrepancy and drew a bag far taller than the bag.
 *
 * Two things computing the same fact and drifting — the same shape as the
 * dimension ladder picking a field by name, and the units toggle looking for a
 * hook nothing emitted. One source, passed in.
 */
export function projectMeasurements(
  dims: BagDimensions,
  camera: THREE.Camera,
  stageWidth: number,
  stageHeight: number,
  root: THREE.Object3D,
  box: THREE.Box3,
  axes: AxisMap = { height: 'y', width: 'x', depth: 'z' }
): ProjectedMeasurement[] {
  root.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  /* Renamed from `axes`, which now collides with the axis-map parameter above.
     A shadowed const in the same scope is a redeclaration, and it would have
     thrown the moment this file ran — invisible to a test suite that reads the
     source rather than executing it. */
  const ORDER: MeasurementAxis[] = ['height', 'width', 'depth'];
  const raycaster = new THREE.Raycaster();
  const toWorld = (v: THREE.Vector3) => v.clone().applyMatrix4(root.matrixWorld);

  return ORDER.map((axis) => {
    const [a, b] = axisPoints(axis, box, axes);
    const wa = toWorld(a);
    const wb = toWorld(b);
    const pa = project(wa, camera, stageWidth, stageHeight);
    const pb = project(wb, camera, stageWidth, stageHeight);

    const mid = wa.clone().lerp(wb, 0.5);
    const label = project(mid, camera, stageWidth, stageHeight);

    /* WITNESS LINES RUN ACROSS THE MEASUREMENT, NOT ALONG IT.
     *
     * These were collinear: the same direction as the dimension line, extended
     * 8% past each end. So the visible stroke ran BEYOND the arrowheads, and
     * the arrows read as landing short of the line's ends — which is exactly
     * what they were doing.
     *
     * A dimension line in any technical drawing terminates AT its arrowheads,
     * and the ticks that mark the extent sit perpendicular to it. Computed in
     * SCREEN space rather than world space, because "perpendicular" is a fact
     * about the drawing, not about the bag: a world-space normal projects to
     * something skewed under rotation, and the tick would lean. */
    const vx = pb.x - pa.x;
    const vy = pb.y - pa.y;
    const len = Math.hypot(vx, vy) || 1;
    const nx = -vy / len;
    const ny = vx / len;
    const TICK = 5;
    const pe1 = { x: pa.x + nx * TICK, y: pa.y + ny * TICK };
    const pe2 = { x: pb.x + nx * TICK, y: pb.y + ny * TICK };
    const pe1b = { x: pa.x - nx * TICK, y: pa.y - ny * TICK };
    const pe2b = { x: pb.x - nx * TICK, y: pb.y - ny * TICK };

    const dir = wb.clone().sub(wa).normalize();
    const span = wa.distanceTo(wb);
    raycaster.set(wa, dir);
    const hits = raycaster.intersectObject(root, true);
    const occluded = hits.length > 0 && hits[0].distance < span * 0.95;

    return {
      axis,
      valueCm: AXIS_VALUE[axis](dims),
      line: { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y },
      /* Full ticks, crossing the line at each end — so the arrowheads sit
         exactly where the measurement stops. */
      ext1: { x1: pe1b.x, y1: pe1b.y, x2: pe1.x, y2: pe1.y },
      ext2: { x1: pe2b.x, y1: pe2b.y, x2: pe2.x, y2: pe2.y },
      label: { x: label.x, y: label.y },
      occluded,
    };
  });
}
