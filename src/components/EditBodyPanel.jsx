import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Environment } from '@react-three/drei';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ArrowLeft, Save, Copy, CheckCircle, Clock, CloudUpload, User, ShieldCheck, X } from 'lucide-react';
import painPointsData from '../data/painPoints.json';
import initialZoneCoordinates from '../data/zoneCoordinates.json';
import { useAuth } from '../context/AuthContext';
import { getBodyModelConfig, saveBodyZoneCoordinate, getBodyEditAuditLogs } from '../utils/db';
import { toast } from 'sonner';

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
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [uniqueZones, setUniqueZones] = useState(() => getUniqueZones());
  const [newZoneName, setNewZoneName] = useState('');
  
  // Load initial coordinates from Supabase if available, fallback to localStorage/initial
  const [coordinates, setCoordinates] = useState(() => {
    const saved = localStorage.getItem('medic_zone_coords_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { ...initialZoneCoordinates };
  });

  const [activeZone, setActiveZone] = useState(() => {
    const zones = getUniqueZones();
    return zones.length > 0 ? zones[0] : 'neck';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Sync latest coordinates from Supabase on mount
  useEffect(() => {
    getBodyModelConfig().then(coords => {
      if (coords && Object.keys(coords).length > 0) {
        setCoordinates(prev => ({ ...prev, ...coords }));
      }
    }).catch(err => {
      console.warn("Could not sync body model config from Supabase:", err);
    });
  }, []);

  // Fetch audit logs if admin
  const loadAuditHistory = async () => {
    if (!isAdmin) return;
    setLoadingLogs(true);
    try {
      const logs = await getBodyEditAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCoordinateUpdate = (zone, point) => {
    const newCoords = { ...coordinates, [zone]: point };
    setCoordinates(newCoords);
    localStorage.setItem('medic_zone_coords_v3', JSON.stringify(newCoords));
  };

  const handleSaveToSupabase = async () => {
    if (!activeZone || !coordinates[activeZone]) {
      toast.error("Please select a body part and click on the 3D model to place a marker first.");
      return;
    }

    setIsSaving(true);
    try {
      await saveBodyZoneCoordinate(activeZone, coordinates[activeZone], profile);
      toast.success(`✓ "${activeZone.toUpperCase()}" published to Supabase! All physios and customer 3D links are updated.`);
      if (isAdmin) loadAuditHistory();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save to Supabase. Check database permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: 'var(--primary-bg)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
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
        <div style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '320px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CloudUpload size={18} /> 3D Body Synchronizer
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
            1. Select a body part from the right.<br/>
            2. Click on the 3D model to place the glow marker.<br/>
            3. Click <b>"Save to Supabase"</b> to publish changes live to all physios.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div style={{ width: '380px', background: 'var(--card)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/tasks" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Back to Tasks">
              <ArrowLeft size={20} />
            </Link>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>Map Body Parts</h2>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setShowAuditModal(true);
                loadAuditHistory();
              }}
              className="clinical-btn"
              style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="View which physio edited what"
            >
              <Clock size={14} /> Audit Log
            </button>
          )}
        </div>

        {/* Zone List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Body Parts
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {uniqueZones.length} parts
            </span>
          </div>

          {uniqueZones.map(zone => (
            <div 
              key={zone} 
              onClick={() => setActiveZone(zone)}
              style={{
                padding: '10px 14px',
                marginBottom: '6px',
                background: activeZone === zone ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${activeZone === zone ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ textTransform: 'capitalize', fontWeight: activeZone === zone ? '600' : 'normal', fontSize: '0.9rem' }}>
                {zone}
              </span>
              {coordinates[zone] && (
                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                  Mapped
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Scale Slider */}
        {activeZone && coordinates[activeZone] && !Array.isArray(coordinates[activeZone]) && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--muted)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Marker Glow Size</label>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{coordinates[activeZone].scale || 1.0}x</span>
            </div>
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
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--muted)', flexShrink: 0 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add New Body Part</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="e.g. belly, elbow"
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'var(--card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', minWidth: 0 }}
            />
            <button
              onClick={() => {
                const zone = newZoneName.trim().toLowerCase();
                if (zone && !uniqueZones.includes(zone)) {
                  setUniqueZones([...uniqueZones, zone]);
                  setActiveZone(zone);
                  setNewZoneName('');
                }
              }}
              className="clinical-btn"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Footer actions: Save to Supabase */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          <button 
            onClick={handleSaveToSupabase}
            disabled={isSaving || !activeZone}
            className="clinical-btn"
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              padding: '14px',
              background: activeZone ? 'linear-gradient(135deg, #00d2ff 0%, #00f2fe 100%)' : 'rgba(255,255,255,0.05)',
              color: activeZone ? '#000' : 'rgba(255,255,255,0.3)',
              fontWeight: '700',
              fontSize: '0.95rem',
              borderRadius: '8px',
              border: activeZone ? 'none' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: activeZone ? '0 4px 20px rgba(0, 210, 255, 0.4)' : 'none',
              cursor: activeZone ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
          >
            <CloudUpload size={20} />
            {isSaving ? 'Publishing to Cloud...' : activeZone ? `Save "${activeZone.toUpperCase()}" to Supabase` : 'Select a part to save'}
          </button>

          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
            Clicking Save publishes this body part's 3D glow position live to Supabase for all physiotherapists and patient 3D links.
          </p>
        </div>
      </div>

      {/* Admin Audit History Slide-over Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '420px', height: '100%', background: 'var(--card)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck className="text-primary" size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Body Edit Audit Trail</h3>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {loadingLogs ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Loading audit logs...</p>
              ) : auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <Clock size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p>No body edits recorded yet.</p>
                  <p style={{ fontSize: '0.8rem' }}>When any physio saves a body part, their name and timestamp will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {auditLogs.map(log => (
                    <div 
                      key={log.id}
                      style={{ 
                        background: 'var(--muted)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '10px', 
                        padding: '12px 14px' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', textTransform: 'capitalize', color: 'var(--accent)', fontSize: '0.95rem' }}>
                          {log.zone}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                        <User size={14} style={{ opacity: 0.7 }} />
                        <span>Edited by: <b>{log.physio_name}</b></span>
                      </div>

                      {log.new_coordinates && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--muted)', padding: '6px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                          Pos: [{Array.isArray(log.new_coordinates.position) ? log.new_coordinates.position.join(', ') : ''}] • Scale: {log.new_coordinates.scale}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Only Administrators have access to this audit history.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
