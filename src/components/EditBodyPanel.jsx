import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Environment } from '@react-three/drei';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ArrowLeft, Save, Copy, CheckCircle } from 'lucide-react';
import painPointsData from '../data/painPoints.json';
import initialZoneCoordinates from '../data/zoneCoordinates.json';

const getUniqueZones = () => {
  const zones = new Set();
  painPointsData.forEach(p => {
    if (p.zone) zones.add(p.zone.toLowerCase());
  });
  return Array.from(zones);
};

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
  return z.includes('shoulder') || z.includes('knee') || z.includes('leg') || z.includes('foot') || z.includes('ankle');
};

function EditBody3D({ coordinates, activeZone, onCoordinateUpdate }) {
  const obj = useLoader(OBJLoader, '/model.obj');
  
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#0a3d91',
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

  const handlePointerDown = (e) => {
    if (!activeZone) return;
    e.stopPropagation();
    
    // Get precise local point on the unscaled OBJ mesh itself
    const localPoint = e.eventObject.worldToLocal(e.point.clone());
    const localNormal = e.face.normal.clone();
    
    // Calculate rotation to align decal with surface normal
    const dummy = new THREE.Object3D();
    dummy.position.copy(localPoint);
    dummy.lookAt(localPoint.clone().add(localNormal));
    
    const coordData = {
      position: [
        parseFloat(localPoint.x.toFixed(3)),
        parseFloat(localPoint.y.toFixed(3)),
        parseFloat(localPoint.z.toFixed(3))
      ],
      rotation: [
        parseFloat(dummy.rotation.x.toFixed(3)),
        parseFloat(dummy.rotation.y.toFixed(3)),
        parseFloat(dummy.rotation.z.toFixed(3))
      ],
      scale: coordinates[activeZone]?.scale || 1.0
    };
    onCoordinateUpdate(activeZone, coordData);
  };

  return (
    <Center>
      {meshNode && (
        <mesh 
          geometry={meshNode.geometry} 
          material={bodyMaterial} 
          scale={scale}
          onPointerDown={handlePointerDown}
        >
          {Object.entries(coordinates).map(([zone, data]) => {
            const pos = Array.isArray(data) ? data : data.position;
            const rot = data.rotation || [0, 0, 0];
            const color = activeZone === zone ? "#00ff00" : "#ff0000";
            
            const isBilateral = isBilateralZone(zone);
            const mirrored = isBilateral ? getMirroredTransform(pos, rot) : null;
            
            return (
              <React.Fragment key={zone}>
                <group position={pos} rotation={rot}>
                  <mesh position={[0, 0, 0.05 / scale]}>
                    <sphereGeometry args={[0.06 / scale, 16, 16]} />
                    <meshBasicMaterial color={color} transparent opacity={0.6} />
                  </mesh>
                  <mesh position={[0, 0, 0.05 / scale]}>
                    <sphereGeometry args={[0.03 / scale, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <pointLight color={color} intensity={50} distance={3.0 / scale} decay={2} position={[0, 0, 0.1 / scale]} />
                </group>

                {mirrored && (
                  <group position={mirrored.position} rotation={mirrored.rotation}>
                    <mesh position={[0, 0, 0.05 / scale]}>
                      <sphereGeometry args={[0.06 / scale, 16, 16]} />
                      <meshBasicMaterial color={color} transparent opacity={0.6} />
                    </mesh>
                    <mesh position={[0, 0, 0.05 / scale]}>
                      <sphereGeometry args={[0.03 / scale, 16, 16]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                    <pointLight color={color} intensity={50} distance={3.0 / scale} decay={2} position={[0, 0, 0.1 / scale]} />
                  </group>
                )}
              </React.Fragment>
            );
          })}
        </mesh>
      )}
    </Center>
  );
}

export default function EditBodyPanel() {
  const [uniqueZones, setUniqueZones] = useState(() => getUniqueZones());
  const [newZoneName, setNewZoneName] = useState('');
  
  // Load initial coordinates from file, or empty if not present
  const [coordinates, setCoordinates] = useState(() => {
    const saved = localStorage.getItem('medic_zone_coords_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { ...initialZoneCoordinates };
  });

  const [activeZone, setActiveZone] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCoordinateUpdate = (zone, point) => {
    const newCoords = { ...coordinates, [zone]: point };
    setCoordinates(newCoords);
    localStorage.setItem('medic_zone_coords_v3', JSON.stringify(newCoords));
  };

  const handleCopy = () => {
    const jsonStr = JSON.stringify(coordinates, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--primary-bg)', color: 'white' }}>
      
      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <EditBody3D 
            coordinates={coordinates} 
            activeZone={activeZone} 
            onCoordinateUpdate={handleCoordinateUpdate} 
          />
          <OrbitControls enablePan={true} enableZoom={true} />
          <Environment preset="city" />
        </Canvas>
        
        {/* Instructions overlay */}
        <div style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--accent)' }}>3D Coordinate Mapper</h2>
          <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem' }}>
            1. Select a body part from the right panel.<br/>
            2. Click on the 3D model to place the glow marker.<br/>
            3. Copy the JSON and paste it to the developer.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div style={{ width: '350px', background: 'rgba(0,0,0,0.8)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={20} /></Link>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Map Body Parts</h2>
        </div>

        {/* Zone List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Available Parts</h3>
          {uniqueZones.map(zone => (
            <div 
              key={zone} 
              onClick={() => setActiveZone(zone)}
              style={{
                padding: '12px 16px',
                marginBottom: '8px',
                background: activeZone === zone ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeZone === zone ? 'var(--accent)' : 'transparent'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ textTransform: 'capitalize', fontWeight: activeZone === zone ? 'bold' : 'normal' }}>
                {zone}
              </span>
              {coordinates[zone] && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Mapped</span>
              )}
            </div>
          ))}
        </div>
        
        {/* Scale Slider */}
        {activeZone && coordinates[activeZone] && !Array.isArray(coordinates[activeZone]) && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.4)' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Adjust Glow Size</label>
            <input 
              type="range" 
              min="0.2" 
              max="5" 
              step="0.1" 
              value={coordinates[activeZone].scale || 1.0}
              onChange={(e) => {
                const newScale = parseFloat(e.target.value);
                handleCoordinateUpdate(activeZone, { ...coordinates[activeZone], scale: newScale });
              }}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        )}

        {/* Add Body Part */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.4)' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Add New Body Part</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="e.g. elbow"
              style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', minWidth: 0 }}
            />
            <button
              onClick={() => {
                const zone = newZoneName.trim().toLowerCase();
                if (zone && !uniqueZones.includes(zone)) {
                  setUniqueZones([...uniqueZones, zone]);
                  setNewZoneName('');
                }
              }}
              className="clinical-btn"
              style={{ padding: '8px 16px' }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleCopy}
            className="clinical-btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? 'Copied to Clipboard!' : 'Copy JSON Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
