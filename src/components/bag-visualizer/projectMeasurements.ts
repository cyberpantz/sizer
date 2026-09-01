import * as THREE from 'three';
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

function axisPoints(axis: MeasurementAxis, box: THREE.Box3): [THREE.Vector3, THREE.Vector3] {
  const min = box.min;
  const max = box.max;
  const center = box.getCenter(new THREE.Vector3());

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
  box: THREE.Box3
): ProjectedMeasurement[] {
  root.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  const axes: MeasurementAxis[] = ['height', 'width', 'depth'];
  const raycaster = new THREE.Raycaster();
  const toWorld = (v: THREE.Vector3) => v.clone().applyMatrix4(root.matrixWorld);

  return axes.map((axis) => {
    const [a, b] = axisPoints(axis, box);
    const wa = toWorld(a);
    const wb = toWorld(b);
    const pa = project(wa, camera, stageWidth, stageHeight);
    const pb = project(wb, camera, stageWidth, stageHeight);

    const mid = wa.clone().lerp(wb, 0.5);
    const label = project(mid, camera, stageWidth, stageHeight);

    const dir = wb.clone().sub(wa).normalize();
    const span = wa.distanceTo(wb);
    const ext1End = wa.clone().sub(dir.clone().multiplyScalar(span * 0.08));
    const ext2End = wb.clone().add(dir.clone().multiplyScalar(span * 0.08));
    const pe1 = project(ext1End, camera, stageWidth, stageHeight);
    const pe2 = project(ext2End, camera, stageWidth, stageHeight);

    raycaster.set(wa, dir);
    const hits = raycaster.intersectObject(root, true);
    const occluded = hits.length > 0 && hits[0].distance < span * 0.95;

    return {
      axis,
      valueCm: AXIS_VALUE[axis](dims),
      line: { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y },
      ext1: { x1: pa.x, y1: pa.y, x2: pe1.x, y2: pe1.y },
      ext2: { x1: pb.x, y1: pb.y, x2: pe2.x, y2: pe2.y },
      label: { x: label.x, y: label.y },
      occluded,
    };
  });
}
