import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Center, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import initialZoneCoordinates from '../data/zoneCoordinates.json';

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
    
    // Check localStorage first, then fallback to initial config
    let savedCoords = null;
    try {
      const ls = localStorage.getItem('medic_zone_coords');
      if (ls) savedCoords = JSON.parse(ls);
    } catch(e) {}
    
    const coordsMap = savedCoords || initialZoneCoordinates;
    const catKey = zoneCategory?.toLowerCase();
    
    if (catKey && coordsMap[catKey]) {
      const savedData = coordsMap[catKey];
      // Handle legacy array format
      if (Array.isArray(savedData)) {
        data.position = savedData;
      } else {
        data = { ...data, ...savedData };
      }
    }

    if (id) {
      const num = parseInt(id.replace(/\D/g, '')) || 0;
      if (num > 0) {
        // We do not add the arbitrary rotation offset for decals since they rely on accurate normals
        // The scale and rotation will handle it
      }
    }
    return data;
  };

  const activeZonePositions = useMemo(() => {
    return zones
      .filter(z => activeZones.length === 0 || activeZones.includes(z.id))
      .map(z => ({
         id: z.id, 
         ...getHotspotData(z.zone, z.id, z.position)
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
          >
            {/* Soft glowing light for pain points, respecting surface normal */}
            {activeZonePositions.map((zone, i) => (
              <group position={zone.position} rotation={zone.rotation} key={zone.id || i}>
                {/* Invisible interactive hit area */}
                <mesh 
                  visible={false}
                  onClick={(e) => handlePointerInteraction(e, true, zone.id)}
                  onPointerMove={(e) => handlePointerInteraction(e, false, zone.id)}
                  onPointerOut={() => setHovered(false)}
                >
                  <sphereGeometry args={[0.4 / scale, 8, 8]} />
                </mesh>
                {/* Red glow effect pushed outward along the normal */}
                <pointLight color="#ff0000" intensity={40} distance={2.5 / scale} decay={2} position={[0, 0, 0.3 / scale]} />
              </group>
            ))}
          </mesh>
        )}
      </Center>
    </group>
  );
}
