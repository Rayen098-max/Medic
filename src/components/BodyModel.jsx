import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Center, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export default function BodyModel({ zones, activeZones = [], onZoneClick }) {
  const group = useRef();
  const obj = useLoader(OBJLoader, '/model.obj');
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default';
  }, [hovered]);

  const bodyMaterial = useMemo(() => {
    // Simple X-Ray style base material (no complex shaders)
    return new THREE.MeshStandardMaterial({
      color: '#0a3d91', // Deep blue
      emissive: '#051b47',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: false,
      depthWrite: false
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

  const getHotspotPosition = (zoneCategory, id, origPos) => {
    let base = origPos || [0, 0, 0];
    switch (zoneCategory?.toLowerCase()) {
      case 'neck': base = [0, 2.2, -0.1]; break;
      case 'shoulder': base = [0.7, 1.7, -0.1]; break;
      case 'upper back': base = [0, 1.3, -0.55]; break;
      case 'lower back': base = [0, 0.1, -0.55]; break;
    }

    if (id) {
      const num = parseInt(id.replace(/\D/g, '')) || 0;
      if (num > 0) {
        const radius = 0.04 + (num % 4) * 0.04;
        const angle = num * 2.399;
        return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius, base[2]];
      }
    }
    return base;
  };

  const activeZonePositions = useMemo(() => {
    return zones
      .filter(z => activeZones.length === 0 || activeZones.includes(z.id))
      .map(z => ({
         id: z.id, 
         pos: getHotspotPosition(z.zone, z.id, z.position)
      }));
  }, [zones, activeZones]);

  useFrame((state) => {
    if (group.current) {
      if (activeZones.length === 0) {
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
          />
        )}
        
        {/* Simple red glowing spheres for pain points instead of shader */}
        {activeZonePositions.map((zone, i) => (
          <group position={zone.pos} key={zone.id || i}>
            <Sphere 
              args={[0.2, 16, 16]} 
              onClick={(e) => handlePointerInteraction(e, true, zone.id)}
              onPointerMove={(e) => handlePointerInteraction(e, false, zone.id)}
              onPointerOut={() => setHovered(false)}
            >
              <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
            </Sphere>
            <Sphere args={[0.3, 16, 16]}>
              <meshBasicMaterial color="#ff3333" transparent opacity={0.3} />
            </Sphere>
          </group>
        ))}
      </Center>
    </group>
  );
}
