/**
 * src/components/GridRoom.jsx
 * Procedural 3D Grid Chamber for Medic Production Customer Portal
 * 
 * Replaces blurry 2D background photo (grid_background.jpg) with a sharp,
 * anti-aliased procedural 3D vector grid room rendered directly inside Three.js <Canvas>.
 * Matches reference video (gemini_generated_video_21629e73.mp4) and cyber-clinical UI design:
 * - Infinite/perspective floor grid aligned at y = -3.5 under human body model feet
 * - Multi-plane grid chamber walls (back, left, right, ceiling) enclosing the 3D scene
 * - Glowing nodal intersection points in signature cyan (#00d2ff)
 * - Anti-aliased line rendering that stays razor sharp at any camera angle or zoom
 * - Smooth opacity emergence coordinated with introStage ('assembling' -> 'targeting' -> 'locked' -> 'ready')
 * - Full geometry/material cleanup on unmount with zero memory leaks
 * - raycast disabled to prevent interference with OrbitControls and BodyModel hotspots
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function GridRoom({ 
  introStage = 'ready', 
  gridOpacity = 1.0,
  floorLevel = -3.5 
}) {
  const groupRef = useRef();
  const lineMatRef = useRef();
  const accentMatRef = useRef();
  const nodeMatRef = useRef();
  const wallMatRef = useRef();
  const wallNodeMatRef = useRef();

  // Opacity interpolation state for smooth intro animation emergence
  const currentOpacity = useRef(introStage === 'ready' ? 1.0 : 0.15);

  // --------------------------------------------------------------------------
  // 1. Procedural Floor Grid Geometries (Lines + Accent Lines + Nodal Points)
  // --------------------------------------------------------------------------
  const { floorGeo, floorAccentGeo, floorNodesGeo } = useMemo(() => {
    const halfSize = 16;
    const step = 1.0;
    const regularLines = [];
    const accentLines = [];
    const nodePoints = [];

    for (let i = -halfSize; i <= halfSize; i += step) {
      const isMajor = Math.round(i) % 4 === 0;
      const targetList = isMajor ? accentLines : regularLines;

      // Line along X axis (varying Z)
      targetList.push(-halfSize, 0, i, halfSize, 0, i);

      // Line along Z axis (varying X)
      targetList.push(i, 0, -halfSize, i, 0, halfSize);

      // Nodal intersections
      for (let j = -halfSize; j <= halfSize; j += step) {
        nodePoints.push(i, 0, j);
      }
    }

    const floorGeo = new THREE.BufferGeometry();
    floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(regularLines, 3));

    const floorAccentGeo = new THREE.BufferGeometry();
    floorAccentGeo.setAttribute('position', new THREE.Float32BufferAttribute(accentLines, 3));

    const floorNodesGeo = new THREE.BufferGeometry();
    floorNodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePoints, 3));

    return { floorGeo, floorAccentGeo, floorNodesGeo };
  }, []);

  // --------------------------------------------------------------------------
  // 2. Procedural Chamber Walls Geometries (Back, Left, Right, Ceiling)
  // --------------------------------------------------------------------------
  const { wallGeo, wallAccentGeo, wallNodesGeo } = useMemo(() => {
    const halfSize = 16;
    const height = 14; // y from 0 to 14 above floor
    const step = 1.0;
    const regularLines = [];
    const accentLines = [];
    const nodePoints = [];

    // Back Wall: z = -halfSize, x in [-halfSize, halfSize], y in [0, height]
    for (let x = -halfSize; x <= halfSize; x += step) {
      const isMajor = Math.round(x) % 4 === 0;
      const target = isMajor ? accentLines : regularLines;
      target.push(x, 0, -halfSize, x, height, -halfSize);
    }
    for (let y = 0; y <= height; y += step) {
      const isMajor = Math.round(y) % 4 === 0;
      const target = isMajor ? accentLines : regularLines;
      target.push(-halfSize, y, -halfSize, halfSize, y, -halfSize);
      for (let x = -halfSize; x <= halfSize; x += step * 2) {
        nodePoints.push(x, y, -halfSize);
      }
    }

    // Left Wall: x = -halfSize, z in [-halfSize, halfSize], y in [0, height]
    for (let z = -halfSize; z <= halfSize; z += step) {
      const isMajor = Math.round(z) % 4 === 0;
      const target = isMajor ? accentLines : regularLines;
      target.push(-halfSize, 0, z, -halfSize, height, z);
    }
    for (let y = 0; y <= height; y += step) {
      const isMajor = Math.round(y) % 4 === 0;
      const target = isMajor ? accentLines : regularLines;
      target.push(-halfSize, y, -halfSize, -halfSize, y, halfSize);
      for (let z = -halfSize; z <= halfSize; z += step * 2) {
        nodePoints.push(-halfSize, y, z);
      }
    }

    // Right Wall: x = halfSize, z in [-halfSize, halfSize], y in [0, height]
    for (let z = -halfSize; z <= halfSize; z += step) {
      const isMajor = Math.round(z) % 4 === 0;
      const target = isMajor ? accentLines : regularLines;
      target.push(halfSize, 0, z, halfSize, height, z);
    }
    for (let y = 0; y <= height; y += step) {
      const isMajor = Math.round(y) % 4 === 0;
      const target = isMajor ? accentLines : regularLines;
      target.push(halfSize, y, -halfSize, halfSize, y, halfSize);
      for (let z = -halfSize; z <= halfSize; z += step * 2) {
        nodePoints.push(halfSize, y, z);
      }
    }

    // Ceiling: y = height, x and z in [-halfSize, halfSize]
    for (let i = -halfSize; i <= halfSize; i += step * 2) {
      regularLines.push(-halfSize, height, i, halfSize, height, i);
      regularLines.push(i, height, -halfSize, i, height, halfSize);
    }

    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(regularLines, 3));

    const wallAccentGeo = new THREE.BufferGeometry();
    wallAccentGeo.setAttribute('position', new THREE.Float32BufferAttribute(accentLines, 3));

    const wallNodesGeo = new THREE.BufferGeometry();
    wallNodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePoints, 3));

    return { wallGeo, wallAccentGeo, wallNodesGeo };
  }, []);

  // --------------------------------------------------------------------------
  // 3. Cyber-Clinical Materials (#00d2ff, #0a3d91, #0055ff, #1e293b)
  // --------------------------------------------------------------------------
  const { lineMaterial, accentMaterial, nodeMaterial, wallMaterial, wallNodeMaterial } = useMemo(() => {
    // Primary floor grid lines: deep clinical cyber-blue
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#0a3d91'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    // Accent lines every 4 units: vibrant electric cyan
    const accentMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#00d2ff'),
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });

    // Floor nodal intersection points: bright cyan beacon glow
    const nodeMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#00d2ff'),
      size: 0.055,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false
    });

    // Chamber wall grid lines: subtle atmospheric cyan-blue
    const wallMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#0055ff'),
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });

    // Chamber wall nodal points
    const wallNodeMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#00d2ff'),
      size: 0.045,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      depthWrite: false
    });

    return { lineMaterial, accentMaterial, nodeMaterial, wallMaterial, wallNodeMaterial };
  }, []);

  // --------------------------------------------------------------------------
  // 4. Lifecycle Clean-up: Dispose Geometries and Materials on Unmount
  // --------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      floorGeo.dispose();
      floorAccentGeo.dispose();
      floorNodesGeo.dispose();
      wallGeo.dispose();
      wallAccentGeo.dispose();
      wallNodesGeo.dispose();
      lineMaterial.dispose();
      accentMaterial.dispose();
      nodeMaterial.dispose();
      wallMaterial.dispose();
      wallNodeMaterial.dispose();
    };
  }, [
    floorGeo, floorAccentGeo, floorNodesGeo, 
    wallGeo, wallAccentGeo, wallNodesGeo, 
    lineMaterial, accentMaterial, nodeMaterial, wallMaterial, wallNodeMaterial
  ]);

  // --------------------------------------------------------------------------
  // 5. Intro Stage Animation Interpolation (useFrame)
  // --------------------------------------------------------------------------
  useFrame((state, delta) => {
    // Calculate target opacity based on introStage
    let target = 0.85;
    if (introStage === 'assembling') target = 0.35;
    else if (introStage === 'targeting') target = 0.65;
    else if (introStage === 'locked') target = 0.8;
    else if (introStage === 'ready') target = 1.0;

    target *= gridOpacity;

    // Smooth lerp
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, target, Math.min(1, delta * 3.0));
    const op = currentOpacity.current;

    // Subtle sinusoidal glow pulse on nodal dots matching reference video
    const time = state.clock.getElapsedTime();
    const pulse = 0.85 + 0.15 * Math.sin(time * 2.8);

    if (lineMatRef.current) lineMatRef.current.opacity = op * 0.55;
    if (accentMatRef.current) accentMatRef.current.opacity = op * 0.75;
    if (nodeMatRef.current) nodeMatRef.current.opacity = Math.min(1, op * 0.85 * pulse);
    if (wallMatRef.current) wallMatRef.current.opacity = op * 0.28;
    if (wallNodeMatRef.current) wallNodeMatRef.current.opacity = Math.min(1, op * 0.65 * pulse);
  });

  // Null raycast prevents grid from intercepting clicks meant for body model or OrbitControls
  const noRaycast = () => null;

  return (
    <group ref={groupRef} position={[0, floorLevel ?? -3.5, 0]}>
      {/* 1. Floor Regular Grid Lines */}
      <lineSegments
        ref={lineMatRef}
        geometry={floorGeo}
        material={lineMaterial}
        raycast={noRaycast}
      />

      {/* 2. Floor Accent Lines (every 4th grid unit) */}
      <lineSegments
        ref={accentMatRef}
        geometry={floorAccentGeo}
        material={accentMaterial}
        raycast={noRaycast}
      />

      {/* 3. Glowing Floor Nodal Intersection Points */}
      <points
        ref={nodeMatRef}
        geometry={floorNodesGeo}
        material={nodeMaterial}
        raycast={noRaycast}
      />

      {/* 4. Chamber Wall Lines */}
      <lineSegments
        ref={wallMatRef}
        geometry={wallGeo}
        material={wallMaterial}
        raycast={noRaycast}
      />

      {/* 5. Chamber Wall Accent Lines */}
      <lineSegments
        geometry={wallAccentGeo}
        material={accentMaterial}
        raycast={noRaycast}
      />

      {/* 6. Chamber Wall Nodal Intersection Points */}
      <points
        ref={wallNodeMatRef}
        geometry={wallNodesGeo}
        material={wallNodeMaterial}
        raycast={noRaycast}
      />
    </group>
  );
}
