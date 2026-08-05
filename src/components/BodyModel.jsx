import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

export default function BodyModel({ zones, activeZones = [], onZoneClick }) {
  const group = useRef();
  const { nodes } = useGLTF('/model.glb');
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default';
  }, [hovered]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPositions: { value: Array(20).fill(new THREE.Vector3()) },
    uCount: { value: 0 }
  }), []);

  const bodyMaterial = useMemo(() => {
    // X-Ray style base material
    const mat = new THREE.MeshStandardMaterial({
      color: '#0a3d91', // Deep blue
      emissive: '#051b47',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: false,
      depthWrite: false // helps with x-ray look
    });
    
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uPositions = uniforms.uPositions;
      shader.uniforms.uCount = uniforms.uCount;
      
      shader.vertexShader = `
        varying vec3 vWorldPosition;
        ${shader.vertexShader}
      `.replace(
        `#include <project_vertex>`,
        `#include <project_vertex>
         vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform vec3 uPositions[20];
        uniform int uCount;
        varying vec3 vWorldPosition;
        ${shader.fragmentShader}
      `.replace(
        `#include <dithering_fragment>`,
        `
        #include <dithering_fragment>
        
        vec3 coreColor = vec3(1.0, 0.9, 0.4); // Bright yellow/white core
        vec3 haloColor = vec3(1.0, 0.1, 0.0); // Intense red/orange halo
        float maxDist = 0.6; // Size of the glowing region
        
        vec3 finalGlow = vec3(0.0);
        float totalIntensity = 0.0;
        
        for(int i = 0; i < 20; i++) {
          if (i >= uCount) break;
          float dist = distance(vWorldPosition, uPositions[i]);
          if (dist < maxDist) {
             float factor = 1.0 - (dist / maxDist);
             
             // Core falls off very sharply, halo is softer
             float coreFactor = pow(factor, 6.0);
             float haloFactor = pow(factor, 2.5);
             
             float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
             
             vec3 color = mix(haloColor, coreColor, coreFactor);
             finalGlow += color * haloFactor * pulse;
             totalIntensity += haloFactor * pulse;
          }
        }
        
        totalIntensity = clamp(totalIntensity, 0.0, 1.0);
        
        // Additive blending for the intense light effect
        gl_FragColor.rgb += finalGlow * 3.0; 
        gl_FragColor.a = max(gl_FragColor.a, totalIntensity * 0.9);
        `
      );
    };
    return mat;
  }, [uniforms]);

  const boneMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#00d2ff',
      emissive: '#00d2ff',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      depthWrite: false
    });
  }, []);

  const meshNode = Object.values(nodes).find(n => n.isMesh);

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
      .map(z => getHotspotPosition(z.zone, z.id, z.position))
      .map(pos => new THREE.Vector3(...pos));
  }, [zones, activeZones]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    
    if (group.current) {
      // Calculate world positions for the shader to compare against vWorldPosition
      const worldPositions = activeZonePositions.map(pos => {
         const p = pos.clone();
         return p.applyMatrix4(group.current.matrixWorld);
      });
      
      uniforms.uCount.value = Math.min(worldPositions.length, 20);
      uniforms.uPositions.value = [
        ...worldPositions,
        ...Array(Math.max(0, 20 - worldPositions.length)).fill(new THREE.Vector3())
      ];

      if (activeZones.length === 0) {
        group.current.rotation.y += 0.005;
      }
    }
  });

  const handlePointerInteraction = (e, isClick) => {
    e.stopPropagation();
    if (!group.current) return;
    
    // Convert click point to local space to compare with unscaled hotspot coordinates
    const localPoint = group.current.worldToLocal(e.point.clone());
    const clickThreshold = 0.6; // Matches maxDist in shader for accurate clicking
    let nearestDist = Infinity;
    let nearestZone = null;
    
    zones.forEach(zone => {
      if (activeZones.length > 0 && !activeZones.includes(zone.id)) return;
      
      const pos = getHotspotPosition(zone.zone, zone.id, zone.position);
      const zoneVec = new THREE.Vector3(...pos);
      const dist = localPoint.distanceTo(zoneVec);
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestZone = zone;
      }
    });

    if (nearestDist < clickThreshold && nearestZone) {
      if (isClick) {
        if (onZoneClick) onZoneClick(nearestZone.id);
      } else {
        setHovered(true);
      }
    } else {
      if (!isClick) setHovered(false);
    }
  };

  return (
    <group ref={group}>
      <Center>
        {meshNode && (
          <group>
            <mesh 
              geometry={meshNode.geometry} 
              material={bodyMaterial} 
              scale={scale}
              onClick={(e) => handlePointerInteraction(e, true)}
              onPointerMove={(e) => handlePointerInteraction(e, false)}
              onPointerOut={() => setHovered(false)}
            />
            {/* Inner "Bones" structure */}
            <mesh 
              geometry={meshNode.geometry} 
              material={boneMaterial} 
              scale={scale * 0.96}
            />
          </group>
        )}
      </Center>
      
      <EffectComposer disableNormalPass>
        {/* Intense bloom to make the yellow/red pop */}
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={2.5} radius={0.8} />
      </EffectComposer>
    </group>
  );
}

useGLTF.preload('/model.glb');
