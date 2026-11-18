import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html, RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Environment } from './Environment';
import { CameraRig } from './CameraRig';
import { HumanFigure } from './HumanFigure';
import { LayerInfoCard } from './LayerInfoCard';
import {
  LayerId,
  MATTRESS_LAYERS,
  SimulationMode,
  ZoneClinicalInfo
} from '../types';

interface MattressSceneProps {
  mode: SimulationMode;
  hasSmartGrid: boolean;
  hasSevenZone: boolean;
  selectedZone: ZoneClinicalInfo | null;
  onSelectZone: (zone: ZoneClinicalInfo) => void;
  selectedLayerId: LayerId | null;
  onSelectLayer: (layerId: LayerId) => void;
  onCloseLayer: () => void;
  cameraResetKey: number;
}

const SPLIT_OFFSETS: Record<'base' | 'foam' | 'smartgrid', number> = {
  base: 0,
  foam: 0.95,
  smartgrid: 1.85
};

function GridLattice() {
  const geometry = useMemo(() => {
    const vertices: number[] = [];
    const halfX = 2.08;
    const halfZ = 1.18;

    for (let z = -halfZ; z <= halfZ + 0.001; z += 0.118) {
      vertices.push(-halfX, 0, z, halfX, 0, z);
    }
    for (let x = -halfX; x <= halfX + 0.001; x += 0.173) {
      vertices.push(x, 0, -halfZ, x, 0, halfZ);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return buffer;
  }, []);

  return (
    <lineSegments geometry={geometry} position={[0, 0.828, 0]} renderOrder={3}>
      <lineBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.95}
        depthWrite={false}
        toneMapped={false}
        userData={{ baseOpacity: 0.95 }}
      />
    </lineSegments>
  );
}

export function MattressScene({
  mode,
  hasSmartGrid,
  hasSevenZone,
  selectedZone,
  onSelectZone,
  selectedLayerId,
  onSelectLayer,
  onCloseLayer,
  cameraResetKey
}: MattressSceneProps) {
  const gridGroupRef = useRef<THREE.Group>(null);
  const foamGroupRef = useRef<THREE.Group>(null);
  const baseGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const contactShadowRef = useRef<THREE.Mesh>(null);
  const pressureShadowRef = useRef<THREE.Group>(null);

  const isSplit = mode === 'split';
  const showFullStack = isSplit;

  useFrame((_, delta) => {
    const selectedBoost = 0.1;

    let baseY = showFullStack ? SPLIT_OFFSETS.base : 0;
    let foamY = showFullStack ? SPLIT_OFFSETS.foam : 0;
    let gridY = showFullStack ? SPLIT_OFFSETS.smartgrid : 0;

    if (selectedLayerId === 'base') baseY += selectedBoost;
    if (selectedLayerId === 'foam') foamY += selectedBoost;
    if (selectedLayerId === 'smartgrid') gridY += selectedBoost;

    const stackSink = !showFullStack && !hasSevenZone ? -0.24 : 0;
    foamY += stackSink;
    gridY += stackSink;

    if (!showFullStack && !hasSmartGrid) {
      // Let the grid disappear into the foam when it is removed.
      gridY = -0.09;
    }

    if (baseGroupRef.current) {
      baseGroupRef.current.position.y = THREE.MathUtils.damp(
        baseGroupRef.current.position.y,
        baseY,
        5,
        delta
      );
      const baseScale = showFullStack || hasSevenZone ? 1 : 0.2;
      baseGroupRef.current.scale.y = THREE.MathUtils.damp(
        baseGroupRef.current.scale.y,
        baseScale,
        6,
        delta
      );
    }

    if (foamGroupRef.current) {
      foamGroupRef.current.position.y = THREE.MathUtils.damp(
        foamGroupRef.current.position.y,
        foamY,
        5,
        delta
      );
    }

    if (gridGroupRef.current) {
      gridGroupRef.current.position.y = THREE.MathUtils.damp(
        gridGroupRef.current.position.y,
        gridY,
        5,
        delta
      );

      // Fade every material on the grid layer when the layer is removed.
      const gridFactor = showFullStack || hasSmartGrid ? 1 : 0;
      gridGroupRef.current.traverse((object) => {
        const mesh = object as THREE.Mesh;
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (!material) return;

        const materials = Array.isArray(material) ? material : [material];
        materials.forEach((entry) => {
          const mat = entry as THREE.Material & { opacity: number };
          if (typeof mat.opacity !== 'number') return;
          const baseOpacity =
            typeof mat.userData?.baseOpacity === 'number' ? mat.userData.baseOpacity : 1;
          mat.transparent = true;
          mat.opacity = THREE.MathUtils.damp(
            mat.opacity,
            baseOpacity * gridFactor,
            7,
            delta
          );
        });
      });
    }

    // Body sinks deeper when the grid and/or base are removed.
    const mattressTop = 0.82 + stackSink - (!showFullStack && !hasSmartGrid ? 0.18 : 0);
    const bodyTargetY = mattressTop + 0.56;

    if (bodyGroupRef.current) {
      bodyGroupRef.current.position.y = THREE.MathUtils.damp(
        bodyGroupRef.current.position.y,
        bodyTargetY,
        4.5,
        delta
      );
    }

    if (contactShadowRef.current) {
      contactShadowRef.current.position.y = THREE.MathUtils.damp(
        contactShadowRef.current.position.y,
        mattressTop + 0.001,
        5,
        delta
      );
      const shadowMaterial = contactShadowRef.current.material as THREE.MeshBasicMaterial;
      shadowMaterial.opacity = THREE.MathUtils.damp(
        shadowMaterial.opacity,
        isSplit ? 0 : 0.26,
        5,
        delta
      );
    }

    if (pressureShadowRef.current) {
      pressureShadowRef.current.position.y = THREE.MathUtils.damp(
        pressureShadowRef.current.position.y,
        mattressTop + 0.003,
        5,
        delta
      );
      pressureShadowRef.current.visible = !isSplit && !hasSmartGrid;
    }
  });

  const smartGridLayer = MATTRESS_LAYERS[0];
  const foamLayer = MATTRESS_LAYERS[1];
  const baseLayer = MATTRESS_LAYERS[2];

  return (
    <>
      <color attach="background" args={['#03060d']} />
      <fog attach="fog" args={['#03060d', 10, 26]} />

      <Environment />

      {/* Mattress stack */}
      <group position={[0, 0, 0]}>
        {/* 7-ZONE BODY SUPPORT */}
        <group
          ref={baseGroupRef}
          onClick={isSplit ? () => onSelectLayer('base') : undefined}
          onPointerOver={isSplit ? () => { document.body.style.cursor = 'pointer'; } : undefined}
          onPointerOut={isSplit ? () => { document.body.style.cursor = 'default'; } : undefined}
        >
          <RoundedBox
            args={[4.2, 0.34, 2.4]}
            radius={0.055}
            smoothness={4}
            position={[0, 0.17, 0]}
          >
            <meshStandardMaterial
              color={selectedLayerId === 'base' ? '#1d4ed8' : '#12264a'}
              emissive={selectedLayerId === 'base' ? '#1d4ed8' : '#07162c'}
              emissiveIntensity={selectedLayerId === 'base' ? 0.6 : 0.16}
              roughness={0.46}
              metalness={0.5}
            />
            {selectedLayerId === 'base' && <Edges scale={1.004} color="#60a5fa" />}
          </RoundedBox>

          {/* Seven support zones routed into the base */}
          {[-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5].map((x, index) => (
            <mesh key={index} position={[x, 0.345, 0]} renderOrder={2}>
              <boxGeometry args={[0.035, 0.012, 2.36]} />
              <meshBasicMaterial
                color={selectedLayerId === 'base' ? '#93c5fd' : '#0e7490'}
                transparent
                opacity={selectedLayerId === 'base' ? 0.95 : 0.55}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>

        {/* ORTHORELIEF FOAM */}
        <group
          ref={foamGroupRef}
          onClick={isSplit ? () => onSelectLayer('foam') : undefined}
          onPointerOver={isSplit ? () => { document.body.style.cursor = 'pointer'; } : undefined}
          onPointerOut={isSplit ? () => { document.body.style.cursor = 'default'; } : undefined}
        >
          <RoundedBox
            args={[4.2, 0.3, 2.4]}
            radius={0.045}
            smoothness={4}
            position={[0, 0.49, 0]}
          >
            <meshStandardMaterial
              color={selectedLayerId === 'foam' ? '#14b8a6' : '#0f5f59'}
              emissive={selectedLayerId === 'foam' ? '#14b8a6' : '#0b3f3b'}
              emissiveIntensity={selectedLayerId === 'foam' ? 0.55 : 0.12}
              roughness={0.56}
              metalness={0.24}
            />
            {selectedLayerId === 'foam' && <Edges scale={1.005} color="#5eead4" />}
          </RoundedBox>

          {/* Soft contour channels */}
          {[-0.72, 0, 0.72].map((z) => (
            <mesh key={z} position={[0, 0.641, z]} renderOrder={2}>
              <boxGeometry args={[4.0, 0.008, 0.018]} />
              <meshBasicMaterial
                color="#5eead4"
                transparent
                opacity={selectedLayerId === 'foam' ? 0.5 : 0.16}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>

        {/* SMART GRID */}
        <group
          ref={gridGroupRef}
          onClick={isSplit ? () => onSelectLayer('smartgrid') : undefined}
          onPointerOver={isSplit ? () => { document.body.style.cursor = 'pointer'; } : undefined}
          onPointerOut={isSplit ? () => { document.body.style.cursor = 'default'; } : undefined}
        >
          <RoundedBox
            args={[4.2, 0.18, 2.4]}
            radius={0.035}
            smoothness={4}
            position={[0, 0.73, 0]}
          >
            <meshStandardMaterial
              color={selectedLayerId === 'smartgrid' ? '#0891b2' : '#075985'}
              emissive={selectedLayerId === 'smartgrid' ? '#00d2ff' : '#0e7490'}
              emissiveIntensity={selectedLayerId === 'smartgrid' ? 0.9 : 0.45}
              transparent
              opacity={0.44}
              roughness={0.18}
              metalness={0.55}
              depthWrite={false}
              userData={{ baseOpacity: 0.44 }}
            />
            {selectedLayerId === 'smartgrid' && <Edges scale={1.008} color="#a5f3fc" />}
          </RoundedBox>

          <GridLattice />

          {/* Top perimeter light rails */}
          <mesh position={[0, 0.825, 1.19]}>
            <boxGeometry args={[4.2, 0.018, 0.018]} />
            <meshBasicMaterial
              color="#00e5ff"
              transparent
              opacity={0.95}
              toneMapped={false}
              userData={{ baseOpacity: 0.95 }}
            />
          </mesh>
          <mesh position={[0, 0.825, -1.19]}>
            <boxGeometry args={[4.2, 0.018, 0.018]} />
            <meshBasicMaterial
              color="#00e5ff"
              transparent
              opacity={0.95}
              toneMapped={false}
              userData={{ baseOpacity: 0.95 }}
            />
          </mesh>
          <mesh position={[2.09, 0.825, 0]}>
            <boxGeometry args={[0.018, 0.018, 2.4]} />
            <meshBasicMaterial
              color="#00e5ff"
              transparent
              opacity={0.95}
              toneMapped={false}
              userData={{ baseOpacity: 0.95 }}
            />
          </mesh>
          <mesh position={[-2.09, 0.825, 0]}>
            <boxGeometry args={[0.018, 0.018, 2.4]} />
            <meshBasicMaterial
              color="#00e5ff"
              transparent
              opacity={0.95}
              toneMapped={false}
              userData={{ baseOpacity: 0.95 }}
            />
          </mesh>

          {selectedLayerId === 'smartgrid' && (
            <Html position={[0, 1.18, 0.45]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'auto' }}>
              <LayerInfoCard layer={smartGridLayer} onClose={onCloseLayer} />
            </Html>
          )}
        </group>

        {selectedLayerId === 'foam' && (
          <Html position={[0, 1.6, 0.45]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'auto' }}>
            <LayerInfoCard layer={foamLayer} onClose={onCloseLayer} />
          </Html>
        )}

        {selectedLayerId === 'base' && (
          <Html position={[0, 0.6, 0.7]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'auto' }}>
            <LayerInfoCard layer={baseLayer} onClose={onCloseLayer} />
          </Html>
        )}
      </group>

      {/* Contact shadow on top of the mattress */}
      <mesh ref={contactShadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.821, 0]}>
        <planeGeometry args={[3.05, 0.95]} />
        <meshBasicMaterial color="#001019" transparent opacity={0.26} depthWrite={false} />
      </mesh>

      {/* Pressure craters when the grid is removed */}
      <group ref={pressureShadowRef} visible={false}>
        <mesh position={[-0.82, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.36, 32]} />
          <meshBasicMaterial color="#1e0712" transparent opacity={0.62} depthWrite={false} />
        </mesh>
        <mesh position={[0.2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 32]} />
          <meshBasicMaterial color="#1e0712" transparent opacity={0.68} depthWrite={false} />
        </mesh>
      </group>

      {/* Lying anatomical figure */}
      <group ref={bodyGroupRef} position={[0, 1.38, 0]}>
        <Suspense fallback={null}>
          <HumanFigure
            active={!isSplit}
            hasSmartGrid={hasSmartGrid}
            hasSevenZone={hasSevenZone}
            selectedZone={selectedZone}
            onSelectZone={onSelectZone}
          />
        </Suspense>
      </group>

      {/* Subtle zone index ring on the floor, purely decorative */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.514, 0]}>
        <ringGeometry args={[2.7, 2.72, 96]} />
        <meshBasicMaterial color="#155e75" transparent opacity={0.24} toneMapped={false} />
      </mesh>

      <CameraRig
        mode={mode}
        selectedLayerId={selectedLayerId}
        resetKey={cameraResetKey}
      />

      <EffectComposer multisampling={4}>
        <Bloom
          mipmapBlur
          intensity={0.7}
          luminanceThreshold={0.42}
          luminanceSmoothing={0.22}
          radius={0.72}
        />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </>
  );
}
