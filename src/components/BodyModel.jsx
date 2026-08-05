import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF, Center } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const Hotspot = ({ position, onClick, active, name }) => {
  const meshRef = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={position}>
      <mesh 
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.04, 32, 32]} />
        <meshStandardMaterial
          color={active ? '#ff0000' : hovered ? '#ff4444' : '#cc0000'}
          emissive={active ? '#ff0000' : hovered ? '#ff4444' : '#cc0000'}
          emissiveIntensity={active || hovered ? 4.0 : 1.5}
          toneMapped={false}
          transparent
          opacity={hovered || active ? 1 : 0.8}
          depthTest={false}
        />
      </mesh>
      {hovered && (
        <Html center position={[0, 0.5, 0]} zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(13, 17, 23, 0.9)',
            color: '#00d2ff',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #00d2ff',
            fontSize: '12px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
};

export default function BodyModel({ zones, activeZones = [], onZoneClick }) {
  const group = useRef();
  // We use the converted GLB. If performance is bad, we can recommend gltfpack.
  const { nodes, materials } = useGLTF('/model.glb');
  
  // Debug click handler to find coordinates for the hotspots
  const handleBodyClick = (e) => {
    e.stopPropagation();
    console.log(`Clicked coordinate: [${e.point.x.toFixed(2)}, ${e.point.y.toFixed(2)}, ${e.point.z.toFixed(2)}]`);
  };

  useFrame(() => {
    if (group.current && activeZones.length === 0) {
      group.current.rotation.y += 0.005;
    }
  });

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#e8beac',
    transparent: true,
    opacity: 0.65,
    roughness: 0.6,
    metalness: 0.1,
    wireframe: false 
  });

  // Find the first mesh in the nodes
  const meshNode = Object.values(nodes).find(n => n.isMesh);

  const targetHeight = 7;
  const { scale } = useMemo(() => {
    if (!meshNode) return { scale: 1 };
    
    meshNode.geometry.computeBoundingBox();
    const box = meshNode.geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const scale = targetHeight / size.y;
    return { scale };
  }, [meshNode]);

  const getHotspotPosition = (zoneCategory, id, origPos) => {
    let base = origPos || [0, 0, 0];
    switch (zoneCategory?.toLowerCase()) {
      case 'neck':
        base = [0, 2.2, -0.1];
        break;
      case 'shoulder':
        base = [0.7, 1.7, -0.1];
        break;
      case 'upper back':
        base = [0, 1.3, -0.55];
        break;
      case 'lower back':
        base = [0, 0.1, -0.55];
        break;
    }

    if (id) {
      // Deterministic spread based on ID (e.g. N04 -> 4)
      const num = parseInt(id.replace(/\D/g, '')) || 0;
      if (num > 0) {
        const radius = 0.04 + (num % 4) * 0.04;
        const angle = num * 2.399; // Golden angle approx
        return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius, base[2]];
      }
    }
    
    return base;
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
      </Center>
      
      {zones.filter(z => activeZones.length === 0 || activeZones.includes(z.id)).map((zone) => (
        <Hotspot
          key={zone.id}
          position={getHotspotPosition(zone.zone, zone.id, zone.position)}
          name={zone.name}
          active={activeZones.includes(zone.id)}
          onClick={() => onZoneClick(zone.id)}
        />
      ))}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
      </EffectComposer>
    </group>
  );
}

// Preload the model
useGLTF.preload('/model.glb');
