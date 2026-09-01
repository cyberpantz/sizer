import * as THREE from 'three';
import type { BagDimensions, MeasurementAxis } from './types';

function line(group: THREE.Group, color: number, a: THREE.Vector3, b: THREE.Vector3) {
  const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
  group.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color })));
}

/** Lines showing where the bag exceeds the sizer on the binding axis. */
export function createBindingMarkers(opts: {
  bindingAxis: MeasurementAxis;
  bagDims: BagDimensions;
  limitDims: BagDimensions;
  color: number;
}): THREE.Group {
  const { bindingAxis, bagDims, limitDims, color } = opts;
  const group = new THREE.Group();
  const frontZ = limitDims.depthCm * 0.46;

  if (bindingAxis === 'height' && bagDims.heightCm > limitDims.heightCm) {
    const y = limitDims.heightCm;
    const hw = limitDims.widthCm / 2;
    line(group, color, new THREE.Vector3(-hw, y, frontZ), new THREE.Vector3(hw, y, frontZ));
    const x = limitDims.widthCm * 0.22;
    line(group, color, new THREE.Vector3(x, y, frontZ), new THREE.Vector3(x, bagDims.heightCm, frontZ));
    line(
      group,
      color,
      new THREE.Vector3(-x, bagDims.heightCm, frontZ),
      new THREE.Vector3(x, bagDims.heightCm, frontZ)
    );
  }

  if (bindingAxis === 'width' && bagDims.widthCm > limitDims.widthCm) {
    const x = limitDims.widthCm / 2;
    const y = limitDims.heightCm * 0.55;
    line(group, color, new THREE.Vector3(x, 0, frontZ), new THREE.Vector3(x, y, frontZ));
    line(group, color, new THREE.Vector3(bagDims.widthCm / 2, 0, frontZ), new THREE.Vector3(bagDims.widthCm / 2, y, frontZ));
  }

  if (bindingAxis === 'depth' && bagDims.depthCm > limitDims.depthCm) {
    const z = limitDims.depthCm / 2;
    const y = limitDims.heightCm * 0.35;
    const x = limitDims.widthCm * 0.22;
    line(group, color, new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, bagDims.depthCm / 2));
  }

  return group;
}
