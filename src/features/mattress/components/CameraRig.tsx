import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { LayerId, SimulationMode } from '../types';

interface CameraRigProps {
  mode: SimulationMode;
  selectedLayerId: LayerId | null;
  resetKey: number;
}

const LAYER_TARGETS: Record<LayerId, [number, number, number]> = {
  smartgrid: [0, 2.58, 0],
  foam: [0, 1.44, 0],
  base: [0, 0.17, 0]
};

function fitDistance(width: number, fovDeg: number, aspect: number) {
  const fov = THREE.MathUtils.degToRad(fovDeg);
  const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const distance = width / 2 / (Math.tan(horizontalFov / 2) * 0.9);
  return THREE.MathUtils.clamp(distance, 5.2, 18);
}

export function CameraRig({ mode, selectedLayerId, resetKey }: CameraRigProps) {
  const controlsRef = useRef<any>(null);
  const { size, camera } = useThree();

  const layoutBucket = size.width < 600 ? 'portrait' : 'wide';

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const aspect = size.width / Math.max(size.height, 1);
    const fov = (camera as THREE.PerspectiveCamera).fov || 44;
    const isPortrait = aspect < 0.9;

    let target = new THREE.Vector3(0, 1.0, 0);
    let direction = new THREE.Vector3(0.5, 0.32, 0.8).normalize();
    let width = isPortrait ? 4.3 : 5.6;

    if (mode === 'split') {
      if (selectedLayerId) {
        target = new THREE.Vector3(...LAYER_TARGETS[selectedLayerId]);
        direction = new THREE.Vector3(0.48, 0.32, 0.82).normalize();
        width = isPortrait ? 4.8 : 6.0;
      } else {
        target = new THREE.Vector3(0, 1.3, 0);
        direction = new THREE.Vector3(0.55, 0.38, 0.74).normalize();
        width = isPortrait ? 5.0 : 6.4;
      }
    }

    const distance = fitDistance(width, fov, aspect);
    const position = target.clone().add(direction.multiplyScalar(distance));

    controls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true
    );
    // size is intentionally read inside the effect; layoutBucket gates re-framing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedLayerId, resetKey, layoutBucket]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.9}
      draggingSmoothTime={0.12}
      minDistance={3.6}
      maxDistance={20}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI / 2.04}
      enablePan={false}
    />
  );
}
