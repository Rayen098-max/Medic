import React from 'react';
import { Sparkles } from '@react-three/drei';

function NeonStrip({
  position,
  size,
  color = '#00d2ff',
  opacity = 1
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  opacity?: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * A dim, futuristic bedroom/studio. Everything is procedural geometry so there
 * is no third-party environment asset to license.
 */
export function Environment() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.53, 0]}>
        <planeGeometry args={[34, 34]} />
        <meshStandardMaterial color="#02060c" roughness={0.42} metalness={0.78} />
      </mesh>
      <gridHelper args={[34, 34, '#0a4058', '#04121f']} position={[0, -0.525, 0]} />

      {/* Concentric floor rings around the platform */}
      {[3.25, 3.55, 4.2].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.515, 0]}
        >
          <ringGeometry args={[radius, radius + 0.012, 96]} />
          <meshBasicMaterial
            color="#0e7490"
            transparent
            opacity={index === 0 ? 0.42 : 0.2}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Rear wall and side wall panels */}
      <mesh position={[0, 1.65, -3.5]}>
        <boxGeometry args={[12, 4.9, 0.12]} />
        <meshStandardMaterial color="#040a12" roughness={0.72} metalness={0.35} />
      </mesh>
      <mesh position={[-4.8, 1.6, -1.2]} rotation={[0, 0.55, 0]}>
        <boxGeometry args={[0.12, 4.4, 5.2]} />
        <meshStandardMaterial color="#030810" roughness={0.78} metalness={0.25} />
      </mesh>
      <mesh position={[4.8, 1.6, -1.2]} rotation={[0, -0.55, 0]}>
        <boxGeometry args={[0.12, 4.4, 5.2]} />
        <meshStandardMaterial color="#030810" roughness={0.78} metalness={0.25} />
      </mesh>

      {/* Back-wall HUD lines */}
      <NeonStrip position={[0, 0.72, -3.42]} size={[10.8, 0.012, 0.012]} color="#0b6b86" opacity={0.7} />
      <NeonStrip position={[0, 2.72, -3.42]} size={[10.8, 0.012, 0.012]} color="#0b6b86" opacity={0.55} />
      <NeonStrip position={[-3.4, 1.7, -3.42]} size={[0.012, 2.0, 0.012]} color="#0e7490" opacity={0.5} />
      <NeonStrip position={[3.4, 1.7, -3.42]} size={[0.012, 2.0, 0.012]} color="#0e7490" opacity={0.5} />

      {/* Portal ring behind the bed */}
      <mesh position={[0, 1.9, -3.37]}>
        <torusGeometry args={[1.55, 0.012, 8, 96]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.45} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.9, -3.39]}>
        <circleGeometry args={[1.53, 64]} />
        <meshBasicMaterial color="#03121c" transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {/* Platform */}
      <group>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[4.78, 0.52, 2.78]} />
          <meshStandardMaterial color="#08111f" roughness={0.38} metalness={0.7} />
        </mesh>

        {/* Soft under-glow */}
        <mesh position={[0, -0.515, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.2, 3.2]} />
          <meshBasicMaterial color="#00a8d4" transparent opacity={0.15} toneMapped={false} />
        </mesh>

        {/* Perimeter light strips */}
        <NeonStrip position={[0, -0.035, 1.405]} size={[4.84, 0.026, 0.026]} />
        <NeonStrip position={[0, -0.035, -1.405]} size={[4.84, 0.026, 0.026]} />
        <NeonStrip position={[2.405, -0.035, 0]} size={[0.026, 0.026, 2.78]} />
        <NeonStrip position={[-2.405, -0.035, 0]} size={[0.026, 0.026, 2.78]} />

        {/* Under-platform neon line */}
        <NeonStrip position={[0, -0.5, 1.43]} size={[4.9, 0.02, 0.02]} color="#0e7490" opacity={0.7} />
        <NeonStrip position={[0, -0.5, -1.43]} size={[4.9, 0.02, 0.02]} color="#0e7490" opacity={0.7} />
      </group>

      {/* Low headboard behind the pillow */}
      <group>
        <mesh position={[-2.56, 0.78, 0]}>
          <boxGeometry args={[0.14, 1.56, 2.86]} />
          <meshStandardMaterial color="#07101c" roughness={0.42} metalness={0.6} />
        </mesh>
        <NeonStrip position={[-2.48, 0.78, -1.25]} size={[0.026, 1.2, 0.026]} color="#22d3ee" opacity={0.8} />
        <NeonStrip position={[-2.48, 0.78, 1.25]} size={[0.026, 1.2, 0.026]} color="#22d3ee" opacity={0.8} />
        <NeonStrip position={[-2.47, 1.53, 0]} size={[0.026, 0.026, 2.4]} color="#0e7490" opacity={0.55} />
      </group>

      {/* Ambient floating dust */}
      <Sparkles
        count={32}
        scale={[7.5, 3.2, 5]}
        position={[0, 1.5, -0.7]}
        size={1.4}
        speed={0.12}
        opacity={0.28}
        color="#67e8f9"
      />

      {/* Lighting */}
      <ambientLight intensity={0.34} />
      <directionalLight position={[4.5, 7, 5]} intensity={1.15} color="#e6fbff" />
      <directionalLight position={[-5, 4, -2]} intensity={0.45} color="#00d2ff" />
      <pointLight position={[0, 1.5, 2.6]} intensity={9} distance={9} decay={2} color="#22d3ee" />
      <pointLight position={[0, 0.2, -2.2]} intensity={7} distance={8} decay={2} color="#0ea5e9" />
    </group>
  );
}
