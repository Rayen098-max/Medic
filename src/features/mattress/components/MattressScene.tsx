import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SEVEN_ZONES_DATA, MATTRESS_LAYERS, ZoneClinicalInfo } from '../types';

interface MattressSceneProps {
  mode: 'comfort' | 'split';
  hasSmartGrid: boolean;
  hasSevenZone: boolean;
  selectedZone: ZoneClinicalInfo | null;
  onSelectZone: (zone: ZoneClinicalInfo) => void;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: 'smartgrid' | 'foam' | 'base') => void;
  sleepCycleHour: number;
}

export function MattressScene({
  mode,
  hasSmartGrid,
  hasSevenZone,
  selectedZone,
  onSelectZone,
  selectedLayerId,
  onSelectLayer,
  sleepCycleHour,
}: MattressSceneProps) {
  const gridLayerRef = useRef<THREE.Group>(null);
  const foamLayerRef = useRef<THREE.Group>(null);
  const baseLayerRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  // Smooth animation interpolation across frame updates
  useFrame((state, delta) => {
    const isSplit = mode === 'split';

    // 1. Layer Separation along Y axis
    const targetGridY = isSplit ? 1.4 : 0.65;
    const targetFoamY = isSplit ? 0.7 : 0.35;
    const targetBaseY = isSplit ? 0.0 : 0.0;

    if (gridLayerRef.current) {
      gridLayerRef.current.position.y = THREE.MathUtils.damp(
        gridLayerRef.current.position.y,
        targetGridY,
        6,
        delta
      );
      // Fade/Scale SmartGRID if toggled off in comfort simulator
      const targetScale = hasSmartGrid ? 1 : 0.05;
      gridLayerRef.current.scale.y = THREE.MathUtils.damp(
        gridLayerRef.current.scale.y,
        targetScale,
        8,
        delta
      );
    }

    if (foamLayerRef.current) {
      foamLayerRef.current.position.y = THREE.MathUtils.damp(
        foamLayerRef.current.position.y,
        targetFoamY,
        6,
        delta
      );
    }

    if (baseLayerRef.current) {
      baseLayerRef.current.position.y = THREE.MathUtils.damp(
        baseLayerRef.current.position.y,
        targetBaseY,
        6,
        delta
      );
      const targetBaseScale = hasSevenZone ? 1 : 0.15;
      baseLayerRef.current.scale.y = THREE.MathUtils.damp(
        baseLayerRef.current.scale.y,
        targetBaseScale,
        8,
        delta
      );
    }

    // 2. Sleeping Body Movement
    if (bodyRef.current) {
      // Body is visible only in Comfort Simulator mode
      const targetBodyY = isSplit ? 3.0 : (hasSmartGrid ? 0.95 : 0.65);
      const targetOpacity = isSplit ? 0 : 1;

      bodyRef.current.position.y = THREE.MathUtils.damp(
        bodyRef.current.position.y,
        targetBodyY,
        5,
        delta
      );

      // Micro-shift during sleep cycle simulation (hours 1-8)
      // On foam, tossing and turning increases at hour 5-6 due to heat
      const tossOffset = !hasSmartGrid && (sleepCycleHour >= 4 && sleepCycleHour <= 6)
        ? Math.sin(state.clock.elapsedTime * 3) * 0.05
        : 0;
      bodyRef.current.position.z = THREE.MathUtils.damp(
        bodyRef.current.position.z,
        tossOffset,
        4,
        delta
      );
    }
  });

  // Dynamic spine curve points: neutral straight line on SmartGRID vs sagging S-curve on memory foam
  const spinePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const count = 30;
    const startX = -1.8;
    const endX = 1.8;

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = startX + t * (endX - startX);
      
      let yOffset = 0;
      if (!hasSmartGrid) {
        // Sagging memory foam spine deformation:
        // Thoracic and pelvis sink deeper, bending lumbar unnaturally
        const shoulderSink = Math.exp(-Math.pow((t - 0.28) / 0.12, 2)) * 0.16;
        const pelvicSink = Math.exp(-Math.pow((t - 0.68) / 0.14, 2)) * 0.22;
        yOffset = -(shoulderSink + pelvicSink);
      } else {
        // Optimal ergonomic neutral spinal alignment with mild natural lordotic cushion
        const ergonomicContour = Math.sin(t * Math.PI * 2) * 0.015;
        yOffset = ergonomicContour;
      }
      points.push(new THREE.Vector3(x, 0.18 + yOffset, 0));
    }
    return points;
  }, [hasSmartGrid]);

  const spineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(spinePoints);
  }, [spinePoints]);

  return (
    <>
      <color attach="background" args={['#040714']} />
      
      {/* Lighting Suite */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#e0f2fe" />
      <directionalLight position={[-5, 4, -3]} intensity={0.8} color="#00d2ff" />
      <pointLight position={[0, -0.5, 0]} intensity={1.2} color="#00d2ff" distance={8} />

      {/* Cyber-Clinical Chamber Floor Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial 
          color="#060d1a" 
          roughness={0.7} 
          metalness={0.8} 
        />
      </mesh>
      <gridHelper args={[24, 24, '#00d2ff', '#092540']} position={[0, -1.19, 0]} />

      {/* Bed Base Platform with Neon Perimeter */}
      <group position={[0, -0.5, 0]}>
        {/* Main Base Wooden/Metallic Foundation */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.4, 0.4, 2.6]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
        </mesh>
        
        {/* Futuristic Glowing LED Perimeter Trim */}
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[4.5, 0.05, 2.7]} />
          <meshBasicMaterial color="#00d2ff" wireframe={false} />
        </mesh>

        {/* Headboard */}
        <mesh position={[-2.15, 0.8, 0]}>
          <boxGeometry args={[0.2, 1.4, 2.6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[-2.05, 0.8, 0]}>
          <boxGeometry args={[0.02, 1.2, 2.4]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
      </group>

      {/* 3D MATTRESS MULTI-LAYER STACK */}
      <group position={[0, -0.2, 0]}>

        {/* LAYER 3: 7-Zone Contoured Base Support (Navy / Blue) */}
        <group ref={baseLayerRef} onClick={() => onSelectLayer('base')}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[4.2, 0.3, 2.4]} />
            <meshStandardMaterial 
              color={selectedLayerId === 'base' ? '#2563eb' : '#1e3a8a'} 
              roughness={0.6} 
              metalness={0.4}
              emissive={selectedLayerId === 'base' ? '#1d4ed8' : '#000000'}
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Visual 7-Zone Grooves along length */}
          {[-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5].map((gx, idx) => (
            <mesh key={idx} position={[gx, 0.15, 1.21]}>
              <boxGeometry args={[0.04, 0.28, 0.02]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          ))}
        </group>

        {/* LAYER 2: Ortho Relief Transition Foam (Teal / Turquoise) */}
        <group ref={foamLayerRef} onClick={() => onSelectLayer('foam')}>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[4.2, 0.24, 2.4]} />
            <meshStandardMaterial 
              color={selectedLayerId === 'foam' ? '#14b8a6' : '#0f766e'} 
              roughness={0.5} 
              metalness={0.3}
              emissive={selectedLayerId === 'foam' ? '#0d9488' : '#000000'}
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>

        {/* LAYER 1: Patented SmartGRID™ Technology (Cyan Grid Matrix) */}
        <group ref={gridLayerRef} onClick={() => onSelectLayer('smartgrid')}>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[4.2, 0.24, 2.4]} />
            <meshStandardMaterial 
              color={selectedLayerId === 'smartgrid' ? '#38bdf8' : '#0284c7'} 
              roughness={0.3} 
              metalness={0.5}
              wireframe={mode === 'split'}
            />
          </mesh>
          {/* Stylized Grid Lattice overlay */}
          <gridHelper 
            args={[4.2, 28, '#00ffff', '#0284c7']} 
            position={[0, 0.25, 0]} 
          />
        </group>

      </group>

      {/* SLEEPING HUMAN FIGURE & 7-ZONE CLINICAL BEACONS */}
      <group ref={bodyRef} position={[0, 0.95, 0]}>
        
        {/* Holographic Body Silhouette (Torso, Head, Legs in Lateral Sleeping Pose) */}
        <group position={[0, 0.15, 0]}>
          
          {/* Head & Pillow */}
          <mesh position={[-1.6, 0.18, 0]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color="#00d2ff" transparent opacity={0.6} wireframe />
          </mesh>
          {/* Pillow */}
          <mesh position={[-1.6, 0.04, 0]}>
            <boxGeometry args={[0.55, 0.12, 0.6]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>

          {/* Torso & Shoulders */}
          <mesh position={[-0.8, 0.16, 0]}>
            <capsuleGeometry args={[0.22, 0.7, 16, 16]} />
            <meshStandardMaterial 
              color={hasSmartGrid ? '#00d2ff' : '#ff477e'} 
              transparent 
              opacity={0.55} 
              wireframe 
            />
          </mesh>

          {/* Pelvis & Hips */}
          <mesh position={[0.2, 0.14, 0]}>
            <capsuleGeometry args={[0.23, 0.6, 16, 16]} />
            <meshStandardMaterial 
              color={hasSmartGrid ? '#00d2ff' : '#ff477e'} 
              transparent 
              opacity={0.55} 
              wireframe 
            />
          </mesh>

          {/* Legs & Knees */}
          <mesh position={[1.1, 0.1, 0]}>
            <capsuleGeometry args={[0.18, 0.9, 16, 16]} />
            <meshStandardMaterial color="#00d2ff" transparent opacity={0.45} wireframe />
          </mesh>

          {/* DYNAMIC SPINAL ALIGNMENT LINE */}
          <line geometry={spineGeometry}>
            <lineBasicMaterial 
              color={hasSmartGrid ? '#00ffff' : '#ff3366'} 
              linewidth={4} 
            />
          </line>

          {/* 7-ZONE INTERACTIVE PULSING CLINICAL BEACONS */}
          {SEVEN_ZONES_DATA.map((z) => {
            const bx = -1.8 + (z.xPercent / 100) * 3.6;
            const isSelected = selectedZone?.id === z.id;

            return (
              <group key={z.id} position={[bx, 0.35, 0.25]}>
                <Html center distanceFactor={10}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectZone(z);
                    }}
                    className={`relative flex items-center justify-center p-1 cursor-pointer transition transform hover:scale-125 ${
                      isSelected ? 'scale-125' : ''
                    }`}
                    title={z.name}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center shadow-lg transition-all duration-300 ${
                      isSelected 
                        ? 'bg-cyan-300 ring-4 ring-cyan-400/50 shadow-[0_0_15px_#00d2ff]' 
                        : hasSmartGrid
                          ? 'bg-cyan-400 shadow-[0_0_8px_#00d2ff]'
                          : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </span>
                    <span className="absolute -bottom-5 px-1.5 py-0.5 rounded bg-black/85 border border-cyan-500/60 text-[8px] font-mono text-cyan-200 whitespace-nowrap pointer-events-none drop-shadow">
                      Z{z.zoneNumber}: {z.name.split(' ')[0]}
                    </span>
                  </button>
                </Html>
              </group>
            );
          })}

        </group>

      </group>

      {/* User Orbit Drag Camera Navigation */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3.5}
        maxDistance={9.5}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.05} // Prevent camera going below floor
        target={[0, 0.2, 0]}
      />
    </>
  );
}
