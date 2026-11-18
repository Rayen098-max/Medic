import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html, RoundedBox } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SEVEN_ZONES_DATA, ZoneClinicalInfo } from '../types';

interface HumanFigureProps {
  active: boolean;
  hasSmartGrid: boolean;
  hasSevenZone: boolean;
  selectedZone: ZoneClinicalInfo | null;
  onSelectZone: (zone: ZoneClinicalInfo) => void;
}

const BODY_HEIGHT = 3.08;
const BODY_WIDTH_FACTOR = 0.78;
const BODY_DEPTH_FACTOR = 0.92;

function gaussian(t: number, center: number, width: number) {
  return Math.exp(-Math.pow((t - center) / width, 2));
}

/**
 * Real anatomical scan (the same licensed model used by the Medic body map),
 * rotated into a lateral sleeping pose, rendered as a translucent hologram.
 */
export function HumanFigure({
  active,
  hasSmartGrid,
  hasSevenZone,
  selectedZone,
  onSelectZone
}: HumanFigureProps) {
  const sourceObject = useLoader(OBJLoader, '/model.obj');
  const breathingRef = useRef<THREE.Group>(null);

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2dd4bf',
        emissive: '#0891b2',
        emissiveIntensity: 0.42,
        roughness: 0.34,
        metalness: 0.22,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      }),
    []
  );

  const wireMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#a5f3fc',
        wireframe: true,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
    []
  );

  const { bodyObject, wireObject, scaleX, scaleY, scaleZ } = useMemo(() => {
    const clone = sourceObject.clone(true);
    const wire = sourceObject.clone(true);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = bodyMaterial;
        mesh.frustumCulled = false;
        mesh.renderOrder = 1;
        // The hologram is decorative; never let it intercept layer/zone taps.
        mesh.raycast = () => {};
      }
    });

    wire.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = wireMaterial;
        mesh.frustumCulled = false;
        mesh.renderOrder = 2;
        mesh.raycast = () => {};
      }
    });

    const box = new THREE.Box3().setFromObject(sourceObject);
    const size = new THREE.Vector3();
    box.getSize(size);

    const sy = BODY_HEIGHT / Math.max(size.y, 0.001);
    return {
      bodyObject: clone,
      wireObject: wire,
      scaleX: sy * BODY_WIDTH_FACTOR,
      scaleY: sy,
      scaleZ: sy * BODY_DEPTH_FACTOR
    };
  }, [sourceObject, bodyMaterial, wireMaterial]);

  useEffect(() => {
    return () => {
      bodyMaterial.dispose();
      wireMaterial.dispose();
    };
  }, [bodyMaterial, wireMaterial]);

  useFrame((state, delta) => {
    const targetBodyOpacity = active ? 0.38 : 0;
    const targetWireOpacity = active ? 0.05 : 0;

    bodyMaterial.opacity = THREE.MathUtils.damp(bodyMaterial.opacity, targetBodyOpacity, 6, delta);
    wireMaterial.opacity = THREE.MathUtils.damp(wireMaterial.opacity, targetWireOpacity, 6, delta);

    if (breathingRef.current) {
      const breath = active ? Math.sin(state.clock.elapsedTime * 0.85) * 0.004 : 0;
      breathingRef.current.position.y = breath;
    }
  });

  const sag = !hasSmartGrid ? 0.15 : !hasSevenZone ? 0.07 : 0;

  const spineCurve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const count = 34;

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = -1.44 + t * 2.88;
      const shoulderSink = gaussian(t, 0.28, 0.14) * sag;
      const pelvicSink = gaussian(t, 0.67, 0.12) * sag * 1.15;
      const natural = Math.sin(t * Math.PI * 2) * 0.012;
      points.push(new THREE.Vector3(x, 0.02 + natural - shoulderSink - pelvicSink, 0.06));
    }

    return new THREE.CatmullRomCurve3(points);
  }, [sag]);

  const spineColor = hasSmartGrid ? '#67e8f9' : '#fb7185';

  const zonePositions = useMemo(
    () =>
      SEVEN_ZONES_DATA.map((zone) => ({
        zone,
        x: -1.44 + (zone.xPercent / 100) * 2.88
      })),
    []
  );

  const bodyTransform = (
    <group rotation={[0, 0, Math.PI / 2]}>
      <group scale={[scaleX, scaleY, scaleZ]}>
        <primitive object={bodyObject} />
        <primitive object={wireObject} />
      </group>
    </group>
  );

  return (
    <group ref={breathingRef}>
      {/*
        Inner Rz(+90) lays the standing scan on its side with the head at -X.
        Outer Rx(-58deg) rolls it slightly toward the viewer while keeping the
        side-sleeping silhouette used by the reference experience.
      */}
      <group
        position={[BODY_HEIGHT / 2, 0, 0]}
        rotation={[-Math.PI / 2 + THREE.MathUtils.degToRad(32), 0, 0]}
      >
        {bodyTransform}
      </group>

      {/* Pillow under the head */}
      {active && (
        <>
          <RoundedBox
            args={[0.7, 0.18, 0.78]}
            radius={0.075}
            smoothness={4}
            position={[-1.46, -0.37, 0.08]}
          >
            <meshStandardMaterial
              color="#081725"
              emissive="#0e7490"
              emissiveIntensity={0.12}
              roughness={0.62}
              metalness={0.25}
            />
          </RoundedBox>

          {/* Light blanket over the legs */}
          <mesh position={[1.03, -0.19, 0.02]} rotation={[0, 0.02, 0]}>
            <boxGeometry args={[1.55, 0.09, 1.02]} />
            <meshStandardMaterial
              color="#0b3a4a"
              emissive="#0891b2"
              emissiveIntensity={0.08}
              transparent
              opacity={0.45}
              roughness={0.55}
              metalness={0.2}
            />
          </mesh>
        </>
      )}

      <group visible={active}>
        {/* Glowing spine inside the translucent body */}
      <mesh>
        <tubeGeometry args={[spineCurve, 48, 0.018, 7, false]} />
        <meshBasicMaterial color={spineColor} toneMapped={false} />
      </mesh>
      <mesh>
        <tubeGeometry args={[spineCurve, 48, 0.048, 7, false]} />
        <meshBasicMaterial
          color={spineColor}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Vertebra accents */}
      {Array.from({ length: 13 }).map((_, index) => {
        const t = 0.04 + (index / 12) * 0.92;
        const point = spineCurve.getPoint(t);
        return (
          <mesh key={index} position={point}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshBasicMaterial color={spineColor} toneMapped={false} />
          </mesh>
        );
      })}

      {/* Highlighted body zones + tappable beacons */}
      {zonePositions.map(({ zone, x }) => {
        const isSelected = selectedZone?.id === zone.id;
        const color = hasSmartGrid ? '#22d3ee' : '#fb7185';

        return (
          <group key={zone.id}>
            <mesh position={[x, 0.02, 0.06]} renderOrder={3}>
              <sphereGeometry args={[0.14, 18, 18]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.34 : hasSmartGrid ? 0.11 : 0.18}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>

            <mesh
              position={[x, 0.08, 0.2]}
              onClick={(event) => {
                event.stopPropagation();
                onSelectZone(zone);
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
              renderOrder={4}
            >
              <sphereGeometry args={[0.15, 10, 10]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <mesh position={[x, 0.1, 0.21]} renderOrder={4}>
              <sphereGeometry args={[isSelected ? 0.05 : 0.032, 12, 12]} />
              <meshBasicMaterial
                color={isSelected ? '#ffffff' : color}
                toneMapped={false}
              />
            </mesh>

            {isSelected && (
              <Billboard position={[x, 0.16, 0.22]}>
                <mesh>
                  <ringGeometry args={[0.1, 0.13, 32]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
                <Html center distanceFactor={8} zIndexRange={[20, 0]}>
                  <div className="pointer-events-none whitespace-nowrap rounded border border-cyan-300/70 bg-[#04111d]/90 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                    Z{zone.zoneNumber} · {zone.shortName}
                  </div>
                </Html>
              </Billboard>
            )}
          </group>
        );
      })}

      {/* Rose pressure points appear when the grid is removed */}
      {!hasSmartGrid && active && (
        <>
          <mesh position={[-0.78, 0.16, 0.12]} renderOrder={5}>
            <sphereGeometry args={[0.22, 18, 18]} />
            <meshBasicMaterial
              color="#fb7185"
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.22, 0.14, 0.12]} renderOrder={5}>
            <sphereGeometry args={[0.25, 18, 18]} />
            <meshBasicMaterial
              color="#fb7185"
              transparent
              opacity={0.26}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
      </group>
    </group>
  );
}
