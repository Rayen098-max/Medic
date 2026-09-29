import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import initialZoneCoordinates from '../data/zoneCoordinates.json';

// SmartGrid Pressure Relief Bed Visualization
function SmartGridBed({ visible }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current && visible) {
      meshRef.current.material.opacity = THREE.MathUtils.lerp(meshRef.current.material.opacity, 0.85, 0.05);
    }
  });

  if (!visible) return null;

  return (
    <group position={[0, -3.4, 0]}>
      {/* SmartGrid Layer */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 9, 32, 64]} />
        <meshStandardMaterial 
          color="#00d2ff" 
          emissive="#005588" 
          emissiveIntensity={0.5} 
          wireframe={true} 
          transparent={true} 
          opacity={0.8}
        />
      </mesh>
      {/* Glow halo under mattress */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.8, 9.4]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// Laser projectile shooting from the right side towards pain point
function LaserProjectile({ targetPos, scale, startTime, onArrived }) {
  const meshRef = useRef();
  const startPos = useMemo(() => new THREE.Vector3(14, targetPos.y * scale + (Math.random() - 0.5) * 2, (targetPos.z || 0) * scale + 2), [targetPos, scale]);
  const destPos = useMemo(() => new THREE.Vector3(targetPos.x * scale, targetPos.y * scale, targetPos.z * scale), [targetPos, scale]);
  const hasTriggered = useRef(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const elapsed = clock.getElapsedTime() - startTime;
    const duration = 0.85; // fast laser shot
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);

    // Quadratic ease-out travel
    const eased = 1 - Math.pow(1 - progress, 3);
    meshRef.current.position.lerpVectors(startPos, destPos, eased);

    // Scale trail based on speed
    if (progress < 1) {
      meshRef.current.scale.set(1 + (1 - progress) * 2, 0.8, 0.8);
    }

    if (progress >= 0.98 && !hasTriggered.current) {
      hasTriggered.current = true;
      if (onArrived) onArrived();
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ff2244" />
      </mesh>
      {/* Light streak */}
      <pointLight color="#ff0044" intensity={80} distance={2.5} />
    </group>
  );
}

// Expanding shockwave ripple around pain point when locked
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

export default function BodyModel({ 
  zones, 
  activeZones = [], 
  onZoneClick,
  introStage = 'ready', // 'assembling' | 'targeting' | 'locked' | 'ready'
  showSmartGrid = false,
  activePointId = null
}) {
  const group = useRef();
  const obj = useLoader(OBJLoader, '/model.obj');
  const [hovered, setHovered] = useState(false);
  const [lockedDots, setLockedDots] = useState({});

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default';
  }, [hovered]);

  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#0a3d91', // Deep blue
      emissive: '#051b47',
      emissiveIntensity: 0.2,
      roughness: 0.3,
      metalness: 0.8,
    });
  }, []);

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

  const getHotspotData = (zoneCategory, id, origPos) => {
    let data = { position: origPos || [0, 0, 0], rotation: [0, 0, 0], scale: 1.0 };
    
    let savedCoords = null;
    try {
      const ls = localStorage.getItem('medic_zone_coords_v3');
      if (ls) savedCoords = JSON.parse(ls);
    } catch(e) {}
    
    const coordsMap = savedCoords || initialZoneCoordinates;
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
  };

  const activeZonePositions = useMemo(() => {
    return zones
      .filter(z => activeZones.length === 0 || activeZones.includes(z.id))
      .map(z => ({
         id: z.id,
         zone: z.zone,
         ...getHotspotData(z.zone, z.id, z.position)
      }));
  }, [zones, activeZones]);

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

  // Assembly & Intro animation frame interpolation
  const assemblyAnim = useRef({ scaleProgress: 0, rotY: 0 });

  useFrame((state, delta) => {
    if (!group.current) return;

    if (introStage === 'assembling') {
      // Body parts assembly: scales up and rotates into position smoothly
      assemblyAnim.current.scaleProgress = THREE.MathUtils.lerp(assemblyAnim.current.scaleProgress, 1, delta * 3.5);
      const s = assemblyAnim.current.scaleProgress;
      group.current.scale.set(s, s, s);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, delta * 4);
    } else {
      // Normal ready or targeting state: maintain full scale
      group.current.scale.set(1, 1, 1);
      
      // Auto-rotate slowly when not inspecting a single hotspot
      if (activeZones.length === 0 && !activePointId && introStage === 'ready') {
        group.current.rotation.y += 0.005;
      }
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

  return (
    <group ref={group}>
      <Center>
        {meshNode && (
          <mesh 
            geometry={meshNode.geometry} 
            material={bodyMaterial} 
            scale={scale}
          >
            {/* Hotspots & Pain Points */}
            {(introStage === 'ready' || introStage === 'locked' || introStage === 'targeting') && activeZonePositions.map((zone, i) => {
              const isBilateral = isBilateralZone(zone.zone);
              const mirrored = isBilateral ? getMirroredTransform(zone.position, zone.rotation) : null;
              const isTargeted = introStage === 'ready' || introStage === 'locked' || lockedDots[zone.id];
              
              if (!isTargeted && introStage === 'targeting') return null;

              return (
                <React.Fragment key={zone.id || i}>
                  <group position={zone.position} rotation={zone.rotation}>
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
        )}
      </Center>

      {/* Laser Projectile Streams during Intro Targeting Phase */}
      {introStage === 'targeting' && activeZonePositions.map((zone, idx) => (
        <LaserProjectile 
          key={`laser-${zone.id || idx}`}
          targetPos={new THREE.Vector3(...(Array.isArray(zone.position) ? zone.position : [0,0,0]))}
          scale={scale}
          startTime={idx * 0.25}
          onArrived={() => setLockedDots(prev => ({ ...prev, [zone.id]: true }))}
        />
      ))}

      {/* SmartGrid Ergonomic Bed Visualization */}
      <SmartGridBed visible={showSmartGrid} />
    </group>
  );
}
