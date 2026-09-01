import * as THREE from 'three';
import type { MaterialPreset } from './types';

const BODY: Record<MaterialPreset, THREE.MeshStandardMaterialParameters> = {
  hard_shell: {
    color: 0x5c5a56,
    roughness: 0.58,
    metalness: 0,
  },
  aluminum: {
    color: 0x8a8d90,
    roughness: 0.42,
    metalness: 0.72,
  },
  soft_side: {
    color: 0x4a4743,
    roughness: 0.9,
    metalness: 0,
  },
  backpack: {
    color: 0x454340,
    roughness: 0.94,
    metalness: 0,
  },
  duffel: {
    color: 0x454340,
    roughness: 0.94,
    metalness: 0,
  },
};

function weaveNormal(size = 128, scale = 12): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const wx = Math.sin((x / size) * Math.PI * scale) * 0.08;
      const wy = Math.sin((y / size) * Math.PI * scale) * 0.08;
      data[i] = 128 + wx * 127;
      data[i + 1] = 128 + wy * 127;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function shellGrainNormal(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = (Math.sin(x * 0.4) + Math.cos(y * 0.35)) * 0.04;
      data[i] = 128 + n * 127;
      data[i + 1] = 128 - n * 127;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Muted tint for fit-mode bag — reads against the slate sizer without label pills. */
const FIT_BODY_TINT: Partial<THREE.MeshStandardMaterialParameters> = {
  color: 0xa3b4c7,
  roughness: 0.64,
  metalness: 0.02,
};

const FIT_ACCENT = 0x6a7d92;
const FIT_WHEEL = 0x566878;

export type MaterialSet = {
  body: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  wheel: THREE.MeshStandardMaterial;
  packing: THREE.MeshStandardMaterial;
  packingEdge: THREE.LineBasicMaterial;
  dispose: () => void;
};

export function createMaterials(
  preset: MaterialPreset,
  opts?: { bodyOpacity?: number; fitVisual?: boolean }
): MaterialSet {
  const bodyParams = { ...BODY[preset] };
  if (opts?.fitVisual) Object.assign(bodyParams, FIT_BODY_TINT);
  const body = new THREE.MeshStandardMaterial(bodyParams);

  if (preset === 'soft_side' || preset === 'backpack' || preset === 'duffel') {
    body.normalMap = weaveNormal();
    body.normalScale = new THREE.Vector2(0.35, 0.35);
  } else if (preset === 'hard_shell') {
    body.normalMap = shellGrainNormal();
    body.normalScale = new THREE.Vector2(0.2, 0.2);
  }

  const bodyOpacity = opts?.bodyOpacity ?? 1;
  if (bodyOpacity < 1) {
    body.transparent = true;
    body.opacity = bodyOpacity;
  }

  const accent = new THREE.MeshStandardMaterial({
    color: opts?.fitVisual ? FIT_ACCENT : 0x3d3b38,
    roughness: 0.65,
    metalness: preset === 'aluminum' ? 0.5 : 0,
  });

  const wheel = new THREE.MeshStandardMaterial({
    color: opts?.fitVisual ? FIT_WHEEL : 0x4a4743,
    roughness: 0.65,
    metalness: 0.08,
  });

  const packing = new THREE.MeshStandardMaterial({
    color: 0x1d4e89,
    transparent: true,
    opacity: 0.1,
    roughness: 0.8,
    metalness: 0,
    depthWrite: false,
  });

  const packingEdge = new THREE.LineBasicMaterial({
    color: 0x1d4e89,
    transparent: true,
    opacity: 0.55,
  });

  return {
    body,
    accent,
    wheel,
    packing,
    packingEdge,
    dispose() {
      body.dispose();
      accent.dispose();
      wheel.dispose();
      packing.dispose();
      packingEdge.dispose();
      body.normalMap?.dispose();
    },
  };
}
