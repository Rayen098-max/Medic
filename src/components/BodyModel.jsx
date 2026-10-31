import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import initialZoneCoordinates from '../data/zoneCoordinates.json';
import { getBodyModelConfig } from '../utils/db';

// Expanding shockwave ripple around pain point when locked / ready
function ShockwavePulse({ position, scale, active }) {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime() * 2.5;
    const ringScale = (t % 1.5) * (0.35 / scale);
    ringRef.current.scale.set(ringScale, ringScale, ringScale);
    ringRef.current.material.opacity = Math.max(0, 0.9 - (t % 1.5) * 0.6);
  });

  if (!active) return null;

  return (
    <mesh ref={ringRef} position={[position.x, position.y, (position.z || 0) + 0.05 / scale]}>
      <ringGeometry args={[0.08 / scale, 0.14 / scale, 32]} />
      <meshBasicMaterial color="#ff2244" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Phase 1: Inward Converging Particle Vortex (0.0s - 2.0s)
function ParticleVortex({ elapsed, active }) {
  const pointsRef = useRef();
  const count = 350;

  const { geometry, initialData } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const data = [];

    for (let i = 0; i < count; i++) {
      const radius = 6.0 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const y0 = -3.5 + Math.random() * 7.5;
      const targetY = -1.5 + Math.random() * 3.5;
      const speed = 1.5 + Math.random() * 2.0;

      data.push({ radius, theta, y0, targetY, speed });

      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = y0;
      positions[i * 3 + 2] = radius * Math.sin(theta);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, initialData: data };
  }, []);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#00d2ff',
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    if (!pointsRef.current || !active) return;
    const pos = pointsRef.current.geometry.attributes.position.array;
    const t = Math.min(Math.max(elapsed, 0), 2.5);
    const tau = Math.min(t / 2.0, 1.0);
    const ease = Math.pow(tau, 2.0);

    for (let i = 0; i < count; i++) {
      const p = initialData[i];
      const curRadius = p.radius * Math.pow(1.0 - ease, 1.4) + 0.1 * Math.sin(t * 6 + i);
      const curTheta = p.theta + p.speed * t + 5.0 * ease;
      const curY = THREE.MathUtils.lerp(p.y0, p.targetY, ease) + 0.15 * Math.sin(t * 4 + i);

      pos[i * 3] = curRadius * Math.cos(curTheta);
      pos[i * 3 + 1] = curY;
      pos[i * 3 + 2] = curRadius * Math.sin(curTheta);
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Fade out past 1.8s
    if (t > 1.8) {
      material.opacity = Math.max(0, 1.0 - (t - 1.8) / 0.6);
    } else {
      material.opacity = 1.0;
    }
  });

  if (!active) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// Phase 2: Swirling Helical Energy Ribbons (2.0s - 4.0s)
function EnergyRibbons({ elapsed, active }) {
  const groupRef = useRef();
  const ribbonCount = 3;
  const segments = 60;

  const ribbonGeometries = useMemo(() => {
    const geos = [];
    for (let k = 0; k < ribbonCount; k++) {
      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array((segments + 1) * 2 * 3);
      const indices = [];

      for (let i = 0; i < segments; i++) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }

      geo.setIndex(indices);
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geos.push(geo);
    }
    return geos;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#00d2ff',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      ribbonGeometries.forEach(geo => geo.dispose());
      material.dispose();
    };
  }, [ribbonGeometries, material]);

  useFrame(() => {
    if (!groupRef.current || !active) return;
    const t = elapsed;

    // Opacity envelope
    if (t < 1.8) {
      material.opacity = 0;
    } else if (t < 2.5) {
      material.opacity = THREE.MathUtils.lerp(0, 0.75, (t - 1.8) / 0.7);
    } else if (t < 3.8) {
      material.opacity = 0.75;
    } else if (t < 4.5) {
      material.opacity = THREE.MathUtils.lerp(0.75, 0, (t - 3.8) / 0.7);
    } else {
      material.opacity = 0;
    }

    if (material.opacity <= 0) return;

    for (let k = 0; k < ribbonCount; k++) {
      const geo = ribbonGeometries[k];
      const pos = geo.attributes.position.array;
      const phi = (k * Math.PI * 2) / ribbonCount;

      for (let i = 0; i <= segments; i++) {
        const s = i / segments;
        const radius = 0.85 + 0.35 * Math.cos(s * Math.PI * 3);
        const theta = s * Math.PI * 3.5 + phi + t * 3.0;
        const y = -3.2 + s * 6.4;
        const cx = radius * Math.cos(theta);
        const cz = radius * Math.sin(theta);
        const w = 0.12;

        const idx = i * 6;
        // Vertex 1
        pos[idx] = cx;
        pos[idx + 1] = y + w;
        pos[idx + 2] = cz;
        // Vertex 2
        pos[idx + 3] = cx;
        pos[idx + 4] = y - w;
        pos[idx + 5] = cz;
      }
      geo.attributes.position.needsUpdate = true;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {ribbonGeometries.map((geo, idx) => (
        <mesh key={`ribbon-${idx}`} geometry={geo} material={material} />
      ))}
    </group>
  );
}

// Phase 4: Chest Core Energy Flash Shockwave (5.5s - 7.0s)
function ChestCoreFlash({ elapsed, scale, active }) {
  const meshRef = useRef();
  const lightRef = useRef();

  useFrame(() => {
    if (!active) return;
    const t = elapsed;
    if (t < 5.4 || t > 7.0) {
      if (meshRef.current) meshRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }

    if (meshRef.current) {
      meshRef.current.visible = true;
      const progress = (t - 5.5) / 1.4;
      const currentRadius = 0.1 + Math.pow(Math.max(progress, 0), 1.8) * 4.5;
      meshRef.current.scale.set(currentRadius, currentRadius, currentRadius);
      meshRef.current.material.opacity = Math.max(0, 0.85 * (1.0 - progress));
    }

    if (lightRef.current) {
      if (t < 5.8) {
        lightRef.current.intensity = THREE.MathUtils.lerp(0, 120, (t - 5.4) / 0.4);
      } else {
        lightRef.current.intensity = THREE.MathUtils.lerp(120, 0, (t - 5.8) / 1.2);
      }
    }
  });

  if (!active) return null;

  return (
    <group position={[0, 0.5 * scale, 0.25 * scale]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#5cf2ff" wireframe transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={lightRef} color="#00ffff" intensity={0} distance={8} />
    </group>
  );
}

export default function BodyModel({ 
  zones, 
  activeZones = [], 
  onZoneClick,
  introStage = 'ready', // 'assembling' | 'targeting' | 'locked' | 'ready'
  activePointId = null
}) {
  const group = useRef();
  const obj = useLoader(OBJLoader, '/model.obj');
  const [hovered, setHovered] = useState(false);
  const [dbCoords, setDbCoords] = useState(null);

  // Animation timeline tracking
  const introTimer = useRef(0);
  const [animTime, setAnimTime] = useState(0);

  useEffect(() => {
    getBodyModelConfig()
      .then(coords => { if (coords) setDbCoords(coords); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default';
  }, [hovered]);

  // Reset timer on fresh intro start
  useEffect(() => {
    if (introStage === 'assembling') {
      introTimer.current = 0;
    }
  }, [introStage]);

  // Standard Signature Metallic Blue Material
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#0a3d91', // Deep blue signature
      emissive: '#051b47',
      emissiveIntensity: 0.2,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: introStage === 'ready' ? 1.0 : 0.0,
    });
  }, [introStage]);

  // Holographic Wireframe Material (Phase 3 & 4)
  const wireframeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#00d2ff',
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      bodyMaterial.dispose();
      wireframeMaterial.dispose();
    };
  }, [bodyMaterial, wireframeMaterial]);

  const meshNode = useMemo(() => {
    let mesh = null;
    obj.traverse((child) => {
      if (child.isMesh && !mesh) mesh = child;
    });
    return mesh;
  }, [obj]);

  const targetHeight = 7;
  const { scale } = useMemo(() => {
    if (!meshNode) return { scale: 1 };
    meshNode.geometry.computeBoundingBox();
    const box = meshNode.geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    return { scale: targetHeight / size.y };
  }, [meshNode]);

  const getHotspotData = useCallback((zoneCategory, _id, origPos) => {
    let data = { position: origPos || [0, 0, 0], rotation: [0, 0, 0], scale: 1.0 };
    
    let savedCoords = null;
    try {
      const ls = localStorage.getItem('medic_zone_coords_v3');
      if (ls) savedCoords = JSON.parse(ls);
    } catch {
      // ignore
    }
    
    const coordsMap = dbCoords || savedCoords || initialZoneCoordinates;
    const catKey = zoneCategory?.toLowerCase();
    
    if (catKey && coordsMap[catKey]) {
      const savedData = coordsMap[catKey];
      if (Array.isArray(savedData)) {
        data.position = savedData;
      } else {
        data = { ...data, ...savedData };
      }
    }
    return data;
  }, [dbCoords]);

  const activeZonePositions = useMemo(() => {
    return zones
      .filter(z => activeZones.length === 0 || activeZones.includes(z.id))
      .map(z => ({
         id: z.id,
         zone: z.zone,
         ...getHotspotData(z.zone, z.id, z.position)
      }));
  }, [zones, activeZones, getHotspotData]);

  const getMirroredTransform = (pos, rot) => {
    const euler = new THREE.Euler(rot[0], rot[1], rot[2]);
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(euler);
    
    const mirroredNormal = new THREE.Vector3(-normal.x, normal.y, normal.z);
    const mirroredPos = new THREE.Vector3(-pos[0], pos[1], pos[2]);
    
    const dummy = new THREE.Object3D();
    dummy.position.copy(mirroredPos);
    dummy.lookAt(mirroredPos.clone().add(mirroredNormal));
    
    return {
      position: [mirroredPos.x, mirroredPos.y, mirroredPos.z],
      rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]
    };
  };

  const isBilateralZone = (zoneName) => {
    if (!zoneName) return false;
    const z = zoneName.toLowerCase();
    return z.includes('shoulder') || z.includes('knee') || z.includes('leg') || z.includes('foot') || z.includes('elbow') || z.includes('wrist') || z.includes('arm') || z.includes('hand');
  };

  // 5-Phase Procedural Animation Choreography
  useFrame((state, delta) => {
    if (!group.current) return;

    // Safe delta clamp to prevent NaN on throttled tabs (T2-F2-01)
    const dt = Math.min(delta, 0.1);

    if (introStage === 'ready') {
      group.current.scale.set(1, 1, 1);
      bodyMaterial.opacity = 1.0;
      bodyMaterial.emissiveIntensity = 0.2;
      wireframeMaterial.opacity = 0.0;

      // Slow ambient auto-rotate of the human mannequin when in ready state without active beacon popup
      if (!activePointId) {
        group.current.rotation.y += dt * 0.2;
      }
      return;
    }

    // Accumulate animation time during intro phases
    introTimer.current += dt;
    const t = introTimer.current;
    setAnimTime(t);

    // Phase 1 (0.0s - 2.0s) & Phase 2 (2.0s - 4.0s):
    // Silhouette scales up smoothly
    if (introStage === 'assembling' || t < 4.0) {
      const s = THREE.MathUtils.lerp(0.2, 1.0, Math.min(t / 3.0, 1.0));
      group.current.scale.set(s, s, s);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, dt * 4);
    } else {
      group.current.scale.set(1, 1, 1);
    }

    // Phase 3 (4.0s - 5.5s): Holographic Wireframe
    if (t >= 3.5 && t < 5.5) {
      if (t < 4.2) {
        wireframeMaterial.opacity = THREE.MathUtils.lerp(0, 0.85, (t - 3.5) / 0.7);
      } else {
        wireframeMaterial.opacity = 0.85;
      }
    } else if (t >= 5.5 && t < 7.0) {
      // Phase 4: Wireframe fades out as solid crystallization progresses
      wireframeMaterial.opacity = THREE.MathUtils.lerp(0.85, 0, (t - 5.5) / 1.4);
    } else {
      wireframeMaterial.opacity = 0;
    }

    // Phase 4 (5.5s - 7.0s): Chest Flash & Solid Crystallization
    if (t >= 5.5 && t < 7.0) {
      const crystallizeProgress = Math.min((t - 5.5) / 1.3, 1.0);
      bodyMaterial.opacity = THREE.MathUtils.lerp(0, 1.0, crystallizeProgress);
      // Flash flare pulse
      if (t < 5.8) {
        bodyMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.2, 0.7, (t - 5.5) / 0.3);
      } else {
        bodyMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.7, 0.2, (t - 5.8) / 1.2);
      }
    } else if (t < 5.5) {
      bodyMaterial.opacity = 0.0;
    } else {
      bodyMaterial.opacity = 1.0;
      bodyMaterial.emissiveIntensity = 0.2;
    }
  });

  const handlePointerInteraction = (e, isClick, zoneId) => {
    e.stopPropagation();
    if (isClick) {
      if (onZoneClick) onZoneClick(zoneId);
    } else {
      setHovered(true);
    }
  };

  const isIntroActive = introStage !== 'ready';

  return (
    <group ref={group}>
      {/* Phase 1: Particle Vortex */}
      {isIntroActive && (
        <ParticleVortex elapsed={animTime} active={animTime <= 2.5} />
      )}

      {/* Phase 2: Helical Energy Ribbons */}
      {isIntroActive && (
        <EnergyRibbons elapsed={animTime} active={animTime >= 1.8 && animTime <= 4.5} />
      )}

      {/* Phase 4: Chest Core Energy Flash */}
      {isIntroActive && (
        <ChestCoreFlash elapsed={animTime} scale={scale} active={animTime >= 5.4 && animTime <= 7.0} />
      )}

      <Center>
        {meshNode && (
          <group scale={scale}>
            {/* Solid Crystallized Anatomical Mesh */}
            <mesh 
              geometry={meshNode.geometry} 
              material={bodyMaterial} 
            >
              {/* Phase 5: Pain Point Beacons (Ignite when introStage is ready) */}
              {introStage === 'ready' && activeZonePositions.map((zone, i) => {
                const isBilateral = isBilateralZone(zone.zone);
                const mirrored = isBilateral ? getMirroredTransform(zone.position, zone.rotation) : null;

                return (
                  <React.Fragment key={zone.id || i}>
                    <group position={zone.position} rotation={zone.rotation}>
                      {/* Invisible Raycasting Hit Sphere */}
                      <mesh 
                        visible={false}
                        onClick={(e) => handlePointerInteraction(e, true, zone.id)}
                        onPointerMove={(e) => handlePointerInteraction(e, false, zone.id)}
                        onPointerOut={() => setHovered(false)}
                      >
                        <sphereGeometry args={[0.4 / scale, 8, 8]} />
                      </mesh>
                      
                      {/* Glowing Core */}
                      <mesh position={[0, 0, 0.05 / scale]}>
                        <sphereGeometry args={[0.065 / scale, 16, 16]} />
                        <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
                      </mesh>
                      
                      {/* Bright Center */}
                      <mesh position={[0, 0, 0.05 / scale]}>
                        <sphereGeometry args={[0.035 / scale, 16, 16]} />
                        <meshBasicMaterial color="#ffffff" />
                      </mesh>
                      
                      {/* Beacon PointLight */}
                      <pointLight color="#ff0000" intensity={50} distance={3.0 / scale} decay={2} position={[0, 0, 0.1 / scale]} />

                      {/* Shockwave Rings */}
                      <ShockwavePulse position={{ x: 0, y: 0, z: 0.02 }} scale={scale} active={true} />
                    </group>

                    {mirrored && (
                      <group position={mirrored.position} rotation={mirrored.rotation}>
                        <mesh 
                          visible={false}
                          onClick={(e) => handlePointerInteraction(e, true, zone.id)}
                          onPointerMove={(e) => handlePointerInteraction(e, false, zone.id)}
                          onPointerOut={() => setHovered(false)}
                        >
                          <sphereGeometry args={[0.4 / scale, 8, 8]} />
                        </mesh>
                        <mesh position={[0, 0, 0.05 / scale]}>
                          <sphereGeometry args={[0.065 / scale, 16, 16]} />
                          <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
                        </mesh>
                        <mesh position={[0, 0, 0.05 / scale]}>
                          <sphereGeometry args={[0.035 / scale, 16, 16]} />
                          <meshBasicMaterial color="#ffffff" />
                        </mesh>
                        <pointLight color="#ff0000" intensity={50} distance={3.0 / scale} decay={2} position={[0, 0, 0.1 / scale]} />
                        <ShockwavePulse position={{ x: 0, y: 0, z: 0.02 }} scale={scale} active={true} />
                      </group>
                    )}
                  </React.Fragment>
                );
              })}
            </mesh>

            {/* Holographic Wireframe Layer (Phases 3 & 4) */}
            {isIntroActive && (
              <mesh
                geometry={meshNode.geometry}
                material={wireframeMaterial}
              />
            )}
          </group>
        )}
      </Center>
    </group>
  );
}
